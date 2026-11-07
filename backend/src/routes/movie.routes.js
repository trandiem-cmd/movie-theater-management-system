
import express from "express";

import {
  getMovies,
  getMovie,
  getNowShowing,
  getComingSoon,
  searchMovieController,
} from "../controllers/movie.controller.js";

const router = express.Router();

// Get all movies
router.get("/", getMovies);

// Search movies
router.get("/search", searchMovieController);

// Get currently showing movies
router.get("/now-showing", getNowShowing);

// Get upcoming movies
router.get("/coming-soon", getComingSoon);

// Get movie details by ID
router.get("/:id", getMovie);

export default router;
