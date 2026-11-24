import { ClipboardCheck } from "lucide-react";
import type { WarehouseInventory } from "../types";

export function StockCountHistory({
  counts,
  timezone,
}: {
  counts: WarehouseInventory["recentCounts"];
  timezone: string;
}) {
  return (
    <section className="warehouse-panel stock-count-history">
      <div className="warehouse-panel-heading">
        <div><h2>Recent stock counts</h2><p>Posted physical counts and variances</p></div>
        <span className="warehouse-activity-icon"><ClipboardCheck size={16} aria-hidden="true" /></span>
      </div>
      {counts.length ? (
        <ol className="warehouse-movements">
          {counts.map((count) => (
            <li key={count.id}>
              <span className="warehouse-movement-icon incoming"><ClipboardCheck size={15} aria-hidden="true" /></span>
              <div className="warehouse-movement-main">
                <strong>{count.productName}</strong>
                <span>{count.reason} · {count.sku}</span>
                <small>
                  System {count.expectedQuantity.toLocaleString()} · counted {count.countedQuantity.toLocaleString()} ·{" "}
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: timezone }).format(new Date(count.createdAt))}
                </small>
              </div>
              <strong className={`warehouse-movement-quantity ${count.quantityDelta < 0 ? "outgoing" : "incoming"}`}>
                {count.quantityDelta > 0 ? "+" : ""}{count.quantityDelta.toLocaleString()}
              </strong>
            </li>
          ))}
        </ol>
      ) : (
        <div className="warehouse-empty warehouse-movement-empty">
          <strong>No stock counts posted</strong>
          <span>Completed physical counts will appear here.</span>
        </div>
      )}
    </section>
  );
}
