import assert from "node:assert/strict";
import { test } from "node:test";
import { purchaseReceiptSchema } from "../src/worker/index";

const supplierId = "11111111-1111-4111-8111-111111111111";
const firstProductId = "22222222-2222-4222-8222-222222222222";
const secondProductId = "33333333-3333-4333-8333-333333333333";

test("purchase receipts accept multiple distinct product lines", () => {
  const parsed = purchaseReceiptSchema.safeParse({
    supplierId,
    reference: "GRN-001",
    items: [
      { productId: firstProductId, quantity: 2, unitCostMinor: 125 },
      { productId: secondProductId, quantity: 1, unitCostMinor: 250 },
    ],
  });
  assert.equal(parsed.success, true);
});

test("purchase receipts reject duplicate product lines", () => {
  const parsed = purchaseReceiptSchema.safeParse({
    supplierId,
    reference: "GRN-002",
    items: [
      { productId: firstProductId, quantity: 1, unitCostMinor: 100 },
      { productId: firstProductId, quantity: 3, unitCostMinor: 100 },
    ],
  });
  assert.equal(parsed.success, false);
});

test("purchase receipts reject unsafe line totals", () => {
  const parsed = purchaseReceiptSchema.safeParse({
    supplierId,
    reference: "GRN-003",
    items: [{ productId: firstProductId, quantity: 1_000_000, unitCostMinor: Number.MAX_SAFE_INTEGER }],
  });
  assert.equal(parsed.success, false);
});
