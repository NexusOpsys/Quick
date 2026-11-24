PRAGMA foreign_keys = ON;

CREATE TABLE cashier_shifts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  cashier_user_id TEXT NOT NULL REFERENCES users(id),
  opening_cash_minor INTEGER NOT NULL CHECK (opening_cash_minor >= 0),
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  expected_cash_minor INTEGER CHECK (expected_cash_minor >= 0),
  counted_cash_minor INTEGER CHECK (counted_cash_minor >= 0),
  variance_minor INTEGER,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  CHECK (
    (status = 'open' AND closed_at IS NULL AND expected_cash_minor IS NULL
      AND counted_cash_minor IS NULL AND variance_minor IS NULL)
    OR
    (status = 'closed' AND closed_at IS NOT NULL AND expected_cash_minor IS NOT NULL
      AND counted_cash_minor IS NOT NULL AND variance_minor IS NOT NULL)
  )
);
CREATE UNIQUE INDEX cashier_shifts_one_open_per_cashier
  ON cashier_shifts(cashier_user_id) WHERE status = 'open';
CREATE INDEX cashier_shifts_company_branch_opened
  ON cashier_shifts(company_id, branch_id, opened_at);

CREATE TABLE shift_cash_movements (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL REFERENCES cashier_shifts(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('cash_in', 'cash_out')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX shift_cash_movements_shift_created
  ON shift_cash_movements(shift_id, created_at);

ALTER TABLE payments ADD COLUMN shift_id TEXT REFERENCES cashier_shifts(id);
CREATE INDEX payments_shift_id ON payments(shift_id);

CREATE TRIGGER shift_cash_movement_validate
BEFORE INSERT ON shift_cash_movements
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM cashier_shifts sh
      WHERE sh.id = NEW.shift_id
        AND sh.status = 'open'
        AND sh.company_id = NEW.company_id
        AND sh.branch_id = NEW.branch_id
        AND sh.cashier_user_id = NEW.created_by
    )
    THEN RAISE(ABORT, 'invalid_cashier_shift')
  END;
  SELECT CASE
    WHEN NEW.movement_type = 'cash_out' AND NEW.amount_minor > (
      SELECT sh.opening_cash_minor
        + COALESCE((SELECT SUM(p.amount_minor) FROM payments p
          WHERE p.shift_id = sh.id AND lower(p.method) = 'cash'), 0)
        + COALESCE((SELECT SUM(m.amount_minor) FROM shift_cash_movements m
          WHERE m.shift_id = sh.id AND m.movement_type = 'cash_in'), 0)
        - COALESCE((SELECT SUM(m.amount_minor) FROM shift_cash_movements m
          WHERE m.shift_id = sh.id AND m.movement_type = 'cash_out'), 0)
      FROM cashier_shifts sh WHERE sh.id = NEW.shift_id
    )
    THEN RAISE(ABORT, 'insufficient_shift_cash')
  END;
END;

CREATE TRIGGER payments_validate_cashier_shift
BEFORE INSERT ON payments
WHEN NEW.shift_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM cashier_shifts sh
      JOIN sales s ON s.id = NEW.sale_id
      WHERE sh.id = NEW.shift_id
        AND sh.status = 'open'
        AND sh.company_id = s.company_id
        AND sh.cashier_user_id = s.cashier_user_id
    )
    THEN RAISE(ABORT, 'invalid_cashier_shift')
  END;
END;

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  category TEXT NOT NULL,
  memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX expenses_company_created ON expenses(company_id, created_at);
CREATE INDEX expenses_company_category ON expenses(company_id, category);

CREATE TRIGGER stock_adjustment_validate
BEFORE INSERT ON stock_movements
WHEN NEW.movement_type = 'adjustment'
BEGIN
  SELECT CASE
    WHEN NEW.quantity_delta = 0
      OR NEW.new_quantity != NEW.previous_quantity + NEW.quantity_delta
      OR NEW.new_quantity < 0
    THEN RAISE(ABORT, 'invalid_stock_adjustment')
  END;
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM stock_balances b
      JOIN products p ON p.id = b.product_id
      JOIN warehouses w ON w.id = b.warehouse_id
      WHERE b.warehouse_id = NEW.warehouse_id
        AND b.product_id = NEW.product_id
        AND b.quantity = NEW.previous_quantity
        AND p.company_id = NEW.company_id
        AND p.active = 1
        AND p.is_stocked = 1
        AND w.branch_id = NEW.branch_id
    )
    THEN RAISE(ABORT, 'stock_balance_changed')
  END;
END;

CREATE TRIGGER stock_adjustment_apply
AFTER INSERT ON stock_movements
WHEN NEW.movement_type = 'adjustment'
BEGIN
  UPDATE stock_balances
  SET quantity = NEW.new_quantity,
      updated_at = NEW.created_at
  WHERE warehouse_id = NEW.warehouse_id
    AND product_id = NEW.product_id;
END;
