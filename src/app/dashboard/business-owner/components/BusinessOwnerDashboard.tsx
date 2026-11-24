import { DashboardKpis } from "./DashboardKpis";
import {
  CategorySalesPanel,
  SalesRevenuePanel,
} from "./DashboardPanels";
import { RecentSalesPanel, StockAlertsPanel } from "../../shared/ActivityPanels";
import { ExpensesPanel } from "../../finance/components/ExpensesPanel";
import type { DashboardResponse } from "../../types";

export function BusinessOwnerDashboard({
  dashboard,
  days,
  onExpenseRecorded,
}: {
  dashboard: DashboardResponse;
  days: number;
  onExpenseRecorded: () => void;
}) {
  return (
    <>
      <DashboardKpis
        currencyCode={dashboard.currencyCode}
        revenueMinor={dashboard.sales.revenueMinor}
        transactions={dashboard.sales.transactions}
        products={dashboard.inventory.products}
        lowStock={dashboard.inventory.lowStock}
      />
      <section className="dashboard-grid">
        <SalesRevenuePanel dashboard={dashboard} currencyCode={dashboard.currencyCode} timezone={dashboard.timezone} days={days} />
        <CategorySalesPanel dashboard={dashboard} currencyCode={dashboard.currencyCode} />
        <RecentSalesPanel dashboard={dashboard} currencyCode={dashboard.currencyCode} timezone={dashboard.timezone} />
        <StockAlertsPanel dashboard={dashboard} />
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
