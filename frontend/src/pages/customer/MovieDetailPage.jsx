
import { useState, useEffect } from "react";
import {
  CalendarDays,
  Info,
  ChevronDown,
  ChevronUp,
  Clock3,
  Film,
  ArrowLeft,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import "../../components/movie/MovieCard.css";
import "./MovieDetailPage.css";


function getTrailerEmbedUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    let videoId = "";

    if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
        parsed.hostname
      )
    ) {
      videoId =
        parsed.searchParams.get("v") ||
        (parsed.pathname.startsWith("/embed/")
          ? parsed.pathname.split("/")[2]
          : "");
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ? `https://www.youtube.com/embed/${videoId}`
      : "";
  } catch {
    return "";
  }
}

function MovieDetailPage() {
  const { id } = useParams();

  const [showMore, setShowMore] = useState(false);
  const [apiMovie, setApiMovie] = useState(null);
  const [apiError, setApiError] = useState("");
  const [apiLoading, setApiLoading] = useState(true);

  
  useEffect(() => {
    let cancelled = false;

    async function fetchMovie() {
      setApiLoading(true);
      setApiError("");
      setApiMovie(null);

      try {
        const response = await fetch(
          `http://localhost:3001/api/movies/${id}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Movie not found");
          }

          throw new Error("Failed to load movie details");
        }

        const result = await response.json();

        if (!cancelled) {
          setApiMovie(result.data ?? result);
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

    fetchMovie();

    return () => {
      cancelled = true;
    };
  }, [id]);

  
  const movie = apiMovie
    ? {
        id: apiMovie.movie_id,
        title: apiMovie.title,
        status: apiMovie.status,

        genre: Array.isArray(apiMovie.genre)
          ? apiMovie.genre.join(", ")
          : apiMovie.genre || "Not available",

        duration: apiMovie.duration
          ? `${Math.floor(apiMovie.duration / 60)}h ${
              apiMovie.duration % 60
            }min`
          : "Not available",

        ageRating: apiMovie.age_rating || "TBA",

        releaseDate: apiMovie.release_date
          ? new Date(apiMovie.release_date).toLocaleDateString(
              "en-GB",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/Helsinki"
              }
            )
          : "Not available",

        description:
          apiMovie.description || "No description available.",

        director: apiMovie.director || "Not available",

        writers: Array.isArray(apiMovie.writers) &&
          apiMovie.writers.length > 0
          ? apiMovie.writers.join(", ")
          : "Not available",

        productionCompany:
          apiMovie.productionCompany || "Not available",

        castProfiles: Array.isArray(apiMovie.cast)
          ? apiMovie.cast
          : [],

        language: apiMovie.language || "Not available",

        subtitles: Array.isArray(apiMovie.subtitles)
          ? apiMovie.subtitles.join(", ")
          : apiMovie.subtitles || "Not available",

        trailerUrl: getTrailerEmbedUrl(apiMovie.trailer_url),
      }
    : null;

  
  if (apiLoading) {
    return (
      <div className="movie-detail-page">
        <div className="movie-detail-container">
          <p>Loading movie details...</p>
        </div>
      </div>
    );
  }

  
  if (apiError || !movie) {
    return (
      <div className="movie-detail-page">
        <div className="movie-detail-container">
          <Link to="/movies" className="movie-detail-back">
            <ArrowLeft size={18} />
            Back to Movies
          </Link>

          <p className="movie-detail-placeholder-text">
            {apiError || "Movie not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="movie-detail-page">
      <div className="movie-detail-container">
        <Link to="/movies" className="movie-detail-back">
          <ArrowLeft size={18} />
          Back to Movies
        </Link>

       
        <section className="movie-detail-hero">
          <div className="movie-detail-video">
            {movie.trailerUrl ? (
              <iframe
                src={movie.trailerUrl}
                title={`${movie.title} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <p className="movie-detail-placeholder-text">
                Trailer not available yet.
              </p>
            )}
          </div>

          <div className="movie-detail-main">
            <span className="movie-detail-status">
              {movie.status === "coming_soon"
                ? "COMING SOON"
                : "NOW SHOWING"}
            </span>

            <h1>{movie.title}</h1>

            <div className="movie-detail-meta">
              <span>{movie.genre}</span>
              <span>·</span>
              <span>{movie.duration}</span>
              <span>·</span>

              <span
                className={`home-age-badge home-age-${movie.ageRating}`}
              >
                {movie.ageRating}
              </span>
            </div>

            <p className="movie-detail-description">
              {movie.description}
            </p>

            <a
              href="#movie-showtimes"
              className="movie-detail-showtime-btn"
            >
              <CalendarDays size={19} />
              View Showtimes
            </a>
          </div>
        </section>

       
        <section className="movie-detail-section">
          <h2>
            <Info size={23} />
            Movie Details
          </h2>

          <div className="movie-detail-info-box">
            <div className="movie-detail-info-row">
              <span>
                <Film size={17} />
                Genre
              </span>
              <span>{movie.genre}</span>
            </div>

            <div className="movie-detail-info-row">
              <span>
                <Clock3 size={17} />
                Duration
              </span>
              <span>{movie.duration}</span>
            </div>

            {showMore && (
              <>
                <div className="movie-detail-info-row">
                  <span>Age Rating</span>
                  <span>
                    <span
                      className={`home-age-badge home-age-${movie.ageRating}`}
                    >
                      {movie.ageRating}
                    </span>
                  </span>
                </div>

                <div className="movie-detail-info-row">
                  <span>Release Date</span>
                  <span>{movie.releaseDate}</span>
                </div>

                <div className="movie-detail-info-row">
                  <span>Director</span>
                  <span>{movie.director}</span>
                </div>

                <div className="movie-detail-info-row">
                  <span>Writers</span>
                  <span>{movie.writers}</span>
                </div>

                <div className="movie-detail-info-row">
                  <span>Production Company</span>
                  <span>{movie.productionCompany}</span>
                </div>

                
                <div className="movie-detail-info-row movie-detail-cast-row">
                  <span>Cast</span>

                  <div className="movie-detail-cast-content">
                    {movie.castProfiles.length > 0 ? (
                      <div className="movie-cast-grid">
                        {movie.castProfiles.map((actor, index) => (
                          <div
                            className="movie-cast-card"
                            key={`${actor.name}-${index}`}
                          >
                            {actor.profile ? (
                              <img
                                src={actor.profile}
                                alt={actor.name}
                                loading="lazy"
                              />
                            ) : (
                              <div className="movie-cast-no-photo">
                                No photo
                              </div>
                            )}

                            <h3>{actor.name}</h3>
                            <p>
                              {actor.character ||
                                "Character unavailable"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>Cast information unavailable</span>
                    )}
                  </div>
                </div>

                <div className="movie-detail-info-row">
                  <span>Language</span>
                  <span>{movie.language}</span>
                </div>

                <div className="movie-detail-info-row">
                  <span>Subtitles</span>
                  <span>{movie.subtitles}</span>
                </div>
              </>
            )}

            <button
              type="button"
              className="movie-detail-expand"
              onClick={() => setShowMore(!showMore)}
              aria-expanded={showMore}
            >
              {showMore ? "Show Less" : "Show More"}

              {showMore ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>
          </div>
        </section>

        {/* Showtime integration will be added later */}
        <section
          id="movie-showtimes"
          className="movie-detail-section"
        >
          <h2>
            <CalendarDays size={23} />
            Showtimes
          </h2>

          <p className="movie-detail-placeholder-text">
            Showtime information will be available when connected
            to the cinema scheduling system.
          </p>
        </section>
      </div>
    </div>
  );
}

export default MovieDetailPage;
