
import { useMemo, useState } from "react";
import Footer from "../../components/common/Footer";

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

const initialMovies = [
  {
    id: 1,
    title: "Dune Part 3",
    status: "Now Showing",
  },
  {
    id: 2,
    title: "The Forgotten Island",
    status: "Coming Soon",
  },
  {
    id: 3,
    title: "Other Mommy",
    status: "Now Showing",
  },
  {
    id: 4,
    title: "Resident Evil",
    status: "Now Showing",
  },
];

const emptyForm = {
  title: "",
  location: "",
  duration: "",
  releaseDate: "",
  ageRating: "",
  status: "Coming Soon",
  director: "",
  genre: "",
  language: "",
  castMembers: "",
  showtimes: "All",
  posterUrl: "",
  trailerUrl: "",
};

function AdminMoviePage() {
  const [movies, setMovies] = useState(initialMovies);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const pageSize = 4;

  // Search movies
  const filteredMovies = useMemo(
    () =>
      movies.filter((movie) =>
        movie.title.toLowerCase().includes(search.toLowerCase())
      ),
    [movies, search]
  );

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovies.length / pageSize)
  );

  const visibleMovies = filteredMovies.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Movie statistics
  const nowShowing = movies.filter(
    (movie) => movie.status === "Now Showing"
  ).length;

  const comingSoon = movies.filter(
    (movie) => movie.status === "Coming Soon"
  ).length;

  // Open empty Add Movie form
  function openAddForm() {
    setEditingMovie(null);
    setFormData({ ...emptyForm });
    setShowForm(true);
  }

  // Open Edit Movie form
  function openEditForm(movie) {
    setEditingMovie(movie);

    setFormData({
      ...emptyForm,
      ...movie,
    });

    setShowForm(true);
  }

  // Update form fields
  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Save new or edited movie
  function saveMovie(event) {
    event.preventDefault();

    const movieData = {
      ...formData,
      title: formData.title.trim(),
      duration: Number(formData.duration),
    };

    if (editingMovie) {
      setMovies((current) =>
        current.map((movie) =>
          movie.id === editingMovie.id
            ? { ...movie, ...movieData }
            : movie
        )
      );
    } else {
      const newMovie = {
        id: Date.now(),
        ...movieData,
      };

      setMovies((current) => [...current, newMovie]);
      setPage(Math.ceil((movies.length + 1) / pageSize));
    }

    setShowForm(false);
    setEditingMovie(null);
    setFormData({ ...emptyForm });
  }

  // Cancel form
  function cancelForm() {
    setShowForm(false);
    setEditingMovie(null);
    setFormData({ ...emptyForm });
  }

  // Delete movie
  function deleteMovie(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this movie?"
    );

    if (confirmed) {
      setMovies((current) =>
        current.filter((movie) => movie.id !== id)
      );
      setPage(1);
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

            <a href="#" className="active">
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

          <button className="logout-button">
            <LogOut />
            Log out
          </button>
        </aside>

        {/* Main content */}
        <main className="admin-main">

          {showForm ? (

            /* =========================
               ADD / EDIT MOVIE FORM
            ========================= */

            <section className="add-movie-form-container">

              <h2>
                {editingMovie
                  ? "Edit Movie"
                  : "Add New Movie"}
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
                        value={formData.ageRating}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Director</label>

                      <input
                        type="text"
                        name="director"
                        value={formData.director}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Genre</label>

                      <select
                        name="genre"
                        value={formData.genre}
                        onChange={handleFormChange}
                      >
                        <option value="">Select genre</option>
                        <option value="Action">Action</option>
                        <option value="Adventure">Adventure</option>
                        <option value="Comedy">Comedy</option>
                        <option value="Drama">Drama</option>
                        <option value="Horror">Horror</option>
                        <option value="Romance">Romance</option>
                        <option value="Sci-Fi">Sci-Fi</option>
                        <option value="Thriller">Thriller</option>
                      </select>
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
                      <label>Poster URL</label>

                      <input
                        type="url"
                        name="posterUrl"
                        value={formData.posterUrl}
                        onChange={handleFormChange}
                      />
                    </div>

                  </div>

                  {/* Right column */}
                  <div className="form-column">

                    <div className="form-group">
                      <label>Location</label>

                      <select
                        name="location"
                        value={formData.location}
                        onChange={handleFormChange}
                      >
                        <option value="">
                          Select location
                        </option>

                        <option value="Oulu">Oulu</option>
                        <option value="Tampere">Tampere</option>
                      </select>
                    </div>

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
                        <option value="Coming Soon">
                          Coming Soon
                        </option>

                        <option value="Now Showing">
                          Now Showing
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Language</label>

                      <input
                        type="text"
                        name="language"
                        value={formData.language}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Showtimes</label>

                      <select
                        name="showtimes"
                        value={formData.showtimes}
                        onChange={handleFormChange}
                      >
                        <option value="All">All</option>
                      </select>
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
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                  >
                    {editingMovie
                      ? "Update Movie"
                      : "Save Movie"}
                  </button>

                </div>

              </form>
            </section>

          ) : (

            /* =========================
               MOVIE MANAGEMENT LIST
            ========================= */

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
                    setPage((current) =>
                      Math.max(1, current - 1)
                    )
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

                {visibleMovies.length === 0 ? (

                  <p className="empty-message">
                    No movies found.
                  </p>

                ) : (

                  visibleMovies.map((movie) => (

                    <div
                      className="movie-row"
                      key={movie.id}
                    >

                      <div className="movie-name">
                        <Clapperboard size={23} />
                        <span>{movie.title}</span>
                      </div>

                      <span
                        className={`movie-status ${
                          movie.status === "Coming Soon"
                            ? "coming-soon"
                            : ""
                        }`}
                      >
                        {movie.status}
                      </span>

                      <div className="movie-actions">

                        <button
                          onClick={() => openEditForm(movie)}
                          aria-label={`Edit ${movie.title}`}
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => deleteMovie(movie.id)}
                          aria-label={`Delete ${movie.title}`}
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
