import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { TokenValidationResult, Answers } from "@beacon/shared";
import { PRE_SURVEY_QUESTIONS, POST_SURVEY_QUESTIONS } from "@beacon/shared";

type Status = "loading" | "ready" | "error" | "submitting";

export function SurveyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [surveyInfo, setSurveyInfo] = useState<TokenValidationResult | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("No survey token provided. Please use the link from your email.");
      setStatus("error");
      return;
    }
    api.survey.validate(token).then((result) => {
      if (result.error) {
        setErrorMsg(result.error);
        setStatus("error");
      } else if (result.data) {
        setSurveyInfo(result.data);
        if (result.data.participant.firstName) setFirstName(result.data.participant.firstName);
        if (result.data.participant.lastName) setLastName(result.data.participant.lastName);
        setStatus("ready");
      }
    });
  }, [token]);

  const allQuestions = surveyInfo?.phase === "post" ? POST_SURVEY_QUESTIONS : PRE_SURVEY_QUESTIONS;
  const visibleQuestions = allQuestions.filter((q) => {
    if (!q.conditional) return true;
    return answers[q.conditional.id] === q.conditional.value;
  });

  const currentQ = visibleQuestions[step];
  const isLast = step === visibleQuestions.length - 1;
  const progress = Math.round((step / visibleQuestions.length) * 100);
  const currentVal = answers[currentQ?.id ?? ""];
  const canProceed = currentQ?.type === "text" || currentQ?.type === "number" || !!currentVal;

  const setValue = (val: string | number) => {
    setAnswers((a) => ({ ...a, [currentQ.id]: val }));
  };

  const handleNext = async () => {
    if (isLast) {
      setStatus("submitting");
      const result = await api.survey.submit({
        token, answers,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      if (result.error) { setErrorMsg(result.error); setStatus("error"); }
      else navigate("/thank-you");
    } else {
      setStep((s) => s + 1);
    }
  };

  if (status === "loading") return <Screen><p style={{ color: "#94a3b8" }}>Verifying your survey link...</p></Screen>;
  if (status === "error") return <Screen><ErrorCard message={errorMsg} /></Screen>;

  return (
    <Screen>
      <div style={{ width: "100%", maxWidth: 600 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 12, color: "#4ade80", letterSpacing: "0.15em", textTransform: "uppercase" }}>The Beacon House</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {surveyInfo?.phase === "pre" ? "Pre" : "Post"}-Class Assessment · {surveyInfo?.cohort.name}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{step + 1} / {visibleQuestions.length}</div>
          </div>
          <div style={{ height: 3, background: "#2e3248", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#4ade80,#60a5fa)", transition: "width 0.4s ease" }} />
          </div>
        </div>

        {step === 0 && (
          <div style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 16, padding: "20px 24px", marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 10, letterSpacing: "0.08em" }}>YOUR NAME</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" style={inputStyle} />
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" style={inputStyle} />
            </div>
          </div>
        )}

        {currentQ && (
          <div style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 20, padding: "28px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 8 }}>QUESTION {step + 1}</div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 19, color: "#e2e8f0", lineHeight: 1.4, marginBottom: 22 }}>{currentQ.label}</h2>

            {currentQ.type === "radio" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {currentQ.options.map((opt) => (
                  <button key={opt} onClick={() => setValue(opt)}
                    style={{ padding: "13px 16px", borderRadius: 10, textAlign: "left", fontSize: 14, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all 0.15s ease", background: currentVal === opt ? "#166534" : "#222536", border: `1px solid ${currentVal === opt ? "#4ade80" : "#2e3248"}`, color: currentVal === opt ? "#4ade80" : "#94a3b8", fontWeight: currentVal === opt ? 600 : 400 }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === "scale" && (
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {currentQ.options.map((_, i) => (
                    <button key={i} onClick={() => setValue(i + 1)}
                      style={{ flex: 1, padding: "14px 4px", borderRadius: 10, cursor: "pointer", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, border: `1px solid ${currentVal === i + 1 ? "#4ade80" : "#2e3248"}`, background: currentVal === i + 1 ? "#166534" : "#222536", color: currentVal === i + 1 ? "#4ade80" : "#64748b" }}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                  <span>{currentQ.options[0]}</span>
                  <span>{currentQ.options[currentQ.options.length - 1]}</span>
                </div>
              </div>
            )}

            {currentQ.type === "text" && (
              <textarea value={(currentVal as string) || ""} onChange={e => setValue(e.target.value)}
                placeholder="Type your response here..." rows={4}
                style={{ width: "100%", background: "#222536", border: "1px solid #2e3248", borderRadius: 12, padding: "14px 16px", color: "#e2e8f0", fontSize: 15, outline: "none", resize: "none", fontFamily: "DM Sans, sans-serif", lineHeight: 1.6, boxSizing: "border-box" }} />
            )}

            {currentQ.type === "number" && (
              <input type="number" value={(currentVal as number) || ""} onChange={e => setValue(Number(e.target.value))}
                placeholder="Enter a number"
                style={{ width: "100%", background: "#222536", border: "1px solid #2e3248", borderRadius: 12, padding: "14px 16px", color: "#e2e8f0", fontSize: 22, fontWeight: 600, outline: "none", fontFamily: "Syne, sans-serif", boxSizing: "border-box" }} />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: 14, borderRadius: 12, background: "#222536", border: "1px solid #2e3248", color: "#94a3b8", fontSize: 15, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              ← Back
            </button>
          )}
          <button onClick={handleNext} disabled={!canProceed || status === "submitting"}
            style={{ flex: 2, padding: 14, borderRadius: 12, background: "#4ade80", color: "#0f1117", fontSize: 15, fontWeight: 700, cursor: canProceed ? "pointer" : "not-allowed", border: "none", opacity: canProceed ? 1 : 0.4, fontFamily: "DM Sans, sans-serif" }}>
            {status === "submitting" ? "Submitting..." : isLast ? "Submit Assessment →" : "Continue →"}
          </button>
        </div>
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap'); * { box-sizing: border-box; margin: 0; }`}</style>
      {children}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 16, padding: "32px 28px", maxWidth: 480, textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, color: "#e2e8f0", marginBottom: 10 }}>Unable to Load Survey</h2>
      <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, background: "#222536", border: "1px solid #2e3248", borderRadius: 10,
  padding: "12px 14px", color: "#e2e8f0", fontSize: 15, outline: "none", fontFamily: "DM Sans, sans-serif",
};