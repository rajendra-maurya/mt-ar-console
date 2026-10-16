import db from "../db.js";

const invoiceNumber = "4595561744";
const adminId = "demo-admin";
const testReason = "Permission test only";

const restore = db.transaction(() => {
  const invoice = db
    .prepare(
      `
    SELECT id, voided_at, voided_by, void_reason
    FROM invoices
    WHERE invoice_number = ?
  `,
    )
    .get(invoiceNumber);

  if (!invoice) {
    throw new Error("Test invoice was not found.");
  }

  if (
    !invoice.voided_at ||
    invoice.voided_by !== adminId ||
    invoice.void_reason !== testReason
  ) {
    throw new Error("Invoice does not match the test void. No changes made.");
  }

  const now = new Date().toISOString();

  const update = db
    .prepare(
      `
    UPDATE invoices
    SET voided_at = NULL,
        voided_by = NULL,
        void_reason = NULL,
        updated_at = ?
    WHERE id = ? AND voided_at = ?
  `,
    )
    .run(now, invoice.id, invoice.voided_at);

  if (update.changes !== 1) {
    throw new Error("Invoice restoration failed.");
  }

  const log = db.prepare(`
    INSERT INTO audit_logs
      (invoice_id, field_name, old_value, new_value, actor_user_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  log.run(invoice.id, "voided_at", invoice.voided_at, null, adminId);
  log.run(invoice.id, "void_reason", invoice.void_reason, null, adminId);
});

restore();

console.log(`Restored invoice ${invoiceNumber}.`);
console.log("Original void audit records have been preserved.");
