import {
  Film,
  MapPin,
  CalendarDays,
  Clock3,
  Armchair,
  Ticket,
} from "lucide-react";
import "./MovieInfoCard.css";

function formatTime(timestamp) {
  if (!timestamp) return "Not available";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function MovieInfoCard({ movie, showtime }) {
  const genre = Array.isArray(movie?.genre)
    ? movie.genre.join(", ")
    : movie?.genre;

  const duration = movie?.duration
    ? `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}min`
    : "Duration unavailable";

  const ticketPrice =
    showtime?.ticketPrice != null
      ? `€${Number(showtime.ticketPrice).toFixed(2)}`
      : "To be confirmed";

  return (
    <div className="movie-info-card">
      {/* Faded movie backdrop covering the banner */}
      {movie?.backdrop_url && (
        <div
          className="movie-info-backdrop"
          style={{
            backgroundImage: `url("${movie.backdrop_url}")`,
          }}
          aria-hidden="true"
        />
      )}

      <div className="movie-info-content">
        <div className="movie-info-header">
          <div className="movie-info-poster">
            {movie?.poster_url ? (
              <img src={movie.poster_url} alt={movie.title} />
            ) : (
              <Film size={35} />
            )}
          </div>

          <div className="movie-info-main">
            <span className="movie-info-label">SEAT SELECTION</span>

            <h2>{movie?.title || "Movie details"}</h2>

            <div className="movie-info-meta">
              <span>{genre || "Genre unavailable"}</span>
              <span>{duration}</span>
              <span className="movie-age-rating">
                {movie?.age_rating || "TBA"}
              </span>
            </div>

            <div className="movie-info-details">
              <div className="movie-info-section">
                <div className="movie-info-row">
                  <MapPin size={18} />
                  <div>
                    <small>CINEMA</small>
                    <span>{showtime?.cinema || "To be confirmed"}</span>
                  </div>
                </div>

                <div className="movie-info-row">
                  <MapPin size={18} />
                  <div>
                    <small>LOCATION</small>
                    <span>{showtime?.location || "To be confirmed"}</span>
                  </div>
                </div>
              </div>

              <div className="movie-info-section">
                <div className="movie-info-row">
                  <Armchair size={18} />
                  <div>
                    <small>AUDITORIUM</small>
                    <span>{showtime?.auditorium || "To be confirmed"}</span>
                  </div>
                </div>

                <div className="movie-info-row">
                  <CalendarDays size={18} />
                  <div>
                    <small>DATE</small>
                    <span>{showtime?.date || "To be confirmed"}</span>
                  </div>
                </div>
              </div>

              <div className="movie-info-section">
                <div className="movie-info-row">
                  <Clock3 size={18} />
                  <div>
                    <small>DOORS OPEN</small>
                    <span>{formatTime(showtime?.doorsOpen)}</span>
                  </div>
                </div>

                <div className="movie-info-row">
                  <Clock3 size={18} />
                  <div>
                    <small>ADVERTISEMENTS START</small>
                    <span>{formatTime(showtime?.advertisementsStart)}</span>
                  </div>
                </div>

                <div className="movie-info-row">
                  <Clock3 size={18} />
                  <div>
                    <small>MOVIE STARTS</small>
                    <span className="movie-info-highlight">
                      {formatTime(showtime?.time)}
                    </span>
                  </div>
                </div>

                <div className="movie-info-row">
                  <Clock3 size={18} />
                  <div>
                    <small>MOVIE ENDS</small>
                    <span>{formatTime(showtime?.movieEnds)}</span>
                  </div>
                </div>
              </div>

              <div className="movie-info-price">
                <Ticket size={23} />
                <small>TICKET PRICE</small>
                <strong>{ticketPrice}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieInfoCard;
