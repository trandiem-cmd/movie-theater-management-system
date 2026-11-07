
import "dotenv/config";
import { fetchTMDBMovie } from "../utils/tmdb.js";
import pool from "../config/database.js";

// 20 selected cinema movies
const moviesToImport = [
  // 13 Now Showing
  { tmdbId: 1465063, status: "now_showing" }, // Forgotten Island
  { tmdbId: 1400837, status: "now_showing" }, // Other Mommy
  { tmdbId: 1263337, status: "now_showing" }, // Heart of the Beast
  { tmdbId: 1503762, status: "now_showing" }, // Sense and Sensibility
  { tmdbId: 1423191, status: "now_showing" }, // Resident Evil
  { tmdbId: 1400940, status: "now_showing" }, // Clayface
  { tmdbId: 940721, status: "now_showing" }, // Godzilla Minus One
  { tmdbId: 1477104, status: "now_showing" }, // Shaun the Sheep
  { tmdbId: 1291595, status: "now_showing" }, // Insidious
  { tmdbId: 1315772, status: "now_showing" }, // Minions & Monsters
  { tmdbId: 1283515, status: "now_showing" }, // Verity
  { tmdbId: 1314481, status: "now_showing" }, // The Devil Wears Prada 2
  { tmdbId: 969681, status: "now_showing" }, // Spider-Man: Brand New Day

  // 7 Coming Soon
  { tmdbId: 1003596, status: "coming_soon" }, // Avengers: Doomsday
  { tmdbId: 1170608, status: "coming_soon" }, // Dune: Part Three
  { tmdbId: 1300968, status: "coming_soon" }, // The Hunger Games
  { tmdbId: 1260649, status: "coming_soon" }, // Jumanji: Open World
  { tmdbId: 1440769, status: "coming_soon" }, // The Beekeeper 2
  { tmdbId: 1288438, status: "coming_soon" }, // Godzilla x Kong: Supernova
  { tmdbId: 1384758, status: "coming_soon" }, // Ice Age: Boiling Point
];

// Temporary estimates for movies without TMDB runtimes
const estimatedRuntimes = {
  1260649: 120, // Jumanji: Open World
  1440769: 105, // The Beekeeper 2
  1288438: 115, // Godzilla x Kong: Supernova
};


const finnishAgeRatings = {
  1465063: "S",  // Forgotten Island
  1400837: "16", // Other Mommy
  1263337: "12", // Heart of the Beast
  1503762: "7",  // Sense and Sensibility
  1423191: "16", // Resident Evil
  1400940: "16", // Clayface
  940721: "12",  // Godzilla Minus One
  1477104: "7",  // Shaun the Sheep
  1291595: "16", // Insidious
  1315772: "7",  // Minions & Monsters
  1283515: "12", // Verity
  1314481: "7",  // The Devil Wears Prada 2
  969681: "12",  // Spider-Man: Brand New Day
  1003596: "12", // Avengers: Doomsday
  1170608: "12", // Dune: Part Three
  1300968: "16", // The Hunger Games
  1260649: "12", // Jumanji: Open World
  1440769: "16", // The Beekeeper 2
  1288438: "12", // Godzilla x Kong: Supernova
  1384758: "S",  // Ice Age: Boiling Point
};



function getFinnishAgeRating(tmdbId) {
  return finnishAgeRatings[tmdbId] ?? null;
}

async function importAllMovies() {
  let added = 0;
  let existing = 0;
  let failed = 0;

  try {
    for (const item of moviesToImport) {
      try {
        
        const movie = await fetchTMDBMovie(item.tmdbId);

       
        const director =
          movie.credits?.crew?.find(
            (person) => person.job === "Director"
          )?.name || null;

    
        const cast =
          movie.credits?.cast
            ?.slice(0, 5)
            .map((person) => person.name)
            .join(", ") || null;

        const trailer =
          movie.videos?.results?.find(
            (video) =>
              video.site === "YouTube" &&
              video.type === "Trailer" &&
              video.official === true
          ) ||
          movie.videos?.results?.find(
            (video) =>
              video.site === "YouTube" &&
              video.type === "Trailer"
          );

        // Use TMDB runtime, or our temporary estimate
        const duration =
          movie.runtime || estimatedRuntimes[movie.id];

        if (!duration) {
          console.log(`Skipped ${movie.title}: missing runtime`);
          failed++;
          continue;
        }

        // SQL query to insert the movie into Neon
        const query = `
          INSERT INTO movies (
            tmdb_id, title, description, duration,
            director, cast_members, language, age_rating,
            genre, subtitles, poster_url, trailer_url,
            release_date, status
          )
          VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14
          )
          ON CONFLICT (tmdb_id) DO NOTHING
          RETURNING movie_id, title
        `;

        // Values matching our Neon table columns
        const values = [
          movie.id,
          movie.title,
          movie.overview,
          duration,
          director,
          cast,
          "English, Finnish, Swedish",
          getFinnishAgeRating(movie.id),
          movie.genres.map((genre) => genre.name),
          ["Finnish", "Swedish"],
          movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null,
          trailer
            ? `https://www.youtube.com/watch?v=${trailer.key}`
            : null,
          movie.release_date || null,
          item.status,
        ];

        const result = await pool.query(query, values);

        if (result.rowCount > 0) {
          console.log(`Added: ${movie.title}`);
          added++;
        } else {
          console.log(`Already exists: ${movie.title}`);
          existing++;
        }
      } catch (error) {
        console.error(
          `Failed for TMDB ID ${item.tmdbId}:`,
          error.message
        );
        failed++;
      }
    }

    console.log("\nImport summary:");
    console.log("Added:", added);
    console.log("Already existed:", existing);
    console.log("Failed or skipped:", failed);
  } finally {
    await pool.end();
  }
}


 importAllMovies();
