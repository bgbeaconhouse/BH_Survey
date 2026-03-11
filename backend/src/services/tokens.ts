import { randomBytes } from "crypto";
import { db } from "../db/pool.js";
import type { SurveyPhase } from "@beacon/shared";

export async function generateToken(
  participantId: string,
  phase: SurveyPhase,
  expiresInDays: number = 7
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await db.query(`
    INSERT INTO survey_tokens (participant_id, phase, token, expires_at)
    VALUES ($1, $2, $3, $4)
  `, [participantId, phase, token, expiresAt]);

  return token;
}