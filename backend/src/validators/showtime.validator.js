
const REQUIRED_FIELDS = [
  "movie_id",
  "room_id",
  "door_open_time",
  "base_price",
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);

function validateId(value, fieldName) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return `${fieldName} must be a positive integer`;
  }

  return null;
}

function validateTimestamp(value, fieldName) {
  if (typeof value !== "string") {
    return `${fieldName} must be a date-time string`;
  }

  // Require an explicit timezone (Z or +02:00, for example).
  const hasTimezone =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i;

  if (!hasTimezone.test(value) || Number.isNaN(Date.parse(value))) {
    return `${fieldName} must be a valid ISO date-time with a timezone`;
  }

  return null;
}

export function validateShowtime(data, { partial = false } = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      error: "Request body must be a valid object",
    };
  }

  const fields = Object.keys(data);

  if (fields.length === 0) {
    return {
      error: "At least one showtime field is required",
    };
  }

  const unknownFields = fields.filter(
    (field) => !ALLOWED_FIELDS.has(field)
  );

  if (unknownFields.length > 0) {
    return {
      error: `Unsupported field(s): ${unknownFields.join(", ")}`,
    };
  }

  if (!partial) {
    const missingFields = REQUIRED_FIELDS.filter(
      (field) => data[field] === undefined
    );

    if (missingFields.length > 0) {
      return {
        error: `Missing required field(s): ${missingFields.join(", ")}`,
      };
    }
  }

  const value = {};

  // Validate movie ID.
  if (data.movie_id !== undefined) {
    const error = validateId(data.movie_id, "movie_id");

    if (error) return { error };

    value.movie_id = Number(data.movie_id);
  }

  // Validate room ID.
  if (data.room_id !== undefined) {
    const error = validateId(data.room_id, "room_id");

    if (error) return { error };

    value.room_id = Number(data.room_id);
  }

  // Validate door-opening time.
  if (data.door_open_time !== undefined) {
    const error = validateTimestamp(
      data.door_open_time,
      "door_open_time"
    );

    if (error) return { error };

    value.door_open_time = new Date(
      data.door_open_time
    ).toISOString();
  }

  // Validate base price.
  if (data.base_price !== undefined) {
    const price = Number(data.base_price);

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      price > 99999999.99 ||
      Math.abs(price * 100 - Math.round(price * 100)) > 0.000001
    ) {
      return {
        error:
          "base_price must be a non-negative amount with at most two decimal places",
      };
    }

    value.base_price = price;
  }

  return { value };
}
