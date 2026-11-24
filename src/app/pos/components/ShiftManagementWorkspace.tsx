"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { requestJson } from "../../../lib/api";
import { CurrentShiftPanel } from "../../dashboard/cashier/components/CurrentShiftPanel";
import type { DashboardResponse } from "../../dashboard/types";

export default function ShiftManagementWorkspace() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    requestJson<DashboardResponse>("/api/dashboard?view=cashier", { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setDashboard(response);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Shift data could not be loaded.");
      });
    return () => controller.abort();
  }, [reload]);

  return (
    <div className="page pos-section-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">POINT OF SALE</p>
          <h1>Shift management</h1>
          <p>Open the register, record cash movements, and reconcile the drawer.</p>
        </div>
        <div className="heading-actions">
          <button
            className="icon-btn"
            type="button"
            onClick={() => setReload((value) => value + 1)}
            aria-label="Refresh shift data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      {error ? (
        <div className="warehouse-refresh-error" role="alert">
          <span>{error}</span>
          <button className="secondary-btn" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>
        </div>
      ) : dashboard ? (
        <div className="dashboard-grid role-dashboard-grid">
          <CurrentShiftPanel
            paymentCount={dashboard.paymentMethods.reduce((sum, item) => sum + item.transactions, 0)}
            currencyCode={dashboard.currencyCode}
            timezone={dashboard.timezone}
            canOperateShift
          />
        </div>
      ) : (
        <p className="dashboard-loading" role="status">Loading shift data…</p>
      )}
    </div>
  );
}
