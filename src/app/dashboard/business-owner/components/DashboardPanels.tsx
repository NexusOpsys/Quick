import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMinorUnits } from "../../../../domain/sales";
import type { DashboardResponse } from "../../types";

const CHART_COLORS = ["#93ccff", "#3198dc", "#00a6e0", "#7bd0ff", "#a078ff", "#70c7a2"];

function money(amountMinor: number, currencyCode: string): string {
  return formatMinorUnits(amountMinor, currencyCode);
}

function dateLabel(date: string, timezone: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short", timeZone: timezone })
    .format(new Date(`${date}T12:00:00Z`));
}

export function SalesRevenuePanel({ dashboard, currencyCode, timezone, days }: {
  dashboard: DashboardResponse | null;
  currencyCode: string;
  timezone: string;
  days: number;
}) {
  return (
    <article className="panel sales-panel">
      <div className="panel-head"><div><h2>Sales revenue</h2><p>Recorded completed sales · last {days} days</p></div></div>
      <div className="chart-summary"><strong>{dashboard ? money(dashboard.sales.revenueMinor, currencyCode) : "—"}</strong><span>Source: completed sales</span></div>
      <div className="chart-wrap">
        {dashboard && dashboard.salesTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dashboard.salesTrend} margin={{ left: -24, right: 4, top: 8, bottom: 0 }}>
              <defs><linearGradient id="sales" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#93ccff" stopOpacity={0.28} /><stop offset="100%" stopColor="#93ccff" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#283345" />
              <XAxis dataKey="date" tickFormatter={(value: string) => dateLabel(value, timezone)} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value: number) => value.toLocaleString()} />
              <Tooltip formatter={(value) => money(Number(value), currencyCode)} labelFormatter={(value) => dateLabel(String(value), timezone)} contentStyle={{ borderRadius: 8, background: "#171b26", border: "1px solid #3f4850", color: "#e2e8f0" }} />
              <Area type="monotone" dataKey="revenueMinor" name="Revenue" stroke="#93ccff" strokeWidth={2.5} fill="url(#sales)" activeDot={{ r: 5, fill: "#93ccff", stroke: "#171b26", strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">No completed sales in this period.</div>}
      </div>
    </article>
  );
}

export function CategorySalesPanel({ dashboard, currencyCode }: {
  dashboard: DashboardResponse | null;
  currencyCode: string;
}) {
  const categoryTotal = dashboard?.salesByCategory.reduce((sum, item) => sum + item.revenueMinor, 0) ?? 0;
  return (
    <article className="panel category-panel">
      <div className="panel-head"><div><h2>Sales by category</h2><p>From recorded sale items</p></div></div>
      {dashboard && categoryTotal > 0 ? (
        <>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.salesByCategory} dataKey="revenueMinor" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
                  {dashboard.salesByCategory.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value), currencyCode)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><strong>{money(categoryTotal, currencyCode)}</strong><span>Net line sales</span></div>
          </div>
          <div className="legend">
            {dashboard.salesByCategory.map((item, index) => (
              <div key={item.name}>
                <span className="legend-dot" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span>{item.name}</span>
                <strong>{Math.round((item.revenueMinor / categoryTotal) * 100)}%</strong>
              </div>
            ))}
          </div>
        </>
      ) : <div className="category-empty">Category totals appear after sales are recorded.</div>}
    </article>
  );
}


