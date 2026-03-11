import pg from "pg";

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

db.connect()
  .then((client) => {
    console.log("Database connected");
    client.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });