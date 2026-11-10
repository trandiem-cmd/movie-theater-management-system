
import {
  Film,
  MapPin,
  CalendarDays,
  Clock3,
  Armchair,
} from "lucide-react";
import "./MovieInfoCard.css";

function MovieInfoCard({ movie, showtime }) {
  const genre = Array.isArray(movie?.genre)
    ? movie.genre.join(", ")
    : movie?.genre;

  const duration = movie?.duration
    ? `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}min`
    : "Duration unavailable";

  return (
    <div className="movie-info-card">
      <div className="movie-info-header">
        <div className="movie-info-poster">
          {movie?.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
            />
          ) : (
            <Film size={35} />
          )}
        </div>

        <div className="movie-info-title">
          <h2>{movie?.title || "Movie details"}</h2>
          <p>{genre || "Genre unavailable"}</p>
          <p>{duration}</p>
          <span className="movie-age-rating">
            {movie?.age_rating || "TBA"}
          </span>
        </div>
      </div>

      <div className="movie-info-divider" />

      <div className="movie-info-row">
        <MapPin size={17} />
        <span>
          {showtime?.cinema || "Cinema to be confirmed"}
        </span>
      </div>

      <div className="movie-info-row">
        <Armchair size={17} />
        <span>
          {showtime?.auditorium || "Auditorium to be confirmed"}
        </span>
      </div>

      <div className="movie-info-row">
        <CalendarDays size={17} />
        <span>
          {showtime?.date || "Show date to be confirmed"}
        </span>
      </div>

      <div className="movie-info-row">
        <Clock3 size={17} />
        <span>
          {showtime?.time || "Show time to be confirmed"}
        </span>
      </div>
    </div>
  );
}

export default MovieInfoCard;
