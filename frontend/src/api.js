const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Test backend and database connection
export const testBackendConnection = async () => {
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Backend connection failed");
  }

  return data;
};

// Auth
const handleResponse = async (response, defaultMessage) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || defaultMessage);
  }

  return data;
};
export const login = async (email, password) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed.");
  }

  return data;
};

export const register = async (
  fullName,
  email,
  phone,
  dateOfBirth,
  password
) => {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: fullName,
      email,
      password,
      phone,
      date_of_birth: dateOfBirth,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Registration failed.");
  }

  return data;
};

export const getCurrentUser = async () => {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Not authenticated");
  }

  return data.user;
};

export const logout = async () => {
  const response = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "same-origin",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Logout failed.");
  }

  return data;
};

// Movies
// Theaters
// Showtimes
// Bookings