# Database Design

## Design Rules

- Use Cloudflare D1/SQLite-compatible SQL.
- Add tenant IDs to every tenant-owned record.
- Enforce foreign keys and explicit unique constraints.
- Store monetary values as integer minor units or exact decimal-safe types.
- Store timestamps in UTC ISO 8601 format.
- Do not silently delete posted financial or completed business records.
- Every stock change links to an inventory movement.
- Every completed POS sale is traceable to branch and terminal.
- Use idempotency keys for API mutations that may be retried.

## Core Tables

### Organization and structure

- organizations
- companies
- branches
- warehouses
- terminals

### Authentication and permissions

- users
- roles
- permissions
- user_roles
- role_permissions
- user_sessions
- password_reset_tokens
- two_factor_credentials

### Products and catalog

- products
- product_variants
- categories
- brands
- units
- barcodes
- price_lists
- price_list_items
- product_price_history

### Inventory

- stock_balances
- stock_movements
- stock_adjustments
- stock_transfers
- stock_transfer_items
- stock_counts
- stock_count_items
- stock_reservations
- inventory_cost_layers

### Purchasing

- suppliers
- purchase_requests
- purchase_request_items
- purchase_orders
- purchase_order_items
- goods_receipts
- goods_receipt_items
- supplier_invoices
- supplier_return_requests
- supplier_return_items

### POS and customers

- customers
- sales
- sale_items
- payments
- payment_allocations
- refunds
- refund_items
- cashier_shifts
- cash_movements
- receipts

### Finance and accounting

- accounts
- account_periods
- journal_entries
- journal_entry_lines
- expenses
- expense_categories
- bank_accounts
- bank_transactions
- bank_reconciliations
- budgets
- budget_items
- financial_periods

### Reporting and administration

- report_definitions
- report_templates
- report_columns
- report_filters
- report_calculated_fields
- report_export_jobs
- report_export_history
- report_schedules
- approval_requests
- approval_actions
- notifications
- audit_logs
- documents
- system_settings

## Recommended Sale Tables

```sql
sales (
  id text primary key,
  organization_id text not null,
  company_id text not null,
  branch_id text not null,
  terminal_id text,
  customer_id text,
  cashier_user_id text not null,
  shift_id text,
  invoice_number text not null,
  status text not null,
  subtotal_minor integer not null,
  discount_minor integer not null,
  tax_minor integer not null,
  total_minor integer not null,
  idempotency_key text not null,
  created_at text not null,
  unique(company_id, invoice_number),
  unique(company_id, idempotency_key)
);

sale_items (
  id text primary key,
  sale_id text not null,
  product_id text not null,
  variant_id text,
  quantity text not null,
  unit_price_minor integer not null,
  discount_minor integer not null,
  tax_minor integer not null,
  line_total_minor integer not null
);
```

## Integrity Constraints

- Sale totals equal the sum of line totals plus or minus documented discounts.
- Payment allocations cannot exceed the sale or allocated transaction.
- Posted journal entry debit and credit totals must balance.
- Inventory must not become negative unless a company policy explicitly allows it.
- Purchase receiving records only actual quantities received.
- A refund must reference the original sale.
- Posted accounting records are reversed or adjusted, not silently deleted.
- Sales and stock changes execute in one database transaction.
