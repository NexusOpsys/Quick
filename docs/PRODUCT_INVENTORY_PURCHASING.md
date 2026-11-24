# Product, Inventory, and Purchasing Requirements

## Current operational coverage

The current application supports a searchable product list, product creation
and metadata updates for owners/managers, opening stock, reorder levels,
physical counts, and reasoned inventory adjustments. Stock is not silently
changed by editing product details.

Supplier records currently capture code, name, contact, phone, email, address,
tax number, payment terms, and notes. Owners/managers can post a goods receipt
against an active supplier and stocked product. Receipt references are unique
per company; receipt lines, unit costs, inventory movements, stock-balance
updates, and audit history are saved atomically. The current screen posts one
product per receipt, while the API accepts multiple distinct product lines.

Purchase orders and approvals, supplier invoices/payments, returns, transfers,
valuation/cost layers, barcode/variant management, and richer supplier
transaction history remain unimplemented. A recorded receipt is not a purchase
order or a posted supplier liability.

## Product catalog

Product fields include product ID, SKU, barcode, name, description, category,
brand, unit, purchase cost, selling price, wholesale price, retail price, tax
configuration, image, supplier, status, expiry tracking, batch tracking, and
serial-number tracking.

Support simple products, variants, multiple units, bundles, composite products
where applicable, service items, and non-stock items.

### Categories, brands, units

- Create categories and nested subcategories.
- Create brands and measurement units.
- Configure unit conversions, for example 1 carton = 12 pieces.
- Apply unit conversions consistently in POS, purchasing, and stock calculations.

### Barcodes and pricing

- Generate, scan, and search barcodes; support multiple barcodes per product.
- Print barcode labels.
- Support standard, wholesale, retail, branch-specific, customer-specific, and
  promotional pricing.
- Keep price history.

## Inventory

### Stock overview

Show product, SKU, category, warehouse, physical quantity, reserved quantity,
available quantity, unit cost, stock value, reorder level, and stock status.

### Supported operations

- Stock in and stock out
- Adjustments with a required reason
- Transfers and transfer receiving
- Reservations and releases
- Physical stock counts
- Damaged and expired goods
- Supplier and customer returns

Every movement records the product, quantity, type, source and destination
warehouse, reference document, reason, actor, date, previous balance, and new
balance. No stock change may happen silently.

### Transfers

1. Create a transfer and choose source and destination warehouses.
2. Add products and quantities.
3. Submit and obtain approval where required.
4. Dispatch stock.
5. Receive all or part of the transfer.
6. Complete the transfer after quantities are reconciled.

### Valuation and alerts

Support FIFO and weighted-average costing, configurable by company policy.
Valuation derives from actual inventory records; missing costs are never
invented. Alert on low stock, out of stock, overstock, expiring goods, attempted
negative stock, and unusual adjustments.

### Counts

Compare physical counts with system stock, generate adjustment proposals, and
require suitable authorization before posting.

## Procurement

### Suppliers

Supplier records include name, code, contact person, phone, email, address,
tax information, payment terms, credit limit, notes, status, and transaction
history. Compare historical purchase prices between suppliers.

### Purchase requests and orders

Employees can request products; managers can approve or reject requests.
Purchase orders contain PO number, supplier, order date, expected delivery,
warehouse, item quantities and unit costs, discounts, taxes, total, and status.

Order workflow:

`Draft → Submitted → Approved → Sent → Partially Received → Received → Closed`

### Goods receiving and invoices

Support full and partial receiving; record damaged quantity, missing quantity,
incorrect products, and receiving notes. Inventory increases only by the
quantity actually received.

Supplier invoices record invoice number, supplier, purchase order, invoice and
due dates, total and tax, paid amount, and outstanding amount.

Supplier returns record return reasons and associated stock adjustments.
