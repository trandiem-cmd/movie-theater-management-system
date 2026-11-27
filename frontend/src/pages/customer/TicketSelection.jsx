
import { useMemo, useState, useEffect } from "react";
import "./TicketSelection.css";

function TicketSelection({
  selectedSeats = [],
  selectedWheelchairSpaces = [],
  seats = [],
  wheelchairSpaces = [],
  showtime = null,
  reservation = null,
  onContinue,
}) {
const [remainingSeconds, setRemainingSeconds] = useState(600);

useEffect(() => {
  if (!reservation?.expiresAt) return;

  const updateCountdown = () => {
    const remaining = Math.max(
      0,
      Math.ceil(
        (new Date(reservation.expiresAt).getTime() - Date.now()) / 1000
      )
    );

    setRemainingSeconds(remaining);
  };

  updateCountdown();

  const interval = setInterval(updateCountdown, 1000);

  return () => clearInterval(interval);
}, [reservation?.expiresAt]);

const minutes = Math.floor(remainingSeconds / 60);
const seconds = remainingSeconds % 60;

  const [regularQuantity, setRegularQuantity] = useState(
    selectedSeats.length
  );
  const [childQuantity, setChildQuantity] = useState(0);
  const [wheelchairQuantity, setWheelchairQuantity] = useState(
    selectedWheelchairSpaces.length
  );

  const basePrice = Number(
    String(showtime?.ticketPrice ?? "0").replace(/[^\d.]/g, "")
  );

  const regularPrice = basePrice;
  const childPrice = basePrice * 0.5;
  const wheelchairPrice = basePrice;

  const totalPrice = useMemo(
    () =>
      regularQuantity * regularPrice +
      childQuantity * childPrice +
      wheelchairQuantity * wheelchairPrice,
    [
      regularQuantity,
      childQuantity,
      wheelchairQuantity,
      regularPrice,
      childPrice,
      wheelchairPrice,
    ]
  );

  const normalSeatCount = selectedSeats.length;
  const wheelchairSpaceCount = selectedWheelchairSpaces.length;

  const normalTicketsSelected = regularQuantity + childQuantity;

  const selectedSeatDetails = selectedSeats.map((seatNumber) => {
    const seat = seats.find((item) => item.number === seatNumber);
    return seat ? `Seat ${seatNumber}` : `Seat ${seatNumber}`;
  });

  const canContinue =
    normalTicketsSelected === normalSeatCount &&
    wheelchairQuantity === wheelchairSpaceCount &&
    normalSeatCount + wheelchairSpaceCount > 0;

  const updateQuantity = (type, change) => {
    if (type === "regular") {
      const next = regularQuantity + change;
      if (next < 0 || next + childQuantity > normalSeatCount) return;
      setRegularQuantity(next);
    }

    if (type === "child") {
      const next = childQuantity + change;
      if (next < 0 || regularQuantity + next > normalSeatCount) return;
      setChildQuantity(next);
    }

    if (type === "wheelchair") {
      const next = wheelchairQuantity + change;
      if (next < 0 || next > wheelchairSpaceCount) return;
      setWheelchairQuantity(next);
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;

    onContinue?.({
      tickets: {
        regular: regularQuantity,
        child: childQuantity,
        wheelchair: wheelchairQuantity,
      },
      prices: {
        regular: regularPrice,
        child: childPrice,
        wheelchair: wheelchairPrice,
        total: Number(totalPrice.toFixed(2)),
      },
      selectedSeats,
      selectedWheelchairSpaces,
    });
  };

  const formatPrice = (price) =>
    `${price.toFixed(2)} €`;

  return (
    <section className="ticket-selection">
      <div className="ticket-selection-main">
        <h2>Select your tickets</h2>

        <div className="reservation-countdown">
        Reservation time remaining:{" "}
        <strong>
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
        </strong>
        </div>
        
        <div className="ticket-type-list">
          <TicketRow
            name="Regular"
            price={regularPrice}
            quantity={regularQuantity}
            onDecrease={() => updateQuantity("regular", -1)}
            onIncrease={() => updateQuantity("regular", 1)}
          />

          <TicketRow
            name="Child"
            description="-50% · up to age 12"
            price={childPrice}
            quantity={childQuantity}
            onDecrease={() => updateQuantity("child", -1)}
            onIncrease={() => updateQuantity("child", 1)}
          />

          <TicketRow
            name="Wheelchair"
            price={wheelchairPrice}
            quantity={wheelchairQuantity}
            onDecrease={() => updateQuantity("wheelchair", -1)}
            onIncrease={() => updateQuantity("wheelchair", 1)}
          />
        </div>

        {!canContinue && (
          <p className="ticket-selection-hint">
            Select a ticket type for every selected seat and wheelchair space.
          </p>
        )}
      </div>

      <aside className="ticket-summary">
        <h3>Your tickets</h3>

        <p>
          {regularQuantity + childQuantity + wheelchairQuantity} tickets selected
        </p>

        <div className="ticket-summary-line">
          <span>Regular × {regularQuantity}</span>
          <span>{formatPrice(regularQuantity * regularPrice)}</span>
        </div>

        <div className="ticket-summary-line">
          <span>Child × {childQuantity}</span>
          <span>{formatPrice(childQuantity * childPrice)}</span>
        </div>

        <div className="ticket-summary-line">
          <span>Wheelchair × {wheelchairQuantity}</span>
          <span>{formatPrice(wheelchairQuantity * wheelchairPrice)}</span>
        </div>

        <div className="ticket-summary-total">
          <strong>Total</strong>
          <strong>{formatPrice(totalPrice)}</strong>
        </div>

        <div className="ticket-summary-seats">
          <strong>Selected seats</strong>
          <p>{selectedSeatDetails.join(", ") || "No regular seats"}</p>
          <p>
            {selectedWheelchairSpaces.length
              ? `Wheelchair spaces: ${selectedWheelchairSpaces.join(", ")}`
              : "No wheelchair spaces"}
          </p>
        </div>

        <button
          type="button"
          className="ticket-continue-button"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continue to riview
        </button>
      </aside>
    </section>
  );
}

function TicketRow({
  name,
  description,
  price,
  quantity,
  onDecrease,
  onIncrease,
}) {
  return (
    <div className="ticket-row">
      <div className="ticket-row-information">
        <h3>{name}</h3>

        {description && <p>{description}</p>}

        <span>{price.toFixed(2)} €</span>
      </div>

      <div className="ticket-quantity">
        <button type="button" onClick={onDecrease}>−</button>
        <span>{quantity}</span>
        <button type="button" onClick={onIncrease}>+</button>
      </div>
    </div>
  );
}

export default TicketSelection;
