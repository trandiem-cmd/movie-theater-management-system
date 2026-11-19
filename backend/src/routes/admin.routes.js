
import express from "express";

import {
  getAdminMovies,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../controllers/adminMovie.controller.js";

import {
  getAdminShowtimes,
  createShowtime,
  updateShowtime,
  cancelShowtime,
} from "../controllers/showtime.controller.js";


import { getAdminRooms } from "../controllers/location.controller.js";


import { requireRole } from "../middleware/role.middleware.js";

const router = express.Router();

// All admin movie routes require an authenticated Admin.
router.use(requireRole("admin"));

// GET /api/admin/movies
router.get("/movies", getAdminMovies);

// POST /api/admin/movies
router.post("/movies", createMovie);

// PUT /api/admin/movies/:id
router.put("/movies/:id", updateMovie);

// DELETE /api/admin/movies/:id
router.delete("/movies/:id", deleteMovie);

// Showtime management
router.post("/showtimes", createShowtime);
router.put("/showtimes/:id", updateShowtime);
router.delete("/showtimes/:id", cancelShowtime);
router.get("/showtimes", getAdminShowtimes);

// GET /api/admin/rooms
router.get("/rooms", getAdminRooms);


export default router;
