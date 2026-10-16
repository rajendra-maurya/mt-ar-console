import db from "../db.js";

const baseUrl = "http://localhost:5000/api";
const email = "analyst@example.com";
const password = "DemoPass!2026";

async function run() {
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

  if (!user) throw new Error("Demo analyst not found.");

  const invoice = db
    .prepare(
      `
    SELECT i.invoice_number, i.note
    FROM invoices i
    JOIN user_customer_scope s
      ON s.customer_id = i.customer_id
    WHERE s.user_id = ?
    LIMIT 1
  `,
    )
    .get(user.id);

  if (!invoice) throw new Error("No assigned invoice found.");

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!login.ok) throw new Error(`Login failed: ${login.status}`);

  const { token } = await login.json();

  async function patch(changes) {
    return fetch(
      `${baseUrl}/invoices/${encodeURIComponent(invoice.invoice_number)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(changes),
      },
    );
  }

  const marker = `Scope test ${Date.now()}`;

  const workflowResponse = await patch({ note: marker });
  console.log("Workflow edit:", workflowResponse.status);

  if (!workflowResponse.ok) {
    console.log(await workflowResponse.text());
    throw new Error("Analyst workflow edit failed.");
  }

  const audit = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM audit_logs
    WHERE invoice_id = (
      SELECT id FROM invoices WHERE invoice_number = ?
    )
    AND field_name = 'note'
    AND new_value = ?
    AND actor_user_id = ?
  `,
    )
    .get(invoice.invoice_number, marker, user.id);

  console.log("Matching audit records:", audit.total);

  const financialResponse = await patch({
    dueDate: "2027-01-15",
  });

  console.log("Financial edit:", financialResponse.status);

  // Restore the original note after verifying the audit record.
  const restoreResponse = await patch({
    note: invoice.note ?? null,
  });

  console.log("Note restored:", restoreResponse.ok);

  if (
    workflowResponse.status !== 200 ||
    audit.total < 1 ||
    financialResponse.status !== 403 ||
    !restoreResponse.ok
  ) {
    throw new Error("One or more tests failed.");
  }

  console.log("PASS: workflow, financial permissions, and audit logging.");
}

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
