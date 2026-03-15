"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────────────────────

type Tool = "home" | "advisor" | "resume" | "cover-letter" | "jd" | "interview" | "salary";

interface Props {
  fullName: string;
}

// ── Colours / style helpers ─────────────────────────────────────────────────

const C = {
  bg: "#0a0d14",
  panel: "#0d1117",
  border: "rgba(255,255,255,0.06)",
  muted: "rgba(255,255,255,0.35)",
  text: "rgba(255,255,255,0.85)",
  teal: "#22d3ee",
  tealBg: "rgba(8,145,178,0.12)",
  tealBorder: "rgba(8,145,178,0.3)",
  green: "#6ee7b7",
  greenBg: "rgba(16,185,129,0.12)",
  red: "#f87171",
  redBg: "rgba(239,68,68,0.1)",
  amber: "#fbbf24",
};

const btn = (variant: "teal" | "ghost" | "danger" = "teal"): React.CSSProperties => ({
  padding: "10px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "Inter, system-ui, sans-serif",
  ...(variant === "teal" ? {
    background: C.tealBg,
    border: `1px solid ${C.tealBorder}`,
    color: C.teal,
  } : variant === "danger" ? {
    background: C.redBg,
    border: "1px solid rgba(239,68,68,0.3)",
    color: C.red,
  } : {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: C.muted,
  }),
});

const card: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: "12px",
  padding: "24px",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.07em",
  color: C.muted,
  marginBottom: "8px",
  fontFamily: "JetBrains Mono, monospace",
  textTransform: "uppercase",
};

const input: React.CSSProperties = {
  width: "100%",
  background: "#0a0d14",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "12px 14px",
  fontSize: "14px",
  color: C.text,
  fontFamily: "Inter, system-ui, sans-serif",
  boxSizing: "border-box",
};

const textarea = (rows = 4): React.CSSProperties => ({
  ...input,
  resize: "vertical",
  minHeight: `${rows * 24 + 24}px`,
});

// ── File Upload Helper ──────────────────────────────────────────────────────

function FileUpload({ onParsed, label: lbl }: {
  onParsed: (text: string, fileName: string) => void;
  label: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = async (file: File) => {
    setStatus("loading");
    setErrorMsg("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/career/parse-resume", { method: "POST", body: form });
      let data: { text?: string; fileName?: string; error?: string } = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (!res.ok || data.error) {
        throw new Error(data.error || "We could not open that file. Please upload your resume as a Word document (.docx) or PDF and try again.");
      }
      setFileName(data.fileName || file.name);
      setStatus("done");
      onParsed(data.text!, data.fileName!);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "We could not open that file. Please upload your resume as a Word document (.docx) or PDF and try again.");
    }
  };

  return (
    <div>
      <span style={label}>{lbl}</span>
      <label style={{
        display: "block",
        border: `2px dashed ${status === "done" ? C.tealBorder : "rgba(255,255,255,0.12)"}`,
        borderRadius: "10px",
        padding: "20px",
        textAlign: "center",
        cursor: "pointer",
        background: status === "done" ? C.tealBg : "transparent",
        transition: "all 0.15s",
      }}>
        <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        {status === "loading" && <span style={{ color: C.muted, fontSize: "14px" }}>Reading file…</span>}
        {status === "done" && <span style={{ color: C.teal, fontSize: "14px" }}>✓ {fileName} — click to replace</span>}
        {status === "error" && <span style={{ color: C.red, fontSize: "14px" }}>{errorMsg}</span>}
        {status === "idle" && (
          <span style={{ color: C.muted, fontSize: "14px" }}>
            Click to upload Word (.docx) or PDF
          </span>
        )}
      </label>
    </div>
  );
}

// ── Coaching Q&A ────────────────────────────────────────────────────────────

function CoachingQA({ questions, answers, onChange }: {
  questions: string[];
  answers: string[];
  onChange: (i: number, val: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {questions.map((q, i) => (
        <div key={i}>
          <p style={{ fontSize: "15px", color: C.text, marginBottom: "10px", lineHeight: "1.5" }}>
            <span style={{ color: C.teal, fontWeight: "700", marginRight: "8px" }}>{i + 1}.</span>
            {q}
          </p>
          <textarea
            rows={3}
            style={textarea(3)}
            placeholder="Your answer…"
            value={answers[i] || ""}
            onChange={e => onChange(i, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

// ── Score Ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const colour = score >= 75 ? C.teal : score >= 50 ? C.amber : C.red;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill={colour}
        fontSize={size < 48 ? "10" : "13"} fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {score}
      </text>
    </svg>
  );
}

// ── Career Strategy Advisor ─────────────────────────────────────────────────

const ADVISOR_QUESTIONS = [
  {
    question: "What kind of work do you enjoy most?",
    options: [
      "Working with systems, data, and technical teams",
      "Understanding customers and shaping products",
      "Improving business processes and driving strategy",
      "I am still figuring it out",
    ],
  },
  {
    question: "Which tools or activities feel most familiar to you?",
    options: [
      "SQL, APIs, system documentation, data analysis",
      "User stories, backlog grooming, product planning, wireframes",
      "Stakeholder workshops, process mapping, business cases",
      "None of these yet. I am building my skills",
    ],
  },
  {
    question: "Where are you in your career right now?",
    options: [
      "Entry level or aspiring BA",
      "Mid level BA (2 to 5 years)",
      "Senior BA (5 or more years)",
      "Transitioning from another field",
    ],
  },
  {
    question: "What kind of environment appeals to you?",
    options: [
      "Engineering and technical product teams",
      "Agile product squads with designers and PMs",
      "Large organisations or consulting",
      "I am open to anything right now",
    ],
  },
];

const TRACKS = [
  {
    name: "Technical BA",
    colour: "#818cf8",
    desc: "Works closely with engineering teams, systems, APIs, and data. Turns complex technical problems into clear business requirements.",
  },
  {
    name: "Product BA",
    colour: "#22d3ee",
    desc: "Embedded in product teams alongside designers and PMs. Shapes features, writes user stories, and keeps the team focused on real outcomes.",
  },
  {
    name: "Business & Strategy BA",
    colour: "#fbbf24",
    desc: "Works at the organisation level on process improvement, stakeholder strategy, change management, and building business cases.",
  },
];

const LOADING_STEPS = [
  "Understanding your experience",
  "Mapping your strengths",
  "Comparing BA career paths",
  "Preparing your recommendation",
];

const PORTAL_ACTIONS: Record<string, { label: string; href: string }[]> = {
  "Technical BA": [
    { label: "Try a BA challenge simulation", href: "/scenarios" },
    { label: "Explore the learning path", href: "/learning" },
  ],
  "Product BA": [
    { label: "Try a BA challenge simulation", href: "/scenarios" },
    { label: "Explore the learning path", href: "/learning" },
    { label: "Build your portfolio", href: "/portfolio" },
  ],
  "Business & Strategy BA": [
    { label: "Try a BA challenge simulation", href: "/scenarios" },
    { label: "Practice with PitchReady", href: "/pitchready" },
    { label: "Explore the learning path", href: "/learning" },
  ],
};

// Alex avatar — consistent across intro and result
function AlexAvatar({ size = 44 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg, #0891b2, #6366f1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.round(size * 0.4) + "px", fontWeight: "700", color: "white",
        flexShrink: 0,
      }}>A</div>
      <div>
        <div style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Alex</div>
        <div style={{ fontSize: "11px", color: C.muted }}>Career Advisor</div>
      </div>
    </div>
  );
}

// Animated loading steps
function AdvisorLoading() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: "48px 0", display: "flex", flexDirection: "column", gap: "32px" }}>
      <p style={{ fontSize: "15px", color: C.muted, margin: 0 }}>Working through your answers…</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {LOADING_STEPS.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "12px",
            opacity: i <= current ? 1 : 0.3,
            transition: "opacity 0.4s",
          }}>
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
              background: i < current ? C.green : i === current ? C.teal : C.border,
              border: i === current ? `2px solid ${C.teal}` : "none",
              transition: "all 0.4s",
            }} />
            <span style={{ fontSize: "15px", color: i <= current ? C.text : C.muted }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvisorTool({ onNavigate }: { onNavigate?: (tool: Tool) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "paths" | "question" | "loading" | "result">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<null | {
    primaryTrack: string;
    trackScores: Record<string, number>;
    whyThisFits: string;
    whereYouAreNow: string;
    whatNextFocus: string;
    secondaryTrack: string | null;
    strengths: string[];
    gaps: string[];
    nextSteps: string[];
    roleTypesToTarget: string[];
    watchOut: string;
  }>(null);
  const [error, setError] = useState("");

  const trackColour = (track: string) => {
    if (track.includes("Technical")) return "#818cf8";
    if (track.includes("Product")) return C.teal;
    return C.amber;
  };

  const selectOption = async (option: string) => {
    const updated = [...selectedAnswers, option];
    setSelectedAnswers(updated);

    if (qIndex < ADVISOR_QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      setStep("loading");
      setError("");
      const answers = {
        background: updated[2] || "",
        currentRole: updated[3] || "",
        whatLove: updated[0] || "",
        whatAvoid: "",
        goal: updated[1] || "",
      };
      try {
        const res = await fetch("/api/career/career-advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed");
        setResult(data);
        setStep("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStep("question");
      }
    }
  };

  const restart = () => {
    setStep("intro");
    setQIndex(0);
    setSelectedAnswers([]);
    setResult(null);
    setError("");
  };

  // ── Intro ──
  if (step === "intro") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "20px", fontWeight: "700", color: C.text, margin: 0, lineHeight: "1.4" }}>
            Let us figure out which BA path fits you.
          </p>
          <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.7", margin: 0 }}>
            There are three directions most BAs end up in. I will ask you four quick questions and tell you which one makes the most sense for you and why.
          </p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", lineHeight: "1.6", margin: 0 }}>
            No BA experience needed. Just answer honestly and we will work it out.
          </p>
        </div>

        <button style={{ ...btn(), alignSelf: "flex-start", padding: "12px 28px", fontSize: "15px" }}
          onClick={() => setStep("paths")}>
          Let&apos;s go
        </button>
      </div>
    );
  }

  // ── Paths overview ──
  if (step === "paths") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <p style={{ fontSize: "16px", color: C.text, lineHeight: "1.6", margin: "0 0 4px" }}>
            There are three common paths Business Analysts tend to follow.
          </p>
          <p style={{ fontSize: "14px", color: C.muted, lineHeight: "1.5", margin: 0 }}>
            Have a read through them, then we will ask you a few short questions to find your fit.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {TRACKS.map(t => (
            <div key={t.name} style={{
              background: C.panel,
              border: `1px solid ${t.colour}22`,
              borderLeft: `3px solid ${t.colour}`,
              borderRadius: "10px",
              padding: "18px 20px",
            }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: t.colour, marginBottom: "6px" }}>{t.name}</div>
              <div style={{ fontSize: "14px", color: C.muted, lineHeight: "1.5" }}>{t.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button style={{ ...btn(), padding: "12px 28px", fontSize: "15px" }}
            onClick={() => setStep("question")}>
            Find my path
          </button>
          <button style={btn("ghost")} onClick={() => setStep("intro")}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (step === "loading") {
    return <AdvisorLoading />;
  }

  // ── Questions ──
  if (step === "question") {
    const q = ADVISOR_QUESTIONS[qIndex];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {ADVISOR_QUESTIONS.map((_, i) => (
            <div key={i} style={{
              width: i === qIndex ? "24px" : "8px",
              height: "8px", borderRadius: "4px",
              background: i < qIndex ? C.green : i === qIndex ? C.teal : C.border,
              transition: "all 0.2s",
            }} />
          ))}
          <span style={{ fontSize: "12px", color: C.muted, marginLeft: "8px" }}>
            {qIndex + 1} of {ADVISOR_QUESTIONS.length}
          </span>
        </div>

        <p style={{ fontSize: "20px", fontWeight: "600", color: C.text, lineHeight: "1.5", margin: 0 }}>
          {q.question}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => selectOption(opt)}
              style={{
                textAlign: "left", padding: "16px 20px", borderRadius: "10px",
                fontSize: "15px", color: C.text, background: "rgba(255,255,255,0.03)",
                border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.12s",
                fontFamily: "Inter, system-ui, sans-serif", lineHeight: "1.4",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = C.tealBg;
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.tealBorder;
                (e.currentTarget as HTMLButtonElement).style.color = C.teal;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                (e.currentTarget as HTMLButtonElement).style.color = C.text;
              }}>
              {opt}
            </button>
          ))}
        </div>

        {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}

        {qIndex > 0 && (
          <button style={{ ...btn("ghost"), alignSelf: "flex-start" }}
            onClick={() => { setQIndex(qIndex - 1); setSelectedAnswers(prev => prev.slice(0, -1)); }}>
            Back
          </button>
        )}
      </div>
    );
  }

  // ── Result ──
  if (step === "result" && result) {
    const tc = trackColour(result.primaryTrack);
    const scores = result.trackScores || {};
    const portalActions = PORTAL_ACTIONS[result.primaryTrack] || PORTAL_ACTIONS["Product BA"];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Recommendation header */}
        <div style={{ ...card, border: `1px solid ${tc}33`, background: `${tc}0d` }}>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "6px" }}>YOUR PATH</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: tc }}>{result.primaryTrack}</div>
            {result.secondaryTrack && (
              <div style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>Also worth considering: {result.secondaryTrack}</div>
            )}
          </div>

          {/* Three structured explanation sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: tc, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "6px" }}>WHY THIS PATH FITS YOU</div>
              <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whyThisFits}</p>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "6px" }}>WHERE YOU ARE STARTING FROM</div>
              <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whereYouAreNow}</p>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "6px" }}>WHAT THIS MEANS FOR YOUR NEXT STEP</div>
              <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whatNextFocus}</p>
            </div>
          </div>
        </div>

        {/* All three track scores */}
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "16px" }}>PATH MATCH SCORES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {TRACKS.map(t => {
              const score = scores[t.name] ?? 0;
              return (
                <div key={t.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: t.name === result.primaryTrack ? "700" : "400", color: t.name === result.primaryTrack ? t.colour : C.muted }}>{t.name}</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: t.colour, fontFamily: "JetBrains Mono, monospace" }}>{score}</span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", background: C.border, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${score}%`, background: t.colour, borderRadius: "3px", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths and gaps */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={card}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>WHAT YOU BRING</div>
            {result.strengths.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <span style={{ color: C.green, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: "14px", color: C.text, lineHeight: "1.4" }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>WHAT TO BUILD</div>
            {result.gaps.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <span style={{ color: C.amber, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: "14px", color: C.text, lineHeight: "1.4" }}>{g}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next steps */}
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>NEXT STEPS</div>
          {result.nextSteps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "flex-start" }}>
              <span style={{ background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: C.teal, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: "14px", color: C.text, lineHeight: "1.5" }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Portal activity buttons */}
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "14px" }}>START PRACTISING NOW</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {portalActions.map((a, i) => (
              <button key={i} onClick={() => router.push(a.href)}
                style={{ ...btn(i === 0 ? "teal" : "ghost"), fontSize: "13px", padding: "9px 16px" }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Roles and watch out */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={card}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>ROLES TO TARGET</div>
            {result.roleTypesToTarget.map((r, i) => (
              <div key={i} style={{ fontSize: "14px", color: C.text, marginBottom: "8px", paddingLeft: "14px", borderLeft: `2px solid ${C.border}` }}>{r}</div>
            ))}
          </div>
          <div style={{ ...card, border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>WORTH KNOWING</div>
            <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.5", margin: 0 }}>{result.watchOut}</p>
          </div>
        </div>

        {/* Next step nudge */}
        {onNavigate && (
          <div style={{ ...card, borderColor: C.tealBorder, background: "rgba(8,145,178,0.06)" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>YOUR NEXT STEP</div>
            <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.5", margin: "0 0 14px" }}>
              Now that you know your direction, the best thing you can do is strengthen your resume so it speaks the language of that track.
            </p>
            <button style={{ ...btn(), fontSize: "13px", padding: "9px 18px" }} onClick={() => onNavigate("resume")}>
              Go to Resume Improvement
            </button>
          </div>
        )}

        <button style={{ ...btn("ghost"), alignSelf: "flex-start" }} onClick={restart}>
          Start over
        </button>
      </div>
    );
  }

  return null;
}

// ── Resume Improvement ──────────────────────────────────────────────────────

function ResumeTool({ fullName, onNavigate }: { fullName: string; onNavigate?: (tool: Tool) => void }) {
  const [step, setStep] = useState<"upload" | "loading" | "intro" | "question" | "building" | "done">("upload");
  const [resumeText, setResumeText] = useState("");
  const cleanedProfileName = fullName.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const [nameInput, setNameInput] = useState(cleanedProfileName.includes(" ") ? cleanedProfileName : "");
  const [questions, setQuestions] = useState<string[]>([]);
  const [impression, setImpression] = useState("");
  const [coachIntro, setCoachIntro] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [error, setError] = useState("");

  const fetchQuestions = async (text: string) => {
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/career/resume-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setQuestions(data.questions || []);
      setImpression(data.firstImpression || "");
      setCoachIntro(data.coachIntro || "");
      setAnswers(new Array((data.questions || []).length).fill(""));
      setQIdx(0);
      setStep("intro");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("upload");
    }
  };

  const buildResume = async () => {
    setStep("building");
    setError("");
    try {
      const res = await fetch("/api/career/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, questions, answers, fullName: nameInput || fullName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const safeName = (nameInput || fullName).replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_") || "Resume";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_Improved_Resume.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("question");
    }
  };

  const advanceQuestion = () => {
    if (qIdx < questions.length - 1) {
      setQIdx(qIdx + 1);
    } else {
      buildResume();
    }
  };

  // Loading — reading the resume
  if (step === "loading") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "40px 0" }}>
      <div style={{ color: C.teal, fontSize: "15px" }}>Reading your resume…</div>
      <div style={{ color: C.muted, fontSize: "13px" }}>Give me a moment to take a look.</div>
    </div>
  );

  // Building the improved resume
  if (step === "building") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "40px 0" }}>
      <div style={{ color: C.teal, fontSize: "15px" }}>Building your improved resume…</div>
      <div style={{ color: C.muted, fontSize: "13px" }}>This usually takes around 15 seconds.</div>
    </div>
  );

  // Done
  if (step === "done") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0" }}>
      <div style={{ fontSize: "18px", fontWeight: "700", color: C.green }}>Your resume is ready.</div>
      <p style={{ color: C.muted, fontSize: "15px", lineHeight: "1.6", margin: 0 }}>
        Check your downloads folder. The file is in Word format so you can make any final edits yourself before sending it out.
      </p>
      {onNavigate && (
        <div style={{ ...card, borderColor: C.tealBorder, background: "rgba(8,145,178,0.06)", marginTop: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>YOUR NEXT STEP</div>
          <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.5", margin: "0 0 14px" }}>
            With your resume strengthened, the next move is a cover letter that speaks directly to the role you are targeting.
          </p>
          <button style={{ ...btn(), fontSize: "13px", padding: "9px 18px" }} onClick={() => onNavigate("cover-letter")}>
            Go to Cover Letter Builder
          </button>
        </div>
      )}
      <button style={{ ...btn("ghost"), alignSelf: "flex-start" }}
        onClick={() => { setStep("upload"); setResumeText(""); setQuestions([]); setAnswers([]); setQIdx(0); setNameInput(cleanedProfileName.includes(" ") ? cleanedProfileName : ""); }}>
        Review another resume
      </button>
    </div>
  );

  // Intro — first impression and coach intro
  if (step === "intro") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Coach intro */}
      {coachIntro && (
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.7", margin: 0 }}>
          {coachIntro}
        </p>
      )}

      {/* First impression */}
      {impression && (
        <div style={{ ...card, borderLeft: `3px solid ${C.teal}`, background: "rgba(8,145,178,0.06)" }}>
          <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.7", margin: 0 }}>{impression}</p>
        </div>
      )}

      <button style={{ ...btn(), alignSelf: "flex-start", padding: "12px 28px" }}
        onClick={() => setStep("question")}>
        Let&apos;s continue
      </button>
    </div>
  );

  // One question at a time
  if (step === "question" && questions.length > 0) {
    const isLast = qIdx === questions.length - 1;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Progress */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: i === qIdx ? "24px" : "8px", height: "8px", borderRadius: "4px",
              background: i < qIdx ? C.green : i === qIdx ? C.teal : C.border,
              transition: "all 0.2s",
            }} />
          ))}
          <span style={{ fontSize: "12px", color: C.muted, marginLeft: "8px" }}>
            Question {qIdx + 1} of {questions.length}
          </span>
        </div>

        {/* Question */}
        <div style={{ ...card, borderLeft: `3px solid ${C.tealBorder}` }}>
          <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.7", margin: 0, whiteSpace: "pre-line" }}>
            {questions[qIdx]}
          </p>
        </div>

        {/* Answer */}
        <div>
          <span style={{ ...label, marginBottom: "10px", display: "block" }}>Your answer</span>
          <textarea
            rows={4}
            style={textarea(4)}
            placeholder="Take your time. Even rough notes are helpful."
            value={answers[qIdx] || ""}
            onChange={e => setAnswers(prev => { const a = [...prev]; a[qIdx] = e.target.value; return a; })}
          />
        </div>

        {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button style={{ ...btn(), padding: "12px 28px" }} onClick={advanceQuestion}>
            {isLast ? "Build my improved resume" : "Next question"}
          </button>
          <button style={{ ...btn("ghost") }} onClick={advanceQuestion}>
            Skip this one
          </button>
          {qIdx > 0 && (
            <button style={btn("ghost")} onClick={() => setQIdx(qIdx - 1)}>
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Upload screen
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <p style={{ fontSize: "16px", color: C.text, lineHeight: "1.7", margin: 0 }}>
          Upload your current resume and I will review it with you.
        </p>
        <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.7", margin: 0 }}>
          I will ask a few short questions to better understand your experience, your achievements, and the kind of role you are targeting. From there I will help you strengthen your resume and send back an improved version in Word format so you can make any final edits yourself.
        </p>
      </div>

      <FileUpload label="Your current resume" onParsed={(text) => setResumeText(text)} />

      <div>
        <span style={{ ...label, marginBottom: "8px", display: "block" }}>Your full name (used on the improved resume)</span>
        <input
          type="text"
          style={input}
          placeholder="e.g. Sarah Johnson"
          value={nameInput}
          onChange={e => setNameInput(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))}
        />
      </div>

      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", lineHeight: "1.5", margin: 0 }}>
        Your resume is only used to generate your improved version. Nothing is stored or shared.
      </p>

      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}

      <button style={{ ...btn(), alignSelf: "flex-start", padding: "12px 28px" }}
        disabled={!resumeText} onClick={() => fetchQuestions(resumeText)}>
        Review my resume
      </button>
    </div>
  );
}

// ── Cover Letter Builder ────────────────────────────────────────────────────

function CoverLetterTool({ fullName, onNavigate }: { fullName: string; onNavigate?: (tool: Tool) => void }) {
  const [step, setStep] = useState<"setup" | "questions" | "loading" | "done">("setup");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [jdSummary, setJdSummary] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");

  const fetchQuestions = async () => {
    setStep("loading");
    setLoadingMsg("Reviewing resume and job description…");
    setError("");
    try {
      const res = await fetch("/api/career/cover-letter-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setQuestions(data.questions);
      setJdSummary(data.jdSummary || "");
      setAnswers(new Array(data.questions.length).fill(""));
      setStep("questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("setup");
    }
  };

  const downloadLetter = async () => {
    setStep("loading");
    setLoadingMsg("Writing your cover letter…");
    setError("");
    try {
      const res = await fetch("/api/career/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText, questions, answers, fullName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(fullName || "CoverLetter").replace(/\s+/g, "_")}_Cover_Letter.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
      setStep("questions");
    }
  };

  if (step === "loading") return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ color: C.teal, fontSize: "15px", marginBottom: "8px" }}>{loadingMsg}</div>
    </div>
  );

  if (step === "done") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "40px 0" }}>
      <div style={{ fontSize: "18px", fontWeight: "700", color: C.green }}>Cover letter downloaded</div>
      <p style={{ color: C.muted, fontSize: "14px" }}>Your personalised cover letter is in your downloads folder.</p>
      {onNavigate && (
        <div style={{ ...card, borderColor: C.tealBorder, background: "rgba(8,145,178,0.06)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>YOUR NEXT STEP</div>
          <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.5", margin: "0 0 14px" }}>
            Before you apply, run the job description through the JD Analyzer to make sure your resume is hitting the right keywords.
          </p>
          <button style={{ ...btn(), fontSize: "13px", padding: "9px 18px" }} onClick={() => onNavigate("jd")}>
            Go to JD Analyzer
          </button>
        </div>
      )}
      <button style={{ ...btn("ghost"), alignSelf: "flex-start" }} onClick={() => { setStep("setup"); setResumeText(""); setJdText(""); setQuestions([]); setAnswers([]); }}>
        Write another letter
      </button>
    </div>
  );

  if (step === "questions") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {jdSummary && (
        <div style={{ ...card, borderColor: C.tealBorder, background: C.tealBg }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>ROLE SUMMARY</div>
          <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.5", margin: 0 }}>{jdSummary}</p>
        </div>
      )}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "16px" }}>A FEW QUICK QUESTIONS</div>
        <CoachingQA questions={questions} answers={answers}
          onChange={(i, v) => setAnswers(prev => { const a = [...prev]; a[i] = v; return a; })} />
      </div>
      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}
      <div style={{ display: "flex", gap: "12px" }}>
        <button style={btn()} onClick={downloadLetter}>Download cover letter (.docx)</button>
        <button style={btn("ghost")} onClick={() => setStep("setup")}>Back</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.6", margin: 0 }}>
        Upload your resume and paste the job description. I will ask a couple of quick questions so the letter speaks directly to that role.
      </p>
      <FileUpload label="Your resume" onParsed={(text) => setResumeText(text)} />
      <div>
        <span style={label}>Job description</span>
        <textarea rows={8} style={textarea(8)} placeholder="Paste the full job description here…"
          value={jdText} onChange={e => setJdText(e.target.value)} />
      </div>
      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}
      <button style={btn()} disabled={!resumeText || jdText.trim().length < 50} onClick={fetchQuestions}>
        Next
      </button>
    </div>
  );
}

// ── JD Analyzer ─────────────────────────────────────────────────────────────

function JDAnalyzerTool() {
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | {
    jobTitle: string; company: string; atsScore: number | null;
    rows: { requirement: string; candidateMatch: string; strength: "strong" | "partial" | "gap" }[];
    mustHaves: string[]; missingKeywords: string[]; keywordSuggestions: string[];
    verdict: string; topTip: string;
  }>(null);

  const analyse = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/career/jd-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, resumeText }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setResult(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const strengthColour = (s: "strong" | "partial" | "gap") =>
    s === "strong" ? C.green : s === "partial" ? C.amber : C.red;

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ color: C.teal, fontSize: "15px" }}>Analysing job description…</div>
    </div>
  );

  if (result) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: C.text }}>{result.jobTitle}</div>
          <div style={{ fontSize: "13px", color: C.muted }}>{result.company}</div>
        </div>
        {result.atsScore !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ScoreRing score={result.atsScore} size={64} />
            <div>
              <div style={{ fontSize: "11px", color: C.muted, fontFamily: "JetBrains Mono, monospace" }}>ATS MATCH</div>
              <div style={{ fontSize: "13px", color: C.muted }}>keyword score</div>
            </div>
          </div>
        )}
      </div>

      {/* Two-column match table */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "16px" }}>REQUIREMENTS vs YOUR PROFILE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: "0", borderRadius: "8px", overflow: "hidden", border: `1px solid ${C.border}` }}>
          {/* Header */}
          <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace" }}>THEY WANT</div>
          <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", borderLeft: `1px solid ${C.border}` }}>YOU BRING</div>
          <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", textAlign: "center", borderLeft: `1px solid ${C.border}` }}>FIT</div>
          {/* Rows */}
          {result.rows.map((row, i) => (
            <>
              <div key={`r-${i}`} style={{ padding: "12px 14px", fontSize: "13px", color: C.text, lineHeight: "1.4", borderTop: `1px solid ${C.border}` }}>{row.requirement}</div>
              <div key={`c-${i}`} style={{ padding: "12px 14px", fontSize: "13px", color: C.muted, lineHeight: "1.4", borderTop: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}` }}>{row.candidateMatch}</div>
              <div key={`s-${i}`} style={{ padding: "12px 14px", fontSize: "12px", fontWeight: "700", color: strengthColour(row.strength), textAlign: "center", borderTop: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}`, textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.strength}</div>
            </>
          ))}
        </div>
      </div>

      {/* Must haves + verdict */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>MUST HAVES</div>
          {result.mustHaves.map((m, i) => (
            <div key={i} style={{ fontSize: "13px", color: C.text, marginBottom: "8px", paddingLeft: "12px", borderLeft: `2px solid ${C.amber}` }}>{m}</div>
          ))}
        </div>
        <div style={{ ...card, borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>TOP TIP</div>
          <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.5", margin: "0 0 12px" }}>{result.topTip}</p>
        </div>
      </div>

      {/* Missing keywords */}
      {result.missingKeywords && result.missingKeywords.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.red, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>MISSING ATS KEYWORDS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            {result.missingKeywords.map((k, i) => (
              <span key={i} style={{ background: C.redBg, border: "1px solid rgba(239,68,68,0.3)", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", color: C.red, fontFamily: "JetBrains Mono, monospace" }}>{k}</span>
            ))}
          </div>
          {result.keywordSuggestions && result.keywordSuggestions.length > 0 && (
            <>
              <div style={{ fontSize: "11px", fontWeight: "700", color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>ADD THESE PHRASES TO YOUR RESUME</div>
              {result.keywordSuggestions.map((s, i) => (
                <div key={i} style={{ fontSize: "13px", color: C.text, marginBottom: "6px", fontFamily: "JetBrains Mono, monospace" }}>&quot;{s}&quot;</div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Verdict */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>VERDICT</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.verdict}</p>
      </div>

      <button style={btn("ghost")} onClick={() => { setResult(null); setJdText(""); setResumeText(""); }}>
        Analyse another role
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.6", margin: 0 }}>
        Paste the job description. If you upload your resume as well, I will score how well your keywords match and show you exactly what is missing.
      </p>
      <div>
        <span style={label}>Job description</span>
        <textarea rows={10} style={textarea(10)} placeholder="Paste the full job description here…"
          value={jdText} onChange={e => setJdText(e.target.value)} />
      </div>
      <FileUpload label="Your resume (optional, used for ATS score)" onParsed={(text) => setResumeText(text)} />
      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}
      <button style={btn()} disabled={jdText.trim().length < 50} onClick={analyse}>
        Run the analysis
      </button>
    </div>
  );
}

// ── Interview Prep ──────────────────────────────────────────────────────────

interface InterviewQuestion {
  id: string;
  question: string;
  category: "behavioral" | "technical" | "stakeholder" | "process";
  hint: string;
}

interface StarScore { score: number; feedback: string; }
interface InterviewFeedback {
  overallScore: number;
  star: { situation: StarScore; task: StarScore; action: StarScore; result: StarScore };
  delivery: { pacing: { score: number; wpm: number; feedback: string }; confidence: { score: number; feedback: string } };
  topStrength: string; topImprovement: string; missingElement: string;
  suggestedRewrite: string; interviewerPerspective: string;
}

function InterviewTool({ onNavigate }: { onNavigate?: (tool: Tool) => void }) {
  const [step, setStep] = useState<"setup" | "generating" | "practice" | "answer-review">("setup");
  const [jdText, setJdText] = useState("");
  const [company, setCompany] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [roleContext, setRoleContext] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [feedbacks, setFeedbacks] = useState<(InterviewFeedback | null)[]>([]);
  const [error, setError] = useState("");

  // Recording state
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [analysing, setAnalysing] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const generateQuestions = async () => {
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/career/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, company, resumeText }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setQuestions(data.questions);
      setRoleContext(data.roleContext || "");
      setFeedbacks(new Array(data.questions.length).fill(null));
      setCurrentQ(0);
      setStep("practice");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("setup");
    }
  };

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition not supported in this browser. Try Chrome."); return; }
    const rec = new (SR as new () => any)();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";
    let full = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) full += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setTranscript(full + interim);
    };
    rec.start();
    recognitionRef.current = rec;
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500);
    setRecording(true);
    setTranscript("");
    setDuration(0);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setDuration(secs);
    setRecording(false);
  };

  const submitAnswer = async () => {
    if (!transcript.trim() || transcript.trim().split(/\s+/).length < 5) {
      setError("That answer needs a bit more detail. Give it another try.");
      return;
    }
    stopRecording();
    setAnalysing(true);
    setError("");
    const wc = transcript.trim().split(/\s+/).length;
    setWordCount(wc);
    const q = questions[currentQ];
    try {
      const res = await fetch("/api/career/interview-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.question, transcript, category: q.category, duration, wordCount: wc }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      const updated = [...feedbacks];
      updated[currentQ] = data.feedback;
      setFeedbacks(updated);
      setStep("answer-review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysing(false);
    }
  };

  const catColour = (cat: string) => {
    const m: Record<string, string> = { behavioral: "#818cf8", technical: C.teal, stakeholder: C.amber, process: C.green };
    return m[cat] || C.muted;
  };

  if (step === "generating") return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ color: C.teal, fontSize: "15px" }}>Generating your interview questions…</div>
    </div>
  );

  if (step === "answer-review") {
    const fb = feedbacks[currentQ];
    if (!fb) return null;
    const q = questions[currentQ];
    const isLast = currentQ === questions.length - 1;
    const done = feedbacks.every(f => f !== null);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <ScoreRing score={fb.overallScore} size={64} />
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: C.text }}>Q{currentQ + 1} Feedback</div>
            <div style={{ fontSize: "13px", color: catColour(q.category) }}>{q.category}</div>
          </div>
        </div>

        {/* STAR breakdown */}
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "16px" }}>STAR BREAKDOWN</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {(["situation", "task", "action", "result"] as const).map(key => (
              <div key={key} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <ScoreRing score={fb.star[key].score} size={40} />
                  <span style={{ fontSize: "12px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase" }}>{key}</span>
                </div>
                <p style={{ fontSize: "13px", color: C.text, lineHeight: "1.4", margin: 0 }}>{fb.star[key].feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key takeaways */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ ...card, borderColor: "rgba(110,231,183,0.2)", background: C.greenBg }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>TOP STRENGTH</div>
            <p style={{ fontSize: "13px", color: C.text, lineHeight: "1.4", margin: 0 }}>{fb.topStrength}</p>
          </div>
          <div style={{ ...card, borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>TOP FIX</div>
            <p style={{ fontSize: "13px", color: C.text, lineHeight: "1.4", margin: 0 }}>{fb.topImprovement}</p>
          </div>
        </div>

        {/* Hint + rewrite */}
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>WHAT WAS MISSING</div>
          <p style={{ fontSize: "13px", color: C.text, lineHeight: "1.5", marginBottom: "16px" }}>{fb.missingElement}</p>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>HOW TO SAY IT BETTER</div>
          <p style={{ fontSize: "13px", color: C.teal, lineHeight: "1.5", background: C.tealBg, padding: "12px", borderRadius: "8px", margin: 0, fontStyle: "italic" }}>&ldquo;{fb.suggestedRewrite}&rdquo;</p>
        </div>

        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>INTERVIEWER&apos;S PERSPECTIVE</div>
          <p style={{ fontSize: "13px", color: C.text, lineHeight: "1.5", margin: 0 }}>{fb.interviewerPerspective}</p>
        </div>

        {/* Hint */}
        <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace" }}>WHAT A GOOD ANSWER LOOKS LIKE: </span>
          <span style={{ fontSize: "13px", color: C.muted }}>{q.hint}</span>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          {!isLast && (
            <button style={btn()} onClick={() => { setCurrentQ(currentQ + 1); setTranscript(""); setStep("practice"); }}>
              Next question
            </button>
          )}
          {done && (
            <>
              <button style={btn()} onClick={() => { setStep("setup"); setQuestions([]); setFeedbacks([]); setJdText(""); setCompany(""); setTranscript(""); }}>
                Start new session
              </button>
              {onNavigate && (
                <button style={{ ...btn("ghost"), fontSize: "13px" }} onClick={() => onNavigate("salary")}>
                  Next: Salary Negotiation
                </button>
              )}
            </>
          )}
          <button style={btn("ghost")} onClick={() => { setTranscript(""); setStep("practice"); }}>
            Try this one again
          </button>
        </div>
      </div>
    );
  }

  if (step === "practice") {
    const q = questions[currentQ];
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {roleContext && (
          <div style={{ fontSize: "13px", color: C.muted, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
            {roleContext}
          </div>
        )}

        {/* Progress */}
        <div style={{ display: "flex", gap: "8px" }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              height: "4px", flex: 1, borderRadius: "2px",
              background: feedbacks[i] ? C.green : i === currentQ ? C.teal : C.border,
            }} />
          ))}
        </div>
        <div style={{ fontSize: "12px", color: C.muted }}>Question {currentQ + 1} of {questions.length}</div>

        {/* Question */}
        <div style={{ ...card, borderColor: `${catColour(q.category)}33`, background: `${catColour(q.category)}0d` }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: catColour(q.category), fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>
            {q.category.toUpperCase()}
          </div>
          <p style={{ fontSize: "18px", color: C.text, lineHeight: "1.5", margin: 0, fontWeight: "600" }}>{q.question}</p>
        </div>

        {/* Recording controls */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                padding: "12px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: "700", cursor: "pointer",
                background: recording ? C.redBg : C.tealBg,
                border: `1px solid ${recording ? "rgba(239,68,68,0.4)" : C.tealBorder}`,
                color: recording ? C.red : C.teal,
                display: "flex", alignItems: "center", gap: "8px",
              }}>
              {recording ? <><span style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.red, display: "inline-block" }} /> Stop recording</> : "● Start recording"}
            </button>
            {recording && (
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "14px", color: C.red }}>
                {mins > 0 ? `${mins}m ` : ""}{secs}s
              </span>
            )}
          </div>

          {transcript && (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "14px", fontSize: "14px", color: C.text, lineHeight: "1.6", minHeight: "80px", maxHeight: "200px", overflowY: "auto" }}>
              {transcript}
            </div>
          )}
        </div>

        {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "12px" }}>
          {analysing ? (
            <div style={{ color: C.muted, fontSize: "14px" }}>Analysing your answer…</div>
          ) : (
            <button style={btn()} disabled={!transcript.trim()} onClick={submitAnswer}>
              Get my feedback
            </button>
          )}
          {currentQ > 0 && feedbacks[currentQ - 1] && (
            <button style={btn("ghost")} onClick={() => { setCurrentQ(currentQ - 1); setStep("answer-review"); }}>
              View previous
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.6", margin: 0 }}>
        Paste the job description below. I will put together questions based on the role and give you feedback on each answer you record.
      </p>
      <div>
        <span style={label}>Job description</span>
        <textarea rows={8} style={textarea(8)} placeholder="Paste the full job description here…"
          value={jdText} onChange={e => setJdText(e.target.value)} />
      </div>
      <div>
        <span style={label}>Company name (optional)</span>
        <input type="text" style={input} placeholder="e.g. ANZ Bank, Telstra, KPMG"
          value={company} onChange={e => setCompany(e.target.value)} />
      </div>
      <FileUpload label="Your resume (optional — personalises questions)" onParsed={(text) => setResumeText(text)} />
      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}
      <button style={btn()} disabled={jdText.trim().length < 50} onClick={generateQuestions}>
        Generate my interview questions
      </button>
    </div>
  );
}

// ── Salary Negotiation ──────────────────────────────────────────────────────

function SalaryTool() {
  const [form, setForm] = useState({ offerAmount: "", currency: "$", jobTitle: "", yearsExp: "", location: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | {
    offerAssessment: string;
    negotiationStrategies: { strategy: string; script: string; when: string }[];
    counterOfferRange: string;
    beyondSalary: string[];
    redFlags: string[];
    bottomLine: string;
  }>(null);

  const analyse = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/career/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ color: C.teal, fontSize: "15px" }}>Analysing your offer…</div>
    </div>
  );

  if (result) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Assessment */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>OFFER ASSESSMENT</div>
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.offerAssessment}</p>
      </div>

      {/* Counter offer range */}
      <div style={{ ...card, borderColor: C.tealBorder, background: C.tealBg }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>COUNTER OFFER RANGE</div>
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.5", margin: 0 }}>{result.counterOfferRange}</p>
      </div>

      {/* Strategies */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "16px" }}>NEGOTIATION SCRIPTS</div>
        {result.negotiationStrategies.map((s, i) => (
          <div key={i} style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: i < result.negotiationStrategies.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "8px" }}>{s.strategy}</div>
            <div style={{ background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "8px" }}>
              <p style={{ fontSize: "14px", color: C.teal, margin: 0, lineHeight: "1.6", fontStyle: "italic" }}>&ldquo;{s.script}&rdquo;</p>
            </div>
            <p style={{ fontSize: "12px", color: C.muted, margin: 0 }}>{s.when}</p>
          </div>
        ))}
      </div>

      {/* Beyond salary + red flags */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={card}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>ALSO NEGOTIATE</div>
          {result.beyondSalary.map((b, i) => (
            <div key={i} style={{ fontSize: "13px", color: C.text, marginBottom: "8px", paddingLeft: "12px", borderLeft: `2px solid ${C.green}` }}>{b}</div>
          ))}
        </div>
        {result.redFlags.length > 0 && (
          <div style={{ ...card, borderColor: "rgba(239,68,68,0.2)", background: C.redBg }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.red, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>RED FLAGS</div>
            {result.redFlags.map((r, i) => (
              <div key={i} style={{ fontSize: "13px", color: C.text, marginBottom: "8px", paddingLeft: "12px", borderLeft: `2px solid ${C.red}` }}>{r}</div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom line */}
      <div style={{ ...card, borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>BOTTOM LINE</div>
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.5", margin: 0 }}>{result.bottomLine}</p>
      </div>

      <button style={btn("ghost")} onClick={() => { setResult(null); setForm({ offerAmount: "", currency: "$", jobTitle: "", yearsExp: "", location: "", notes: "" }); }}>
        Analyse another offer
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.6", margin: 0 }}>
        Enter your offer details and I will give you an honest read on it, plus scripts you can use in the actual conversation.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "12px" }}>
        <div>
          <span style={label}>Currency</span>
          <select style={{ ...input, padding: "12px 10px" }} value={form.currency}
            onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
            <option>$</option><option>£</option><option>€</option><option>A$</option><option>NZ$</option>
          </select>
        </div>
        <div>
          <span style={label}>Offer amount (annual)</span>
          <input type="number" style={input} placeholder="e.g. 95000"
            value={form.offerAmount} onChange={e => setForm(p => ({ ...p, offerAmount: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <span style={label}>Job title</span>
          <input type="text" style={input} placeholder="e.g. Senior Business Analyst"
            value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} />
        </div>
        <div>
          <span style={label}>Years of experience</span>
          <input type="text" style={input} placeholder="e.g. 5"
            value={form.yearsExp} onChange={e => setForm(p => ({ ...p, yearsExp: e.target.value }))} />
        </div>
      </div>
      <div>
        <span style={label}>Location / market</span>
        <input type="text" style={input} placeholder="e.g. Sydney, London, remote"
          value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
      </div>
      <div>
        <span style={label}>Additional context (optional)</span>
        <textarea rows={3} style={textarea(3)}
          placeholder="e.g. competing offer, notice period, relocation, contract vs permanent…"
          value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      </div>
      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}
      <button style={btn()} disabled={!form.offerAmount} onClick={analyse}>
        Analyse my offer
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

const JOURNEY = [
  {
    step: 1,
    label: "Find your direction",
    tools: [
      { id: "advisor" as Tool, label: "Career Strategy", desc: "Find your BA track" },
    ],
  },
  {
    step: 2,
    label: "Strengthen your profile",
    tools: [
      { id: "resume" as Tool, label: "Resume Improvement", desc: "Upload and strengthen" },
      { id: "cover-letter" as Tool, label: "Cover Letter", desc: "Written for the role" },
      { id: "jd" as Tool, label: "JD Analyzer", desc: "See how well you match" },
    ],
  },
  {
    step: 3,
    label: "Prepare for interviews",
    tools: [
      { id: "interview" as Tool, label: "Interview Prep", desc: "Practice answering out loud" },
    ],
  },
  {
    step: 4,
    label: "Handle the offer",
    tools: [
      { id: "salary" as Tool, label: "Salary Negotiation", desc: "Offer analysis and scripts" },
    ],
  },
];

const TOOL_TITLES: Record<string, string> = {
  home: "Career Suite",
  advisor: "Career Strategy Advisor",
  resume: "Resume Improvement",
  "cover-letter": "Cover Letter Builder",
  jd: "JD Analyzer",
  interview: "Interview Prep",
  salary: "Salary Negotiation",
};

export default function CareerClient({ fullName }: Props) {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<Tool>("home");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
          ← Dashboard
        </button>
        <span style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>Career Suite</span>
        <span style={{ fontSize: "13px", color: C.muted }}>{fullName}</span>
      </div>

      <div style={{ display: "flex", maxWidth: "1140px", margin: "0 auto", padding: "32px 24px", gap: "28px" }}>
        {/* Sidebar — journey structure */}
        <div style={{ width: "210px", flexShrink: 0 }}>
          {/* Alex mini block */}
          <div style={{ ...card, padding: "14px 16px", marginBottom: "20px", cursor: "pointer", borderColor: activeTool === "home" ? C.tealBorder : C.border, background: activeTool === "home" ? C.tealBg : C.panel }}
            onClick={() => setActiveTool("home")}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #0891b2, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "white", flexShrink: 0 }}>A</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: activeTool === "home" ? C.teal : C.text }}>Career Suite</div>
                <div style={{ fontSize: "11px", color: C.muted }}>Overview</div>
              </div>
            </div>
          </div>

          {/* Journey steps */}
          {JOURNEY.map(group => (
            <div key={group.step} style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", color: C.muted, flexShrink: 0 }}>{group.step}</div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>{group.label}</div>
              </div>
              {group.tools.map(t => (
                <button key={t.id} onClick={() => setActiveTool(t.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "9px 12px 9px 28px", borderRadius: "7px", marginBottom: "3px", cursor: "pointer",
                    background: activeTool === t.id ? C.tealBg : "transparent",
                    border: `1px solid ${activeTool === t.id ? C.tealBorder : "transparent"}`,
                    color: activeTool === t.id ? C.teal : C.muted,
                    transition: "all 0.12s",
                    position: "relative",
                  }}>
                  {activeTool === t.id && (
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: C.teal, fontSize: "10px" }}>▶</span>
                  )}
                  <div style={{ fontSize: "13px", fontWeight: "600" }}>{t.label}</div>
                  <div style={{ fontSize: "11px", marginTop: "1px", opacity: 0.7 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTool !== "home" && (
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "white", marginBottom: "24px" }}>
              {TOOL_TITLES[activeTool]}
            </h1>
          )}

          {/* Home landing */}
          {activeTool === "home" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* Alex intro */}
              <div style={{ ...card, borderColor: C.tealBorder, background: "rgba(8,145,178,0.06)", padding: "28px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #0891b2, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", fontWeight: "700", color: "white", flexShrink: 0 }}>A</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "2px" }}>Alex</div>
                    <div style={{ fontSize: "11px", color: C.muted, marginBottom: "14px" }}>Career Advisor</div>
                    <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.7", margin: "0 0 8px" }}>
                      I will help you move from where you are today to a BA role that fits how you work.
                    </p>
                    <p style={{ fontSize: "14px", color: C.muted, lineHeight: "1.7", margin: 0 }}>
                      Each tool here tackles a different part of that process. You do not need to use everything at once. Start where you are.
                    </p>
                  </div>
                </div>
              </div>

              {/* Intro text */}
              <div>
                <h1 style={{ fontSize: "26px", fontWeight: "700", color: "white", margin: "0 0 12px" }}>Career Suite</h1>
                <p style={{ fontSize: "16px", color: C.muted, lineHeight: "1.7", margin: "0 0 8px" }}>
                  This section helps you move from learning Business Analysis to landing a BA role.
                </p>
                <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.7", margin: "0 0 6px" }}>
                  You can improve your resume, prepare for interviews, analyse job descriptions, and practice real conversations.
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", lineHeight: "1.5", margin: 0 }}>
                  Most people begin with Career Strategy or Resume Improvement.
                </p>
              </div>

              {/* Journey step cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {JOURNEY.map(group => (
                  <div key={group.step} style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: C.tealBg, border: `1px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: C.teal, flexShrink: 0 }}>{group.step}</div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>{group.label}</div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {group.tools.map(t => (
                        <button key={t.id} onClick={() => setActiveTool(t.id)}
                          style={{ ...btn(), fontSize: "13px", padding: "8px 16px" }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTool === "advisor" && <AdvisorTool onNavigate={setActiveTool} />}
          {activeTool === "resume" && <ResumeTool fullName={fullName} onNavigate={setActiveTool} />}
          {activeTool === "cover-letter" && <CoverLetterTool fullName={fullName} onNavigate={setActiveTool} />}
          {activeTool === "jd" && <JDAnalyzerTool />}
          {activeTool === "interview" && <InterviewTool onNavigate={setActiveTool} />}
          {activeTool === "salary" && <SalaryTool />}
        </div>
      </div>
    </div>
  );
}
