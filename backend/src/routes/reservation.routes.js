import express from "express";
import {
  createReservation,
  getReservation,
  cancelReservation,
} from "../controllers/reservation.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create a temporary reservation
router.post("/", requireAuth, createReservation);

// Retrieve reservation details
router.get("/:id", requireAuth, getReservation);

// Cancel a reservation
router.delete("/:id", requireAuth, cancelReservation);

export default router;