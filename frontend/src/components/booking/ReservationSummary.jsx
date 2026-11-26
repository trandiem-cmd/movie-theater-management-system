import { Clock, Info, AlertCircle } from "lucide-react";
import "./ReservationSummary.css";

function ReservationSummary({
  selectedSeats = [],
  selectedWheelchairSpaces = [],
  seats = [],
  seatLimitError = "",
  seatsLoading = false,
  seatsError = "",
  reservation = null,
  remainingTime = null,
  reservationError = "",
  onClearSelection,
  onCancelReservation,
  onContinue,
}) {
  const totalSelected =
    selectedSeats.length + selectedWheelchairSpaces.length;

  const isActive = reservation?.status === "active";

  const isExpired =
    reservation?.status === "expired" ||
    (isActive && remainingTime === 0);

  const isHeld = isActive && !isExpired;

  function formatSelectedSeats() {
    const grouped = selectedSeats.reduce((groups, seatNumber) => {
      const seat = seats.find((item) => item.number === seatNumber);

      if (!seat) return groups;

      if (!groups[seat.row]) {
        groups[seat.row] = [];
      }

      groups[seat.row].push(seat.number);

      return groups;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([row, numbers]) => {
        numbers.sort((a, b) => a - b);

        return `Row ${row}, ${
          numbers.length === 1 ? "Seat" : "Seats"
        } ${numbers.join(", ")}`;
      });
  }

  function formatRemainingTime(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(seconds));

    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  return (
    <aside className="seat-details-section reservation-summary">
      <h2>Your Selection</h2>

      <div className="reservation-selection-count">
        <span>Selected seats</span>
        <strong>{totalSelected} / 6</strong>
      </div>

      {totalSelected === 0 ? (
        <p className="reservation-empty">
          No seats selected yet.
        </p>
      ) : (
        <div className="reservation-selected-items">
          {selectedSeats.length > 0 && (
            <div className="reservation-seat-group">
              <h3>Regular seats ({selectedSeats.length})</h3>

              {formatSelectedSeats().map((description) => (
                <p key={description}>{description}</p>
              ))}
            </div>
          )}

          {selectedWheelchairSpaces.length > 0 && (
            <div className="reservation-seat-group">
              <h3>
                Wheelchair spaces ({selectedWheelchairSpaces.length})
              </h3>

              {selectedWheelchairSpaces.map((number) => (
                <p key={number}>Wheelchair Space {number}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {totalSelected > 0 && !reservation && (
        <div className="reservation-info">
          <Info size={20} />

          <p>
            Your selected seats will be held for 10 minutes
            once your reservation is created.
          </p>
        </div>
      )}

      {isHeld && (
        <div className="reservation-active">
          <span className="reservation-status">
            Seats temporarily held
          </span>

          {remainingTime !== null && (
            <div className="reservation-timer">
              <Clock size={22} />

              <div>
                <p>Time remaining</p>
                <strong>
                  {formatRemainingTime(remainingTime)}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {isExpired && (
        <div className="reservation-alert" role="alert">
          <AlertCircle size={20} />

          <p>
            Your reservation has expired. Please select
            your seats again.
          </p>
        </div>
      )}

      {reservation?.status === "cancelled" && (
        <div className="reservation-info" role="status">
          <Info size={20} />
          <p>Your reservation has been cancelled.</p>
        </div>
      )}

      {seatLimitError && (
        <p className="seat-limit-error" role="alert">
          {seatLimitError}
        </p>
      )}

      {reservationError && (
        <div className="reservation-alert" role="alert">
          <AlertCircle size={20} />
          <p>{reservationError}</p>
        </div>
      )}

      <div className="reservation-actions">
        <button
          type="button"
          className="reservation-continue-button"
          disabled={
            totalSelected === 0 ||
            seatsLoading ||
            Boolean(seatsError) ||
            isExpired ||
            reservation?.status === "cancelled" ||
            reservation?.status === "converted"
          }
          onClick={onContinue}
        >
          Continue to Booking
        </button>

        {totalSelected > 0 &&
          !reservation &&
          onClearSelection && (
            <button
              type="button"
              className="reservation-secondary-button"
              onClick={onClearSelection}
            >
              Clear Selection
            </button>
          )}

        {isHeld && onCancelReservation && (
          <button
            type="button"
            className="reservation-secondary-button"
            onClick={onCancelReservation}
          >
            Cancel Reservation
          </button>
        )}
      </div>
    </aside>
  );
}

export default ReservationSummary;