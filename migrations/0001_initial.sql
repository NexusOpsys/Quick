PRAGMA foreign_keys = ON;

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
  timezone TEXT NOT NULL,
  tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  allow_negative_stock INTEGER NOT NULL DEFAULT 0 CHECK (allow_negative_stock IN (0, 1)),
  created_at TEXT NOT NULL
);
CREATE INDEX companies_organization_id ON companies(organization_id);

CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL
);
CREATE INDEX branches_company_id ON branches(company_id);

CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX warehouses_branch_id ON warehouses(branch_id);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (organization_id, email)
);
CREATE INDEX users_company_id ON users(company_id);

CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX user_sessions_expires_at ON user_sessions(expires_at);

CREATE TABLE auth_login_attempts (
  identifier TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  locked_until TEXT
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  tax_rate_bps INTEGER CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  is_stocked INTEGER NOT NULL DEFAULT 1 CHECK (is_stocked IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (company_id, sku)
);
CREATE INDEX products_company_active ON products(company_id, active);

CREATE TABLE stock_balances (
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (warehouse_id, product_id)
);
CREATE INDEX stock_balances_product ON stock_balances(product_id);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX customers_company ON customers(company_id);

CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  cashier_user_id TEXT NOT NULL REFERENCES users(id),
  customer_id TEXT REFERENCES customers(id),
  invoice_number TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
  tax_minor INTEGER NOT NULL CHECK (tax_minor >= 0),
  total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
  status TEXT NOT NULL CHECK (status IN ('completed', 'refunded', 'voided')),
  created_at TEXT NOT NULL,
  UNIQUE (company_id, invoice_number),
  UNIQUE (company_id, idempotency_key)
);
CREATE INDEX sales_company_created ON sales(company_id, created_at);
CREATE INDEX sales_branch_created ON sales(branch_id, created_at);

CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  discount_minor INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  tax_rate_bps INTEGER NOT NULL CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  tax_minor INTEGER NOT NULL CHECK (tax_minor >= 0),
  line_total_minor INTEGER NOT NULL CHECK (line_total_minor >= 0)
);
CREATE INDEX sale_items_sale ON sale_items(sale_id);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  method TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  created_at TEXT NOT NULL
);
CREATE INDEX payments_sale ON payments(sale_id);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX stock_movements_product_date ON stock_movements(product_id, created_at);
CREATE INDEX stock_movements_warehouse_date ON stock_movements(warehouse_id, created_at);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX audit_logs_company_date ON audit_logs(company_id, created_at);

CREATE TABLE system_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  setup_complete INTEGER NOT NULL CHECK (setup_complete IN (0, 1))
);

CREATE TRIGGER sale_item_validate_stock
BEFORE INSERT ON sale_items
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM products p
      JOIN sales s ON s.id = NEW.sale_id
      WHERE p.id = NEW.product_id
        AND p.company_id = s.company_id
        AND p.active = 1
    ) THEN RAISE(ABORT, 'invalid_sale_product')
  END;

  SELECT CASE
    WHEN (SELECT p.is_stocked FROM products p WHERE p.id = NEW.product_id) = 1
      AND NOT EXISTS (
        SELECT 1
        FROM stock_balances b
        JOIN sales s ON s.warehouse_id = b.warehouse_id
        WHERE s.id = NEW.sale_id
          AND b.product_id = NEW.product_id
          AND b.quantity >= NEW.quantity
      )
      AND (SELECT c.allow_negative_stock
           FROM companies c JOIN sales s ON s.company_id = c.id
           WHERE s.id = NEW.sale_id) = 0
    THEN RAISE(ABORT, 'insufficient_stock')
  END;
END;

CREATE TRIGGER sale_item_decrement_stock
AFTER INSERT ON sale_items
WHEN (SELECT is_stocked FROM products WHERE id = NEW.product_id) = 1
BEGIN
  UPDATE stock_balances
  SET quantity = quantity - NEW.quantity,
      updated_at = (SELECT created_at FROM sales WHERE id = NEW.sale_id)
  WHERE warehouse_id = (SELECT warehouse_id FROM sales WHERE id = NEW.sale_id)
    AND product_id = NEW.product_id;

  INSERT INTO stock_movements (
    id, organization_id, company_id, branch_id, warehouse_id, product_id,
    movement_type, quantity_delta, previous_quantity, new_quantity,
    reference_id, reason, created_by, created_at
  )
  SELECT
    lower(hex(randomblob(16))), s.organization_id, s.company_id, s.branch_id,
    s.warehouse_id, NEW.product_id, 'sale', -NEW.quantity,
    b.quantity + NEW.quantity, b.quantity, s.id, 'Point-of-sale checkout',
    s.cashier_user_id, s.created_at
  FROM sales s
  JOIN stock_balances b
    ON b.warehouse_id = s.warehouse_id AND b.product_id = NEW.product_id
  WHERE s.id = NEW.sale_id;
END;
