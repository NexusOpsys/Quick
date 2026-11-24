# Implementation Roadmap

## Current dashboard and workspace delivery

The role-aware dashboard routes and responsive sidebar are operational. The
sidebar links to business-owner, store-manager, cashier, warehouse, finance,
POS, products, customers, suppliers, purchasing, reports, and settings;
navigation visibility follows role permissions and protected APIs enforce
access server-side.

Products and customers support owner and manager entry; suppliers support
owner and manager directory creation; purchase receipts add stocked goods with
unit costs and audit records atomically. Reports provide role-scoped 7/30/90-day
summaries and CSV export. Business settings are owner-only and audited. These are
operational subsets, not completion of the broader milestones below:
purchase orders, invoices/payables, advanced reporting/XLSX, and broader
settings administration remain open.

## Milestone 1: Foundation

Status: Started

- Next.js application shell
- Responsive role-aware sidebar
- Dashboard and POS interface foundation
- Organization, company, branch, and warehouse architecture
- Authentication middleware and session model
- Role and permission definitions
- D1 migration and seed structure
- Environment and deployment documentation

Exit criteria:

- User can sign in and is restricted to authorized tenant data.
- Tenant and branch scope are enforced.
- Database migrations run successfully.

## Milestone 2: Catalog and Inventory

Status: Started

- Warehouse stock overview dashboard with warehouse-scoped balances, reorder
  states, and recent recorded movements
- Permission-checked stock adjustments with movement and audit records
- Warehouse-scoped physical stock counts with variance history
- Product variants, categories, brands, units, and barcodes
- Price lists and price history
- Stock balances and movement history
- Adjustments with reasons
- Transfers
- Cost layers and valuation
- Low-stock and out-of-stock alerts

Exit criteria:

- Stock movements reconcile to balances.
- Negative stock is blocked or policy-controlled.
- All adjustments are auditable.

## Milestone 3: Purchasing

- Supplier management
- Purchase requests and approvals
- Purchase orders
- Goods receipt notes
- Supplier invoices and supplier returns
- Supplier payment history

Exit criteria:

- Receipt updates stock and supplier liability atomically.
- Received quantities can differ from ordered quantities.
- Purchase and inventory data reconcile.

## Milestone 4: Customers and POS

- Customer profiles and credit accounts
- Barcode and keyboard POS workflow
- Cash, card, bank, mobile, and credit payments
- Split payment support
- Cashier shift opening, cash movements, POS payment linkage, and closing
- Full and partial returns
- Offline POS queue and synchronization

Exit criteria:

- POS submission is idempotent.
- Sale, inventory, payment, and accounting changes commit together.
- Offline sales receive server confirmation before sync status is marked complete.

## Milestone 5: Finance

- Income and expense records
- Owner-entered operating expenses surfaced in finance and owner dashboards
- Bank accounts and transactions
- Accounts receivable and payable
- Reconciliation
- Budgets and financial periods

Exit criteria:

- Transaction allocations reconcile.
- Finance totals match accounting postings.

## Milestone 6: Accounting

- Chart of accounts
- General ledger
- Journal entries
- Profit and loss
- Balance sheet
- Cash flow
- Cost of goods sold

Exit criteria:

- Journal entries balance.
- Posted records cannot be silently deleted.
- Financial statements derive from journal data.

## Milestone 7: Analytics

- Role-specific dashboards
- Branch and category performance
- Top products and slow movers
- Revenue, expense, inventory, and cash trends

Exit criteria:

- Metrics have traceable source transactions.
- Data respects permissions and tenant scope.

## Milestone 8: Reporting and Excel

- Report definition and dynamic fields
- Filters, sorting, grouping, and calculations
- Templates and scheduled exports
- XLSX preview and export
- XLSX import validation
- Export history

Exit criteria:

- Preview and exported data use the same engine.
- Imports are validated before mutation.
- Large exports are queued and traceable.

## Milestone 9: Operations and Administration

- Notifications
- Approval workflows
- Document storage
- Audit logs
- Business settings and localization
- Demo data and automated tests

Exit criteria:

- Sensitive operations have audit trails.
- Approvals preserve actor and decision history.
- Documentation and demo accounts are complete.

## Milestone 10: Hardening and Release

- Security review and tenant-isolation verification
- Performance, caching, and query-index review
- Responsive and accessibility refinement
- Backup, recovery, and retention procedures
- Production Cloudflare configuration and deployment
- End-to-end regression and operational monitoring

Exit criteria:

- Security-sensitive flows have automated coverage.
- Production migrations and deployment have been rehearsed.
- Monitoring and recovery procedures are documented.
- No module is presented as complete until its acceptance criteria pass.

## Final deliverables checklist

- Frontend and Cloudflare Worker backend
- D1 schema, versioned migrations, and consistent seed data
- Authentication, sessions, roles, and permissions
- Product, inventory, purchasing, supplier, and customer workflows
- POS, payments, refunds, and cashier shifts
- Finance, double-entry accounting, and financial statements
- Dashboards, analytics, custom reporting, and XLSX import/export
- Notifications, approvals, documents, audit logs, and settings
- Automated tests and workbook validation
- Environment, migration, Cloudflare deployment, and user documentation
