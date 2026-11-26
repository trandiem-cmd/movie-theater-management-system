import "./BookingProgress.css";

const steps = [
  "Seats",
  "Sign in / Guest",
  "Tickets",
  "Review",
  "Payment",
];

function BookingProgress({ currentStep, onStepClick }) {
  return (
    <nav className="booking-progress" aria-label="Booking progress">
      <div className="booking-progress-header">
        <span>YOUR BOOKING</span>
        <span>STEP {currentStep} OF {steps.length}</span>
      </div>

      <div className="booking-progress-steps">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const canClick =
            stepNumber < currentStep && Boolean(onStepClick);

          return (
            <div
              key={step}
              className={`booking-progress-step ${
                stepNumber === currentStep ? "active" : ""
              } ${stepNumber < currentStep ? "completed" : ""}`}
              aria-current={
                stepNumber === currentStep ? "step" : undefined
              }
            >
              {canClick ? (
                <button
                  type="button"
                  className="booking-progress-line booking-progress-line-clickable"
                  onClick={() => onStepClick(stepNumber)}
                  aria-label={`Go back to ${step}`}
                />
              ) : (
                <div className="booking-progress-line" />
              )}

              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default BookingProgress;
