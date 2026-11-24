import { BadgePercent, CircleDollarSign, ReceiptText, Users } from "lucide-react";
import { formatMinorUnits } from "../../../../domain/sales";
import type { DashboardResponse } from "../../types";
import { RecentSalesPanel, StockAlertsPanel } from "../../shared/ActivityPanels";
import { CashierPerformancePanel } from "./CashierPerformancePanel";

export function StoreManagerDashboard({ dashboard }: { dashboard: DashboardResponse; }) {
  const metrics = [
    { label: "Branch sales", value: formatMinorUnits(dashboard.sales.revenueMinor, dashboard.currencyCode), icon: CircleDollarSign, tone: "blue" },
    { label: "Transactions", value: dashboard.sales.transactions.toLocaleString(), icon: ReceiptText, tone: "cyan" },
    { label: "Average transaction", value: formatMinorUnits(dashboard.sales.averageTransactionMinor, dashboard.currencyCode), icon: Users, tone: "green" },
    { label: "Item discounts", value: formatMinorUnits(dashboard.discounts.discountMinor, dashboard.currencyCode), icon: BadgePercent, tone: "orange" },
  ];

  return (
    <>
      <section className="kpi-grid" aria-label="Store manager dashboard summary">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <article className="kpi-card" key={label}>
            <div className={`kpi-icon ${tone}`}><Icon size={18} aria-hidden="true" /></div>
            <div className="kpi-main"><span>{label}</span><strong>{value}</strong></div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid role-dashboard-grid">
        <CashierPerformancePanel dashboard={dashboard} />
        <StockAlertsPanel dashboard={dashboard} />
        <RecentSalesPanel dashboard={dashboard} currencyCode={dashboard.currencyCode} timezone={dashboard.timezone} />
      </section>
    </>
  );
}
