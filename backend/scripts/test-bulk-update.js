const API = "http://localhost:5000/api";
const PASSWORD = "DemoPass!2026";

async function login(email) {
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${result.message}`);
  }

  return result.token;
}

async function main() {
  const analystToken = await login("analyst@example.com");
  const controllerToken = await login("controller@example.com");
  const leadToken = await login("lead@example.com");

  const payload = {
    invoiceNumbers: [],
    changes: { note: "Bulk permission test" },
  };

  for (const [role, token] of [
    ["Analyst", analystToken],
    ["Controller", controllerToken],
    ["Lead", leadToken],
  ]) {
    const response = await fetch(`${API}/invoices/bulk`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    console.log(`${role}: ${response.status}`, body);
  }
}

main().catch(console.error);
