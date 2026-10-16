import db from "../db.js";

const baseUrl = "http://localhost:5000/api";

async function run() {
  const user = db
    .prepare(
      `
    SELECT id FROM users WHERE email = ?
  `,
    )
    .get("analyst@example.com");

  if (!user) throw new Error("Demo analyst not found.");

  const assigned = db
    .prepare(
      `
    SELECT i.invoice_number
    FROM invoices i
    JOIN user_customer_scope s
      ON s.customer_id = i.customer_id
    WHERE s.user_id = ?
    LIMIT 1
  `,
    )
    .get(user.id);

  const unassigned = db
    .prepare(
      `
    SELECT i.invoice_number
    FROM invoices i
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_customer_scope s
      WHERE s.user_id = ?
        AND s.customer_id = i.customer_id
    )
    LIMIT 1
  `,
    )
    .get(user.id);

  if (!assigned || !unassigned) {
    throw new Error("Could not find both invoice test cases.");
  }

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "analyst@example.com",
      password: "DemoPass!2026",
    }),
  });

  if (!login.ok) throw new Error(`Login failed: ${login.status}`);

  const { token } = await login.json();

  async function getAudit(invoiceNumber) {
    return fetch(
      `${baseUrl}/invoices/${encodeURIComponent(invoiceNumber)}/audit`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  const allowed = await getAudit(assigned.invoice_number);
  console.log("Assigned invoice audit status:", allowed.status);

  if (!allowed.ok) {
    console.log(await allowed.text());
    throw new Error("Could not read assigned invoice audit history.");
  }

  const body = await allowed.json();
  console.log("Audit entries returned:", body.data.length);
  console.log("Audit history sample:", body.data[0] ?? "No entries");

  const denied = await getAudit(unassigned.invoice_number);
  console.log("Unassigned invoice audit status:", denied.status);

  if (allowed.status !== 200 || denied.status !== 404) {
    throw new Error("Audit access test FAILED.");
  }

  console.log("PASS: audit history respects invoice scope.");
}

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
