
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SeatMap from "../../components/seat/SeatMap";
import SeatLegend from "../../components/seat/SeatLegend";
import MovieInfoCard from "../../components/movie/MovieInfoCard";
import BookingProgress from "../../components/common/BookingProgress";
import "./SeatSelectionPage.css";

function SeatSelectionPage() {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);

  const location = useLocation();

  // Movie ID can be passed from the movie details page.
  const movieId = location.state?.movieId;

  function handleSeatClick(seatNumber) {
    setSelectedSeats((previousSeats) =>
      previousSeats.includes(seatNumber)
        ? previousSeats.filter((number) => number !== seatNumber)
        : [...previousSeats, seatNumber]
    );
  }

  function formatSelectedSeats() {
    const groupedSeats = selectedSeats.reduce((groups, seatNumber) => {
      const rowIndex = Math.floor((seatNumber - 1) / 10);
      const rowNumber = rowIndex >= 12 ? rowIndex + 2 : rowIndex + 1;
      const seatInRow = ((seatNumber - 1) % 10) + 1;

      if (!groups[rowNumber]) {
        groups[rowNumber] = [];
      }

      groups[rowNumber].push(seatInRow);

      return groups;
    }, {});

    return Object.entries(groupedSeats)
      .map(([row, seats]) => {
        seats.sort((a, b) => a - b);

        return `Row ${row}, ${
          seats.length === 1 ? "Seat" : "Seats"
        } ${seats.join(", ")}`;
      })
      .join(" | ");
  }

  return (
    <div className="seat-selection-page">
      <MovieInfoCard movie={null} showtime={null} />
      {currentStep === 1 ? (
        <Link
  to={movieId ? `/movies/${movieId}` : "/movies"}
  className="booking-back-link"
>
  <span aria-hidden="true">←</span>
  Back to Showtimes
</Link>
      ) : (
        <button
          type="button"
          className="booking-back-link"
          onClick={() => setCurrentStep(1)}
        >
          <span aria-hidden="true">←</span>
          Back to Seats
        </button>
      )}

      

      <BookingProgress currentStep={currentStep} />

      {currentStep === 1 ? (
        <>
          <h1>Select Your Seats</h1>
          <p>Choose your preferred seats for this showtime.</p>

          <div className="seat-selection-layout">
            <section className="seat-map-section">
              <div className="seat-map-with-legend">
                <SeatMap
                  selectedSeats={selectedSeats}
                  onSeatClick={handleSeatClick}
                  rowCount={14}
                />

                <SeatLegend />
              </div>
            </section>

            <aside className="seat-details-section">
              <h2>Your Selection</h2>

              {selectedSeats.length === 0 ? (
                <p>No seats selected yet.</p>
              ) : (
                <p>
                  Seats Selected:{" "}
                  <span style={{ color: "#D4AF37" }}>
                    {formatSelectedSeats()}
                  </span>
                </p>
              )}

              <button
                type="button"
                disabled={selectedSeats.length === 0}
                onClick={() => setCurrentStep(2)}
              >
                Continue to Booking
              </button>
            </aside>
          </div>
        </>
      ) : (
        <section className="booking-next-step">
          <h2>Sign in / Continue as Guest</h2>

          <div className="booking-placeholder">
            Sign-in and guest booking options will be available
            when connected to the booking system.
          </div>
        </section>
      )}
    </div>
  );
}

export default SeatSelectionPage;
