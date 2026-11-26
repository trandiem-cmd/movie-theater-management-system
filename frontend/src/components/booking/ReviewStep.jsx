import "./ReviewStep.css";

function ReviewStep({
  reservation,
  ticketSelection,
  customer,
  customerType,
  onBack,
  onBuyNow,
  onReserve,
}) {
  const tickets = ticketSelection?.tickets ?? {};
  const prices = ticketSelection?.prices ?? {};

  const selectedSeats = ticketSelection?.selectedSeats ?? [];
  const selectedWheelchairSpaces =
    ticketSelection?.selectedWheelchairSpaces ?? [];

  const formatPrice = (price) =>
    `${Number(price ?? 0).toFixed(2)} €`;

  const customerEmail =
    customer?.email || reservation?.customerEmail || "Not available";

  return (
    <section className="review-step">
      <h2>Review your booking</h2>

      <p className="review-intro">
        Please check your booking details before continuing.
      </p>

      <div className="review-section">
        <h3>Customer details</h3>

        <p>
          <strong>Email:</strong> {customerEmail}
        </p>

        <p>
          <strong>Booking type:</strong>{" "}
          {customerType === "registered" ? "Registered customer" : "Guest"}
        </p>
      </div>

      <div className="review-section">
        <h3>Selected seats</h3>

        <p>
          <strong>Regular seats:</strong>{" "}
          {selectedSeats.length > 0
            ? selectedSeats.join(", ")
            : "None"}
        </p>

        <p>
          <strong>Wheelchair spaces:</strong>{" "}
          {selectedWheelchairSpaces.length > 0
            ? selectedWheelchairSpaces.join(", ")
            : "None"}
        </p>
      </div>

      <div className="review-section">
        <h3>Ticket details</h3>

        <div className="review-line">
          <span>Regular tickets × {tickets.regular ?? 0}</span>
          <span>
            {formatPrice(
              (tickets.regular ?? 0) * (prices.regular ?? 0)
            )}
          </span>
        </div>

        <div className="review-line">
          <span>Child tickets × {tickets.child ?? 0}</span>
          <span>
            {formatPrice(
              (tickets.child ?? 0) * (prices.child ?? 0)
            )}
          </span>
        </div>

        <div className="review-line">
          <span>Wheelchair tickets × {tickets.wheelchair ?? 0}</span>
          <span>
            {formatPrice(
              (tickets.wheelchair ?? 0) * (prices.wheelchair ?? 0)
            )}
          </span>
        </div>

        <div className="review-total">
          <strong>Total</strong>
          <strong>{formatPrice(prices.total)}</strong>
        </div>
      </div>

      {reservation?.expiresAt && (
        <p className="review-expiry">
          Your seat reservation expires at:{" "}
          {new Date(reservation.expiresAt).toLocaleTimeString()}
        </p>
      )}

      <div className="review-actions">
        <button
          type="button"
          className="review-back-button"
          onClick={onBack}
        >
          Back to tickets
        </button>

        {customerType === "registered" && (
          <button
            type="button"
            className="review-reserve-button"
            onClick={onReserve}
          >
            Reserve
          </button>
        )}

        <button
          type="button"
          className="review-buy-button"
          onClick={onBuyNow}
        >
          Buy Now
        </button>
      </div>
    </section>
  );
}

export default ReviewStep;
