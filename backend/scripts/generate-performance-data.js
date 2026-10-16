import db from "../db.js";

const TARGET_TOTAL = 100_000;
const BATCH_SIZE = 5_000;

const existingCount = db
  .prepare("SELECT COUNT(*) AS count FROM invoices")
  .get().count;

const rowsToAdd = Math.max(0, TARGET_TOTAL - existingCount);

if (rowsToAdd === 0) {
  console.log(`Already have ${existingCount} invoices. Nothing to add.`);
  process.exit(0);
}

const insert = db.prepare(`
  INSERT INTO invoices (
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
    workflow_status,
    assigned_owner
  ) VALUES (
    @invoiceNumber,
    @countryCode,
    @customerId,
    @paperlessDate,
    @invoiceDate,
    @dueDate,
    @invoiceAmount,
    @disputed,
    @settledDate,
    @paperlessBill,
    @daysToSettle,
    @daysLate,
    @workflowStatus,
    @assignedOwner
  )
`);

const generateBatch = db.transaction((start, count) => {
  for (let i = start; i < start + count; i++) {
    const invoiceDate = new Date(Date.UTC(2024, i % 12, (i % 27) + 1));
    const dueDate = new Date(invoiceDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + 30);

    const settled = i % 5 !== 0;
    const settledDate = settled
      ? new Date(dueDate.getTime() + (i % 15) * 86400000)
      : null;

    const formatDate = (date) => date.toISOString().slice(0, 10);
    const daysLate = settled
      ? Math.max(0, Math.floor((settledDate - dueDate) / 86400000))
      : Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86400000));

    insert.run({
      // Ten-digit invoice number, stored as text.
      invoiceNumber: String(8_000_000_000 + existingCount + i).padStart(
        10,
        "0",
      ),
      countryCode: [1, 2, 3, 4, 5][i % 5],
      customerId: `PERF-CUST-${String((i % 100) + 1).padStart(3, "0")}`,
      paperlessDate: "2024-01-01",
      invoiceDate: formatDate(invoiceDate),
      dueDate: formatDate(dueDate),
      invoiceAmount: Number((50 + (i % 5000) / 10).toFixed(2)),
      disputed: i % 7 === 0 ? 1 : 0,
      settledDate: settled ? formatDate(settledDate) : null,
      paperlessBill: i % 2 === 0 ? "Electronic" : "Paper",
      daysToSettle: settled
        ? Math.max(0, Math.floor((settledDate - invoiceDate) / 86400000))
        : null,
      daysLate,
      workflowStatus: settled ? "settled" : "open",
      assignedOwner: `Analyst ${(i % 5) + 1}`,
    });
  }
});

console.log(`Adding ${rowsToAdd} synthetic invoices...`);

for (let start = 0; start < rowsToAdd; start += BATCH_SIZE) {
  const count = Math.min(BATCH_SIZE, rowsToAdd - start);
  generateBatch(start, count);
  console.log(`Added ${Math.min(start + count, rowsToAdd)} of ${rowsToAdd}`);
}

const finalCount = db
  .prepare("SELECT COUNT(*) AS count FROM invoices")
  .get().count;

console.log(`Done. Total invoices in database: ${finalCount}`);
