import express from "express";
import { createBooking } from "../controllers/booking.controller.js";

const router = express.Router();

// Create a Booking from an active Reservation.
router.post("/", createBooking);

export default router;
