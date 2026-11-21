
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

  // Prevent creating showtimes with door-opening times in the past.
  if (new Date(showtime.door_open_time).getTime() <= Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Door-opening time must be scheduled for a future date and time.",
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

    // Get the selected movie and its duration.
    const movieResult = await client.query(
      `SELECT movie_id, duration
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

    const movieDuration = Number(movieResult.rows[0].duration);

    if (!Number.isFinite(movieDuration) || movieDuration <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "The selected movie has an invalid duration.",
      });
    }

    // Calculate actual movie start and end times.
    const doorOpenTime = new Date(showtime.door_open_time);

    const movieStartTime = new Date(
      doorOpenTime.getTime() + 27 * 60 * 1000
    );

    const movieEndTime = new Date(
      movieStartTime.getTime() + movieDuration * 60 * 1000
    );

    // Check conflicts from door opening until movie end.
    const conflictResult = await client.query(
      `SELECT showtime_id
       FROM showtimes
       WHERE room_id = $1
       AND status = 'scheduled'
       AND door_open_time < $3::timestamptz
       AND end_time > $2::timestamptz
       LIMIT 1`,
      [
        showtime.room_id,
        showtime.door_open_time,
        movieEndTime.toISOString(),
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

    // Insert the complete screening schedule.
    const result = await client.query(
      `INSERT INTO showtimes (
        movie_id,
        room_id,
        door_open_time,
        start_time,
        end_time,
        base_price
      )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        showtime.movie_id,
        showtime.room_id,
        showtime.door_open_time,
        movieStartTime.toISOString(),
        movieEndTime.toISOString(),
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

    // Read and lock the existing showtime.
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

    // Use submitted values or keep the existing values.
    const showtime = {
      movie_id: validation.value.movie_id ?? existing.movie_id,
      room_id: validation.value.room_id ?? existing.room_id,
      door_open_time:
        validation.value.door_open_time ??
        existing.door_open_time,
      base_price: validation.value.base_price ?? existing.base_price,
    };

    // Prevent editing or rescheduling to a past door-opening time.
    if (new Date(showtime.door_open_time).getTime() <= Date.now()) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Door-opening time must be scheduled for a future date and time.",
      });
    }

    // Lock old and new rooms in a consistent order.
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

    // Ensure the target room is active.
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

    // Get the selected movie and its duration.
    const movieResult = await client.query(
      `SELECT movie_id, duration
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

    const movieDuration = Number(movieResult.rows[0].duration);

    if (!Number.isFinite(movieDuration) || movieDuration <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "The selected movie has an invalid duration.",
      });
    }

    // Recalculate actual movie start and end times.
    const doorOpenTime = new Date(showtime.door_open_time);

    const movieStartTime = new Date(
      doorOpenTime.getTime() + 27 * 60 * 1000
    );

    const movieEndTime = new Date(
      movieStartTime.getTime() + movieDuration * 60 * 1000
    );

    // Check for conflicts, excluding the showtime being edited.
    const conflictResult = await client.query(
      `SELECT showtime_id
       FROM showtimes
       WHERE room_id = $1
       AND showtime_id <> $2
       AND status = 'scheduled'
       AND door_open_time < $4::timestamptz
       AND end_time > $3::timestamptz
       LIMIT 1`,
      [
        showtime.room_id,
        id,
        showtime.door_open_time,
        movieEndTime.toISOString(),
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

    // Update the complete screening schedule.
    const result = await client.query(
      `UPDATE showtimes
       SET movie_id = $1,
           room_id = $2,
           door_open_time = $3,
           start_time = $4,
           end_time = $5,
           base_price = $6,
           status = 'scheduled'
       WHERE showtime_id = $7
       RETURNING *`,
      [
        showtime.movie_id,
        showtime.room_id,
        showtime.door_open_time,
        movieStartTime.toISOString(),
        movieEndTime.toISOString(),
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
    // Mark showtimes from previous Helsinki calendar days as completed.
    // Cancelled and already completed showtimes are not changed.
    await pool.query(
      `UPDATE showtimes
       SET status = 'completed'
       WHERE status = 'scheduled'
       AND (door_open_time AT TIME ZONE 'Europe/Helsinki')::date
           < (NOW() AT TIME ZONE 'Europe/Helsinki')::date`
    );

    // Retrieve all showtimes, including completed and cancelled ones.
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
         s.door_open_time,
         s.door_open_time + INTERVAL '15 minutes'
           AS advertisement_start_time,
         s.start_time,
         s.end_time,
         s.base_price,
         s.status,
         s.created_at
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.movie_id
       JOIN rooms r ON s.room_id = r.room_id
       JOIN theaters t ON r.theater_id = t.theater_id
       ORDER BY s.door_open_time ASC`
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
          s.door_open_time,
          s.door_open_time + INTERVAL '15 minutes'
            AS advertisement_start_time,
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
