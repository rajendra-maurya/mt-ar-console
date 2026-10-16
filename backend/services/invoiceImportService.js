import db from "../db.js";

function parseDate(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const text = String(value).trim();

  // Accept ISO dates.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00Z`);

    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === text
      ? text
      : null;
  }

  // Convert CSV dates such as 9/5/2024 to 2024-09-05.
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) return null;

  const [, month, day, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function parseBoolean(value) {
  if ([true, 1, "1", "Yes", "yes", "YES"].includes(value)) return 1;
  if ([false, 0, "0", "No", "no", "NO"].includes(value)) return 0;
  return null;
}

function normalizeInvoiceRow(row) {
  return {
    invoiceNumber: String(row.invoiceNumber ?? "").trim(),
    countryCode: String(row.countryCode ?? "").trim(),
    customerID: String(row.customerID ?? "").trim(),
    paperlessDate: parseDate(row.PaperlessDate ?? row.paperlessDate),
    invoiceDate: parseDate(row.InvoiceDate ?? row.invoiceDate),
    dueDate: parseDate(row.DueDate ?? row.dueDate),
    invoiceAmount: Number(row.InvoiceAmount ?? row.invoiceAmount),
    disputed: parseBoolean(row.Disputed ?? row.disputed),
    settledDate: parseDate(row.SettledDate ?? row.settledDate),
    paperlessBill: String(row.PaperlessBill ?? row.paperlessBill ?? "").trim(),
    daysToSettle:
      row.DaysToSettle == null || String(row.DaysToSettle).trim() === ""
        ? null
        : Number(row.DaysToSettle),
    daysLate:
      row.DaysLate == null || String(row.DaysLate).trim() === ""
        ? null
        : Number(row.DaysLate),
  };
}

export function validateImportedInvoice(row) {
  const errors = [];

  if (!row.invoiceNumber) errors.push("Invoice number is required.");
  if (!row.customerID) errors.push("Customer ID is required.");

  if (!/^\d+$/.test(row.countryCode)) {
    errors.push("Country code must be a whole number.");
  }

  if (!Number.isFinite(row.invoiceAmount) || row.invoiceAmount < 0) {
    errors.push("Invoice amount must be a valid non-negative number.");
  }

  if (!row.invoiceDate) errors.push("Invoice date is missing or invalid.");
  if (!row.dueDate) errors.push("Due date is missing or invalid.");

  if (row.paperlessDate === null && row._paperlessDateProvided) {
    errors.push("Paperless date is invalid.");
  }

  if (row.settledDate === null && row._settledDateProvided) {
    errors.push("Settled date is invalid.");
  }

  if (row.disputed === null) {
    errors.push("Disputed must be Yes or No.");
  }

  if (!["Paper", "Electronic"].includes(row.paperlessBill)) {
    errors.push("Billing type must be Paper or Electronic.");
  }

  for (const field of ["daysToSettle", "daysLate"]) {
    if (
      row[field] !== null &&
      (!Number.isFinite(row[field]) || row[field] < 0)
    ) {
      errors.push(`${field} must be a non-negative number or blank.`);
    }
  }

  return errors;
}

export function previewInvoiceImport(rows = []) {
  const seen = new Set();

  const findExisting = db.prepare(
    "SELECT 1 FROM invoices WHERE invoice_number = ?",
  );

  const results = rows.map((sourceRow, index) => {
    const row = normalizeInvoiceRow(sourceRow);

    // Distinguish an intentionally blank optional date from an invalid date.
    row._paperlessDateProvided =
      String(
        sourceRow.PaperlessDate ?? sourceRow.paperlessDate ?? "",
      ).trim() !== "";
    row._settledDateProvided =
      String(sourceRow.SettledDate ?? sourceRow.settledDate ?? "").trim() !==
      "";

    const errors = validateImportedInvoice(row);
    const invoiceNumber = row.invoiceNumber;

    let duplicate = false;

    if (invoiceNumber) {
      if (seen.has(invoiceNumber)) {
        duplicate = true;
      } else {
        seen.add(invoiceNumber);
        duplicate = Boolean(findExisting.get(invoiceNumber));
      }
    }

    const { _paperlessDateProvided, _settledDateProvided, ...invoice } = row;

    return {
      rowNumber: index + 1,
      invoiceNumber,
      duplicate,
      valid: errors.length === 0 && !duplicate,
      errors,
      invoice,
    };
  });

  const duplicateRows = results.filter((row) => row.duplicate).length;

  const invalidRows = results.filter(
    (row) => row.errors.length > 0 && !row.duplicate,
  ).length;

  const validRows = results.filter((row) => row.valid && !row.duplicate).length;

  return {
    totalRows: results.length,
    validRows,
    invalidRows,
    duplicateRows,
    rows: results,
  };
}

export function commitInvoiceImport(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 10000) {
    const error = new Error("Provide between 1 and 10,000 invoice rows.");
    error.status = 400;
    throw error;
  }

  const preview = previewInvoiceImport(rows);
  const insert = db.prepare(`
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
    ) VALUES (
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

  const commit = db.transaction(() => {
    let imported = 0;
    let skippedDuplicates = 0;
    const failedRows = [];

    for (const item of preview.rows) {
      if (item.duplicate) {
        skippedDuplicates++;
        continue;
      }

      if (!item.valid) {
        failedRows.push({
          rowNumber: item.rowNumber,
          invoiceNumber: item.invoiceNumber,
          errors: item.errors,
        });
        continue;
      }

      const invoice = item.invoice;

      try {
        const result = insert.run({
          ...invoice,
          workflowStatus: invoice.settledDate ? "settled" : "open",
        });

        if (result.changes === 1) {
          imported++;
        } else {
          skippedDuplicates++;
        }
      } catch (error) {
        throw error;
      }
    }

    return {
      totalRows: preview.totalRows,
      imported,
      skippedDuplicates,
      failed: failedRows.length,
      failedRows,
    };
  });

  return commit();
}
