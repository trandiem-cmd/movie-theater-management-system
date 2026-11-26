import express from "express";
import {
  getPricing,
  calculatePricing,
} from "../controllers/pricing.controller.js";

const router = express.Router();

router.get("/", getPricing);
router.post("/calculate", calculatePricing);

export default router;
