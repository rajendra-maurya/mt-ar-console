import db from "../db.js";

export function voidInvoice(invoiceNumber, reason, user) {
  if (typeof reason !== "string" || !reason.trim()) {
    const error = new Error("A reason is required to void an invoice.");
    error.status = 400;
    throw error;
  }

  if (reason.trim().length > 500) {
    const error = new Error("The reason must be 500 characters or fewer.");
    error.status = 400;
    throw error;
  }

  const invoice = db
    .prepare(
      `SELECT id, invoice_number, voided_at
       FROM invoices
       WHERE invoice_number = ?`,
    )
    .get(invoiceNumber);

  if (!invoice) {
    const error = new Error("Invoice not found.");
    error.status = 404;
    throw error;
  }

  if (invoice.voided_at) {
    const error = new Error("This invoice has already been voided.");
    error.status = 409;
    throw error;
  }

  const performVoid = db.transaction(() => {
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE invoices
       SET voided_at = ?, voided_by = ?, void_reason = ?, updated_at = ?
       WHERE id = ? AND voided_at IS NULL`,
    ).run(now, user.id, reason.trim(), now, invoice.id);

    db.prepare(
      `INSERT INTO audit_logs
       (invoice_id, field_name, old_value, new_value, actor_user_id)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(invoice.id, "voided_at", null, now, user.id);

    db.prepare(
      `INSERT INTO audit_logs
       (invoice_id, field_name, old_value, new_value, actor_user_id)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(invoice.id, "void_reason", null, reason.trim(), user.id);
  });

  performVoid();

  return {
    invoiceNumber: invoice.invoice_number,
    voided: true,
    reason: reason.trim(),
  };
}
