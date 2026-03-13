import "dotenv/config";
import { db } from "./pool.js";

async function migrate() {
  console.log("Running migrations...");

  await db.query(`
    CREATE TABLE IF NOT EXISTS cohorts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'archived')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id   UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  first_name  TEXT,
  last_name   TEXT,
  status      TEXT NOT NULL DEFAULT 'active'          -- ADD THIS LINE
              CHECK (status IN ('active', 'dropped')), -- AND THIS LINE
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cohort_id, email)
);
    CREATE TABLE IF NOT EXISTS survey_tokens (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      phase          TEXT NOT NULL CHECK (phase IN ('pre', 'post')),
      token          TEXT NOT NULL UNIQUE,
      expires_at     TIMESTAMPTZ NOT NULL,
      used_at        TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      phase          TEXT NOT NULL CHECK (phase IN ('pre', 'post')),
      answers        JSONB NOT NULL,
      submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(participant_id, phase)
    );

    CREATE TABLE IF NOT EXISTS staff (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_participants_cohort ON participants(cohort_id);
    CREATE INDEX IF NOT EXISTS idx_tokens_token ON survey_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_tokens_participant ON survey_tokens(participant_id);
    CREATE INDEX IF NOT EXISTS idx_responses_participant ON survey_responses(participant_id);
  `);

  console.log("Migrations complete.");
  await db.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});