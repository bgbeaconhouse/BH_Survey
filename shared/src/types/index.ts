export type QuestionType = "radio" | "scale" | "text" | "number";

export interface BaseQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  conditional?: {
    id: string;
    value: string;
  };
}

export interface RadioQuestion extends BaseQuestion {
  type: "radio";
  options: string[];
}

export interface ScaleQuestion extends BaseQuestion {
  type: "scale";
  options: string[];
  scored: true;
  min: 1;
  max: 5;
}

export interface TextQuestion extends BaseQuestion {
  type: "text";
}

export interface NumberQuestion extends BaseQuestion {
  type: "number";
}

export type Question =
  | RadioQuestion
  | ScaleQuestion
  | TextQuestion
  | NumberQuestion;

export type AnswerValue = string | number | null;
export type Answers = Record<string, AnswerValue>;

export type SurveyPhase = "pre" | "post";

export interface Cohort {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  status: "active" | "completed" | "archived";
}

export interface Participant {
  id: string;
  cohortId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export interface SurveyToken {
  id: string;
  participantId: string;
  phase: SurveyPhase;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  participantId: string;
  phase: SurveyPhase;
  answers: Answers;
  submittedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface TokenValidationResult {
  valid: boolean;
  phase: SurveyPhase;
  participant: Pick<Participant, "id" | "firstName" | "email">;
  cohort: Pick<Cohort, "id" | "name">;
}

export interface SurveySubmitPayload {
  token: string;
  answers: Answers;
  firstName?: string;
  lastName?: string;
}

export interface CreateCohortPayload {
  name: string;
  description?: string;
  emails: string[];
}

export interface ParticipantComparison {
  participant: Participant;
  pre: SurveyResponse;
  post: SurveyResponse;
  deltas: Record<string, number>;
  totalDelta: number;
}

export interface CohortStats {
  cohort: Cohort;
  totalParticipants: number;
  preCompleted: number;
  postCompleted: number;
  bothCompleted: number;
  averageDeltas: Record<string, number>;
  comparisons: ParticipantComparison[];
}