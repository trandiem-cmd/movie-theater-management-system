
import { useEffect, useRef, useState } from "react";

import {
  getCurrentUser,
  createReservation,
  updateReservation,
  createBooking,
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
  const [bookingLoading, setBookingLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState("checking");
  const [customerType, setCustomerType] = useState(null);

  const [error, setError] = useState("");
  const [reservation, setReservation] = useState(null);
  const [ticketSelection, setTicketSelection] = useState(null);
  const [booking, setBooking] = useState(null);

  const bookingRequestLock = useRef(false);
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

  // Update the existing reservation when selected seats change.
  useEffect(() => {
    if (previousSyncKey.current === syncKey) {
      return;
    }

    previousSyncKey.current = syncKey;

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

        setTicketSelection(null);
        setBooking(null);
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

  // Create a Booking from the current Reservation.
  async function handleCreateBooking(bookingType) {
    // Prevent duplicate Booking requests.
    if (bookingRequestLock.current || bookingLoading) {
      return;
    }

    // Validate Reservation.
    if (!reservation?.reservationId) {
      setError("Reservation could not be found. Please try again.");
      return;
    }

    // Validate ticket selection.
    if (!ticketSelection?.tickets) {
      setError("Ticket selection could not be found.");
      return;
    }

    // Validate Booking type.
    if (!["buy_now", "reserve"].includes(bookingType)) {
      setError("Invalid booking type.");
      return;
    }

    // Only registered customers can reserve tickets.
    if (
      bookingType === "reserve" &&
      customerType !== "registered"
    ) {
      setError("Please sign in to reserve tickets.");
      return;
    }

    bookingRequestLock.current = true;
    setBookingLoading(true);
    setError("");

    try {
      // Create Booking through Backend.
      const result = await createBooking({
        reservationId: reservation.reservationId,
        bookingType,
        customerEmail:
          reservation.customerEmail || currentUser?.email,
        tickets: {
          regular: Number(ticketSelection.tickets.regular),
          child: Number(ticketSelection.tickets.child),
          wheelchair: Number(ticketSelection.tickets.wheelchair),
        },
      });

      // Validate Backend response.
      if (!result?.success || !result?.data) {
        throw new Error(
          result?.message || "Could not create your booking."
        );
      }

      const bookingData = result.data;

      // Save Booking information.
      setBooking(bookingData);

      // BUY NOW: Redirect to Stripe Checkout.
      if (bookingType === "buy_now") {
        const checkoutUrl = bookingData.checkoutUrl;

        if (!checkoutUrl) {
          setError(
            bookingData.checkoutError ||
              "Booking was created, but Stripe Checkout could not be started. Please contact support."
          );

          goToStep("booking-created", 5);
          return;
        }

        // Validate Stripe Checkout URL before redirecting.
        const checkoutUrlObject = new URL(checkoutUrl);

        if (
          checkoutUrlObject.protocol !== "https:" ||
          checkoutUrlObject.hostname !== "checkout.stripe.com"
        ) {
          throw new Error("Invalid Stripe Checkout URL.");
        }

        // Redirect customer to Stripe hosted Checkout.
        window.location.assign(checkoutUrl);
        return;
      }

      // RESERVE: Payment will be made at the cinema counter.
      goToStep("booking-created", 5);

    } catch (err) {
      console.error("Create Booking error:", err);

      setError(
        err.message || "Failed to create booking. Please try again."
      );
    } finally {
      bookingRequestLock.current = false;
      setBookingLoading(false);
    }
  }

  function handleBuyNow() {
    handleCreateBooking("buy_now");
  }

  function handleReserve() {
    if (customerType !== "registered") {
      setError("Please sign in to reserve tickets.");
      return;
    }

    handleCreateBooking("reserve");
  }

  // Loading states.
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

  if (bookingLoading) {
    return (
      <div className="booking-flow">
        <p>Creating your booking...</p>
        <p>Please do not close this page.</p>
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
          loading={bookingLoading}
          error={error}
        />
      </div>
    );
  }

  // Booking created successfully.
  if (currentStep === "booking-created" && booking) {
    const isReserve = booking.bookingType === "reserve";

    return (
      <div className="booking-flow booking-result">
        <h2>
          {isReserve
            ? "Reservation booking created"
            : "Online booking created"}
        </h2>

        <p>
          Your booking has been created successfully.
        </p>

        <div className="booking-result-details">
          <p>
            <strong>Booking code:</strong>{" "}
            {booking.bookingCode}
          </p>

          <p>
            <strong>Total amount:</strong>{" "}
            {Number(booking.totalAmount).toFixed(2)}{" "}
            {booking.currency || "EUR"}
          </p>

          <p>
            <strong>Booking status:</strong>{" "}
            {booking.status}
          </p>

          <p>
            <strong>Payment status:</strong>{" "}
            {booking.paymentStatus}
          </p>

          <p>
            <strong>Expires at:</strong>{" "}
            {booking.expiresAt
              ? new Date(booking.expiresAt).toLocaleString()
              : "Not specified"}
          </p>
        </div>

        {isReserve ? (
          <div>
            <h3>Payment at the counter</h3>
            <p>
              Please pay at the cinema counter before your
              booking expires.
            </p>
          </div>
        ) : (
          <div>
            <h3>Online payment</h3>
            <p>
              Your booking has been created. Stripe Checkout
              integration is the next step.
            </p>
          </div>
        )}
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
