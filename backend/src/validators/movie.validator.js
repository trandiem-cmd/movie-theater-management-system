
const ALLOWED_FIELDS = [
  "tmdb_id",
  "title",
  "description",
  "duration",
  "director",
  "cast_members",
  "language",
  "age_rating",
  "genre",
  "subtitles",
  "poster_url",
  "trailer_url",
  "release_date",
  "status",
];

const ALLOWED_STATUSES = ["coming_soon", "now_showing", "ended"];

function cleanOptionalText(value, field, maxLength = Infinity) {
  if (value === null || value === "") {
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: `${field} must be text or null` };
  }

  const cleaned = value.trim();

  if (cleaned.length > maxLength) {
    return { error: `${field} must not exceed ${maxLength} characters` };
  }

  return { value: cleaned || null };
}

function validateDate(value) {
  if (value === null || value === "") {
    return { value: null };
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return { error: "release_date must use YYYY-MM-DD format" };
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return { error: "release_date must be a valid date" };
  }

  return { value };
}

function validateStringArray(value, field) {
  if (!Array.isArray(value)) {
    return { error: `${field} must be an array of strings` };
  }

  if (!value.every((item) => typeof item === "string" && item.trim())) {
    return { error: `${field} must contain only non-empty strings` };
  }

  return { value: value.map((item) => item.trim()) };
}

export function validateMovie(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object" };
  }

  const unknownFields = Object.keys(input).filter(
    (field) => !ALLOWED_FIELDS.includes(field)
  );

  if (unknownFields.length > 0) {
    return {
      error: `Unknown field(s): ${unknownFields.join(", ")}`,
    };
  }

  if (!partial && (!input.title || !input.duration)) {
    return { error: "title and duration are required" };
  }

  if (partial && Object.keys(input).length === 0) {
    return { error: "At least one field must be provided for update" };
  }

  const movie = {};

  // Title
  if (!partial || Object.hasOwn(input, "title")) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      return { error: "title is required and must be text" };
    }

    if (input.title.trim().length > 255) {
      return { error: "title must not exceed 255 characters" };
    }

    movie.title = input.title.trim();
  }

  // Duration
  if (!partial || Object.hasOwn(input, "duration")) {
    const duration = Number(input.duration);

    if (
      input.duration === "" ||
      !Number.isSafeInteger(duration) ||
      duration <= 0
    ) {
      return { error: "duration must be a positive whole number" };
    }

    movie.duration = duration;
  }

  // Optional text fields
  const textFields = {
    description: Infinity,
    director: 150,
    cast_members: Infinity,
    language: 100,
    age_rating: 20,
    poster_url: Infinity,
    trailer_url: Infinity,
  };

  for (const [field, maxLength] of Object.entries(textFields)) {
    if (!partial || Object.hasOwn(input, field)) {
      const result = cleanOptionalText(input[field], field, maxLength);

      if (result.error) return result;

      movie[field] = result.value;
    }
  }

  // TMDB ID
  if (!partial || Object.hasOwn(input, "tmdb_id")) {
    const value = input.tmdb_id;

    if (value === null || value === "") {
      movie.tmdb_id = null;
    } else {
      const tmdbId = Number(value);

      if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
        return { error: "tmdb_id must be a positive whole number or null" };
      }

      movie.tmdb_id = tmdbId;
    }
  }

  // Genre and subtitles are PostgreSQL TEXT[] fields
  for (const field of ["genre", "subtitles"]) {
    if (!partial || Object.hasOwn(input, field)) {
      const result = validateStringArray(input[field] ?? [], field);

      if (result.error) return result;

      movie[field] = result.value;
    }
  }

  // Release date
  if (!partial || Object.hasOwn(input, "release_date")) {
    const result = validateDate(input.release_date);

    if (result.error) return result;

    movie.release_date = result.value;
  }

  // Status
  if (!partial || Object.hasOwn(input, "status")) {
    const status = input.status ?? "coming_soon";

    if (!ALLOWED_STATUSES.includes(status)) {
      return {
        error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      };
    }

    movie.status = status;
  }

  return { value: movie };
}
