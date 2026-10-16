const API_BASE = "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("authToken");

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
}

export function fetchUsers() {
  return request("/users");
}

export function createUser(user) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export function updateUser(userId, updates) {
  return request(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function updateCustomerScope(userId, customerIds) {
  return request(`/users/${encodeURIComponent(userId)}/customer-scope`, {
    method: "PUT",
    body: JSON.stringify({ customerIds }),
  });
}
