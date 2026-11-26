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


/* Seat Management */

// Get room seats
export const getRoomSeats = async (roomId) => {
  const response = await fetch(`${BASE_URL}/rooms/${roomId}/seats`, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse(response, "Failed to load room seats");
};

// Get showtime seat availability
export const getShowtimeSeats = async (showtimeId) => {
  const response = await fetch(
    `${BASE_URL}/showtimes/${showtimeId}/seats`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  return handleResponse(response, "Failed to load showtime seats");
};

// Add seats
export const addRoomSeats = async (roomId, seats) => {
  const response = await fetch(`${BASE_URL}/admin/rooms/${roomId}/seats`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ seats }),
  });

  return handleResponse(response, "Failed to add seats");
};

// Generate complete seat layout
export const generateSeatLayout = async (roomId) => {
  const response = await fetch(
    `${BASE_URL}/admin/rooms/${roomId}/generate-seats`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  return handleResponse(response, "Failed to generate seat layout");
};

// Add wheelchair space
export const addWheelchairSpace = async (roomId, spaceNumber) => {
  const response = await fetch(
    `${BASE_URL}/admin/rooms/${roomId}/wheelchair-spaces`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ spaceNumber }),
    }
  );

  return handleResponse(response, "Failed to add wheelchair space");
};

// Update seat
export const updateSeat = async (seatId, seatData) => {
  const response = await fetch(`${BASE_URL}/admin/seats/${seatId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(seatData),
  });

  return handleResponse(response, "Failed to update seat");
};

// Update wheelchair space
export const updateWheelchairSpace = async (spaceId, status) => {
  const response = await fetch(
    `${BASE_URL}/admin/wheelchair-spaces/${spaceId}`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  return handleResponse(response, "Failed to update wheelchair space");
};

// Delete one seat
export const deleteSeat = async (seatId) => {
  const response = await fetch(`${BASE_URL}/admin/seats/${seatId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return handleResponse(response, "Failed to delete seat");
};

// Delete wheelchair space
export const deleteWheelchairSpace = async (spaceId) => {
  const response = await fetch(
    `${BASE_URL}/admin/wheelchair-spaces/${spaceId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  return handleResponse(response, "Failed to delete wheelchair space");
};

// Delete one row
export const deleteSeatRow = async (roomId, rowNumber) => {
  const response = await fetch(
    `${BASE_URL}/admin/rooms/${roomId}/rows/${rowNumber}/seats`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  return handleResponse(response, "Failed to delete row");
};

// Delete multiple rows
export const deleteSeatRows = async (roomId, rowNumbers) => {
  const response = await fetch(
    `${BASE_URL}/admin/rooms/${roomId}/rows/seats`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rowNumbers }),
    }
  );

  return handleResponse(response, "Failed to delete selected rows");
};

// Get admin rooms
export const getAdminRooms = async () => {
  const response = await fetch(`${BASE_URL}/admin/rooms`, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse(response, "Failed to load rooms");
};

// Get admin showtimes
export const getAdminShowtimes = async () => {
  const response = await fetch(`${BASE_URL}/admin/showtimes`, {
    method: "GET",
    credentials: "include",
  });

  return handleResponse(response, "Failed to load showtimes");
};



// Movies
// Theaters
// Seats
// Showtimes
// Bookings
