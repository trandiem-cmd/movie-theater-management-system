
import express from "express";

import {
  getAdminMovies,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../controllers/adminMovie.controller.js";

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

export default router;
