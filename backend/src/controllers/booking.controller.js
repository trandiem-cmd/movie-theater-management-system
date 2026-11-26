import pool from "../config/database.js";
import { randomBytes } from "node:crypto";

const isValidId = (value) =>
  Number.isSafeInteger(value) && value > 0;

const isValidQuantity = (value) =>
  Number.isSafeInteger(value) && value >= 0;

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function generateBookingCode() {
  return `RIO-${Date.now()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

// Convert PostgreSQL NUMERIC price to integer cents.
function toCents(value) {
  return Math.round(Number(value) * 100);
}

function fromCents(value) {
  return (value / 100).toFixed(2);
}

// POST /api/bookings
export async function createBooking(req, res) {
  const {
    reservationId,
    bookingType,
    tickets,
    customerEmail,
  } = req.body || {};

  // Validate reservation ID.
  if (!isValidId(reservationId)) {
    return sendError(res, 400, "Invalid reservation ID");
  }

  // Validate booking type.
  if (!["reserve", "buy_now"].includes(bookingType)) {
    return sendError(res, 400, "Invalid booking type");
  }

  // Validate ticket quantities.
  const {
    regular,
    child,
    wheelchair,
  } = tickets || {};

  if (
    !isValidQuantity(regular) ||
    !isValidQuantity(child) ||
    !isValidQuantity(wheelchair)
  ) {
    return sendError(res, 400, "Invalid ticket quantities");
  }

  const totalTickets = regular + child + wheelchair;

  if (totalTickets < 1 || totalTickets > 6) {
    return sendError(
      res,
      400,
      "Select between one and six tickets"
    );
  }

  // Registered customers only for Reserve.
  const sessionUserId = req.session?.user?.user_id ?? null;

  if (bookingType === "reserve" && !sessionUserId) {
    return sendError(
      res,
      401,
      "You must sign in to reserve tickets"
    );
  }

  // Guest Buy Now requires the reservation email.
  if (
    !sessionUserId &&
    (
      typeof customerEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    )
  ) {
    return sendError(
      res,
      400,
      "A valid customer email is required"
    );
  }

  const client = await pool.connect();

  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // 1. Lock reservation.
    const reservationResult = await client.query(
      `SELECT
          reservation_id,
          user_id,
          showtime_id,
          customer_email,
          status,
          expires_at,
          (expires_at > NOW()) AS is_valid
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

    // Check reservation ownership.
    if (
      reservation.user_id == null
        ? sessionUserId != null
        : Number(reservation.user_id) !== Number(sessionUserId)
    ) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        403,
        "You cannot create a booking from this reservation"
      );
    }

    // For guests, verify the email matches the reservation.
    if (
      !sessionUserId &&
      reservation.customer_email !== customerEmail.trim().toLowerCase()
    ) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        403,
        "Customer email does not match the reservation"
      );
    }

    if (
      reservation.status !== "active" ||
      !reservation.is_valid
    ) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        410,
        "Reservation has expired or is no longer active"
      );
    }

    // 2. Lock showtime.
    const showtimeResult = await client.query(
      `SELECT
          showtime_id,
          room_id,
          start_time,
          base_price,
          status,
          (
            CASE
              WHEN $2 = 'reserve'
                THEN start_time - INTERVAL '30 minutes'
              ELSE LEAST(
                NOW() + INTERVAL '10 minutes',
                start_time
              )
            END
          ) AS booking_expires_at,
          NOW() AS database_time
       FROM showtimes
       WHERE showtime_id = $1
       FOR UPDATE`,
      [reservation.showtime_id, bookingType]
    );

    if (showtimeResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, 404, "Showtime not found");
    }

    const showtime = showtimeResult.rows[0];

    if (showtime.status !== "scheduled") {
      await client.query("ROLLBACK");
      return sendError(
        res,
        400,
        "This showtime is no longer available"
      );
    }

    if (
      new Date(showtime.start_time) <=
      new Date(showtime.database_time)
    ) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        400,
        "This showtime has already started"
      );
    }

    if (
      new Date(showtime.booking_expires_at) <=
      new Date(showtime.database_time)
    ) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        400,
        "There is not enough time to create this booking"
      );
    }

    // 3. Lock the user's row to serialize Loyalty calculations.
    if (sessionUserId) {
      const userResult = await client.query(
        `SELECT user_id
         FROM users
         WHERE user_id = $1
         FOR UPDATE`,
        [sessionUserId]
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return sendError(res, 401, "User not found");
      }
    }

    // 4. Get all seats currently held by this reservation.
    const allocationsResult = await client.query(
      `SELECT
          allocation_id,
          seat_id,
          wheelchair_space_id
       FROM showtime_seat_allocations
       WHERE reservation_id = $1
         AND showtime_id = $2
         AND status = 'held'
       ORDER BY allocation_id
       FOR UPDATE`,
      [reservationId, reservation.showtime_id]
    );

    const allocations = allocationsResult.rows;

    const normalSeats = allocations.filter(
      (item) => item.seat_id != null
    );

    const wheelchairSpaces = allocations.filter(
      (item) => item.wheelchair_space_id != null
    );

    // Verify ticket quantities match held allocations.
    if (
      normalSeats.length !== regular + child ||
      wheelchairSpaces.length !== wheelchair
    ) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        400,
        "Ticket quantities do not match reserved seats"
      );
    }

    if (allocations.length !== totalTickets) {
      await client.query("ROLLBACK");
      return sendError(
        res,
        400,
        "Reservation seat allocation is invalid"
      );
    }

    // 5. Assign ticket types deterministically.
    // Normal seats are ordered by allocation_id.
    const ticketAllocations = [];

    let normalIndex = 0;

    for (let i = 0; i < regular; i++) {
      ticketAllocations.push({
        ...normalSeats[normalIndex++],
        ticketType: "regular",
      });
    }

    for (let i = 0; i < child; i++) {
      ticketAllocations.push({
        ...normalSeats[normalIndex++],
        ticketType: "child",
      });
    }

    for (const allocation of wheelchairSpaces) {
      ticketAllocations.push({
        ...allocation,
        ticketType: "wheelchair",
      });
    }

    // 6. Calculate base ticket prices.
    const basePriceCents = toCents(showtime.base_price);

    for (const allocation of ticketAllocations) {
      const isChild = allocation.ticketType === "child";

      allocation.basePriceCents = basePriceCents;

      allocation.finalPriceCents = isChild
        ? Math.round(basePriceCents * 0.5)
        : basePriceCents;

      allocation.policies = [];

      if (isChild) {
        allocation.policies.push({
          type: "child_discount",
          percentage: 50,
        });
      }
    }

    // 7. Count previously successful tickets.
    let previousCount = 0;

    if (sessionUserId) {
      const loyaltyResult = await client.query(
        `SELECT COUNT(*)::integer AS total
         FROM showtime_seat_allocations a
         JOIN bookings b
           ON b.booking_id = a.booking_id
         JOIN reservations r
           ON r.reservation_id = b.reservation_id
         WHERE r.user_id = $1
           AND a.status = 'booked'
           AND b.status = 'confirmed'
           AND b.payment_status = 'paid'
           AND EXISTS (
             SELECT 1
             FROM payments p
             WHERE p.booking_id = b.booking_id
               AND p.payment_status = 'success'
           )`,
        [sessionUserId]
      );

      previousCount = loyaltyResult.rows[0].total;
    }

    // 8. Create Booking first.
    // The total is updated after Loyalty claims are processed.
    const bookingResult = await client.query(
      `INSERT INTO bookings (
          reservation_id,
          booking_code,
          total_amount,
          status,
          payment_status,
          expires_at
       )
       VALUES ($1, $2, 0, 'pending', 'unpaid', $3)
       RETURNING
          booking_id,
          booking_code,
          status,
          payment_status,
          expires_at`,
      [
        reservationId,
        generateBookingCode(),
        showtime.booking_expires_at,
      ]
    );

    const booking = bookingResult.rows[0];

    // 9. Claim Loyalty milestones.
    // Only registered customers are eligible.
    let successfulClaims = [];

    if (sessionUserId) {
      const discountCount =
        Math.floor((previousCount + totalTickets) / 10) -
        Math.floor(previousCount / 10);

      for (let i = 1; i <= discountCount; i++) {
        const milestone =
          (Math.floor(previousCount / 10) + i) * 10;

        const claimResult = await client.query(
          `INSERT INTO loyalty_discount_claims (
              user_id,
              booking_id,
              milestone_number,
              status,
              expires_at
           )
           VALUES ($1, $2, $3, 'claimed', $4)
           ON CONFLICT DO NOTHING
           RETURNING claim_id, milestone_number`,
          [
            sessionUserId,
            booking.booking_id,
            milestone,
            booking.expires_at,
          ]
        );

        if (claimResult.rows.length > 0) {
          successfulClaims.push(claimResult.rows[0]);
        }
      }
    }

    // 10. Apply Loyalty discount to the most expensive tickets.
    // Child discount is applied before Loyalty discount.
    const loyaltyDiscountCount = successfulClaims.length;

    if (loyaltyDiscountCount > 0) {
      const eligibleAllocations = [...ticketAllocations]
        .sort((a, b) => {
          if (b.finalPriceCents !== a.finalPriceCents) {
            return b.finalPriceCents - a.finalPriceCents;
          }

          return a.allocation_id - b.allocation_id;
        });

      for (
        let i = 0;
        i < loyaltyDiscountCount && i < eligibleAllocations.length;
        i++
      ) {
        const allocation = eligibleAllocations[i];

        allocation.finalPriceCents = Math.round(
          allocation.finalPriceCents * 0.5
        );

        allocation.policies.push({
          type: "loyalty_discount",
          percentage: 50,
          milestone: successfulClaims[i].milestone_number,
        });
      }
    }

    // 11. Calculate final Booking total.
    const totalAmountCents = ticketAllocations.reduce(
      (sum, allocation) =>
        sum + allocation.finalPriceCents,
      0
    );

    const totalAmount = fromCents(totalAmountCents);

    // 12. Save ticket prices and transfer allocations to Booking.
    for (const allocation of ticketAllocations) {
      const result = await client.query(
        `UPDATE showtime_seat_allocations
         SET status = 'booked',
             booking_id = $1,
             base_price = $2,
             final_price = $3,
             applied_policies = $4::jsonb,
             expires_at = NULL
         WHERE allocation_id = $5
           AND reservation_id = $6
           AND status = 'held'
         RETURNING allocation_id`,
        [
          booking.booking_id,
          fromCents(allocation.basePriceCents),
          fromCents(allocation.finalPriceCents),
          JSON.stringify(allocation.policies),
          allocation.allocation_id,
          reservationId,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error("ALLOCATION_TRANSFER_FAILED");
      }
    }

    // 13. Update Booking total.
    await client.query(
      `UPDATE bookings
       SET total_amount = $1,
           updated_at = NOW()
       WHERE booking_id = $2`,
      [totalAmount, booking.booking_id]
    );

    // 14. Create Payment.
    const paymentMethod =
      bookingType === "reserve" ? "at_counter" : "online";

    await client.query(
      `INSERT INTO payments (
          booking_id,
          amount,
          payment_method,
          payment_status
       )
       VALUES ($1, $2, $3, 'pending')`,
      [
        booking.booking_id,
        totalAmount,
        paymentMethod,
      ]
    );

    // 15. Convert Reservation.
    await client.query(
      `UPDATE reservations
       SET status = 'converted',
           payment_method = $1
       WHERE reservation_id = $2`,
      [paymentMethod, reservationId]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        bookingId: booking.booking_id,
        bookingCode: booking.booking_code,
        reservationId,
        bookingType,
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod,
        totalAmount,
        currency: "EUR",
        expiresAt: booking.expires_at,
        ticketCount: totalTickets,
        tickets: ticketAllocations.map((allocation) => ({
          allocationId: allocation.allocation_id,
          ticketType: allocation.ticketType,
          basePrice: fromCents(allocation.basePriceCents),
          finalPrice: fromCents(allocation.finalPriceCents),
          appliedPolicies: allocation.policies,
        })),
        loyalty: {
          previousTicketCount: previousCount,
          currentTicketCount: totalTickets,
          claimedMilestones: successfulClaims.map(
            (claim) => claim.milestone_number
          ),
          discountedTicketCount: loyaltyDiscountCount,
        },
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    console.error("Error creating booking:", error);

    if (error.code === "23505") {
      return sendError(
        res,
        409,
        "A booking already exists for this reservation"
      );
    }

    if (error.message === "ALLOCATION_TRANSFER_FAILED") {
      return sendError(
        res,
        409,
        "Reserved seats could not be transferred. Please try again."
      );
    }

    return sendError(
      res,
      500,
      "Failed to create booking"
    );
  } finally {
    client.release();
  }
}
