import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  ShoppingCart,
  Store,
  Truck,
  Users,
  WalletCards,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { DASHBOARD_PERMISSION, hasDashboardPermission, type DashboardPermission } from "../../../domain/dashboard";

type PosNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  permission?: DashboardPermission;
  roles?: readonly string[];
};
type PosNavGroup = { label: string; items: PosNavItem[] };

const NAV: PosNavGroup[] = [
  {
    label: "Switch dashboards",
    items: [
      { id: "executive", label: "Executive Dashboard", icon: LayoutDashboard, href: "/" },
      { id: "terminal", label: "POS Terminal", icon: ShoppingCart, href: "/pos" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "cashier", label: "Cashier View", icon: Store, href: "/pos/cashier", permission: DASHBOARD_PERMISSION.cashier },
      { id: "shifts", label: "Shift Management", icon: Clock3, href: "/pos/shifts", permission: DASHBOARD_PERMISSION.cashier },
      { id: "refunds", label: "Refunds & Vouchers", icon: ClipboardCheck },
    ],
  },
  {
    label: "Inventory",
    items: [
      { id: "inventory", label: "Warehouse management", icon: Boxes, href: "/pos/inventory", permission: DASHBOARD_PERMISSION.inventory },
    ],
  },
  {
    label: "Procurement",
    items: [
      { id: "purchasing", label: "Goods Receiving", icon: Truck, href: "/pos/purchasing", roles: ["owner", "manager"] },
    ],
  },
  {
    label: "Finance & Accounting",
    items: [
      { id: "finance", label: "Finance dashboard", icon: WalletCards, href: "/pos/finance", permission: DASHBOARD_PERMISSION.finance },
    ],
  },
  {
    label: "Reporting & BI",
    items: [
      { id: "reports", label: "Sales Analytics", icon: BarChart3, href: "/pos/reports", roles: ["owner", "manager"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "settings", label: "Business Settings", icon: Users, href: "/pos/settings", roles: ["owner"] },
    ],
  },
];

export function PosSidebar({
  branchName,
  role,
  activeSection,
  mobileOpen = false,
  onClose,
}: {
  branchName: string;
  role: string;
  activeSection: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const visibleGroups = NAV.map(({ label, items }) => ({
    label,
    items: items.filter(({ permission }) => (
      !permission || hasDashboardPermission(role, permission)
    )).filter(({ roles }) => !roles || roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <aside className={`pos-side ${mobileOpen ? "mobile-open" : ""}`}>
        <Link className="pos-side-brand" href="/pos" onClick={onClose}>
          <div className="pos-side-mark"><Zap size={20} strokeWidth={2.2} /></div>
          <div className="pos-side-brand-text">
            <span className="pos-side-name">Quick Enterprise</span>
            <span className="pos-side-tag">Business platform</span>
          </div>
        </Link>
        <nav className="pos-side-nav" aria-label="POS navigation">
          {visibleGroups.map((group) => (
            <div className="pos-side-group" key={group.label}>
              <p className="pos-side-group-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`pos-side-item ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={onClose}
                  >
                    <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>
                  </Link>
                ) : (
                  <span key={item.id} className="pos-side-item pos-side-item-disabled" aria-disabled="true" title="This module is planned">
                    <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="pos-side-foot">
          <div className="pos-side-branch">
            <div className="pos-side-branch-icon">{branchName.slice(0, 2).toUpperCase()}</div>
            <div className="pos-side-branch-text"><strong>{branchName}</strong><span>Assigned branch</span></div>
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="pos-sidebar-scrim" type="button" aria-label="Close POS navigation" onClick={onClose} />}
    </>
  );
}
