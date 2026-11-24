import { Boxes, ReceiptText } from "lucide-react";
import { formatMinorUnits } from "../../../domain/sales";
import type { DashboardResponse } from "../types";

function timeLabel(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

export function RecentSalesPanel({ dashboard, currencyCode, timezone }: {
  dashboard: DashboardResponse;
  currencyCode: string;
  timezone: string;
}) {
  return (
    <article className="panel transactions-panel">
      <div className="panel-head"><div><h2>Recent sales</h2><p>Latest completed transactions</p></div></div>
      <div className="transaction-list">
        {dashboard.recentSales.length ? dashboard.recentSales.map((sale) => (
          <div className="transaction" key={sale.id}>
            <div className="transaction-icon"><ReceiptText size={16} aria-hidden="true" /></div>
            <div className="transaction-name"><strong>{sale.invoiceNumber}</strong><span>{sale.customerName} · {timeLabel(sale.createdAt, timezone)}</span></div>
            <strong className="amount">{formatMinorUnits(sale.totalMinor, currencyCode)}</strong>
            <span className="status">{sale.status}</span>
          </div>
        )) : <div className="list-empty">No completed sales yet.</div>}
      </div>
    </article>
  );
}

export function StockAlertsPanel({ dashboard }: { dashboard: DashboardResponse; }) {
  return (
    <article className="panel stock-panel">
      <div className="panel-head">
        <div><h2>Reorder alerts</h2><p>Compared with product reorder levels</p></div>
        <span className="alert-count">{dashboard.inventory.lowStock ?? 0}</span>
      </div>
      <div className="stock-list">
        {dashboard.lowStockItems.length ? dashboard.lowStockItems.map((item) => (
          <div className="stock-item" key={item.id}>
            <div className="stock-emoji"><Boxes size={16} aria-hidden="true" /></div>
            <div><strong>{item.name}</strong><span>{item.sku} · {item.quantity} on hand, reorder at {item.reorderLevel}</span></div>
            <span className={`stock-status ${item.quantity === 0 ? "critical" : ""}`}>{item.quantity === 0 ? "Out" : "Reorder"}</span>
          </div>
        )) : <div className="list-empty">No products currently below their reorder level.</div>}
      </div>
    </article>
  );
}
