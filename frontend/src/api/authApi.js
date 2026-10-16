const API_BASE_URL = "http://localhost:5000/api";

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Login failed.");
  }

  localStorage.setItem("authToken", result.token);
  localStorage.setItem("authUser", JSON.stringify(result.user));

  return result.user;
}

export function logoutUser() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
}

export function getCurrentUser() {
  const savedUser = localStorage.getItem("authUser");

  try {
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return localStorage.getItem("authToken");
}
