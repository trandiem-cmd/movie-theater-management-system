
import pool from '../config/database.js'
import { fetchTMDBMovie } from '../utils/tmdb.js'

// GET /api/movies

export async function getMovies(req, res) {
  try {
    const { status, language, genre } = req.query;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (!Number.isSafeInteger(page) || page < 1 ||
        !Number.isSafeInteger(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }

    let query = "SELECT * FROM movies WHERE 1=1";
    const values = [];

    if (status) {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }

    if (language) {
      values.push(`%${language.trim()}%`);
      query += ` AND language ILIKE $${values.length}`;
    }

    if (genre) {
      values.push(genre);
      query += ` AND $${values.length} = ANY(genre)`;
    }

    const countResult = await pool.query(
      query.replace("SELECT *", "SELECT COUNT(*)"),
      values
    );

    const totalItems = Number(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const allowedSortFields = {
      title: "title",
      releaseDate: "release_date",
      duration: "duration",
    };

    const sortField = allowedSortFields[req.query.sortBy] || "movie_id";
    const sortOrder =
      req.query.order?.toLowerCase() === "desc" ? "DESC" : "ASC";

    query += ` ORDER BY ${sortField} ${sortOrder}`;

    values.push(limit);
    query += ` LIMIT $${values.length}`;

    values.push((page - 1) * limit);
    query += ` OFFSET $${values.length}`;

    const result = await pool.query(query, values);

    return res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching movies:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
}

// GET /api/movies/:id

export async function getMovie(req, res) {
  try {
    const id = Number(req.params.id)

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        message: 'Invalid movie ID',
      })
    }

    // Find the movie in Neon using its database ID
    const result = await pool.query(
      'SELECT * FROM movies WHERE movie_id = $1',
      [id]
    )

    const movie = result.rows[0]

    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found',
      })
    }

    let cast = []
    let writers = []
    let productionCompany = null

    
    if (movie.tmdb_id) {
      try {
        const tmdbMovie = await fetchTMDBMovie(movie.tmdb_id)

       
        cast = (tmdbMovie.credits?.cast || [])
          .slice(0, 10)
          .map((actor) => ({
            name: actor.name,
            character: actor.character || null,
            profile: actor.profile_path
              ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
              : null,
          }))

     
        writers = [
          ...new Set(
            (tmdbMovie.credits?.crew || [])
              .filter((person) =>
                ['Writer', 'Screenplay', 'Story'].includes(person.job)
              )
              .map((person) => person.name)
          ),
        ]

        productionCompany =
          tmdbMovie.production_companies?.[0]?.name || null
      } catch (error) {
        console.error('Failed to fetch TMDB details:', error.message)
      }
    }

    
    return res.json({
      ...movie,
      cast,
      writers,
      productionCompany,
    })
  } catch (error) {
    console.error('Error fetching movie:', error)

    return res.status(500).json({
      message: 'Failed to fetch movie',
    })
  }
}

// GET /api/movies/now-showing

export async function getNowShowing(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM movies WHERE status = $1 ORDER BY movie_id',
      ['now_showing']
    )

    return res.json(result.rows)
  } catch (error) {
    console.error('Error fetching now-showing movies:', error)

    return res.status(500).json({
      message: 'Failed to fetch now-showing movies',
    })
  }
}

// GET /api/movies/coming-soon

export async function getComingSoon(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM movies WHERE status = $1 ORDER BY release_date',
      ['coming_soon']
    )

    return res.json(result.rows)
  } catch (error) {
    console.error('Error fetching coming-soon movies:', error)

    return res.status(500).json({
      message: 'Failed to fetch coming-soon movies',
    })
  }
}

// GET /api/movies/search?q=

export async function searchMovieController(req, res) {
  try {
    const { q, genre, language } = req.query;

    if (typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search keyword is required',
      });
    }

    let query = 'SELECT * FROM movies WHERE title ILIKE $1';
    const values = [`%${q.trim()}%`];

    if (genre) {
      values.push(genre);
      query += ` AND $${values.length} = ANY(genre)`;
    }

    if (language) {
      values.push(`%${language.trim()}%`);
      query += ` AND language ILIKE $${values.length}`;
    }

    query += ' ORDER BY title';

    const result = await pool.query(query, values);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error searching movies:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to search movies',
    });
  }
}

