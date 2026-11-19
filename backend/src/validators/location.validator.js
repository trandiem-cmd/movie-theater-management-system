export function validateId(id) {
  const value = Number(id);

  return Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

export function validateTheater(data, { partial = false } = {}) {
  const allowedFields = [
    "name",
    "address",
    "city",
    "phone",
    "email",
    "description",
    "image_url",
    "status",
  ];

  const value = {};

  for (const field of allowedFields) {
    if (data[field] === undefined) continue;

    const fieldValue = data[field];

    if (fieldValue === null) {
      if (["name", "address", "city", "status"].includes(field)) {
        return { error: `${field} cannot be null` };
      }

      value[field] = null;
      continue;
    }

    if (typeof fieldValue !== "string") {
      return { error: `${field} must be a string` };
    }

    const trimmedValue = fieldValue.trim();

    if (
      ["name", "address", "city"].includes(field) &&
      !trimmedValue
    ) {
      return { error: `${field} cannot be empty` };
    }

    if (field === "status") {
      if (!["active", "inactive"].includes(trimmedValue)) {
        return {
          error: "Status must be active or inactive",
        };
      }
    }

    value[field] = trimmedValue;
  }

  if (Object.keys(value).length === 0) {
    return { error: "At least one valid field is required" };
  }

  if (!partial) {
    for (const field of ["name", "address", "city"]) {
      if (!value[field]) {
        return { error: `${field} is required` };
      }
    }
  }

  return { value };
}

export function validateRoom(data, { partial = false } = {}) {
  const allowedFields = ["name", "capacity", "status"];
  const value = {};

  for (const field of allowedFields) {
    if (data[field] === undefined) continue;

    if (field === "name") {
      if (typeof data.name !== "string" || !data.name.trim()) {
        return {
          error: "Room name must be a non-empty string",
        };
      }

      value.name = data.name.trim();
    }

    if (field === "capacity") {
      const capacity = Number(data.capacity);

      if (!Number.isSafeInteger(capacity) || capacity <= 0) {
        return {
          error: "Capacity must be a positive integer",
        };
      }

      value.capacity = capacity;
    }

    if (field === "status") {
      if (!["active", "inactive"].includes(data.status)) {
        return {
          error: "Status must be active or inactive",
        };
      }

      value.status = data.status;
    }
  }

  if (Object.keys(value).length === 0) {
    return { error: "At least one valid field is required" };
  }

  if (!partial) {
    for (const field of ["name", "capacity"]) {
      if (value[field] === undefined) {
        return { error: `${field} is required` };
      }
    }
  }

  return { value };
}