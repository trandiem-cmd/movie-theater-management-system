import express from "express";
import {
  createReservation,
  updateReservation,
} from "../controllers/reservation.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// Guests and signed-in customers can create reservations.
router.post("/", createReservation);

// Signed-in customers can also use this route.
router.post("/registered", requireAuth, createReservation);

// Update the seats held by an existing reservation.
router.put("/:id", updateReservation);

export default router;
