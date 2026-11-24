import type { DashboardView } from "../../domain/dashboard";

export type DashboardResponse = {
  view: DashboardView;
  currencyCode: string;
  timezone: string;
  period: { start: string; end: string; days: number };
  sales: { transactions: number; revenueMinor: number; averageTransactionMinor: number };
  inventory: { products: number; totalStock: number; lowStock: number | null };
  salesTrend: Array<{ date: string; revenueMinor: number }>;
  salesByCategory: Array<{ name: string; revenueMinor: number }>;
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    totalMinor: number;
    status: string;
    createdAt: string;
    customerName: string;
  }>;
  paymentMethods: Array<{ method: string; transactions: number; amountMinor: number }>;
  discounts: { discountMinor: number };
  topProducts: Array<{ id: string; name: string; sku: string; quantity: number; revenueMinor: number }>;
  cashierPerformance: Array<{ id: string; email: string; transactions: number; revenueMinor: number }>;
  expenses: null | {
    summary: { count: number; amountMinor: number };
    byCategory: Array<{ category: string; count: number; amountMinor: number }>;
    recent: Array<{
      id: string;
      amountMinor: number;
      category: string;
      memo: string;
      createdAt: string;
      recordedBy: string;
    }>;
  };
  shiftSummary: { openShifts: number; closedShifts: number; varianceMinor: number };
  lowStockItems: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    reorderLevel: number;
  }>;
};

export type DashboardSession = {
  user: { id: string; email: string; role: string };
  company: { name: string; currencyCode: string; timezone: string; setupComplete: boolean };
  branch: { id: string; name: string };
};
