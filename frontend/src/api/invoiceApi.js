

const API_BASE_URL = "http://localhost:5000/api";

export async function fetchInvoices(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  const url = `${API_BASE_URL}/invoices${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to load invoices.");
  }

  const result = await response.json();
  return result;
}

export async function bulkUpdateInvoices(invoiceNumbers, changes) {
  const response = await fetch(`${API_BASE_URL}/invoices/bulk`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
    },
    body: JSON.stringify({
      invoiceNumbers,
      changes,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Bulk update failed.");
  }

  return result.data;
}
