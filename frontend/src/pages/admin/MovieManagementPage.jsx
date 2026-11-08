
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Bell,
  UserCircle,
  LayoutDashboard,
  Clapperboard,
  CalendarDays,
  Ticket,
  ChartColumn,
  Users,
  LogOut,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import logo from "../../assets/rio-logo.png";
import "./MovieManagementPage.css";

const API_URL = "/api/admin/movies";
const PAGE_SIZE = 4;

const emptyForm = {
  title: "",
  description: "",
  duration: "",
  releaseDate: "",
  ageRating: "",
  status: "coming_soon",
  director: "",
  genre: "",
  language: "",
  castMembers: "",
  subtitles: "",
  posterUrl: "",
  trailerUrl: "",
};

function getFormData(movie) {
  return {
    title: movie.title || "",
    description: movie.description || "",
    duration: movie.duration ?? "",
    releaseDate: movie.release_date
      ? String(movie.release_date).slice(0, 10)
      : "",
    ageRating: movie.age_rating || "",
    status: movie.status || "coming_soon",
    director: movie.director || "",
    genre: Array.isArray(movie.genre)
      ? movie.genre.join(", ")
      : "",
    language: movie.language || "",
    castMembers: movie.cast_members || "",
    subtitles: Array.isArray(movie.subtitles)
      ? movie.subtitles.join(", ")
      : "",
    posterUrl: movie.poster_url || "",
    trailerUrl: movie.trailer_url || "",
  };
}

function getApiPayload(formData) {
  return {
    title: formData.title.trim(),
    description: formData.description.trim(),
    duration: Number(formData.duration),
    director: formData.director.trim(),
    cast_members: formData.castMembers.trim(),
    language: formData.language.trim(),
    age_rating: formData.ageRating.trim(),
    genre: formData.genre
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    subtitles: formData.subtitles
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    poster_url: formData.posterUrl.trim(),
    trailer_url: formData.trailerUrl.trim(),
    release_date: formData.releaseDate || null,
    status: formData.status,
  };
}

function getStatusLabel(status) {
  const labels = {
    coming_soon: "Coming Soon",
    now_showing: "Now Showing",
    ended: "Ended",
  };

  return labels[status] || status;
}

function AdminMoviePage() {
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load movies from the protected Admin API.
  async function loadMovies() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}?page=1&limit=100`, {
        method: "GET",
        credentials: "same-origin",
      });

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error("You do not have Admin permission.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not load movies.");
      }

      setMovies(data.data?.items || []);
    } catch (err) {
      setError(err.message || "Something went wrong while loading movies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMovies();
  }, []);

  // Search movies by title.
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) =>
      movie.title.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [movies, search]);

  // Client-side pagination.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovies.length / PAGE_SIZE)
  );

  const visibleMovies = filteredMovies.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Keep the current page valid after searching or deleting.
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Movie statistics.
  const nowShowing = movies.filter(
    (movie) => movie.status === "now_showing"
  ).length;

  const comingSoon = movies.filter(
    (movie) => movie.status === "coming_soon"
  ).length;

  // Open Add Movie form.
  function openAddForm() {
    setError("");
    setSuccess("");
    setEditingMovie(null);
    setFormData({ ...emptyForm });
    setShowForm(true);
  }

  // Open Edit Movie form.
  function openEditForm(movie) {
    setError("");
    setSuccess("");
    setEditingMovie(movie);
    setFormData(getFormData(movie));
    setShowForm(true);
  }

  // Update form fields.
  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Save a new movie or update an existing movie.
  async function saveMovie(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Please enter a movie title.");
      return;
    }

    if (!formData.duration || Number(formData.duration) <= 0) {
      setError("Please enter a valid movie duration.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingMovie);

      const url = isEditing
        ? `${API_URL}/${editingMovie.movie_id}`
        : API_URL;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getApiPayload(formData)),
      });

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error("You do not have Admin permission.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not save the movie.");
      }

      await loadMovies();

      setShowForm(false);
      setEditingMovie(null);
      setFormData({ ...emptyForm });
      setPage(1);

      setSuccess(
        isEditing
          ? "Movie updated successfully."
          : "Movie added successfully."
      );
    } catch (err) {
      setError(err.message || "Something went wrong while saving the movie.");
    } finally {
      setSaving(false);
    }
  }

  // Cancel Add/Edit form.
  function cancelForm() {
    setShowForm(false);
    setEditingMovie(null);
    setFormData({ ...emptyForm });
    setError("");
  }

  // Delete a movie.
  async function deleteMovie(movie) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${movie.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(movie.movie_id);

    try {
      const response = await fetch(`${API_URL}/${movie.movie_id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error("You do not have Admin permission.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not delete the movie.");
      }

      setMovies((current) =>
        current.filter((item) => item.movie_id !== movie.movie_id)
      );

      setSuccess("Movie deleted successfully.");
      setPage(1);
    } catch (err) {
      setError(err.message || "Something went wrong while deleting the movie.");
    } finally {
      setDeletingId(null);
    }
  }

  // Log out using the existing session authentication.
  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Could not log out. Please try again.");
      }

      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <img
          src={logo}
          alt="RIO Cinema"
          className="admin-logo"
        />

        <div className="header-title">
          Movie management
        </div>

        <div className="header-actions">
          <Bell size={20} />

          <div className="admin-profile">
            <UserCircle size={23} />
            <span>Admin</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <h2>Main Menu</h2>

          <nav className="sidebar-links">
            <a href="#">
              <LayoutDashboard />
              Dashboard
            </a>

            <a href="/admin/movies" className="active">
              <Clapperboard />
              Movies
            </a>

            <a href="#">
              <CalendarDays />
              Showtimes
            </a>

            <a href="#">
              <Ticket />
              Bookings
            </a>

            <a href="#">
              <ChartColumn />
              Reports
            </a>

            <a href="#">
              <Users />
              Users
            </a>
          </nav>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut />
            Log out
          </button>
        </aside>

        {/* Main content */}
        <main className="admin-main">
          {error && (
            <p className="empty-message" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="empty-message" role="status">
              {success}
            </p>
          )}

          {showForm ? (
            /* Add / Edit Movie Form */
            <section className="add-movie-form-container">
              <h2>
                {editingMovie ? "Edit Movie" : "Add New Movie"}
              </h2>

              <form onSubmit={saveMovie}>
                <div className="form-grid">
                  {/* Left column */}
                  <div className="form-column">
                    <div className="form-group">
                      <label>
                        Movie Title<span>*</span>
                      </label>

                      <input
                        type="text"
                        name="title"
                        maxLength="255"
                        value={formData.title}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Duration (minutes)<span>*</span>
                      </label>

                      <input
                        type="number"
                        name="duration"
                        min="1"
                        step="1"
                        value={formData.duration}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Age rating</label>

                      <input
                        type="text"
                        name="ageRating"
                        placeholder="e.g. 12+"
                        maxLength="20"
                        value={formData.ageRating}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Director</label>

                      <input
                        type="text"
                        name="director"
                        maxLength="150"
                        value={formData.director}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Genre</label>

                      <input
                        type="text"
                        name="genre"
                        placeholder="e.g. Action, Drama, Comedy"
                        value={formData.genre}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Cast members</label>

                      <input
                        type="text"
                        name="castMembers"
                        placeholder="Actor names"
                        value={formData.castMembers}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Description</label>

                      <input
                        type="text"
                        name="description"
                        placeholder="Short movie description"
                        value={formData.description}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="form-column">
                    <div className="form-group">
                      <label>Release date</label>

                      <input
                        type="date"
                        name="releaseDate"
                        value={formData.releaseDate}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Movie Status</label>

                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        <option value="coming_soon">
                          Coming Soon
                        </option>

                        <option value="now_showing">
                          Now Showing
                        </option>

                        <option value="ended">
                          Ended
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Language</label>

                      <input
                        type="text"
                        name="language"
                        maxLength="100"
                        value={formData.language}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Subtitles</label>

                      <input
                        type="text"
                        name="subtitles"
                        placeholder="e.g. English, Finnish"
                        value={formData.subtitles}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Poster URL</label>

                      <input
                        type="url"
                        name="posterUrl"
                        value={formData.posterUrl}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Trailer URL</label>

                      <input
                        type="url"
                        name="trailerUrl"
                        value={formData.trailerUrl}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Form buttons */}
                <div className="form-buttons">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={cancelForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingMovie
                        ? "Update Movie"
                        : "Save Movie"}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            /* Movie Management List */
            <>
              <div className="page-actions">
                <button
                  className="add-movie-button"
                  onClick={openAddForm}
                >
                  <Plus size={18} />
                  Add Movies
                </button>
              </div>

              {/* Summary cards */}
              <section className="summary-cards">
                <div className="summary-card">
                  <strong>{movies.length}</strong>
                  <span>Total Movies</span>
                </div>

                <div className="summary-card">
                  <strong>{nowShowing}</strong>
                  <span>Now Showing</span>
                </div>

                <div className="summary-card">
                  <strong>{comingSoon}</strong>
                  <span>Coming Soon</span>
                </div>
              </section>

              {/* Search */}
              <div className="movie-search">
                <Search size={21} />

                <input
                  type="text"
                  placeholder="Search Movies"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </button>

                <span>
                  {page} / {totalPages}
                </span>

                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </button>
              </div>

              {/* Movie list */}
              <section className="movie-list">
                <h2>Movie List</h2>

                {loading ? (
                  <p className="empty-message">
                    Loading movies...
                  </p>
                ) : visibleMovies.length === 0 ? (
                  <p className="empty-message">
                    No movies found.
                  </p>
                ) : (
                  visibleMovies.map((movie) => (
                    <div
                      className="movie-row"
                      key={movie.movie_id}
                    >
                      <div className="movie-name">
                        <Clapperboard size={23} />
                        <span>{movie.title}</span>
                      </div>

                      <span
                        className={`movie-status ${
                          movie.status === "coming_soon"
                            ? "coming-soon"
                            : ""
                        }`}
                      >
                        {getStatusLabel(movie.status)}
                      </span>

                      <div className="movie-actions">
                        <button
                          onClick={() => openEditForm(movie)}
                          aria-label={`Edit ${movie.title}`}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => deleteMovie(movie)}
                          aria-label={`Delete ${movie.title}`}
                          disabled={deletingId === movie.movie_id}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminMoviePage;
