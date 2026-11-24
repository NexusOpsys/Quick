"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { currencyMinorUnitScale } from "../../../domain/sales";
import type { DashboardResponse } from "../../dashboard/types";
import { requestJson } from "../../../lib/api";
import WorkspaceFrame from "../components/WorkspaceFrame";
import { errorMessage, type WorkspaceSession } from "../types";

function csvCell(value: string | number): string {
  const text = String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function reportCsv(report: DashboardResponse): string {
  const rows: Array<Array<string | number>> = [
    ["Section", "Metric", "Value"],
    ["Period", "Start", report.period.start],
    ["Period", "End", report.period.end],
    ["Sales", "Transactions", report.sales.transactions],
    ["Sales", "Revenue minor units", report.sales.revenueMinor],
    ["Sales", "Average transaction minor units", report.sales.averageTransactionMinor],
    ["Inventory", "Products", report.inventory.products],
    ["Inventory", "Total stock units", report.inventory.totalStock],
    ["Inventory", "Low-stock products", report.inventory.lowStock ?? "Unavailable"],
  ];
  for (const point of report.salesTrend) rows.push(["Sales by day", point.date, point.revenueMinor]);
  for (const category of report.salesByCategory) rows.push(["Sales by category", category.name, category.revenueMinor]);
  for (const payment of report.paymentMethods) rows.push(["Payments", payment.method, payment.amountMinor]);
  for (const product of report.topProducts) rows.push(["Top products", `${product.sku} ${product.name}`, product.quantity]);
  if (report.expenses) rows.push(["Expenses", "Recorded amount minor units", report.expenses.summary.amountMinor]);
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export default function ReportsWorkspace() {
  const [report, setReport] = useState<DashboardResponse | null>(null);
  const [currencyCode, setCurrencyCode] = useState("MMK");
  const [days, setDays] = useState(30);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      requestJson<WorkspaceSession>("/api/auth/session", { signal: controller.signal }),
      requestJson<DashboardResponse>(`/api/reports?days=${days}`, { signal: controller.signal }),
    ]).then(([session, data]) => {
      if (controller.signal.aborted) return;
      setCurrencyCode(session.company.currencyCode);
      setReport(data);
      setLoading(false);
    }).catch((loadError: unknown) => {
      if (controller.signal.aborted) return;
      setError(errorMessage(loadError, "Reports could not be loaded."));
      setLoading(false);
    });
    return () => controller.abort();
  }, [days, reload]);

  function downloadCsv() {
    if (!report) return;
    const blob = new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `business-report-${days}-days.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const money = (minor: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(minor / currencyMinorUnitScale(currencyCode));
  return (
    <WorkspaceFrame
      title="Reports"
      description="Review role-scoped sales, product, payment, and inventory summaries, then export the same visible period as CSV."
      loading={loading}
      error={error}
      success=""
    >
      <div className="workspace-report-toolbar">
        <label className="workspace-field workspace-report-range"><span>Report period</span><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label>
        <button className="primary-btn" type="button" onClick={downloadCsv} disabled={!report}><Download size={15} aria-hidden="true" /> Export CSV</button>
        <button className="secondary-btn" type="button" onClick={() => setReload((value) => value + 1)} disabled={loading}>Refresh report</button>
      </div>
      {report && (
        <>
          <section className="workspace-report-kpis">
            <article className="panel workspace-report-card"><span>Revenue</span><strong>{money(report.sales.revenueMinor)}</strong><small>{report.sales.transactions} completed transactions</small></article>
            <article className="panel workspace-report-card"><span>Average transaction</span><strong>{money(report.sales.averageTransactionMinor)}</strong><small>For the selected period</small></article>
            <article className="panel workspace-report-card"><span>Stock on hand</span><strong>{report.inventory.totalStock.toLocaleString()}</strong><small>{report.inventory.products} active products</small></article>
            <article className="panel workspace-report-card"><span>Low stock</span><strong>{report.inventory.lowStock ?? "—"}</strong><small>Products at or below reorder level</small></article>
          </section>
          <div className="workspace-report-grid">
            <section className="panel workspace-panel">
              <div className="panel-head"><div><h2>Sales trend</h2><p>Daily completed sales, in {currencyCode}.</p></div></div>
              <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Date</th><th>Revenue</th></tr></thead><tbody>
                {report.salesTrend.map((point) => <tr key={point.date}><td>{point.date}</td><td>{money(point.revenueMinor)}</td></tr>)}
                {report.salesTrend.length === 0 && <tr><td className="workspace-empty" colSpan={2}>No sales in this period.</td></tr>}
              </tbody></table></div>
            </section>
            <section className="panel workspace-panel">
              <div className="panel-head"><div><h2>Sales by category</h2><p>Revenue grouped by product category.</p></div></div>
              <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Category</th><th>Revenue</th></tr></thead><tbody>
                {report.salesByCategory.map((row) => <tr key={row.name}><td>{row.name}</td><td>{money(row.revenueMinor)}</td></tr>)}
                {report.salesByCategory.length === 0 && <tr><td className="workspace-empty" colSpan={2}>No category sales in this period.</td></tr>}
              </tbody></table></div>
            </section>
          </div>
          <p className="workspace-report-note">Amounts in the CSV are exported as integer minor units to preserve exact currency values.</p>
        </>
      )}
    </WorkspaceFrame>
  );
}
