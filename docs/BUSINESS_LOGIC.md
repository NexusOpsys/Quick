# Business Logic

## Tenant and Authorization

Every mutation identifies the organization and, where applicable, company,
branch, warehouse, terminal, and user. A user may act only in tenants and
branches assigned to their roles.

## Currency

Each company has a configured currency, timezone, tax settings, invoice format,
and financial year. Currency behavior must not be assumed in shared code.
Monetary calculations store minor units and use exact decimal-safe operations.

## Products

A product belongs to a company and may have variants, barcodes, categories,
units, price lists, and price history. Variant, batch, or serialized inventory
behavior must be implemented consistently when enabled.

## Inventory

Every stock change creates a stock movement containing the tenant, branch,
warehouse, product or variant, quantity, movement type, source transaction,
actor, timestamp, and reason where required.

Stock adjustments require a reason. Transfers reduce the source and increase
the destination in one transaction. The inventory engine prevents negative
stock unless the company has explicitly enabled overselling.

## Purchasing

Purchase requests may require approval. Purchase orders contain ordered quantities,
prices, taxes, discounts, and supplier terms. Goods receipt updates actual
received quantities and inventory in a database transaction.

Supplier invoices create or update accounts payable. Supplier returns reference
the original receipt or invoice and restore or offset inventory appropriately.

## POS

A POS sale contains branch, terminal, cashier, optional customer, optional shift,
line items, discounts, taxes, payments, and an idempotency key. Completed sales:

1. Validate current branch permissions and product availability.
2. Calculate subtotal, item discounts, order discount, taxes, and total.
3. Allocate payments.
4. Update stock and create stock movements.
5. Create receivable or payment records.
6. Post balanced accounting entries.
7. Store the completed sale and receipt.

All steps execute atomically. A retried request with the same idempotency key
returns the same result.

## Returns and Refunds

Full or partial returns must reference the original sale and line item.
Refund methods must match valid payment or credit allocation rules. Restocking
is configurable but must create stock movements. Refunded payments and inventory
restoration must reconcile to accounting reversals.

## Cashier Shifts

Opening a shift records opening cash and terminal. Transactions associate with
the active shift. Closing records counted physical cash, computes expected cash,
records variance, and produces a shift report. Closing requires authorization
when configured.

## Finance

Payments reference valid sales or supplier transactions. Receivables and payables
are allocated using documented payments. Expenses require category and optional
approval. Cash and bank balances derive from authorized transactions and
reconciliations.

## Accounting

Every posted journal entry has debit and credit lines that balance. Posted
records are reversed or adjusted rather than deleted. Financial statements derive
from posted journal entries, account periods, and approved financial periods.

## Reports

Only authorized tenant and branch data is available. Report previews and exports
use the same data source, filters, grouping, sorting, calculated columns, and
formatting rules. Totals and calculated fields are independently validated.

## Auditability

Important operations record actor, tenant, branch, action, entity, before/after
values, timestamp, and correlation ID where available. Audit records are append-only.
