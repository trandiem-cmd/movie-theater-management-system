import "dotenv/config";
import { verifyEmailConnection } from "./email.js";

try {
  await verifyEmailConnection();
  console.log("Gmail SMTP connected successfully!");
} catch (error) {
  console.error("SMTP connection failed:", error.message);
}
