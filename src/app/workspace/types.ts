export type WorkspaceSession = {
  user: { id: string; email: string; role: string };
  company: { name: string; currencyCode: string; timezone: string; setupComplete: boolean };
  branch: { id: string; name: string };
};

export type WorkspaceProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceMinor: number;
  taxRateBps: number;
  isStocked: number;
  reorderLevel: number;
  stock: number;
};

export type WorkspaceCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export type WorkspaceSupplier = {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  paymentTerms: string;
  notes: string;
};

export type PurchaseReceipt = {
  id: string;
  reference: string;
  note: string;
  createdAt: string;
  supplierName: string;
  recordedBy: string;
  lineCount: number;
  totalMinor: number;
};

export type BusinessSettings = {
  businessName: string;
  businessType: "Retail" | "Wholesale" | "Distribution" | "Supermarket" | "Convenience Store" | "Other";
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  currencyCode: string;
  timezone: string;
  taxRateBps: number;
  taxRegistrationNumber: string;
  financialYearStart: string;
  invoicePrefix: string;
  receiptTemplate: "standard" | "compact" | "detailed";
  language: "English" | "Myanmar";
  branchName: string;
  warehouseName: string;
};

export function canManageWorkspace(role: string | null): boolean {
  return role === "owner" || role === "manager";
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
