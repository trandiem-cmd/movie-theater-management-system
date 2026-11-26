
import express from "express";

import {
  getAdminMovies,
  createMovie,
  updateMovie,
  deleteMovie,
  searchAdminTMDBMovies,
  getAdminTMDBMovieDetails,
} from "../controllers/adminMovie.controller.js";

import {
  getAdminShowtimes,
  createShowtime,
  updateShowtime,
  cancelShowtime,
} from "../controllers/showtime.controller.js";

import { getAdminRooms } from "../controllers/location.controller.js";

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


import {
  addRoomSeats,
  updateSeat,
  deleteSeat,
  deleteSeatRows,
  deleteSeatRow,
  updateWheelchairSpace,
  addWheelchairSpace,
  deleteWheelchairSpace,
  generateSeatLayout,
} from "../controllers/seat.controller.js";

import { requireRole } from "../middleware/role.middleware.js";

const router = express.Router();

// All admin movie routes require an authenticated Admin.
router.use(requireRole("admin"));

// GET /api/admin/movies
router.get("/movies", getAdminMovies);


// GET /api/admin/movies/tmdb/search?q=Avatar
router.get("/movies/tmdb/search", searchAdminTMDBMovies);

// GET /api/admin/movies/tmdb/:tmdbId
router.get("/movies/tmdb/:tmdbId", getAdminTMDBMovieDetails);



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



// Seat Management

// Add seats and complete layout
router.post("/rooms/:id/seats", addRoomSeats);
router.post("/rooms/:id/generate-seats", generateSeatLayout);

// Add wheelchair spaces
router.post("/rooms/:id/wheelchair-spaces", addWheelchairSpace);

// Update seats and wheelchair spaces
router.put("/seats/:id", updateSeat);
router.put("/wheelchair-spaces/:id", updateWheelchairSpace);

// Delete seats and rows
router.delete("/seats/:id", deleteSeat);
router.delete("/rooms/:id/rows/seats", deleteSeatRows);
router.delete("/rooms/:id/rows/:rowNumber/seats", deleteSeatRow);
router.delete("/wheelchair-spaces/:id", deleteWheelchairSpace);


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
