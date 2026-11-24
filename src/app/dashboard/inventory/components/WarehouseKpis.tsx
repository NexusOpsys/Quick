import { AlertTriangle, Boxes, CircleOff, PackageCheck } from "lucide-react";

type WarehouseKpisProps = {
  products: number;
  totalUnits: number;
  lowStock: number;
  outOfStock: number;
};

const KPI_ITEMS = [
  { label: "Stocked products", key: "products", icon: Boxes, tone: "blue" },
  { label: "Units on hand", key: "totalUnits", icon: PackageCheck, tone: "cyan" },
  { label: "Below reorder point", key: "lowStock", icon: AlertTriangle, tone: "amber" },
  { label: "Out of stock", key: "outOfStock", icon: CircleOff, tone: "red" },
] as const;

export function WarehouseKpis({ products, totalUnits, lowStock, outOfStock }: WarehouseKpisProps) {
  const values = { products, totalUnits, lowStock, outOfStock };

  return (
    <section className="warehouse-kpis" aria-label="Warehouse stock summary">
      {KPI_ITEMS.map(({ label, key, icon: Icon, tone }) => (
        <article className="warehouse-kpi" key={key}>
          <div className={`warehouse-kpi-icon ${tone}`}><Icon size={18} aria-hidden="true" /></div>
          <div>
            <span>{label}</span>
            <strong>{values[key].toLocaleString()}</strong>
          </div>
        </article>
      ))}
    </section>
  );
}
