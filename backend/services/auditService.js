import db from "../db.js";

export function getInvoiceAuditHistory(invoiceNumber, user) {
  const invoice = db
    .prepare(
      `
    SELECT id, customer_id
    FROM invoices
    WHERE invoice_number = ?
  `,
    )
    .get(invoiceNumber);

  if (
    !invoice ||
    (user.role === "analyst" &&
      !db
        .prepare(
          `
        SELECT 1
        FROM user_customer_scope
        WHERE user_id = ? AND customer_id = ?
      `,
        )
        .get(user.id, invoice.customer_id))
  ) {
    const error = new Error("The requested invoice was not found.");
    error.status = 404;
    throw error;
  }

  return db
    .prepare(
      `
    SELECT
      a.field_name AS field,
      a.old_value AS oldValue,
      a.new_value AS newValue,
      u.name AS changedBy,
      a.changed_at AS changedAt
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_user_id
    WHERE a.invoice_id = ?
    ORDER BY a.changed_at DESC, a.id DESC
  `,
    )
    .all(invoice.id);
}
