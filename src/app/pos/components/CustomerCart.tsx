import { Minus, Package, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import type { CartLine, PosCustomer } from "./types";
import { CATEGORY_EMOJI, money } from "./pos-format";
import { currencyMinorUnitScale } from "../../../domain/sales";

type CustomerCartProps = {
  customers: PosCustomer[];
  customerId: string;
  onCustomerChange: (id: string) => void;
  cart: CartLine[];
  currencyCode: string;
  onQuantityChange: (id: string, delta: number) => void;
  onDiscountChange: (id: string, amount: string) => void;
};

export function CustomerCart({
  customers,
  customerId,
  onCustomerChange,
  cart,
  currencyCode,
  onQuantityChange,
  onDiscountChange,
}: CustomerCartProps) {
  const customer = customers.find((item) => item.id === customerId);
  const currencyScale = currencyMinorUnitScale(currencyCode);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      <div className="pos-customer">
        <div className="pos-customer-head">
          <div className="pos-customer-icon"><Store size={18} /></div>
          <div><strong>{customer?.name ?? "Walk-in customer"}</strong><span>{customer ? customer.phone || customer.email || "Registered customer" : "No customer account selected"}</span></div>
          <span className="pos-tier">Customer</span>
        </div>
        <label className="pos-customer-select-label" htmlFor="pos-customer-select">Attach customer</label>
        <select id="pos-customer-select" className="pos-customer-select" value={customerId} onChange={(event) => onCustomerChange(event.target.value)}>
          <option value="">Walk-in customer</option>
          {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      <div className="pos-cart">
        <div className="pos-cart-head"><h2>Current sale</h2><span>{cartCount} items</span></div>
        <div className="pos-cart-lines">
          {cart.length === 0 ? (
            <div className="pos-cart-empty"><ShoppingCart size={26} /><strong>Cart is empty</strong><span>Scan or select products to begin</span></div>
          ) : cart.map((item) => (
            <div className="pos-cart-line" key={item.id}>
              <div className="pos-cart-line-emoji">{CATEGORY_EMOJI[item.category] ?? <Package size={15} />}</div>
              <div className="pos-cart-line-info">
                <strong>{item.name}</strong>
                <span>{money(item.priceMinor, currencyCode)} each</span>
              </div>
              <div className="pos-qty-control">
                <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => onQuantityChange(item.id, -1)}><Minus size={13} /></button>
                <span>{item.qty}</span>
                <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => onQuantityChange(item.id, 1)} disabled={item.isStocked === 1 && item.qty >= item.stock}><Plus size={13} /></button>
              </div>
              <strong className="pos-line-total">{money(item.priceMinor * item.qty - item.discountMinor, currencyCode)}</strong>
              <button type="button" className="pos-line-remove" aria-label={`Remove ${item.name}`} onClick={() => onQuantityChange(item.id, -item.qty)}><Trash2 size={14} /></button>
              <label className="pos-item-discount">
                Discount ({currencyCode})
                <input
                  type="number"
                  min="0"
                  max={item.priceMinor * item.qty / currencyScale}
                  step={1 / currencyScale}
                  value={item.discountMinor / currencyScale || ""}
                  onChange={(event) => onDiscountChange(item.id, event.target.value)}
                  aria-label={`Discount for ${item.name}`}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
