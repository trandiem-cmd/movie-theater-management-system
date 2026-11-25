import { useEffect, useRef, useState } from "react";
import {
  getCurrentUser,
  createReservation,
  updateReservation,
} from "../../api";

import TicketSelection from "../../pages/customer/TicketSelection";
import GuestBookingForm from "./GuestBookingForm";
import ReviewStep from "./ReviewStep";

function BookingFlow({
  selectedSeats = [],
  selectedWheelchairSpaces = [],
  seats = [],
  wheelchairSpaces = [],
  showtime = null,
  showtimeId,
  onStepChange,
  syncKey = 0,
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("checking");
  const [customerType, setCustomerType] = useState(null);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState(null);
  const [ticketSelection, setTicketSelection] = useState(null);

  const previousSyncKey = useRef(syncKey);

  function goToStep(step, progressStep) {
    setCurrentStep(step);

    if (progressStep !== undefined) {
      onStepChange?.(progressStep);
    }
  }

  async function createSeatReservation(customerEmail) {
    const seatIds = selectedSeats.map((seatNumber) => {
      const seat = seats.find(
        (item) => String(item.number) === String(seatNumber)
      );

      return seat?.id;
    });

    const wheelchairSpaceIds = selectedWheelchairSpaces.map(
      (spaceNumber) => {
        const space = wheelchairSpaces.find(
          (item) =>
            String(item.spaceNumber) === String(spaceNumber)
        );

        return space?.id;
      }
    );

    if (
      seatIds.some((id) => !id) ||
      wheelchairSpaceIds.some((id) => !id)
    ) {
      throw new Error(
        "Could not identify all selected seats. Please refresh the seat map."
      );
    }

    const result = await createReservation({
      showtimeId: Number(showtimeId),
      customerEmail: customerEmail.trim().toLowerCase(),
      seatIds,
      wheelchairSpaceIds,
    });

    const reservationData = result.data ?? result;

    setReservation(reservationData);

    return reservationData;
  }

  async function updateSeatReservation() {
    if (!reservation?.reservationId) {
      throw new Error(
        "Your reservation could not be found. Please try again."
      );
    }

    const seatIds = selectedSeats.map((seatNumber) => {
      const seat = seats.find(
        (item) => String(item.number) === String(seatNumber)
      );

      return seat?.id;
    });

    const wheelchairSpaceIds = selectedWheelchairSpaces.map(
      (spaceNumber) => {
        const space = wheelchairSpaces.find(
          (item) =>
            String(item.spaceNumber) === String(spaceNumber)
        );

        return space?.id;
      }
    );

    if (
      seatIds.some((id) => !id) ||
      wheelchairSpaceIds.some((id) => !id)
    ) {
      throw new Error(
        "Could not identify all selected seats. Please refresh the seat map."
      );
    }

    const customerEmail = (
      reservation.customerEmail ||
      currentUser?.email ||
      ""
    )
      .trim()
      .toLowerCase();

    if (!customerEmail) {
      throw new Error(
        "Customer email could not be found. Please try again."
      );
    }

    const result = await updateReservation({
      reservationId: reservation.reservationId,
      showtimeId: Number(showtimeId),
      customerEmail,
      seatIds,
      wheelchairSpaceIds,
    });

    const reservationData = result.data ?? result;

    setReservation(reservationData);

    return reservationData;
  }

  // Check whether the customer is already signed in.
  useEffect(() => {
    let cancelled = false;

    async function checkAuthentication() {
      setAuthLoading(true);
      setError("");

      try {
        const result = await getCurrentUser();

        if (cancelled) return;

        const user = result?.data ?? result;

        if (user?.email) {
          setCurrentUser(user);
          setCustomerType("registered");

          const newReservation = await createSeatReservation(
            user.email
          );

          if (cancelled) return;

          setReservation(newReservation);
          goToStep("tickets", 3);
        } else {
          setCurrentUser(null);
          setCustomerType("guest");
          goToStep("sign-in", 2);
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err.message ||
            "Could not check your sign-in status. Please try again."
        );

        goToStep("sign-in", 2);
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      cancelled = true;
    };
  }, []);

  // Update the existing reservation when the customer changes seats
  // and continues from the seat map.
  useEffect(() => {
    if (previousSyncKey.current === syncKey) {
      return;
    }

    previousSyncKey.current = syncKey;

    // No reservation exists yet. The normal guest/sign-in flow
    // will create one using the latest selected seats.
    if (!reservation?.reservationId) {
      setTicketSelection(null);
      return;
    }

    let cancelled = false;

    async function syncReservation() {
      setError("");
      setReservationLoading(true);

      try {
        await updateSeatReservation();

        if (cancelled) return;

        // Reset the old ticket quantities and Review information.
        setTicketSelection(null);
        goToStep("tickets", 3);
      } catch (err) {
        if (cancelled) return;

        setError(
          err.message ||
            "Could not update your selected seats. Please try again."
        );

        goToStep("reservation-error");
      } finally {
        if (!cancelled) {
          setReservationLoading(false);
        }
      }
    }

    syncReservation();

    return () => {
      cancelled = true;
    };
    // This effect should run only when the seat-map sync key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  async function handleGuestContinue(email) {
    setError("");
    setReservationLoading(true);

    try {
      const newReservation = await createSeatReservation(email);

      setReservation(newReservation);
      setCustomerType("guest");
      setCurrentUser({ email });
      setTicketSelection(null);

      goToStep("tickets", 3);
    } catch (err) {
      setError(
        err.message || "Could not reserve your selected seats."
      );
    } finally {
      setReservationLoading(false);
    }
  }

  async function handleRegisteredContinue() {
    setError("");
    setReservationLoading(true);

    try {
      const result = await getCurrentUser();
      const user = result?.data ?? result;

      if (!user?.email) {
        throw new Error("Please sign in before continuing.");
      }

      setCurrentUser(user);
      setCustomerType("registered");

      const newReservation = await createSeatReservation(user.email);

      setReservation(newReservation);
      setTicketSelection(null);

      goToStep("tickets", 3);
    } catch (err) {
      setError(
        err.message || "Could not reserve your selected seats."
      );
    } finally {
      setReservationLoading(false);
    }
  }

  function handleTicketContinue(selection) {
    setTicketSelection(selection);
    goToStep("review", 4);
  }

  async function retryReservation() {
    setError("");
    setReservationLoading(true);

    try {
      // If a reservation already exists, update it instead of
      // creating another reservation.
      if (reservation?.reservationId) {
        await updateSeatReservation();

        setTicketSelection(null);
        goToStep("tickets", 3);

        return;
      }

      const result = await getCurrentUser();
      const user = result?.data ?? result;

      if (user?.email) {
        setCurrentUser(user);
        setCustomerType("registered");

        const newReservation = await createSeatReservation(
          user.email
        );

        setReservation(newReservation);
        setTicketSelection(null);

        goToStep("tickets", 3);
      } else {
        goToStep("sign-in", 2);
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not complete your reservation. Please try again."
      );
    } finally {
      setReservationLoading(false);
    }
  }

  function handleBackToTickets() {
    goToStep("tickets", 3);
  }

  function handleBuyNow() {
    // Payment has not been implemented yet.
    console.log("Buy Now clicked", {
      reservation,
      ticketSelection,
    });
  }

  function handleReserve() {
    // This option is available only to registered customers.
    if (customerType !== "registered") {
      return;
    }

    console.log("Reserve clicked", {
      reservation,
      ticketSelection,
    });
  }

  if (authLoading || currentStep === "checking") {
    return (
      <div className="booking-flow">
        <p>Checking your account...</p>
      </div>
    );
  }

  if (reservationLoading) {
    return (
      <div className="booking-flow">
        <p>Updating your reservation...</p>
      </div>
    );
  }

  if (currentStep === "reservation-error") {
    return (
      <div className="booking-flow">
        <h2>Could not update your reservation</h2>

        {error && <p className="error-message">{error}</p>}

        <button
          type="button"
          onClick={retryReservation}
          disabled={reservationLoading}
        >
          Try Again
        </button>
      </div>
    );
  }

    if (currentStep === "sign-in") {
    return (
        <div className="booking-flow">
        <h2>Continue with your booking</h2>

        <p>
            Sign in to use your registered account, or continue as a
            guest using your email address.
        </p>

        {error && <p className="error-message">{error}</p>}

        <GuestBookingForm
            onContinue={(type, email) => {
            if (type === "guest") {
                handleGuestContinue(email);
            } else if (type === "registered") {
                handleRegisteredContinue();
            }
            }}
        />
        </div>
    );
    }

  if (currentStep === "tickets") {
    return (
      <div className="booking-flow">
        {error && <p className="error-message">{error}</p>}

        <TicketSelection
          key={syncKey}
          selectedSeats={selectedSeats}
          selectedWheelchairSpaces={selectedWheelchairSpaces}
          seats={seats}
          wheelchairSpaces={wheelchairSpaces}
          showtime={showtime}
          reservation={reservation}
          customer={currentUser}
          customerType={customerType}
          onContinue={handleTicketContinue}
        />
      </div>
    );
  }

  if (currentStep === "review") {
    return (
      <div className="booking-flow">
        {error && <p className="error-message">{error}</p>}

        <ReviewStep
          reservation={reservation}
          ticketSelection={ticketSelection}
          customer={currentUser}
          customerType={customerType}
          onBack={handleBackToTickets}
          onBuyNow={handleBuyNow}
          onReserve={handleReserve}
        />
      </div>
    );
  }

  return (
    <div className="booking-flow">
      <p>Something went wrong with your booking.</p>

      {error && <p className="error-message">{error}</p>}

      <button type="button" onClick={retryReservation}>
        Try Again
      </button>
    </div>
  );
}

export default BookingFlow;