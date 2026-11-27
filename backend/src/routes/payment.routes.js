
import express from "express";
import {
  handleStripeWebhook,verifyCheckoutSession,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/webhook", handleStripeWebhook);
router.get("/verify-session", verifyCheckoutSession);

export default router;
