# Dashboard Requirements

## Operational workspace coverage

The application sidebar links directly to the signed-in user's dashboard,
store-manager and cashier views, warehouse, finance, and POS routes. Owners
can inspect each role dashboard. The POS sidebar keeps operational sections
under `/pos/...` so moving between cashier, shifts, inventory, purchasing,
finance, reports, and settings retains the POS navigation and visual context.
Dashboard switches are kept separate from POS section navigation. Restricted
destinations are role-filtered in navigation and protected by server-side
checks. Dashboard charts remain visible on tablet layouts, and dashboard and
workspace content stack on narrow screens.

- Owners and managers can create and edit products. Editing product details
  does not alter stock; opening stock is recorded as an opening movement.
- Owners and managers can create customer records, which are available to
  authenticated POS users.
- Owners and managers can maintain supplier contacts and post goods receipts.
  Receipt lines, inventory movements, stock changes, and audit history are
  saved atomically.
- Owners and managers can view role-scoped 7-, 30-, or 90-day reports and
  export those summaries as CSV. This is not a general report builder or XLSX
  export.
- Only owners can view and update business, regional, receipt, branch, and
  warehouse settings. Changes are audited.

Dashboards are role-aware. Each metric is displayed only when the viewer is
authorized and the underlying data is sufficiently complete and reliable.
Financial metrics must not be fabricated when source transactions or costing
records are missing.

## Implemented access

Dashboard API requests enforce permissions on the server; navigation links are
also hidden when the signed-in role lacks access. The current account roles map
to dashboard permissions as follows:

| Account role | Dashboard access |
| --- | --- |
| Owner | Business owner, finance, inventory, store manager, and cashier |
| Manager | Store manager and inventory |
| Cashier | Cashier |

Finance and inventory are dashboard permissions, not separately assignable
account roles yet. Employee role assignment and permission administration are
not implemented.

## Operational workflows

- Warehouse users with inventory permission can record positive or negative
  stock adjustments with a reason. The balance update, movement record, and
  audit entry are committed together; negative stock and stale balances are
  rejected.
- Warehouse users can post a physical count for a stocked product. The system
  stores the system/count quantities and variance, updates the balance when
  needed, and records the count and audit entry atomically.
- Cashiers open a shift with opening cash, record cash-in/cash-out movements,
  and close with a counted-cash amount. Owners can also operate their own
  shifts for business testing and reconciliation. Cash POS payments are linked
  to the active shift, withdrawals cannot exceed available cash, and cashier
  POS sales are blocked until a cashier shift is open.
- Owners can record operating expenses by amount, category, and note. Entries
  are company-scoped, audited, and included in the owner and finance dashboards
  for the selected date range.

## Business owner

### KPI cards

- Total revenue
- Net sales
- Total expenses
- Gross profit and gross profit margin
- Net profit
- Inventory valuation
- Cash and bank balance
- Accounts receivable and accounts payable

### Charts and activity

- Revenue versus expenses
- Revenue and profit trends
- Sales by branch and category
- Top-selling products
- Expense breakdown
- Inventory value trends
- Recent transactions and activities
- Pending approvals
- Important business alerts

## Finance

- Daily income and expenses
- Cash and bank balances
- Receivables and payables
- Overdue invoices
- Profit and loss
- Cash flow
- Recent financial transactions
- Pending payments

The current implementation records POS payment allocations and operating
expenses. Budgets, cash/bank accounts, reconciliation, receivables/payables,
and ledger statements still have no source workflows and remain unavailable.

## Inventory

- Product count and total stock quantity
- Low- and out-of-stock products
- Recorded stock adjustments and stock movements

Inventory valuation, fast/slow movers, expiry tracking, warehouse transfers,
and purchase trends remain unavailable until their cost, lot, and procurement
workflows exist.

## Store manager

- Daily sales and transaction count
- Average transaction value
- Cashier performance
- Returns and discounts
- Branch stock
- Open/closed shift counts and recorded cash variance

Returns/refunds are not yet available because no return workflow is implemented.

## Cashier

Prioritize opening the current shift, new sale, recent transactions, cash
movements, expected cash, and shift closing/reconciliation actions.

## Data integrity

- Metrics respect organization, branch, and role permissions.
- Managers are restricted to their assigned branch; cashiers see only their
  own branch and sales.
- Dashboard APIs reject roles that do not have the requested permission.
- Inventory adjustments, expenses, and shift actions create audit records.
- Cashier POS payments are associated with an open shift for reconciliation.
- Revenue, expenses, inventory, and profit have traceable source records.
- Gross profit and cost metrics require valid inventory costs.
- Reports and dashboards use consistent definitions and date/timezone rules.
- Clearly distinguish recorded values from derived values when relevant.
