# Business Structure and Access Requirements

## Scope

This document covers the business profile, multi-tenant hierarchy, employee
management, authentication, and authorization requirements.

## Business hierarchy

```text
Organization
└── Company
    ├── Branches
    │   ├── Warehouses
    │   ├── POS terminals
    │   └── Employees
    ├── Products
    ├── Customers
    ├── Suppliers
    ├── Inventory
    ├── Sales
    └── Financial records
```

The system supports multiple organizations, companies, branches, warehouses,
terminals, and employees. Organization-wide reporting is allowed only for users
with the corresponding permission. Optional modules can be enabled per business
so smaller businesses are not required to use every workflow.

## Business profile

Each company can configure:

- Business name, logo, registration information, and business type
- Address, phone, and email
- Currency and timezone
- Financial year and accounting periods
- Tax settings and language
- Invoice numbering and receipt settings
- Reporting preferences

Supported business types are Retail, Wholesale, Distribution, Supermarket,
Convenience Store, and Other. Business type may influence which optional
workflows are enabled. Default currency and timezone are company settings, not
application-wide calculation assumptions.

## Tenant and branch isolation

- Every tenant-owned record belongs to an authorized organization/company.
- Branch and warehouse operations retain their branch and warehouse references.
- Users cannot access another organization's records without explicit
  authorization.
- Organization-wide visibility is permission-controlled.
- Every protected API operation validates tenant and branch scope on the server.
- Frontend navigation visibility is not an authorization boundary.

## Authentication and account management

Required account capabilities:

- Create and edit employee accounts and profiles
- Activate and deactivate accounts
- Reset passwords
- Assign roles, branches, and warehouses
- View account activity
- Manage and revoke sessions
- Track account status and authentication history
- Optional two-factor authentication

Use secure password hashing and a Cloudflare-compatible secure session or JWT
architecture. Support refresh/session management, password reset, and session
revocation. A disabled account must not retain active access.

## Roles

Provide these starting roles, with configurable permissions:

1. Super Administrator
2. Organization Owner
3. Business Owner
4. General Manager
5. Finance Manager
6. Accountant
7. Inventory Manager
8. Procurement Officer
9. Store Manager
10. Cashier
11. Auditor
12. Employee

Authorized administrators may create custom roles.

## Permission dimensions

Permissions must support:

- Module-level and action-level access
- Branch- and warehouse-level restrictions
- Financial data restrictions
- Export permissions
- Approval limits

Examples include viewing, creating, refunding, and discounting sales; viewing
and editing product costs; adjusting stock; approving purchases and expenses;
viewing statements; exporting financial reports; managing employees and
branches; and viewing audit logs.

Approval thresholds must be checked server-side. Permission changes and role
assignments are auditable.
