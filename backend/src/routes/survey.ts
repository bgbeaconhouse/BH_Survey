import { Router } from "express";
import { db } from "../db/pool.js";
import type { SurveySubmitPayload } from "@beacon/shared";

export const surveyRouter = Router();

surveyRouter.get("/validate", async (req, res) => {
  const { token } = req.query as { token: string };

  if (!token) {
    res.status(400).json({ data: null, error: "Token required" });
    return;
  }

  try {
    const result = await db.query(`
      SELECT
        st.id AS token_id,
        st.phase,
        st.expires_at,
        st.used_at,
        p.id AS participant_id,
        p.first_name,
        p.last_name,
        p.email,
        c.id AS cohort_id,
        c.name AS cohort_name
      FROM survey_tokens st
      JOIN participants p ON p.id = st.participant_id
      JOIN cohorts c ON c.id = p.cohort_id
      WHERE st.token = $1
    `, [token]);

    const row = result.rows[0];

    if (!row) {
      res.status(404).json({ data: null, error: "Invalid survey link" });
      return;
    }

    if (row.used_at) {
      res.status(410).json({ data: null, error: "This survey has already been completed" });
      return;
    }

    if (new Date(row.expires_at) < new Date()) {
      res.status(410).json({ data: null, error: "This survey link has expired" });
      return;
    }

    res.json({
      data: {
        valid: true,
        phase: row.phase,
        participant: {
          id: row.participant_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
        },
        cohort: {
          id: row.cohort_id,
          name: row.cohort_name,
        },
      },
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});

surveyRouter.post("/submit", async (req, res) => {
  const { token, answers, firstName, lastName } = req.body as SurveySubmitPayload;

  if (!token || !answers) {
    res.status(400).json({ data: null, error: "Token and answers required" });
    return;
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(`
      SELECT st.*, p.id AS participant_id
      FROM survey_tokens st
      JOIN participants p ON p.id = st.participant_id
      WHERE st.token = $1
      FOR UPDATE
    `, [token]);

    const tokenRow = tokenResult.rows[0];

    if (!tokenRow) {
      await client.query("ROLLBACK");
      res.status(404).json({ data: null, error: "Invalid token" });
      return;
    }

    if (tokenRow.used_at) {
      await client.query("ROLLBACK");
      res.status(410).json({ data: null, error: "Survey already submitted" });
      return;
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      await client.query("ROLLBACK");
      res.status(410).json({ data: null, error: "Token expired" });
      return;
    }

    if (firstName || lastName) {
      await client.query(`
        UPDATE participants
        SET first_name = COALESCE($1, first_name),
            last_name  = COALESCE($2, last_name)
        WHERE id = $3
      `, [firstName ?? null, lastName ?? null, tokenRow.participant_id]);
    }

    await client.query(`
      INSERT INTO survey_responses (participant_id, phase, answers)
      VALUES ($1, $2, $3)
      ON CONFLICT (participant_id, phase) DO UPDATE SET answers = $3
    `, [tokenRow.participant_id, tokenRow.phase, JSON.stringify(answers)]);

    await client.query(
      "UPDATE survey_tokens SET used_at = NOW() WHERE id = $1",
      [tokenRow.id]
    );

    await client.query("COMMIT");

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  } finally {
    client.release();
  }
});