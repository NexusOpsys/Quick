import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCartTotals,
  calculateSale,
  currencyMinorUnitScale,
  filterProducts,
  formatMinorUnits,
  validatePayments,
} from "../src/domain/sales";

test("calculates line-level tax in minor units without floating point totals", () => {
  const sale = calculateSale([
    { productId: "tea", quantity: 3, unitPriceMinor: 125, taxRateBps: 500 },
    { productId: "bread", quantity: 1, unitPriceMinor: 250, discountMinor: 25, taxRateBps: 0 },
  ]);

  assert.deepEqual(
    { subtotalMinor: sale.subtotalMinor, taxMinor: sale.taxMinor, totalMinor: sale.totalMinor },
    { subtotalMinor: 600, taxMinor: 19, totalMinor: 619 },
  );
  assert.equal(sale.lines[0].lineTotalMinor, 394);
});

test("rejects empty sales, fractional quantities, and discounts above line value", () => {
  assert.throws(() => calculateSale([]), /at least one item/);
  assert.throws(
    () => calculateSale([{ productId: "tea", quantity: 1.5, unitPriceMinor: 100, taxRateBps: 0 }]),
    /positive whole numbers/,
  );
  assert.throws(
    () => calculateSale([{ productId: "tea", quantity: 1, unitPriceMinor: 100, discountMinor: 101, taxRateBps: 0 }]),
    /discounts must be between zero/,
  );
});

test("requires payment allocations to equal the sale total", () => {
  validatePayments(
    [{ method: "cash", amountMinor: 300 }, { method: "card", amountMinor: 319 }],
    619,
  );
  assert.throws(
    () => validatePayments([{ method: "cash", amountMinor: 618 }], 619),
    /exactly match/,
  );
});

test("formats minor units using the company's configured currency", () => {
  assert.equal(formatMinorUnits(1250, "USD", "en-US"), "$12.50");
  assert.equal(formatMinorUnits(1250, "MMK", "en-US"), "MMK\u00A01,250");
  assert.equal(currencyMinorUnitScale("USD", "en-US"), 100);
  assert.equal(currencyMinorUnitScale("MMK", "en-US"), 1);
});

test("returns zero totals for an empty cart", () => {
  assert.deepEqual(calculateCartTotals([]), {
    subtotalMinor: 0,
    discountMinor: 0,
    taxableMinor: 0,
    taxMinor: 0,
    totalMinor: 0,
  });
});

test("sums cart subtotals and applies configured tax without discount", () => {
  const totals = calculateCartTotals(
    [
      { productId: "BEV-101", quantity: 2, unitPriceMinor: 350 },
      { productId: "BEV-322", quantity: 1, unitPriceMinor: 450 },
    ],
    { taxRateBps: 500 },
  );

  assert.equal(totals.subtotalMinor, 1150);
  assert.equal(totals.discountMinor, 0);
  assert.equal(totals.taxableMinor, 1150);
  assert.equal(totals.taxMinor, 58);
  assert.equal(totals.totalMinor, 1208);
});

test("applies wholesale discount before tax for wholesale customers", () => {
  const totals = calculateCartTotals(
    [{ productId: "BEV-101", quantity: 20, unitPriceMinor: 500 }],
    { wholesaleRateBps: 500, taxRateBps: 500 },
  );

  assert.equal(totals.subtotalMinor, 10000);
  assert.equal(totals.discountMinor, 500);
  assert.equal(totals.taxableMinor, 9500);
  assert.equal(totals.taxMinor, 475);
  assert.equal(totals.totalMinor, 9975);
});

test("rejects a discount rate above the full line amount", () => {
  assert.throws(() => calculateCartTotals(
    [{ productId: "ELE-402", quantity: 2, unitPriceMinor: 85000 }],
    { wholesaleRateBps: 20000, taxRateBps: 0 },
  ), /Discount rates must be between/);

});

test("calculates configured per-product tax and discounts before tax", () => {
  const totals = calculateCartTotals([
    { productId: "taxed", quantity: 2, unitPriceMinor: 500, discountMinor: 100, taxRateBps: 500 },
    { productId: "untaxed", quantity: 1, unitPriceMinor: 100, taxRateBps: 0 },
  ]);

  assert.deepEqual(totals, {
    subtotalMinor: 1100,
    discountMinor: 100,
    taxableMinor: 1000,
    taxMinor: 45,
    totalMinor: 1045,
  });
});

test("returns all products when no query or category is applied", () => {
  assert.equal(filterProducts([{ id: "BEV-101", name: "Jasmine Green Tea", category: "Beverages & Dairy" }], {}).length, 1);
});

test("filters products by category", () => {
  const products = [
    { id: "BEV-101", name: "Jasmine Green Tea", category: "Beverages & Dairy" },
    { id: "SNF-118", name: "Coconut Oil", category: "Packaged Foods" },
  ];

  const beverages = filterProducts(products, { category: "Beverages & Dairy" });
  assert.deepEqual(beverages.map((product) => product.id), ["BEV-101"]);
});

test("filters products by case-insensitive name substring", () => {
  const products = [
    { id: "BEV-101", name: "Jasmine Green Tea 500ml", category: "Beverages & Dairy" },
    { id: "SNF-118", name: "Coconut Oil 1L", category: "Packaged Foods" },
  ];

  const result = filterProducts(products, { query: "tea" });
  assert.deepEqual(result.map((product) => product.id), ["BEV-101"]);
});

test("filters products by identifier substring", () => {
  const products = [
    { id: "BEV-101", name: "Jasmine Green Tea", category: "Beverages & Dairy" },
    { id: "SNF-118", name: "Coconut Oil", category: "Packaged Foods" },
  ];

  const result = filterProducts(products, { query: "SNF" });
  assert.deepEqual(result.map((product) => product.id), ["SNF-118"]);
});

test("filters products by SKU", () => {
  const products = [
    { id: "uuid-1", sku: "BEV-101", name: "Jasmine Green Tea", category: "Beverages" },
    { id: "uuid-2", sku: "SNF-118", name: "Coconut Oil", category: "Packaged Foods" },
  ];

  assert.deepEqual(filterProducts(products, { query: "snf" }).map((product) => product.id), ["uuid-2"]);
});

test("combines category and query filters with AND semantics", () => {
  const products = [
    { id: "BEV-101", name: "Jasmine Green Tea", category: "Beverages & Dairy" },
    { id: "BEV-322", name: "Mango Energy Drink", category: "Beverages & Dairy" },
    { id: "SNF-118", name: "Coconut Oil", category: "Packaged Foods" },
  ];

  const result = filterProducts(products, { category: "Beverages & Dairy", query: "mango" });
  assert.deepEqual(result.map((product) => product.id), ["BEV-322"]);
});
