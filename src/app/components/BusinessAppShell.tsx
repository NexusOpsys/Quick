"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { DASHBOARD_PERMISSION, hasDashboardPermission, type DashboardPermission } from "../../domain/dashboard";
import { requestJson } from "../../lib/api";
import DashboardHome from "../dashboard/DashboardHome";
import InventoryDashboard from "../dashboard/inventory/InventoryDashboard";
import type { DashboardSession } from "../dashboard/types";
import WorkspaceModule from "../workspace/WorkspaceModule";

export type AppView = "Dashboard" | "Store manager" | "Cashier" | "Warehouse" | "Finance" | "Products" | "Purchasing" | "Customers" | "Suppliers" | "Reports" | "Settings";
type NavigationItem = {
  label: AppView | "POS";
  icon: typeof LayoutDashboard;
  href: string;
  section: "DASHBOARDS" | "WORKSPACE";
  permission?: DashboardPermission;
  roles?: readonly string[];
};

const navigation: NavigationItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/", section: "DASHBOARDS" },
  { label: "Store manager", icon: LayoutDashboard, href: "/store-manager", section: "DASHBOARDS", permission: DASHBOARD_PERMISSION.storeManager },
  { label: "Cashier", icon: ShoppingCart, href: "/cashier", section: "DASHBOARDS", permission: DASHBOARD_PERMISSION.cashier },
  { label: "Warehouse", icon: Boxes, href: "/warehouse", section: "DASHBOARDS", permission: DASHBOARD_PERMISSION.inventory },
  { label: "Finance", icon: WalletCards, href: "/finance", section: "DASHBOARDS", permission: DASHBOARD_PERMISSION.finance },
  { label: "POS", icon: ShoppingCart, href: "/pos", section: "DASHBOARDS" },
  { label: "Products", icon: Package, href: "/workspace/products", section: "WORKSPACE" },
  { label: "Purchasing", icon: Truck, href: "/workspace/purchasing", section: "WORKSPACE", roles: ["owner", "manager"] },
  { label: "Customers", icon: Users, href: "/workspace/customers", section: "WORKSPACE" },
  { label: "Suppliers", icon: Users, href: "/workspace/suppliers", section: "WORKSPACE", roles: ["owner", "manager"] },
  { label: "Reports", icon: BarChart3, href: "/workspace/reports", section: "WORKSPACE", roles: ["owner", "manager"] },
  { label: "Settings", icon: Settings, href: "/workspace/settings", section: "WORKSPACE", roles: ["owner"] },
];

export default function BusinessAppShell({ initialView = "Dashboard" }: { initialView?: AppView }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigationRole, setNavigationRole] = useState<string | null>(null);
  const [navigationError, setNavigationError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    requestJson<DashboardSession>("/api/auth/session", { signal: controller.signal })
      .then((session) => setNavigationRole(session.user.role))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setNavigationError(error instanceof Error ? error.message : "Navigation permissions could not be loaded.");
      });
    return () => controller.abort();
  }, []);

  const visibleNavigation = navigation.filter(({ permission }) => (
    (!permission || (navigationRole !== null && hasDashboardPermission(navigationRole, permission)))
  )).filter(({ roles }) => (
    !roles || (navigationRole !== null && roles.includes(navigationRole))
  ));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span>Q</span></div>
          {!collapsed && <strong>Quick</strong>}
          <button className="collapse-btn" type="button" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <nav className="nav-list" id="main-navigation" aria-label="Main navigation">
          {navigationError && !collapsed && <p className="nav-access-error" role="alert">{navigationError}</p>}
          {visibleNavigation.map(({ label, icon: Icon, href, section }, index) => {
            const active = initialView === label;
            const className = `nav-item ${active ? "active" : ""}`;
            const contents = <><Icon size={19} strokeWidth={1.8} aria-hidden="true" />{!collapsed && <span>{label}</span>}</>;
            const showSection = index === 0 || visibleNavigation[index - 1].section !== section;
            return (
              <div className="nav-entry" key={label}>
                {showSection && !collapsed && <p className="nav-section">{section}</p>}
              <Link
                href={href}
                className={className}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {contents}
              </Link>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="branch-select">
            <div className="branch-icon">QB</div>
            {!collapsed && <><div><strong>Business workspace</strong><span>Secure session</span></div><ChevronDown size={14} /></>}
          </div>
        </div>
      </aside>

      <main className="main" id="main-content">
        <header className="topbar">
          <button
            className="menu-btn"
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="main-navigation"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="global-search" aria-hidden="true"><span className="search-muted">Business workspace</span></div>
          <div className="top-actions">
            <Link className="primary-btn" href="/pos"><ShoppingCart size={16} aria-hidden="true" /> Open POS</Link>
          </div>
        </header>

        {initialView === "Dashboard"
          ? <DashboardHome />
          : initialView === "Warehouse"
            ? <InventoryDashboard />
            : initialView === "Finance"
              ? <DashboardHome requestedView="finance" />
              : initialView === "Store manager"
                ? <DashboardHome requestedView="store_manager" />
                : initialView === "Cashier"
                  ? <DashboardHome requestedView="cashier" />
              : <WorkspaceModule module={initialView} />}
      </main>
      {mobileOpen && <button className="scrim" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
