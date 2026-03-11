import "dotenv/config";
import { db } from "../pool.js";

async function migrate() {
  await db.query(`
    ALTER TABLE participants
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dropped'));
  `);
  console.log("Migration complete.");
  await db.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});