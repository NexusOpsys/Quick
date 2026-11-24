import { Banknote, CircleDollarSign, ReceiptText } from "lucide-react";
import Link from "next/link";
import { formatMinorUnits } from "../../../../domain/sales";
import type { DashboardResponse } from "../../types";
import { RecentSalesPanel } from "../../shared/ActivityPanels";
import { CurrentShiftPanel } from "./CurrentShiftPanel";

export function CashierDashboard({ dashboard, canOperateShift }: { dashboard: DashboardResponse; canOperateShift: boolean }) {
  const paymentCount = dashboard.paymentMethods.reduce((sum, item) => sum + item.transactions, 0);
  const metrics = [
    { label: "Your recorded sales", value: formatMinorUnits(dashboard.sales.revenueMinor, dashboard.currencyCode), icon: CircleDollarSign, tone: "blue" },
    { label: "Transactions", value: dashboard.sales.transactions.toLocaleString(), icon: ReceiptText, tone: "cyan" },
    { label: "Average transaction", value: formatMinorUnits(dashboard.sales.averageTransactionMinor, dashboard.currencyCode), icon: Banknote, tone: "green" },
  ];

  return (
    <>
      <section className="kpi-grid cashier-kpis" aria-label="Cashier dashboard summary">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <article className="kpi-card" key={label}>
            <div className={`kpi-icon ${tone}`}><Icon size={18} aria-hidden="true" /></div>
            <div className="kpi-main"><span>{label}</span><strong>{value}</strong></div>
          </article>
        ))}
        <Link className="cashier-new-sale" href="/pos"><ReceiptText size={18} aria-hidden="true" /><span>Start a new sale</span></Link>
      </section>

      <section className="dashboard-grid role-dashboard-grid cashier-dashboard-grid">
        <RecentSalesPanel dashboard={dashboard} currencyCode={dashboard.currencyCode} timezone={dashboard.timezone} />
        <CurrentShiftPanel
          paymentCount={paymentCount}
          currencyCode={dashboard.currencyCode}
          timezone={dashboard.timezone}
          canOperateShift={canOperateShift}
        />
      </section>
    </>
  );
}
