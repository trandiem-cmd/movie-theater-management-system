import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin, CalendarDays } from "lucide-react";
import "./ShowtimePage.css";
import { Link } from "react-router-dom";

const TIME_ZONE = "Europe/Helsinki";

function getHelsinkiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getNextSevenDays() {
  const today = getHelsinkiDate();
  const [year, month, day] = today.split("-").map(Number);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day + index));

    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  });
}

function formatDateLabel(dateString, index) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return {
    weekday:
      index === 0
        ? "Today"
        : new Intl.DateTimeFormat("en-GB", {
            timeZone: TIME_ZONE,
            weekday: "short",
          }).format(date),
    date: new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "short",
    }).format(date),
  };
}

function getShowtimeDate(timestamp) {
  return getHelsinkiDate(new Date(timestamp));
}

function formatShowtimeTime(timestamp) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

export default function ShowtimePage({ movieId }) {
  const dates = useMemo(() => getNextSevenDays(), []);

  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [showtimes, setShowtimes] = useState([]);

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadShowtimes() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/movies/${movieId}/showtimes`
        );

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Could not load showtimes."
          );
        }

        if (!cancelled) {
          setShowtimes(
            Array.isArray(result.data) ? result.data : []
          );
          setSelectedCity("");
          setSelectedRoom("");
          setSelectedShowtime(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load showtimes.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (movieId) {
      loadShowtimes();
    }

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  // Get all available cinema locations.
  const cities = useMemo(() => {
    return [
      ...new Set(
        showtimes
          .map((showtime) => showtime.city)
          .filter(Boolean)
      ),
    ].sort();
  }, [showtimes]);

// Get auditoriums belonging to the selected city.
const rooms = useMemo(() => {
  return showtimes
    .filter((showtime) => showtime.city === selectedCity)
    .reduce((uniqueRooms, showtime) => {
      const exists = uniqueRooms.some(
        (room) => String(room.room_id) === String(showtime.room_id)
      );

      if (!exists) {
        uniqueRooms.push({
          room_id: showtime.room_id,
          room_name: showtime.room_name,
        });
      }

      return uniqueRooms;
    }, [])
    .sort((a, b) => a.room_name.localeCompare(b.room_name));
}, [showtimes, selectedCity]);

// Filter showtimes by date, city and auditorium.
const dailyShowtimes = useMemo(() => {
  return showtimes.filter(
    (showtime) =>
      getShowtimeDate(showtime.door_open_time) === selectedDate &&
      showtime.city === selectedCity &&
      String(showtime.room_id) === String(selectedRoom)
  );
}, [showtimes, selectedDate, selectedCity, selectedRoom]);

function handleCityChange(event) {
  setSelectedCity(event.target.value);
  setSelectedRoom("");
  setSelectedShowtime(null);
}

function handleRoomChange(event) {
  setSelectedRoom(event.target.value);
  setSelectedShowtime(null);
}

  function handleDateChange(date) {
    setSelectedDate(date);
    setSelectedShowtime(null);
  }

  return (
    <section className="customer-showtimes">
      <h2>
        <CalendarDays size={23} />
        Showtimes
      </h2>

      <p className="customer-showtimes-description">
        Select your cinema location, Auditorium and date to see
        available showtimes.
      </p>

      {loading ? (
        <p className="showtime-feedback">
          Loading available showtimes...
        </p>
      ) : error ? (
        <p className="showtime-feedback error">{error}</p>
      ) : showtimes.length === 0 ? (
        <p className="showtime-feedback">
          No showtimes are currently available for this movie
          during the next seven days.
        </p>
      ) : (
        <>
          {/* Cinema location and theater selection */}
          <div className="showtime-location-filters">
            <div className="showtime-filter">
              <label htmlFor="showtime-city">
                <MapPin size={16} />
                Cinema Location
              </label>

              <select
                id="showtime-city"
                value={selectedCity}
                onChange={handleCityChange}
              >
                <option value="">Choose a location</option>

                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

        <div className="showtime-filter">
        <label htmlFor="showtime-theater">
            <MapPin size={16} />
            Theater
        </label>

        <select
            id="showtime-theater"
            value={selectedRoom}
            onChange={handleRoomChange}
            disabled={!selectedCity || rooms.length === 0}
        >
            <option value="">Choose a theater</option>

            {rooms.map((room) => (
            <option key={room.room_id} value={room.room_id}>
                {room.room_name}
            </option>
            ))}
        </select>
        </div>
          </div>

          {/* Seven-day date selector */}
          <div className="showtime-date-list">
            {dates.map((date, index) => {
              const label = formatDateLabel(date, index);

              return (
                <button
                  key={date}
                  type="button"
                  className={`showtime-date-button ${
                    selectedDate === date ? "active" : ""
                  }`}
                  onClick={() => handleDateChange(date)}
                >
                  <span>{label.weekday}</span>
                  <strong>{label.date}</strong>
                </button>
              );
            })}
          </div>

          {/* Available showtimes */}
          {!selectedCity ? (
            <p className="showtime-feedback">
              Please choose a cinema location.
            </p>
          ) : !selectedRoom ? (
            <p className="showtime-feedback">
              Please choose a theater to see its showtimes.
            </p>
          ) : dailyShowtimes.length === 0 ? (
            <p className="showtime-feedback">
              No showtimes available at this cinema on the
              selected date.
            </p>
          ) : (
            <>
              <div className="customer-showtime-list">
                {dailyShowtimes.map((showtime) => (
                  <button
                    key={showtime.showtime_id}
                    type="button"
                    className={`customer-showtime-button ${
                      selectedShowtime?.showtime_id ===
                      showtime.showtime_id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => setSelectedShowtime(showtime)}
                  >
                    <Clock3 size={16} />
                    {formatShowtimeTime(showtime.door_open_time)}
                  </button>
                ))}
              </div>

              {selectedShowtime && (
                <div className="customer-showtime-selected-details">
                  <p>
                    <strong>Cinema:</strong>{" "}
                    {selectedShowtime.theater_name}
                  </p>

                  <p>
                    <strong>Auditorium:</strong>{" "}
                    {selectedShowtime.room_name}
                  </p>

                  <p>
                    <strong>Location:</strong>{" "}
                    {selectedShowtime.city}
                  </p>

                  <p>
                    <strong>Doors open:</strong>{" "}
                    {formatShowtimeTime(selectedShowtime.door_open_time)}
                  </p>

                  <p>
                    <strong>Advertisements start:</strong>{" "}
                    {formatShowtimeTime(
                      selectedShowtime.advertisement_start_time
                    )}
                  </p>

                  <p>
                    <strong>Movie starts:</strong>{" "}
                    {formatShowtimeTime(selectedShowtime.start_time)}
                  </p>

                  <p>
                    <strong>Movie ends:</strong>{" "}
                    {formatShowtimeTime(selectedShowtime.end_time)}
                  </p>

                  <p>
                    <strong>Ticket price:</strong>{" "}
                    €{Number(selectedShowtime.base_price).toFixed(2)}
                  </p>
                </div>
              )}
                {selectedShowtime && (
                  <Link
                    to={`/showtimes/${selectedShowtime.showtime_id}/seats`}
                    state={{
                      movieId,
                      showtime: selectedShowtime,
                    }}
                    className="movie-detail-showtime-btn"
                  >
                    Select Seat
                  </Link>
                )}

            </>
          )}
        </>
      )}
    </section>
  );
}
