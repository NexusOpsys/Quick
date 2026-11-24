# Operations and Administration Requirements

The current settings page is owner-only and updates the existing company,
branch, and warehouse profile fields, including currency, tax, invoice prefix,
receipt template, fiscal-year start, and language. These changes are audited.
User/permission administration, approval rules, notifications, payment-method
configuration, and accounting-period controls remain unavailable.

## Notifications

Provide an internal notification center for:

- Low/out-of-stock items
- New purchase requests and purchase approvals
- Expense approvals
- Overdue invoices and supplier payments due
- Stock adjustments
- Cashier shift differences
- Completed scheduled reports
- Failed exports

## Approval workflows

Make approval rules configurable. Examples include purchase orders above an
amount threshold, expenses above a threshold, large discounts, stock
adjustments, and refunds above a threshold. Preserve approval history, actors,
decisions, timestamps, and reasons.

## Documents

Support attachments for supplier invoices, purchase orders, expense receipts,
customer invoices, payment proofs, stock adjustment evidence, and financial
documents. Store files securely in Cloudflare R2 and use authorized access with
temporary signed download links where supported.

## Audit logs

Audit important operations, including login, user creation, permission changes,
product and price changes, adjustments and transfers, purchase approvals,
refunds, expenses, financial transactions, journal postings, exports, imports,
and configuration changes.

Each record should include user, action, module, entity and entity ID, date,
previous and new values, reason, and IP/device context where appropriate.
Protect logs from ordinary user modification and provide understandable
descriptions for business managers.

## System settings and localization

Support company, branch, and warehouse profiles; currency and tax; payment
methods; invoice numbering; receipt templates; fiscal year and accounting
periods; inventory costing; approvals; notifications; and permissions.

Localization must support English, Myanmar-language readiness, Unicode Myanmar
text, configurable timezone, MMK, optional additional currencies, and
configurable date formats.
