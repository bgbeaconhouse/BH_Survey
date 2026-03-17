import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { PRE_SURVEY_QUESTIONS, POST_SURVEY_QUESTIONS } from "@beacon/shared";

const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap'); * { box-sizing: border-box; margin: 0; }`;

const pageStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#0f1117", display: "flex",
  flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "24px 16px", fontFamily: "DM Sans, sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#64748b", fontWeight: 600,
  letterSpacing: "0.1em", marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#222536", border: "1px solid #2e3248",
  borderRadius: 10, padding: "12px 14px", color: "#e2e8f0", fontSize: 15,
  outline: "none", fontFamily: "DM Sans, sans-serif",
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 20px", borderRadius: 10, background: "#4ade80",
  color: "#0f1117", fontSize: 14, fontWeight: 700, cursor: "pointer",
  border: "none", fontFamily: "DM Sans, sans-serif",
};

const btnSecondary: React.CSSProperties = {
  padding: "12px 20px", borderRadius: 10, background: "#222536",
  border: "1px solid #2e3248", color: "#94a3b8", fontSize: 14,
  cursor: "pointer", fontFamily: "DM Sans, sans-serif",
};



// ─── LoginPage ─────────────────────────────────────────────────
export function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

useEffect(() => {
  if (isLoggedIn) navigate("/admin");
}, [isLoggedIn]);

if (isLoggedIn) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const err = await login(email, password);
    if (err) { setError(err); setLoading(false); }
    else navigate("/admin");
  };

  return (
    <div style={pageStyle}>
      <style>{fonts}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 13, color: "#4ade80", letterSpacing: "0.2em", marginBottom: 6 }}>THE BEACON HOUSE</div>
          <h1 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 26, color: "#e2e8f0" }}>Staff Login</h1>
        </div>
        <form onSubmit={handleSubmit} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 20, padding: "32px 28px" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@beaconhouse.org" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnPrimary}>{loading ? "Signing in..." : "Sign In →"}</button>
        </form>
      </div>
    </div>
  );
}

// ─── AdminPage ─────────────────────────────────────────────────
export function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [addMode, setAddMode] = useState<"email" | "name">("email");
const [addNames, setAddNames] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedCohort, setExpandedCohort] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Record<string, any[]>>({});
  const [newName, setNewName] = useState("");
  const [newEmails, setNewEmails] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addEmails, setAddEmails] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});


  const loadCohorts = () =>
    api.cohorts.list().then(r => { if (!r.error && r.data) setCohorts(r.data); });

  const loadParticipants = (cohortId: string) =>
    api.cohorts.getParticipants(cohortId).then(r => {
      if (!r.error && r.data) setParticipants(p => ({ ...p, [cohortId]: r.data }));
    });

  useEffect(() => { loadCohorts(); }, []);

  const toggleCohort = (cohortId: string) => {
    if (expandedCohort === cohortId) {
      setExpandedCohort(null);
    } else {
      setExpandedCohort(cohortId);
      loadParticipants(cohortId);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const emails = newEmails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
    await api.cohorts.create({ name: newName, emails });
    setNewName(""); setNewEmails(""); setShowCreate(false); setCreating(false);
    loadCohorts();
  };

const handleAddParticipants = async (cohortId: string) => {
  const emails = addMode === "email"
    ? addEmails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean)
    : [];
  const names = addMode === "name"
    ? addNames.split(/[\n,]+/).map(n => n.trim()).filter(Boolean)
    : [];

  if (!emails.length && !names.length) return;
  setLoadingAction(`add-${cohortId}`);
  await api.cohorts.addParticipants(cohortId, emails, names);
  setAddEmails(""); setAddNames(""); setAddingTo(null);
  loadParticipants(cohortId);
  loadCohorts();
  setLoadingAction(null);
};

  const handleAction = async (
    cohortId: string,
    participantId: string,
    action: "sendPost" | "resendPre" | "drop" | "reactivate"
  ) => {
    setLoadingAction(`${action}-${participantId}`);
    const messages: Record<string, string> = {
      sendPost: "Post-survey sent",
      resendPre: "Pre-survey resent",
      drop: "Student dropped",
      reactivate: "Student reactivated",
    };
    try {
      if (action === "sendPost") await api.cohorts.sendPost(cohortId, participantId);
      if (action === "resendPre") await api.cohorts.resendPre(cohortId, participantId);
      if (action === "drop") await api.cohorts.drop(cohortId, participantId);
      if (action === "reactivate") await api.cohorts.reactivate(cohortId, participantId);
      setFeedback(f => ({ ...f, [participantId]: `✓ ${messages[action]}` }));
      loadParticipants(cohortId);
      loadCohorts();
    } catch {
      setFeedback(f => ({ ...f, [participantId]: "Error — try again" }));
    }
setLoadingAction(null);
  };

  const handleStartSurvey = async (cohortId: string, p: any) => {
    const phase = !p.pre_submitted_at ? "pre" : "post";
    setLoadingAction(`survey-${p.id}`);
    const result = await api.cohorts.generateToken(cohortId, p.id, phase);
    setLoadingAction(null);
    if (!result.error && result.data) {
      window.open(result.data.surveyUrl, "_blank");
    }
  };

  

  const getSurveyStatus = (p: any) => {
    const preComplete = !!p.pre_submitted_at;
    const postComplete = !!p.post_submitted_at;
    const preSent = !!p.pre_token;
    const postSent = !!p.post_token;

    return {
      pre: preComplete ? "✓ Complete" : preSent ? "Sent" : "Not sent",
      post: postComplete ? "✓ Complete" : postSent ? "Sent" : "Not sent",
      preComplete,
      postComplete,
      preSent,
      postSent,
    };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", padding: "32px 24px", fontFamily: "DM Sans, sans-serif" }}>
      <style>{fonts}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 12, color: "#4ade80", letterSpacing: "0.2em", marginBottom: 6 }}>THE BEACON HOUSE</div>
            <h1 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 28, color: "#e2e8f0" }}>Admin Panel</h1>
          </div>
         <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ New Cohort</button>
            <button onClick={() => navigate("/admin/export")} style={btnSecondary}>Export Report</button>
            <button onClick={logout} style={{ ...btnSecondary, fontSize: 13 }}>Logout</button>
</div>
        </div>

        {/* Create cohort form */}
        {showCreate && (
          <div style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 20, padding: "28px", marginBottom: 24 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18, color: "#e2e8f0", marginBottom: 20 }}>Create New Cohort</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>COHORT NAME</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} required style={inputStyle} placeholder="e.g. 2025 Financial Literacy Program" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>INITIAL STUDENT EMAILS (one per line or comma-separated)</label>
                <textarea value={newEmails} onChange={e => setNewEmails(e.target.value)} required rows={5}
                  style={{ ...inputStyle, resize: "vertical" as const }} placeholder="student1@email.com&#10;student2@email.com" />
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Pre-survey emails will be sent automatically when the cohort is created.</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={creating} style={btnPrimary}>{creating ? "Creating..." : "Create Cohort & Send Pre-Surveys"}</button>
                <button type="button" onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Cohort list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cohorts.length === 0 && <p style={{ color: "#64748b" }}>No cohorts yet. Create one to get started.</p>}
          {cohorts.map((c: any) => (
            <div key={c.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 16, overflow: "hidden" }}>

              {/* Cohort header row */}
              <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ cursor: "pointer" }} onClick={() => toggleCohort(c.id)}>
                  <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18, color: "#e2e8f0", marginBottom: 4 }}>
                    {expandedCohort === c.id ? "▾" : "▸"} {c.name}
                  </h3>
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    {c.active_count} active · {c.dropped_count} dropped · {c.pre_completed} pre complete · {c.post_completed} post complete
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => navigate(`/admin/dashboard/${c.id}`)} style={btnPrimary}>View Dashboard →</button>
                </div>
              </div>

              {/* Expanded participant roster */}
              {expandedCohort === c.id && (
                <div style={{ borderTop: "1px solid #2e3248", padding: "20px 24px" }}>

                  {/* Add students */}
             {addingTo === c.id ? (
  <div style={{ background: "#222536", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
    {/* Mode toggle */}
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      <button
        onClick={() => setAddMode("email")}
        style={{ ...addMode === "email" ? btnPrimary : btnSecondary, fontSize: 12, padding: "8px 14px" }}>
        By Email
      </button>
      <button
        onClick={() => setAddMode("name")}
        style={{ ...addMode === "name" ? btnPrimary : btnSecondary, fontSize: 12, padding: "8px 14px" }}>
        By Name (in-person)
      </button>
    </div>

    {addMode === "email" ? (
      <>
        <label style={labelStyle}>STUDENT EMAILS</label>
        <textarea value={addEmails} onChange={e => setAddEmails(e.target.value)} rows={4}
          style={{ ...inputStyle, resize: "vertical" as const, marginBottom: 8 }}
          placeholder="student@email.com&#10;another@email.com" />
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Pre-survey links will be emailed automatically.</div>
      </>
    ) : (
      <>
        <label style={labelStyle}>STUDENT NAMES</label>
        <textarea value={addNames} onChange={e => setAddNames(e.target.value)} rows={4}
          style={{ ...inputStyle, resize: "vertical" as const, marginBottom: 8 }}
          placeholder="Jane Smith&#10;John Doe" />
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>No email required. You can start their survey directly from the admin panel.</div>
      </>
    )}

    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={() => handleAddParticipants(c.id)}
        disabled={!!loadingAction} style={btnPrimary}>
        {loadingAction === `add-${c.id}` ? "Adding..." : addMode === "email" ? "Add & Send Pre-Surveys" : "Add Students"}
      </button>
      <button onClick={() => { setAddingTo(null); setAddEmails(""); setAddNames(""); }} style={btnSecondary}>Cancel</button>
    </div>
  </div>
) : (
                    <button onClick={() => setAddingTo(c.id)} style={{ ...btnSecondary, marginBottom: 20, fontSize: 13 }}>
                      + Add Students
                    </button>
                  )}

                  {/* Active students */}
                  {participants[c.id] && (
                    <>
                      {/* Active */}
                      {participants[c.id].filter(p => p.status === "active").length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 12 }}>ACTIVE STUDENTS</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {participants[c.id].filter(p => p.status === "active").map(p => {
                              const status = getSurveyStatus(p);
                              const isLoading = (action: string) => loadingAction === `${action}-${p.id}`;
                              return (
                                <div key={p.id} style={{ background: "#222536", borderRadius: 12, padding: "14px 16px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                    <div>
                                      <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>
                                        {p.first_name ? `${p.first_name} ${p.last_name ?? ""}`.trim() : p.email}
                                      </div>
                                      {p.first_name && <div style={{ fontSize: 12, color: "#64748b" }}>{p.email}</div>}
                                      <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                                        <span style={{ fontSize: 12, color: status.preComplete ? "#4ade80" : "#64748b" }}>
                                          Pre: {status.pre}
                                        </span>
                                        <span style={{ fontSize: 12, color: status.postComplete ? "#4ade80" : "#64748b" }}>
                                          Post: {status.post}
                                        </span>
                                      </div>
                                      {feedback[p.id] && <div style={{ fontSize: 12, color: "#4ade80", marginTop: 4 }}>{feedback[p.id]}</div>}
                                    </div>
                               <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
  {!status.preComplete && (
    <>
      <button onClick={() => handleStartSurvey(c.id, p)}
        disabled={!!loadingAction} style={{ ...btnPrimary, fontSize: 12, padding: "8px 12px" }}>
        {isLoading("survey") ? "Opening..." : "Start Pre-Survey"}
      </button>
      {!p.email.endsWith("@beacon.local") && (
        <button onClick={() => handleAction(c.id, p.id, "resendPre")}
          disabled={!!loadingAction} style={{ ...btnSecondary, fontSize: 12, padding: "8px 12px" }}>
          {isLoading("resendPre") ? "Sending..." : "Resend Email"}
        </button>
      )}
    </>
  )}
  {status.preComplete && !status.postComplete && (
    <>
      <button onClick={() => handleStartSurvey(c.id, p)}
        disabled={!!loadingAction} style={{ ...btnPrimary, fontSize: 12, padding: "8px 12px" }}>
        {isLoading("survey") ? "Opening..." : "Start Post-Survey"}
      </button>
      {!p.email.endsWith("@beacon.local") && (
        <button onClick={() => handleAction(c.id, p.id, "sendPost")}
          disabled={!!loadingAction} style={{ ...btnSecondary, fontSize: 12, padding: "8px 12px" }}>
          {isLoading("sendPost") ? "Sending..." : "Send Email"}
        </button>
      )}
    </>
  )}
  <button onClick={() => handleAction(c.id, p.id, "drop")}
    disabled={!!loadingAction}
    style={{ ...btnSecondary, fontSize: 12, padding: "8px 12px", color: "#f87171", borderColor: "#7f1d1d" }}>
    {isLoading("drop") ? "Dropping..." : "Drop"}
  </button>
</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dropped */}
                      {participants[c.id].filter(p => p.status === "dropped").length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 12 }}>DROPPED STUDENTS</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {participants[c.id].filter(p => p.status === "dropped").map(p => {
                              const status = getSurveyStatus(p);
                              const isLoading = (action: string) => loadingAction === `${action}-${p.id}`;
                              return (
                                <div key={p.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 12, padding: "14px 16px", opacity: 0.7 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                    <div>
                                      <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>
                                        {p.first_name ? `${p.first_name} ${p.last_name ?? ""}`.trim() : p.email}
                                      </div>
                                      {p.first_name && <div style={{ fontSize: 12, color: "#475569" }}>{p.email}</div>}
                                      <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                                        <span style={{ fontSize: 12, color: status.preComplete ? "#4ade80" : "#475569" }}>Pre: {status.pre}</span>
                                        <span style={{ fontSize: 12, color: status.postComplete ? "#4ade80" : "#475569" }}>Post: {status.post}</span>
                                      </div>
                                      {feedback[p.id] && <div style={{ fontSize: 12, color: "#4ade80", marginTop: 4 }}>{feedback[p.id]}</div>}
                                    </div>
                                    <button onClick={() => handleAction(c.id, p.id, "reactivate")}
                                      disabled={!!loadingAction}
                                      style={{ ...btnSecondary, fontSize: 12, padding: "8px 12px" }}>
                                      {isLoading("reactivate") ? "Reactivating..." : "Reactivate"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {!participants[c.id] && (
                    <p style={{ color: "#64748b", fontSize: 13 }}>Loading students...</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DashboardPage ─────────────────────────────────────────────
export function DashboardPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cohortId) return;
    api.dashboard.getCohortStats(cohortId).then(r => {
      if (!r.error && r.data) setStats(r.data);
      setLoading(false);
    });
  }, [cohortId]);

  if (loading) return <div style={pageStyle}><style>{fonts}</style><p style={{ color: "#94a3b8" }}>Loading...</p></div>;
  if (!stats) return <div style={pageStyle}><style>{fonts}</style><p style={{ color: "#f87171" }}>Failed to load dashboard.</p></div>;

  const allPreAnswers = stats.allPreAnswers ?? stats.comparisons.map((c: any) => c.pre.answers);
  const allPostAnswers = stats.allPostAnswers ?? stats.comparisons.map((c: any) => c.post.answers);

  const getScaleDistribution = (answers: any[], questionId: string) => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    answers.forEach(a => {
      const val = Number(a[questionId]);
      if (val >= 1 && val <= 5) dist[val]++;
    });
    const avg = answers.reduce((s, a) => s + (Number(a[questionId]) || 0), 0) / (answers.length || 1);
    return { dist, avg };
  };

  const getRadioDistribution = (answers: any[], questionId: string) => {
    const dist: Record<string, number> = {};
    answers.forEach(a => {
      const val = String(a[questionId] ?? "No answer");
      dist[val] = (dist[val] || 0) + 1;
    });
    return dist;
  };

  const getTextResponses = (answers: any[], questionId: string) => {
    return answers.map(a => a[questionId]).filter(Boolean) as string[];
  };

  const total = stats.comparisons.length;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", padding: "32px 24px", fontFamily: "DM Sans, sans-serif" }}>
      <style>{fonts}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => navigate("/admin")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 8, padding: 0 }}>← Back to Admin</button>
          <h1 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 28, color: "#e2e8f0" }}>{stats.cohort.name}</h1>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{total} students completed both surveys</div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 32 }}>
          {[
            { label: "Total Participants", value: stats.totalParticipants, color: "#94a3b8" },
            { label: "Pre Complete", value: stats.preCompleted, color: "#60a5fa" },
            { label: "Post Complete", value: stats.postCompleted, color: "#4ade80" },
            { label: "Both Complete", value: stats.bothCompleted, color: "#fbbf24" },
          ].map(c => (
            <div key={c.label} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>{c.label.toUpperCase()}</div>
              <div style={{ fontFamily: "Syne", fontSize: 32, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {total === 0 && (
          <div style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 16, padding: "32px", textAlign: "center", color: "#64748b" }}>
            No students have completed both surveys yet.
          </div>
        )}

{total > 0 && (
  <>
    {/* Individual students */}
    <div style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 24 }}>
      <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, color: "#e2e8f0", marginBottom: 16 }}>Students</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stats.comparisons.map((c: any) => {
          const totalDelta = Object.values(c.deltas as Record<string, number>).reduce((s, v) => s + v, 0);
          return (
            <div key={c.participant.id}
              onClick={() => navigate(`/admin/dashboard/${cohortId}/participant/${c.participant.id}`)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#222536", borderRadius: 12, padding: "14px 18px", cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>
                  {c.participant.firstName ? `${c.participant.firstName} ${c.participant.lastName ?? ""}`.trim() : c.participant.email}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{c.participant.email}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 22, color: totalDelta > 0 ? "#4ade80" : totalDelta < 0 ? "#f87171" : "#64748b" }}>
                  {totalDelta >= 0 ? "+" : ""}{totalDelta}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>score change</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Shared questions - pre vs post */}
    <h2 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, color: "#e2e8f0", marginBottom: 16 }}>Pre vs Post Comparison</h2>
    {PRE_SURVEY_QUESTIONS.filter(q => !q.conditional && POST_SURVEY_QUESTIONS.some(pq => pq.id === q.id)).map(q => {
      if (q.type === "scale") {
        const pre = getScaleDistribution(allPreAnswers, q.id);
        const post = getScaleDistribution(allPostAnswers, q.id);
        const delta = post.avg - pre.avg;
        return (
          <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "#e2e8f0", maxWidth: 600 }}>{q.label}</h3>
              <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#64748b" }}>
                {delta >= 0 ? "+" : ""}{delta.toFixed(2)} avg change
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <ScaleChart label="PRE" distribution={pre.dist} color="#60a5fa" options={q.options} />
              <ScaleChart label="POST" distribution={post.dist} color="#4ade80" options={q.options} />
            </div>
          </div>
        );
      }
      if (q.type === "radio") {
        const preDist = getRadioDistribution(allPreAnswers, q.id);
        const postDist = getRadioDistribution(allPostAnswers, q.id);
        return (
          <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 20 }}>{q.label}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <RadioChart label="PRE" distribution={preDist} color="#60a5fa" />
              <RadioChart label="POST" distribution={postDist} color="#4ade80" />
            </div>
          </div>
        );
      }
      return null;
    })}

    {/* Pre-only questions */}
    <h2 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, color: "#e2e8f0", marginBottom: 16, marginTop: 32 }}>Pre-Survey Only</h2>
    {PRE_SURVEY_QUESTIONS.filter(q => !q.conditional && !POST_SURVEY_QUESTIONS.some(pq => pq.id === q.id)).map(q => {
      if (q.type === "scale") {
        const pre = getScaleDistribution(allPreAnswers, q.id);
        return (
          <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 20 }}>{q.label}</h3>
            <ScaleChart label="PRE" distribution={pre.dist} color="#60a5fa" options={q.options} />
          </div>
        );
      }
      if (q.type === "radio") {
        const preDist = getRadioDistribution(allPreAnswers, q.id);
        return (
          <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 20 }}>{q.label}</h3>
            <RadioChart label="PRE" distribution={preDist} color="#60a5fa" />
          </div>
        );
      }
      if (q.type === "text" || q.type === "number") {
        const responses = getTextResponses(allPreAnswers, q.id);
        if (!responses.length) return null;
        return (
          <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 16 }}>{q.label}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {responses.map((r, i) => (
                <div key={i} style={{ background: "#222536", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>"{r}"</div>
              ))}
            </div>
          </div>
        );
      }
      return null;
    })}

    {/* Post-only questions */}
    <h2 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, color: "#e2e8f0", marginBottom: 16, marginTop: 32 }}>Post-Survey Only</h2>
    {POST_SURVEY_QUESTIONS.filter(q => !q.conditional && !PRE_SURVEY_QUESTIONS.some(pq => pq.id === q.id)).map(q => {
      if (q.type === "scale") {
        const post = getScaleDistribution(allPostAnswers, q.id);
        return (
          <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 20 }}>{q.label}</h3>
            <ScaleChart label="POST" distribution={post.dist} color="#4ade80" options={q.options} />
          </div>
        );
      }
      if (q.type === "radio") {
        const postDist = getRadioDistribution(allPostAnswers, q.id);
        return (
          <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 20 }}>{q.label}</h3>
            <RadioChart label="POST" distribution={postDist} color="#4ade80" />
          </div>
        );
      }
      if (q.type === "text" || q.type === "number") {
        const responses = getTextResponses(allPostAnswers, q.id);
        if (!responses.length) return null;
        return (
          <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 16 }}>{q.label}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {responses.map((r, i) => (
                <div key={i} style={{ background: "#222536", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>"{r}"</div>
              ))}
            </div>
          </div>
        );
      }
      return null;
    })}
  </>
)}
      </div>
    </div>
  );
}

// ─── Text-based display components ────────────────────────────

function ScaleChart({ label, distribution, color, options }: {
  label: string;
  distribution: Record<number, number>;
  color: string;
  options: string[];
}) {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.1em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(i => {
          const count = distribution[i] ?? 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#475569", width: 14, flexShrink: 0, textAlign: "right" }}>{i}</span>
              <span style={{ fontSize: 12, color: "#64748b", flex: 1, lineHeight: 1.4 }}>{options[i - 1]}</span>
              <span style={{ fontSize: 13, color: count > 0 ? color : "#475569", fontWeight: 600, flexShrink: 0, width: 28, textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadioChart({ label, distribution, color }: {
  label: string;
  distribution: Record<string, number>;
  color: string;
}) {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.1em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Object.entries(distribution).map(([opt, count]) => (
          <div key={opt} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#64748b", flex: 1, lineHeight: 1.4 }}>{opt}</span>
            <span style={{ fontSize: 13, color: count > 0 ? color : "#475569", fontWeight: 600, flexShrink: 0, width: 28, textAlign: "right" }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ParticipantDetailPage ─────────────────────────────────────
export function ParticipantDetailPage() {
  const { cohortId, participantId } = useParams<{ cohortId: string; participantId: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cohortId) return;
    api.dashboard.getCohortStats(cohortId).then(r => {
      if (!r.error && r.data) setStats(r.data);
      setLoading(false);
    });
  }, [cohortId]);

  if (loading) return <div style={pageStyle}><style>{fonts}</style><p style={{ color: "#94a3b8" }}>Loading...</p></div>;
  if (!stats) return <div style={pageStyle}><style>{fonts}</style><p style={{ color: "#f87171" }}>Failed to load.</p></div>;

  const comparison = stats.comparisons.find((c: any) => c.participant.id === participantId);
  if (!comparison) return <div style={pageStyle}><style>{fonts}</style><p style={{ color: "#f87171" }}>Student not found.</p></div>;

  const { participant, pre, post } = comparison;
console.log("post answer keys:", Object.keys(post.answers));

  const name = participant.firstName ? `${participant.firstName} ${participant.lastName ?? ""}`.trim() : participant.email;


  // Questions that appear in both surveys
  const sharedQuestions = PRE_SURVEY_QUESTIONS.filter(q =>
    !q.conditional && POST_SURVEY_QUESTIONS.some(pq => pq.id === q.id)
  );

  // Pre-only questions
  const preOnlyQuestions = PRE_SURVEY_QUESTIONS.filter(q =>
    !q.conditional && !POST_SURVEY_QUESTIONS.some(pq => pq.id === q.id)
  );

  // Post-only questions
  const postOnlyQuestions = POST_SURVEY_QUESTIONS.filter(q =>
    !q.conditional && !PRE_SURVEY_QUESTIONS.some(pq => pq.id === q.id)
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", padding: "32px 24px", fontFamily: "DM Sans, sans-serif" }}>
      <style>{fonts}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => navigate(`/admin/dashboard/${cohortId}`)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 8, padding: 0 }}>← Back to Dashboard</button>
          <h1 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 28, color: "#e2e8f0" }}>{name}</h1>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{participant.email} · Individual Report</div>
        </div>

{/* Score summary */}
<div style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 18, padding: "24px 28px", marginBottom: 24 }}>
  <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, color: "#e2e8f0", marginBottom: 16 }}>Score Changes</h3>
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {Object.entries(comparison.deltas as Record<string, number>).map(([key, delta]) => {
      const question = PRE_SURVEY_QUESTIONS.find(q => q.id === key);
      const preVal = Number(pre.answers[key] ?? 0);
      const postVal = Number(post.answers[key] ?? 0);
      return (
        <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#222536", borderRadius: 12, padding: "14px 18px" }}>
          <span style={{ fontSize: 13, color: "#94a3b8", maxWidth: 500, lineHeight: 1.5 }}>{question?.label ?? key}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <span style={{ fontSize: 14, color: "#3b82f6", fontWeight: 600 }}>{preVal}</span>
            <span style={{ fontSize: 12, color: "#475569" }}>→</span>
            <span style={{ fontSize: 14, color: "#4ade80", fontWeight: 600 }}>{postVal}</span>
            <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 14, color: delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#64748b", width: 40, textAlign: "right" }}>
              {delta >= 0 ? "+" : ""}{delta}
            </span>
          </div>
        </div>
      );
    })}
  </div>
</div>

{/* Shared questions - pre vs post */}
<h2 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: "#e2e8f0", marginBottom: 16 }}>Pre vs Post Comparison</h2>
{sharedQuestions.map(q => (
  <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 16, padding: "20px 24px", marginBottom: 12 }}>
    <h3 style={{ fontSize: 14, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>{q.label}</h3>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: "#222536", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 8 }}>PRE</div>
        <span style={{ fontSize: 14, color: "#e2e8f0" }}>
          {pre.answers[q.id] !== undefined && pre.answers[q.id] !== null && pre.answers[q.id] !== ""
            ? q.type === "scale"
              ? `${pre.answers[q.id]} — ${(q as any).options[Number(pre.answers[q.id]) - 1]}`
              : String(pre.answers[q.id])
            : <span style={{ color: "#475569", fontStyle: "italic" }}>No answer</span>
          }
        </span>
      </div>
      <div style={{ background: "#222536", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 8 }}>POST</div>
        <span style={{ fontSize: 14, color: "#e2e8f0" }}>
          {post.answers[q.id] !== undefined && post.answers[q.id] !== null && post.answers[q.id] !== ""
            ? q.type === "scale"
              ? `${post.answers[q.id]} — ${(q as any).options[Number(post.answers[q.id]) - 1]}`
              : String(post.answers[q.id])
            : <span style={{ color: "#475569", fontStyle: "italic" }}>No answer</span>
          }
        </span>
      </div>
    </div>
  </div>
))}
{/* Pre-only questions */}
        {preOnlyQuestions.length > 0 && (
          <>
            <h2 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: "#e2e8f0", marginBottom: 16, marginTop: 32 }}>Pre-Survey Only</h2>
            {preOnlyQuestions.map(q => (
              <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 16, padding: "20px 24px", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>{q.label}</h3>
                <div style={{ background: "#222536", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#e2e8f0" }}>
                  {pre.answers[q.id] !== undefined && pre.answers[q.id] !== null && pre.answers[q.id] !== ""
                    ? q.type === "scale"
                      ? `${pre.answers[q.id]} — ${(q as any).options[Number(pre.answers[q.id]) - 1]}`
                      : String(pre.answers[q.id])
                    : <span style={{ color: "#475569", fontStyle: "italic" }}>No answer</span>
                  }
                </div>
              </div>
            ))}
          </>
        )}

        {/* Post-only questions */}
        {postOnlyQuestions.length > 0 && (
          <>
            <h2 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: "#e2e8f0", marginBottom: 16, marginTop: 32 }}>Post-Survey Only</h2>
            {postOnlyQuestions.map(q => (
              <div key={q.id} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 16, padding: "20px 24px", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>{q.label}</h3>
                <div style={{ background: "#222536", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#e2e8f0" }}>
                  {post.answers[q.id] !== undefined && post.answers[q.id] !== null && post.answers[q.id] !== ""
                    ? q.type === "scale"
                      ? `${post.answers[q.id]} — ${(q as any).options[Number(post.answers[q.id]) - 1]}`
                      : String(post.answers[q.id])
                    : <span style={{ color: "#475569", fontStyle: "italic" }}>No answer</span>
                  }
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}
// ─── ThankYouPage ──────────────────────────────────────────────
export function ThankYouPage() {
  const navigate = useNavigate();
  return (
    <div style={pageStyle}>
      <style>{fonts}</style>
      <div style={{ textAlign: "center", maxWidth: 480, padding: "0 16px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
        <h1 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 28, color: "#e2e8f0", marginBottom: 10 }}>Assessment Complete</h1>
        <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.7 }}>
          Thank you for completing your assessment. Your responses have been recorded and will help us measure the impact of the Financial Literacy Program.
        </p>
        <button onClick={() => navigate("/")} style={{ ...btnPrimary, marginTop: 28 }}>
          Back to Home
        </button>
      </div>
    </div>
  );
}