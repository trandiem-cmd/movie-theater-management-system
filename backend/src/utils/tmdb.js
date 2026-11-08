
const TMDB_BASE_URL = "https://api.themoviedb.org/3";


export async function fetchTMDBMovie(tmdbId) {
  const token = process.env.TMDB_TOKEN;

  if (!token) {
    throw new Error("TMDB_TOKEN is missing");
  }

  const response = await fetch(
   `${TMDB_BASE_URL}/movie/${tmdbId}?language=en-US&append_to_response=credits,videos,release_dates`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json();
}


export async function searchTMDBMovie(title) {
  const token = process.env.TMDB_TOKEN;

  if (!token) {
    throw new Error("TMDB_TOKEN is missing");
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(title)}&language=en-US`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`TMDB search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.results;
}
