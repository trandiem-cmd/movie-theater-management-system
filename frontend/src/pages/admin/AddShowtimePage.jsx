
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./adminSidebar";
import "./AddShowtimePage.css";

const API_BASE = "/api/admin";

const emptyForm = {
  city: "",
  room_id: "",
  movie_id: "",
  date: "",
  start_time: "",
  end_time: "",
  base_price: "12.00",
};

function getHelsinkiParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getHelsinkiDate() {
  const p = getHelsinkiParts(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

function getHelsinkiTime() {
  const p = getHelsinkiParts(new Date());
  return `${p.hour}:${p.minute}`;
}

// Converts a date and time entered in Finland into an ISO timestamp.
function helsinkiToISOString(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let result = new Date(wanted);

  for (let i = 0; i < 3; i += 1) {
    const p = getHelsinkiParts(result);
    const shown = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute)
    );
    result = new Date(result.getTime() + wanted - shown);
  }

  const check = getHelsinkiParts(result);
  if (
    Number(check.year) !== year ||
    Number(check.month) !== month ||
    Number(check.day) !== day ||
    Number(check.hour) !== hour ||
    Number(check.minute) !== minute
  ) {
    throw new Error(
      "This time is not valid in Finland because of the daylight-saving clock change."
    );
  }

  return result.toISOString();
}

function getEndTime(date, startTime, duration) {
  if (!date || !startTime || !duration) return "";

  try {
    const start = new Date(helsinkiToISOString(date, startTime));
    const end = new Date(start.getTime() + Number(duration) * 60000);
    const p = getHelsinkiParts(end);
    return `${p.hour}:${p.minute}`;
  } catch {
    return "";
  }
}

function getList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export default function AddShowtimePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    ...emptyForm,
    date: getHelsinkiDate(),
    start_time: "10:00",
    end_time: "11:30",
  });

  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true);
        setError("");

        const [movieResponse, roomResponse] = await Promise.all([
          fetch(`${API_BASE}/movies?page=1&limit=100`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/rooms`, {
            credentials: "include",
          }),
        ]);

        if (movieResponse.status === 401 || roomResponse.status === 401) {
          navigate("/login");
          return;
        }

        if (movieResponse.status === 403 || roomResponse.status === 403) {
          setError("You do not have permission to access this page.");
          return;
        }

        if (!movieResponse.ok || !roomResponse.ok) {
          throw new Error(
            "Could not load movies or auditoriums. Please check the admin API."
          );
        }

        const moviePayload = await movieResponse.json();
        const roomPayload = await roomResponse.json();

        setMovies(getList(moviePayload).filter(
          (movie) => movie.status !== "ended"
        ));

        setRooms(getList(roomPayload).filter(
          (room) => room.status === "active"
        ));
      } catch (err) {
        setError(err.message || "Something went wrong while loading the form.");
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, [navigate]);

  const locations = useMemo(() => {
    return [...new Set(rooms.map((room) => room.city).filter(Boolean))].sort();
  }, [rooms]);

  const availableRooms = useMemo(() => {
    return rooms.filter((room) => room.city === form.city);
  }, [rooms, form.city]);

  const selectedMovie = movies.find(
    (movie) => String(movie.movie_id) === String(form.movie_id)
  );

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const next = { ...current, [name]: value };

      if (name === "city") {
        next.room_id = "";
      }

      if (name === "movie_id" || name === "date" || name === "start_time") {
        const movie = name === "movie_id"
          ? movies.find((item) => String(item.movie_id) === value)
          : movies.find(
              (item) => String(item.movie_id) === String(current.movie_id)
            );

        const date = name === "date" ? value : current.date;
        const startTime = name === "start_time" ? value : current.start_time;

        if (movie?.duration && date && startTime) {
          next.end_time = getEndTime(date, startTime, movie.duration);
        }
      }

      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.city || !form.room_id || !form.movie_id) {
      setError("Please select a location, auditorium, and movie.");
      return;
    }

    if (!form.date || !form.start_time || !form.end_time) {
      setError("Please enter the date, start time, and end time.");
      return;
    }

    if (form.end_time <= form.start_time) {
      setError("End time must be later than start time.");
      return;
    }

    if (form.base_price === "" || Number(form.base_price) < 0) {
      setError("Please enter a valid ticket price.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        movie_id: Number(form.movie_id),
        room_id: Number(form.room_id),
        start_time: helsinkiToISOString(form.date, form.start_time),
        end_time: helsinkiToISOString(form.date, form.end_time),
        base_price: Number(form.base_price),
      };

      const response = await fetch(`${API_BASE}/showtimes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error("You do not have permission to add showtimes.");
      }

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not save the showtime.");
      }

      setSuccess("Showtime added successfully.");
      setTimeout(() => navigate("/admin/showtimes"), 900);
    } catch (err) {
      setError(err.message || "Could not save the showtime.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page add-showtime-page">
      <header className="admin-header">
        <div className="admin-logo">RIO</div>
        <span className="admin-header-title">Showtime management</span>
        <span className="admin-header-user">♙ Admin</span>
      </header>

      <div className="admin-layout">
        <AdminSidebar />

        <main className="admin-main add-showtime-main">
          <form className="add-showtime-form" onSubmit={handleSubmit}>
            <h2>Add Showtime</h2>

            {error && <p className="showtime-message error">{error}</p>}
            {success && <p className="showtime-message success">{success}</p>}

            {loading ? (
              <p className="showtime-loading">Loading form...</p>
            ) : (
              <>
                <label htmlFor="city">Select Location</label>
                <select
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={updateField}
                  required
                >
                  <option value="">Select location</option>
                  {locations.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>

                <label htmlFor="room_id">Select an Auditorium</label>
                <select
                  id="room_id"
                  name="room_id"
                  value={form.room_id}
                  onChange={updateField}
                  disabled={!form.city}
                  required
                >
                  <option value="">Select auditorium</option>
                  {availableRooms.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.name}
                    </option>
                  ))}
                </select>

                <label htmlFor="movie_id">Select a Movie</label>
                <select
                  id="movie_id"
                  name="movie_id"
                  value={form.movie_id}
                  onChange={updateField}
                  required
                >
                  <option value="">Select movie</option>
                  {movies.map((movie) => (
                    <option key={movie.movie_id} value={movie.movie_id}>
                      {movie.title}
                    </option>
                  ))}
                </select>

                <label htmlFor="date">Enter Date</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={updateField}
                  required
                />

                <label htmlFor="start_time">Enter Start Time</label>
                <input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={form.start_time}
                  onChange={updateField}
                  required
                />

                <label htmlFor="end_time">Enter End Time</label>
                <input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={form.end_time}
                  onChange={updateField}
                  required
                />

                {selectedMovie && (
                  <p className="showtime-duration">
                    Movie duration: {selectedMovie.duration} minutes
                  </p>
                )}

                <label htmlFor="base_price">Ticket Price (€)</label>
                <input
                  id="base_price"
                  name="base_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.base_price}
                  onChange={updateField}
                  required
                />

                <div className="add-showtime-actions">
                  <button
                    type="button"
                    className="showtime-cancel-button"
                    onClick={() => navigate("/admin/showtimes")}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="showtime-save-button"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}
          </form>
        </main>
      </div>
    </div>
  );
}
