
import { Link } from "react-router-dom";
import "./MovieCard.css";

function MovieCard({ movie }) {
  return (
    <article className="home-movie-card">
      <Link
        to={`/movies/${movie.id}`}
        className="home-movie-card-link"
        aria-label={`View details for ${movie.title}`}
      >
        <img
          className="home-movie-poster"
          src={movie.poster}
          alt={`${movie.title} poster`}
        />

        <div className="home-movie-card-info">
          <h3>{movie.title}</h3>

          <p className="home-movie-card-meta">
            {[movie.genre, movie.duration].filter(Boolean).join(" · ")}
          </p>

          <div className="home-movie-card-bottom">
            <span className={`home-age-badge home-age-${movie.ageRating}`}>
              {movie.ageRating}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default MovieCard;
