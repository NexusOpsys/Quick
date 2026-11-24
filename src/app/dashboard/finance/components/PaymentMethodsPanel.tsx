import { formatMinorUnits } from "../../../../domain/sales";
import type { DashboardResponse } from "../../types";

export function PaymentMethodsPanel({ dashboard }: { dashboard: DashboardResponse; }) {
  const receivedMinor = dashboard.paymentMethods.reduce((sum, item) => sum + item.amountMinor, 0);

  return (
    <article className="panel finance-payments-panel">
      <div className="panel-head">
        <div><h2>Payments received</h2><p>Recorded POS payment allocations · {dashboard.period.days} days</p></div>
        <strong className="finance-payment-total">{formatMinorUnits(receivedMinor, dashboard.currencyCode)}</strong>
      </div>
      {dashboard.paymentMethods.length ? (
        <ul className="finance-payment-list">
          {dashboard.paymentMethods.map((payment) => {
            const share = receivedMinor ? payment.amountMinor / receivedMinor * 100 : 0;
            return (
              <li key={payment.method}>
                <div className="finance-payment-label">
                  <strong>{payment.method}</strong>
                  <span>{payment.transactions.toLocaleString()} transactions</span>
                  <b>{formatMinorUnits(payment.amountMinor, dashboard.currencyCode)}</b>
                </div>
                <div
                  className="finance-payment-track"
                  role="img"
                  aria-label={`${payment.method}: ${Math.round(share)} percent of recorded payments`}
                >
                  <span style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="finance-empty">No payments have been recorded in this period.</div>
      )}
    </article>
  );
}
