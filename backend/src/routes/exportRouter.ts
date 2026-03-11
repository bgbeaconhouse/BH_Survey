import { Router } from "express";
import { db } from "../db/pool.js";
import { SCORED_QUESTION_IDS } from "@beacon/shared";
import type { Answers } from "@beacon/shared";

export const exportRouter = Router();

exportRouter.get("/", async (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  try {
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
      WHERE p.status = 'active'
        AND ($1::date IS NULL OR p.created_at >= $1::date)
        AND ($2::date IS NULL OR p.created_at <= $2::date + interval '1 day')
      ORDER BY p.created_at ASC
    `, [startDate ?? null, endDate ?? null]);

    const participants = result.rows;
    const totalParticipants = participants.length;
    const preCompleted = participants.filter(p => p.pre_answers).length;
    const postCompleted = participants.filter(p => p.post_answers).length;
    const bothCompleted = participants.filter(p => p.pre_answers && p.post_answers).length;

    const allPreAnswers = participants
      .filter(p => p.pre_answers)
      .map(p => p.pre_answers as Answers);

    const allPostAnswers = participants
      .filter(p => p.post_answers)
      .map(p => p.post_answers as Answers);

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
        return { deltas, totalDelta };
      });

    const averageDeltas: Record<string, number> = {};
    if (comparisons.length > 0) {
      for (const key of SCORED_QUESTION_IDS) {
        const sum = comparisons.reduce((s, c) => s + (c.deltas[key] ?? 0), 0);
        averageDeltas[key] = sum / comparisons.length;
      }
    }

    res.json({
      data: {
        totalParticipants,
        preCompleted,
        postCompleted,
        bothCompleted,
        averageDeltas,
        allPreAnswers,
        allPostAnswers,
        dateRange: { startDate: startDate ?? null, endDate: endDate ?? null },
      },
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});