"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { currencyMinorUnitScale } from "../../../domain/sales";
import { requestJson } from "../../../lib/api";
import WorkspaceFrame from "../components/WorkspaceFrame";
import {
  canManageWorkspace,
  errorMessage,
  type PurchaseReceipt,
  type WorkspaceProduct,
  type WorkspaceSession,
  type WorkspaceSupplier,
} from "../types";

type ReceiptForm = { supplierId: string; reference: string; note: string; productId: string; quantity: string; unitCost: string };
const EMPTY_FORM: ReceiptForm = { supplierId: "", reference: "", note: "", productId: "", quantity: "1", unitCost: "0" };

export default function PurchasingWorkspace() {
  const [suppliers, setSuppliers] = useState<WorkspaceSupplier[]>([]);
  const [products, setProducts] = useState<WorkspaceProduct[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState("MMK");
  const [form, setForm] = useState<ReceiptForm>(EMPTY_FORM);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      requestJson<WorkspaceSession>("/api/auth/session", { signal: controller.signal }),
      requestJson<WorkspaceSupplier[]>("/api/suppliers", { signal: controller.signal }),
      requestJson<WorkspaceProduct[]>("/api/products", { signal: controller.signal }),
      requestJson<PurchaseReceipt[]>("/api/purchases/receipts", { signal: controller.signal }),
    ]).then(([session, supplierRows, productRows, receiptRows]) => {
      if (controller.signal.aborted) return;
      setRole(session.user.role);
      setCurrencyCode(session.company.currencyCode);
      setSuppliers(supplierRows);
      setProducts(productRows.filter((product) => product.isStocked === 1));
      setReceipts(receiptRows);
      setForm((current) => ({
        ...current,
        supplierId: current.supplierId || supplierRows[0]?.id || "",
        productId: current.productId || productRows.find((product) => product.isStocked === 1)?.id || "",
      }));
      setLoading(false);
    }).catch((loadError: unknown) => {
      if (controller.signal.aborted) return;
      setError(errorMessage(loadError, "Purchasing data could not be loaded."));
      setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  const canManage = canManageWorkspace(role);
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId),
    [products, form.productId],
  );
  const receiptTotal = Math.round(Number(form.quantity) * Number(form.unitCost) * currencyMinorUnitScale(currencyCode));

  async function postReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await requestJson<{ reference: string }>("/api/purchases/receipts", {
        method: "POST",
        body: JSON.stringify({
          supplierId: form.supplierId,
          reference: form.reference,
          note: form.note,
          items: [{
            productId: form.productId,
            quantity: Number(form.quantity),
            unitCostMinor: Math.round(Number(form.unitCost) * currencyMinorUnitScale(currencyCode)),
          }],
        }),
      });
      setSuccess(`Receipt ${result.reference} posted; warehouse stock was updated.`);
      setForm((current) => ({ ...EMPTY_FORM, supplierId: current.supplierId, productId: current.productId }));
      setReload((value) => value + 1);
    } catch (saveError) {
      setError(errorMessage(saveError, "The purchase receipt could not be posted."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkspaceFrame
      title="Purchasing"
      description="Record received goods against a supplier. Posting a receipt records its cost and increases warehouse stock atomically."
      loading={loading}
      error={error}
      success={success}
    >
      {canManage && (
        <section className="panel workspace-panel">
          <div className="panel-head"><div><h2>Receive goods</h2><p>This posts a goods receipt immediately; purchase orders and supplier invoices are not part of this workflow.</p></div></div>
          <form className="workspace-form" onSubmit={(event) => void postReceipt(event)}>
            <label className="workspace-field"><span>Supplier</span><select required value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}><option value="">Choose supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.code} · {supplier.name}</option>)}</select></label>
            <label className="workspace-field"><span>Receipt reference</span><input required maxLength={64} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label>
            <label className="workspace-field"><span>Product</span><select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Choose stocked product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}</select></label>
            <label className="workspace-field"><span>Received quantity</span><input required type="number" min="1" max="1000000" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
            <label className="workspace-field"><span>Unit cost ({currencyCode})</span><input required type="number" min="0" step="any" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} /></label>
            <label className="workspace-field workspace-field-wide"><span>Receiving note</span><input maxLength={300} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
            <div className="workspace-receipt-summary">
              <span>{selectedProduct ? `${selectedProduct.name} · current stock ${selectedProduct.stock}` : "Choose a product"}</span>
              <strong>{new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(receiptTotal / currencyMinorUnitScale(currencyCode))}</strong>
            </div>
            <div className="workspace-form-actions"><button className="primary-btn" type="submit" disabled={submitting || suppliers.length === 0 || products.length === 0}>{submitting ? "Posting…" : "Post goods receipt"}</button></div>
          </form>
        </section>
      )}
      <section className="panel workspace-panel">
        <div className="panel-head"><div><h2>Recent goods receipts</h2><p>Receipts recorded for this branch.</p></div></div>
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead><tr><th>Reference</th><th>Supplier</th><th>Lines</th><th>Total cost</th><th>Received</th></tr></thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id}><td>{receipt.reference}</td><td>{receipt.supplierName}</td><td>{receipt.lineCount}</td>
                  <td>{new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(receipt.totalMinor / currencyMinorUnitScale(currencyCode))}</td>
                  <td>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.createdAt))}</td>
                </tr>
              ))}
              {!loading && receipts.length === 0 && <tr><td className="workspace-empty" colSpan={5}>No goods receipts have been recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceFrame>
  );
}
