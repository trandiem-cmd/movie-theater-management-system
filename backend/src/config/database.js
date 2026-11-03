import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  options: "-c timezone=Europe/Helsinki",
});

pool.on("connect", () => {
  console.log("Connected to Neon PostgreSQL");
});

pool.on("error", (error) => {
  console.error("Database error:", error);
});

export default pool;