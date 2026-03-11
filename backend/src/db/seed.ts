import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./pool.js";

async function seed() {
  console.log("Seeding database...");

  const email = process.env.ADMIN_EMAIL || "admin@beaconhouse.org";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const hash = await bcrypt.hash(password, 10);

  await db.query(`
    INSERT INTO staff (email, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (email) DO NOTHING
  `, [email, hash]);

  console.log(`Staff account created: ${email}`);
  console.log("Seed complete. Change the admin password before deploying.");
  await db.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});