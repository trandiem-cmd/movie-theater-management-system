
import pool from "../config/database.js";
import { validateId, validateTheater, validateRoom } from '../validators/location.validator.js'

// GET /api/admin/theaters/cities
// Get all distinct cities, including inactive theaters
export async function getAdminCities(req, res) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT city
       FROM theaters
       ORDER BY city ASC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((row) => row.city),
    });
  } catch (error) {
    console.error("Admin: Error fetching cities:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
    });
  }
}

// GET /api/admin/theaters?city=Oulu
// Get all theaters or filter by city
export async function getAdminTheaters(req, res) {
  try {
    const city =
      typeof req.query.city === "string"
        ? req.query.city.trim()
        : "";

    let query = `
      SELECT *
      FROM theaters
    `;

    const values = [];

    if (city) {
      query += " WHERE LOWER(city) = LOWER($1)";
      values.push(city);
    }

    query += " ORDER BY theater_id DESC";

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Admin: Error fetching theaters:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch theaters",
    });
  }
}

// GET /api/admin/theaters/:theaterId
// Get theater details
export async function getTheaterById(req, res) {
  const id = validateId(req.params.theaterId);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid theater ID",
    });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM theaters
       WHERE theater_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Theater not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error fetching theater:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch theater",
    });
  }
}

// POST /api/admin/theaters
// Create theater
export async function createTheater(req, res) {
  const validation = validateTheater(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const theater = validation.value;

    const result = await pool.query(
      `INSERT INTO theaters (
        name,
        address,
        city,
        phone,
        email,
        description,
        image_url,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        theater.name,
        theater.address,
        theater.city,
        theater.phone ?? null,
        theater.email ?? null,
        theater.description ?? null,
        theater.image_url ?? null,
        theater.status ?? "active",
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Theater created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error creating theater:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This theater already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create theater",
    });
  }
}

// PUT /api/admin/theaters/:theaterId
// Update theater
export async function updateTheater(req, res) {
  const id = validateId(req.params.theaterId);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid theater ID",
    });
  }

  const validation = validateTheater(req.body, {
    partial: true,
  });

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const theater = validation.value;
    const fields = Object.keys(theater);
    const values = Object.values(theater);

    const setClauses = fields.map(
      (field, index) => `${field} = $${index + 1}`
    );

    values.push(id);

    const result = await pool.query(
      `UPDATE theaters
       SET ${setClauses.join(", ")},
           updated_at = NOW()
       WHERE theater_id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Theater not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Theater updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error updating theater:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This theater already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update theater",
    });
  }
}

// DELETE /api/admin/theaters/:theaterId
// Delete theater only if it has no rooms
export async function deleteTheater(req, res) {
  const id = validateId(req.params.theaterId);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid theater ID",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM theaters
       WHERE theater_id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM rooms
           WHERE rooms.theater_id = theaters.theater_id
         )
       RETURNING theater_id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      const theaterResult = await pool.query(
        `SELECT theater_id
         FROM theaters
         WHERE theater_id = $1`,
        [id]
      );

      if (theaterResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Theater not found",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Cannot delete this theater because it still has rooms",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Theater deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error deleting theater:", error);

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "This theater is referenced by existing records",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete theater",
    });
  }
}

// GET /api/admin/theaters/:theaterId/rooms
// Get all rooms of a theater, including inactive rooms
export async function getTheaterRooms(req, res) {
  const theaterId = validateId(req.params.theaterId);

  if (!theaterId) {
    return res.status(400).json({
      success: false,
      message: "Invalid theater ID",
    });
  }

  try {
    const theaterResult = await pool.query(
      `SELECT theater_id
       FROM theaters
       WHERE theater_id = $1`,
      [theaterId]
    );

    if (theaterResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Theater not found",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM rooms
       WHERE theater_id = $1
       ORDER BY room_id ASC`,
      [theaterId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Admin: Error fetching rooms:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    });
  }
}

// POST /api/admin/theaters/:theaterId/rooms
// Create room
export async function createRoom(req, res) {
  const theaterId = validateId(req.params.theaterId);

  if (!theaterId) {
    return res.status(400).json({
      success: false,
      message: "Invalid theater ID",
    });
  }

  const validation = validateRoom(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const room = validation.value;

    const result = await pool.query(
      `INSERT INTO rooms (
        theater_id,
        name,
        capacity,
        status
      )
      SELECT $1, $2, $3, $4
      WHERE EXISTS (
        SELECT 1
        FROM theaters
        WHERE theater_id = $1
      )
      RETURNING *`,
      [
        theaterId,
        room.name,
        room.capacity,
        room.status ?? "active",
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Theater not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error creating room:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "A room with this name already exists in this theater",
      });
    }

    if (error.code === "23503") {
      return res.status(404).json({
        success: false,
        message: "Theater not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
}

// PUT /api/admin/rooms/:roomId
// Update room
export async function updateRoom(req, res) {
  const id = validateId(req.params.roomId);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid room ID",
    });
  }

  const validation = validateRoom(req.body, {
    partial: true,
  });

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const room = validation.value;
    const fields = Object.keys(room);
    const values = Object.values(room);

    const setClauses = fields.map(
      (field, index) => `${field} = $${index + 1}`
    );

    values.push(id);

    const result = await pool.query(
      `UPDATE rooms
       SET ${setClauses.join(", ")}
       WHERE room_id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Room updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error updating room:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "A room with this name already exists in this theater",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update room",
    });
  }
}

// DELETE /api/admin/rooms/:roomId
// Delete room
export async function deleteRoom(req, res) {
  const id = validateId(req.params.roomId);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Invalid room ID",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM rooms
       WHERE room_id = $1
       RETURNING room_id, theater_id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error deleting room:", error);

    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "This room cannot be deleted because it is referenced by existing records",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete room",
    });
  }
}
