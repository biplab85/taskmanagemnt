# Invoice System – Implementation Task Plan

## Phase 1: Database & Backend Foundation (Migrations)

| # | Task | Details | Status |
|---|------|---------|--------|
| 1 | Create migration: `invoices` table | `id`, `invoice_number` (auto-generated with prefix), `client_id` (FK), `invoice_date`, `due_date`, `status` (draft/sent/paid/unpaid/overdue/cancelled), `subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `notes`, `created_by` (FK to users), timestamps | ✅ |
| 2 | Create migration: `invoice_items` table | `id`, `invoice_id` (FK), `name`, `description`, `quantity`, `rate`, `tax`, `discount`, `subtotal`, timestamps | ✅ |
| 3 | Create migration: `clients` table | `id`, `name`, `company_name`, `email`, `phone`, `address`, `created_by` (FK), timestamps | ✅ |
| 4 | Create migration: `payments` table | `id`, `invoice_id` (FK), `payment_method` (cash/bank_transfer/mobile_banking), `payment_date`, `transaction_id`, `amount`, `status` (pending/paid/failed/refunded), timestamps | ✅ |
| 5 | Create migration: `invoice_settings` table | `id`, `company_name`, `company_logo`, `currency`, `tax_percentage`, `invoice_prefix`, `footer_note`, timestamps | ✅ |

---

## Phase 2: Laravel Models & Relationships

| # | Task | Details | Status |
|---|------|---------|--------|
| 6 | Create `Invoice` model | Relationships: `hasMany(InvoiceItem)`, `belongsTo(Client)`, `hasMany(Payment)`, `belongsTo(User, 'created_by')`. Auto-generate invoice number on create. | ✅ |
| 7 | Create `InvoiceItem` model | Relationship: `belongsTo(Invoice)`. Accessor for subtotal calculation (`quantity × rate + tax - discount`). | ✅ |
| 8 | Create `Client` model | Relationships: `hasMany(Invoice)`, `belongsTo(User, 'created_by')` | ✅ |
| 9 | Create `Payment` model | Relationship: `belongsTo(Invoice)` | ✅ |
| 10 | Create `InvoiceSetting` model | Singleton pattern — one settings row for the org | ✅ |

---

## Phase 3: API Controllers, Routes & Validation

| # | Task | Details | Status |
|---|------|---------|--------|
| 11 | Create `ClientController` | CRUD endpoints: `index`, `store`, `show`, `update`, `destroy`, plus `invoiceHistory($clientId)` | ✅ |
| 12 | Create `InvoiceController` | CRUD + status management: `index` (with filters), `store`, `show`, `update`, `destroy`, `updateStatus`, `duplicate` | ✅ |
| 13 | Create `PaymentController` | `index`, `store`, `show`, `update` — linked to invoices, auto-update invoice status to "paid" when fully paid | ✅ |
| 14 | Create `InvoiceReportController` | Dashboard stats: total/paid/unpaid/overdue counts, monthly & yearly revenue aggregations | ✅ |
| 15 | Create `InvoiceSettingController` | `show` and `update` — single settings resource | ✅ |
| 16 | Create `InvoicePdfController` | Generate & download PDF using a Blade template (via `barryvdh/laravel-dompdf`) | ✅ |
| 17 | Register API routes | Group under `api/invoices`, `api/clients`, `api/payments`, `api/invoice-settings`, `api/invoice-reports` with auth middleware | ✅ |
| 18 | Create form request validation classes | `StoreInvoiceRequest`, `StoreClientRequest`, `StorePaymentRequest`, `StoreInvoiceSettingRequest` | ✅ |

---

## Phase 4: Frontend – Pages & Components

| # | Task | Details | Status |
|---|------|---------|--------|
| 19 | Add Invoice routes in Next.js | `/invoice/dashboard`, `/invoice/list`, `/invoice/create`, `/invoice/[id]`, `/invoice/clients`, `/invoice/payments`, `/invoice/settings` | ✅ |
| 20 | Build Invoice Dashboard page | Stat cards (total, paid, unpaid, overdue), monthly revenue chart, recent invoices table | ✅ |
| 21 | Build Invoice List page | Table with filters (status, date range, client), search, pagination, bulk actions | ✅ |
| 22 | Build Create/Edit Invoice page | Client selector, date pickers, dynamic item rows (add/remove), live total calculation, tax & discount fields, save as draft or send | ✅ |
| 23 | Build Invoice Detail page | Full invoice view with items table, payment history, status badge, action buttons (send, mark paid, download PDF, print, cancel) | ✅ |
| 24 | Build Client List page | CRUD table with search, click to view client profile & invoice history | ✅ |
| 25 | Build Payment History page | Filterable table showing all payments across invoices | ✅ |
| 26 | Build Invoice Settings page | Form for company info, logo upload, currency, tax %, prefix, footer note | ✅ |

---

## Phase 5: PDF Generation & Print

| # | Task | Details | Status |
|---|------|---------|--------|
| 27 | Install `barryvdh/laravel-dompdf` | Composer install, publish config | ✅ |
| 28 | Create Invoice PDF Blade template | Company logo/address, client details, items table, totals, footer note | ✅ |
| 29 | Frontend PDF download & print | Download button calls API endpoint, print button uses `window.print()` with print-optimized CSS | ✅ |

---

## Phase 6: Notifications & Permissions

| # | Task | Details | Status |
|---|------|---------|--------|
| 30 | Integrate invoice notifications | Use existing notification system — invoice created, payment received, overdue reminder events | ✅ |
| 31 | Implement role-based access | Admin: full access. Users: create & view own invoices only. Apply via existing middleware/permission system | ✅ |

---

## Phase 7: Sidebar & Navigation

| # | Task | Details | Status |
|---|------|---------|--------|
| 32 | Add Invoice section to Sidebar | Invoice icon + sub-links: Dashboard, Invoices, Clients, Payments, Settings | ✅ |

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1 | 5 migrations | Database schema |
| Phase 2 | 5 models | Eloquent models & relationships |
| Phase 3 | 8 tasks | API controllers, routes, validation |
| Phase 4 | 8 pages | Frontend UI (Next.js + shadcn) |
| Phase 5 | 3 tasks | PDF generation & printing |
| Phase 6 | 2 tasks | Notifications & permissions |
| Phase 7 | 1 task | Navigation integration |
| **Total** | **32 tasks** | |

---

## Important Notes
- No changes to existing UI, classes, components, or logic — everything is additive
- Follow existing project conventions (shadcn/ui, Tailwind CSS v4, Axios interceptor for auth)
- Formula: `Total = (Quantity × Rate) + Tax – Discount`
- Invoice number auto-generated with configurable prefix from settings
