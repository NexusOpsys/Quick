# Testing and Quality Assurance

## Test Levels

- Unit tests for calculations, permissions, and domain rules
- Integration tests for D1 transactions and API handlers
- End-to-end tests for browser workflows
- Workbook tests for generated XLSX files
- Offline synchronization tests

## Required Financial Tests

- Sale totals equal line totals, discounts, taxes, and payment allocations.
- Split payments add up to the sale total.
- Credit sales create an accounts receivable balance.
- Refunds do not exceed refundable sale and payment quantities.
- Purchase receiving creates the correct payable or supplier liability.
- Journal entries balance by debit and credit totals.
- Profit and loss, balance sheet, and cash flow calculations reconcile.

## Required Inventory Tests

- Completed sales reduce stock and create one movement per stock change.
- Stock transfer changes source and destination atomically.
- Negative stock is blocked or follows explicit company policy.
- Stock adjustment requires a reason.
- Return restores stock with reference to the original sale.
- Inventory valuation matches cost layers and movements.

## Required Security Tests

- Users cannot access another organization.
- Branch restrictions are enforced server-side.
- Deactivated users cannot create sessions.
- Role changes remove old permissions.
- Session revocation prevents reuse.
- Audit events are written for privileged actions.

## Required POS Tests

- Barcode lookup
- Quantity updates
- Item removal
- Item and order discounts
- Tax calculation
- Cash, card, mobile, split, and credit payment
- Duplicate submission prevention
- Offline queue deduplication
- Server-confirmed synchronization

## Workbook Verification

Generated workbooks must be parsed with an XLSX parser. Tests must verify:

- Sheet names
- Headers
- Totals
- Formatting
- Preview/export data parity
- Import validation and rejected row reporting
