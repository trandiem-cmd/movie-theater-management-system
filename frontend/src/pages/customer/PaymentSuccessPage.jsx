
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./PaymentSuccessPage.css";
function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("checking");
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setError("Payment session information could not be found.");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;
    let timeoutId;

    const verifyPayment = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;

        if (!apiUrl) {
          throw new Error("API configuration is missing.");
        }

        const response = await fetch(
          `${apiUrl}/stripe/verify-session?session_id=${encodeURIComponent(
            sessionId
          )}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to verify payment."
          );
        }

        if (cancelled) return;

        const paymentIsSuccessful =
          result.data?.paymentStatus === "success" &&
          result.data?.bookingStatus === "confirmed" &&
          result.data?.booking;

        if (paymentIsSuccessful) {
          setBooking(result.data.booking);
          setStatus("success");
          return;
        }

        attempts += 1;

        if (attempts < maxAttempts) {
          timeoutId = setTimeout(verifyPayment, 2000);
        } else {
          setStatus("pending");
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err.message || "An unexpected error occurred."
        );
        setStatus("error");
      }
    };

    verifyPayment();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [sessionId]);

  if (status === "checking") {
    return (
      <main className="payment-resul payment-success-page payment-result--checking">
        <h1>Verifying Your Payment</h1>
        <p>
          Please wait while we confirm your payment and booking.
        </p>
      </main>
    );
  }

  if (status === "pending") {
    return (
      <main className="payment-result payment-success-page payment-result--pending">
        <h1>Payment Confirmation Pending</h1>

        <p>
          Your payment may have been received, but our system
          has not received the final confirmation yet.
        </p>

        <p>
          Please wait a few minutes and check your booking
          status again.
        </p>

        <Link to="/">Back to Home</Link>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="payment-result payment-success-page payment-result--error">
        <h1>Unable to Verify Payment</h1>

        <p>{error}</p>

        <p>
          If your payment was completed, please contact our
          support team before making another payment.
        </p>

        <Link to="/">Back to Home</Link>
      </main>
    );
  }

  return (
    <main className="payment-result payment-success-page payment-result--success">
      <h1>Payment Successful!</h1>

      <p>
        Thank you for booking with RIO Cinema.
        Your payment has been confirmed.
      </p>

      <section className="booking-information">
        <h2>Booking Information</h2>

        <p>
          Booking Code:{" "}
          <strong>{booking.bookingCode}</strong>
        </p>

        <p>
          Total Amount:{" "}
          <strong>
            €{Number(booking.totalAmount).toFixed(2)}
          </strong>
        </p>
      </section>

      <Link to="/">Back to Home</Link>
    </main>
  );
}

export default PaymentSuccessPage;
