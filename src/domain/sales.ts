export type SaleLineInput = {
  productId: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor?: number;
  taxRateBps: number;
};

export type CalculatedSaleLine = SaleLineInput & {
  discountMinor: number;
  taxableMinor: number;
  taxMinor: number;
  lineTotalMinor: number;
};

export type CalculatedSale = {
  lines: CalculatedSaleLine[];
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export type PaymentInput = {
  method: string;
  amountMinor: number;
};

export function calculateSale(lines: SaleLineInput[]): CalculatedSale {
  if (lines.length === 0) {
    throw new Error("A sale must contain at least one item.");
  }

  let subtotalMinor = 0;
  let taxMinor = 0;
  const calculatedLines = lines.map((line) => {
    if (!line.productId.trim()) {
      throw new Error("Each sale item must reference a product.");
    }
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Item quantities must be positive whole numbers.");
    }
    if (!Number.isSafeInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      throw new Error("Item prices must be non-negative integer minor units.");
    }
    if (!Number.isInteger(line.taxRateBps) || line.taxRateBps < 0 || line.taxRateBps > 10000) {
      throw new Error("Tax rates must be between 0 and 10000 basis points.");
    }

    const grossMinor = line.unitPriceMinor * line.quantity;
    if (!Number.isSafeInteger(grossMinor)) {
      throw new Error("Item total exceeds the supported amount.");
    }

    const discountMinor = line.discountMinor ?? 0;
    if (!Number.isSafeInteger(discountMinor) || discountMinor < 0 || discountMinor > grossMinor) {
      throw new Error("Item discounts must be between zero and the line amount.");
    }

    const taxableMinor = grossMinor - discountMinor;
    const lineTaxMinor = Math.round((taxableMinor * line.taxRateBps) / 10000);
    const lineTotalMinor = taxableMinor + lineTaxMinor;
    subtotalMinor += taxableMinor;
    taxMinor += lineTaxMinor;

    return {
      ...line,
      discountMinor,
      taxableMinor,
      taxMinor: lineTaxMinor,
      lineTotalMinor,
    };
  });

  const totalMinor = subtotalMinor + taxMinor;
  if (![subtotalMinor, taxMinor, totalMinor].every(Number.isSafeInteger)) {
    throw new Error("Sale total exceeds the supported amount.");
  }

  return { lines: calculatedLines, subtotalMinor, taxMinor, totalMinor };
}

export type CartLineInput = {
  productId: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor?: number;
  taxRateBps?: number;
};

export type CartTotals = {
  subtotalMinor: number;
  discountMinor: number;
  taxableMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export function calculateCartTotals(
  lines: CartLineInput[],
  options: { wholesaleRateBps?: number; taxRateBps?: number } = {},
): CartTotals {
  let subtotalMinor = 0;
  let itemDiscountMinor = 0;
  let taxMinor = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Item quantities must be positive whole numbers.");
    }
    if (!Number.isSafeInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      throw new Error("Item prices must be non-negative integer minor units.");
    }
    const grossMinor = line.unitPriceMinor * line.quantity;
    if (!Number.isSafeInteger(grossMinor)) {
      throw new Error("Item total exceeds the supported amount.");
    }
    const discountMinor = line.discountMinor ?? 0;
    if (!Number.isSafeInteger(discountMinor) || discountMinor < 0 || discountMinor > grossMinor) {
      throw new Error("Item discounts must be between zero and the line amount.");
    }
    const taxableMinor = grossMinor - discountMinor;
    const rate = line.taxRateBps ?? options.taxRateBps ?? 0;
    if (!Number.isInteger(rate) || rate < 0 || rate > 10000) {
      throw new Error("Tax rates must be between 0 and 10000 basis points.");
    }
    subtotalMinor += grossMinor;
    itemDiscountMinor += discountMinor;
    taxMinor += Math.round((taxableMinor * rate) / 10000);
  }

  if (![subtotalMinor, itemDiscountMinor, taxMinor].every(Number.isSafeInteger)) {
    throw new Error("Cart total exceeds the supported amount.");
  }

  const wholesaleRateBps = options.wholesaleRateBps ?? 0;
  if (!Number.isInteger(wholesaleRateBps) || wholesaleRateBps < 0 || wholesaleRateBps > 10000) {
    throw new Error("Discount rates must be between 0 and 10000 basis points.");
  }
  const wholesaleDiscountMinor = Math.round(
    ((subtotalMinor - itemDiscountMinor) * wholesaleRateBps) / 10000,
  );
  const discountMinor = itemDiscountMinor + wholesaleDiscountMinor;
  const taxableMinor = subtotalMinor - discountMinor;
  if (wholesaleRateBps > 0) {
    taxMinor = lines.reduce((sum, line) => {
      const rate = line.taxRateBps ?? options.taxRateBps ?? 0;
      const discountedLine = line.unitPriceMinor * line.quantity - (line.discountMinor ?? 0);
      const remainingLine = discountedLine - Math.round((discountedLine * wholesaleRateBps) / 10000);
      return sum + Math.round((remainingLine * rate) / 10000);
    }, 0);
  }
  const totalMinor = taxableMinor + taxMinor;
  if (![discountMinor, taxableMinor, totalMinor].every(Number.isSafeInteger)) {
    throw new Error("Cart total exceeds the supported amount.");
  }
  return { subtotalMinor, discountMinor, taxableMinor, taxMinor, totalMinor };
}

export type ProductLike = {
  id: string;
  name: string;
  category: string;
  sku?: string;
};

export function filterProducts<T extends ProductLike>(
  products: T[],
  options: { query?: string; category?: string } = {},
): T[] {
  const query = options.query?.trim().toLowerCase() ?? "";
  const category = options.category;
  return products.filter((product) => {
    const matchesCategory = !category || category === "All Items" || product.category === category;
    const needle = query || product.id.toLowerCase();
    const matchesQuery = product.name.toLowerCase().includes(needle)
      || product.id.toLowerCase().includes(needle)
      || product.sku?.toLowerCase().includes(needle) === true;
    return matchesCategory && matchesQuery;
  });
}

export function validatePayments(payments: PaymentInput[], totalMinor: number): void {
  if (payments.length === 0) {
    throw new Error("At least one payment is required.");
  }
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) {
    throw new Error("Sale total must be a non-negative integer amount.");
  }
  for (const payment of payments) {
    if (!payment.method.trim() || !Number.isSafeInteger(payment.amountMinor) || payment.amountMinor <= 0) {
      throw new Error("Payments require a method and a positive integer amount.");
    }
  }
  const paidMinor = payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
  if (!Number.isSafeInteger(paidMinor) || paidMinor !== totalMinor) {
    throw new Error("Payment amounts must exactly match the sale total.");
  }
}

export function formatMinorUnits(amountMinor: number, currencyCode: string, locale = "en-US"): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("Amount must be an integer number of minor units.");
  }
  const fractionDigits = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / (10 ** fractionDigits));
}

export function currencyMinorUnitScale(currencyCode: string, locale = "en-US"): number {
  const fractionDigits = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  return 10 ** fractionDigits;
}
