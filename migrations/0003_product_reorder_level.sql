ALTER TABLE products
ADD COLUMN reorder_level INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0);
