"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DASHBOARD_PERMISSION, hasDashboardPermission, type DashboardPermission } from "../../../domain/dashboard";
import { isUnauthorizedError, requestJson } from "../../../lib/api";
import DashboardHome from "../../dashboard/DashboardHome";
import InventoryDashboard from "../../dashboard/inventory/InventoryDashboard";
import type { DashboardSession } from "../../dashboard/types";
import WorkspaceModule from "../../workspace/WorkspaceModule";
import { PosSectionHeader } from "./PosSectionHeader";
import { PosSidebar } from "./PosSidebar";
import ShiftManagementWorkspace from "./ShiftManagementWorkspace";
import type { PosSession } from "./types";
import "../pos.css";

type PosSection = "cashier" | "shifts" | "inventory" | "purchasing" | "finance" | "reports" | "settings";
type PosSectionConfig = {
  title: string;
  permission?: DashboardPermission;
  roles?: readonly string[];
};

const SECTION_CONFIG: Record<PosSection, PosSectionConfig> = {
  cashier: { title: "Cashier view", permission: DASHBOARD_PERMISSION.cashier },
  shifts: { title: "Shift management", permission: DASHBOARD_PERMISSION.cashier },
  inventory: { title: "Warehouse management", permission: DASHBOARD_PERMISSION.inventory },
  purchasing: { title: "Goods receiving", roles: ["owner", "manager"] },
  finance: { title: "Finance dashboard", permission: DASHBOARD_PERMISSION.finance },
  reports: { title: "Sales analytics", roles: ["owner", "manager"] },
  settings: { title: "Business settings", roles: ["owner"] },
};

type PageStatus = "loading" | "ready" | "unauthorized" | "error";

function hasSectionAccess(role: string, config: PosSectionConfig): boolean {
  return config.permission
    ? hasDashboardPermission(role, config.permission)
    : Boolean(config.roles?.includes(role));
}

function sectionContent(section: PosSection) {
  switch (section) {
    case "cashier":
      return <DashboardHome requestedView="cashier" />;
    case "shifts":
      return <ShiftManagementWorkspace />;
    case "inventory":
      return <InventoryDashboard />;
    case "purchasing":
      return <WorkspaceModule module="Purchasing" />;
    case "finance":
      return <DashboardHome requestedView="finance" />;
    case "reports":
      return <WorkspaceModule module="Reports" />;
    case "settings":
      return <WorkspaceModule module="Settings" />;
  }
}

export default function PosSectionPage({ section }: { section: PosSection }) {
  const [session, setSession] = useState<PosSession | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const config = SECTION_CONFIG[section];

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    requestJson<DashboardSession>("/api/auth/session", { signal: controller.signal })
      .then((currentSession) => {
        if (controller.signal.aborted) return;
        if (!currentSession.company.setupComplete) {
          window.location.assign("/setup");
          return;
        }
        setSession(currentSession);
        setStatus("ready");
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        if (isUnauthorizedError(loadError)) {
          setStatus("unauthorized");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "POS workspace could not be loaded.");
        setStatus("error");
      });
    return () => controller.abort();
  }, [reload]);

  if (!session || status !== "ready") {
    const title = status === "loading"
      ? "Loading POS workspace"
      : status === "unauthorized"
        ? "Sign in to continue"
        : "POS workspace is unavailable";
    const message = status === "loading"
      ? "Loading your authorized dashboard section."
      : status === "unauthorized"
        ? "Sign in to open this POS section."
        : error;
    return (
      <div className="pos-root">
        <div className="pos-state-card" role={status === "loading" ? "status" : "alert"}>
          <h1>{title}</h1>
          <p>{message}</p>
          {status === "unauthorized"
            ? <Link href={`/login?returnTo=/pos/${section}`} className="pos-state-button">Go to sign in</Link>
            : status === "error"
              ? <button className="pos-state-button" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>
              : null}
        </div>
      </div>
    );
  }

  const allowed = hasSectionAccess(session.user.role, config);

  return (
    <div className="pos-root">
      <a className="pos-skip-link" href="#pos-content">Skip to {config.title}</a>
      <PosSidebar
        branchName={session.branch.name}
        role={session.user.role}
        activeSection={section}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <PosSectionHeader
        session={session}
        title={config.title}
        navOpen={mobileNavOpen}
        onMenuClick={() => setMobileNavOpen((value) => !value)}
      />
      <main className="pos-main pos-section-main" id="pos-content">
        {allowed
          ? sectionContent(section)
          : (
            <div className="pos-state-card" role="alert">
              <h1>This POS section isn&apos;t available to your role</h1>
              <p>Your dashboard access is unchanged. Choose a section available to your account.</p>
              <Link href="/pos" className="pos-state-button">Return to POS terminal</Link>
            </div>
          )}
      </main>
    </div>
  );
}
