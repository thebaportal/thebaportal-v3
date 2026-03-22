"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, BookOpen, TrendingUp, GraduationCap,
  Target, Mic, BriefcaseBusiness, Trophy, Settings,
} from "lucide-react";

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

interface FlowQuestion {
  question: string;
  options: string[];
  optionValues?: string[]; // stable keys for branchMap lookup (set only on branching Q1)
}

interface FlowConfig {
  id: string;
  title: string;
  subtitle: string;
  questions: FlowQuestion[];
  branchMap?: Record<string, FlowQuestion>; // branchMap[q1Value] overrides Q2
  loadingSteps: string[];
}

const FLOW_CONFIG: Record<string, FlowConfig> = {
  new_to_ba: {
    id: "new_to_ba",
    title: "Let's find your BA direction",
    subtitle: "Four questions to work out which path fits how you think.",
    loadingSteps: [
      "Reading how you approach problems",
      "Matching to BA paths",
      "Working out your best fit",
      "Putting your recommendation together",
    ],
    questions: [
      {
        question: "How do you naturally approach a problem?",
        options: [
          "I want to understand who is affected and what they actually need",
          "I want to find the data and let the facts tell the story",
          "I want to map out how the current process works and where it breaks",
          "I want to understand the technology involved and how a solution would work",
        ],
      },
      {
        question: "Which sounds most like you on a good day at work?",
        options: [
          "In a room with different people, helping them reach a decision",
          "Deep in a document or spreadsheet, making sense of complex information",
          "Sketching out how something works end to end and finding the gaps",
          "Figuring out what a product or feature should do for real users",
        ],
      },
      {
        question: "What pulls you toward Business Analysis most?",
        options: [
          "The bridge between business problems and the technology that solves them",
          "Helping shape products that real people use every day",
          "Working on how organisations change and improve at a bigger level",
          "A role that is both analytical and people-focused at the same time",
        ],
      },
      {
        question: "How ready are you to actually start?",
        options: [
          "I am ready to start now and can commit time weekly",
          "I am interested but still exploring whether BA is right for me",
          "I want to understand it fully before I do anything",
          "I am not sure I am ready yet",
        ],
      },
    ],
  },

  transition_to_ba: {
    id: "transition_to_ba",
    title: "Let's map your experience into BA",
    subtitle: "You have real background. Four questions to find where you fit.",
    loadingSteps: [
      "Looking at your background",
      "Identifying your transferable strengths",
      "Matching you to a BA role type",
      "Building your positioning advice",
    ],
    questions: [
      {
        question: "What best describes your professional background?",
        options: [
          "Technology or IT — systems, software, data, or engineering",
          "Business or operations — finance, supply chain, project management, HR, or similar",
          "Customer or product-facing — marketing, design, customer success, or similar",
          "Mixed or non-traditional background",
        ],
      },
      {
        question: "In your previous work, which of these did you actually do?",
        options: [
          "Regularly spoke to stakeholders to understand what they needed and turned it into something actionable",
          "Documented how processes worked, identified what was broken, and helped improve it",
          "Worked with data, reporting, or analysis to help the business make better decisions",
          "Sat between a technical team and the rest of the business and kept both sides aligned",
        ],
      },
      {
        question: "How clearly can you explain your experience as BA work?",
        options: [
          "I can clearly explain it and map it to BA responsibilities already",
          "I have the experience but I struggle to articulate it in BA language",
          "I am not sure which parts of my work actually count as BA",
          "I have not thought about it this way before",
        ],
      },
      {
        question: "What does your current evidence look like?",
        options: [
          "I have real examples I could use in interviews — I just have not framed them as BA work yet",
          "I have relevant experience but it is buried in job titles that do not say analyst",
          "I do not have much concrete evidence yet — I need to build some before I apply",
          "I have done study or certification but have not applied it in a real setting",
        ],
      },
    ],
  },

  feeling_stuck: {
    id: "feeling_stuck",
    title: "Let's figure out what is blocking you",
    subtitle: "Four questions to diagnose the real issue and find your next move.",
    loadingSteps: [
      "Reading through your answers",
      "Identifying the main blocker",
      "Working out the right next move",
      "Putting your diagnosis together",
    ],
    questions: [
      {
        question: "When you think about your BA career right now, which feels most true?",
        options: [
          "I am not sure which direction or type of BA role is actually right for me",
          "I know what I want but I am not getting responses or interview invitations",
          "I am getting interviews but not converting them into offers",
          "I know what I should be doing but I keep losing momentum and putting it off",
        ],
      },
      {
        question: "If you had to pick ONE main thing holding you back right now, what is it?",
        options: [
          "I do not have enough real examples or evidence to prove I can do BA work",
          "My resume or LinkedIn is not positioning me well enough",
          "My interview performance lets me down once I am in the room",
          "I do not feel ready — something is stopping me from moving forward",
        ],
      },
      {
        question: "How targeted is your job search right now?",
        options: [
          "I have a clear picture of what I want and I am applying selectively",
          "I am applying to everything BA-related and hoping something lands",
          "I have not started applying yet — I am still building my foundation",
          "I have paused because something does not feel right",
        ],
      },
      {
        question: "What have you already tried that has not worked?",
        options: [
          "I updated my resume but I am still not getting responses",
          "I have been applying for months with very few calls back",
          "I have had interviews but keep getting rejected at the final stage",
          "I have not properly tried yet — I feel stuck before I have even started",
        ],
      },
    ],
  },

  move_to_senior_role: {
    id: "move_to_senior_role",
    title: "Let's map your path to a senior BA role",
    subtitle: "Four questions to work out where you are, what is holding you back, and what your next step looks like.",
    loadingSteps: [
      "Looking at where you are now",
      "Reading your specific situation",
      "Mapping the gap to the next level",
      "Working out your next move",
    ],
    questions: [
      {
        question: "Where are you right now in your BA career?",
        options: [
          "Junior or mid-level BA, ready to take on more but not sure how to prove it",
          "Experienced BA who keeps getting overlooked for senior roles",
          "Contracting or freelancing and want to move into a higher-value tier",
          "Recently promoted or stepping into a lead BA role for the first time",
        ],
        optionValues: ["junior_mid", "overlooked_senior", "contractor_tier", "new_lead"],
      },
      {
        // Fallback Q2 — overridden by branchMap in practice
        question: "What does your current situation look like?",
        options: [
          "I have clear strengths but I am not sure how to demonstrate them",
          "I know what I want but I am not sure how to get there",
          "I have tried to move up but keep hitting the same wall",
          "I am not sure what the next level actually requires",
        ],
      },
      {
        question: "What do you need most right now to move up with confidence?",
        options: [
          "Clear proof that I am operating at the next level",
          "Stronger positioning and visibility with the right people",
          "Better understanding of what the next level actually requires",
          "A practical plan to make the move happen",
        ],
      },
      {
        question: "What kind of move are you actually aiming for?",
        options: [
          "A formal title and pay increase where I am",
          "A move to a new employer at a more senior level",
          "A lead or principal BA role with broader responsibility",
          "Higher value consulting, contracting, or advisory work",
        ],
      },
    ],
    branchMap: {
      junior_mid: {
        question: "What is the main gap between where you are now and being taken seriously for more?",
        options: [
          "I have not had the chance to lead anything — I am always in a support role",
          "I do not have a portfolio that proves I can handle senior-level responsibilities",
          "I do not know how to have the conversation about moving up with my manager",
          "I am not sure what a senior BA actually looks like in my organisation",
        ],
      },
      overlooked_senior: {
        question: "Why do you think you keep getting passed over for more senior opportunities?",
        options: [
          "I do not have enough visibility — decision-makers do not know what I actually deliver",
          "I am seen as a reliable deliverer but not as someone who shapes strategy or direction",
          "I cannot clearly articulate what makes me different from other experienced BAs",
          "The opportunity does not exist where I am — I need to move to a different employer",
        ],
      },
      contractor_tier: {
        question: "What is stopping you from commanding a higher rate or landing better-paying clients?",
        options: [
          "I have not positioned myself clearly enough in a specific niche or domain",
          "My rate feels anchored to what I earned as a permanent employee",
          "I find it hard to articulate the premium value I bring versus a cheaper option",
          "I do not have strong enough case studies or a track record that speaks for itself",
        ],
      },
      new_lead: {
        question: "What is the biggest challenge you are facing in the lead role so far?",
        options: [
          "Letting go of delivery work and trusting others to execute",
          "Getting influence and buy-in without direct authority over the team",
          "Shifting from managing the work to shaping its direction and scope",
          "Being taken seriously as a leader when people still see me as the BA who got promoted",
        ],
      },
    },
  },
};

// CTA routing from result screen
const CTA_ROUTES: Record<string, { label: string; href: string }> = {
  resume:    { label: "Go to Resume Improvement", href: "/career?cat=land&intent=improve_resume" },
  portfolio: { label: "Start a BA Challenge", href: "/scenarios" },
  jd:        { label: "Analyse a Job Description", href: "/career?cat=land&intent=analyze_job_description" },
  interview: { label: "Go to Interview Prep", href: "/career?cat=grow&intent=interview_preparation" },
  advisor:   { label: "Explore your direction", href: "/career?cat=explore" },
};

// Animated loading steps
function AdvisorLoading({ onAnimComplete, steps }: { onAnimComplete: () => void; steps: string[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = prev + 1;
        if (next >= steps.length - 1) {
          clearInterval(timer);
          setTimeout(onAnimComplete, 700);
          return steps.length - 1;
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [onAnimComplete, steps.length]);

  return (
    <div style={{ padding: "48px 0", display: "flex", flexDirection: "column", gap: "32px" }}>
      <p style={{ fontSize: "15px", color: C.muted, margin: 0 }}>Working through your answers…</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {steps.map((s, i) => (
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

// ── Result type definitions ──────────────────────────────────────────────────

type NewToBaResult = {
  flowId: "new_to_ba";
  recommendedTrack: string;
  whyItFits: string;
  readinessInsight: string;
  whatToLearnFirst: string;
  nextAction: string;
};

type TransitionResult = {
  flowId: "transition_to_ba";
  transferableStrengths: string;
  bestFitRole: string;
  howToPosition: string;
  biggestGap: string;
  confidenceReframe: string;
  nextAction: string;
  ctaTool: string;
};

type StuckResult = {
  flowId: "feeling_stuck";
  rootProblem: string;
  confidenceLevel: "High" | "Medium" | "Low";
  plainEnglishDiagnosis: string;
  nextAction: string;
  ctaTool: string;
};

type SeniorRoleResult = {
  flowId: "move_to_senior_role";
  whereYouAre: string;
  realBlocker: string;
  whatSeniorActuallyMeans: string;
  closingTheGap: string;
  nextAction: string;
  ctaTool: string;
};

type AdvisorResult = NewToBaResult | TransitionResult | StuckResult | SeniorRoleResult;

// ── Result renderers ─────────────────────────────────────────────────────────

function ResultNewToBa({ result, onBack, onNavigate }: { result: NewToBaResult; onBack?: () => void; onNavigate?: (tool: Tool) => void }) {
  const router = useRouter();
  const trackColour = result.recommendedTrack.includes("Technical") ? "#818cf8"
    : result.recommendedTrack.includes("Product") ? C.teal : C.amber;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Track header */}
      <div style={{ ...card, border: `1px solid ${trackColour}33`, background: `${trackColour}0d` }}>
        <div style={{ fontSize: "11px", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR RECOMMENDED PATH</div>
        <div style={{ fontSize: "24px", fontWeight: 800, color: trackColour, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em" }}>{result.recommendedTrack}</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: "12px 0 0" }}>{result.whyItFits}</p>
      </div>

      {/* Readiness */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHERE YOU ARE RIGHT NOW</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.readinessInsight}</p>
      </div>

      {/* What to learn first */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHAT TO LEARN FIRST</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whatToLearnFirst}</p>
      </div>

      {/* Next action CTA */}
      <div style={{ ...card, borderColor: C.tealBorder, background: "rgba(8,145,178,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR FIRST ACTION</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: "0 0 14px" }}>{result.nextAction}</p>
        <button style={{ ...btn(), fontSize: "13px", padding: "10px 20px" }} onClick={() => router.push("/scenarios")}>
          Start a BA Challenge
        </button>
      </div>

      <button style={{ ...btn("ghost"), alignSelf: "flex-start" }} onClick={onBack}>Start over</button>
    </div>
  );
}

function ResultTransition({ result, onBack }: { result: TransitionResult; onBack?: () => void }) {
  const router = useRouter();
  const cta = CTA_ROUTES[result.ctaTool];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Transferable strengths */}
      <div style={{ ...card, borderColor: "rgba(110,231,183,0.25)", background: "rgba(16,185,129,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHAT YOU ALREADY BRING</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.transferableStrengths}</p>
      </div>

      {/* Best fit role */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR BEST-FIT ROLE</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.bestFitRole}</p>
      </div>

      {/* How to position */}
      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>HOW TO POSITION YOURSELF</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.howToPosition}</p>
      </div>

      {/* Biggest gap */}
      <div style={{ ...card, borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>GAP TO CLOSE</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.biggestGap}</p>
      </div>

      {/* Confidence reframe */}
      {result.confidenceReframe && (
        <div style={{ padding: "14px 18px", borderLeft: `3px solid ${C.teal}`, background: "rgba(8,145,178,0.05)", borderRadius: "0 8px 8px 0" }}>
          <p style={{ fontSize: "14px", color: C.teal, lineHeight: "1.6", margin: 0, fontStyle: "italic" }}>{result.confidenceReframe}</p>
        </div>
      )}

      {/* Next action CTA */}
      <div style={{ ...card, borderColor: C.tealBorder, background: "rgba(8,145,178,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR NEXT STEP</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: "0 0 14px" }}>{result.nextAction}</p>
        {cta && (
          <button style={{ ...btn(), fontSize: "13px", padding: "10px 20px" }} onClick={() => router.push(cta.href)}>
            {cta.label}
          </button>
        )}
      </div>

      <button style={{ ...btn("ghost"), alignSelf: "flex-start" }} onClick={onBack}>Start over</button>
    </div>
  );
}

function ResultStuck({ result, onBack }: { result: StuckResult; onBack?: () => void }) {
  const router = useRouter();
  const cta = CTA_ROUTES[result.ctaTool];

  const problemColour = ({
    "No Direction": "#818cf8",
    "No Evidence": C.amber,
    "Weak Positioning": C.amber,
    "Interview Performance": "#a855f7",
    "Confidence/Momentum": C.teal,
    "Wrong Targeting": C.red,
  } as Record<string, string>)[result.rootProblem] ?? C.muted;

  const confidenceColour = result.confidenceLevel === "High" ? C.green : result.confidenceLevel === "Medium" ? C.amber : C.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Diagnosis header */}
      <div style={{ ...card, border: `1px solid ${problemColour}33`, background: `${problemColour}0d` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ fontSize: "11px", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "4px" }}>ROOT ISSUE IDENTIFIED</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: problemColour, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em" }}>{result.rootProblem}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "4px" }}>CONFIDENCE LEVEL</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: confidenceColour }}>{result.confidenceLevel}</div>
          </div>
        </div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.plainEnglishDiagnosis}</p>
      </div>

      {/* Next action */}
      <div style={{ ...card, borderColor: C.tealBorder, background: "rgba(8,145,178,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>THIS WEEK — DO THIS</div>
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.6", margin: "0 0 16px", fontWeight: 500 }}>{result.nextAction}</p>
        {cta && (
          <button style={{ ...btn(), fontSize: "13px", padding: "10px 20px" }} onClick={() => router.push(cta.href)}>
            {cta.label}
          </button>
        )}
      </div>

      <button style={{ ...btn("ghost"), alignSelf: "flex-start" }} onClick={onBack}>Start over</button>
    </div>
  );
}

function ResultSeniorRole({ result, onBack }: { result: SeniorRoleResult; onBack?: () => void }) {
  const router = useRouter();
  const cta = CTA_ROUTES[result.ctaTool];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ ...card, borderColor: "rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#a855f7", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHERE YOU ARE RIGHT NOW</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whereYouAre}</p>
      </div>

      <div style={{ ...card, borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHAT IS ACTUALLY HOLDING YOU BACK</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.realBlocker}</p>
      </div>

      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHAT SENIOR ACTUALLY LOOKS LIKE</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whatSeniorActuallyMeans}</p>
      </div>

      <div style={{ ...card, borderColor: "rgba(110,231,183,0.25)", background: "rgba(16,185,129,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>HOW TO CLOSE THE GAP</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.closingTheGap}</p>
      </div>

      <div style={{ ...card, borderColor: C.tealBorder, background: "rgba(8,145,178,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR NEXT STEP THIS WEEK</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: "0 0 14px" }}>{result.nextAction}</p>
        {cta && (
          <button style={{ ...btn(), fontSize: "13px", padding: "10px 20px" }} onClick={() => router.push(cta.href)}>
            {cta.label}
          </button>
        )}
      </div>

      <button style={{ ...btn("ghost"), alignSelf: "flex-start" }} onClick={onBack}>Start over</button>
    </div>
  );
}

// ── AdvisorTool ───────────────────────────────────────────────────────────────

function AdvisorTool({ onNavigate, intent, intentHeading, onBack }: {
  onNavigate?: (tool: Tool) => void;
  intent?: string;
  intentHeading?: { heading: string; subtext: string } | null;
  onBack?: () => void;
}) {
  const flowConfig = (intent && FLOW_CONFIG[intent]) ? FLOW_CONFIG[intent] : null;

  const [step, setStep] = useState<"question" | "loading" | "result" | "error">("question");
  const [qIndex, setQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [q1Key, setQ1Key] = useState<string>("");
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [pendingResult, setPendingResult] = useState<AdvisorResult | null>(null);
  const [animComplete, setAnimComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (pendingResult && animComplete) {
      setResult(pendingResult);
      setStep("result");
    }
  }, [pendingResult, animComplete]);

  // No valid flow — fallback message
  if (!flowConfig) {
    return (
      <div style={{ padding: "40px 0" }}>
        <p style={{ color: C.muted, fontSize: "15px" }}>Please select an option from the menu to continue.</p>
        {onBack && <button style={{ ...btn("ghost"), marginTop: "16px" }} onClick={onBack}>← Back</button>}
      </div>
    );
  }

  const questions = flowConfig.questions;

  const submitAnswers = async (answers: string[]) => {
    setStep("loading");
    setError("");
    setAnimComplete(false);
    setPendingResult(null);
    try {
      const res = await fetch("/api/career/career-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: flowConfig.id,
          answers,
          ...(flowConfig.branchMap ? { q1Value: q1Key } : {}),
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Something went wrong. Please try again.");
      if (!data.flowId) throw new Error("No response from the advisor. Please try again.");
      setPendingResult(data as AdvisorResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const selectOption = (optLabel: string, optValue?: string) => {
    const updated = [...selectedAnswers, optLabel];
    setSelectedAnswers(updated);
    if (qIndex === 0 && optValue) setQ1Key(optValue);
    if (qIndex >= questions.length - 1) {
      submitAnswers(updated);
    } else {
      setQIndex(qIndex + 1);
    }
  };

  const restart = () => {
    setStep("question");
    setQIndex(0);
    setSelectedAnswers([]);
    setQ1Key("");
    setResult(null);
    setPendingResult(null);
    setAnimComplete(false);
    setError("");
  };

  const retryLastQuestion = () => submitAnswers(selectedAnswers);

  if (step === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "40px 0" }}>
        <div style={{ ...card, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: C.red, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>SOMETHING WENT WRONG</div>
          <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.6", margin: "0 0 20px" }}>{error}</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button style={btn()} onClick={retryLastQuestion}>Try again</button>
            <button style={btn("ghost")} onClick={restart}>Start over</button>
          </div>
        </div>
        {onBack && (
          <button style={{ ...btn("ghost"), alignSelf: "flex-start" }} onClick={onBack}>← Back</button>
        )}
      </div>
    );
  }

  if (step === "loading") {
    return <AdvisorLoading onAnimComplete={() => setAnimComplete(true)} steps={flowConfig.loadingSteps} />;
  }

  if (step === "result" && result) {
    if (result.flowId === "new_to_ba") return <ResultNewToBa result={result} onBack={restart} onNavigate={onNavigate} />;
    if (result.flowId === "transition_to_ba") return <ResultTransition result={result} onBack={restart} />;
    if (result.flowId === "feeling_stuck") return <ResultStuck result={result} onBack={restart} />;
    if (result.flowId === "move_to_senior_role") return <ResultSeniorRole result={result} onBack={restart} />;
  }

  // ── Question step ──
  // Q2 is branched per Q1 answer when branchMap is present; all other questions come from questions[]
  const q = (qIndex === 1 && flowConfig.branchMap && q1Key)
    ? (flowConfig.branchMap[q1Key] ?? questions[qIndex])
    : questions[qIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Intent heading — shown on first question only */}
      {intentHeading && qIndex === 0 && (
        <div>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-3)", padding: "0", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: "22px", fontWeight: 800, color: C.text, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em" }}>{intentHeading.heading}</div>
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "6px", lineHeight: 1.5 }}>{intentHeading.subtext}</div>
        </div>
      )}

      {/* Progress dots */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            width: i === qIndex ? "24px" : "8px",
            height: "8px", borderRadius: "4px",
            background: i < qIndex ? C.green : i === qIndex ? C.teal : C.border,
            transition: "all 0.2s",
          }} />
        ))}
        <span style={{ fontSize: "12px", color: C.muted, marginLeft: "8px" }}>
          {qIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Question */}
      <p style={{ fontSize: "20px", fontWeight: 600, color: C.text, lineHeight: "1.5", margin: 0 }}>
        {q.question}
      </p>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => selectOption(opt, q.optionValues?.[i])}
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

      {qIndex > 0 && (
        <button style={{ ...btn("ghost"), alignSelf: "flex-start" }}
          onClick={() => { setQIndex(qIndex - 1); setSelectedAnswers(prev => prev.slice(0, -1)); }}>
          Back
        </button>
      )}
    </div>
  );
}

// ── Resume Improvement ──────────────────────────────────────────────────────

function ResumeTool({ fullName, onNavigate, intentHeading, onBack }: {
  fullName: string;
  onNavigate?: (tool: Tool) => void;
  intentHeading?: { heading: string; subtext: string } | null;
  onBack?: () => void;
}) {
  const [step, setStep] = useState<"upload" | "loading" | "intro" | "question" | "building" | "done">("upload");
  const [resumeText, setResumeText] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [pastedText, setPastedText] = useState("");
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}));
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
        onClick={() => { setStep("upload"); setResumeText(""); setPastedText(""); setInputMode("upload"); setQuestions([]); setAnswers([]); setQIdx(0); setNameInput(cleanedProfileName.includes(" ") ? cleanedProfileName : ""); }}>
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
  const activeResumeText = inputMode === "paste" ? pastedText : resumeText;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {intentHeading ? (
        <div>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-3)", padding: "0", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: "22px", fontWeight: 800, color: C.text, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em" }}>{intentHeading.heading}</div>
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "6px", lineHeight: 1.5 }}>{intentHeading.subtext}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "16px", color: C.text, lineHeight: "1.7", margin: 0 }}>
            Share your current resume and I will review it with you.
          </p>
          <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.7", margin: 0 }}>
            I will ask a few short questions to better understand your experience, your achievements, and the kind of role you are targeting. From there I will help you strengthen your resume and send back an improved version in Word format so you can make any final edits yourself.
          </p>
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "8px" }}>
        {(["upload", "paste"] as const).map(mode => (
          <button key={mode} onClick={() => setInputMode(mode)} style={{
            padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600",
            cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif",
            background: inputMode === mode ? C.tealBg : "transparent",
            border: `1px solid ${inputMode === mode ? C.tealBorder : "rgba(255,255,255,0.1)"}`,
            color: inputMode === mode ? C.teal : C.muted,
          }}>
            {mode === "upload" ? "Upload file" : "Paste text"}
          </button>
        ))}
      </div>

      {inputMode === "upload" ? (
        <FileUpload label="Your current resume" onParsed={(text) => setResumeText(text)} />
      ) : (
        <div>
          <span style={label}>Paste your resume text</span>
          <textarea
            rows={12}
            style={textarea(12)}
            placeholder="Copy and paste your resume text here…"
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
          />
          {pastedText.length > 0 && pastedText.length < 100 && (
            <p style={{ fontSize: "12px", color: C.amber, marginTop: "6px" }}>Keep going — paste the full resume so I can give you proper feedback.</p>
          )}
        </div>
      )}

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

      {activeResumeText && !nameInput.trim() && (
        <p style={{ fontSize: "13px", color: C.amber, margin: 0 }}>Please enter your name above so we can put it on the improved resume.</p>
      )}

      <button style={{ ...btn(), alignSelf: "flex-start", padding: "12px 28px", opacity: (!activeResumeText || activeResumeText.length < 100 || !nameInput.trim()) ? 0.4 : 1 }}
        disabled={!activeResumeText || activeResumeText.length < 100 || !nameInput.trim()} onClick={() => fetchQuestions(activeResumeText)}>
        Review my resume
      </button>
    </div>
  );
}

// ── Cover Letter Builder ────────────────────────────────────────────────────

function CoverLetterTool({ fullName, onNavigate, intentHeading, onBack }: {
  fullName: string;
  onNavigate?: (tool: Tool) => void;
  intentHeading?: { heading: string; subtext: string } | null;
  onBack?: () => void;
}) {
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
      {intentHeading ? (
        <div>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-3)", padding: "0", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: "22px", fontWeight: 800, color: C.text, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em", marginBottom: "6px" }}>{intentHeading.heading}</div>
          <div style={{ fontSize: "14px", color: C.muted, lineHeight: 1.5 }}>{intentHeading.subtext}</div>
        </div>
      ) : (
        <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.6", margin: 0 }}>
          Upload your resume and paste the job description. I will ask a couple of quick questions so the letter speaks directly to that role.
        </p>
      )}
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

function JDAnalyzerTool({ intentHeading, onBack }: {
  intentHeading?: { heading: string; subtext: string } | null;
  onBack?: () => void;
}) {
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | {
    jobTitle: string;
    company: string;
    whatThisRoleIsAbout: string;
    whatTheyCareAbout: string[];
    businessProblem: string;
    howToPosition: string;
    resumeAlignment: { strengths: string[]; gaps: string[]; improvements: string[] } | null;
    interviewFocus: string[];
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Analysis failed");
      setResult(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ padding: "60px 0" }}>
      <div style={{ color: C.teal, fontSize: "15px" }}>Reading the job description…</div>
      <div style={{ color: C.muted, fontSize: "13px", marginTop: "8px" }}>This usually takes around 10 seconds.</div>
    </div>
  );

  if (result) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Role header */}
      <div style={{ marginBottom: "4px" }}>
        <div style={{ fontSize: "22px", fontWeight: 800, color: C.text, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em" }}>{result.jobTitle}</div>
        {result.company && result.company !== "Not specified" && (
          <div style={{ fontSize: "14px", color: C.muted, marginTop: "4px" }}>{result.company}</div>
        )}
      </div>

      {/* Section 1 */}
      <div style={{ ...card }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>WHAT THIS ROLE IS REALLY ABOUT</div>
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whatThisRoleIsAbout}</p>
      </div>

      {/* Section 2 */}
      <div style={{ ...card }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>WHAT THEY CARE ABOUT MOST</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {result.whatTheyCareAbout.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.teal, flexShrink: 0, marginTop: "7px" }} />
              <span style={{ fontSize: "14px", color: C.text, lineHeight: "1.5" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 */}
      <div style={{ ...card, borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>THE LIKELY BUSINESS PROBLEM</div>
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.businessProblem}</p>
      </div>

      {/* Section 4 */}
      <div style={{ ...card, borderColor: C.tealBorder, background: C.tealBg }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>HOW YOU SHOULD POSITION YOURSELF</div>
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.howToPosition}</p>
      </div>

      {/* Section 5 — Resume alignment (only if resume was provided) */}
      {result.resumeAlignment && (
        <div style={{ ...card }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "16px" }}>RESUME ALIGNMENT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {result.resumeAlignment.strengths.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.green, marginBottom: "8px" }}>What you have that they want</div>
                {result.resumeAlignment.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: "14px", color: C.text, paddingLeft: "12px", borderLeft: `2px solid ${C.green}`, marginBottom: "6px", lineHeight: "1.4" }}>{s}</div>
                ))}
              </div>
            )}
            {result.resumeAlignment.gaps.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.red, marginBottom: "8px" }}>Gaps to address</div>
                {result.resumeAlignment.gaps.map((g, i) => (
                  <div key={i} style={{ fontSize: "14px", color: C.text, paddingLeft: "12px", borderLeft: `2px solid ${C.red}`, marginBottom: "6px", lineHeight: "1.4" }}>{g}</div>
                ))}
              </div>
            )}
            {result.resumeAlignment.improvements.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.amber, marginBottom: "8px" }}>Specific improvements to make</div>
                {result.resumeAlignment.improvements.map((imp, i) => (
                  <div key={i} style={{ fontSize: "14px", color: C.text, paddingLeft: "12px", borderLeft: `2px solid ${C.amber}`, marginBottom: "6px", lineHeight: "1.4" }}>{imp}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 6 */}
      <div style={{ ...card }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#a855f7", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>LIKELY INTERVIEW FOCUS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {result.interviewFocus.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a855f7", flexShrink: 0, marginTop: "7px" }} />
              <span style={{ fontSize: "14px", color: C.text, lineHeight: "1.5" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <button style={{ ...btn("ghost"), alignSelf: "flex-start" }} onClick={() => { setResult(null); setJdText(""); setResumeText(""); }}>
        Analyse another role
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {intentHeading && (
        <div>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-3)", padding: "0", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: "22px", fontWeight: 800, color: C.text, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em", marginBottom: "6px" }}>{intentHeading.heading}</div>
          <div style={{ fontSize: "14px", color: C.muted, lineHeight: 1.5, marginBottom: "4px" }}>{intentHeading.subtext}</div>
        </div>
      )}
      <div>
        <span style={label}>Job description</span>
        <textarea rows={10} style={textarea(10)} placeholder="Paste the full job description here…"
          value={jdText} onChange={e => setJdText(e.target.value)} />
      </div>
      <div>
        <span style={label}>Your resume <span style={{ color: C.muted, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — paste for personalised alignment advice)</span></span>
        <textarea rows={6} style={textarea(6)} placeholder="Paste your resume text here…"
          value={resumeText} onChange={e => setResumeText(e.target.value)} />
      </div>
      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}
      <button style={{ ...btn(), alignSelf: "flex-start", padding: "12px 28px", opacity: jdText.trim().length < 50 ? 0.4 : 1 }}
        disabled={jdText.trim().length < 50} onClick={analyse}>
        Analyze this role
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

function InterviewTool({ onNavigate, intentHeading, onBack }: {
  onNavigate?: (tool: Tool) => void;
  intentHeading?: { heading: string; subtext: string } | null;
  onBack?: () => void;
}) {
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

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
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
          <button style={{ ...btn("ghost"), marginLeft: "auto" }}
            onClick={() => { setStep("setup"); setQuestions([]); setFeedbacks([]); setCurrentQ(0); setTranscript(""); setJdText(""); setCompany(""); setResumeText(""); }}>
            End session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {intentHeading ? (
        <div>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-3)", padding: "0", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: "22px", fontWeight: 800, color: C.text, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em", marginBottom: "6px" }}>{intentHeading.heading}</div>
          <div style={{ fontSize: "14px", color: C.muted, lineHeight: 1.5 }}>{intentHeading.subtext}</div>
        </div>
      ) : (
        <p style={{ fontSize: "14px", color: C.muted, lineHeight: "1.6", margin: 0 }}>
          Describe the role and I will generate realistic interview questions tailored to it. You will answer by speaking or typing, and I will give you detailed feedback on every answer.
        </p>
      )}
      <div>
        <span style={label}>Job description</span>
        <textarea rows={8} style={textarea(8)} placeholder="Paste the full job description here…"
          value={jdText} onChange={e => setJdText(e.target.value)} />
      </div>
      <div>
        <span style={label}>Company name</span>
        <input type="text" style={input} placeholder="Add the company name if it is not in the job description"
          value={company} onChange={e => setCompany(e.target.value)} />
      </div>
      <FileUpload label="Your resume (optional — personalises questions to your background)" onParsed={(text) => setResumeText(text)} />
      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}
      <button style={btn()} disabled={jdText.trim().length < 50} onClick={generateQuestions}>
        Generate my interview questions
      </button>
    </div>
  );
}

// ── Salary Negotiation ──────────────────────────────────────────────────────

function SalaryTool({ intentHeading, onBack }: {
  intentHeading?: { heading: string; subtext: string } | null;
  onBack?: () => void;
}) {
  const [form, setForm] = useState({ offerAmount: "", currency: "$", jobTitle: "", yearsExp: "", location: "", notes: "" });
  const [offerLetterText, setOfferLetterText] = useState("");
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
        body: JSON.stringify({ ...form, offerLetterText }),
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

      <button style={btn("ghost")} onClick={() => { setResult(null); setOfferLetterText(""); setForm({ offerAmount: "", currency: "$", jobTitle: "", yearsExp: "", location: "", notes: "" }); }}>
        Analyse another offer
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {intentHeading ? (
        <div>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-3)", padding: "0", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
              ← Back
            </button>
          )}
          <div style={{ fontSize: "22px", fontWeight: 800, color: C.text, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em", marginBottom: "6px" }}>{intentHeading.heading}</div>
          <div style={{ fontSize: "14px", color: C.muted, lineHeight: 1.5 }}>{intentHeading.subtext}</div>
        </div>
      ) : (
        <p style={{ fontSize: "15px", color: C.muted, lineHeight: "1.6", margin: 0 }}>
          Upload your offer letter and I will read it for you, or fill in the details below. Either way works.
        </p>
      )}

      <FileUpload label="Offer letter (optional — Word or PDF)" onParsed={(text) => setOfferLetterText(text)} />

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ flex: 1, height: "1px", background: C.border }} />
        <span style={{ fontSize: "12px", color: C.muted }}>or enter the details manually</span>
        <div style={{ flex: 1, height: "1px", background: C.border }} />
      </div>

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
      <button style={btn()} disabled={!form.offerAmount && !offerLetterText} onClick={analyse}>
        Analyse my offer
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

const JOURNEY = [
  {
    step: 1,
    colour: "#22d3ee",
    label: "Find your direction",
    description: "Before you update a single line of your resume, you need to know which BA path you are heading towards. This shapes everything else.",
    tools: [
      { id: "advisor" as Tool, label: "Career Strategy Advisor", action: "Start here" },
    ],
  },
  {
    step: 2,
    colour: "#818cf8",
    label: "Strengthen your profile",
    description: "Get your documents ready for the roles you want. Resume, cover letters, and keyword matching — all in one place.",
    tools: [
      { id: "resume" as Tool, label: "Resume Improvement", action: "Improve my resume" },
      { id: "cover-letter" as Tool, label: "Cover Letter Builder", action: "Write a cover letter" },
      { id: "jd" as Tool, label: "JD Analyzer", action: "Analyse a job description" },
    ],
  },
  {
    step: 3,
    colour: "#a855f7",
    label: "Prepare for interviews",
    description: "Practice answering real interview questions out loud and get detailed feedback on every answer before the real thing.",
    tools: [
      { id: "interview" as Tool, label: "Interview Prep", action: "Start practising" },
    ],
  },
  {
    step: 4,
    colour: "#fbbf24",
    label: "Handle the offer",
    description: "Know what your offer is worth and what to say to push it higher. Scripts you can use word for word in the actual conversation.",
    tools: [
      { id: "salary" as Tool, label: "Salary Negotiation", action: "Analyse my offer" },
    ],
  },
];

function stepForTool(id: Tool) {
  return JOURNEY.find(g => g.tools.some(t => t.id === id)) ?? null;
}

type Category = "explore" | "land" | "grow";

const CATEGORIES: { id: Category; num: number; title: string; description: string; colour: string; bg: string; border: string }[] = [
  {
    id: "explore", num: 1,
    title: "Explore my path",
    description: "I am figuring out my direction in Business Analysis",
    colour: "#22d3ee", bg: "rgba(8,145,178,0.08)", border: "rgba(8,145,178,0.2)",
  },
  {
    id: "land", num: 2,
    title: "Land a job",
    description: "I want to get interviews or apply to roles",
    colour: "#6ee7b7", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)",
  },
  {
    id: "grow", num: 3,
    title: "Grow or negotiate",
    description: "I want to level up, prepare for interviews, or negotiate offers",
    colour: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)",
  },
];

interface CategoryOption { label: string; intent: string; }

const CATEGORY_OPTIONS: Record<Category, CategoryOption[]> = {
  explore: [
    { label: "I am new to Business Analysis and do not know where to start", intent: "new_to_ba" },
    { label: "I am trying to transition into a BA role from another field", intent: "transition_to_ba" },
    { label: "I feel stuck and do not know what direction fits me", intent: "feeling_stuck" },
  ],
  land: [
    { label: "I am not getting interviews and need to understand why", intent: "not_getting_interviews" },
    { label: "I need help improving my resume to get callbacks", intent: "improve_resume" },
    { label: "I found a job and want to tailor my application", intent: "tailor_application" },
    { label: "Analyze a job description and tell me what they really want", intent: "analyze_job_description" },
  ],
  grow: [
    { label: "I have interviews coming up and need to prepare", intent: "interview_preparation" },
    { label: "I want to practice interview answers and get feedback", intent: "practice_answers" },
    { label: "I have an offer and need help negotiating", intent: "negotiate_offer" },
    { label: "I want to move into a higher paying or more senior BA role", intent: "move_to_senior_role" },
  ],
};

// Maps each intent to which Tool renders it (null = external redirect)
const INTENT_TO_TOOL: Record<string, Tool | null> = {
  new_to_ba: "advisor",
  transition_to_ba: "advisor",
  feeling_stuck: "advisor",
  not_getting_interviews: "resume",
  improve_resume: "resume",
  tailor_application: "cover-letter",
  analyze_job_description: "jd",
  interview_preparation: "interview",
  practice_answers: null,
  negotiate_offer: "salary",
  move_to_senior_role: "advisor",
};

// Intent-aware headings shown to users at the top of each tool
const INTENT_HEADINGS: Record<string, { heading: string; subtext: string }> = {
  new_to_ba: {
    heading: "Let's build your BA foundation",
    subtext: "Four quick questions to work out which direction in BA fits you.",
  },
  transition_to_ba: {
    heading: "Let's map your experience into a BA role",
    subtext: "You have real background. We will work out how to position it for BA.",
  },
  feeling_stuck: {
    heading: "Let's work out what direction fits you",
    subtext: "Four questions. No wrong answers. We will figure it out together.",
  },
  not_getting_interviews: {
    heading: "Let's figure out why you are not getting interviews",
    subtext: "Share your resume and I will tell you what is holding you back and what to fix.",
  },
  improve_resume: {
    heading: "Let's strengthen your resume",
    subtext: "Share your resume and I will work through it with you step by step.",
  },
  tailor_application: {
    heading: "Let's tailor your application to this role",
    subtext: "Share your resume and the job description and I will write a cover letter that speaks directly to this role.",
  },
  analyze_job_description: {
    heading: "Let's break down this job description",
    subtext: "Paste the JD and I will tell you what they really want, the likely business problem, and how to position yourself.",
  },
  interview_preparation: {
    heading: "Let's get you ready for interviews",
    subtext: "I will generate real BA interview questions tailored to your role and give you detailed feedback on every answer.",
  },
  practice_answers: {
    heading: "Practice real BA scenarios",
    subtext: "Work through realistic stakeholder challenges and get feedback on your approach.",
  },
  negotiate_offer: {
    heading: "Let's negotiate your offer",
    subtext: "Share the details of your offer and I will tell you what it is worth, what to ask for, and exactly what to say.",
  },
  move_to_senior_role: {
    heading: "Let's map your path to a senior BA role",
    subtext: "Four questions to work out where you are, what is holding you back, and what your next step looks like.",
  },
};

// When a tool result screen recommends "next step → another tool", map to the right URL
const TOOL_TO_URL: Partial<Record<Tool, string>> = {
  advisor:        "/career?cat=explore&intent=new_to_ba",
  resume:         "/career?cat=land&intent=improve_resume",
  "cover-letter": "/career?cat=land&intent=tailor_application",
  jd:             "/career?cat=land&intent=analyze_job_description",
  interview:      "/career?cat=grow&intent=interview_preparation",
  salary:         "/career?cat=grow&intent=negotiate_offer",
};

const CAREER_NAV = [
  { icon: LayoutDashboard,   label: "Dashboard",    href: "/dashboard"   },
  { icon: BookOpen,          label: "Challenges",   href: "/scenarios"   },
  { icon: TrendingUp,        label: "Progress",     href: "/progress"    },
  { icon: GraduationCap,     label: "Learning",     href: "/learning"    },
  { icon: Target,            label: "Exam Prep",    href: "/exam"        },
  { icon: Mic,               label: "PitchReady",   href: "/pitchready"  },
  { icon: BriefcaseBusiness, label: "Career Suite", href: "/career", active: true },
  { icon: Trophy,            label: "Portfolio",    href: "/portfolio"   },
];

export default function CareerClient({ fullName }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cat = searchParams.get("cat") as Category | null;
  const intent = searchParams.get("intent");

  // Derive the active tool from the intent
  const activeTool: Tool | null = intent ? (INTENT_TO_TOOL[intent] ?? null) : null;

  // If practice_answers, redirect externally on mount
  useEffect(() => {
    if (intent === "practice_answers") {
      router.push("/scenarios");
    }
  }, [intent, router]);

  const goToCategory = (c: Category) => router.push(`/career?cat=${c}`);
  const goToIntent = (c: Category, i: string) => router.push(`/career?cat=${c}&intent=${i}`);
  const goBackToCategory = () => cat ? router.push(`/career?cat=${cat}`) : router.push("/career");
  const goHome = () => router.push("/career");

  const currentToolInfo = activeTool ? JOURNEY.flatMap(g => g.tools).find(t => t.id === activeTool) : null;
  const activeCat = cat ? CATEGORIES.find(c => c.id === cat) : null;
  const intentHeading = intent ? INTENT_HEADINGS[intent] : null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--teal-soft)", border: "1px solid var(--teal-border)" }}>
              <BookOpen className="w-4 h-4" style={{ color: "var(--teal)" }} />
            </div>
            <div style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "15px", color: "var(--text-1)", letterSpacing: "-0.03em" }}>
              The<span style={{ color: "var(--teal)" }}>BA</span>Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div className="type-label px-3 pb-3">Platform</div>
          {CAREER_NAV.map(item => (
            <button key={item.href} onClick={() => router.push(item.href)} className="sidebar-item"
              style={item.active ? { background: "var(--teal-soft)", color: "var(--teal)", border: "1px solid var(--teal-border)" } : {}}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", flexShrink: 0 }} />}
            </button>
          ))}
          <div className="type-label px-3 pt-5 pb-3">Account</div>
          <button className="sidebar-item" onClick={() => router.push("/settings")}>
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </button>
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">

        {/* Header */}
        <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-20"
          style={{ background: "rgba(9,9,11,0.88)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)" }}>
          <div>
            {(activeTool || cat) && (
              <h1 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: "var(--text-1)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {currentToolInfo?.label ?? activeCat?.title ?? "Career Suite"}
              </h1>
            )}
          </div>
          {(activeTool || cat) && (
            <button className="btn-ghost" onClick={goHome}>Back to Career Suite</button>
          )}
        </header>

        {/* Content */}
        <div className="px-8 py-8" style={{ maxWidth: "680px" }}>

          {/* ── Home: Entry ── */}
          {!cat && !intent && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "560px" }}>
              <div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-1)", margin: 0, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.03em" }}>
                  What do you need help with right now?
                </h1>
                <p style={{ marginTop: "10px", fontSize: "15px", color: "var(--text-3)", margin: "10px 0 0", lineHeight: 1.5 }}>
                  Pick one and I will guide you step by step.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {CATEGORIES.map((c) => (
                  <button key={c.id}
                    onClick={() => goToCategory(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "18px",
                      background: "var(--surface)", border: `1px solid var(--border)`,
                      borderLeft: `4px solid ${c.colour}`,
                      borderRadius: "14px", padding: "20px 24px", cursor: "pointer",
                      textAlign: "left", transition: "all 0.15s", width: "100%",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = c.bg;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = c.border;
                      (e.currentTarget as HTMLButtonElement).style.borderLeftColor = c.colour;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLButtonElement).style.borderLeftColor = c.colour;
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: c.bg, border: `1px solid ${c.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "15px", fontWeight: 800, color: c.colour,
                      fontFamily: "JetBrains Mono, monospace",
                    }}>{c.num}</div>
                    <div>
                      <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.3 }}>{c.title}</div>
                      <div style={{ fontSize: "14px", color: "var(--text-3)", marginTop: "4px", lineHeight: 1.4 }}>{c.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Home: Category ── */}
          {cat && !intent && activeCat && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "560px" }}>
              <div>
                <button
                  onClick={goHome}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "13px", color: "var(--text-3)", padding: "0",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px",
                  }}>
                  ← Back
                </button>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-1)", margin: "14px 0 6px", fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em" }}>
                  {activeCat.title}
                </h2>
                <p style={{ fontSize: "14px", color: "var(--text-3)", margin: 0 }}>
                  What fits your situation?
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {CATEGORY_OPTIONS[cat].map((opt) => (
                  <button key={opt.intent}
                    onClick={() => goToIntent(cat, opt.intent)}
                    style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      background: "var(--surface)", border: `1px solid var(--border)`,
                      borderRadius: "10px", padding: "16px 18px", cursor: "pointer",
                      textAlign: "left", transition: "all 0.15s", width: "100%",
                      fontSize: "15px", color: "var(--text-2)", fontFamily: "inherit",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = activeCat.bg;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = activeCat.border;
                      (e.currentTarget as HTMLButtonElement).style.color = activeCat.colour;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
                    }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: activeCat.colour, opacity: 0.7,
                    }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Redirect placeholder (practice_answers → /scenarios) ── */}
          {intent === "practice_answers" && (
            <div style={{ padding: "60px 0", color: C.muted, fontSize: "15px" }}>
              Taking you to BA Challenges…
            </div>
          )}

          {/* ── Tools ── */}
          {activeTool && intent && (
            <div>
              {activeTool === "advisor" && (
                <AdvisorTool
                  key={intent}
                  onNavigate={(tool) => { const url = TOOL_TO_URL[tool]; if (url) router.push(url); }}
                  intent={intent}
                  intentHeading={intentHeading}
                  onBack={goBackToCategory}
                />
              )}
              {activeTool === "resume" && (
                <ResumeTool
                  fullName={fullName}
                  onNavigate={(tool) => { const url = TOOL_TO_URL[tool]; if (url) router.push(url); }}
                  intentHeading={intentHeading}
                  onBack={goBackToCategory}
                />
              )}
              {activeTool === "cover-letter" && (
                <CoverLetterTool
                  fullName={fullName}
                  onNavigate={(tool) => { const url = TOOL_TO_URL[tool]; if (url) router.push(url); }}
                  intentHeading={intentHeading}
                  onBack={goBackToCategory}
                />
              )}
              {activeTool === "jd" && (
                <JDAnalyzerTool
                  intentHeading={intentHeading}
                  onBack={goBackToCategory}
                />
              )}
              {activeTool === "interview" && (
                <InterviewTool
                  onNavigate={(tool) => { const url = TOOL_TO_URL[tool]; if (url) router.push(url); }}
                  intentHeading={intentHeading}
                  onBack={goBackToCategory}
                />
              )}
              {activeTool === "salary" && (
                <SalaryTool
                  intentHeading={intentHeading}
                  onBack={goBackToCategory}
                />
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
