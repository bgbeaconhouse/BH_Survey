import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { PRE_SURVEY_QUESTIONS, POST_SURVEY_QUESTIONS } from "@beacon/shared";
import type { Question } from "@beacon/shared";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const fonts = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap'); * { box-sizing: border-box; margin: 0; }`;

const pageStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#0f1117", padding: "32px 24px",
  fontFamily: "DM Sans, sans-serif",
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

const inputStyle: React.CSSProperties = {
  background: "#222536", border: "1px solid #2e3248", borderRadius: 10,
  padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none",
  fontFamily: "DM Sans, sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#64748b", fontWeight: 600,
  letterSpacing: "0.1em", marginBottom: 8,
};

// ── Helpers ──────────────────────────────────────────────────────

function getDistribution(answers: Record<string, any>[], questionId: string, options: string[]): Record<string, number> {
  const dist: Record<string, number> = {};
  options.forEach(o => { dist[o] = 0; });
  answers.forEach(a => {
    const val = a[questionId];
    if (val !== undefined && val !== null && val !== "") {
      const key = String(val);
      dist[key] = (dist[key] ?? 0) + 1;
    }
  });
  return dist;
}

function getScaleDistribution(answers: Record<string, any>[], questionId: string): Record<string, number> {
  const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  answers.forEach(a => {
    const val = Number(a[questionId]);
    if (val >= 1 && val <= 5) dist[String(val)]++;
  });
  return dist;
}

function toPct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toLetter(i: number): string {
  return String.fromCharCode(65 + i);
}

// ── Bar ───────────────────────────────────────────────────────────

function Bar({ pct, color }: { pct: number; color: string }) {
  const textColor = color === "#bfdbfe" ? "#1e40af" : color === "#86efac" ? "#166534" : "#334155";
  return (
    <div style={{ flex: 1, height: 18, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%", background: color, borderRadius: 3,
        display: "flex", alignItems: "center", paddingLeft: pct > 12 ? 6 : 0,
        minWidth: pct > 0 ? 2 : 0,
      }}>
        {pct > 12 && <span style={{ fontSize: 9, fontWeight: 600, color: textColor, whiteSpace: "nowrap" }}>{pct}%</span>}
      </div>
    </div>
  );
}

function PctLabel({ pct, color }: { pct: number; color: string }) {
  return pct <= 12
    ? <span style={{ fontSize: 9, fontWeight: 600, color, marginLeft: 4, width: 28, flexShrink: 0 }}>{pct}%</span>
    : <span style={{ width: 28, flexShrink: 0 }} />;
}

// ── Single question chart block ───────────────────────────────────

function QuestionChart({
  letter, question, answers, color, total,
}: {
  letter: string;
  question: Question;
  answers: Record<string, any>[];
  color: string;
  total: number;
}) {
  if (question.type === "text" || question.type === "number") return null;

  const options = question.type === "scale"
    ? ["1", "2", "3", "4", "5"]
    : (question as any).options as string[];

  const dist = question.type === "scale"
    ? getScaleDistribution(answers, question.id)
    : getDistribution(answers, question.id, options);

  const scaleLabels: Record<string, string> = question.type === "scale"
    ? Object.fromEntries((question as any).options.map((o: string, i: number) => [String(i + 1), o]))
    : {};

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Full question label */}
      <div style={{ fontSize: 10, fontWeight: 600, color: "#0f172a", marginBottom: 7, lineHeight: 1.4 }}>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, marginRight: 6, color: "#475569" }}>{letter}.</span>
        {question.label}
      </div>
      {/* Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {options.map(opt => {
          const count = dist[opt] ?? 0;
          const pct = toPct(count, total);
          const displayLabel = question.type === "scale"
            ? `${opt} — ${scaleLabels[opt] ?? ""}`
            : opt;
          return (
            <div key={opt} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 120, fontSize: 9, color: "#64748b", flexShrink: 0, lineHeight: 1.3, textAlign: "right", paddingRight: 6 }}>
                {displayLabel.length > 22 ? displayLabel.slice(0, 20) + "…" : displayLabel}
              </span>
              <Bar pct={pct} color={color} />
              <PctLabel pct={pct} color={color === "#bfdbfe" ? "#1e40af" : color === "#86efac" ? "#166534" : "#334155"} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dual chart block (pre + post) ─────────────────────────────────

function DualQuestionChart({
  letter, question, preAnswers, postAnswers, preTotal, postTotal,
}: {
  letter: string;
  question: Question;
  preAnswers: Record<string, any>[];
  postAnswers: Record<string, any>[];
  preTotal: number;
  postTotal: number;
}) {
  if (question.type === "text" || question.type === "number") return null;

  const options = question.type === "scale"
    ? ["1", "2", "3", "4", "5"]
    : (question as any).options as string[];

  const preDist = question.type === "scale"
    ? getScaleDistribution(preAnswers, question.id)
    : getDistribution(preAnswers, question.id, options);

  const postDist = question.type === "scale"
    ? getScaleDistribution(postAnswers, question.id)
    : getDistribution(postAnswers, question.id, options);

  const scaleLabels: Record<string, string> = question.type === "scale"
    ? Object.fromEntries((question as any).options.map((o: string, i: number) => [String(i + 1), o]))
    : {};

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Full question label */}
      <div style={{ fontSize: 10, fontWeight: 600, color: "#0f172a", marginBottom: 7, lineHeight: 1.4 }}>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, marginRight: 6, color: "#475569" }}>{letter}.</span>
        {question.label}
      </div>
      {/* Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {options.map(opt => {
          const prePct = toPct(preDist[opt] ?? 0, preTotal);
          const postPct = toPct(postDist[opt] ?? 0, postTotal);
          const displayLabel = question.type === "scale"
            ? `${opt} — ${scaleLabels[opt] ?? ""}`
            : opt;
          const truncated = displayLabel.length > 22 ? displayLabel.slice(0, 20) + "…" : displayLabel;
          return (
            <div key={opt}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ width: 120, fontSize: 9, color: "#64748b", flexShrink: 0, textAlign: "right", paddingRight: 6, lineHeight: 1.3 }}>{truncated}</span>
                <span style={{ width: 28, fontSize: 8, fontWeight: 700, color: "#94a3b8", flexShrink: 0 }}>PRE</span>
                <Bar pct={prePct} color="#bfdbfe" />
                <PctLabel pct={prePct} color="#1e40af" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 120, flexShrink: 0 }} />
                <span style={{ width: 28, fontSize: 8, fontWeight: 700, color: "#94a3b8", flexShrink: 0 }}>POST</span>
                <Bar pct={postPct} color="#86efac" />
                <PctLabel pct={postPct} color="#166534" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────

function ReportPage({
  children, header, footer,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: string;
}) {
  return (
    <div style={{
      width: 900, background: "#ffffff", color: "#0f172a",
      fontFamily: "DM Sans, sans-serif", marginBottom: 40,
      boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    }}>
      <div style={{ background: "#0f172a", padding: "18px 32px 0 32px" }}>
        {header}
      </div>
      {/* Full width chart area — no right key panel */}
      <div style={{ padding: "24px 32px" }}>
        {children}
      </div>
      <div style={{
        background: "#f8fafc", borderTop: "1px solid #e2e8f0",
        padding: "8px 28px", display: "flex", justifyContent: "space-between",
        fontSize: 8.5, color: "#94a3b8",
      }}>
        <span>The Beacon House Financial Literacy Program</span>
        <span>{footer}</span>
        <span>Exported {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
    </div>
  );
}

function PageHeader({
  title, subtitle, color, meta,
}: {
  title: string; subtitle: string; color: string; meta: string[];
}) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 800, color: "#4ade80", letterSpacing: "0.12em", textTransform: "uppercase" }}>The Beacon House</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Financial Literacy Program</div>
        </div>
        <div style={{ fontSize: 10, color: "#475569", textAlign: "right", lineHeight: 1.7 }}>
          {meta.map((m, i) => <div key={i}>{m}</div>)}
        </div>
      </div>
      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 14, paddingBottom: 16 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color, letterSpacing: "0.02em" }}>{title}</div>
        <div style={{ fontSize: 11, color, opacity: 0.6, marginTop: 3 }}>{subtitle}</div>
      </div>
    </>
  );
}

// ── Main ExportPage ───────────────────────────────────────────────

export function ExportPage() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError("");
    setData(null);
    const result = await api.export.getData(startDate || undefined, endDate || undefined);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setData(result.data);
    }
    setLoading(false);
  };

const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const pages = printRef.current.querySelectorAll<HTMLElement>(".report-page");
      let pdf: jsPDF | null = null;

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 900,
        });

        const imgWidth = canvas.width / 2;
        const imgHeight = canvas.height / 2;

        if (!pdf) {
          pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [imgWidth, imgHeight] });
        } else {
          pdf.addPage([imgWidth, imgHeight], "portrait");
        }

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }

      const dateStr = startDate && endDate ? `${startDate}_to_${endDate}` : "all_time";
      pdf!.save(`beacon-house-report-${dateStr}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
    setExporting(false);
  };

  const preChartable = PRE_SURVEY_QUESTIONS.filter(q => !q.conditional && q.type !== "text" && q.type !== "number");
  const postChartable = POST_SURVEY_QUESTIONS.filter(q => !q.conditional && q.type !== "text" && q.type !== "number");
  const comparedQuestions = PRE_SURVEY_QUESTIONS.filter(q =>
    !q.conditional &&
    q.type !== "text" &&
    q.type !== "number" &&
    POST_SURVEY_QUESTIONS.some(pq => pq.id === q.id)
  );

  return (
    <div style={pageStyle}>
      <style>{fonts}</style>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Nav header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => navigate("/admin")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 8, padding: 0 }}>← Back to Admin</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 800, color: "#4ade80", letterSpacing: "0.2em", marginBottom: 6 }}>THE BEACON HOUSE</div>
              <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: "#e2e8f0" }}>Export Report</h1>
            </div>
            {data && (
              <button onClick={handleExportPDF} disabled={exporting} style={btnPrimary}>
                {exporting ? "Generating PDF..." : "Download PDF →"}
              </button>
            )}
          </div>
        </div>

        {/* Date filter */}
        <div style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 16, padding: "24px 28px", marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={labelStyle}>START DATE (joined on or after)</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>END DATE (joined on or before)</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleFetch} disabled={loading} style={btnPrimary}>
                {loading ? "Loading..." : "Generate Report"}
              </button>
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(""); setEndDate(""); setData(null); }} style={btnSecondary}>
                  Clear
                </button>
              )}
            </div>
          </div>
          {!startDate && !endDate && (
            <div style={{ fontSize: 12, color: "#475569", marginTop: 12 }}>Leave dates blank to include all participants.</div>
          )}
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 24 }}>{error}</p>}

        {/* Summary stats */}
        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
            {[
              { label: "Total Participants", value: data.totalParticipants, color: "#94a3b8" },
              { label: "Pre Complete", value: data.preCompleted, color: "#60a5fa" },
              { label: "Post Complete", value: data.postCompleted, color: "#4ade80" },
              { label: "Both Complete", value: data.bothCompleted, color: "#fbbf24" },
            ].map(s => (
              <div key={s.label} style={{ background: "#1a1d27", border: "1px solid #2e3248", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Print layout */}
        {data && (
          <div ref={printRef}>

            {/* PAGE 1: PRE-SURVEY */}
            <div className="report-page">
              <ReportPage
                header={
                  <PageHeader
                    title="Pre-Survey Results"
                    subtitle="Responses collected before the financial literacy course"
                    color="#60a5fa"
                    meta={[
                      `${data.preCompleted} participants`,
                      startDate || endDate ? `${formatDate(startDate || null)} – ${formatDate(endDate || null)}` : "All time",
                      "Page 1 of 3",
                    ]}
                  />
                }
                footer="Page 1 of 3 — Pre-Survey Results"
              >
                {preChartable.map((q, i) => (
                  <div key={q.id}>
                    <QuestionChart
                      letter={toLetter(i)}
                      question={q}
                      answers={data.allPreAnswers}
                      color="#cbd5e1"
                      total={data.preCompleted}
                    />
                    {i < preChartable.length - 1 && <hr style={{ border: "none", borderTop: "1px dashed #e8ecf0", margin: "8px 0" }} />}
                  </div>
                ))}
              </ReportPage>
            </div>

            {/* PAGE 2: POST-SURVEY */}
            <div className="report-page">
              <ReportPage
                header={
                  <PageHeader
                    title="Post-Survey Results"
                    subtitle="Responses collected after completing the financial literacy course"
                    color="#4ade80"
                    meta={[
                      `${data.postCompleted} participants`,
                      startDate || endDate ? `${formatDate(startDate || null)} – ${formatDate(endDate || null)}` : "All time",
                      "Page 2 of 3",
                    ]}
                  />
                }
                footer="Page 2 of 3 — Post-Survey Results"
              >
                {postChartable.map((q, i) => (
                  <div key={q.id}>
                    <QuestionChart
                      letter={toLetter(i)}
                      question={q}
                      answers={data.allPostAnswers}
                      color="#86efac"
                      total={data.postCompleted}
                    />
                    {i < postChartable.length - 1 && <hr style={{ border: "none", borderTop: "1px dashed #e8ecf0", margin: "8px 0" }} />}
                  </div>
                ))}
              </ReportPage>
            </div>

            {/* PAGE 3: COMPARISON */}
            <div className="report-page">
              <ReportPage
                header={
                  <PageHeader
                    title="Pre vs. Post Comparison"
                    subtitle="Questions that appeared in both surveys — participants who completed both only"
                    color="#f59e0b"
                    meta={[
                      `${data.bothCompleted} participants (both surveys)`,
                      startDate || endDate ? `${formatDate(startDate || null)} – ${formatDate(endDate || null)}` : "All time",
                      "Page 3 of 3",
                    ]}
                  />
                }
                footer="Page 3 of 3 — Pre vs. Post Comparison"
              >
                {comparedQuestions.map((q, i) => (
                  <div key={q.id}>
                    <DualQuestionChart
                      letter={toLetter(i)}
                      question={q}
                      preAnswers={data.allPreAnswers}
                      postAnswers={data.allPostAnswers}
                      preTotal={data.preCompleted}
                      postTotal={data.postCompleted}
                    />
                    {i < comparedQuestions.length - 1 && <hr style={{ border: "none", borderTop: "1px dashed #e8ecf0", margin: "8px 0" }} />}
                  </div>
                ))}
              </ReportPage>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}