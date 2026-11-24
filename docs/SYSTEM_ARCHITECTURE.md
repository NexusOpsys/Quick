# System Architecture

## Architecture Overview

Quick uses a Next.js frontend on Cloudflare Pages and Cloudflare Workers for
domain APIs. Cloudflare D1 provides relational persistence. R2 stores documents
and uploaded files. Queues process exports and scheduled reports. Durable Objects
are used only where serial coordination is required.

```text
Browser / POS client
        |
        v
Next.js UI + API client
        |
        v
Cloudflare Worker API
        |
        +--> D1 relational database
        +--> R2 document storage
        +--> Queues for exports and reports
        +--> Durable Objects for serial workflows
```

## Frontend

- Next.js App Router
- React and strict TypeScript
- Tailwind-compatible utility approach or CSS modules
- Accessible reusable components
- Framer Motion for restrained interface transitions
- Responsive collapsed sidebar, mobile drawer, and data-dense tables
- Keyboard-accessible POS workflows

## Backend

Recommended Cloudflare runtime structure:

```text
src/
  worker/
    index.ts
    middleware/
    handlers/
  domain/
    inventory/
    sales/
    purchasing/
    finance/
    accounting/
    reporting/
  repositories/
  schemas/
  services/
  test/
```

Domain rules must not live in React components or route handlers. Handlers
validate requests and call domain services. Repositories own D1 access.

## Authentication and Security

- Secure HTTP-only session cookie or short-lived signed access token
- Argon2id, PBKDF2, or a supported equivalent for password hashing
- Refresh/session records with server-side revocation
- Password reset tokens with expiration
- Optional two-factor authentication
- Role and permission checks in every protected handler
- Organization, company, branch, and user scope enforcement
- CSRF protection for cookie-authenticated mutations
- Structured audit events for sensitive operations

## Multi-Tenant Model

```text
Organization
  Company
    Branch
      Warehouse
      POS terminal
      Employee
    Product catalog
    Inventory
    Sales
    Financial records
```

Tenant-owned rows must carry an organization or company identifier. Branch data
must also carry a branch identifier where applicable. Authorization is enforced
for both tenant ownership and operational branch scope.

## Core Transactions

| Workflow | Required atomic effects |
|---|---|
| Completed sale | Sale, items, payments, inventory movements, journal entries |
| Purchase receipt | Received quantities, inventory cost layers, supplier payable |
| Stock adjustment | Movement, reason, approval when required |
| Stock transfer | Source reduction and destination increase |
| Sale refund | Original-sale reference, restored stock, reversed payment/posting |
| Expense | Expense record and balanced journal posting |
| Cash movement | Shift cash movement and accounting transaction |

## Offline POS

The browser caches the product catalog and queues sales while disconnected.
Each queued sale has a locally generated idempotency key and synchronization
state. The server validates, deduplicates, and returns a confirmed result. A
sale is not shown as synchronized until server confirmation is received.
Conflicts must be reported rather than silently overwritten.

## Observability

- Correlation IDs on requests
- Structured JSON logs
- Request duration and failure metrics
- Queue/export job tracing
- Audit logs for business mutations
- Safe error responses that do not expose secrets or tenant data
