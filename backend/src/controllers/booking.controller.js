import pool from "../config/database.js";
import { randomBytes } from "node:crypto";
import { createCheckoutSessionForBooking } from "./payment.controller.js";

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

// Normalize email for comparison.
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// POST /api/bookings
export async function createBooking(req, res) {
  const {
    reservationId,
    bookingType,
    tickets,
    customerEmail,
  } = req.body || {};

  // 1. Validate reservation ID.
  if (!isValidId(reservationId)) {
    return sendError(res, 400, "Invalid reservation ID");
  }

  // 2. Validate booking type.
  if (!["reserve", "buy_now"].includes(bookingType)) {
    return sendError(res, 400, "Invalid booking type");
  }

  // 3. Validate ticket quantities.
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

  // 4. Get current logged-in user.
  const sessionUserId = req.session?.user?.user_id ?? null;

  // Reserve is only available to registered customers.
  if (bookingType === "reserve" && !sessionUserId) {
    return sendError(
      res,
      401,
      "You must sign in to reserve tickets"
    );
  }

  // Guest Buy Now requires a valid email.
  const normalizedCustomerEmail = normalizeEmail(customerEmail);

  if (
    !sessionUserId &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCustomerEmail)
  ) {
    return sendError(
      res,
      400,
      "A valid customer email is required"
    );
  }

  const client = await pool.connect();

  let transactionStarted = false;
  let clientReleased = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // 5. Lock reservation.
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
      transactionStarted = false;

      return sendError(res, 404, "Reservation not found");
    }

    const reservation = reservationResult.rows[0];

    // 6. Check reservation ownership.
    if (
      reservation.user_id == null
        ? sessionUserId != null
        : Number(reservation.user_id) !== Number(sessionUserId)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return sendError(
        res,
        403,
        "You cannot create a booking from this reservation"
      );
    }

    // 7. Verify guest email.
    if (
      !sessionUserId &&
      normalizeEmail(reservation.customer_email) !==
        normalizedCustomerEmail
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return sendError(
        res,
        403,
        "Customer email does not match the reservation"
      );
    }

    // 8. Check reservation status and expiry.
    if (
      reservation.status !== "active" ||
      !reservation.is_valid
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return sendError(
        res,
        410,
        "Reservation has expired or is no longer active"
      );
    }

    // 9. Lock showtime and calculate Booking expiry.
    const showtimeResult = await client.query(
      `SELECT
          showtime_id,
          room_id,
          start_time,
          base_price,
          status,
          CASE
            WHEN $2 = 'reserve'
              THEN start_time - INTERVAL '30 minutes'
            ELSE LEAST(
              NOW() + INTERVAL '35 minutes',
              start_time
            )
          END AS booking_expires_at,
          NOW() AS database_time
       FROM showtimes
       WHERE showtime_id = $1
       FOR UPDATE`,
      [reservation.showtime_id, bookingType]
    );

    if (showtimeResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return sendError(res, 404, "Showtime not found");
    }

    const showtime = showtimeResult.rows[0];

    if (showtime.status !== "scheduled") {
      await client.query("ROLLBACK");
      transactionStarted = false;

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
      transactionStarted = false;

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
      transactionStarted = false;

      return sendError(
        res,
        400,
        "There is not enough time to create this booking"
      );
    }

    // 10. Lock user row to serialize Loyalty calculations.
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
        transactionStarted = false;

        return sendError(res, 401, "User not found");
      }
    }

    // 11. Get seats held by this reservation.
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

    // 12. Verify ticket quantities against held allocations.
    if (
      normalSeats.length !== regular + child ||
      wheelchairSpaces.length !== wheelchair ||
      allocations.length !== totalTickets
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return sendError(
        res,
        400,
        "Ticket quantities do not match reserved seats"
      );
    }

    // 13. Assign ticket types deterministically.
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

    // 14. Calculate ticket prices.
    // Regular: 100%
    // Child: 50%
    // Wheelchair: 100%
    const basePriceCents = toCents(showtime.base_price);

    if (
      !Number.isSafeInteger(basePriceCents) ||
      basePriceCents < 0
    ) {
      throw new Error("INVALID_SHOWTIME_BASE_PRICE");
    }

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

    // 15. Count previously successful tickets.
    // All ticket types count toward Loyalty.
    // Only paid and confirmed Bookings are counted.
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

      previousCount = Number(loyaltyResult.rows[0].total);
    }

    // 16. Create Booking.
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

    // 17. Claim Loyalty milestones.
    // Registered customers only.
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

    // 18. Apply Loyalty discount.
    // Child discount is applied first.
    // Loyalty discount is applied to the most expensive tickets.
    const loyaltyDiscountCount = successfulClaims.length;

    if (loyaltyDiscountCount > 0) {
      const eligibleAllocations = [...ticketAllocations].sort(
        (a, b) => {
          if (b.finalPriceCents !== a.finalPriceCents) {
            return b.finalPriceCents - a.finalPriceCents;
          }

          return a.allocation_id - b.allocation_id;
        }
      );

      for (
        let i = 0;
        i < loyaltyDiscountCount &&
        i < eligibleAllocations.length;
        i++
      ) {
        const allocation = eligibleAllocations[i];

        allocation.finalPriceCents = Math.round(
          allocation.finalPriceCents * 0.5
        );

        allocation.policies.push({
          type: "loyalty_discount",
          percentage: 50,
          milestone: Number(successfulClaims[i].milestone_number),
        });
      }
    }

    // 19. Calculate final Booking total.
    const totalAmountCents = ticketAllocations.reduce(
      (sum, allocation) =>
        sum + allocation.finalPriceCents,
      0
    );

    const totalAmount = fromCents(totalAmountCents);

    // 20. Transfer allocations from Reservation to Booking.
    for (const allocation of ticketAllocations) {
      const updateResult = await client.query(
        `UPDATE showtime_seat_allocations
         SET status = 'booked',
             booking_id = $1,
             base_price = $2,
             final_price = $3,
             applied_policies = $4::jsonb,
             expires_at = NULL
         WHERE allocation_id = $5
           AND reservation_id = $6
           AND showtime_id = $7
           AND status = 'held'
         RETURNING allocation_id`,
        [
          booking.booking_id,
          fromCents(allocation.basePriceCents),
          fromCents(allocation.finalPriceCents),
          JSON.stringify(allocation.policies),
          allocation.allocation_id,
          reservationId,
          reservation.showtime_id,
        ]
      );

      if (updateResult.rows.length === 0) {
        throw new Error("ALLOCATION_TRANSFER_FAILED");
      }
    }

    // 21. Update Booking total.
    await client.query(
      `UPDATE bookings
       SET total_amount = $1,
           updated_at = NOW()
       WHERE booking_id = $2`,
      [totalAmount, booking.booking_id]
    );

    // 22. Create Payment.
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

    // 23. Convert Reservation.
    await client.query(
      `UPDATE reservations
       SET status = 'converted',
           payment_method = $1
       WHERE reservation_id = $2`,
      [paymentMethod, reservationId]
    );

    // 24. Commit database transaction.
    await client.query("COMMIT");
    transactionStarted = false;

    // Release DB connection before making Stripe API request.
    client.release();
    clientReleased = true;

    // 25. Create Stripe Checkout Session for Buy Now.
    let checkoutUrl = null;
    let checkoutError = null;

    if (bookingType === "buy_now") {
      try {
        const checkout = await createCheckoutSessionForBooking(
          booking.booking_id
        );

        checkoutUrl = checkout.checkoutUrl;
      } catch (error) {
        // Booking has already been committed.
        // Do not pretend that Booking creation failed.
        console.error(
          "Stripe Checkout Session creation failed:",
          error
        );

        checkoutError =
          "Booking was created, but the payment session could not be started.";
      }
    }

    // 26. Return Booking result.
    return res.status(201).json({
      success: true,
      message: checkoutError
        ? checkoutError
        : "Booking created successfully",

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

        checkoutUrl,
        checkoutError,

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
            (claim) => Number(claim.milestone_number)
          ),

          discountedTicketCount: loyaltyDiscountCount,
        },
      },
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Booking transaction rollback failed:", rollbackError);
      }
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

    if (error.message === "INVALID_SHOWTIME_BASE_PRICE") {
      return sendError(
        res,
        400,
        "Invalid showtime ticket price"
      );
    }

    return sendError(
      res,
      500,
      "Failed to create booking"
    );
  } finally {
    if (!clientReleased) {
      client.release();
    }
  }
}
