
import pool from "../config/database.js";
import { validateMovie } from "../validators/movie.validator.js";

// GET /api/admin/movies
export async function getAdminMovies(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters. Limit must be between 1 and 100.",
      });
    }

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM movies"
    );

    const totalItems = Number(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const result = await pool.query(
      `SELECT *
       FROM movies
       ORDER BY movie_id DESC
       LIMIT $1 OFFSET $2`,
      [limit, (page - 1) * limit]
    );

    return res.status(200).json({
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
    console.error("Admin: Error fetching movies:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch movies",
    });
  }
}

// POST /api/admin/movies
export async function createMovie(req, res) {
  const validation = validateMovie(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const movie = validation.value;

    const result = await pool.query(
      `INSERT INTO movies (
        tmdb_id,
        title,
        description,
        duration,
        director,
        cast_members,
        language,
        age_rating,
        genre,
        subtitles,
        poster_url,
        trailer_url,
        release_date,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *`,
      [
        movie.tmdb_id,
        movie.title,
        movie.description,
        movie.duration,
        movie.director,
        movie.cast_members,
        movie.language,
        movie.age_rating,
        movie.genre,
        movie.subtitles,
        movie.poster_url,
        movie.trailer_url,
        movie.release_date,
        movie.status,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Movie created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error creating movie:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A movie with this TMDB ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create movie",
    });
  }
}

// PUT /api/admin/movies/:id
export async function updateMovie(req, res) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid movie ID",
    });
  }

  const validation = validateMovie(req.body, { partial: true });

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const movie = validation.value;
    const fields = Object.keys(movie);
    const values = Object.values(movie);

    const setClauses = fields.map(
      (field, index) => `${field} = $${index + 1}`
    );

    values.push(id);

    const result = await pool.query(
      `UPDATE movies
       SET ${setClauses.join(", ")},
           updated_at = NOW()
       WHERE movie_id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Movie updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error updating movie:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A movie with this TMDB ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update movie",
    });
  }
}

// DELETE /api/admin/movies/:id
export async function deleteMovie(req, res) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid movie ID",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM movies
       WHERE movie_id = $1
       RETURNING movie_id, title`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Admin: Error deleting movie:", error);

    // PostgreSQL foreign-key violation
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message:
          "This movie cannot be deleted because it is referenced by existing showtimes or corporate bookings.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete movie",
    });
  }
}
