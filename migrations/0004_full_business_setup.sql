PRAGMA foreign_keys = ON;

ALTER TABLE organizations ADD COLUMN registration_number TEXT NOT NULL DEFAULT '';

ALTER TABLE companies ADD COLUMN setup_complete INTEGER NOT NULL DEFAULT 0 CHECK (setup_complete IN (0, 1));
ALTER TABLE companies ADD COLUMN business_type TEXT NOT NULL DEFAULT 'Retail';
ALTER TABLE companies ADD COLUMN registration_number TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN address TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN logo_url TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN financial_year_start TEXT NOT NULL DEFAULT '01-01';
ALTER TABLE companies ADD COLUMN tax_registration_number TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN invoice_prefix TEXT NOT NULL DEFAULT 'INV';
ALTER TABLE companies ADD COLUMN receipt_template TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE companies ADD COLUMN language TEXT NOT NULL DEFAULT 'English';
ALTER TABLE companies ADD COLUMN receipt_settings_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE companies ADD COLUMN reporting_preferences_json TEXT NOT NULL DEFAULT '{}';
