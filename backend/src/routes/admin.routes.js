
import express from "express";

import {
  getAdminMovies,
  createMovie,
  updateMovie,
  deleteMovie,
} from "../controllers/adminMovie.controller.js";

import {
  getAdminCities,
  getAdminTheaters,
  getTheaterById,
  createTheater,
  updateTheater,
  deleteTheater,
  getTheaterRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../controllers/adminLocation.controller.js";

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

// THEATER MANAGEMENT

// GET /api/admin/theaters/cities
router.get("/theaters/cities", getAdminCities);

// GET /api/admin/theaters?city=Oulu
router.get("/theaters", getAdminTheaters);

// GET /api/admin/theaters/:theaterId
router.get("/theaters/:theaterId", getTheaterById);

// POST /api/admin/theaters
router.post("/theaters", createTheater);

// PUT /api/admin/theaters/:theaterId
router.put("/theaters/:theaterId", updateTheater);

// DELETE /api/admin/theaters/:theaterId
router.delete("/theaters/:theaterId", deleteTheater);

// ROOM MANAGEMENT

// GET /api/admin/theaters/:theaterId/rooms
router.get("/theaters/:theaterId/rooms", getTheaterRooms);

// POST /api/admin/theaters/:theaterId/rooms
router.post("/theaters/:theaterId/rooms", createRoom);

// PUT /api/admin/rooms/:roomId
router.put("/rooms/:roomId", updateRoom);

// DELETE /api/admin/rooms/:roomId
router.delete("/rooms/:roomId", deleteRoom);

export default router;
