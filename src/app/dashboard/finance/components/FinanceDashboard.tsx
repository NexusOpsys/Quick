import { Banknote, CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";
import { formatMinorUnits } from "../../../../domain/sales";
import type { DashboardResponse } from "../../types";
import { RecentSalesPanel } from "../../shared/ActivityPanels";
import { FinancialCoveragePanel } from "./FinancialCoveragePanel";
import { PaymentMethodsPanel } from "./PaymentMethodsPanel";
import { ExpensesPanel } from "./ExpensesPanel";

export function FinanceDashboard({ dashboard, onExpenseRecorded }: {
  dashboard: DashboardResponse;
  onExpenseRecorded: () => void;
}) {
  const paymentCount = dashboard.paymentMethods.reduce((sum, item) => sum + item.transactions, 0);
  const metrics = [
    { label: "Recorded sales revenue", value: formatMinorUnits(dashboard.sales.revenueMinor, dashboard.currencyCode), icon: CircleDollarSign, tone: "blue" },
    { label: "Payments recorded", value: paymentCount.toLocaleString(), icon: Banknote, tone: "cyan" },
    { label: "Recorded expenses", value: dashboard.expenses ? formatMinorUnits(dashboard.expenses.summary.amountMinor, dashboard.currencyCode) : "Unavailable", icon: ReceiptText, tone: "amber" },
    { label: "Cash & bank balance", value: "Not tracked", icon: WalletCards, tone: "violet" },
  ];

  return (
    <>
      <section className="kpi-grid finance-kpis" aria-label="Finance dashboard summary">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <article className="kpi-card" key={label}>
            <div className={`kpi-icon ${tone}`}><Icon size={18} aria-hidden="true" /></div>
            <div className="kpi-main"><span>{label}</span><strong>{value}</strong></div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid role-dashboard-grid">
        <PaymentMethodsPanel dashboard={dashboard} />
        <FinancialCoveragePanel />
        <RecentSalesPanel dashboard={dashboard} currencyCode={dashboard.currencyCode} timezone={dashboard.timezone} />
        {dashboard.expenses && (
          <ExpensesPanel
            expenses={dashboard.expenses}
            currencyCode={dashboard.currencyCode}
            timezone={dashboard.timezone}
            onExpenseRecorded={onExpenseRecorded}
          />
        )}
      </section>
    </>
  );
}
