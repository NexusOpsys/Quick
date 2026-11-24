"use client";

import { useEffect, useState } from "react";
import { Clock3, ChevronDown, RefreshCw, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { ApiError, isUnauthorizedError, requestJson } from "../../lib/api";
import type { DashboardView } from "../../domain/dashboard";
import { BusinessOwnerDashboard } from "./business-owner/components/BusinessOwnerDashboard";
import { CashierDashboard } from "./cashier/components/CashierDashboard";
import { FinanceDashboard } from "./finance/components/FinanceDashboard";
import { StoreManagerDashboard } from "./store-manager/components/StoreManagerDashboard";
import { DashboardLoadState } from "./shared/DashboardLoadState";
import type { DashboardResponse, DashboardSession } from "./types";

type LoadStatus = "loading" | "ready" | "error" | "unauthorized" | "forbidden";
const DASHBOARD_TITLES: Record<DashboardView, string> = {
  business_owner: "Business owner dashboard",
  finance: "Finance dashboard",
  store_manager: "Store manager dashboard",
  cashier: "Cashier dashboard",
};

export default function DashboardHome({ requestedView }: { requestedView?: DashboardView }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [session, setSession] = useState<DashboardSession | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError("");

    async function load() {
      try {
        const [currentSession, currentDashboard] = await Promise.all([
          requestJson<DashboardSession>("/api/auth/session", { signal: controller.signal }),
          requestJson<DashboardResponse>(`/api/dashboard?${new URLSearchParams({
            days: String(days),
            ...(requestedView ? { view: requestedView } : {}),
          })}`, { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        if (!currentSession.company.setupComplete) {
          window.location.assign("/setup");
          return;
        }
        setSession(currentSession);
        setDashboard(currentDashboard);
        setStatus("ready");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        if (isUnauthorizedError(loadError)) {
          setStatus("unauthorized");
          return;
        }
        if (loadError instanceof ApiError && loadError.status === 403) {
          setStatus("forbidden");
          setError(loadError.message);
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Dashboard data could not be loaded.");
        setStatus("error");
      }
    }

    void load();
    return () => controller.abort();
  }, [days, reload, requestedView]);

  if (status === "unauthorized") {
    return (
      <DashboardLoadState
        title="Sign in to view your dashboard"
        message="Business data is only available to an authenticated account."
        action={<Link className="primary-btn" href="/login?returnTo=/">Go to sign in</Link>}
      />
    );
  }

  if (status === "forbidden") {
    return (
      <DashboardLoadState
        title="This dashboard isn't available to your role"
        message={error}
        action={<Link className="primary-btn" href="/">Go to your dashboard</Link>}
      />
    );
  }

  if (status === "error") {
    return (
      <DashboardLoadState
        title="Dashboard data is unavailable"
        message={error}
        action={<button className="secondary-btn" onClick={() => setReload((value) => value + 1)}><RefreshCw size={15} /> Try again</button>}
      />
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{session?.branch.name.toUpperCase() ?? "BUSINESS OVERVIEW"}</p>
          <h1>{DASHBOARD_TITLES[dashboard?.view ?? "business_owner"]}</h1>
        </div>
        <div className="heading-actions">
          <label className="secondary-btn date-filter">
            <Clock3 size={16} />
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Dashboard date range">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <ChevronDown size={14} />
          </label>
          <button className="icon-btn" onClick={() => setReload((value) => value + 1)} aria-label="Refresh dashboard" disabled={status === "loading"}>
            <RefreshCw size={16} />
          </button>
          {session?.user.role === "owner" && dashboard?.view === "business_owner" && (
            <>
              <Link className="secondary-btn" href="/finance">Finance dashboard</Link>
              <Link className="secondary-btn" href="/warehouse">Inventory dashboard</Link>
            </>
          )}
          {dashboard?.view === "cashier"
            ? <Link className="primary-btn" href="/pos"><ShoppingCart size={16} aria-hidden="true" /> New sale</Link>
            : null}
        </div>
      </div>

      {status === "loading" && !dashboard && <div className="dashboard-loading" role="status">Loading authorized business data…</div>}

      {dashboard && dashboard.view === "finance" && (
        <FinanceDashboard dashboard={dashboard} onExpenseRecorded={() => setReload((value) => value + 1)} />
      )}
      {dashboard && dashboard.view === "store_manager" && <StoreManagerDashboard dashboard={dashboard} />}
      {dashboard && dashboard.view === "cashier" && (
        <CashierDashboard
          dashboard={dashboard}
          canOperateShift={session?.user.role === "cashier" || session?.user.role === "owner"}
        />
      )}
      {dashboard && dashboard.view === "business_owner" && (
        <BusinessOwnerDashboard
          dashboard={dashboard}
          days={days}
          onExpenseRecorded={() => setReload((value) => value + 1)}
        />
      )}
    </div>
  );
}
