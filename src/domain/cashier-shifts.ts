export function calculateExpectedCash(
  openingCashMinor: number,
  cashSalesMinor: number,
  cashInMinor: number,
  cashOutMinor: number,
): number {
  const amounts = [openingCashMinor, cashSalesMinor, cashInMinor, cashOutMinor];
  if (!amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0)) {
    throw new Error("Cash totals must be non-negative integer minor units.");
  }
  const expectedCashMinor = openingCashMinor + cashSalesMinor + cashInMinor - cashOutMinor;
  if (!Number.isSafeInteger(expectedCashMinor) || expectedCashMinor < 0) {
    throw new Error("Cash movements exceed the available cash.");
  }
  return expectedCashMinor;
}
