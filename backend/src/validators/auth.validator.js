function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateRegister(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Request body must be a JSON object' }
  }

  const user = {
    full_name: cleanText(input.full_name),
    email: cleanText(input.email).toLowerCase(),
    password: input.password,
    phone: input.phone === undefined || input.phone === null
      ? null
      : cleanText(input.phone),
    date_of_birth: input.date_of_birth || null,
  }

  // Required fields
  if (!user.full_name || !user.email || !user.password) {
    return { error: 'full_name, email and password are required' }
  }

  // Full name
  if (user.full_name.length > 100) {
    return { error: 'full_name must not exceed 100 characters' }
  }

  // Email
  if (
    typeof user.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) ||
    user.email.length > 255
  ) {
    return { error: 'email must be a valid email address' }
  }

  // Password
  if (typeof user.password !== 'string' || user.password.length < 8) {
    return { error: 'password must be at least 8 characters' }
  }

  // Phone
  if (user.phone !== null && user.phone.length > 20) {
    return { error: 'phone must not exceed 20 characters' }
  }

  // Date of birth
  if (user.date_of_birth !== null) {
    if (
      typeof user.date_of_birth !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(user.date_of_birth)
    ) {
      return { error: 'date_of_birth must use YYYY-MM-DD format' }
    }

    const date = new Date(`${user.date_of_birth}T00:00:00.000Z`)

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== user.date_of_birth
    ) {
      return { error: 'date_of_birth must be a valid date' }
    }
  }

  return { value: user }
}

export function validateLogin(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Request body must be a JSON object' }
  }

  const credentials = {
    email: cleanText(input.email).toLowerCase(),
    password: input.password,
  }

  if (!credentials.email || !credentials.password) {
    return { error: 'Email and password are required' }
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email) ||
    credentials.email.length > 255
  ) {
    return { error: 'Invalid email format' }
  }

  if (typeof credentials.password !== 'string') {
    return { error: 'Password must be a string' }
  }

  if (credentials.password.length === 0) {
    return { error: 'Password is required' }
  }

  return { value: credentials }
}

export function validateUpdateProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Request body must be a JSON object' }
  }

  const profile = {
    full_name: cleanText(input.full_name),
    phone: input.phone === undefined || input.phone === null
      ? null
      : cleanText(input.phone),
    date_of_birth: input.date_of_birth || null,
  }

  // Required fields
  if (!profile.full_name) {
    return { error: 'full_name is required' }
  }

  // Full name
  if (profile.full_name.length > 100) {
    return { error: 'full_name must not exceed 100 characters' }
  }

  // Phone
  if (profile.phone !== null && profile.phone.length > 20) {
    return { error: 'phone must not exceed 20 characters' }
  }

  // Date of birth
  if (profile.date_of_birth !== null) {
    if (
      typeof profile.date_of_birth !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(profile.date_of_birth)
    ) {
      return { error: 'date_of_birth must use YYYY-MM-DD format' }
    }

    const date = new Date(`${profile.date_of_birth}T00:00:00.000Z`)

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== profile.date_of_birth
    ) {
      return { error: 'date_of_birth must be a valid date' }
    }
  }

  return { value: profile }
}

export function validateChangePassword(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object" };
  }

  const { current_password, new_password, confirm_password } = input;

  if (!current_password || !new_password || !confirm_password) {
    return {
      error: "All password fields are required",
    };
  }

  if (
    typeof current_password !== "string" ||
    typeof new_password !== "string" ||
    typeof confirm_password !== "string"
  ) {
    return { error: "Passwords must be strings" };
  }

  if (new_password.length < 8) {
    return {
      error: "New password must be at least 8 characters",
    };
  }

  if (new_password !== confirm_password) {
    return {
      error: "New password and confirm password do not match",
    };
  }

  if (current_password === new_password) {
    return {
      error: "New password must be different from current password",
    };
  }

  return {
    value: {
      current_password,
      new_password,
    },
  };
}