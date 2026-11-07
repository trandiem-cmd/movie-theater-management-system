
import { useEffect, useRef, useState } from "react";
import MovieCard from "../../components/movie/MovieCard";

import {
  ChevronLeft,
  ChevronRight,
  Play,
  Ticket,
  Film,
  MapPin,
  CalendarDays,
  Clock3,
} from "lucide-react";

import "./HomePage.css";

import avengersBackground from "../../assets/avengers-background.png";
import avengersBackground2 from "../../assets/avengers-background2.png";
import avengersBackground3 from "../../assets/avengers-background3.png";
import avengersBackground4 from "../../assets/avengers-background4.png";


const avengersBackgrounds = [
  avengersBackground,
  avengersBackground2,
  avengersBackground3,
  avengersBackground4,
];

function AgeRating({ rating }) {
  return (
    <span className={`home-age-badge home-age-${rating}`}>
      {rating}
    </span>
  );
}

function HomePage() {
  const [activeTab, setActiveTab] = useState("now_showing");
  const [activeSlide, setActiveSlide] = useState(0);

  const [selectedMovie, setSelectedMovie] = useState("");
  const [selectedTheater, setSelectedTheater] = useState("Oulu");
  const [selectedDate, setSelectedDate] = useState("");

  const [movies, setMovies] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const movieTrackRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(
        (current) => (current + 1) % avengersBackgrounds.length
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  
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
          throw new Error("Failed to load movies");
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

          duration:
            typeof movie.duration === "number"
              ? `${Math.floor(movie.duration / 60)}h ${
                  movie.duration % 60
                }min`
              : "TBA",

          poster: movie.poster_url,
          ageRating: movie.age_rating || "TBA",
          status: movie.status,
          description: movie.description || "",
          releaseDate: movie.release_date,
          trailerUrl: movie.trailer_url,
        }));

        if (!cancelled) {
          setMovies(formattedMovies);
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

  
  const featuredMovie = movies.find(
    (movie) => movie.title === "Avengers: Doomsday"
  );

  const visibleMovies = movies.filter(
    (movie) => movie.status === activeTab
  );

  function scrollMovies(direction) {
    movieTrackRef.current?.scrollBy({
      left: direction * 600,
      behavior: "smooth",
    });
  }

  return (
    <div className="home-page">
      
      <section
        className="home-hero"
        style={{
          backgroundImage: `linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.98) 0%,
            rgba(0, 0, 0, 0.94) 30%,
            rgba(0, 0, 0, 0.65) 45%,
            rgba(0, 0, 0, 0.15) 65%,
            rgba(0, 0, 0, 0.02) 100%
          ), url("${avengersBackgrounds[activeSlide]}")`,
        }}
      >
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <span className="home-featured-label">
              UPCOMING
            </span>

            <h1 className="home-featured-title">
              {featuredMovie?.title || "Avengers: Doomsday"}
            </h1>

            <div className="home-featured-meta">
              <span>
                {featuredMovie
                  ? `${featuredMovie.genre} | ${
                      featuredMovie.releaseDate
                        ? new Date(
                            featuredMovie.releaseDate
                          ).getUTCFullYear()
                        : "TBA"
                    } | ${featuredMovie.duration}`
                  : "Action · Adventure · Sci-Fi | 2026"}
              </span>

              <AgeRating
                rating={featuredMovie?.ageRating || "12"}
              />
            </div>

            <p className="home-hero-description">
              {featuredMovie?.description ||
                "An upcoming Avengers adventure."}
            </p>

            <div className="home-hero-actions">
              
            <button
              type="button"
              className="home-book-button"
              onClick={() => window.location.href = "/BookingPage.jsx"}
            >
              <Ticket size={17} />
              Book tickets
            </button>
           
            <button
              type="button"
              className="home-trailer-button"
              disabled={!featuredMovie}
              onClick={() => {
                if (featuredMovie) {
                  window.location.href = `/movies/${featuredMovie.id}`;
                }
              }}
            >
              <Play size={17} />
              Watch trailer
            </button>


            </div>
          </div>
        </div>

        <div className="home-hero-dots">
          {avengersBackgrounds.map((background, index) => (
            <button
              key={index}
              type="button"
              className={index === activeSlide ? "active" : ""}
              onClick={() => setActiveSlide(index)}
              aria-label={`Show Avengers background ${index + 1}`}
              aria-current={
                index === activeSlide ? "true" : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* Booking bar */}
      <section className="home-booking-bar">
        <div className="home-booking-field">
          <label htmlFor="home-movie-select">
            <Film size={17} />
            1. Choose a movie
          </label>

          <select
            id="home-movie-select"
            value={selectedMovie}
            onChange={(event) =>
              setSelectedMovie(event.target.value)
            }
          >
            <option value="">Select a movie</option>

            {movies.map((movie) => (
              <option key={movie.id} value={movie.title}>
                {movie.title}
              </option>
            ))}
          </select>
        </div>

        <div className="home-booking-field">
          <label htmlFor="home-theater-select">
            <MapPin size={17} />
            2. Choose a theatre
          </label>

          <select
            id="home-theater-select"
            value={selectedTheater}
            onChange={(event) =>
              setSelectedTheater(event.target.value)
            }
          >
            <option value="Oulu">Oulu</option>
            <option value="Tampere">Tampere</option>
          </select>
        </div>

        <div className="home-booking-field">
          <label htmlFor="home-date-select">
            <CalendarDays size={17} />
            3. Select a date
          </label>

          <input
            id="home-date-select"
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(event.target.value)
            }
          />
        </div>

        <div className="home-booking-field">
          <label htmlFor="home-showtime-select">
            <Clock3 size={17} />
            4. Select a showtime
          </label>

          <select
            id="home-showtime-select"
            defaultValue=""
          >
            <option value="">Select a showtime</option>
          </select>
        </div>

        <button
          type="button"
          className="home-find-ticket"
          disabled
          title="Ticket booking is not available yet"
        >
          Find a ticket →
        </button>
      </section>

      
      <section className="home-movies-section">
        <div className="home-movies-header">
          <div className="home-movie-tabs">
            <button
              type="button"
              className={
                activeTab === "now_showing" ? "active" : ""
              }
              onClick={() => setActiveTab("now_showing")}
            >
              NOW SHOWING
            </button>

            <button
              type="button"
              className={
                activeTab === "coming_soon" ? "active" : ""
              }
              onClick={() => setActiveTab("coming_soon")}
            >
              COMING SOON
            </button>
          </div>

          <div className="home-movie-navigation">
            <button
              type="button"
              onClick={() => scrollMovies(-1)}
              aria-label="Scroll movies left"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() => scrollMovies(1)}
              aria-label="Scroll movies right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {apiLoading ? (
          <p className="home-empty-message">
            Loading movies...
          </p>
        ) : apiError ? (
          <p className="home-empty-message">
            {apiError}. Please refresh the page.
          </p>
        ) : visibleMovies.length > 0 ? (
          <div
            className="home-movie-track"
            ref={movieTrackRef}
          >
            {visibleMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <p className="home-empty-message">
            {activeTab === "coming_soon"
              ? "No upcoming movies to display yet."
              : "No now-showing movies available."}
          </p>
        )}
      </section>
    </div>
  );
}

export default HomePage;
