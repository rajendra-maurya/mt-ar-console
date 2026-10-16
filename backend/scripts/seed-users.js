import "dotenv/config";
import bcrypt from "bcryptjs";
import db from "../db.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo users must not be seeded in production.");
}

const demoPassword = "DemoPass!2026";
const passwordHash = bcrypt.hashSync(demoPassword, 12);

const demoUsers = [
  {
    id: "demo-analyst",
    name: "Demo Analyst",
    email: "analyst@example.com",
    role: "analyst",
  },
  {
    id: "demo-lead",
    name: "Demo Lead",
    email: "lead@example.com",
    role: "lead",
  },
  {
    id: "demo-controller",
    name: "Demo Controller",
    email: "controller@example.com",
    role: "controller",
  },
  {
    id: "demo-admin",
    name: "Demo Admin",
    email: "admin@example.com",
    role: "admin",
  },
];

const seedUsers = db.transaction(() => {
  const saveUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, active)
    VALUES (@id, @name, @email, @passwordHash, @role, 1)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      password_hash = excluded.password_hash,
      role = excluded.role,
      active = 1
  `);

  for (const user of demoUsers) {
    saveUser.run({
      ...user,
      passwordHash,
    });
  }

  // Give the demo analyst access to a limited customer portfolio.
  const customerIDs = db
    .prepare(
      `
    SELECT DISTINCT customer_id
    FROM invoices
    ORDER BY customer_id
    LIMIT 10
  `,
    )
    .all();

  const addScope = db.prepare(`
    INSERT OR IGNORE INTO user_customer_scope (user_id, customer_id)
    VALUES (?, ?)
  `);

  for (const customer of customerIDs) {
    addScope.run("demo-analyst", customer.customer_id);
  }
});

seedUsers();

console.log("Demo users seeded successfully.");
console.log("Password for all four accounts:", demoPassword);
console.log("Analyst customer scope:", 10, "customers maximum");

db.close();
