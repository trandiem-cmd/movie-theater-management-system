import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getShowtimeSeats } from "../../api";

import SeatMap from "../../components/seat/SeatMap";
import SeatLegend from "../../components/seat/SeatLegend";
import MovieInfoCard from "../../components/movie/MovieInfoCard";
import BookingProgress from "../../components/booking/BookingProgress";

import "./SeatSelectionPage.css";

function SeatSelectionPage() {
  const { id: showtimeId } = useParams();
  const location = useLocation();

  const movieId = location.state?.movieId;
  const showtime = location.state?.showtime ?? null;

  const [movie, setMovie] = useState(null);
  const [movieLoading, setMovieLoading] = useState(true);
  const [movieError, setMovieError] = useState("");

  const [seats, setSeats] = useState([]);
  const [wheelchairSpaces, setWheelchairSpaces] = useState([]);
  const [seatsLoading, setSeatsLoading] = useState(true);
  const [seatsError, setSeatsError] = useState("");

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedWheelchairSpaces, setSelectedWheelchairSpaces] = useState([]);
  const [seatLimitError, setSeatLimitError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  const formattedShowtime = showtime
    ? {
        cinema: showtime.theater_name,
        auditorium: showtime.room_name,
        location: showtime.city,
        date: new Date(showtime.start_time).toLocaleDateString("en-GB", {
          timeZone: "Europe/Helsinki",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        doorsOpen: showtime.door_open_time,
        advertisementsStart: showtime.advertisement_start_time,
        time: showtime.start_time,
        movieEnds: showtime.end_time,
        ticketPrice: showtime.base_price,
      }
    : null;

  // Load movie details
  useEffect(() => {
    let cancelled = false;

    async function loadMovie() {
      setMovieLoading(true);
      setMovieError("");

      if (!movieId) {
        setMovieError("Movie ID is missing.");
        setMovieLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/movies/${movieId}`
        );

        if (!response.ok) {
          throw new Error("Failed to load movie details.");
        }

        const result = await response.json();

        if (!cancelled) {
          setMovie(result.data ?? result);
        }
      } catch (error) {
        if (!cancelled) {
          setMovieError(error.message);
        }
      } finally {
        if (!cancelled) {
          setMovieLoading(false);
        }
      }
    }

    loadMovie();

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  // Load real seat availability
  useEffect(() => {
    let cancelled = false;

    async function loadSeats() {
      setSeatsLoading(true);
      setSeatsError("");
      setSelectedSeats([]);
      setSelectedWheelchairSpaces([]);
      setCurrentStep(1);

      try {
        const result = await getShowtimeSeats(showtimeId);
        const data = result.data ?? result;

        if (!cancelled) {
          setSeats(
            data.seats.map((seat) => ({
              id: seat.seatId,
              row: seat.rowNumber,
              number: seat.seatNumber,
              displayOrder: seat.displayOrder,
              status: seat.status,
            }))
          );

          setWheelchairSpaces(
            data.wheelchairSpaces.map((space) => ({
              id: space.wheelchairSpaceId,
              spaceNumber: space.spaceNumber,
              status: space.status,
            }))
          );
        }
      } catch (error) {
        if (!cancelled) {
          setSeatsError(error.message || "Failed to load seats.");
        }
      } finally {
        if (!cancelled) {
          setSeatsLoading(false);
        }
      }
    }

    if (showtimeId) {
      loadSeats();
    } else {
      setSeatsError("Showtime ID is missing.");
      setSeatsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [showtimeId]);

  const totalSelected =
    selectedSeats.length + selectedWheelchairSpaces.length;

  // Select or deselect a regular seat
  function handleSeatClick(seatNumber) {
    setSeatLimitError("");

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats((previous) =>
        previous.filter((number) => number !== seatNumber)
      );
      return;
    }

    if (totalSelected >= 6) {
      setSeatLimitError("You can select a maximum of 6 seats per booking.");
      return;
    }

    setSelectedSeats((previous) => [...previous, seatNumber]);
  }

  // Select or deselect a wheelchair space
  function handleWheelchairClick(spaceNumber) {
    setSeatLimitError("");

    if (selectedWheelchairSpaces.includes(spaceNumber)) {
      setSelectedWheelchairSpaces((previous) =>
        previous.filter((number) => number !== spaceNumber)
      );
      return;
    }

    if (totalSelected >= 6) {
      setSeatLimitError("You can select a maximum of 6 seats per booking.");
      return;
    }

    setSelectedWheelchairSpaces((previous) => [
      ...previous,
      spaceNumber,
    ]);
  }

  // Group selected seats using actual database rows
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
      })
      .join(" | ");
  }

  return (
    <div className="seat-selection-page">
      {currentStep === 1 ? (
        <Link
          to={movieId ? `/movies/${movieId}` : "/movies"}
          className="booking-back-link"
        >
          <ArrowLeft size={20} strokeWidth={2} />
          Back to Showtimes
        </Link>
      ) : (
        <button
          type="button"
          className="booking-back-link"
          onClick={() => setCurrentStep(1)}
        >
          <ArrowLeft size={20} strokeWidth={2} />
          Back to Seats
        </button>
      )}

      {movieLoading ? (
        <p>Loading movie details...</p>
      ) : movieError ? (
        <p>{movieError}</p>
      ) : (
        <MovieInfoCard movie={movie} showtime={formattedShowtime} />
      )}

      <BookingProgress
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step === 1) {
            setCurrentStep(1);
          }
        }}
      />

      {currentStep === 1 ? (
        <>
          <h1>Select Your Seats</h1>
          <p>Choose your preferred seats for this showtime.</p>

          <div className="seat-selection-layout">
            <section className="seat-map-section">
              <div className="seat-map-with-legend">
                {seatsLoading ? (
                  <p>Loading seats...</p>
                ) : seatsError ? (
                  <p role="alert">{seatsError}</p>
                ) : (
                  <SeatMap
                    seats={seats}
                    wheelchairSpaces={wheelchairSpaces}
                    selectedSeats={selectedSeats}
                    onSeatClick={handleSeatClick}
                    selectedWheelchairSpaces={selectedWheelchairSpaces}
                    onWheelchairClick={handleWheelchairClick}
                  />
                )}

                <SeatLegend isCustomer />
              </div>
            </section>

            <aside className="seat-details-section">
              <h2>Your Selection</h2>

              {totalSelected === 0 ? (
                <p>No seats selected yet.</p>
              ) : (
                <p>
                  Seats Selected:{" "}
                  <span style={{ color: "#D4AF37" }}>
                    {[
                      selectedSeats.length > 0
                        ? formatSelectedSeats()
                        : "",
                      selectedWheelchairSpaces.length > 0
                        ? selectedWheelchairSpaces
                            .map(
                              (number) => `Wheelchair Space ${number}`
                            )
                            .join(", ")
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </span>
                </p>
              )}

              {seatLimitError && (
                <p className="seat-limit-error" role="alert">
                  {seatLimitError}
                </p>
              )}

              <button
                type="button"
                disabled={
                  totalSelected === 0 ||
                  seatsLoading ||
                  Boolean(seatsError)
                }
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
