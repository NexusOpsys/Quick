import assert from "node:assert/strict";
import test from "node:test";
import { calculateExpectedCash } from "../src/domain/cashier-shifts";

test("calculates expected cashier cash from opening, sales, and cash movements", () => {
  assert.equal(calculateExpectedCash(10_000, 3_500, 2_000, 500), 15_000);
  assert.throws(() => calculateExpectedCash(0, 0, 0, 1), /exceed the available cash/);
  assert.throws(() => calculateExpectedCash(-1, 0, 0, 0), /non-negative integer/);
});
