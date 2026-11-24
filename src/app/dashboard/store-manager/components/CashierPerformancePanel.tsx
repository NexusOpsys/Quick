import { formatMinorUnits } from "../../../../domain/sales";
import type { DashboardResponse } from "../../types";

export function CashierPerformancePanel({ dashboard }: { dashboard: DashboardResponse; }) {
  return (
    <article className="panel manager-performance-panel">
      <div className="panel-head"><div><h2>Cashier performance</h2><p>Completed sales · {dashboard.period.days} days</p></div></div>
      {dashboard.cashierPerformance.length ? (
        <div className="manager-table-scroll">
          <table className="manager-table">
            <thead><tr><th scope="col">Cashier</th><th scope="col" className="numeric">Transactions</th><th scope="col" className="numeric">Recorded sales</th></tr></thead>
            <tbody>
              {dashboard.cashierPerformance.map((cashier) => (
                <tr key={cashier.id}>
                  <td><span className="manager-cashier-avatar">{cashier.email.slice(0, 1).toUpperCase()}</span>{cashier.email}</td>
                  <td className="numeric">{cashier.transactions.toLocaleString()}</td>
                  <td className="numeric">{formatMinorUnits(cashier.revenueMinor, dashboard.currencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="finance-empty">No cashier sales are recorded in this period.</div>
      )}
      <div className="manager-shift-summary">
        <strong>Shift reconciliation</strong>
        <span>{dashboard.shiftSummary.openShifts.toLocaleString()} open shifts · {dashboard.shiftSummary.closedShifts.toLocaleString()} closed in period</span>
        <span>Net recorded cash variance: {formatMinorUnits(dashboard.shiftSummary.varianceMinor, dashboard.currencyCode)}</span>
      </div>
    </article>
  );
}
