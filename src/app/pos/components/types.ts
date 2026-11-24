export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceMinor: number;
  taxRateBps: number;
  isStocked: number;
  stock: number;
  reorderLevel: number;
};

export type PosCustomer = { id: string; name: string; phone: string; email: string };
export type CartLine = PosProduct & { qty: number; discountMinor: number };
export type PosSession = {
  user: { id: string; email: string; role: string };
  company: { name: string; currencyCode: string; timezone: string; setupComplete: boolean };
  branch: { id: string; name: string };
};
export type CheckoutResult = { invoiceNumber: string; totalMinor: number; currencyCode: string; status: string };
