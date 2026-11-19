
import pool from "../config/database.js";
import { validateShowtime } from "../validators/showtime.validator.js";

// POST /api/admin/showtimes
export async function createShowtime(req, res) {
  const validation = validateShowtime(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  const showtime = validation.value;

  // Prevent creating showtimes in the past.
  if (new Date(showtime.start_time).getTime() <= Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Showtime must be scheduled for a future date and time.",
    });
  }

  const client = await pool.connect();
    try {
      await client.query("BEGIN");

    // Lock the room row to serialize schedule changes for this room.
    const roomResult = await client.query(
      `SELECT room_id
       FROM rooms
       WHERE room_id = $1
       AND status = 'active'
       FOR UPDATE`,
      [showtime.room_id]
    );

    if (roomResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Active screening room not found",
      });
    }

    // Check that the selected movie exists.
    const movieResult = await client.query(
      `SELECT movie_id
       FROM movies
       WHERE movie_id = $1`,
      [showtime.movie_id]
    );

    if (movieResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    // Prevent overlapping scheduled showtimes in the same room.
    const conflictResult = await client.query(
      `SELECT showtime_id
       FROM showtimes
       WHERE room_id = $1
       AND status = 'scheduled'
       AND start_time < $3::timestamptz
       AND end_time > $2::timestamptz
       LIMIT 1`,
      [
        showtime.room_id,
        showtime.start_time,
        showtime.end_time,
      ]
    );

    if (conflictResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "This auditorium already has a showtime during the selected period.",
      });
    }

    const result = await client.query(
      `INSERT INTO showtimes (
        movie_id,
        room_id,
        start_time,
        end_time,
        base_price
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        showtime.movie_id,
        showtime.room_id,
        showtime.start_time,
        showtime.end_time,
        showtime.base_price,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Showtime created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Admin: Error creating showtime:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create showtime",
    });
  } finally {
    client.release();
  }
}

// PUT /api/admin/showtimes/:id
export async function updateShowtime(req, res) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid showtime ID",
    });
  }

  const validation = validateShowtime(req.body, { partial: true });

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Read the existing showtime.
    const existingResult = await client.query(
      `SELECT *
       FROM showtimes
       WHERE showtime_id = $1
       FOR UPDATE`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Showtime not found",
      });
    }

    const existing = existingResult.rows[0];

    if (
      existing.status !== "scheduled" &&
      existing.status !== "cancelled"
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Only scheduled or cancelled showtimes can be updated",
      });
    }

    const showtime = {
      movie_id: validation.value.movie_id ?? existing.movie_id,
      room_id: validation.value.room_id ?? existing.room_id,
      start_time: validation.value.start_time ?? existing.start_time,
      end_time: validation.value.end_time ?? existing.end_time,
      base_price: validation.value.base_price ?? existing.base_price,
    };
    // Prevent editing or rescheduling to a past date or time.
    if (new Date(showtime.start_time).getTime() <= Date.now()) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Showtime must be scheduled for a future date and time.",
      });
    }
    if (
      new Date(showtime.end_time) <= new Date(showtime.start_time)
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "end_time must be later than start_time",
      });
    }

    // Lock the target room. When changing rooms, also lock the old room
    // so other schedule updates cannot race against this operation.
    const roomIds = [...new Set([existing.room_id, showtime.room_id])]
      .sort((a, b) => a - b);

    for (const roomId of roomIds) {
      const roomResult = await client.query(
        `SELECT room_id
         FROM rooms
         WHERE room_id = $1
         FOR UPDATE`,
        [roomId]
      );

      if (roomResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Screening room not found",
        });
      }
    }

    const targetRoom = await client.query(
      `SELECT room_id
       FROM rooms
       WHERE room_id = $1
       AND status = 'active'`,
      [showtime.room_id]
    );

    if (targetRoom.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "The selected screening room is inactive",
      });
    }

    const movieResult = await client.query(
      `SELECT movie_id
       FROM movies
       WHERE movie_id = $1`,
      [showtime.movie_id]
    );

    if (movieResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const conflictResult = await client.query(
      `SELECT showtime_id
       FROM showtimes
       WHERE room_id = $1
       AND showtime_id <> $2
       AND status = 'scheduled'
       AND start_time < $4::timestamptz
       AND end_time > $3::timestamptz
       LIMIT 1`,
      [
        showtime.room_id,
        id,
        showtime.start_time,
        showtime.end_time,
      ]
    );

    if (conflictResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "This auditorium already has a showtime during the selected period.",
      });
    }

    const result = await client.query(
        `UPDATE showtimes
        SET movie_id = $1,
            room_id = $2,
            start_time = $3,
            end_time = $4,
            base_price = $5,
            status = 'scheduled'
        WHERE showtime_id = $6
        RETURNING *`,

      [
        showtime.movie_id,
        showtime.room_id,
        showtime.start_time,
        showtime.end_time,
        showtime.base_price,
        id,
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Showtime updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Admin: Error updating showtime:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update showtime",
    });
  } finally {
    client.release();
  }
}

// DELETE /api/admin/showtimes/:id
// Cancellation is a status update, not a physical deletion.
export async function cancelShowtime(req, res) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid showtime ID",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT *
       FROM showtimes
       WHERE showtime_id = $1
       FOR UPDATE`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Showtime not found",
      });
    }

    const existing = existingResult.rows[0];

    if (existing.status !== "scheduled") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Only scheduled showtimes can be cancelled",
      });
    }

    // Lock the room to coordinate with other schedule operations.
    await client.query(
      `SELECT room_id
       FROM rooms
       WHERE room_id = $1
       FOR UPDATE`,
      [existing.room_id]
    );

    const result = await client.query(
      `UPDATE showtimes
       SET status = 'cancelled'
       WHERE showtime_id = $1
       RETURNING *`,
      [id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Showtime cancelled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Admin: Error cancelling showtime:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel showtime",
    });
  } finally {
    client.release();
  }
}

// GET /api/admin/showtimes
export async function getAdminShowtimes(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         s.showtime_id,
         s.movie_id,
         m.title AS movie_title,
         m.duration AS movie_duration,
         s.room_id,
         r.name AS room_name,
         t.theater_id,
         t.name AS theater_name,
         t.city,
         s.start_time,
         s.end_time,
         s.base_price,
         s.status,
         s.created_at
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.movie_id
       JOIN rooms r ON s.room_id = r.room_id
       JOIN theaters t ON r.theater_id = t.theater_id
       ORDER BY s.start_time ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Admin: Error fetching showtimes:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve showtimes",
    });
  }
}

/* Get customer showtimes */
export async function getCustomerShowtimes(req, res) {
  try {
    const movieId = Number(req.params.id);

    if (!Number.isSafeInteger(movieId) || movieId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie ID.",
      });
    }

    const result = await pool.query(
      `
        SELECT
          s.showtime_id,
          s.movie_id,
          s.start_time,
          s.end_time,
          s.base_price,
          s.status,
          r.room_id,
          r.name AS room_name,
          t.theater_id,
          t.name AS theater_name,
          t.city
        FROM showtimes s
        JOIN rooms r
          ON s.room_id = r.room_id
        JOIN theaters t
          ON r.theater_id = t.theater_id
        WHERE s.movie_id = $1
          AND s.status = 'scheduled'
          AND s.start_time > NOW()
          AND (s.start_time AT TIME ZONE 'Europe/Helsinki')::date
              >= (NOW() AT TIME ZONE 'Europe/Helsinki')::date
          AND (s.start_time AT TIME ZONE 'Europe/Helsinki')::date
              < (NOW() AT TIME ZONE 'Europe/Helsinki')::date + 7
        ORDER BY s.start_time ASC
      `,
      [movieId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get customer showtimes error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load showtimes.",
    });
  }
}

