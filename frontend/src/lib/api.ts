import type {
  ApiResult,
  TokenValidationResult,
  SurveySubmitPayload,
  CreateCohortPayload,
  CohortStats,
} from "@beacon/shared";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  const token = localStorage.getItem("staff_token");

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
  },
  survey: {
    validate: (token: string) =>
      request<TokenValidationResult>(`/survey/validate?token=${token}`),
    submit: (payload: SurveySubmitPayload) =>
      request<{ success: boolean }>("/survey/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  cohorts: {
    list: () => request<any[]>("/cohorts"),

    create: (payload: CreateCohortPayload) =>
      request<{ cohort: any; participantCount: number }>("/cohorts", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getParticipants: (cohortId: string) =>
      request<any[]>(`/cohorts/${cohortId}/participants`),

    addParticipants: (cohortId: string, emails: string[], names: string[] = []) =>
      request<{ added: number }>(`/cohorts/${cohortId}/add-participants`, {
        method: "POST",
        body: JSON.stringify({ emails, names }),
      }),

    sendPost: (cohortId: string, participantId: string) =>
      request<{ sent: boolean }>(`/cohorts/${cohortId}/participants/${participantId}/send-post`, {
        method: "POST",
      }),

    resendPre: (cohortId: string, participantId: string) =>
      request<{ sent: boolean }>(`/cohorts/${cohortId}/participants/${participantId}/resend-pre`, {
        method: "POST",
      }),

    drop: (cohortId: string, participantId: string) =>
      request<{ success: boolean }>(`/cohorts/${cohortId}/participants/${participantId}/drop`, {
        method: "PATCH",
      }),

    reactivate: (cohortId: string, participantId: string) =>
      request<{ success: boolean }>(`/cohorts/${cohortId}/participants/${participantId}/reactivate`, {
        method: "PATCH",
      }),

    generateToken: (cohortId: string, participantId: string, phase: "pre" | "post") =>
      request<{ token: string; surveyUrl: string }>(
        `/cohorts/${cohortId}/participants/${participantId}/generate-token`,
        {
          method: "POST",
          body: JSON.stringify({ phase }),
        }
      ),
  },
  dashboard: {
    getCohortStats: (cohortId: string) =>
      request<CohortStats>(`/dashboard/${cohortId}`),
  },
  export: {
    getData: (startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const query = params.toString();
      return request<{
        totalParticipants: number;
        preCompleted: number;
        postCompleted: number;
        bothCompleted: number;
        averageDeltas: Record<string, number>;
        allPreAnswers: Record<string, any>[];
        allPostAnswers: Record<string, any>[];
        dateRange: { startDate: string | null; endDate: string | null };
      }>(`/export${query ? `?${query}` : ""}`);
    },
  },
};