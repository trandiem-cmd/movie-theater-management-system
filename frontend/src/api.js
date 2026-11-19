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
  if (response.status === 401) {
    throw new Error("Authentication required.");
  }

  if (response.status === 403) {
    throw new Error("You do not have Admin permission.");
  }
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
    credentials: "include",
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
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Logout failed.");
  }

  return data;
};

// Update Profile
export const updateProfile = async (profileData) => {
  const response = await fetch(`${BASE_URL}/auth/profile`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: profileData.full_name,
      phone: profileData.phone,
      date_of_birth: profileData.date_of_birth,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Profile update failed.");
  }

  return data;
};
// Change Password
export const changePassword = async (
  currentPassword,
  newPassword,
  confirmPassword
) => {
  const response = await fetch(`${BASE_URL}/auth/change-password`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Password change failed.");
  }

  return data;
};
export const forgotPassword = async (email) => {
  const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to send OTP.");
  }

  return data;
};

export const verifyResetOtp = async (email, otp) => {
  const response = await fetch(`${BASE_URL}/auth/verify-reset-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      otp,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "OTP verification failed.");
  }

  return data;
};

export const resetPassword = async (
  email,
  otp,
  newPassword,
  confirmPassword
) => {
  const response = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      otp,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Password reset failed.");
  }

  return data;
};
// Movies
// Theaters
const THEATER_API = `${BASE_URL}/admin/theaters`;

export const getTheaters = async () => {
  const response = await fetch(THEATER_API, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse(response, "Could not load theaters.");
};

export const getTheaterCities = async () => {
  const response = await fetch(`${THEATER_API}/cities`, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse(response, "Could not load cities.");
};

export const createTheater = async (theaterData) => {
  const response = await fetch(THEATER_API, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(theaterData),
  });

  return handleResponse(response, "Could not save the theater.");
};

export const updateTheater = async (theaterId, theaterData) => {
  const response = await fetch(`${THEATER_API}/${theaterId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(theaterData),
  });

  return handleResponse(response, "Could not save the theater.");
};

export const deleteTheaterAPI = async (theaterId) => {
  const response = await fetch(`${THEATER_API}/${theaterId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return handleResponse(response, "Could not delete the theater.");
};

// ROOM API

const ROOM_API = `${BASE_URL}/admin/rooms`;

export const getTheaterRooms = async (theaterId) => {
  const response = await fetch(`${THEATER_API}/${theaterId}/rooms`, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse(response, "Could not load rooms.");
};

export const createRoom = async (theaterId, roomData) => {
  const response = await fetch(`${THEATER_API}/${theaterId}/rooms`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(roomData),
  });

  return handleResponse(response, "Could not save the room.");
};

export const updateRoom = async (roomId, roomData) => {
  const response = await fetch(`${ROOM_API}/${roomId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(roomData),
  });

  return handleResponse(response, "Could not save the room.");
};

export const deleteRoomAPI = async (roomId) => {
  const response = await fetch(`${ROOM_API}/${roomId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return handleResponse(response, "Could not delete the room.");
};
// Showtimes
// Bookings