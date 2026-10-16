import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

import db from "../db.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const csvPath = path.resolve(
  currentDirectory,
  "../../data/WA_Fn-UseC_-Accounts-Receivable.csv",
);

if (!fs.existsSync(csvPath)) {
  throw new Error(`CSV file not found: ${csvPath}`);
}

const csvContent = fs.readFileSync(csvPath, "utf8");

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true,
});

function parseUsDate(value) {
  if (!value || !value.trim()) {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    throw new Error(`Invalid date: ${value}`);
  }

  const [, monthText, dayText, yearText] = match;

  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

const insertInvoice = db.prepare(`
  INSERT OR IGNORE INTO invoices (
    invoice_number,
    country_code,
    customer_id,
    paperless_date,
    invoice_date,
    due_date,
    invoice_amount,
    disputed,
    settled_date,
    paperless_bill,
    days_to_settle,
    days_late,
    workflow_status
  )
  VALUES (
    @invoiceNumber,
    @countryCode,
    @customerID,
    @paperlessDate,
    @invoiceDate,
    @dueDate,
    @invoiceAmount,
    @disputed,
    @settledDate,
    @paperlessBill,
    @daysToSettle,
    @daysLate,
    @workflowStatus
  )
`);

const importRecords = db.transaction((rows) => {
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.invoiceNumber?.trim()) {
      throw new Error("Invoice number cannot be blank.");
    }

    const invoiceNumber = row.invoiceNumber.trim();

    if (!/^\d{10}$/.test(invoiceNumber)) {
      throw new Error(`Invalid invoice number: ${invoiceNumber}`);
    }

    const invoiceAmount = Number(row.InvoiceAmount);

    if (!Number.isFinite(invoiceAmount) || invoiceAmount < 0) {
      throw new Error(`Invalid invoice amount for ${invoiceNumber}`);
    }

    if (!["Yes", "No"].includes(row.Disputed)) {
      throw new Error(`Invalid dispute value for ${invoiceNumber}`);
    }

    if (!["Paper", "Electronic"].includes(row.PaperlessBill)) {
      throw new Error(`Invalid billing type for ${invoiceNumber}`);
    }

    const invoiceDate = parseUsDate(row.InvoiceDate);
    const dueDate = parseUsDate(row.DueDate);
    const settledDate = parseUsDate(row.SettledDate);
    const paperlessDate = parseUsDate(row.PaperlessDate);

    if (!invoiceDate || !dueDate) {
      throw new Error(
        `Invoice date and due date are required for ${invoiceNumber}`,
      );
    }

    if (dueDate < invoiceDate) {
      throw new Error(`Due date precedes invoice date for ${invoiceNumber}`);
    }

    if (settledDate && settledDate < invoiceDate) {
      throw new Error(
        `Settlement date precedes invoice date for ${invoiceNumber}`,
      );
    }

    const workflowStatus = settledDate
      ? "settled"
      : row.Disputed === "Yes"
        ? "in_dispute"
        : "open";

    const result = insertInvoice.run({
      invoiceNumber,
      countryCode: Number(row.countryCode),
      customerID: row.customerID,
      paperlessDate,
      invoiceDate,
      dueDate,
      invoiceAmount,
      disputed: row.Disputed === "Yes" ? 1 : 0,
      settledDate,
      paperlessBill: row.PaperlessBill,
      daysToSettle: row.DaysToSettle === "" ? null : Number(row.DaysToSettle),
      daysLate: row.DaysLate === "" ? null : Number(row.DaysLate),
      workflowStatus,
    });

    if (result.changes === 1) {
      inserted += 1;
    } else {
      skipped += 1;
    }
  }

  return { inserted, skipped };
});

const result = importRecords(records);

console.log("CSV import completed.");
console.log(`Rows in CSV: ${records.length}`);
console.log(`New invoices inserted: ${result.inserted}`);
console.log(`Existing invoice numbers skipped: ${result.skipped}`);
