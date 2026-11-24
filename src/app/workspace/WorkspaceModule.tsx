"use client";

import type { AppView } from "../components/BusinessAppShell";
import CustomersWorkspace from "./modules/CustomersWorkspace";
import ProductsWorkspace from "./modules/ProductsWorkspace";
import PurchasingWorkspace from "./modules/PurchasingWorkspace";
import ReportsWorkspace from "./modules/ReportsWorkspace";
import SettingsWorkspace from "./modules/SettingsWorkspace";
import SuppliersWorkspace from "./modules/SuppliersWorkspace";

export default function WorkspaceModule({ module }: { module: AppView }) {
  switch (module) {
    case "Products":
      return <ProductsWorkspace />;
    case "Customers":
      return <CustomersWorkspace />;
    case "Suppliers":
      return <SuppliersWorkspace />;
    case "Purchasing":
      return <PurchasingWorkspace />;
    case "Reports":
      return <ReportsWorkspace />;
    case "Settings":
      return <SettingsWorkspace />;
    case "Dashboard":
    case "Store manager":
    case "Cashier":
    case "Warehouse":
    case "Finance":
      return null;
  }
}
