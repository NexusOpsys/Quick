import assert from "node:assert/strict";
import test from "node:test";
import { signupSchema } from "../src/worker";
import {
  canAccessDashboard,
  canAccessInventoryDashboard,
  defaultDashboardView,
  DASHBOARD_PERMISSION,
  hasDashboardPermission,
  parseDashboardView,
} from "../src/domain/dashboard";

test("signupSchema accepts valid email and password", () => {
  const result = signupSchema.safeParse({
    email: "daw.thiri@example.com",
    password: "SecurePass123!",
  });
  assert.ok(result.success);
  assert.equal(result.data?.email, "daw.thiri@example.com");
});

test("signupSchema rejects invalid email", () => {
  const result = signupSchema.safeParse({
    email: "not-an-email",
    password: "SecurePass123!",
  });
  assert.ok(!result.success);
  assert.ok(result.error?.issues.some((i) => i.path.includes("email")));
});

test("signupSchema rejects short password", () => {
  const result = signupSchema.safeParse({
    email: "daw.thiri@example.com",
    password: "short",
  });
  assert.ok(!result.success);
  assert.ok(result.error?.issues.some((i) => i.path.includes("password")));
});

test("signupSchema normalizes email to lowercase", () => {
  const result = signupSchema.safeParse({
    email: "DAW.THIRI@Example.COM",
    password: "SecurePass123!",
  });
  assert.ok(result.success);
  assert.equal(result.data?.email, "daw.thiri@example.com");
});

test("signupSchema does not accept business details during account creation", () => {
  const result = signupSchema.safeParse({
    email: "daw.thiri@example.com",
    password: "SecurePass123!",
    businessName: "My Shop",
  });
  assert.ok(result.success);
  assert.equal("businessName" in result.data!, false);
});

test("resolves the dashboard view from the authenticated role", () => {
  assert.equal(defaultDashboardView("owner"), "business_owner");
  assert.equal(defaultDashboardView("manager"), "store_manager");
  assert.equal(defaultDashboardView("cashier"), "cashier");
  assert.equal(defaultDashboardView("unknown"), null);
});

test("rejects unknown and unauthorized dashboard views", () => {
  assert.equal(parseDashboardView("finance"), "finance");
  assert.equal(parseDashboardView("reports"), null);
  assert.equal(canAccessDashboard("owner", "finance"), true);
  assert.equal(canAccessDashboard("owner", "cashier"), true);
  assert.equal(canAccessDashboard("manager", "store_manager"), true);
  assert.equal(canAccessDashboard("manager", "finance"), false);
  assert.equal(canAccessDashboard("cashier", "cashier"), true);
  assert.equal(canAccessDashboard("cashier", "store_manager"), false);
  assert.equal(canAccessInventoryDashboard("owner"), true);
  assert.equal(canAccessInventoryDashboard("manager"), true);
  assert.equal(canAccessInventoryDashboard("cashier"), false);
  assert.equal(hasDashboardPermission("cashier", DASHBOARD_PERMISSION.cashier), true);
  assert.equal(hasDashboardPermission("cashier", DASHBOARD_PERMISSION.finance), false);
});
