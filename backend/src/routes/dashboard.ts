import { Router } from "express";
import { db } from "../db/pool.js";
import { SCORED_QUESTION_IDS } from "@beacon/shared";
import type { Answers } from "@beacon/shared";

export const dashboardRouter = Router();

dashboardRouter.get("/:cohortId", async (req, res) => {
  const { cohortId } = req.params;

  try {
    const cohortResult = await db.query(
      "SELECT * FROM cohorts WHERE id = $1",
      [cohortId]
    );

    if (!cohortResult.rows[0]) {
      res.status(404).json({ data: null, error: "Cohort not found" });
      return;
    }

    const cohort = cohortResult.rows[0];

    const result = await db.query(`
      SELECT
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.created_at,
        pre.answers  AS pre_answers,
        post.answers AS post_answers
      FROM participants p
      LEFT JOIN survey_responses pre
        ON pre.participant_id = p.id AND pre.phase = 'pre'
      LEFT JOIN survey_responses post
        ON post.participant_id = p.id AND post.phase = 'post'
      WHERE p.cohort_id = $1
      ORDER BY p.created_at ASC
    `, [cohortId]);

    const participants = result.rows;
    const totalParticipants = participants.length;
    const preCompleted = participants.filter(p => p.pre_answers).length;
    const postCompleted = participants.filter(p => p.post_answers).length;
    const bothCompleted = participants.filter(p => p.pre_answers && p.post_answers).length;

    const allPreAnswers = participants
      .filter(p => p.pre_answers)
      .map(p => p.pre_answers);

    const allPostAnswers = participants
      .filter(p => p.post_answers)
      .map(p => p.post_answers);

    const comparisons = participants
      .filter(p => p.pre_answers && p.post_answers)
      .map(p => {
        const pre: Answers = p.pre_answers;
        const post: Answers = p.post_answers;

        const deltas: Record<string, number> = {};
        for (const key of SCORED_QUESTION_IDS) {
          deltas[key] = Number(post[key] ?? 0) - Number(pre[key] ?? 0);
        }

        const totalDelta = Object.values(deltas).reduce((s, v) => s + v, 0);

        return {
          participant: {
            id: p.id, cohortId, email: p.email,
            firstName: p.first_name, lastName: p.last_name, createdAt: p.created_at,
          },
          pre: { answers: pre, phase: "pre" },
          post: { answers: post, phase: "post" },
          deltas,
          totalDelta,
        };
      });

    const averageDeltas: Record<string, number> = {};
    if (comparisons.length > 0) {
      for (const key of SCORED_QUESTION_IDS) {
        const sum = comparisons.reduce((s, c) => s + (c.deltas[key] ?? 0), 0);
        averageDeltas[key] = sum / comparisons.length;
      }
    }

    res.json({
      data: { cohort, totalParticipants, preCompleted, postCompleted, bothCompleted, averageDeltas, comparisons, allPreAnswers, allPostAnswers },
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});