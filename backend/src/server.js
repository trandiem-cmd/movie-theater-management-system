import express from 'express'
import cors from 'cors'
import pool from './config/database.js'
import dotenv from "dotenv";
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple';
import authRoutes from './routes/auth.routes.js';
import movieRoutes from './routes/movie.routes.js';

// Load environment variables
dotenv.config();
const app = express()
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://rio-theater-frontend-aqg4hmbje5b4bagb.switzerlandnorth-01.azurewebsites.net"
  ],
  credentials: true,
}));

// Request logger
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})
// Body parser
app.use(express.json())
// PostgreSQL Session Store
const PgSession = connectPgSimple(session)

const sessionStore = new PgSession({
  pool,
  tableName: 'user_sessions',
  createTableIfMissing: true,
})
// Session middleware
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}))
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

// API routes
app.use('/api/auth', authRoutes);
app.use("/api/movies", movieRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Event API listening at http://localhost:${PORT}`)
})


app.use('/api/auth', authRoutes);
