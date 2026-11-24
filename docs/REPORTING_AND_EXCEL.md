# Reporting and Excel Requirements

## Current operational coverage

Owners and managers can view a role-scoped dashboard report for the last 7, 30,
or 90 days. The page shows sales totals, daily trend, category revenue, and
inventory summary, and exports those same-period aggregates to CSV. Currency
amounts in the CSV use integer minor units to avoid rounding.

The configurable report builder, raw transactional exports, XLSX import/export,
saved templates, scheduling, and export history described below are not yet
implemented.

## Reporting engine

Provide a customizable reporting engine for Sales, Sale Items, Inventory, Stock
Movements, Purchases, Purchase Items, Suppliers, Customers, Expenses, Payments,
Cash and Bank, Accounts Receivable, Accounts Payable, Accounting Ledger,
Employees, and Branches.

## Report builder

Users can select a data source; add, remove, reorder, rename, search, resize,
hide/show, and pin columns; and restore defaults. Removing a report column never
deletes business data.

### Filters

Support date range, branch, warehouse, product, category, supplier, customer,
employee, cashier, payment method, transaction status, and amount range. Operators:

- Equals and not equals
- Contains
- Greater than and less than
- Between
- Is empty and is not empty
- In list

Support AND/OR combinations where appropriate.

### Sorting, grouping, and calculations

Support ascending/descending multi-field sorting. Group by date, month, year,
branch, warehouse, category, product, supplier, or customer. Aggregate with
SUM, AVG, COUNT, MIN, and MAX, including subtotals and grand totals.

Provide safe calculated columns for formulas such as gross profit, profit margin,
outstanding balance, and remaining stock. Validate expressions and never execute
arbitrary user-provided JavaScript or SQL.

## Preview and templates

Preview actual authorized filtered data with pagination, sorting, configured
columns, totals, grouping, formatting, and validation warnings. Preview and
export use identical reporting logic.

Templates may be personal, shared, or system-owned. Support create, edit,
duplicate, rename, share, delete, import, and export configuration. Persist data
source, columns, order, filters, grouping, calculations, formatting, and export
preferences.

## XLSX exports

Generate genuine `.xlsx` workbooks:

1. Management reports with company information, title, period, generated date,
   KPI summaries, formatted tables, subtotals, totals, and appropriate charts.
2. Raw-data exports with clean typed rows, filterable headers, and no unnecessary
   merged cells.
3. Multi-sheet workbooks with only the worksheets selected by the user, such as
   Executive Summary, Sales Summary and Details, Product Performance, Inventory,
   Stock Movements, Purchases, Expenses, P&L, Cash Flow, Receivables, and Payables.

Allow configuration of company logo, sheet and column names, widths, date and
currency formats, decimal precision, number formats, header styling, freeze
panes, filters, conditional formatting, charts, and summary rows.

## Excel imports

The user selects a worksheet, maps columns, previews rows, validates data,
detects duplicates, sees an import summary, and explicitly confirms before
records are changed. Never import an uploaded workbook directly without
validation.

## Export history and scheduled/large exports

Track report name, user, date, filters, row count, file size, status, and download
reference. Schedule daily, weekly, monthly, or custom reports, and deliver only
to authorized recipients.

Use background jobs for large exports. Support progress, retry, cancellation
where feasible, temporary-file cleanup, and authorized secure downloads.
