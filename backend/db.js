import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

// Keep the database outside the frontend.
const databasePath = path.resolve(
  currentDirectory,
  "../data/ar-console.sqlite",
);

const db = new Database(databasePath);

// Enable foreign-key enforcement.
db.pragma("foreign_keys = ON");

// Improve read performance.
db.pragma("journal_mode = WAL");

// Create the required tables.
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    invoice_number TEXT NOT NULL UNIQUE,
    country_code INTEGER NOT NULL,
    customer_id TEXT NOT NULL,

    paperless_date TEXT,
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    invoice_amount REAL NOT NULL
      CHECK (invoice_amount >= 0),

    disputed INTEGER NOT NULL DEFAULT 0
      CHECK (disputed IN (0, 1)),

    settled_date TEXT,
    paperless_bill TEXT NOT NULL
      CHECK (paperless_bill IN ('Paper', 'Electronic')),

    days_to_settle REAL,
    days_late REAL,

    workflow_status TEXT NOT NULL DEFAULT 'open'
      CHECK (
        workflow_status IN (
          'open',
          'in_dispute',
          'escalated',
          'promised',
          'settled',
          'written_off'
        )
      ),

    assigned_owner TEXT NOT NULL DEFAULT 'Unassigned',
    next_follow_up_date TEXT,
    note TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    role TEXT NOT NULL CHECK (
      role IN ('analyst', 'lead', 'controller', 'admin')
    ),

    active INTEGER NOT NULL DEFAULT 1
      CHECK (active IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS user_customer_scope (
    user_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,

    PRIMARY KEY (user_id, customer_id),

    FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    invoice_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,

    actor_user_id TEXT,
    changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (invoice_id)
      REFERENCES invoices(id)
      ON DELETE CASCADE,

    FOREIGN KEY (actor_user_id)
      REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_invoice_customer
    ON invoices(customer_id);

  CREATE INDEX IF NOT EXISTS idx_invoice_due_date
    ON invoices(due_date);

  CREATE INDEX IF NOT EXISTS idx_invoice_settled_date
    ON invoices(settled_date);

  CREATE INDEX IF NOT EXISTS idx_invoice_disputed
    ON invoices(disputed);

  CREATE INDEX IF NOT EXISTS idx_invoice_workflow
    ON invoices(workflow_status);

  CREATE INDEX IF NOT EXISTS idx_audit_invoice
    ON audit_logs(invoice_id);
`);

const invoiceColumns = db
  .prepare("PRAGMA table_info(invoices)")
  .all()
  .map((column) => column.name);

if (!invoiceColumns.includes("voided_at")) {
  db.exec("ALTER TABLE invoices ADD COLUMN voided_at TEXT");
}

if (!invoiceColumns.includes("voided_by")) {
  db.exec("ALTER TABLE invoices ADD COLUMN voided_by TEXT");
}

if (!invoiceColumns.includes("void_reason")) {
  db.exec("ALTER TABLE invoices ADD COLUMN void_reason TEXT");
}

export default db;
