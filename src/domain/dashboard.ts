export const DASHBOARD_VIEWS = ["business_owner", "finance", "store_manager", "cashier"] as const;
export type DashboardView = typeof DASHBOARD_VIEWS[number];
export const DASHBOARD_PERMISSION = {
  businessOwner: "dashboard.business_owner.view",
  finance: "dashboard.finance.view",
  inventory: "dashboard.inventory.view",
  storeManager: "dashboard.store_manager.view",
  cashier: "dashboard.cashier.view",
} as const;
export type DashboardPermission = typeof DASHBOARD_PERMISSION[keyof typeof DASHBOARD_PERMISSION];

const VIEW_PERMISSION: Record<DashboardView, DashboardPermission> = {
  business_owner: DASHBOARD_PERMISSION.businessOwner,
  finance: DASHBOARD_PERMISSION.finance,
  store_manager: DASHBOARD_PERMISSION.storeManager,
  cashier: DASHBOARD_PERMISSION.cashier,
};

const ROLE_PERMISSIONS: Record<string, readonly DashboardPermission[]> = {
  owner: [
    DASHBOARD_PERMISSION.businessOwner,
    DASHBOARD_PERMISSION.finance,
    DASHBOARD_PERMISSION.inventory,
    DASHBOARD_PERMISSION.storeManager,
    DASHBOARD_PERMISSION.cashier,
  ],
  manager: [
    DASHBOARD_PERMISSION.inventory,
    DASHBOARD_PERMISSION.storeManager,
  ],
  cashier: [DASHBOARD_PERMISSION.cashier],
};

export function parseDashboardView(value: string | null): DashboardView | null {
  return DASHBOARD_VIEWS.find((view) => view === value) ?? null;
}

export function defaultDashboardView(role: string): DashboardView | null {
  if (role === "owner") return "business_owner";
  if (role === "manager") return "store_manager";
  if (role === "cashier") return "cashier";
  return null;
}

export function canAccessDashboard(role: string, view: DashboardView): boolean {
  return ROLE_PERMISSIONS[role]?.includes(VIEW_PERMISSION[view]) ?? false;
}

export function canAccessInventoryDashboard(role: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(DASHBOARD_PERMISSION.inventory) ?? false;
}

export function hasDashboardPermission(role: string, permission: DashboardPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
