import { getAuthToken } from "./authApi.js";

const API_BASE = "http://localhost:5000/api";

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("No authentication token found. Please sign in again.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }

  return result.data;
}

export function fetchInvoiceDetails(invoiceNumber) {
  return apiRequest(`/invoices/${encodeURIComponent(invoiceNumber)}`);
}

export function fetchInvoiceAuditHistory(invoiceNumber) {
  return apiRequest(`/invoices/${encodeURIComponent(invoiceNumber)}/audit`);
}

export function updateInvoiceDetails(invoiceNumber, changes) {
  return apiRequest(`/invoices/${encodeURIComponent(invoiceNumber)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}
