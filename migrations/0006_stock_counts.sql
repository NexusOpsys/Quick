PRAGMA foreign_keys = ON;

CREATE TABLE stock_counts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status = 'posted'),
  created_at TEXT NOT NULL
);
CREATE INDEX stock_counts_warehouse_created
  ON stock_counts(warehouse_id, created_at);

CREATE TABLE stock_count_lines (
  id TEXT PRIMARY KEY,
  stock_count_id TEXT NOT NULL REFERENCES stock_counts(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  expected_quantity INTEGER NOT NULL CHECK (expected_quantity >= 0),
  counted_quantity INTEGER NOT NULL CHECK (counted_quantity >= 0),
  quantity_delta INTEGER NOT NULL,
  UNIQUE (stock_count_id, product_id),
  CHECK (quantity_delta = counted_quantity - expected_quantity)
);
CREATE INDEX stock_count_lines_product ON stock_count_lines(product_id);

CREATE TRIGGER stock_count_line_validate
BEFORE INSERT ON stock_count_lines
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM stock_counts c
      JOIN products p ON p.id = NEW.product_id
      JOIN stock_balances b ON b.product_id = p.id AND b.warehouse_id = c.warehouse_id
      WHERE c.id = NEW.stock_count_id
        AND c.status = 'posted'
        AND p.company_id = c.company_id
        AND p.active = 1
        AND p.is_stocked = 1
        AND b.quantity = NEW.expected_quantity
    )
    THEN RAISE(ABORT, 'stock_count_balance_changed')
  END;
END;

DROP TRIGGER stock_adjustment_validate;
DROP TRIGGER stock_adjustment_apply;

CREATE TRIGGER stock_movement_inventory_validate
BEFORE INSERT ON stock_movements
WHEN NEW.movement_type IN ('adjustment', 'stock_count')
BEGIN
  SELECT CASE
    WHEN NEW.new_quantity != NEW.previous_quantity + NEW.quantity_delta
      OR NEW.new_quantity < 0
      OR (NEW.movement_type = 'adjustment' AND NEW.quantity_delta = 0)
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
WHEN NEW.movement_type IN ('adjustment', 'stock_count')
BEGIN
  UPDATE stock_balances
  SET quantity = NEW.new_quantity,
      updated_at = NEW.created_at
  WHERE warehouse_id = NEW.warehouse_id
    AND product_id = NEW.product_id;
END;
