import express from 'express'
import cors from 'cors'
import pool from './config/database.js'
import dotenv from "dotenv";
const app = express()

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://rio-theater-frontend-aqg4hmbje5b4bagb.switzerlandnorth-01.azurewebsites.net/"
  ]
}));

// Request logger
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

app.use(express.json())
// API welcome
app.get('/api', (_req, res) => res.json("Hello from API"))

// Test API and database
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(`SELECT NOW()`);
    res.json({
      success: true,
      message: "Backend and database are connected",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`Event API listening at http://localhost:${PORT}`)
})