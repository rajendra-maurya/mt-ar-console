import db from "../db.js";
import { hasPermission, PERMISSIONS } from "../permissions.js";

const FIELD_MAP = {
  workflowStatus: "workflow_status",
  assignedOwner: "assigned_owner",
  nextFollowUpDate: "next_follow_up_date",
  note: "note",
  dueDate: "due_date",
  settledDate: "settled_date",
  paperlessBill: "paperless_bill",
  disputed: "disputed",
};

const WORKFLOW_STATUSES = [
  "open",
  "in_dispute",
  "escalated",
  "promised",
  "settled",
  "written_off",
];

function validateField(field, value) {
  if (field === "workflowStatus") {
    if (!WORKFLOW_STATUSES.includes(value)) {
      throw new Error("Invalid workflowStatus.");
    }
  }

  if (field === "paperlessBill") {
    if (!["Paper", "Electronic"].includes(value)) {
      throw new Error("paperlessBill must be Paper or Electronic.");
    }
  }

  if (field === "disputed" && typeof value !== "boolean") {
    throw new Error("disputed must be true or false.");
  }

  if (["dueDate", "settledDate", "nextFollowUpDate"].includes(field)) {
    if (
      value !== null &&
      (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)
    ) {
      throw new Error(`${field} must be a valid YYYY-MM-DD date or null.`);
    }
  }

  if (["assignedOwner", "note"].includes(field)) {
    if (value !== null && typeof value !== "string") {
      throw new Error(`${field} must be a string or null.`);
    }

    if (typeof value === "string" && value.length > 2000) {
      throw new Error(`${field} cannot exceed 2000 characters.`);
    }
  }
}

function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function checkFieldPermission(field, value, currentValue, user) {
  if (
    ["workflowStatus", "assignedOwner", "nextFollowUpDate", "note"].includes(
      field,
    )
  ) {
    if (!hasPermission(user.role, PERMISSIONS.EDIT_WORKFLOW)) {
      throw forbidden(`You do not have permission to edit ${field}.`);
    }
    return;
  }

  if (field === "disputed") {
    console.log("Dispute permission check:", {
      role: user.role,
      value,
      currentValue,
      field,
    });

    console.log("Analyst check values:", {
      roleIsAnalyst: user.role?.toLowerCase() === "analyst",
      valueIsTrue: value === true,
      valueType: typeof value,
      currentValue,
      currentValueType: typeof currentValue,
    });

    // Analysts may raise a dispute, but cannot clear one.
    const role = user.role?.toLowerCase();

    const isRaisingDispute =
      value === true || value === 1 || value === "1" || value === "true";

    const isCurrentlyNotDisputed =
      currentValue === false ||
      currentValue === 0 ||
      currentValue === "0" ||
      currentValue === null;

    if (role === "analyst" && isRaisingDispute && isCurrentlyNotDisputed) {
      return;
    }

    if (!hasPermission(user.role, PERMISSIONS.MANAGE_DISPUTES)) {
      throw forbidden("You do not have permission to change this dispute.");
    }
    return;
  }

  if (!hasPermission(user.role, PERMISSIONS.EDIT_FINANCIAL)) {
    throw forbidden(`You do not have permission to edit ${field}.`);
  }
}

export function updateInvoice(invoiceNumber, changes, user) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new Error("Request body must be an object.");
  }

  const fields = Object.keys(changes);

  if (fields.length === 0) {
    throw new Error("Provide at least one field to update.");
  }

  for (const field of fields) {
    if (!Object.hasOwn(FIELD_MAP, field)) {
      throw new Error(`Field '${field}' cannot be updated.`);
    }
  }

  const transaction = db.transaction(() => {
    let invoice = db
      .prepare(
        `
      SELECT *
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

    const updates = [];
    const parameters = {};
    const audit = [];

    for (const field of fields) {
      const value = changes[field];
      validateField(field, value);

      const column = FIELD_MAP[field];
      const currentValue = invoice[column];

      checkFieldPermission(field, value, currentValue, user);

      let normalizedValue = field === "disputed" ? Number(value) : value;

      if (field === "assignedOwner") {
        normalizedValue = value || invoice.assigned_owner || "Unassigned";
      }

      if (field === "note") {
        normalizedValue = value ?? invoice.note ?? "";
      }

      if (field === "nextFollowUpDate") {
        normalizedValue = value ?? null;
      }

      if (currentValue === normalizedValue) {
        continue;
      }

      updates.push(`${column} = @${field}`);
      parameters[field] = normalizedValue;

      audit.push({
        field,
        oldValue: currentValue,
        newValue: normalizedValue,
      });
    }

    if (updates.length === 0) {
      return invoice;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    db.prepare(
      `
      UPDATE invoices
      SET ${updates.join(", ")}
      WHERE invoice_number = @invoiceNumber
    `,
    ).run({ ...parameters, invoiceNumber });

    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (
        invoice_id,
        field_name,
        old_value,
        new_value,
        actor_user_id
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of audit) {
      insertAudit.run(
        invoice.id,
        item.field,
        item.oldValue === null ? null : String(item.oldValue),
        item.newValue === null ? null : String(item.newValue),
        user.id,
      );
    }

    return db
      .prepare(
        `
      SELECT *
      FROM invoices
      WHERE invoice_number = ?
    `,
      )
      .get(invoiceNumber);
  });

  return transaction();
}
