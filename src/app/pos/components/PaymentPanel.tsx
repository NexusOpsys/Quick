import { Banknote, CreditCard, Landmark, WalletCards } from "lucide-react";
import { currencyMinorUnitScale, type CartTotals } from "../../../domain/sales";
import { money } from "./pos-format";

const PAYMENT_METHODS = [
  ["Cash", Banknote],
  ["Card", CreditCard],
  ["KBZPay", WalletCards],
  ["Credit", Landmark],
] as const;

type PaymentPanelProps = {
  totals: CartTotals;
  currencyCode: string;
  payment: string;
  onPaymentChange: (method: string) => void;
  splitEnabled: boolean;
  onSplitEnabledChange: (enabled: boolean) => void;
  splitMethod: string;
  onSplitMethodChange: (method: string) => void;
  splitAmount: string;
  onSplitAmountChange: (amount: string) => void;
  splitAmountMinor: number;
  checkoutError: string;
  lastSaleNumber?: string;
  submitting: boolean;
  onCheckout: () => void;
};

export function PaymentPanel({
  totals,
  currencyCode,
  payment,
  onPaymentChange,
  splitEnabled,
  onSplitEnabledChange,
  splitMethod,
  onSplitMethodChange,
  splitAmount,
  onSplitAmountChange,
  splitAmountMinor,
  checkoutError,
  lastSaleNumber,
  submitting,
  onCheckout,
}: PaymentPanelProps) {
  const remainingMinor = totals.totalMinor - splitAmountMinor;
  const splitExceedsTotal = splitAmountMinor > totals.totalMinor;
  const currencyScale = currencyMinorUnitScale(currencyCode);

  return (
    <>
      <div className="pos-totals">
        <div><span>Subtotal</span><strong>{money(totals.subtotalMinor, currencyCode)}</strong></div>
        {totals.discountMinor > 0 && <div><span>Discount</span><strong>-{money(totals.discountMinor, currencyCode)}</strong></div>}
        <div><span>Tax</span><strong>{money(totals.taxMinor, currencyCode)}</strong></div>
        <div className="pos-grand-total"><span>Total</span><strong>{money(totals.totalMinor, currencyCode)}</strong></div>
      </div>

      <div className="pos-payment-methods">
        {PAYMENT_METHODS.map(([name, Icon]) => (
          <button key={name} type="button" className={`pos-payment ${payment === name ? "active" : ""}`} onClick={() => onPaymentChange(name)}>
            <Icon size={15} /><span>{name}</span>
          </button>
        ))}
      </div>

      <label className="pos-split-toggle">
        <input type="checkbox" checked={splitEnabled} onChange={(event) => onSplitEnabledChange(event.target.checked)} />
        Split payment
      </label>
      {splitEnabled && (
        <div className="pos-split-fields">
          <label>
            Second method
            <select value={splitMethod} onChange={(event) => onSplitMethodChange(event.target.value)}>
              {PAYMENT_METHODS.filter(([name]) => name !== payment).map(([name]) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label>
            Amount ({currencyCode})
            <input type="number" min="0" max={totals.totalMinor / currencyScale} step={1 / currencyScale} value={splitAmount} onChange={(event) => onSplitAmountChange(event.target.value)} />
          </label>
          {splitExceedsTotal && <span className="pos-split-error">Split amount cannot exceed the sale total.</span>}
          {!splitExceedsTotal && remainingMinor < 0 && <span className="pos-split-error">Invalid remaining payment amount.</span>}
        </div>
      )}

      <button className="pos-checkout-btn" type="button" disabled={totals.totalMinor <= 0 || submitting || splitExceedsTotal} onClick={onCheckout}>
        <span>{submitting ? "Recording sale…" : "Complete sale"}</span>
        <strong>{money(totals.totalMinor, currencyCode)}</strong>
      </button>
      {checkoutError && <p className="pos-checkout-status error" role="alert">{checkoutError}</p>}
      {lastSaleNumber && <p className="pos-checkout-status success" role="status">Sale recorded: {lastSaleNumber}</p>}
    </>
  );
}
