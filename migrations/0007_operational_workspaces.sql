PRAGMA foreign_keys = ON;

CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  tax_number TEXT NOT NULL DEFAULT '',
  payment_terms TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (company_id, code)
);
CREATE INDEX suppliers_company_active ON suppliers(company_id, active, name);

CREATE TABLE purchase_receipts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  reference TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE (company_id, reference)
);
CREATE INDEX purchase_receipts_company_created ON purchase_receipts(company_id, created_at);

CREATE TABLE purchase_receipt_lines (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES purchase_receipts(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_minor INTEGER NOT NULL CHECK (unit_cost_minor >= 0),
  line_total_minor INTEGER NOT NULL CHECK (line_total_minor >= 0)
);
CREATE INDEX purchase_receipt_lines_receipt ON purchase_receipt_lines(receipt_id);
CREATE INDEX purchase_receipt_lines_product ON purchase_receipt_lines(product_id);

DROP TRIGGER stock_movement_inventory_validate;
DROP TRIGGER stock_movement_inventory_apply;

CREATE TRIGGER stock_movement_inventory_validate
BEFORE INSERT ON stock_movements
WHEN NEW.movement_type IN ('adjustment', 'stock_count', 'purchase_receipt')
BEGIN
  SELECT CASE
    WHEN NEW.new_quantity != NEW.previous_quantity + NEW.quantity_delta
      OR NEW.new_quantity < 0
      OR (NEW.movement_type IN ('adjustment', 'purchase_receipt') AND NEW.quantity_delta = 0)
      OR (NEW.movement_type = 'purchase_receipt' AND NEW.quantity_delta < 0)
    THEN RAISE(ABORT, 'invalid_inventory_movement')
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

CREATE TRIGGER stock_movement_inventory_apply
AFTER INSERT ON stock_movements
WHEN NEW.movement_type IN ('adjustment', 'stock_count', 'purchase_receipt')
BEGIN
  UPDATE stock_balances
  SET quantity = NEW.new_quantity,
      updated_at = NEW.created_at
  WHERE warehouse_id = NEW.warehouse_id
    AND product_id = NEW.product_id;
END;
