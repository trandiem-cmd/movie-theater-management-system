
import { Link, useSearchParams } from "react-router-dom";
import "./PaymentCancelPage.css";

function PaymentCancelPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <main className="payment-result payment-cancel-page">
      <h1>Payment Cancelled</h1>

      <p>
        Your payment was not completed.
        No successful payment has been confirmed.
      </p>

      {bookingId && (
        <p>
          Booking Reference: <strong>{bookingId}</strong>
        </p>
      )}

      <p>
        Your booking may still be pending.
        You can return to the booking process and try again
        if your Checkout Session is still available.
      </p>

      <div className="payment-actions">
        <Link to="/">
          Back to Home
        </Link>
      </div>
    </main>
  );
}

export default PaymentCancelPage;