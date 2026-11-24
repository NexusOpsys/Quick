"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, RefreshCw, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { calculateCartTotals, filterProducts, validatePayments } from "../../domain/sales";
import { isUnauthorizedError, requestJson } from "../../lib/api";
import { CustomerCart } from "./components/CustomerCart";
import { PaymentPanel } from "./components/PaymentPanel";
import { PosHeader } from "./components/PosHeader";
import { ProductCatalog } from "./components/ProductCatalog";
import { PosSidebar } from "./components/PosSidebar";
import { amountToMinor } from "./components/pos-format";
import type { CartLine, CheckoutResult, PosCustomer, PosProduct, PosSession } from "./components/types";
import "./pos.css";

type LoadState = "loading" | "ready" | "error" | "unauthorized" | "shift-required";
type ShiftCheck = { currentShift: { id: string } | null };

const INITIAL_PAYMENT_METHOD = "Cash";
const INITIAL_SPLIT_METHOD = "Card";

function toSalePayments(
  totalMinor: number,
  primaryMethod: string,
  splitEnabled: boolean,
  splitMethod: string,
  splitAmountMinor: number,
) {
  const primaryAmount = totalMinor - splitAmountMinor;
  return splitEnabled && splitAmountMinor > 0
    ? [
        ...(primaryAmount > 0 ? [{ method: primaryMethod, amountMinor: primaryAmount }] : []),
        { method: splitMethod, amountMinor: splitAmountMinor },
      ]
    : [{ method: primaryMethod, amountMinor: totalMinor }];
}

export default function PosPage() {
  const [session, setSession] = useState<PosSession | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState(INITIAL_PAYMENT_METHOD);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMethod, setSplitMethod] = useState(INITIAL_SPLIT_METHOD);
  const [splitAmount, setSplitAmount] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Items");
  const [checkoutError, setCheckoutError] = useState("");
  const [lastSale, setLastSale] = useState<CheckoutResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");
    setLoadError("");

    async function load() {
      try {
        const currentSession = await requestJson<PosSession>("/api/auth/session", { signal: controller.signal });
        const [productRows, customerRows, shiftCheck] = await Promise.all([
          requestJson<PosProduct[]>("/api/products", { signal: controller.signal }),
          requestJson<PosCustomer[]>("/api/customers", { signal: controller.signal }),
          currentSession.user.role === "cashier"
            ? requestJson<ShiftCheck>("/api/shifts/current", { signal: controller.signal })
            : Promise.resolve({ currentShift: { id: "not-required" } }),
        ]);
        if (controller.signal.aborted) return;
        if (!currentSession.company.setupComplete) {
          window.location.assign("/setup");
          return;
        }
        setSession(currentSession);
        if (currentSession.user.role === "cashier" && !shiftCheck.currentShift) {
          setLoadState("shift-required");
          return;
        }
        setProducts(productRows);
        setCustomers(customerRows);
        setLoadState("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        if (isUnauthorizedError(error)) {
          setLoadState("unauthorized");
          return;
        }
        setLoadError(error instanceof Error ? error.message : "The POS data could not be loaded.");
        setLoadState("error");
      }
    }

    void load();
    return () => controller.abort();
  }, [reload]);

  const currencyCode = session?.company.currencyCode ?? "MMK";
  const categories = useMemo(
    () => ["All Items", ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );
  const totals = useMemo(() => calculateCartTotals(cart.map((item) => ({
    productId: item.id,
    quantity: item.qty,
    unitPriceMinor: item.priceMinor,
    discountMinor: item.discountMinor,
    taxRateBps: item.taxRateBps,
  }))), [cart]);
  const visibleProducts = useMemo(
    () => filterProducts(products, { query: search, category }),
    [products, search, category],
  );
  const splitAmountMinor = amountToMinor(splitAmount, currencyCode);

  function invalidateCurrentDraft() {
    idempotencyKey.current = null;
    setCheckoutError("");
    setLastSale(null);
  }

  function addProduct(product: PosProduct) {
    if (product.isStocked === 1 && product.stock <= 0) return;
    invalidateCurrentDraft();
    setCart((items) => {
      const current = items.find((item) => item.id === product.id);
      if (current) {
        if (product.isStocked === 1 && current.qty >= product.stock) return items;
        return items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...items, { ...product, qty: 1, discountMinor: 0 }];
    });
  }

  function changeQuantity(id: string, delta: number) {
    invalidateCurrentDraft();
    setCart((items) => items.map((item) => {
      if (item.id !== id) return item;
      const quantity = item.qty + delta;
      if (quantity <= 0) return { ...item, qty: 0, discountMinor: 0 };
      if (item.isStocked === 1 && quantity > item.stock) return item;
      return { ...item, qty: quantity, discountMinor: Math.min(item.discountMinor, item.priceMinor * quantity) };
    }).filter((item) => item.qty > 0));
  }

  function changeDiscount(id: string, value: string) {
    invalidateCurrentDraft();
    const discountMinor = amountToMinor(value, currencyCode);
    setCart((items) => items.map((item) => item.id === id
      ? { ...item, discountMinor: Math.min(discountMinor, item.priceMinor * item.qty) }
      : item));
  }

  function choosePayment(method: string) {
    setPayment(method);
    if (method === splitMethod) {
      const alternative = ["Cash", "Card", "KBZPay", "Credit"].find((candidate) => candidate !== method);
      if (alternative) setSplitMethod(alternative);
    }
  }

  async function completeSale() {
    if (!session || cart.length === 0 || submitting) return;
    setCheckoutError("");
    const payments = toSalePayments(totals.totalMinor, payment, splitEnabled, splitMethod, splitAmountMinor);

    try {
      validatePayments(payments, totals.totalMinor);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Check the payment amounts.");
      return;
    }

    idempotencyKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    try {
      const result = await requestJson<CheckoutResult>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current,
          ...(customerId ? { customerId } : {}),
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.qty,
            ...(item.discountMinor > 0 ? { discountMinor: item.discountMinor } : {}),
          })),
          payments,
        }),
      });

      setLastSale(result);
      idempotencyKey.current = null;
      setCart([]);
      setSplitEnabled(false);
      setSplitAmount("");
      setCustomerId("");
      setProducts((current) => current.map((product) => {
        const sold = cart.find((line) => line.id === product.id);
        return sold && product.isStocked === 1
          ? { ...product, stock: product.stock - sold.qty }
          : product;
      }));
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Sale could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState !== "ready" || !session) {
    const title = loadState === "loading"
      ? "Connecting to your business"
      : loadState === "unauthorized"
        ? "Sign in to use the POS"
        : loadState === "shift-required"
          ? "Open a cashier shift first"
        : "POS data is unavailable";
    const message = loadState === "loading"
      ? "Loading your authorized catalog, customers, and branch."
      : loadState === "unauthorized"
        ? "Sales are protected. Sign in before accessing the register."
        : loadState === "shift-required"
          ? "Open your shift from the cashier dashboard before processing sales."
        : loadError;
    return (
      <div className="pos-root">
        <div className="pos-state-card" role="status">
          <div className="pos-state-icon">{loadState === "loading" ? <RefreshCw size={21} /> : <AlertCircle size={21} />}</div>
          <h1>{title}</h1>
          <p>{message}</p>
          {loadState === "unauthorized"
            ? <Link href="/login?returnTo=/pos" className="pos-state-button">Go to sign in</Link>
            : loadState === "shift-required"
              ? <Link href="/" className="pos-state-button">Open cashier shift</Link>
            : loadState === "error"
              ? <button className="pos-state-button" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>
              : null}
        </div>
      </div>
    );
  }

  return (
    <div className="pos-root">
      <a className="pos-skip-link" href="#pos-content">Skip to checkout</a>
      <PosSidebar
        branchName={session.branch.name}
        role={session.user.role}
        activeSection="terminal"
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <PosHeader
        session={session}
        search={search}
        onSearchChange={setSearch}
        onRefresh={() => setReload((value) => value + 1)}
        navOpen={mobileNavOpen}
        onMenuClick={() => setMobileNavOpen((value) => !value)}
      />
      <main className="pos-main" id="pos-content">
        <div className="pos-columns">
          <ProductCatalog
            branchName={session.branch.name}
            products={visibleProducts}
            allProducts={products}
            categories={categories}
            activeCategory={category}
            onCategoryChange={setCategory}
            onScanMiss={() => setCheckoutError("No matching product was found. Check the SKU or barcode and try again.")}
            onAddProduct={addProduct}
            currencyCode={currencyCode}
          />
          <aside className="pos-checkout">
            <CustomerCart
              customers={customers}
              customerId={customerId}
              onCustomerChange={setCustomerId}
              cart={cart}
              currencyCode={currencyCode}
              onQuantityChange={changeQuantity}
              onDiscountChange={changeDiscount}
            />
            <PaymentPanel
              totals={totals}
              currencyCode={currencyCode}
              payment={payment}
              onPaymentChange={choosePayment}
              splitEnabled={splitEnabled}
              onSplitEnabledChange={(enabled) => {
                setSplitEnabled(enabled);
                setSplitAmount("");
              }}
              splitMethod={splitMethod}
              onSplitMethodChange={setSplitMethod}
              splitAmount={splitAmount}
              onSplitAmountChange={setSplitAmount}
              splitAmountMinor={splitAmountMinor}
              checkoutError={checkoutError}
              lastSaleNumber={lastSale?.invoiceNumber}
              submitting={submitting}
              onCheckout={() => void completeSale()}
            />
            <div className="pos-shortcuts">
              <button type="button" className="pos-shortcut" onClick={() => { invalidateCurrentDraft(); setCart([]); }}><kbd>F2</kbd>Clear sale</button>
            </div>
          </aside>
        </div>
      </main>
      <Link className="pos-exit-pill" href="/">
        <span><ShoppingCart size={14} /> Back to dashboard</span>
      </Link>
    </div>
  );
}
