# POS and Customer Requirements

## POS workspace

Provide a high-speed workspace with product search, barcode scanner input,
categories, product cards or a compact list, a shopping cart, quantity controls,
discounts, customer selection, payment summary, and checkout.

## Checkout

Support quick checkout, barcode scanning, product search, multiple items,
quantity changes, item removal, item and order discounts, tax calculation,
customer selection, cash payment, bank transfer, mobile payment, card payment,
credit sales, and split payments.

Configurable payment options include Cash, Bank Transfer, Mobile Wallet, Card,
Credit, and custom methods. Myanmar methods such as KBZPay, WavePay, and AYA Pay
may be configured as payment choices. Do not claim provider integration without
configured provider APIs and credentials.

## Receipts and invoices

Generate printed and PDF receipts, downloadable invoices, and email invoices
when configured. Include business details, invoice number, items, quantities,
prices, discounts, taxes, payment details, and total.

## Returns and refunds

Support full and partial returns, refunds, exchanges, reasons, and an original
sale reference. Restock returned goods only under the configured return policy,
and record all inventory and accounting effects.

## Cashier shifts

1. Open a shift and record opening cash.
2. Process transactions.
3. Record cash-in and cash-out.
4. Close the shift and count physical cash.
5. Calculate expected cash and record the variance.
6. Submit a shift report.

Support multiple cashiers and terminals.

## Offline POS

- Cache an authorized product catalog.
- Store pending transactions locally while disconnected.
- Track queued, syncing, synchronized, and failed states.
- Deduplicate submissions and detect conflicts.
- Preserve financial and inventory consistency during synchronization.
- Mark a transaction synchronized only after explicit server confirmation.

## Customers

Customer fields include customer ID, name, phone, email, address, customer type,
credit limit, payment terms, status, and notes. Support walk-in customers,
purchase history, outstanding balance, customer payments and returns, credit
sales, statements, and customer categories.
