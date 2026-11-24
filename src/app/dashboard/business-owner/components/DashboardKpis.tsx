import { Boxes, CircleDollarSign, Package, ReceiptText } from "lucide-react";
import { formatMinorUnits } from "../../../../domain/sales";

type DashboardKpisProps = {
  currencyCode: string;
  revenueMinor: number | null;
  transactions: number | null;
  products: number | null;
  lowStock: number | null;
};

const KPI_TONES = ["violet", "blue", "green", "orange"] as const;
const KPI_ITEMS = [
  { label: "Sales revenue", icon: CircleDollarSign },
  { label: "Transactions", icon: ReceiptText },
  { label: "Active products", icon: Package },
  { label: "Low-stock items", icon: Boxes },
] as const;

export function DashboardKpis({ currencyCode, revenueMinor, transactions, products, lowStock }: DashboardKpisProps) {
  const values = [
    revenueMinor === null ? "—" : formatMinorUnits(revenueMinor, currencyCode),
    transactions === null ? "—" : transactions.toLocaleString(),
    products === null ? "—" : products.toLocaleString(),
    lowStock === null ? "—" : lowStock.toLocaleString(),
  ];

  return (
    <section className="kpi-grid">
      {KPI_ITEMS.map(({ label, icon: Icon }, index) => (
        <article className="kpi-card" key={label}>
          <div className={`kpi-icon ${KPI_TONES[index]}`}><Icon size={19} /></div>
          <div className="kpi-main"><span>{label}</span><strong>{values[index]}</strong></div>
        </article>
      ))}
    </section>
  );
}
