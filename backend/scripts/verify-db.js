import db from "../db.js";

const total = db
  .prepare(
    `
  SELECT COUNT(*) AS count
  FROM invoices
`,
  )
  .get();

const settled = db
  .prepare(
    `
  SELECT COUNT(*) AS count
  FROM invoices
  WHERE settled_date IS NOT NULL
`,
  )
  .get();

const outstanding = db
  .prepare(
    `
  SELECT COUNT(*) AS count
  FROM invoices
  WHERE settled_date IS NULL
`,
  )
  .get();

const sample = db
  .prepare(
    `
  SELECT
    invoice_number,
    customer_id,
    invoice_amount,
    invoice_date,
    due_date,
    settled_date
  FROM invoices
  ORDER BY invoice_number
  LIMIT 5
`,
  )
  .all();

console.log("Total invoices:", total.count);
console.log("Settled invoices:", settled.count);
console.log("Outstanding invoices:", outstanding.count);
console.table(sample);

db.close();
