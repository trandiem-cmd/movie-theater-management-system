import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminSidebar from "./adminSidebar";
import "./AddShowtimePage.css";

const API_BASE = "/api/admin";

const emptyForm = {
  city: "",
  room_id: "",
  movie_id: "",
  date: "",
  door_open_time: "",
  base_price: "17.40",
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

function getScheduleTimes(date, doorOpenTime, duration) {
  if (!date || !doorOpenTime || !duration) return null;

  try {
    const doorOpen = new Date(
      helsinkiToISOString(date, doorOpenTime)
    );

    const advertisementStart = new Date(
      doorOpen.getTime() + 15 * 60000
    );

    const movieStart = new Date(
      doorOpen.getTime() + 27 * 60000
    );

    const movieEnd = new Date(
      movieStart.getTime() + Number(duration) * 60000
    );

    const formatTime = (date) => {
      const parts = getHelsinkiParts(date);
      return `${parts.hour}:${parts.minute}`;
    };

    return {
      advertisementStart: formatTime(advertisementStart),
      movieStart: formatTime(movieStart),
      movieEnd: formatTime(movieEnd),
    };
  } catch {
    return null;
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
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const isEditing = Boolean(editId);

const [form, setForm] = useState({
  ...emptyForm,
  date: getHelsinkiDate(),
  door_open_time: "10:00",
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

      const [movieResponse, roomResponse, showtimeResponse] =
        await Promise.all([
          fetch(`${API_BASE}/movies?page=1&limit=100`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/rooms`, {
            credentials: "include",
          }),
          editId
            ? fetch(`${API_BASE}/showtimes`, {
                credentials: "include",
              })
            : Promise.resolve(null),
        ]);

      const responses = [
        movieResponse,
        roomResponse,
        ...(showtimeResponse ? [showtimeResponse] : []),
      ];

      if (responses.some((response) => response.status === 401)) {
        navigate("/login");
        return;
      }

      if (responses.some((response) => response.status === 403)) {
        setError("You do not have permission to access this page.");
        return;
      }

      if (responses.some((response) => !response.ok)) {
        throw new Error("Could not load the showtime form data.");
      }

      const moviePayload = await movieResponse.json();
      const roomPayload = await roomResponse.json();

      const allMovies = getList(moviePayload);
      const allRooms = getList(roomPayload);

      let currentShowtime = null;

      if (editId) {
        const showtimePayload = await showtimeResponse.json();

        currentShowtime = getList(showtimePayload).find(
          (item) => String(item.showtime_id) === String(editId)
        );

        if (!currentShowtime) {
          throw new Error("Showtime not found.");
        }

        if (
          currentShowtime.status !== "scheduled" &&
          currentShowtime.status !== "cancelled"
        ) {
          throw new Error(
            "Only scheduled or cancelled showtimes can be edited."
          );
        }
      }

      setMovies(
        allMovies.filter(
          (movie) =>
            movie.status !== "ended" ||
            String(movie.movie_id) === String(currentShowtime?.movie_id)
        )
      );

        setRooms(
          allRooms.filter(
            (room) =>
              room.status === "active" ||
              String(room.room_id) === String(currentShowtime?.room_id)
          )
        );

      if (currentShowtime) {
      const doorOpen = getHelsinkiParts(
        new Date(currentShowtime.door_open_time)
      );

      setForm({
        city: currentShowtime.city,
        room_id: String(currentShowtime.room_id),
        movie_id: String(currentShowtime.movie_id),
        date: `${doorOpen.year}-${doorOpen.month}-${doorOpen.day}`,
        door_open_time: `${doorOpen.hour}:${doorOpen.minute}`,
        base_price: Number(currentShowtime.base_price).toFixed(2),
      });
      }
    } catch (err) {
      setError(err.message || "Could not load the showtime form.");
    } finally {
      setLoading(false);
    }
  }

  loadOptions();
}, [navigate, editId]);

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

    if (!form.date || !form.door_open_time) {
      setError("Please enter the date and door-opening time.");
      return;
    }

    if (form.base_price === "" || Number(form.base_price) < 0) {
      setError("Please enter a valid ticket price.");
      return;
    }

    try {
      setSaving(true);

      const doorOpenDateTime = helsinkiToISOString(
        form.date,
        form.door_open_time
      );

      // Prevent scheduling in the past.
      if (new Date(doorOpenDateTime).getTime() <= Date.now()) {
        setError("Please select a future door-opening date and time.");
        return;
      }

      const payload = {
        movie_id: Number(form.movie_id),
        room_id: Number(form.room_id),
        door_open_time: doorOpenDateTime,
        base_price: Number(form.base_price),
      };

      const response = await fetch(
        isEditing
          ? `${API_BASE}/showtimes/${editId}`
          : `${API_BASE}/showtimes`,
        {
          method: isEditing ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error(
          `You do not have permission to ${isEditing ? "edit" : "add"} showtimes.`
        );
      }

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Could not save the showtime.");
      }

      setSuccess(
        isEditing
          ? "Showtime updated successfully."
          : "Showtime added successfully."
      );

      setTimeout(() => navigate("/admin/showtimes"), 900);
    } catch (err) {
      setError(err.message || "Could not save the showtime.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="admin-page add-showtime-page">
      <div className="admin-layout">
        <AdminSidebar />

        <main className="admin-main add-showtime-main">
          <form className="add-showtime-form" onSubmit={handleSubmit}>
            <h2>{isEditing ? "Edit Showtime" : "Add Showtime"}</h2>

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
                      {movie.title} — {
                        movie.status === "coming_soon"
                          ? "Coming Soon"
                          : movie.status === "now_showing"
                            ? "Now Showing"
                            : movie.status
                      }
                    </option>
                  ))}
                </select>

                <label htmlFor="date">Enter Date</label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      min={getHelsinkiDate()}
                      value={form.date}
                      onChange={updateField}
                      required
                    />
                  <label htmlFor="door_open_time">
                    Enter Door-Opening Time
                  </label>
                  <input
                    id="door_open_time"
                    name="door_open_time"
                    type="time"
                    min={
                      form.date === getHelsinkiDate()
                        ? getHelsinkiTime()
                        : undefined
                    }
                    value={form.door_open_time}
                    onChange={updateField}
                    required
                  />
                  {selectedMovie && form.date && form.door_open_time && (
                    (() => {
                      const schedule = getScheduleTimes(
                        form.date,
                        form.door_open_time,
                        selectedMovie.duration
                      );

                      if (!schedule) return null;

                      return (
                        <div className="showtime-schedule-preview">
                          <label>Screening Schedule</label>

                          <p>
                            <lable>Doors open:</lable>{" "}
                            <input
                              type="time"
                              value={form.door_open_time}
                              onChange={updateField}
                              name="door_open_time"
                            />
                          </p>

                          <p>
                            <lable>Advertisements start:</lable>{" "}
                            <input
                              type="time"
                              value={schedule.advertisementStart}
                              onChange={updateField}
                              name="advertisement_start"
                            />
                          </p>

                          <p>
                            <lable>Movie starts:</lable>{" "}
                            <input
                              type="time"
                              value={schedule.movieStart}
                              onChange={updateField}
                              name="movie_start"
                            />
                          </p>

                          <p>
                            <lable>Movie ends:</lable>{" "}
                            <input
                              type="time"
                              value={schedule.movieEnd}
                              onChange={updateField}
                              name="movie_end"
                            />
                          </p>

                          <small>
                            Movie end time includes 15 minutes door opening time, 12-minute
                            advertisement period, and the movie duration of {selectedMovie.duration} minutes.
                          </small>
                        </div>
                      );
                    })()
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
                    {saving
                       ? isEditing ? "Updating..." : "Saving..."
                       : isEditing ? "Update" : "Save"}
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
