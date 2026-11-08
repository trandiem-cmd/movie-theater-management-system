
import {
  Search,
  RotateCcw,
  Clapperboard,
  CalendarDays,
} from "lucide-react";
import { useState, useEffect } from "react";
import MovieCard from "../../components/movie/MovieCard";
import astronautBanner from "../../assets/astronaut-banner.png";
import "./MovieListPage.css";

function MovieListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [genre, setGenre] = useState("all");
  const [ageRating, setAgeRating] = useState("all");

  const [apiMovies, setApiMovies] = useState([]);
  const [apiError, setApiError] = useState("");
  const [apiLoading, setApiLoading] = useState(true);

  
  useEffect(() => {
    let cancelled = false;

    async function fetchMovies() {
      try {
        setApiLoading(true);
        setApiError("");

            const response = await fetch(
      "http://localhost:3001/api/movies?page=1&limit=100"
    );
        if (!response.ok) {
          throw new Error("Failed to fetch movies");
        }

        const result = await response.json();

            if (!Array.isArray(result.data?.items)) {
      throw new Error("Invalid movie data received");
    }

        const formattedMovies = result.data.items.map((movie) => ({
          id: movie.movie_id,
          title: movie.title,

          genre: Array.isArray(movie.genre)
            ? movie.genre.join(", ")
            : movie.genre || "",

          genres: Array.isArray(movie.genre)
            ? movie.genre
            : movie.genre
              ? [movie.genre]
              : [],

          duration:
            typeof movie.duration === "number"
              ? `${Math.floor(movie.duration / 60)}h ${
                  movie.duration % 60
                }min`
              : "TBA",

          poster: movie.poster_url,
          ageRating: movie.age_rating || "TBA",
          status: movie.status,
        }));

        if (!cancelled) {
          setApiMovies(formattedMovies);
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(error.message);
        }
      } finally {
        if (!cancelled) {
          setApiLoading(false);
        }
      }
    }

    fetchMovies();

    return () => {
      cancelled = true;
    };
  }, []);

  // Reset all filters
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setGenre("all");
    setAgeRating("all");
  };

  const filteredMovies = apiMovies.filter((movie) => {
    const matchesSearch = movie.title
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesStatus =
      status === "all" || movie.status === status;

    const matchesGenre =
      genre === "all" || movie.genres.includes(genre);

    const matchesAge =
      ageRating === "all" || movie.ageRating === ageRating;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesGenre &&
      matchesAge
    );
  });

  const nowShowingMovies = filteredMovies.filter(
    (movie) => movie.status === "now_showing"
  );

  const comingSoonMovies = filteredMovies.filter(
    (movie) => movie.status === "coming_soon"
  );

  return (
    <div className="movie-list-page">
     
      <section
        className="movie-list-hero"
        style={{
          backgroundImage: `linear-gradient(
            to right,
            rgba(0, 0, 0, 0.96) 0%,
            rgba(0, 0, 0, 0.8) 25%,
            rgba(0, 0, 0, 0.15) 75%
          ), url("${astronautBanner}")`,
        }}
      >
        <div className="movie-list-hero-content">
          <h1>Every story starts here.</h1>
          <p>EXPLORE ALL MOVIES</p>
        </div>
      </section>

      <div className="movie-list-container">
      
        <section className="movie-list-filters">
          <div className="movie-list-search">
            <Search size={20} />

            <input
              type="text"
              placeholder="Search movies by title..."
              aria-label="Search movies by title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="movie-list-filter-row">
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Movies</option>
                <option value="now_showing">Now Showing</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </label>

            <label>
              Genre
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                <option value="all">All Genres</option>
                <option value="Action">Action</option>
                <option value="Adventure">Adventure</option>
                <option value="Animation">Animation</option>
                <option value="Comedy">Comedy</option>
                <option value="Drama">Drama</option>
                <option value="Family">Family</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Horror">Horror</option>
                <option value="Romance">Romance</option>
                <option value="Science Fiction">Sci-Fi</option>
                <option value="Thriller">Thriller</option>
              </select>
            </label>

            <label>
              Age Rating
              <select
                value={ageRating}
                onChange={(e) => setAgeRating(e.target.value)}
              >
                <option value="all">All Ages</option>
                <option value="S">S</option>
                <option value="7">7</option>
                <option value="12">12</option>
                <option value="16">16</option>
                <option value="18">18</option>
              </select>
            </label>

            <button
              type="button"
              className="movie-list-clear"
              onClick={clearFilters}
            >
              <RotateCcw size={17} />
              Clear Filters
            </button>
          </div>
        </section>

        {/* Loading state */}
        {apiLoading ? (
          <p className="movie-list-empty">Loading movies...</p>
        ) : apiError ? (
          /* Error state */
          <p className="movie-list-empty">
            {apiError}. Please try refreshing the page.
          </p>
        ) : (
          <>
            {/* Now Showing */}
            <section className="movie-list-section">
              <h2>
                <Clapperboard size={28} />
                Now Showing ({nowShowingMovies.length})
              </h2>

              {nowShowingMovies.length > 0 ? (
                <div className="movie-list-grid">
                  {nowShowingMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <p className="movie-list-empty">
                  No now-showing movies match your filters.
                </p>
              )}
            </section>

            {/* Coming Soon */}
            <section className="movie-list-section">
              <h2>
                <CalendarDays size={28} />
                Coming Soon ({comingSoonMovies.length})
              </h2>

              {comingSoonMovies.length > 0 ? (
                <div className="movie-list-grid">
                  {comingSoonMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <p className="movie-list-empty">
                  No coming-soon movies match your filters.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default MovieListPage;
