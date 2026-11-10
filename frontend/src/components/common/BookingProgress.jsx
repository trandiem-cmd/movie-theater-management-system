import "./BookingProgress.css";

const steps = [
  "Seats",
  "Sign in / Guest",
  "Tickets",
  "Review",
  "Payment",
];

function BookingProgress({ currentStep = 1 }) {
  return (
    <nav
      className="booking-progress"
      aria-label="Booking progress"
    >
      <div className="booking-progress-header">
        <span>YOUR BOOKING</span>
        <span>
          STEP {currentStep} OF {steps.length}
        </span>
      </div>

      <div className="booking-progress-steps">
        {steps.map((step, index) => {
          const stepNumber = index + 1;

          return (
            <div
              key={step}
              className={`booking-progress-step ${
                stepNumber === currentStep ? "active" : ""
              } ${
                stepNumber < currentStep ? "completed" : ""
              }`}
              aria-current={
                stepNumber === currentStep ? "step" : undefined
              }
            >
              <div className="booking-progress-line" />
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default BookingProgress;