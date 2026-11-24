import { notFound } from "next/navigation";
import BusinessAppShell, { type AppView } from "../../components/BusinessAppShell";

const moduleViews: Record<string, AppView> = {
  products: "Products",
  purchasing: "Purchasing",
  customers: "Customers",
  suppliers: "Suppliers",
  reports: "Reports",
  settings: "Settings",
};

export function generateStaticParams() {
  return Object.keys(moduleViews).map((module) => ({ module }));
}

export default async function WorkspacePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const initialView = moduleViews[module];
  if (!initialView) notFound();
  return <BusinessAppShell initialView={initialView} />;
}
