
import express from "express";
import { getRoomSeats } from "../controllers/seat.controller.js";

const router = express.Router();

// GET /api/rooms/:id/seats
router.get("/:id/seats", getRoomSeats);

export default router;
