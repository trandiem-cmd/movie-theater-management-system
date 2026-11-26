import pool from "../config/database.js";

const isValidId = (value) =>
  Number.isSafeInteger(value) && value > 0;

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// POST /api/reservations
export async function createReservation(req, res) {
  const {
    showtimeId,
    customerEmail,
    seatIds = [],
    wheelchairSpaceIds = [],
  } = req.body || {};

  // Validate showtime ID.
  if (!isValidId(showtimeId)) {
    return sendError(res, 400, "Invalid showtime ID");
  }

  // Validate customer email.
  if (
    typeof customerEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
  ) {
    return sendError(res, 400, "A valid customer email is required");
  }

  // Validate selected seat ID arrays.
  if (
    !Array.isArray(seatIds) ||
    !Array.isArray(wheelchairSpaceIds) ||
    seatIds.some((id) => !isValidId(id)) ||
    wheelchairSpaceIds.some((id) => !isValidId(id))
  ) {
    return sendError(res, 400, "Invalid seat selection");
  }

  // Reject duplicate IDs.
  if (
    new Set(seatIds).size !== seatIds.length ||
    new Set(wheelchairSpaceIds).size !== wheelchairSpaceIds.length
  ) {
    return sendError(res, 400, "Duplicate seats are not allowed");
  }

  const totalSelected = seatIds.length + wheelchairSpaceIds.length;

  if (totalSelected === 0) {
    return sendError(res, 400, "Select at least one seat");
  }

  // Maximum six tickets per ordinary booking.
  if (totalSelected > 6) {
    return sendError(
      res,
      400,
      "A maximum of six tickets can be reserved"
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the showtime so simultaneous reservation requests
    // for this screening are processed safely.
    const showtimeResult = await client.query(
      `SELECT showtime_id, room_id, status, start_time
       FROM showtimes
       WHERE showtime_id = $1
       FOR UPDATE`,
      [showtimeId]
    );

    if (showtimeResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Showtime not found");
    }

    const showtime = showtimeResult.rows[0];

    if (
      showtime.status !== "scheduled" ||
      new Date(showtime.start_time) <= new Date()
    ) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        400,
        "This showtime is no longer available"
      );
    }

    // Mark expired reservations.
    await client.query(
      `UPDATE reservations
       SET status = 'expired'
       WHERE status = 'active'
         AND expires_at <= NOW()`
    );

    // Release seats belonging to expired or cancelled reservations.
    await client.query(
      `UPDATE showtime_seat_allocations
       SET status = 'released',
           reservation_id = NULL,
           expires_at = NULL
       WHERE status = 'held'
         AND (
           expires_at <= NOW()
           OR reservation_id IN (
             SELECT reservation_id
             FROM reservations
             WHERE status IN ('expired', 'cancelled')
           )
         )`
    );

    // Check regular seats belong to this room and are active.
    if (seatIds.length > 0) {
      const seatsResult = await client.query(
        `SELECT seat_id, status
         FROM seats
         WHERE room_id = $1
           AND seat_id = ANY($2::int[])
         ORDER BY seat_id
         FOR UPDATE`,
        [showtime.room_id, seatIds]
      );

      if (seatsResult.rows.length !== seatIds.length) {
        await client.query("ROLLBACK");
        return sendError(
          res,
          400,
          "One or more selected seats do not belong to this showtime"
        );
      }

      if (
        seatsResult.rows.some(
          (seat) => seat.status !== "active"
        )
      ) {
        await client.query("ROLLBACK");
        return sendError(
          res,
          400,
          "One or more selected seats are unavailable"
        );
      }
    }

    // Check wheelchair spaces belong to this room and are active.
    if (wheelchairSpaceIds.length > 0) {
      const spacesResult = await client.query(
        `SELECT wheelchair_space_id, status
         FROM wheelchair_spaces
         WHERE room_id = $1
           AND wheelchair_space_id = ANY($2::int[])
         ORDER BY wheelchair_space_id
         FOR UPDATE`,
        [showtime.room_id, wheelchairSpaceIds]
      );

      if (spacesResult.rows.length !== wheelchairSpaceIds.length) {
        await client.query("ROLLBACK");
        return sendError(
          res,
          400,
          "One or more selected wheelchair spaces do not belong to this showtime"
        );
      }

      if (
        spacesResult.rows.some(
          (space) => space.status !== "active"
        )
      ) {
        await client.query("ROLLBACK");
        return sendError(
          res,
          400,
          "One or more wheelchair spaces are unavailable"
        );
      }
    }

    // Create the temporary reservation.
    const reservationResult = await client.query(
    `INSERT INTO reservations (
    user_id,
    showtime_id,
    customer_email,
    booking_method,
    status,
    expires_at
    ) VALUES ($1, $2, $3, 'online', 'active', NOW() + INTERVAL '10 minutes')
    RETURNING reservation_id, user_id, showtime_id, customer_email, status, expires_at`,
      [
    req.session?.user?.user_id ?? null,
    showtimeId,
    customerEmail.trim().toLowerCase(),
    ]
    );

    const reservation = reservationResult.rows[0];

    // Hold selected regular seats.
    for (const seatId of seatIds) {
      const allocationResult = await client.query(
        `INSERT INTO showtime_seat_allocations (
           showtime_id,
           room_id,
           seat_id,
           reservation_id,
           status,
           expires_at
         )
         VALUES ($1, $2, $3, $4, 'held', $5)
         ON CONFLICT (showtime_id, seat_id)
         WHERE seat_id IS NOT NULL
         DO UPDATE SET
           reservation_id = EXCLUDED.reservation_id,
           status = 'held',
           expires_at = EXCLUDED.expires_at
         WHERE showtime_seat_allocations.status = 'released'
         RETURNING allocation_id`,
        [
          showtimeId,
          showtime.room_id,
          seatId,
          reservation.reservation_id,
          reservation.expires_at,
        ]
      );

      if (allocationResult.rows.length === 0) {
        throw new Error("SEAT_ALREADY_RESERVED");
      }
    }

    // Hold selected wheelchair spaces.
    for (const spaceId of wheelchairSpaceIds) {
      const allocationResult = await client.query(
        `INSERT INTO showtime_seat_allocations (
           showtime_id,
           room_id,
           wheelchair_space_id,
           reservation_id,
           status,
           expires_at
         )
         VALUES ($1, $2, $3, $4, 'held', $5)
         ON CONFLICT (showtime_id, wheelchair_space_id)
         WHERE wheelchair_space_id IS NOT NULL
         DO UPDATE SET
           reservation_id = EXCLUDED.reservation_id,
           status = 'held',
           expires_at = EXCLUDED.expires_at
         WHERE showtime_seat_allocations.status = 'released'
         RETURNING allocation_id`,
        [
          showtimeId,
          showtime.room_id,
          spaceId,
          reservation.reservation_id,
          reservation.expires_at,
        ]
      );

      if (allocationResult.rows.length === 0) {
        throw new Error("SEAT_ALREADY_RESERVED");
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Seats reserved successfully",
      data: {
        reservationId: reservation.reservation_id,
        showtimeId: reservation.showtime_id,
        customerEmail: reservation.customer_email,
        status: reservation.status,
        expiresAt: reservation.expires_at,
        reservedSeatCount: totalSelected,
        seatIds,
        wheelchairSpaceIds,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error creating reservation:", error);

    // A seat may have been reserved by another customer.
    if (error.message === "SEAT_ALREADY_RESERVED") {
      return sendError(
        res,
        409,
        "One or more selected seats have just been reserved. Please refresh the seat map."
      );
    }

    // Handle database unique-constraint conflicts.
    if (error.code === "23505") {
      return sendError(
        res,
        409,
        "One or more selected seats have just been reserved. Please refresh the seat map."
      );
    }

    return sendError(
      res,
      500,
      "Failed to create reservation"
    );
  } finally {
    client.release();
  }
}

// PUT /api/reservations/:id
// Updates the seats held by an existing active reservation.
export async function updateReservation(req, res) {
  const reservationId = Number(req.params.id);

  const {
    showtimeId,
    customerEmail,
    seatIds = [],
    wheelchairSpaceIds = [],
  } = req.body || {};

  if (!isValidId(reservationId) || !isValidId(showtimeId)) {
    return sendError(res, 400, "Invalid reservation or showtime ID");
  }

  if (
    typeof customerEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
  ) {
    return sendError(res, 400, "A valid customer email is required");
  }

  if (
    !Array.isArray(seatIds) ||
    !Array.isArray(wheelchairSpaceIds) ||
    seatIds.some((id) => !isValidId(id)) ||
    wheelchairSpaceIds.some((id) => !isValidId(id))
  ) {
    return sendError(res, 400, "Invalid seat selection");
  }

  if (
    new Set(seatIds).size !== seatIds.length ||
    new Set(wheelchairSpaceIds).size !== wheelchairSpaceIds.length
  ) {
    return sendError(res, 400, "Duplicate seats are not allowed");
  }

  const totalSelected = seatIds.length + wheelchairSpaceIds.length;

  if (totalSelected === 0 || totalSelected > 6) {
    return sendError(
      res,
      400,
      "Select between one and six seats"
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the existing reservation.
    const reservationResult = await client.query(
      `SELECT reservation_id, user_id, showtime_id,
              customer_email, status, expires_at
       FROM reservations
       WHERE reservation_id = $1
       FOR UPDATE`,
      [reservationId]
    );

    if (reservationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Reservation not found");
    }

    const reservation = reservationResult.rows[0];
    const sessionUserId = req.session?.user?.user_id ?? null;

    // Only the original customer can update this reservation.
    if (
      reservation.customer_email !== customerEmail.trim().toLowerCase() ||
      Number(reservation.showtime_id) !== Number(showtimeId) ||
      (reservation.user_id == null
        ? sessionUserId != null
        : Number(reservation.user_id) !== Number(sessionUserId))
    ) {
      await client.query("ROLLBACK");
      return sendError(res, 403, "You cannot update this reservation");
    }

    if (
      reservation.status !== "active" ||
      new Date(reservation.expires_at) <= new Date()
    ) {
      await client.query("ROLLBACK");
      return sendError(res, 410, "This reservation has expired");
    }

    const showtimeResult = await client.query(
      `SELECT room_id, status, start_time
       FROM showtimes
       WHERE showtime_id = $1
       FOR UPDATE`,
      [showtimeId]
    );

    if (
      showtimeResult.rows.length === 0 ||
      showtimeResult.rows[0].status !== "scheduled" ||
      new Date(showtimeResult.rows[0].start_time) <= new Date()
    ) {
      await client.query("ROLLBACK");
      return sendError(res, 400, "This showtime is no longer available");
    }

    const roomId = showtimeResult.rows[0].room_id;

    // Verify regular seats belong to this auditorium and are active.
    if (seatIds.length > 0) {
      const result = await client.query(
        `SELECT seat_id, status
         FROM seats
         WHERE room_id = $1
           AND seat_id = ANY($2::int[])
         ORDER BY seat_id
         FOR UPDATE`,
        [roomId, seatIds]
      );

      if (
        result.rows.length !== seatIds.length ||
        result.rows.some((seat) => seat.status !== "active")
      ) {
        await client.query("ROLLBACK");
        return sendError(res, 400, "One or more selected seats are unavailable");
      }
    }

    // Verify wheelchair spaces belong to this auditorium and are active.
    if (wheelchairSpaceIds.length > 0) {
      const result = await client.query(
        `SELECT wheelchair_space_id, status
         FROM wheelchair_spaces
         WHERE room_id = $1
           AND wheelchair_space_id = ANY($2::int[])
         ORDER BY wheelchair_space_id
         FOR UPDATE`,
        [roomId, wheelchairSpaceIds]
      );

      if (
        result.rows.length !== wheelchairSpaceIds.length ||
        result.rows.some((space) => space.status !== "active")
      ) {
        await client.query("ROLLBACK");
        return sendError(
          res,
          400,
          "One or more wheelchair spaces are unavailable"
        );
      }
    }

    // Release seats removed from this reservation.
    await client.query(
      `UPDATE showtime_seat_allocations
       SET status = 'released',
           reservation_id = NULL,
           expires_at = NULL
       WHERE reservation_id = $1
         AND status = 'held'
         AND seat_id IS NOT NULL
         AND NOT (seat_id = ANY($2::int[]))`,
      [reservationId, seatIds]
    );

    // Release wheelchair spaces removed from this reservation.
    await client.query(
      `UPDATE showtime_seat_allocations
       SET status = 'released',
           reservation_id = NULL,
           expires_at = NULL
       WHERE reservation_id = $1
         AND status = 'held'
         AND wheelchair_space_id IS NOT NULL
         AND NOT (wheelchair_space_id = ANY($2::int[]))`,
      [reservationId, wheelchairSpaceIds]
    );

    // Add new seats, or keep seats already held by this reservation.
    for (const seatId of seatIds) {
      const result = await client.query(
        `INSERT INTO showtime_seat_allocations (
           showtime_id, room_id, seat_id,
           reservation_id, status, expires_at
         )
         VALUES ($1, $2, $3, $4, 'held', $5)
         ON CONFLICT (showtime_id, seat_id)
         WHERE seat_id IS NOT NULL
         DO UPDATE SET
           reservation_id = EXCLUDED.reservation_id,
           status = 'held',
           expires_at = EXCLUDED.expires_at
         WHERE showtime_seat_allocations.status = 'released'
            OR showtime_seat_allocations.reservation_id = EXCLUDED.reservation_id
         RETURNING allocation_id`,
        [
          showtimeId,
          roomId,
          seatId,
          reservationId,
          reservation.expires_at,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error("SEAT_ALREADY_RESERVED");
      }
    }

    for (const spaceId of wheelchairSpaceIds) {
      const result = await client.query(
        `INSERT INTO showtime_seat_allocations (
           showtime_id, room_id, wheelchair_space_id,
           reservation_id, status, expires_at
         )
         VALUES ($1, $2, $3, $4, 'held', $5)
         ON CONFLICT (showtime_id, wheelchair_space_id)
         WHERE wheelchair_space_id IS NOT NULL
         DO UPDATE SET
           reservation_id = EXCLUDED.reservation_id,
           status = 'held',
           expires_at = EXCLUDED.expires_at
         WHERE showtime_seat_allocations.status = 'released'
            OR showtime_seat_allocations.reservation_id = EXCLUDED.reservation_id
         RETURNING allocation_id`,
        [
          showtimeId,
          roomId,
          spaceId,
          reservationId,
          reservation.expires_at,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error("SEAT_ALREADY_RESERVED");
      }
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Reservation updated successfully",
      data: {
        reservationId,
        showtimeId,
        customerEmail: reservation.customer_email,
        status: reservation.status,
        expiresAt: reservation.expires_at,
        reservedSeatCount: totalSelected,
        seatIds,
        wheelchairSpaceIds,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating reservation:", error);

    if (error.message === "SEAT_ALREADY_RESERVED" || error.code === "23505") {
      return sendError(
        res,
        409,
        "One or more selected seats have just been reserved. Please refresh the seat map."
      );
    }

    return sendError(res, 500, "Failed to update reservation");
  } finally {
    client.release();
  }
}
