import bcrypt from "bcryptjs";
import db from "../db.js";

const VALID_ROLES = ["analyst", "lead", "controller", "admin"];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: Boolean(user.active),
  };
}

export function listUsers() {
  return db
    .prepare(
      `SELECT id, name, email, role, active
       FROM users
       ORDER BY name COLLATE NOCASE`,
    )
    .all()
    .map(publicUser);
}

export function createUser(input = {}) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = input.password;
  const role = input.role;

  if (!name || name.length > 100) {
    throw httpError(
      400,
      "Name is required and must be at most 100 characters.",
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw httpError(400, "A valid email address is required.");
  }

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 72
  ) {
    throw httpError(400, "Password must be between 12 and 72 characters.");
  }

  if (!VALID_ROLES.includes(role)) {
    throw httpError(400, "Invalid user role.");
  }

  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    throw httpError(409, "A user with this email already exists.");
  }

  const id = `user-${crypto.randomUUID()}`;
  const passwordHash = bcrypt.hashSync(password, 12);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, active)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(id, name, email, passwordHash, role);

  return publicUser(
    db
      .prepare("SELECT id, name, email, role, active FROM users WHERE id = ?")
      .get(id),
  );
}

export function updateUser(userId, input = {}) {
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

  if (!existing) {
    throw httpError(404, "User not found.");
  }

  const updates = [];
  const values = [];

  if (input.name !== undefined) {
    if (
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.trim().length > 100
    ) {
      throw httpError(
        400,
        "Name is required and must be at most 100 characters.",
      );
    }
    updates.push("name = ?");
    values.push(input.name.trim());
  }

  if (input.role !== undefined) {
    if (!VALID_ROLES.includes(input.role)) {
      throw httpError(400, "Invalid user role.");
    }
    updates.push("role = ?");
    values.push(input.role);
  }

  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") {
      throw httpError(400, "Active must be true or false.");
    }

    if (userId === "demo-admin" && input.active === false) {
      throw httpError(400, "The primary demo admin cannot be deactivated.");
    }

    updates.push("active = ?");
    values.push(input.active ? 1 : 0);
  }

  if (input.password !== undefined) {
    if (
      typeof input.password !== "string" ||
      input.password.length < 12 ||
      input.password.length > 72
    ) {
      throw httpError(400, "Password must be between 12 and 72 characters.");
    }

    updates.push("password_hash = ?");
    values.push(bcrypt.hashSync(input.password, 12));
  }

  if (updates.length === 0) {
    throw httpError(400, "Provide at least one supported field to update.");
  }

  values.push(userId);

  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values,
  );

  return publicUser(
    db
      .prepare("SELECT id, name, email, role, active FROM users WHERE id = ?")
      .get(userId),
  );
}

export function replaceUserCustomerScope(userId, customerIDs) {
  const user = db
    .prepare("SELECT id, role FROM users WHERE id = ?")
    .get(userId);

  if (!user) {
    throw httpError(404, "User not found.");
  }

  if (user.role !== "analyst") {
    throw httpError(400, "Customer scope can only be assigned to Analysts.");
  }

  if (
    !Array.isArray(customerIDs) ||
    customerIDs.some(
      (customerID) => typeof customerID !== "string" || !customerID.trim(),
    ) ||
    new Set(customerIDs).size !== customerIDs.length
  ) {
    throw httpError(400, "Provide a list of unique, non-empty customer IDs.");
  }

  const replaceScope = db.transaction(() => {
    const insert = db.prepare(
      "INSERT INTO user_customer_scope (user_id, customer_id) VALUES (?, ?)",
    );

    db.prepare("DELETE FROM user_customer_scope WHERE user_id = ?").run(userId);

    for (const customerID of customerIDs) {
      const exists = db
        .prepare("SELECT 1 FROM invoices WHERE customer_id = ? LIMIT 1")
        .get(customerID.trim());

      if (!exists) {
        throw httpError(400, `Unknown customer ID: ${customerID}`);
      }

      insert.run(userId, customerID.trim());
    }
  });

  replaceScope();

  return {
    userId,
    customerIDs: db
      .prepare(
        "SELECT customer_id FROM user_customer_scope WHERE user_id = ? ORDER BY customer_id",
      )
      .all(userId)
      .map((row) => row.customer_id),
  };
}
