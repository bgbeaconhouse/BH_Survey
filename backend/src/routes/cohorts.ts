import { Router } from "express";
import { db } from "../db/pool.js";
import { emailService } from "../services/email.js";
import { generateToken } from "../services/tokens.js";
import type { CreateCohortPayload } from "@beacon/shared";

export const cohortRouter = Router();

// GET /api/cohorts — list all cohorts
cohortRouter.get("/", async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.*,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_count,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'dropped') AS dropped_count,
        COUNT(DISTINCT CASE WHEN sr.phase = 'pre' THEN sr.id END) AS pre_completed,
        COUNT(DISTINCT CASE WHEN sr.phase = 'post' THEN sr.id END) AS post_completed
      FROM cohorts c
      LEFT JOIN participants p ON p.cohort_id = c.id
      LEFT JOIN survey_responses sr ON sr.participant_id = p.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json({ data: result.rows, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});

// GET /api/cohorts/:id/participants — get all participants with their survey status
cohortRouter.get("/:id/participants", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.*,
        pre.submitted_at  AS pre_submitted_at,
        post.submitted_at AS post_submitted_at,
        pre_token.token        AS pre_token,
        pre_token.expires_at   AS pre_token_expires,
        pre_token.used_at      AS pre_token_used,
        post_token.token       AS post_token,
        post_token.expires_at  AS post_token_expires,
        post_token.used_at     AS post_token_used
      FROM participants p
      LEFT JOIN survey_responses pre
        ON pre.participant_id = p.id AND pre.phase = 'pre'
      LEFT JOIN survey_responses post
        ON post.participant_id = p.id AND post.phase = 'post'
      LEFT JOIN LATERAL (
        SELECT token, expires_at, used_at
        FROM survey_tokens
        WHERE participant_id = p.id AND phase = 'pre'
        ORDER BY created_at DESC LIMIT 1
      ) pre_token ON true
      LEFT JOIN LATERAL (
        SELECT token, expires_at, used_at
        FROM survey_tokens
        WHERE participant_id = p.id AND phase = 'post'
        ORDER BY created_at DESC LIMIT 1
      ) post_token ON true
      WHERE p.cohort_id = $1
      ORDER BY p.status ASC, p.created_at DESC
    `, [req.params.id]);

    res.json({ data: result.rows, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});

// POST /api/cohorts — create cohort
cohortRouter.post("/", async (req, res) => {
  const { name, description, emails } = req.body as CreateCohortPayload;

  if (!name || !emails?.length) {
    res.status(400).json({ data: null, error: "Name and at least one email required" });
    return;
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const cohortResult = await client.query(
      "INSERT INTO cohorts (name, description) VALUES ($1, $2) RETURNING *",
      [name, description ?? null]
    );
    const cohort = cohortResult.rows[0];

    const participants = [];
    for (const email of emails) {
      const result = await client.query(
        `INSERT INTO participants (cohort_id, email)
         VALUES ($1, $2)
         ON CONFLICT (cohort_id, email) DO NOTHING
         RETURNING *`,
        [cohort.id, email.toLowerCase().trim()]
      );
      if (result.rows[0]) participants.push(result.rows[0]);
    }

    await client.query("COMMIT");

    // Send pre-survey to all
    for (const participant of participants) {
      try {
        const token = await generateToken(participant.id, "pre", 30);
        const surveyUrl = `${process.env.FRONTEND_URL}/survey?token=${token}`;
        await emailService.sendSurveyInvite({
          to: participant.email,
          firstName: participant.first_name,
          phase: "pre",
          surveyUrl,
        });
      } catch (err) {
        console.error(`Failed to send pre-survey to ${participant.email}:`, err);
      }
    }

    res.status(201).json({
      data: { cohort, participantCount: participants.length },
      error: null,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  } finally {
    client.release();
  }
});

// POST /api/cohorts/:id/add-participants
cohortRouter.post("/:id/add-participants", async (req, res) => {
  const { emails, names } = req.body as { emails?: string[]; names?: string[] };
  const cohortId = req.params.id;

  const emailList = (emails ?? []).map(e => e.toLowerCase().trim()).filter(Boolean);
  const nameList = (names ?? []).map(n => n.trim()).filter(Boolean);

  if (!emailList.length && !nameList.length) {
    res.status(400).json({ data: null, error: "At least one email or name required" });
    return;
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const participants = [];

    // Add email-based participants
    for (const email of emailList) {
      const result = await client.query(
        `INSERT INTO participants (cohort_id, email)
         VALUES ($1, $2)
         ON CONFLICT (cohort_id, email) DO UPDATE SET status = 'active'
         RETURNING *`,
        [cohortId, email]
      );
      if (result.rows[0]) participants.push({ ...result.rows[0], hasEmail: true });
    }

    // Add name-only participants with placeholder email
    for (const name of nameList) {
      const parts = name.split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || null;
      const placeholderEmail = `participant-${crypto.randomUUID()}@beacon.local`;

      const result = await client.query(
        `INSERT INTO participants (cohort_id, email, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [cohortId, placeholderEmail, firstName, lastName]
      );
      if (result.rows[0]) participants.push({ ...result.rows[0], hasEmail: false });
    }

    await client.query("COMMIT");

    // Only send emails to email-based participants
    for (const participant of participants.filter(p => p.hasEmail)) {
      try {
        const token = await generateToken(participant.id, "pre", 30);
        const surveyUrl = `${process.env.FRONTEND_URL}/survey?token=${token}`;
        await emailService.sendSurveyInvite({
          to: participant.email,
          firstName: participant.first_name,
          phase: "pre",
          surveyUrl,
        });
      } catch (err) {
        console.error(`Failed to send pre-survey to ${participant.email}:`, err);
      }
    }

    res.json({ data: { added: participants.length }, error: null });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  } finally {
    client.release();
  }
});

// POST /api/cohorts/:id/participants/:participantId/send-post
cohortRouter.post("/:id/participants/:participantId/send-post", async (req, res) => {
  const { participantId } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM participants WHERE id = $1",
      [participantId]
    );

    const participant = result.rows[0];
    if (!participant) {
      res.status(404).json({ data: null, error: "Participant not found" });
      return;
    }

    const token = await generateToken(participantId, "post", 30);
    const surveyUrl = `${process.env.FRONTEND_URL}/survey?token=${token}`;

    await emailService.sendSurveyInvite({
      to: participant.email,
      firstName: participant.first_name,
      phase: "post",
      surveyUrl,
    });

    res.json({ data: { sent: true }, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});

// POST /api/cohorts/:id/participants/:participantId/resend-pre
cohortRouter.post("/:id/participants/:participantId/resend-pre", async (req, res) => {
  const { participantId } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM participants WHERE id = $1",
      [participantId]
    );

    const participant = result.rows[0];
    if (!participant) {
      res.status(404).json({ data: null, error: "Participant not found" });
      return;
    }

    const token = await generateToken(participantId, "pre", 30);
    const surveyUrl = `${process.env.FRONTEND_URL}/survey?token=${token}`;

    await emailService.sendSurveyInvite({
      to: participant.email,
      firstName: participant.first_name,
      phase: "pre",
      surveyUrl,
    });

    res.json({ data: { sent: true }, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});

// PATCH /api/cohorts/:id/participants/:participantId/drop
cohortRouter.patch("/:id/participants/:participantId/drop", async (req, res) => {
  try {
    await db.query(
      "UPDATE participants SET status = 'dropped' WHERE id = $1",
      [req.params.participantId]
    );
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});

// PATCH /api/cohorts/:id/participants/:participantId/reactivate
cohortRouter.patch("/:id/participants/:participantId/reactivate", async (req, res) => {
  try {
    await db.query(
      "UPDATE participants SET status = 'active' WHERE id = $1",
      [req.params.participantId]
    );
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});

// POST /api/cohorts/:id/participants/:participantId/generate-token
cohortRouter.post("/:id/participants/:participantId/generate-token", async (req, res) => {
  const { participantId } = req.params;
  const { phase } = req.body as { phase: "pre" | "post" };

  if (!phase || (phase !== "pre" && phase !== "post")) {
    res.status(400).json({ data: null, error: "phase must be 'pre' or 'post'" });
    return;
  }

  try {
    const result = await db.query(
      "SELECT * FROM participants WHERE id = $1",
      [participantId]
    );

    const participant = result.rows[0];
    if (!participant) {
      res.status(404).json({ data: null, error: "Participant not found" });
      return;
    }

    const token = await generateToken(participantId, phase, 1);
    const surveyUrl = `${process.env.FRONTEND_URL}/survey?token=${token}`;

    res.json({ data: { token, surveyUrl }, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});