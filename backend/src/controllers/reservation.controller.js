import pool from "../config/database.js";
import { validateCreateReservation } from "../validators/reservation.validator.js";

// Helper function for error responses
function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// POST /api/reservations
export async function createReservation(req, res) {
  const validation = validateCreateReservation(req.body);

  if (validation.error) {
    return sendError(res, 400, validation.error);
  }

  const { showtimeId, seatIds } = validation.value;

  // Get customer information from the session
  const user = req.session?.user;

  if (!user) {
    return sendError(res, 401, "Authentication required");
  }

  const userId = user.user_id;
  const customerEmail = user.email;
  const client = await pool.connect();

try {
  await client.query("BEGIN");

  // Check whether the showtime exists and lock it
  const showtimeResult = await client.query(
    `SELECT showtime_id, room_id
     FROM showtimes
     WHERE showtime_id = $1
     FOR UPDATE`,
    [showtimeId]
  );

  if (showtimeResult.rows.length === 0) {
    await client.query("ROLLBACK");
    return sendError(res, 404, "Showtime not found");
  }

  const roomId = showtimeResult.rows[0].room_id;

  // Check and lock selected seats
const seatsResult = await client.query(
  `SELECT seat_id, row_number, seat_number, status
   FROM seats
   WHERE room_id = $1
     AND seat_id = ANY($2::int[])
   ORDER BY seat_id
   FOR UPDATE`,
  [roomId, seatIds]
);

// Check whether all selected seats exist in this room
if (seatsResult.rows.length !== seatIds.length) {
  await client.query("ROLLBACK");
  return sendError(
    res,
    400,
    "One or more selected seats do not belong to this room"
  );
}

// Check whether any selected seats are inactive
const inactiveSeats = seatsResult.rows.filter(
  (seat) => seat.status !== "active"
);

if (inactiveSeats.length > 0) {
  await client.query("ROLLBACK");
  return sendError(res, 409, "One or more selected seats are unavailable");
}

// Mark expired reservations
await client.query(
  `UPDATE reservations
   SET status = 'expired'
   WHERE showtime_id = $1
     AND status = 'active'
     AND expires_at <= NOW()`,
  [showtimeId]
);

// Release seats belonging to expired reservations
await client.query(
  `UPDATE showtime_seat_allocations AS a
   SET status = 'released',
       reservation_id = NULL,
       booking_id = NULL,
       expires_at = NULL
   FROM reservations AS r
   WHERE a.reservation_id = r.reservation_id
     AND a.showtime_id = $1
     AND a.status = 'held'
     AND r.status = 'expired'`,
  [showtimeId]
);

// Check whether selected seats are already held or booked
const conflictResult = await client.query(
  `SELECT seat_id, status
   FROM showtime_seat_allocations
   WHERE showtime_id = $1
     AND seat_id = ANY($2::int[])
     AND status IN ('held', 'booked')
   FOR UPDATE`,
  [showtimeId, seatIds]
);

// Reject reservation if any selected seat is unavailable
if (conflictResult.rows.length > 0) {
  const unavailableSeatIds = conflictResult.rows.map(
    (seat) => seat.seat_id
  );

  console.log("Conflict rows:", conflictResult.rows);
  console.log("Unavailable seat IDs:", unavailableSeatIds);

  await client.query("ROLLBACK");

  return res.status(409).json({
    success: false,
    message: "One or more selected seats are no longer available",
    unavailableSeatIds,
  });
}

// Create a temporary reservation for 10 minutes
const reservationResult = await client.query(
  `INSERT INTO reservations (
     user_id,
     showtime_id,
     customer_email,
     booking_method,
     status,
     expires_at
   )
   VALUES ($1, $2, $3, $4, 'active',
           NOW() + INTERVAL '10 minutes')
   RETURNING reservation_id, status, created_at, expires_at`,
  [userId, showtimeId, customerEmail, "online"]
);

const reservation = reservationResult.rows[0];

// Hold each selected seat
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
       expires_at = EXCLUDED.expires_at,
       booking_id = NULL,
       base_price = NULL,
       final_price = NULL,
       applied_policies = '[]'::jsonb
     WHERE showtime_seat_allocations.status = 'released'
     RETURNING allocation_id`,
    [
      showtimeId,
      roomId,
      seatId,
      reservation.reservation_id,
      reservation.expires_at,
    ]
  );

  if (allocationResult.rows.length === 0) {
    await client.query("ROLLBACK");
    return sendError(res, 409, "Selected seat is no longer available");
  }
}
      await client.query("COMMIT");
      return res.status(201).json({
  success: true,
  message: "Seats reserved successfully",
  data: {
    id: reservation.reservation_id,
    userId,
    showtimeId,
    seatIds,
    status: reservation.status,
    expiresAt: reservation.expires_at,
  },
});

    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Error creating reservation:", error);

      return sendError(res, 500, "Failed to create reservation");

    } finally {
      client.release();
    }
}

// GET /api/reservations/:id
export async function getReservation(req, res) {
  const reservationId = Number(req.params.id);

  // Validate reservation ID
  if (!Number.isSafeInteger(reservationId) || reservationId <= 0) {
    return sendError(res, 400, "Invalid reservation ID");
  }

  // Check authentication
  const user = req.session?.user;

  if (!user) {
    return sendError(res, 401, "Authentication required");
  }

  try {
    // Retrieve reservation from the database
    const reservationResult = await pool.query(
      `SELECT reservation_id, user_id, showtime_id,
              status, created_at, expires_at
       FROM reservations
       WHERE reservation_id = $1`,
      [reservationId]
    );

    if (reservationResult.rows.length === 0) {
      return sendError(res, 404, "Reservation not found");
    }

    const reservation = reservationResult.rows[0];

    // Check reservation ownership
    if (reservation.user_id !== user.user_id) {
      return sendError(res, 403, "Access denied");
    }

    // Determine the current reservation status
let currentStatus = reservation.status;

if (
  currentStatus === "active" &&
  new Date(reservation.expires_at).getTime() <= Date.now()
) {
  currentStatus = "expired";
}

// Retrieve seats associated with the reservation
const seatsResult = await pool.query(
  `SELECT seat_id
   FROM showtime_seat_allocations
   WHERE reservation_id = $1
     AND seat_id IS NOT NULL
   ORDER BY seat_id`,
  [reservationId]
);

const seatIds = seatsResult.rows.map(
  (seat) => seat.seat_id
);

// Return reservation details
return res.status(200).json({
  success: true,
  data: {
    id: reservation.reservation_id,
    showtimeId: reservation.showtime_id,
    seatIds,
    status: currentStatus,
    createdAt: reservation.created_at,
    expiresAt: reservation.expires_at,
  },
});

  } catch (error) {
    console.error("Error retrieving reservation:", error);

    return sendError(res, 500, "Failed to retrieve reservation");
  }
}

// DELETE /api/reservations/:id
export async function cancelReservation(req, res) {
  const reservationId = Number(req.params.id);

  // Validate reservation ID
  if (!Number.isSafeInteger(reservationId) || reservationId <= 0) {
    return sendError(res, 400, "Invalid reservation ID");
  }

  // Check authentication
  const user = req.session?.user;

  if (!user) {
    return sendError(res, 401, "Authentication required");
  }

  const client = await pool.connect();

try {
  await client.query("BEGIN");

  // Find the reservation's showtime
  const lookupResult = await client.query(
    `SELECT showtime_id
     FROM reservations
     WHERE reservation_id = $1`,
    [reservationId]
  );

  if (lookupResult.rows.length === 0) {
    await client.query("ROLLBACK");
    return sendError(res, 404, "Reservation not found");
  }

  const showtimeId = lookupResult.rows[0].showtime_id;

  // Lock the showtime first
  await client.query(
    `SELECT showtime_id
     FROM showtimes
     WHERE showtime_id = $1
     FOR UPDATE`,
    [showtimeId]
  );

  // Retrieve and lock the reservation
  const reservationResult = await client.query(
    `SELECT reservation_id, user_id, status, expires_at
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

  // Check reservation ownership
if (reservation.user_id !== user.user_id) {
  await client.query("ROLLBACK");
  return sendError(res, 403, "Access denied");
}

// Prevent cancellation of converted reservations
if (reservation.status === "converted") {
  await client.query("ROLLBACK");
  return sendError(res, 409, "Converted reservations cannot be cancelled");
}

// Check whether the reservation is already cancelled
if (reservation.status === "cancelled") {
  await client.query("ROLLBACK");
  return sendError(res, 409, "Reservation is already cancelled");
}

// Check whether the reservation has expired
if (
  reservation.status === "expired" ||
  new Date(reservation.expires_at).getTime() <= Date.now()
) {
  await client.query("ROLLBACK");
  return sendError(res, 409, "Reservation has expired");
}

// Update reservation status
await client.query(
  `UPDATE reservations
   SET status = 'cancelled'
   WHERE reservation_id = $1`,
  [reservationId]
);

// Release seats held by this reservation
await client.query(
  `UPDATE showtime_seat_allocations
   SET status = 'released',
       reservation_id = NULL,
       booking_id = NULL,
       expires_at = NULL
   WHERE reservation_id = $1
     AND status = 'held'`,
  [reservationId]
);

  await client.query("COMMIT");
  return res.status(200).json({
  success: true,
  message: "Reservation cancelled successfully",
  data: {
    id: reservationId,
    status: "cancelled",
  },
});

} catch (error) {
  await client.query("ROLLBACK");

  console.error("Error cancelling reservation:", error);

  return sendError(res, 500, "Failed to cancel reservation");

} finally {
  client.release();
}
}