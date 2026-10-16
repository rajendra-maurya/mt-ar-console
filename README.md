# Accounts Receivable Insights Console

## 1. Project Overview

The Accounts Receivable Insights Console is a web application designed to help finance and collections teams monitor invoices, identify overdue payments, investigate disputes, and manage collection workflows from a consolidated dashboard.

The application uses the supplied accounts receivable dataset and provides invoice search, filtering, sorting, pagination, dashboard KPIs, aging analysis, settlement trends, customer exposure analysis, and billing-type insights.

### Key Features

- **Dashboard and analytics:** Total invoiced amount, outstanding and overdue amounts, dispute rate, aging buckets, settlement trends, customer exposure, and billing insights.
- **Invoice workspace:** Searchable, sortable, filterable, and paginated invoice table.
- **Invoice details and workflow:** View invoice history and update supported workflow fields.
- **Role-based access:** Different permissions for Analysts, Leads, Controllers, and Administrators.
- **Bulk actions:** Update supported workflow fields for multiple selected invoices.
- **Import validation:** Preview CSV and Excel files, identify invalid rows and duplicates, and download an issue report before importing.
- **Exports:** Export the current invoice view to CSV or Excel, with audit-export access restricted by role.
- **API and persistence:** Express APIs backed by SQLite, with JWT authentication and server-side permission checks.
- **Scale testing:** Tested invoice-list pagination, country filtering, and dashboard-summary response times with 100,000 invoice records.

### Technology Stack

**Frontend**

- React and JavaScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query and TanStack Table
- Recharts
- React Hook Form and Zod
- SheetJS and Lucide React

**Backend**

- Node.js and Express
- SQLite using `better-sqlite3`
- JSON Web Tokens (JWT)
- `bcryptjs` for password hashing
- `multer` and `csv-parse` for import handling

### Project Status

This is a practical assignment implementation. Features and performance results should be evaluated against the assignment requirements and the testing evidence documented in this README.


## 2. Setup and Run

### Prerequisites

- Node.js and npm
- Visual Studio Code or another code editor
- A terminal such as PowerShell

### Backend Setup

Open a terminal and run:

```powershell
cd D:\mettler-toledo\backend
npm install
npm run dev
```

The backend API runs at `http://localhost:5000`, assuming the default server configuration.

### Frontend Setup

Open a second terminal and run:

```powershell
cd D:\mettler-toledo\frontend
npm install
npm run dev
```

Open the local frontend URL printed by Vite, usually `http://localhost:5173`.

Keep both development servers running while using the application.

### Demo Login Credentials

The following demo accounts are configured by the seed-users script. All use the same demo password.

| Role          | Email                    | Password        |
| ------------- | ------------------------ | --------------- |
| Analyst       | `analyst@example.com`    | `DemoPass!2026` |
| Lead          | `lead@example.com`       | `DemoPass!2026` |
| Controller    | `controller@example.com` | `DemoPass!2026` |
| Administrator | `admin@example.com`      | `DemoPass!2026` |

These are development-only credentials. Do not use them in a production deployment.


## 3. Data Setup

### Database

The application uses SQLite for persistent storage. The database is configured at:

`data/ar-console.sqlite`

The database schema includes invoice records, users, analyst customer scopes, and audit logs. Indexes are used to support common invoice queries.

### Importing the Supplied Dataset

The supplied accounts receivable CSV dataset can be imported using the backend import script:

```powershell
cd D:\mettler-toledo\backend
npm run db:import
```

Check the script configuration and CSV file location before running the import. Avoid importing the same dataset into an already-populated database unless you intend to test duplicate handling.

### Seeding Demo Users

Create the demo users by running:

```powershell
cd D:\mettler-toledo\backend
npm run db:seed-users
```

The seed script configures demo accounts for Analyst, Lead, Controller, and Administrator roles.

### Import Validation

The application supports CSV and Excel file selection, previewing import results, identifying duplicate invoice numbers, reporting invalid rows, and explicitly committing eligible records.

Import previews display total, valid, invalid, and duplicate row counts. Validation issues can be downloaded as an Excel report.

### Performance-Test Dataset

For scale testing, synthetic invoice records were generated until the local database contained 100,000 invoices. These records are for development and performance testing, not additional records from the supplied business dataset.

A database backup was created before generating the synthetic records.

The synthetic performance-test records were added to the local SQLite database only. The original supplied CSV file was not modified. The 100,000-record dataset is intended for local performance testing and should not be treated as the original business dataset.

For a clean evaluation, initialize a fresh database and import the supplied CSV before running the application. Use the synthetic dataset only when reproducing the documented scale tests.

### Reproducing the Performance Dataset

The repository includes `server/scripts/generate-performance-data.js`, which targets 100,000 total invoice records. It calculates the number of missing records and inserts them in batches of 5,000.

Run the generator from the server directory:

```powershell
cd D:\mettler-toledo\backend
npm run db:generate-performance-data
```

The script reports insertion progress and the final invoice count. If the database already contains at least 100,000 invoices, it exits without adding more records.

**Note:** Run this utility against a development or performance-test database, not a production database. Back up the database before running it.


## 4. API Contract

The backend exposes REST APIs through Node.js and Express. Protected endpoints require a valid JWT access token, sent in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Authenticate a demo user and obtain a JWT |
| GET | `/api/auth/me` | Retrieve the authenticated user's information |

### Dashboard and Insights

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/summary` | Dashboard KPIs |
| GET | `/api/aging` | Outstanding invoices by aging bucket |
| GET | `/api/settlement-trend` | Monthly settlement insights |
| GET | `/api/customer-exposure` | Customer outstanding exposure |
| GET | `/api/billing-insights` | Electronic versus paper billing insights |

### Invoice Management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/invoices` | List invoices with pagination, sorting, and supported filters |
| GET | `/api/invoices/:invoiceNumber` | Retrieve invoice details |
| GET | `/api/invoices/:invoiceNumber/audit` | Retrieve invoice audit history |
| PATCH | `/api/invoices/:invoiceNumber` | Update supported invoice fields |
| PATCH | `/api/invoices/bulk` | Apply supported changes to multiple invoices |

### Data Import

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/invoices/import/preview` | Validate an uploaded import file and preview results |
| POST | `/api/invoices/import/commit` | Commit eligible imported records |

### Query Parameters and Validation

The invoice-list API supports pagination, sorting, and filters for fields such as customer, country, dispute status, billing type, settlement status, invoice and due-date ranges, invoice amount, and days late.

Invalid query combinations are rejected with an appropriate error response. Protected routes enforce authentication and permission checks.

### Error Handling

The API uses HTTP status codes to indicate success or failure. Examples include:

- `200` — successful request
- `400` — invalid input or query parameters
- `401` — missing or invalid authentication
- `403` — insufficient permissions
- `404` — resource not found
- `500` — unexpected server error


## 5. Roles and Access Control

The application supports four roles. Backend permission middleware checks access to protected operations, while the frontend uses role permissions to control the available interface actions.

| Capability | Analyst | Lead | Controller | Admin |
|---|---|---|---|---|
| View dashboard and invoices | Yes, scoped | Yes | Yes | Yes |
| Edit workflow fields | Scoped | Yes | No | Yes |
| Edit financial/source fields | No | Yes | No | Yes |
| Manage disputes | Can raise disputes within permitted scope | Yes | No | Yes |
| Bulk actions | No | Yes | No | Yes |
| Upload/import data | No | No | No | Yes |
| Export current invoice view | Own scope | Yes | Yes | Yes |
| Export audit history | No | Yes | Yes | Yes |
| Void invoices | No | No | No | Yes |
| Manage users and roles | No | No | No | Yes |

### Analyst Scope

Analysts are restricted to their assigned customer portfolio. They can view permitted dashboard and invoice information, update supported workflow fields within their scope, and export their permitted invoice view.

### Lead Scope

Leads can access all invoices, update supported workflow and financial fields, manage disputes, perform bulk actions, and export the current invoice view and audit history.

### Controller Scope

Controllers have read-only access to the dashboard and invoices. They can export the current invoice view and audit history but cannot modify invoice records.

### Administrator Scope

Administrators have access to all configured permissions, including data import, invoice voiding, and user and role management.

### Security Notes

JWT authentication identifies the logged-in user. Server-side middleware enforces permissions for protected API routes, and invoice access checks enforce analyst customer scope where implemented. Frontend permission checks improve usability but are not a substitute for backend authorization.

The demo credentials are intended for local development and must be replaced with appropriate security controls before production deployment.


## 6. Feature Checklist

Status reflects the implementation and tests completed so far. Remaining requirements should be verified before final submission.

| Feature | Status |
|---|---|
| JWT login and demo roles | Done |
| Role-based API permissions | Done |
| Analyst customer-scope restrictions | Done |
| Invoice listing, sorting, pagination, and filtering | Done |
| URL-synchronized invoice filters | Done |
| Dashboard KPI cards | Done |
| Aging, settlement, customer exposure, and billing insights | Done |
| Invoice details and audit history | Done |
| Workflow edits and audit logging | Done |
| Bulk workflow updates | Done |
| CSV and Excel export | Done |
| Audit export permission checks in the interface | Done |
| CSV/Excel import preview and validation | Done |
| Duplicate detection and downloadable import issue report | Done |
| 100,000-invoice test dataset | Done |
| Initial local API performance measurements | Done |
| Automated tests and complete acceptance-test coverage | Requires final verification |
| Concurrent-load testing | Not yet verified |
| Production deployment and live URL | Not yet verified |
| Final accessibility and responsive-layout review | Requires final verification |


## 7. Performance and Scale Testing

### Test Environment

- Dataset: 100,000 invoices in the local SQLite database
- Backend: Node.js and Express
- Database: SQLite
- Test method: PowerShell HTTP requests against the local API
- Invoice page size: 100 records

### Initial API Measurements

| Test | Requests | Average response time |
|---|---:|---:|
| Invoice list, unfiltered | 5 | 52.45 ms |
| Invoice list, country filtered (`countryCode=1`) | 5 | 60.87 ms |
| Dashboard summary | 5 | 66.34 ms |

A separate initial measurement recorded 78.26 ms for the invoice-list endpoint and 86.72 ms for the summary endpoint.

### Functional Verification

- Confirmed that the database contained 100,000 invoices.
- Confirmed that pages 1 and 2 each returned 100 records.
- Confirmed that the country filter returned records with country code `1`.
- Confirmed that the dashboard summary returned aggregate values for the expanded dataset.

### Limitations

These are initial measurements from sequential requests on a local development environment. They do not establish concurrent-user capacity or production performance.

Concurrent-load testing, import-duration measurement, browser rendering performance, bundle-size measurement, and a complete performance regression suite remain to be verified.

### Production Bundle Size

The frontend production build completed successfully using Vite.

| Asset | Minified size | Gzip size |
|---|---:|---:|
| JavaScript | 1,148.54 kB | 354.05 kB |
| CSS | 20.51 kB | 4.82 kB |

Vite reported a warning that some chunks exceed 500 kB after minification. The build succeeds, but code splitting and lazy loading are potential future improvements.

These are local build measurements; they do not represent browser load time or time to first interaction.

### Filtered Invoice Query Measurement

| Test | Requests | Average response time |
|---|---:|---:|
| Invoice list filtered by country (`countryCode=1`), page size 100 | 5 | 124.30 ms |

Individual response times were 148.64 ms, 115.49 ms, 104.01 ms, 139.05 ms, and 114.29 ms.

The measurement was collected using PowerShell against the local API with a 100,000-invoice dataset. It represents sequential HTTP requests, not concurrent-user load or browser rendering performance.

## 8. Architecture

The application follows a frontend/backend architecture.

### Frontend

The React frontend provides the dashboard, invoice workspace, filters, charts, invoice details, import interface, and export actions. React Query manages server data fetching and caching, while React Router manages navigation. TanStack Table supports invoice-table interactions, and Recharts renders analytics.

### Backend

The Express backend exposes REST APIs for authentication, invoice management, dashboard insights, bulk updates, audit history, and data import.

Business logic is organized into services for invoice filtering, calculations, summaries, aging analysis, customer exposure, billing insights, settlements, updates, and import validation.

### Database

SQLite stores invoices, users, analyst customer scopes, and audit records. Database indexes support common invoice queries.

### Authorization

JWT authentication identifies the user. Centralized backend permission checks control protected operations, and invoice queries enforce customer scope for Analysts where applicable.

### Data Flow

1. The frontend sends an authenticated API request.
2. Backend middleware validates the JWT and checks permissions.
3. The relevant service applies filters, scope restrictions, and business logic.
4. SQLite executes the required queries or updates.
5. The API returns the result to the frontend.
6. The frontend updates the interface and refreshes affected data where required.


## 9. Trade-offs and Assumptions

- **Database:** SQLite was selected for this practical assignment because it provides persistent storage with minimal setup.
- **Currency:** The supplied dataset does not provide a currency column. Invoice amounts are therefore treated as a single assumed currency for this implementation.
- **Invoice identity:** Invoice number is treated as the unique identifier for duplicate detection and invoice lookup.
- **Synthetic scale data:** Additional generated records are used for performance testing and should not be interpreted as actual business records.
- **Authentication:** Demo JWT authentication and seeded users support local evaluation. Production deployment would require stronger secret management and operational security controls.
- **Performance evidence:** The recorded API timings come from sequential local requests. They are not a substitute for concurrent-load testing.
- **Scope:** Features should be considered complete only where the implementation and relevant behavior have been verified.

## 10. AI Usage

AI tools were used occasionally for troubleshooting specific errors and improving documentation. The application implementation, integration, and testing were reviewed iteratively during development.

## 11. Time Spent

- Requirements review and project planning: 2 Hours
- Frontend development and dashboard: 8 Hours
- Backend APIs, database, and authorization: 8 hours
- Import/export, testing, and documentation: 4 hours

**Total time spent:** 22 hours

*Time estimates are approximate.*