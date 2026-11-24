/// <reference types="@cloudflare/workers-types" />
import { z } from "zod";
import {
  canAccessDashboard,
  canAccessInventoryDashboard,
  defaultDashboardView,
  parseDashboardView,
} from "../domain/dashboard";
import { calculateExpectedCash } from "../domain/cashier-shifts";
import { calculateSale, validatePayments, type PaymentInput, type SaleLineInput } from "../domain/sales";

interface Env {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

type AuthenticatedUser = {
  id: string;
  organization_id: string;
  company_id: string;
  branch_id: string;
  warehouse_id: string;
  email: string;
  role: "owner" | "manager" | "cashier";
  currency_code: string;
  timezone: string;
  tax_rate_bps: number;
  setup_complete: number;
};

const setupSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessType: z.enum(["Retail", "Wholesale", "Distribution", "Supermarket", "Convenience Store", "Other"]),
  address: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(50).default(""),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  timezone: z.string().trim().min(1).max(80),
  taxRateBps: z.number().int().min(0).max(10000).default(0),
  taxRegistrationNumber: z.string().trim().max(100).default(""),
  financialYearStart: z.string().regex(/^\d{2}-\d{2}$/).default("01-01"),
  invoicePrefix: z.string().trim().min(1).max(20).default("INV"),
  receiptTemplate: z.enum(["standard", "compact", "detailed"]).default("standard"),
  language: z.enum(["English", "Myanmar"]).default("English"),
  branchName: z.string().trim().min(2).max(120),
  warehouseName: z.string().trim().min(2).max(120),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});

const signupSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
});

export { purchaseReceiptSchema, signupSchema };

const productSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).default(""),
  priceMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  taxRateBps: z.number().int().min(0).max(10000).optional(),
  isStocked: z.boolean().default(true),
  openingQuantity: z.number().int().min(0).max(1_000_000).default(0),
  reorderLevel: z.number().int().min(0).max(1_000_000).default(0),
});
const productUpdateSchema = productSchema.omit({ openingQuantity: true });

const customerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(50).default(""),
  email: z.string().trim().email().max(254).optional().or(z.literal("")).default(""),
});

const supplierSchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  contactPerson: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(50).default(""),
  email: z.string().trim().email().max(254).optional().or(z.literal("")).default(""),
  address: z.string().trim().max(300).default(""),
  taxNumber: z.string().trim().max(100).default(""),
  paymentTerms: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(500).default(""),
});

const purchaseReceiptSchema = z.object({
  supplierId: z.string().uuid(),
  reference: z.string().trim().min(1).max(64),
  note: z.string().trim().max(300).default(""),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(1_000_000),
    unitCostMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  })).min(1).max(50),
}).superRefine((receipt, context) => {
  const productIds = new Set<string>();
  for (const [index, item] of receipt.items.entries()) {
    if (productIds.has(item.productId)) {
      context.addIssue({ code: "custom", path: ["items", index, "productId"], message: "Each product may only appear once." });
    }
    productIds.add(item.productId);
    if (!Number.isSafeInteger(item.quantity * item.unitCostMinor)) {
      context.addIssue({ code: "custom", path: ["items", index, "unitCostMinor"], message: "The line total is too large." });
    }
  }
});

const saleSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(1_000_000),
    discountMinor: z.number().int().min(0).optional(),
  })).min(1).max(80),
  payments: z.array(z.object({
    method: z.string().trim().min(1).max(40),
    amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })).min(1).max(10),
});

const inventoryAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  quantityDelta: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(200),
});

const stockCountSchema = z.object({
  productId: z.string().uuid(),
  countedQuantity: z.number().int().min(0).max(1_000_000),
  reason: z.string().trim().min(3).max(200),
});

const expenseSchema = z.object({
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  category: z.string().trim().min(2).max(60),
  memo: z.string().trim().max(300).default(""),
});

const shiftOpenSchema = z.object({
  openingCashMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

const shiftMovementSchema = z.object({
  movementType: z.enum(["cash_in", "cash_out"]),
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  reason: z.string().trim().min(3).max(200),
});

const shiftCloseSchema = z.object({
  countedCashMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

const SESSION_DAYS = 7;
const PASSWORD_ITERATIONS = 310_000;
const encoder = new TextEncoder();

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}

function randomId(): string {
  return crypto.randomUUID();
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function sha256(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(16))): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return `pbkdf2$${PASSWORD_ITERATIONS}$${hex(salt)}$${hex(new Uint8Array(derived))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, expectedText] = stored.split("$");
  if (algorithm !== "pbkdf2" || Number(iterationsText) !== PASSWORD_ITERATIONS || !saltText || !expectedText) {
    return false;
  }
  const actual = await hashPassword(password, fromHex(saltText));
  const actualBytes = encoder.encode(actual);
  const expectedBytes = encoder.encode(stored);
  if (actualBytes.length !== expectedBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < actualBytes.length; index += 1) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

async function createSession(env: Env, userId: string): Promise<{ token: string; expiresAt: string }> {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(randomId(), userId, await sha256(token), expiresAt, now.toISOString()).run();
  return { token, expiresAt };
}

function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `quick_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=${maxAgeSeconds}`;
}

function clearSessionCookie(): string {
  return "quick_session=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0";
}

function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

function assertSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return errorResponse("Cross-origin request rejected.", 403);
  }
  return null;
}

async function authenticate(request: Request, env: Env): Promise<AuthenticatedUser | null> {
  const token = readCookie(request, "quick_session");
  if (!token) return null;

  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const user = await env.DB.prepare(`
    SELECT u.id, u.organization_id, u.company_id, u.branch_id, u.warehouse_id,
           u.email, u.role, c.currency_code, c.timezone, c.tax_rate_bps,
           c.setup_complete
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    JOIN companies c ON c.id = u.company_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
  `).bind(tokenHash, now).first<AuthenticatedUser>();
  return user;
}

async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | Response> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return json({ error: "Request validation failed.", issues: parsed.error.issues }, 400);
  }
  return parsed.data;
}

async function setupStatus(env: Env, user: AuthenticatedUser): Promise<Response> {
  const company = await env.DB.prepare(
    "SELECT setup_complete, name, currency_code, timezone FROM companies WHERE id = ?",
  ).bind(user.company_id).first<{ setup_complete: number; name: string; currency_code: string; timezone: string }>();
  return json({
    needsSetup: company?.setup_complete !== 1,
    company: company ? {
      name: company.name,
      currencyCode: company.currency_code,
      timezone: company.timezone,
    } : null,
  });
}

async function setup(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (user.role !== "owner") return errorResponse("Only the business owner can complete setup.", 403);
  const existingCompany = await env.DB.prepare(
    "SELECT setup_complete FROM companies WHERE id = ?",
  ).bind(user.company_id).first<{ setup_complete: number }>();
  if (existingCompany?.setup_complete === 1) {
    return errorResponse("Business setup is already complete. Use business settings to make changes.", 409);
  }
  const data = await parseBody(request, setupSchema);
  if (data instanceof Response) return data;
  const now = new Date().toISOString();
  const year = new Date().getUTCFullYear();
  const registrationNumber = `REG-${year}-${randomId().replaceAll("-", "").slice(0, 8).toUpperCase()}`;

  try {
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE organizations SET name = ?, registration_number = ? WHERE id = ?
      `).bind(data.businessName, registrationNumber, user.organization_id),
      env.DB.prepare(`
        UPDATE companies SET
          name = ?, setup_complete = 1, business_type = ?, registration_number = ?,
          address = ?, phone = ?, email = ?, logo_url = ?, currency_code = ?,
          timezone = ?, tax_rate_bps = ?, tax_registration_number = ?,
          financial_year_start = ?, invoice_prefix = ?, receipt_template = ?,
          language = ?
        WHERE id = ?
      `).bind(
        data.businessName, data.businessType, registrationNumber,
        data.address, data.phone, data.email || "", data.logoUrl || "",
        data.currencyCode, data.timezone, data.taxRateBps,
        data.taxRegistrationNumber, data.financialYearStart, data.invoicePrefix,
        data.receiptTemplate, data.language, user.company_id,
      ),
      env.DB.prepare("UPDATE branches SET name = ? WHERE id = ?")
        .bind(data.branchName, user.branch_id),
      env.DB.prepare("UPDATE warehouses SET name = ? WHERE id = ?")
        .bind(data.warehouseName, user.warehouse_id),
      env.DB.prepare(`
        INSERT INTO audit_logs
          (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'business.setup.completed', 'company', ?, ?, ?)
      `).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
        user.company_id, JSON.stringify({ businessName: data.businessName, currencyCode: data.currencyCode, registrationNumber }), now,
      ),
    ]);
  } catch {
    return errorResponse("Business setup could not be completed.", 500);
  }

  return json(
    {
      user: { id: user.id, email: user.email, role: user.role },
      company: { id: user.company_id, name: data.businessName, registrationNumber, currencyCode: data.currencyCode, timezone: data.timezone },
      setupComplete: true,
    },
    200,
  );
}

async function getSettings(env: Env, user: AuthenticatedUser): Promise<Response> {
  if (user.role !== "owner") return errorResponse("Only the business owner can view business settings.", 403);
  const settings = await env.DB.prepare(`
    SELECT c.name AS businessName, c.business_type AS businessType,
      c.address, c.phone, c.email, c.logo_url AS logoUrl,
      c.currency_code AS currencyCode, c.timezone, c.tax_rate_bps AS taxRateBps,
      c.tax_registration_number AS taxRegistrationNumber,
      c.financial_year_start AS financialYearStart, c.invoice_prefix AS invoicePrefix,
      c.receipt_template AS receiptTemplate, c.language,
      b.name AS branchName, w.name AS warehouseName
    FROM companies c
    JOIN branches b ON b.id = ? AND b.company_id = c.id
    JOIN warehouses w ON w.id = ? AND w.company_id = c.id
    WHERE c.id = ? AND c.setup_complete = 1
  `).bind(user.branch_id, user.warehouse_id, user.company_id).first();
  if (!settings) return errorResponse("Complete business setup before editing settings.", 409);
  return json(settings);
}

async function updateSettings(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (user.role !== "owner") return errorResponse("Only the business owner can update business settings.", 403);
  const data = await parseBody(request, setupSchema);
  if (data instanceof Response) return data;
  const existing = await env.DB.prepare(
    "SELECT registration_number FROM companies WHERE id = ? AND setup_complete = 1",
  ).bind(user.company_id).first<{ registration_number: string }>();
  if (!existing) return errorResponse("Complete business setup before editing settings.", 409);

  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE organizations SET name = ? WHERE id = ?")
      .bind(data.businessName, user.organization_id),
    env.DB.prepare(`UPDATE companies SET
      name = ?, business_type = ?, address = ?, phone = ?, email = ?, logo_url = ?,
      currency_code = ?, timezone = ?, tax_rate_bps = ?, tax_registration_number = ?,
      financial_year_start = ?, invoice_prefix = ?, receipt_template = ?, language = ?
      WHERE id = ? AND setup_complete = 1`).bind(
      data.businessName, data.businessType, data.address, data.phone, data.email || "",
      data.logoUrl || "", data.currencyCode, data.timezone, data.taxRateBps,
      data.taxRegistrationNumber, data.financialYearStart, data.invoicePrefix,
      data.receiptTemplate, data.language, user.company_id,
    ),
    env.DB.prepare("UPDATE branches SET name = ? WHERE id = ? AND company_id = ?")
      .bind(data.branchName, user.branch_id, user.company_id),
    env.DB.prepare("UPDATE warehouses SET name = ? WHERE id = ? AND company_id = ?")
      .bind(data.warehouseName, user.warehouse_id, user.company_id),
    env.DB.prepare(`INSERT INTO audit_logs
      (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'business.settings.updated', 'company', ?, ?, ?)`).bind(
      randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
      user.company_id, JSON.stringify({
        businessName: data.businessName,
        currencyCode: data.currencyCode,
        taxRateBps: data.taxRateBps,
        branchName: data.branchName,
        warehouseName: data.warehouseName,
      }), now,
    ),
  ]);
  return json({ ok: true, registrationNumber: existing.registration_number });
}

async function signup(request: Request, env: Env): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const data = await parseBody(request, signupSchema);
  if (data instanceof Response) return data;

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const identifier = await sha256(`signup:${ip}:${data.email}`);
  const now = new Date();

  // Rate limiting: block rapid signup attempts from same IP + email
  const attempt = await env.DB.prepare(
    "SELECT attempts, window_started_at, locked_until FROM auth_signup_attempts WHERE identifier = ?",
  ).bind(identifier).first<{ attempts: number; window_started_at: string; locked_until: string | null }>();
  if (attempt?.locked_until && Date.parse(attempt.locked_until) > now.getTime()) {
    return errorResponse("Too many sign-up attempts. Try again later.", 429);
  }

  // Check if email already exists
  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ? COLLATE NOCASE LIMIT 1",
  ).bind(data.email).first<{ id: string }>();
  if (existing) {
    // Still record the attempt to prevent email enumeration via rate limiting
    await recordSignupAttempt(env, identifier, now);
    return errorResponse("An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(data.password);

  const organizationId = randomId();
  const companyId = randomId();
  const branchId = randomId();
  const warehouseId = randomId();
  const userId = randomId();
  const createdAt = now.toISOString();

  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)").bind(
        organizationId, "Pending Setup", createdAt,
      ),
      env.DB.prepare(`INSERT INTO companies
        (id, organization_id, name, currency_code, timezone, tax_rate_bps, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        companyId, organizationId, "Pending Setup",
        "MMK", "Asia/Yangon", 0, createdAt,
      ),
      env.DB.prepare("INSERT INTO branches (id, company_id, name, created_at) VALUES (?, ?, ?, ?)").bind(
        branchId, companyId, "Main Branch", createdAt,
      ),
      env.DB.prepare("INSERT INTO warehouses (id, company_id, branch_id, name, created_at) VALUES (?, ?, ?, ?, ?)").bind(
        warehouseId, companyId, branchId, "Main Warehouse", createdAt,
      ),
      env.DB.prepare(`INSERT INTO users
        (id, organization_id, company_id, branch_id, warehouse_id, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'owner', ?)`).bind(
        userId, organizationId, companyId, branchId, warehouseId, data.email, passwordHash, createdAt,
      ),
    ]);
  } catch (error) {
    await recordSignupAttempt(env, identifier, now);
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return errorResponse("An account with this email already exists.", 409);
    }
    throw error;
  }

  await recordSignupAttempt(env, identifier, now);

  const session = await createSession(env, userId);
  return json(
    { user: { id: userId, email: data.email, role: "owner" }, setupRequired: true },
    201,
    { "Set-Cookie": sessionCookie(session.token, SESSION_DAYS * 24 * 60 * 60) },
  );
}

async function recordSignupAttempt(
  env: Env,
  identifier: string,
  now: Date,
): Promise<void> {
  const existing = await env.DB.prepare(
    "SELECT attempts, window_started_at, locked_until FROM auth_signup_attempts WHERE identifier = ?",
  ).bind(identifier).first<{ attempts: number; window_started_at: string; locked_until: string | null }>();
  const windowExpired = !existing || now.getTime() - Date.parse(existing.window_started_at) > 15 * 60 * 1000;
  const attempts = windowExpired ? 1 : existing.attempts + 1;
  const windowStartedAt = windowExpired ? now.toISOString() : existing.window_started_at;
  const lockedUntil = attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
  await env.DB.prepare(`
    INSERT INTO auth_signup_attempts (identifier, attempts, window_started_at, locked_until)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(identifier) DO UPDATE SET
      attempts = excluded.attempts,
      window_started_at = excluded.window_started_at,
      locked_until = excluded.locked_until
  `).bind(identifier, attempts, windowStartedAt, lockedUntil).run();
}

async function login(request: Request, env: Env): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const data = await parseBody(request, loginSchema);
  if (data instanceof Response) return data;

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const identifier = await sha256(`${ip}:${data.email}`);
  const now = new Date();
  const attempt = await env.DB.prepare(
    "SELECT attempts, window_started_at, locked_until FROM auth_login_attempts WHERE identifier = ?",
  ).bind(identifier).first<{ attempts: number; window_started_at: string; locked_until: string | null }>();
  if (attempt?.locked_until && Date.parse(attempt.locked_until) > now.getTime()) {
    return errorResponse("Too many sign-in attempts. Try again later.", 429);
  }

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, active, company_id, role FROM users WHERE email = ? COLLATE NOCASE LIMIT 1",
  ).bind(data.email).first<{ id: string; email: string; password_hash: string; active: number; company_id: string; role: "owner" | "manager" | "cashier" }>();
  const valid = user?.active === 1 && await verifyPassword(data.password, user.password_hash);
  if (!valid || !user) {
    const windowExpired = !attempt || now.getTime() - Date.parse(attempt.window_started_at) > 15 * 60 * 1000;
    const attempts = windowExpired ? 1 : attempt.attempts + 1;
    const windowStartedAt = windowExpired ? now.toISOString() : attempt.window_started_at;
    const lockedUntil = attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
    await env.DB.prepare(`
      INSERT INTO auth_login_attempts (identifier, attempts, window_started_at, locked_until)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(identifier) DO UPDATE SET
        attempts = excluded.attempts,
        window_started_at = excluded.window_started_at,
        locked_until = excluded.locked_until
    `).bind(identifier, attempts, windowStartedAt, lockedUntil).run();
    return errorResponse("Email or password is incorrect.", 401);
  }

  await env.DB.prepare("DELETE FROM auth_login_attempts WHERE identifier = ?").bind(identifier).run();
  const session = await createSession(env, user.id);
  const company = await env.DB.prepare(
    "SELECT setup_complete FROM companies WHERE id = ?",
  ).bind(user.company_id).first<{ setup_complete: number }>();
  return json(
    { user: { id: user.id, email: user.email, role: user.role }, setupRequired: company?.setup_complete !== 1 },
    200,
    { "Set-Cookie": sessionCookie(session.token, SESSION_DAYS * 24 * 60 * 60) },
  );
}

async function logout(request: Request, env: Env): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const token = readCookie(request, "quick_session");
  if (token) {
    await env.DB.prepare("DELETE FROM user_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}

async function listProducts(env: Env, user: AuthenticatedUser): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT p.id, p.sku, p.name, p.category, p.price_minor AS priceMinor,
           COALESCE(p.tax_rate_bps, ?) AS taxRateBps, p.is_stocked AS isStocked,
           p.reorder_level AS reorderLevel, COALESCE(b.quantity, 0) AS stock
    FROM products p
    LEFT JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
    WHERE p.company_id = ? AND p.active = 1
    ORDER BY p.name COLLATE NOCASE
  `).bind(user.tax_rate_bps, user.warehouse_id, user.company_id).all();
  return json(result.results);
}

async function updateProduct(
  request: Request,
  env: Env,
  user: AuthenticatedUser,
  productId: string,
): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (user.role !== "owner" && user.role !== "manager") {
    return errorResponse("You do not have permission to update products.", 403);
  }
  const id = z.string().uuid().safeParse(productId);
  if (!id.success) return errorResponse("The product ID is invalid.", 400);
  const data = await parseBody(request, productUpdateSchema);
  if (data instanceof Response) return data;

  const existing = await env.DB.prepare(`
    SELECT p.id, COALESCE(b.quantity, 0) AS quantity
    FROM products p
    LEFT JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
    WHERE p.id = ? AND p.company_id = ? AND p.active = 1
  `).bind(user.warehouse_id, id.data, user.company_id)
    .first<{ id: string; quantity: number }>();
  if (!existing) return errorResponse("The product is not available in this company.", 404);
  if (!data.isStocked && existing.quantity > 0) {
    return errorResponse("A product with available stock cannot be changed to non-stocked.", 409);
  }

  const now = new Date().toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare(`UPDATE products SET
        sku = ?, name = ?, category = ?, price_minor = ?, tax_rate_bps = ?,
        is_stocked = ?, reorder_level = ?
        WHERE id = ? AND company_id = ? AND active = 1`).bind(
        data.sku, data.name, data.category, data.priceMinor, data.taxRateBps ?? null,
        Number(data.isStocked), data.reorderLevel, id.data, user.company_id,
      ),
      env.DB.prepare(`INSERT OR IGNORE INTO stock_balances
        (warehouse_id, product_id, quantity, updated_at)
        SELECT ?, ?, 0, ? WHERE ? = 1`).bind(
        user.warehouse_id, id.data, now, Number(data.isStocked),
      ),
      env.DB.prepare(`INSERT INTO audit_logs
        (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'product.updated', 'product', ?, ?, ?)`).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
        id.data, JSON.stringify({
          sku: data.sku,
          name: data.name,
          priceMinor: data.priceMinor,
          isStocked: data.isStocked,
          reorderLevel: data.reorderLevel,
        }), now,
      ),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: products")) {
      return errorResponse("A product with this SKU already exists.", 409);
    }
    throw error;
  }
  return json({ id: id.data, ...data, stock: existing.quantity });
}

async function createCustomer(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (user.role !== "owner" && user.role !== "manager") {
    return errorResponse("You do not have permission to create customers.", 403);
  }
  const data = await parseBody(request, customerSchema);
  if (data instanceof Response) return data;
  const customerId = randomId();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO customers (id, company_id, name, phone, email, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).bind(
      customerId, user.company_id, data.name, data.phone, data.email, now,
    ),
    env.DB.prepare(`INSERT INTO audit_logs
      (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'customer.created', 'customer', ?, ?, ?)`).bind(
      randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
      customerId, JSON.stringify({ name: data.name }), now,
    ),
  ]);
  return json({ id: customerId, ...data, createdAt: now }, 201);
}

async function createSupplier(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (user.role !== "owner" && user.role !== "manager") {
    return errorResponse("You do not have permission to create suppliers.", 403);
  }
  const data = await parseBody(request, supplierSchema);
  if (data instanceof Response) return data;
  const supplierId = randomId();
  const now = new Date().toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO suppliers
        (id, company_id, code, name, contact_person, phone, email, address,
         tax_number, payment_terms, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        supplierId, user.company_id, data.code, data.name, data.contactPerson,
        data.phone, data.email, data.address, data.taxNumber, data.paymentTerms,
        data.notes, now,
      ),
      env.DB.prepare(`INSERT INTO audit_logs
        (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'supplier.created', 'supplier', ?, ?, ?)`).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
        supplierId, JSON.stringify({ code: data.code, name: data.name }), now,
      ),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: suppliers")) {
      return errorResponse("A supplier with this code already exists.", 409);
    }
    throw error;
  }
  return json({ id: supplierId, ...data, active: true, createdAt: now }, 201);
}

async function listSuppliers(env: Env, user: AuthenticatedUser): Promise<Response> {
  if (user.role !== "owner" && user.role !== "manager") {
    return errorResponse("You do not have permission to view suppliers.", 403);
  }
  const suppliers = await env.DB.prepare(`
    SELECT id, code, name, contact_person AS contactPerson, phone, email,
      address, tax_number AS taxNumber, payment_terms AS paymentTerms, notes
    FROM suppliers WHERE company_id = ? AND active = 1
    ORDER BY name COLLATE NOCASE LIMIT 500
  `).bind(user.company_id).all();
  return json(suppliers.results);
}

async function listPurchaseReceipts(env: Env, user: AuthenticatedUser): Promise<Response> {
  if (user.role !== "owner" && user.role !== "manager") {
    return errorResponse("You do not have permission to view purchase receipts.", 403);
  }
  const receipts = await env.DB.prepare(`
    SELECT r.id, r.reference, r.note, r.created_at AS createdAt,
      s.name AS supplierName, u.email AS recordedBy,
      COUNT(l.id) AS lineCount, COALESCE(SUM(l.line_total_minor), 0) AS totalMinor
    FROM purchase_receipts r
    JOIN suppliers s ON s.id = r.supplier_id
    JOIN users u ON u.id = r.created_by
    LEFT JOIN purchase_receipt_lines l ON l.receipt_id = r.id
    WHERE r.company_id = ? AND r.branch_id = ?
    GROUP BY r.id ORDER BY r.created_at DESC LIMIT 50
  `).bind(user.company_id, user.branch_id).all();
  return json(receipts.results);
}

async function createPurchaseReceipt(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (user.role !== "owner" && user.role !== "manager") {
    return errorResponse("You do not have permission to receive purchases.", 403);
  }
  const data = await parseBody(request, purchaseReceiptSchema);
  if (data instanceof Response) return data;
  const supplier = await env.DB.prepare(
    "SELECT id, name FROM suppliers WHERE id = ? AND company_id = ? AND active = 1",
  ).bind(data.supplierId, user.company_id).first<{ id: string; name: string }>();
  if (!supplier) return errorResponse("The selected supplier is not available in this company.", 404);
  const prior = await env.DB.prepare(
    "SELECT id FROM purchase_receipts WHERE company_id = ? AND reference = ?",
  ).bind(user.company_id, data.reference).first();
  if (prior) return errorResponse("A purchase receipt with this reference already exists.", 409);

  const products = await Promise.all(data.items.map(async (item) => {
    const product = await env.DB.prepare(`
      SELECT p.id, p.name, b.quantity
      FROM products p
      JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
      WHERE p.id = ? AND p.company_id = ? AND p.active = 1 AND p.is_stocked = 1
    `).bind(user.warehouse_id, item.productId, user.company_id)
      .first<{ id: string; name: string; quantity: number }>();
    return product ? { ...item, productName: product.name, previousQuantity: product.quantity } : null;
  }));
  if (products.some((product) => product === null)) {
    return errorResponse("Every receipt item must be an active stocked product in this warehouse.", 400);
  }
  const receiptTotal = data.items.reduce((total, item) => total + item.quantity * item.unitCostMinor, 0);
  if (!Number.isSafeInteger(receiptTotal)) return errorResponse("The receipt total is too large.", 400);

  const receiptId = randomId();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`INSERT INTO purchase_receipts
      (id, organization_id, company_id, branch_id, warehouse_id, supplier_id,
       reference, note, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      receiptId, user.organization_id, user.company_id, user.branch_id,
      user.warehouse_id, supplier.id, data.reference, data.note, user.id, now,
    ),
  ];
  for (const [index, product] of products.entries()) {
    if (!product) continue;
    const item = data.items[index];
    const lineId = randomId();
    const newQuantity = product.previousQuantity + item.quantity;
    statements.push(
      env.DB.prepare(`INSERT INTO purchase_receipt_lines
        (id, receipt_id, product_id, quantity, unit_cost_minor, line_total_minor)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(
        lineId, receiptId, item.productId, item.quantity, item.unitCostMinor,
        item.quantity * item.unitCostMinor,
      ),
      env.DB.prepare(`INSERT INTO stock_movements (
        id, organization_id, company_id, branch_id, warehouse_id, product_id,
        movement_type, quantity_delta, previous_quantity, new_quantity,
        reference_id, reason, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'purchase_receipt', ?, ?, ?, ?, ?, ?, ?)`).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id,
        user.warehouse_id, item.productId, item.quantity, product.previousQuantity,
        newQuantity, receiptId, `Goods received: ${data.reference}`, user.id, now,
      ),
    );
  }
  statements.push(env.DB.prepare(`INSERT INTO audit_logs
    (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, 'purchase.receipt_posted', 'purchase_receipt', ?, ?, ?)`).bind(
    randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
    receiptId, JSON.stringify({
      supplierId: supplier.id,
      reference: data.reference,
      totalMinor: receiptTotal,
      items: data.items,
    }), now,
  ));
  try {
    await env.DB.batch(statements);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: purchase_receipts")) {
      return errorResponse("A purchase receipt with this reference already exists.", 409);
    }
    if (error instanceof Error && error.message.includes("stock_balance_changed")) {
      return errorResponse("Stock changed while this receipt was being posted. Refresh and retry.", 409);
    }
    if (error instanceof Error && error.message.includes("invalid_inventory_movement")) {
      return errorResponse("The purchase receipt contains an invalid stock movement.", 400);
    }
    throw error;
  }
  return json({ id: receiptId, reference: data.reference, totalMinor: receiptTotal }, 201);
}

async function inventoryOverview(env: Env, user: AuthenticatedUser): Promise<Response> {
  if (!canAccessInventoryDashboard(user.role)) {
    return errorResponse("You do not have permission to view warehouse inventory.", 403);
  }

  const [warehouse, summary, products, recentMovements, recentCounts] = await Promise.all([
    env.DB.prepare("SELECT id, name FROM warehouses WHERE id = ? AND company_id = ?")
      .bind(user.warehouse_id, user.company_id)
      .first<{ id: string; name: string }>(),
    env.DB.prepare(`
      SELECT COUNT(*) AS products,
        COALESCE(SUM(COALESCE(b.quantity, 0)), 0) AS totalUnits,
        COALESCE(SUM(CASE WHEN COALESCE(b.quantity, 0) = 0 THEN 1 ELSE 0 END), 0) AS outOfStock,
        COALESCE(SUM(CASE WHEN COALESCE(b.quantity, 0) > 0 AND b.quantity <= p.reorder_level THEN 1 ELSE 0 END), 0) AS lowStock
      FROM products p
      LEFT JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
      WHERE p.company_id = ? AND p.active = 1 AND p.is_stocked = 1
    `).bind(user.warehouse_id, user.company_id).first(),
    env.DB.prepare(`
      SELECT p.id, p.sku, p.name, p.category,
        COALESCE(b.quantity, 0) AS quantity,
        p.reorder_level AS reorderLevel,
        CASE
          WHEN COALESCE(b.quantity, 0) = 0 THEN 'out'
          WHEN b.quantity <= p.reorder_level THEN 'low'
          ELSE 'healthy'
        END AS status
      FROM products p
      LEFT JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
      WHERE p.company_id = ? AND p.active = 1 AND p.is_stocked = 1
      ORDER BY
        CASE WHEN COALESCE(b.quantity, 0) = 0 THEN 0
             WHEN b.quantity <= p.reorder_level THEN 1 ELSE 2 END,
        p.name COLLATE NOCASE
    `).bind(user.warehouse_id, user.company_id).all(),
    env.DB.prepare(`
      SELECT m.id, m.movement_type AS movementType,
        m.quantity_delta AS quantityDelta, m.previous_quantity AS previousQuantity,
        m.new_quantity AS newQuantity, m.reason, m.created_at AS createdAt,
        p.name AS productName, p.sku
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      WHERE m.company_id = ? AND m.branch_id = ? AND m.warehouse_id = ?
      ORDER BY m.created_at DESC
      LIMIT 8
    `).bind(user.company_id, user.branch_id, user.warehouse_id).all(),
    env.DB.prepare(`
      SELECT c.id, p.name AS productName, p.sku,
        l.expected_quantity AS expectedQuantity,
        l.counted_quantity AS countedQuantity,
        l.quantity_delta AS quantityDelta,
        c.reason, c.created_at AS createdAt
      FROM stock_counts c
      JOIN stock_count_lines l ON l.stock_count_id = c.id
      JOIN products p ON p.id = l.product_id
      WHERE c.company_id = ? AND c.branch_id = ? AND c.warehouse_id = ?
      ORDER BY c.created_at DESC
      LIMIT 8
    `).bind(user.company_id, user.branch_id, user.warehouse_id).all(),
  ]);

  if (!warehouse) return errorResponse("The assigned warehouse could not be found.", 404);
  return json({
    currencyCode: user.currency_code,
    timezone: user.timezone,
    warehouse,
    summary,
    products: products.results,
    recentMovements: recentMovements.results,
    recentCounts: recentCounts.results,
  });
}

async function adjustInventory(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (!canAccessInventoryDashboard(user.role)) {
    return errorResponse("You do not have permission to adjust warehouse inventory.", 403);
  }
  const data = await parseBody(request, inventoryAdjustmentSchema);
  if (data instanceof Response) return data;

  const product = await env.DB.prepare(`
    SELECT p.name, b.quantity
    FROM products p
    JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
    WHERE p.id = ? AND p.company_id = ? AND p.active = 1 AND p.is_stocked = 1
  `).bind(user.warehouse_id, data.productId, user.company_id)
    .first<{ name: string; quantity: number }>();
  if (!product) return errorResponse("The selected stocked product is not available in this warehouse.", 404);

  const newQuantity = product.quantity + data.quantityDelta;
  if (newQuantity < 0) return errorResponse("An adjustment cannot reduce stock below zero.", 409);

  const now = new Date().toISOString();
  const movementId = randomId();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO stock_movements (
        id, organization_id, company_id, branch_id, warehouse_id, product_id,
        movement_type, quantity_delta, previous_quantity, new_quantity,
        reference_id, reason, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'adjustment', ?, ?, ?, ?, ?, ?, ?)`).bind(
        movementId, user.organization_id, user.company_id, user.branch_id,
        user.warehouse_id, data.productId, data.quantityDelta, product.quantity,
        newQuantity, movementId, data.reason, user.id, now,
      ),
      env.DB.prepare(`INSERT INTO audit_logs
        (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'inventory.adjusted', 'stock_movement', ?, ?, ?)`).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
        movementId, JSON.stringify({
          productId: data.productId,
          quantityDelta: data.quantityDelta,
          previousQuantity: product.quantity,
          newQuantity,
          reason: data.reason,
        }), now,
      ),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("stock_balance_changed")) {
      return errorResponse("Stock changed while the adjustment was being saved. Refresh and try again.", 409);
    }
    if (error instanceof Error && error.message.includes("invalid_stock_adjustment")) {
      return errorResponse("The stock adjustment is invalid.", 400);
    }
    throw error;
  }
  return json({ id: movementId, productId: data.productId, quantity: newQuantity }, 201);
}

async function postStockCount(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (!canAccessInventoryDashboard(user.role)) {
    return errorResponse("You do not have permission to count warehouse inventory.", 403);
  }
  const data = await parseBody(request, stockCountSchema);
  if (data instanceof Response) return data;

  const product = await env.DB.prepare(`
    SELECT p.name, b.quantity
    FROM products p
    JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
    WHERE p.id = ? AND p.company_id = ? AND p.active = 1 AND p.is_stocked = 1
  `).bind(user.warehouse_id, data.productId, user.company_id)
    .first<{ name: string; quantity: number }>();
  if (!product) return errorResponse("The selected stocked product is not available in this warehouse.", 404);

  const quantityDelta = data.countedQuantity - product.quantity;
  const now = new Date().toISOString();
  const countId = randomId();
  const lineId = randomId();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`INSERT INTO stock_counts (
      id, organization_id, company_id, branch_id, warehouse_id, created_by, reason, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?)`).bind(
      countId, user.organization_id, user.company_id, user.branch_id,
      user.warehouse_id, user.id, data.reason, now,
    ),
    env.DB.prepare(`INSERT INTO stock_count_lines (
      id, stock_count_id, product_id, expected_quantity, counted_quantity, quantity_delta
    ) VALUES (?, ?, ?, ?, ?, ?)`).bind(
      lineId, countId, data.productId, product.quantity, data.countedQuantity, quantityDelta,
    ),
  ];
  if (quantityDelta !== 0) {
    statements.push(env.DB.prepare(`INSERT INTO stock_movements (
      id, organization_id, company_id, branch_id, warehouse_id, product_id,
      movement_type, quantity_delta, previous_quantity, new_quantity,
      reference_id, reason, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'stock_count', ?, ?, ?, ?, ?, ?, ?)`).bind(
      randomId(), user.organization_id, user.company_id, user.branch_id,
      user.warehouse_id, data.productId, quantityDelta, product.quantity,
      data.countedQuantity, countId, data.reason, user.id, now,
    ));
  }
  statements.push(env.DB.prepare(`INSERT INTO audit_logs
    (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, 'inventory.count_posted', 'stock_count', ?, ?, ?)`).bind(
    randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
    countId, JSON.stringify({
      productId: data.productId,
      expectedQuantity: product.quantity,
      countedQuantity: data.countedQuantity,
      quantityDelta,
      reason: data.reason,
    }), now,
  ));

  try {
    await env.DB.batch(statements);
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes("stock_count_balance_changed")
      || error.message.includes("stock_balance_changed")
    )) {
      return errorResponse("Stock changed while the count was being posted. Refresh and count again.", 409);
    }
    if (error instanceof Error && error.message.includes("invalid_inventory_movement")) {
      return errorResponse("The stock count is invalid.", 400);
    }
    throw error;
  }
  return json({
    id: countId,
    productId: data.productId,
    expectedQuantity: product.quantity,
    countedQuantity: data.countedQuantity,
    quantityDelta,
  }, 201);
}

async function shiftAccounting(env: Env, shiftId: string): Promise<{
  openingCashMinor: number;
  cashSalesMinor: number;
  cashInMinor: number;
  cashOutMinor: number;
} | null> {
  return env.DB.prepare(`
    SELECT sh.opening_cash_minor AS openingCashMinor,
      COALESCE((SELECT SUM(p.amount_minor) FROM payments p
        WHERE p.shift_id = sh.id AND lower(p.method) = 'cash'), 0) AS cashSalesMinor,
      COALESCE((SELECT SUM(m.amount_minor) FROM shift_cash_movements m
        WHERE m.shift_id = sh.id AND m.movement_type = 'cash_in'), 0) AS cashInMinor,
      COALESCE((SELECT SUM(m.amount_minor) FROM shift_cash_movements m
        WHERE m.shift_id = sh.id AND m.movement_type = 'cash_out'), 0) AS cashOutMinor
    FROM cashier_shifts sh WHERE sh.id = ?
  `).bind(shiftId).first();
}

function canOperateCashierShift(role: AuthenticatedUser["role"]): boolean {
  return role === "owner" || role === "cashier";
}

async function currentCashierShift(env: Env, user: AuthenticatedUser): Promise<Response> {
  if (!canOperateCashierShift(user.role)) {
    return errorResponse("Cashier shift access is limited to owners and cashier accounts.", 403);
  }
  const shift = await env.DB.prepare(`
    SELECT id, opening_cash_minor AS openingCashMinor, opened_at AS openedAt
    FROM cashier_shifts WHERE cashier_user_id = ? AND company_id = ? AND status = 'open'
  `).bind(user.id, user.company_id).first<{ id: string; openingCashMinor: number; openedAt: string }>();
  if (!shift) return json({ currentShift: null });

  const [accounting, movements] = await Promise.all([
    shiftAccounting(env, shift.id),
    env.DB.prepare(`
      SELECT id, movement_type AS movementType, amount_minor AS amountMinor,
        reason, created_at AS createdAt
      FROM shift_cash_movements WHERE shift_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).bind(shift.id).all(),
  ]);
  if (!accounting) return errorResponse("The active shift could not be loaded.", 500);
  return json({
    currentShift: {
      ...shift,
      ...accounting,
      expectedCashMinor: calculateExpectedCash(
        accounting.openingCashMinor,
        accounting.cashSalesMinor,
        accounting.cashInMinor,
        accounting.cashOutMinor,
      ),
      movements: movements.results,
    },
  });
}

async function openCashierShift(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (!canOperateCashierShift(user.role)) return errorResponse("Only owners and cashiers can open a cashier shift.", 403);
  const data = await parseBody(request, shiftOpenSchema);
  if (data instanceof Response) return data;

  const existing = await env.DB.prepare(
    "SELECT id FROM cashier_shifts WHERE cashier_user_id = ? AND status = 'open'",
  ).bind(user.id).first();
  if (existing) return errorResponse("You already have an open shift.", 409);

  const shiftId = randomId();
  const now = new Date().toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO cashier_shifts (
        id, organization_id, company_id, branch_id, warehouse_id, cashier_user_id,
        opening_cash_minor, opened_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')`).bind(
        shiftId, user.organization_id, user.company_id, user.branch_id,
        user.warehouse_id, user.id, data.openingCashMinor, now,
      ),
      env.DB.prepare(`INSERT INTO audit_logs
        (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'cashier_shift.opened', 'cashier_shift', ?, ?, ?)`).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
        shiftId, JSON.stringify({ openingCashMinor: data.openingCashMinor }), now,
      ),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return errorResponse("You already have an open shift.", 409);
    }
    throw error;
  }
  return json({ id: shiftId, openingCashMinor: data.openingCashMinor, openedAt: now }, 201);
}

async function recordShiftCashMovement(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (!canOperateCashierShift(user.role)) return errorResponse("Only owners and cashiers can record shift cash movements.", 403);
  const data = await parseBody(request, shiftMovementSchema);
  if (data instanceof Response) return data;

  const shift = await env.DB.prepare(
    "SELECT id FROM cashier_shifts WHERE cashier_user_id = ? AND company_id = ? AND status = 'open'",
  ).bind(user.id, user.company_id).first<{ id: string }>();
  if (!shift) return errorResponse("Open a shift before recording cash movements.", 409);

  const now = new Date().toISOString();
  const movementId = randomId();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO shift_cash_movements (
        id, shift_id, company_id, branch_id, created_by, movement_type, amount_minor, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        movementId, shift.id, user.company_id, user.branch_id, user.id,
        data.movementType, data.amountMinor, data.reason, now,
      ),
      env.DB.prepare(`INSERT INTO audit_logs
        (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'cashier_shift.cash_movement', 'shift_cash_movement', ?, ?, ?)`).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
        movementId, JSON.stringify(data), now,
      ),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("insufficient_shift_cash")) {
      return errorResponse("Cash withdrawal exceeds the available shift balance.", 409);
    }
    if (error instanceof Error && error.message.includes("invalid_cashier_shift")) {
      return errorResponse("The shift is no longer open. Refresh and try again.", 409);
    }
    throw error;
  }
  return json({ id: movementId, ...data, createdAt: now }, 201);
}

async function closeCashierShift(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (!canOperateCashierShift(user.role)) return errorResponse("Only owners and cashiers can close a cashier shift.", 403);
  const data = await parseBody(request, shiftCloseSchema);
  if (data instanceof Response) return data;

  const shift = await env.DB.prepare(
    "SELECT id FROM cashier_shifts WHERE cashier_user_id = ? AND company_id = ? AND status = 'open'",
  ).bind(user.id, user.company_id).first<{ id: string }>();
  if (!shift) return errorResponse("There is no open shift to close.", 409);

  const now = new Date().toISOString();
  const expectedCash = `opening_cash_minor
    + COALESCE((SELECT SUM(p.amount_minor) FROM payments p
      WHERE p.shift_id = cashier_shifts.id AND lower(p.method) = 'cash'), 0)
    + COALESCE((SELECT SUM(m.amount_minor) FROM shift_cash_movements m
      WHERE m.shift_id = cashier_shifts.id AND m.movement_type = 'cash_in'), 0)
    - COALESCE((SELECT SUM(m.amount_minor) FROM shift_cash_movements m
      WHERE m.shift_id = cashier_shifts.id AND m.movement_type = 'cash_out'), 0)`;
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE cashier_shifts
      SET status = 'closed', closed_at = ?, counted_cash_minor = ?,
        expected_cash_minor = ${expectedCash},
        variance_minor = ? - (${expectedCash})
      WHERE id = ? AND cashier_user_id = ? AND status = 'open'`).bind(
      now, data.countedCashMinor, data.countedCashMinor, shift.id, user.id,
    ),
    env.DB.prepare(`INSERT INTO audit_logs
      (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
      SELECT ?, ?, ?, ?, ?, 'cashier_shift.closed', 'cashier_shift', id,
        json_object('countedCashMinor', counted_cash_minor,
          'expectedCashMinor', expected_cash_minor, 'varianceMinor', variance_minor), ?
      FROM cashier_shifts WHERE id = ? AND status = 'closed' AND closed_at = ?`).bind(
      randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
      now, shift.id, now,
    ),
  ]);
  if (results[0]?.meta.changes !== 1) return errorResponse("The shift is no longer open. Refresh and try again.", 409);

  const closed = await env.DB.prepare(`
    SELECT expected_cash_minor AS expectedCashMinor,
      counted_cash_minor AS countedCashMinor, variance_minor AS varianceMinor, closed_at AS closedAt
    FROM cashier_shifts WHERE id = ?
  `).bind(shift.id).first();
  return json(closed);
}

async function createExpense(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (user.role !== "owner") return errorResponse("You do not have permission to record company expenses.", 403);
  const data = await parseBody(request, expenseSchema);
  if (data instanceof Response) return data;

  const expenseId = randomId();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO expenses (
      id, organization_id, company_id, branch_id, created_by, amount_minor, category, memo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      expenseId, user.organization_id, user.company_id, user.branch_id, user.id,
      data.amountMinor, data.category, data.memo, now,
    ),
    env.DB.prepare(`INSERT INTO audit_logs
      (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'expense.recorded', 'expense', ?, ?, ?)`).bind(
      randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
      expenseId, JSON.stringify(data), now,
    ),
  ]);
  return json({ id: expenseId, ...data, createdAt: now }, 201);
}

async function createProduct(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (user.role !== "owner" && user.role !== "manager") return errorResponse("You do not have permission to create products.", 403);
  const data = await parseBody(request, productSchema);
  if (data instanceof Response) return data;

  const productId = randomId();
  const now = new Date().toISOString();
  const openingQuantity = data.isStocked ? data.openingQuantity : 0;
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO products
        (id, company_id, sku, name, category, price_minor, tax_rate_bps, is_stocked, reorder_level, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        productId, user.company_id, data.sku, data.name, data.category, data.priceMinor,
        data.taxRateBps ?? null, Number(data.isStocked), data.reorderLevel, now,
      ),
      env.DB.prepare(`INSERT INTO stock_balances (warehouse_id, product_id, quantity, updated_at)
        SELECT ?, ?, ?, ? WHERE ? = 1`).bind(user.warehouse_id, productId, openingQuantity, now, Number(data.isStocked)),
      env.DB.prepare(`INSERT INTO stock_movements (
        id, organization_id, company_id, branch_id, warehouse_id, product_id,
        movement_type, quantity_delta, previous_quantity, new_quantity,
        reference_id, reason, created_by, created_at
      ) SELECT ?, ?, ?, ?, ?, ?, 'opening_balance', ?, 0, ?, ?, 'Initial stock entry', ?, ?
      WHERE ? > 0`).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id, user.warehouse_id,
        productId, openingQuantity, openingQuantity, productId, user.id, now, openingQuantity,
      ),
      env.DB.prepare(`INSERT INTO audit_logs
        (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'product.created', 'product', ?, ?, ?)`).bind(
        randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
        productId, JSON.stringify({ sku: data.sku, openingQuantity }), now,
      ),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: products")) {
      return errorResponse("A product with this SKU already exists.", 409);
    }
    throw error;
  }
  return json({ id: productId, ...data, stock: openingQuantity }, 201);
}

async function createSale(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  const data = await parseBody(request, saleSchema);
  if (data instanceof Response) return data;

  if (data.customerId) {
    const customer = await env.DB.prepare("SELECT id FROM customers WHERE id = ? AND company_id = ?")
      .bind(data.customerId, user.company_id).first();
    if (!customer) return errorResponse("The selected customer is not available in this company.", 400);
  }

  const prior = await env.DB.prepare(`
    SELECT id, invoice_number AS invoiceNumber, total_minor AS totalMinor, status
    FROM sales WHERE company_id = ? AND idempotency_key = ?
  `).bind(user.company_id, data.idempotencyKey).first();
  if (prior) return json({ ...prior, duplicate: true });

  const activeShift = canOperateCashierShift(user.role)
    ? await env.DB.prepare(
      "SELECT id FROM cashier_shifts WHERE cashier_user_id = ? AND company_id = ? AND status = 'open'",
    ).bind(user.id, user.company_id).first<{ id: string }>()
    : null;
  if (user.role === "cashier" && !activeShift) {
    return errorResponse("Open a cashier shift before completing sales.", 409);
  }

  const uniqueProductIds = [...new Set(data.items.map((item) => item.productId))];
  const productRows = await env.DB.prepare(`
    SELECT p.id, p.name, p.price_minor, p.tax_rate_bps, p.is_stocked, p.active,
           COALESCE(b.quantity, 0) AS stock
    FROM products p
    LEFT JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
    WHERE p.company_id = ? AND p.id IN (${uniqueProductIds.map(() => "?").join(",")})
  `).bind(user.warehouse_id, user.company_id, ...uniqueProductIds).all<{
    id: string; name: string; price_minor: number; tax_rate_bps: number | null;
    is_stocked: number; active: number; stock: number;
  }>();
  const productsById = new Map(productRows.results.map((product) => [product.id, product]));
  const saleLines = data.items.map((item): SaleLineInput | null => {
    const product = productsById.get(item.productId);
    if (!product || product.active !== 1) return null;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPriceMinor: product.price_minor,
      discountMinor: item.discountMinor,
      taxRateBps: product.tax_rate_bps ?? user.tax_rate_bps,
    };
  });
  if (saleLines.some((line) => line === null)) {
    return errorResponse("One or more products are unavailable in this company.", 400);
  }
  const validSaleLines = saleLines.filter((line): line is SaleLineInput => line !== null);

  let calculated;
  try {
    calculated = calculateSale(validSaleLines);
    validatePayments(data.payments, calculated.totalMinor);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid sale.", 400);
  }

  const now = new Date().toISOString();
  const saleId = randomId();
  const invoiceNumber = `S-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`INSERT INTO sales (
      id, organization_id, company_id, branch_id, warehouse_id, cashier_user_id,
      customer_id, invoice_number, idempotency_key, subtotal_minor, tax_minor,
      total_minor, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`).bind(
      saleId, user.organization_id, user.company_id, user.branch_id, user.warehouse_id,
      user.id, data.customerId ?? null, invoiceNumber, data.idempotencyKey,
      calculated.subtotalMinor, calculated.taxMinor, calculated.totalMinor, now,
    ),
    ...calculated.lines.map((line) => env.DB.prepare(`INSERT INTO sale_items (
      id, sale_id, product_id, quantity, unit_price_minor, discount_minor,
      tax_rate_bps, tax_minor, line_total_minor
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      randomId(), saleId, line.productId, line.quantity, line.unitPriceMinor,
      line.discountMinor, line.taxRateBps, line.taxMinor, line.lineTotalMinor,
    )),
    ...data.payments.map((payment: PaymentInput) => env.DB.prepare(
      "INSERT INTO payments (id, sale_id, method, amount_minor, created_at, shift_id) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(randomId(), saleId, payment.method, payment.amountMinor, now, activeShift?.id ?? null)),
    env.DB.prepare(`INSERT INTO audit_logs
      (id, organization_id, company_id, branch_id, user_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'sale.completed', 'sale', ?, ?, ?)`).bind(
      randomId(), user.organization_id, user.company_id, user.branch_id, user.id,
      saleId, JSON.stringify({ invoiceNumber, totalMinor: calculated.totalMinor }), now,
    ),
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    const retryResult = await env.DB.prepare(`
      SELECT id, invoice_number AS invoiceNumber, total_minor AS totalMinor, status
      FROM sales WHERE company_id = ? AND idempotency_key = ?
    `).bind(user.company_id, data.idempotencyKey).first();
    if (retryResult) return json({ ...retryResult, duplicate: true });
    if (error instanceof Error && error.message.includes("insufficient_stock")) {
      return errorResponse("Insufficient stock. Refresh inventory and try again.", 409);
    }
    if (error instanceof Error && error.message.includes("invalid_cashier_shift")) {
      return errorResponse("The cashier shift closed before the sale was recorded. Open a new shift and retry.", 409);
    }
    throw error;
  }

  return json({ id: saleId, invoiceNumber, totalMinor: calculated.totalMinor, currencyCode: user.currency_code, status: "completed" }, 201);
}

async function dashboard(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const url = new URL(request.url);
  const requestedView = url.searchParams.get("view");
  const view = requestedView === null
    ? defaultDashboardView(user.role)
    : parseDashboardView(requestedView);
  if (!view) return errorResponse("Dashboard view is invalid.", 400);
  if (!canAccessDashboard(user.role, view)) {
    return errorResponse("You do not have permission to view this dashboard.", 403);
  }

  const days = Number(url.searchParams.get("days"));
  const rangeDays = Number.isInteger(days) && days >= 1 && days <= 90 ? days : 7;
  const now = new Date();
  const start = new Date(now.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  const startAt = start.toISOString();
  const salesScopeColumns = user.role === "cashier"
    ? ["company_id", "branch_id", "cashier_user_id"]
    : user.role === "manager"
      ? ["company_id", "branch_id"]
      : ["company_id"];
  const salesScope = salesScopeColumns.map((column) => `${column} = ?`).join(" AND ");
  const aliasedSalesScope = salesScopeColumns.map((column) => `s.${column} = ?`).join(" AND ");
  const salesScopeBindings = user.role === "cashier"
    ? [user.company_id, user.branch_id, user.id]
    : user.role === "manager"
      ? [user.company_id, user.branch_id]
      : [user.company_id];
  const cashierSalesScope = user.role === "owner"
    ? "AND s.company_id = ?"
    : user.role === "manager"
      ? "AND s.company_id = ? AND s.branch_id = ?"
      : "AND s.company_id = ? AND s.branch_id = ? AND s.cashier_user_id = ?";
  const cashierSalesScopeBindings = user.role === "owner"
    ? [user.company_id]
    : user.role === "manager"
      ? [user.company_id, user.branch_id]
      : [user.company_id, user.branch_id, user.id];
  const cashierUserScope = user.role === "manager" ? "AND u.branch_id = ?" : user.role === "cashier" ? "AND u.id = ?" : "";
  const cashierUserScopeBindings = user.role === "manager" ? [user.branch_id] : user.role === "cashier" ? [user.id] : [];
  const shiftScope = user.role === "manager"
    ? "AND sh.branch_id = ?"
    : user.role === "cashier"
      ? "AND sh.cashier_user_id = ?"
      : "";
  const shiftScopeBindings = user.role === "manager" ? [user.branch_id] : user.role === "cashier" ? [user.id] : [];
  const canViewExpenses = user.role === "owner";

  const [
    salesSummary,
    inventorySummary,
    dailySales,
    categorySales,
    recentSales,
    lowStockItems,
    paymentMethods,
    discountSummary,
    topProducts,
    cashierPerformance,
    expenseSummary,
    expensesByCategory,
    recentExpenses,
    shiftSummary,
  ] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS transactions, COALESCE(SUM(total_minor), 0) AS revenueMinor
      FROM sales WHERE ${salesScope} AND status = 'completed' AND created_at >= ?`)
      .bind(...salesScopeBindings, startAt).first(),
    env.DB.prepare(`SELECT COUNT(DISTINCT p.id) AS products,
        COALESCE(SUM(b.quantity), 0) AS totalStock,
        SUM(CASE WHEN p.is_stocked = 1 AND b.quantity <= p.reorder_level THEN 1 ELSE 0 END) AS lowStock
      FROM products p
      LEFT JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
      WHERE p.company_id = ? AND p.active = 1`)
      .bind(user.warehouse_id, user.company_id).first(),
    env.DB.prepare(`SELECT date(created_at) AS date, SUM(total_minor) AS revenueMinor
      FROM sales       WHERE ${salesScope} AND status = 'completed' AND created_at >= ?
      GROUP BY date(created_at) ORDER BY date(created_at)`)
      .bind(...salesScopeBindings, startAt).all(),
    env.DB.prepare(`SELECT COALESCE(NULLIF(p.category, ''), 'Uncategorized') AS name,
        SUM(si.line_total_minor - si.tax_minor) AS revenueMinor
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE ${aliasedSalesScope} AND s.status = 'completed' AND s.created_at >= ?
      GROUP BY COALESCE(NULLIF(p.category, ''), 'Uncategorized')
      ORDER BY revenueMinor DESC LIMIT 6`)
      .bind(...salesScopeBindings, startAt).all(),
    env.DB.prepare(`SELECT s.id, s.invoice_number AS invoiceNumber,
        s.total_minor AS totalMinor, s.status, s.created_at AS createdAt,
        COALESCE(c.name, 'Walk-in customer') AS customerName
      FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
      WHERE ${aliasedSalesScope} AND s.status = 'completed'
      ORDER BY s.created_at DESC LIMIT 6`).bind(...salesScopeBindings).all(),
    env.DB.prepare(`SELECT p.id, p.name, p.sku, b.quantity, p.reorder_level AS reorderLevel
      FROM products p
      JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = ?
      WHERE p.company_id = ? AND p.active = 1 AND p.is_stocked = 1
        AND b.quantity <= p.reorder_level
      ORDER BY b.quantity ASC, p.name COLLATE NOCASE LIMIT 6`)
      .bind(user.warehouse_id, user.company_id).all(),
    env.DB.prepare(`SELECT p.method, COUNT(*) AS transactions,
        COALESCE(SUM(p.amount_minor), 0) AS amountMinor
      FROM payments p
      JOIN sales s ON s.id = p.sale_id
      WHERE ${aliasedSalesScope} AND s.status = 'completed' AND s.created_at >= ?
      GROUP BY p.method ORDER BY amountMinor DESC`)
      .bind(...salesScopeBindings, startAt).all(),
    env.DB.prepare(`SELECT COALESCE(SUM(si.discount_minor), 0) AS discountMinor
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE ${aliasedSalesScope} AND s.status = 'completed' AND s.created_at >= ?`)
      .bind(...salesScopeBindings, startAt).first(),
    env.DB.prepare(`SELECT p.id, p.name, p.sku, SUM(si.quantity) AS quantity,
        COALESCE(SUM(si.line_total_minor - si.tax_minor), 0) AS revenueMinor
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE ${aliasedSalesScope} AND s.status = 'completed' AND s.created_at >= ?
      GROUP BY p.id ORDER BY quantity DESC, revenueMinor DESC LIMIT 6`)
      .bind(...salesScopeBindings, startAt).all(),
    env.DB.prepare(`SELECT u.id, u.email, COUNT(s.id) AS transactions,
        COALESCE(SUM(s.total_minor), 0) AS revenueMinor
      FROM users u
      LEFT JOIN sales s ON s.cashier_user_id = u.id
        AND s.status = 'completed' AND s.created_at >= ?
        ${cashierSalesScope}
      WHERE u.company_id = ? ${cashierUserScope}
      GROUP BY u.id ORDER BY revenueMinor DESC LIMIT 6`)
      .bind(
        startAt,
        ...cashierSalesScopeBindings,
        user.company_id,
        ...cashierUserScopeBindings,
      ).all(),
    canViewExpenses
      ? env.DB.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(amount_minor), 0) AS amountMinor
          FROM expenses WHERE company_id = ? AND created_at >= ?`)
        .bind(user.company_id, startAt).first()
      : Promise.resolve(null),
    canViewExpenses
      ? env.DB.prepare(`SELECT category, COUNT(*) AS count, SUM(amount_minor) AS amountMinor
          FROM expenses WHERE company_id = ? AND created_at >= ?
          GROUP BY category ORDER BY amountMinor DESC LIMIT 6`)
        .bind(user.company_id, startAt).all()
      : Promise.resolve(null),
    canViewExpenses
      ? env.DB.prepare(`SELECT e.id, e.amount_minor AS amountMinor, e.category, e.memo,
          e.created_at AS createdAt, u.email AS recordedBy
          FROM expenses e JOIN users u ON u.id = e.created_by
          WHERE e.company_id = ? AND e.created_at >= ?
          ORDER BY e.created_at DESC LIMIT 8`)
        .bind(user.company_id, startAt).all()
      : Promise.resolve(null),
    env.DB.prepare(`SELECT
        COALESCE(SUM(CASE WHEN sh.status = 'open' THEN 1 ELSE 0 END), 0) AS openShifts,
        COALESCE(SUM(CASE WHEN sh.status = 'closed' AND sh.closed_at >= ? THEN 1 ELSE 0 END), 0) AS closedShifts,
        COALESCE(SUM(CASE WHEN sh.status = 'closed' AND sh.closed_at >= ? THEN sh.variance_minor ELSE 0 END), 0) AS varianceMinor
      FROM cashier_shifts sh
      WHERE sh.company_id = ? ${shiftScope}`)
      .bind(startAt, startAt, user.company_id, ...shiftScopeBindings).first(),
  ]);
  const transactions = Number(salesSummary?.transactions ?? 0);
  const revenueMinor = Number(salesSummary?.revenueMinor ?? 0);
  return json({
    view,
    currencyCode: user.currency_code,
    timezone: user.timezone,
    period: { start: startAt, end: now.toISOString(), days: rangeDays },
    sales: {
      ...salesSummary,
      averageTransactionMinor: transactions > 0 ? Math.round(revenueMinor / transactions) : 0,
    },
    inventory: inventorySummary,
    salesTrend: dailySales.results,
    salesByCategory: categorySales.results,
    recentSales: recentSales.results,
    lowStockItems: lowStockItems.results,
    paymentMethods: paymentMethods.results,
    discounts: discountSummary,
    topProducts: topProducts.results,
    cashierPerformance: cashierPerformance.results,
    expenses: canViewExpenses
      ? {
          summary: expenseSummary ?? { count: 0, amountMinor: 0 },
          byCategory: expensesByCategory?.results ?? [],
          recent: recentExpenses?.results ?? [],
        }
      : null,
    shiftSummary,
  });
}

async function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (request.method === "GET" && pathname === "/api/health") return json({ ok: true });
  if (request.method === "POST" && pathname === "/api/auth/login") return login(request, env);
  if (request.method === "POST" && pathname === "/api/auth/signup") return signup(request, env);
  if (request.method === "POST" && pathname === "/api/auth/logout") return logout(request, env);

  if (pathname.startsWith("/api/")) {
    const user = await authenticate(request, env);
    if (!user) return errorResponse("Sign in to continue.", 401);

    if (request.method === "GET" && pathname === "/api/auth/session") {
      const branch = await env.DB.prepare("SELECT name FROM branches WHERE id = ? AND company_id = ?")
        .bind(user.branch_id, user.company_id).first<{ name: string }>();
      const company = await env.DB.prepare(
        "SELECT setup_complete, name FROM companies WHERE id = ?",
      ).bind(user.company_id).first<{ setup_complete: number; name: string }>();
      return json({
        user: { id: user.id, email: user.email, role: user.role },
        company: { name: company?.name ?? "Pending Setup", currencyCode: user.currency_code, timezone: user.timezone, setupComplete: company?.setup_complete === 1 },
        branch: { id: user.branch_id, name: branch?.name ?? "Assigned branch" },
      });
    }
    if (request.method === "GET" && pathname === "/api/setup/status") return setupStatus(env, user);
    if (request.method === "POST" && pathname === "/api/setup") return setup(request, env, user);
    if (request.method === "GET" && pathname === "/api/settings") return getSettings(env, user);
    if (request.method === "PUT" && pathname === "/api/settings") return updateSettings(request, env, user);
    if (request.method === "GET" && pathname === "/api/products") return listProducts(env, user);
    const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (request.method === "PUT" && productMatch) return updateProduct(request, env, user, productMatch[1]);
    if (request.method === "GET" && pathname === "/api/inventory") return inventoryOverview(env, user);
    if (request.method === "POST" && pathname === "/api/inventory/adjustments") return adjustInventory(request, env, user);
    if (request.method === "POST" && pathname === "/api/inventory/counts") return postStockCount(request, env, user);
    if (request.method === "GET" && pathname === "/api/shifts/current") return currentCashierShift(env, user);
    if (request.method === "POST" && pathname === "/api/shifts/open") return openCashierShift(request, env, user);
    if (request.method === "POST" && pathname === "/api/shifts/movements") return recordShiftCashMovement(request, env, user);
    if (request.method === "POST" && pathname === "/api/shifts/close") return closeCashierShift(request, env, user);
    if (request.method === "POST" && pathname === "/api/expenses") return createExpense(request, env, user);
    if (request.method === "GET" && pathname === "/api/customers") {
      const customers = await env.DB.prepare(
        "SELECT id, name, phone, email FROM customers WHERE company_id = ? ORDER BY name COLLATE NOCASE LIMIT 500",
      ).bind(user.company_id).all();
      return json(customers.results);
    }
    if (request.method === "POST" && pathname === "/api/customers") return createCustomer(request, env, user);
    if (request.method === "GET" && pathname === "/api/suppliers") return listSuppliers(env, user);
    if (request.method === "POST" && pathname === "/api/suppliers") return createSupplier(request, env, user);
    if (request.method === "GET" && pathname === "/api/purchases/receipts") return listPurchaseReceipts(env, user);
    if (request.method === "POST" && pathname === "/api/purchases/receipts") return createPurchaseReceipt(request, env, user);
    if (request.method === "POST" && pathname === "/api/products") return createProduct(request, env, user);
    if (request.method === "POST" && pathname === "/api/sales") return createSale(request, env, user);
    if (request.method === "GET" && pathname === "/api/reports") {
      if (user.role !== "owner" && user.role !== "manager") {
        return errorResponse("You do not have permission to view reports.", 403);
      }
      return dashboard(request, env, user);
    }
    if (request.method === "GET" && pathname === "/api/dashboard") return dashboard(request, env, user);
    return errorResponse("API endpoint not found.", 404);
  }

  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        message: "Unhandled request failure",
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : "unknown",
      }));
      return errorResponse("The request could not be completed.", 500);
    }
  },
} satisfies ExportedHandler<Env>;
