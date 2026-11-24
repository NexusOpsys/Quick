import { ArrowDownLeft, ArrowUpRight, Boxes } from "lucide-react";
import type { WarehouseInventory } from "../types";

const MOVEMENT_LABELS: Record<string, string> = {
  opening_balance: "Opening stock",
  sale: "POS sale",
  adjustment: "Stock adjustment",
  stock_count: "Physical stock count",
  purchase_receipt: "Goods receipt",
};

export function StockMovementFeed({
  movements,
  timezone,
}: {
  movements: WarehouseInventory["recentMovements"];
  timezone: string;
}) {
  return (
    <section className="warehouse-panel warehouse-movement-panel">
      <div className="warehouse-panel-heading">
        <div>
          <h2>Recent stock activity</h2>
          <p>Latest recorded movements</p>
        </div>
        <span className="warehouse-activity-icon"><Boxes size={16} aria-hidden="true" /></span>
      </div>
      {movements.length ? (
        <ol className="warehouse-movements">
          {movements.map((movement) => {
            const incoming = movement.quantityDelta > 0;
            return (
              <li key={movement.id}>
                <span className={`warehouse-movement-icon ${incoming ? "incoming" : "outgoing"}`}>
                  {incoming ? <ArrowDownLeft size={15} aria-hidden="true" /> : <ArrowUpRight size={15} aria-hidden="true" />}
                </span>
                <div className="warehouse-movement-main">
                  <strong>{movement.productName}</strong>
                  <span>{MOVEMENT_LABELS[movement.movementType] ?? movement.movementType.replaceAll("_", " ")} · {movement.sku}</span>
                  <small>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(movement.createdAt))}</small>
                </div>
                <strong className={`warehouse-movement-quantity ${incoming ? "incoming" : "outgoing"}`}>
                  {incoming ? "+" : ""}{movement.quantityDelta.toLocaleString()}
                </strong>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="warehouse-empty warehouse-movement-empty">
          <strong>No stock movements recorded</strong>
          <span>Opening stock, sales, adjustments, counts, and goods receipts appear here.</span>
        </div>
      )}
    </section>
  );
}
