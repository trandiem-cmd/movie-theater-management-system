
import pool from "../config/database.js";
import stripe from "../config/stripe.js";

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function toCents(value) {
  return Math.round(Number(value) * 100);
}

// Release seats and Loyalty claims when a Booking fails or is refunded.
async function releaseBookingResources(client, bookingId) {
  await client.query(
    `UPDATE showtime_seat_allocations
     SET status = 'released',
         reservation_id = NULL,
         booking_id = NULL,
         base_price = NULL,
         final_price = NULL,
         applied_policies = '[]'::jsonb,
         expires_at = NULL
     WHERE booking_id = $1
       AND status = 'booked'`,
    [bookingId]
  );

  await client.query(
    `UPDATE loyalty_discount_claims
     SET status = 'released'
     WHERE booking_id = $1
       AND status = 'claimed'`,
    [bookingId]
  );
}

// Create Stripe Checkout Session internally after Booking creation.
export async function createCheckoutSessionForBooking(bookingId) {
  if (!Number.isSafeInteger(Number(bookingId)) || Number(bookingId) <= 0) {
    throw new Error("INVALID_BOOKING_ID");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock Booking and Payment to prevent concurrent Checkout creation.
    const result = await client.query(
      `SELECT
          b.booking_id,
          b.booking_code,
          b.total_amount,
          b.status AS booking_status,
          b.expires_at,
          p.payment_id,
          p.payment_status,
          p.stripe_session_id,
          r.customer_email
       FROM bookings b
       JOIN payments p
         ON p.booking_id = b.booking_id
       JOIN reservations r
         ON r.reservation_id = b.reservation_id
       WHERE b.booking_id = $1
         AND p.payment_method = 'online'
       FOR UPDATE OF b, p`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      throw new Error("BOOKING_PAYMENT_NOT_FOUND");
    }

    const booking = result.rows[0];

    if (
      booking.booking_status !== "pending" ||
      booking.payment_status !== "pending"
    ) {
      throw new Error("BOOKING_NOT_PAYABLE");
    }

    if (
      !booking.expires_at ||
      new Date(booking.expires_at) <= new Date()
    ) {
      throw new Error("BOOKING_EXPIRED");
    }

    // Reuse an existing open Checkout Session.
    if (booking.stripe_session_id) {
      const existingSession =
        await stripe.checkout.sessions.retrieve(
          booking.stripe_session_id
        );

      if (
        existingSession.status === "open" &&
        existingSession.url
      ) {
        await client.query("COMMIT");

        return {
          checkoutUrl: existingSession.url,
          sessionId: existingSession.id,
        };
      }
    }

    // Stripe Checkout requires a positive payment amount.
    const amountCents = toCents(booking.total_amount);

    if (
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0
    ) {
      throw new Error("INVALID_BOOKING_AMOUNT");
    }

    const clientUrl = process.env.CLIENT_URL?.replace(/\/+$/, "");

    if (!clientUrl) {
      throw new Error("MISSING_CLIENT_URL");
    }

    // Stripe Checkout Session has a minimum expiry of 30 minutes.
    // It can outlive the Booking. The webhook handles late payments.
    const expiresAt = Math.ceil(Date.now() / 1000) + 30 * 60;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
       allowed_payment_method_types: ["card"],

      customer_email: booking.customer_email,

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `RIO Cinema Booking ${booking.booking_code}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],

      client_reference_id: String(booking.booking_id),

      metadata: {
        bookingId: String(booking.booking_id),
        paymentId: String(booking.payment_id),
      },

      payment_intent_data: {
        metadata: {
          bookingId: String(booking.booking_id),
          paymentId: String(booking.payment_id),
        },
      },

      expires_at: expiresAt,

      success_url:
        `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${clientUrl}/payment/cancel?booking_id=${booking.booking_id}`,
    });

    // Save Stripe Session ID for webhook matching.
    await client.query(
      `UPDATE payments
       SET stripe_session_id = $1
       WHERE payment_id = $2`,
      [session.id, booking.payment_id]
    );

    await client.query("COMMIT");

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Checkout transaction rollback failed:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

// POST /api/stripe/webhook
export async function handleStripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return sendError(res, 400, "Missing Stripe signature");
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");

    return sendError(
      res,
      500,
      "Stripe webhook configuration error"
    );
  }

  let event;

  // 1. Verify Stripe webhook signature.
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature error:",
      error.message
    );

    return sendError(
      res,
      400,
      "Invalid Stripe webhook signature"
    );
  }

  const checkoutSession = event.data.object;

  const handledEvents = [
    "checkout.session.completed",
    "checkout.session.expired",
    "checkout.session.async_payment_failed",
    "checkout.session.async_payment_succeeded",
  ];

  if (!handledEvents.includes(event.type)) {
    return res.json({
      received: true,
      ignored: true,
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 2. Prevent processing the same Stripe event twice.
    const eventResult = await client.query(
      `INSERT INTO payment_webhook_events (
          event_id,
          event_type
       )
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [event.id, event.type]
    );

    if (eventResult.rows.length === 0) {
      await client.query("COMMIT");

      return res.json({
        received: true,
        duplicate: true,
      });
    }

    // 3. Find and lock the related Payment and Booking.
    const paymentResult = await client.query(
      `SELECT
          p.payment_id,
          p.booking_id,
          p.amount,
          p.payment_status AS payment_status,
          p.stripe_session_id,

          b.status AS booking_status,
          b.payment_status AS booking_payment_status,
          b.expires_at,
          b.total_amount

       FROM payments p
       JOIN bookings b
         ON b.booking_id = p.booking_id

       WHERE p.stripe_session_id = $1

       FOR UPDATE OF p, b`,
      [checkoutSession.id]
    );

    if (paymentResult.rows.length === 0) {
      console.error(
        "No Payment found for Stripe Session:",
        checkoutSession.id
      );

      // Store the event to avoid endless retries for an unknown session.
      await client.query("COMMIT");

      return res.json({
        received: true,
        unmatched: true,
      });
    }

    const payment = paymentResult.rows[0];

    // 4. Handle successful payment.
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      // Do not confirm until Stripe reports that payment is paid.
      if (checkoutSession.payment_status !== "paid") {
        await client.query("COMMIT");

        return res.json({
          received: true,
          paymentPending: true,
        });
      }

      // Verify amount and currency against database values.
      const expectedAmount = toCents(payment.total_amount);
      const receivedAmount = checkoutSession.amount_total;

      const amountMatches =
        Number.isSafeInteger(expectedAmount) &&
        receivedAmount === expectedAmount &&
        checkoutSession.currency === "eur";

      // A paid session must have a PaymentIntent to refund if necessary.
      const paymentIntentId =
        typeof checkoutSession.payment_intent === "string"
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent?.id;

      const bookingIsPayable =
        payment.booking_status === "pending" &&
        payment.payment_status === "pending" &&
        payment.booking_payment_status === "unpaid" &&
        payment.expires_at &&
        new Date(payment.expires_at) > new Date();

      // Already confirmed and paid: no additional action.
      if (
        payment.booking_status === "confirmed" &&
        payment.booking_payment_status === "paid" &&
        payment.payment_status === "success"
      ) {
        await client.query("COMMIT");

        return res.json({
          received: true,
          alreadyPaid: true,
        });
      }

      // If Booking expired or amount does not match,
      // refund the successful Stripe payment.
      if (!bookingIsPayable || !amountMatches) {
        if (!paymentIntentId) {
          throw new Error(
            "REFUND_FAILED_PAYMENT_INTENT_NOT_FOUND"
          );
        }

        console.warn(
          "Refunding Stripe payment:",
          checkoutSession.id,
          {
            bookingId: payment.booking_id,
            amountMatches,
            bookingIsPayable,
          }
        );

        // Idempotency key prevents duplicate refunds on retries.
        await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
          },
          {
            idempotencyKey: `late-payment-refund-${event.id}`,
          }
        );

        await client.query(
          `UPDATE payments
           SET payment_status = 'refunded',
               transaction_code = $1,
               paid_at = COALESCE(paid_at, NOW())
           WHERE payment_id = $2`,
          [
            paymentIntentId,
            payment.payment_id,
          ]
        );

        await client.query(
          `UPDATE bookings
           SET status = 'refunded',
               payment_status = 'refunded',
               updated_at = NOW()
           WHERE booking_id = $1`,
          [payment.booking_id]
        );

        await releaseBookingResources(
          client,
          payment.booking_id
        );

        await client.query("COMMIT");

        return res.json({
          received: true,
          refunded: true,
        });
      }

      // 5. Confirm Booking after verified successful payment.
      await client.query(
        `UPDATE payments
         SET payment_status = 'success',
             transaction_code = $1,
             paid_at = NOW()
         WHERE payment_id = $2`,
        [
          paymentIntentId,
          payment.payment_id,
        ]
      );

      await client.query(
        `UPDATE bookings
         SET status = 'confirmed',
             payment_status = 'paid',
             updated_at = NOW()
         WHERE booking_id = $1`,
        [payment.booking_id]
      );

      // Consume claimed Loyalty milestones.
      await client.query(
        `UPDATE loyalty_discount_claims
         SET status = 'consumed',
             consumed_at = NOW()
         WHERE booking_id = $1
           AND status = 'claimed'`,
        [payment.booking_id]
      );

      await client.query("COMMIT");

      console.log(
        "Booking payment confirmed:",
        payment.booking_id
      );

      return res.json({
        received: true,
        bookingConfirmed: true,
      });
    }

    // 6. Handle expired Checkout Session or failed payment.
    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      // Only cancel Bookings that are still pending.
      if (
        payment.booking_status === "pending" &&
        payment.payment_status === "pending" &&
        payment.booking_payment_status === "unpaid"
      ) {
        await client.query(
          `UPDATE payments
           SET payment_status = 'failed'
           WHERE payment_id = $1`,
          [payment.payment_id]
        );

        await client.query(
          `UPDATE bookings
           SET status = 'cancelled',
               payment_status = 'failed',
               updated_at = NOW()
           WHERE booking_id = $1`,
          [payment.booking_id]
        );

        await releaseBookingResources(
          client,
          payment.booking_id
        );

        console.log(
          "Booking cancelled after Stripe payment failure/expiry:",
          payment.booking_id
        );
      }

      await client.query("COMMIT");

      return res.json({
        received: true,
        bookingCancelled: true,
      });
    }

    await client.query("COMMIT");

    return res.json({
      received: true,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Webhook transaction rollback failed:",
        rollbackError
      );
    }

    console.error("Stripe webhook processing error:", error);

    // Return 500 so Stripe can retry the event.
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  } finally {
    client.release();
  }
}
