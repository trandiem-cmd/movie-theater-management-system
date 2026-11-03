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
// Movies
// Theaters
// Showtimes
// Bookings