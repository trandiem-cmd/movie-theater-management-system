function isValidId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function validateCreateReservation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object" };
  }

  const { showtimeId, seatIds } = input;

  // Validate showtime ID
  if (!isValidId(showtimeId)) {
    return { error: "Invalid showtime ID" };
  }

  // Validate selected seats
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return { error: "Select at least one seat" };
  }

  if (seatIds.some((id) => !isValidId(id))) {
    return { error: "Invalid seat ID" };
  }

  // Prevent duplicate seat IDs
  if (new Set(seatIds).size !== seatIds.length) {
    return { error: "Duplicate seat IDs are not allowed" };
  }

  return {
    value: {
      showtimeId,
      seatIds,
    },
  };
}
