"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import dynamic from "next/dynamic";
import { sectionsToHtml } from "./ResumeEditor";
const ResumeEditor = dynamic(() => import("./ResumeEditor").then(m => m.ResumeEditor), { ssr: false });

// ── Types ───────────────────────────────────────────────────────────────────

type Tool = "home" | "advisor" | "resume" | "cover-letter" | "jd" | "interview" | "salary";

type GapState = {
  status: "idle" | "asking" | "loading" | "resolved" | "dismissed";
  question?: string;
  answer?: string;
  result?: {
    type: "bullet" | "interview_prep";
    bullet?: string;
    where?: string;
    interviewPrep?: { likelyQuestion: string; framework: string };
  };
};

interface Props {
  fullName: string;
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  user: { email: string };
}

// ── Colours / style helpers ─────────────────────────────────────────────────

const C = {
  // Surfaces
  bg:           "var(--lc-bg)",
  panel:        "var(--lc-surface)",
  faint:        "var(--lc-faint)",
  border:       "var(--lc-border)",
  borderSoft:   "var(--lc-border-soft)",
  shadow:       "var(--lc-shadow-sm)",
  shadowMd:     "var(--lc-shadow-md)",
  shadowLg:     "var(--lc-shadow-lg)",
  // Text
  text:         "var(--lc-text-1)",
  textMid:      "var(--lc-text-2)",
  textSub:      "var(--lc-text-3)",
  muted:        "var(--lc-text-4)",
  faded:        "var(--lc-text-5)",
  // Teal
  teal:         "var(--lc-teal)",
  tealBg:       "var(--lc-teal-bg)",
  tealBorder:   "var(--lc-teal-border)",
  // Green
  green:        "var(--lc-green)",
  greenBg:      "var(--lc-green-bg)",
  greenBorder:  "var(--lc-green-border)",
  // Red
  red:          "var(--lc-red)",
  redBg:        "var(--lc-red-bg)",
  redBorder:    "var(--lc-red-border)",
  redAccent:    "var(--lc-red-accent)",
  // Amber
  amber:        "var(--lc-amber)",
  amberBg:      "var(--lc-amber-bg)",
  // Blue
  blue:         "var(--lc-blue)",
  blueBg:       "var(--lc-blue-bg)",
  blueBorder:   "var(--lc-blue-border)",
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
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.08)",
    color: C.muted,
  }),
});

const card: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
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
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
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
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");

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

  if (pasteMode) {
    return (
      <div>
        <span style={label}>{lbl}</span>
        <textarea
          rows={6}
          style={{ ...textarea(6), fontFamily: "inherit" }}
          placeholder="Paste your resume text here…"
          value={pastedText}
          onChange={e => {
            setPastedText(e.target.value);
            if (e.target.value.trim().length > 50) {
              onParsed(e.target.value, "pasted-resume.txt");
            }
          }}
        />
        <button onClick={() => { setPasteMode(false); setStatus("idle"); }}
          style={{ marginTop: "6px", fontSize: "12px", color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          Try uploading a file instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <span style={label}>{lbl}</span>
      <label style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        border: `2px dashed ${status === "done" ? C.teal : status === "error" ? C.red : C.border}`,
        borderRadius: "12px",
        padding: "28px 20px",
        textAlign: "center",
        cursor: "pointer",
        background: status === "done" ? C.tealBg : status === "error" ? C.redBg : C.faint,
        transition: "all 0.15s",
        minHeight: "90px",
      }}>
        <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        {status === "loading" && (
          <>
            <div style={{ fontSize: "20px" }}>⏳</div>
            <span style={{ color: C.muted, fontSize: "14px" }}>Reading file…</span>
          </>
        )}
        {status === "done" && (
          <>
            <div style={{ fontSize: "20px" }}>✓</div>
            <span style={{ color: C.teal, fontSize: "14px", fontWeight: 600 }}>{fileName}</span>
            <span style={{ color: C.faded, fontSize: "12px" }}>Click to replace</span>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: "20px" }}>✗</div>
            <span style={{ color: C.red, fontSize: "13px", maxWidth: "320px", lineHeight: 1.5 }}>{errorMsg}</span>
            <span style={{ color: C.faded, fontSize: "12px" }}>Click to try again</span>
          </>
        )}
        {status === "idle" && (
          <>
            <div style={{ fontSize: "24px", opacity: 0.4 }}>↑</div>
            <span style={{ color: C.textMid, fontSize: "14px", fontWeight: 500 }}>Click to upload</span>
            <span style={{ color: C.faded, fontSize: "12px" }}>Word (.docx) or PDF</span>
          </>
        )}
      </label>
      {status === "error" && (
        <button onClick={() => setPasteMode(true)}
          style={{ marginTop: "8px", fontSize: "12px", fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
          Paste your text instead
        </button>
      )}
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="4" />
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
  lead_ba_transition: {
    id: "lead_ba_transition",
    title: "Let's map your move into leadership",
    subtitle: "Four questions to work out where you are in the transition and what you need to do differently.",
    loadingSteps: [
      "Reading where you are in the transition",
      "Diagnosing what is holding you back",
      "Working out what the role actually requires",
      "Finding your one behaviour change",
    ],
    questions: [
      {
        question: "Where are you in the leadership transition right now?",
        options: [
          "Just moved into the lead role and still doing most of the delivery myself",
          "Been in the role a while but keep getting pulled back into execution",
          "I struggle to influence decisions when I do not have direct authority",
          "People still relate to me as the senior BA who got promoted, not as a leader",
        ],
      },
      {
        question: "What is the hardest part of the shift for you?",
        options: [
          "Letting go of delivery and trusting others to execute to the right standard",
          "Getting people to follow my direction without me having formal authority",
          "Knowing when to step in and when to stay out of the work",
          "Making the leadership part of my role visible to stakeholders and senior people",
        ],
      },
      {
        question: "What does your current day actually look like in the lead role?",
        options: [
          "Mostly still doing BA delivery work with some oversight of others",
          "A mix — I lead some things but default to doing when it gets busy",
          "Lots of meetings but I am not sure how much I am actually influencing",
          "I am actively shaping the team's approach and challenging direction",
        ],
      },
      {
        question: "What does success look like to you in the next 6 months?",
        options: [
          "Being trusted to shape the direction of BA work without being micromanaged",
          "Having the team deliver confidently without me being in every detail",
          "Being seen as a strategic voice in senior conversations",
          "Building a team where the BA work quality speaks for itself",
        ],
      },
    ],
  },

  contractor_positioning: {
    id: "contractor_positioning",
    title: "Let's sharpen your specialist positioning",
    subtitle: "Four questions to work out your niche, your value, and how to command a higher rate.",
    loadingSteps: [
      "Reading your current positioning",
      "Diagnosing what is capping your rate",
      "Working out what premium actually requires",
      "Finding your sharpest move",
    ],
    questions: [
      {
        question: "How would you describe your current positioning as a contractor or consultant?",
        options: [
          "I am a generalist — I take most BA work that comes my way",
          "I have a rough niche but I have not defined or committed to it clearly",
          "I have a clear niche but I struggle to articulate the premium value it brings",
          "I know my value but I am not attracting the right clients or rates",
        ],
      },
      {
        question: "What is the main thing stopping you from commanding higher rates?",
        options: [
          "I do not have a defined niche or specialisation that justifies a premium",
          "I struggle to say what makes me worth more than a cheaper option",
          "I do not have strong enough case studies or visible proof of results",
          "My rate feels anchored to what I earned as a permanent employee",
        ],
      },
      {
        question: "What does your current client acquisition look like?",
        options: [
          "Mostly word of mouth or repeat clients with no real outbound approach",
          "I rely on platforms or agencies and take what is available",
          "I have a network but I am not actively using it to find better work",
          "I pitch directly to clients but my conversion rate is lower than I want",
        ],
      },
      {
        question: "What kind of work do you actually want to be doing?",
        options: [
          "High value advisory engagements with senior stakeholders",
          "Specialist BA work in a specific domain or industry I know deeply",
          "A mix of retained clients and project work at a higher rate",
          "Building a reputation as the go-to person for a specific problem type",
        ],
      },
    ],
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

type LeadTransitionResult = {
  flowId: "lead_ba_transition";
  whereYouAreNow: string;
  coreShift: string;
  whatLeadershipActuallyRequires: string;
  oneThingToChangeThisWeek: string;
  nextAction: string;
  ctaTool: string;
};

type ContractorResult = {
  flowId: "contractor_positioning";
  currentPositioning: string;
  valueGap: string;
  whatPremiumActuallyRequires: string;
  sharpestMove: string;
  nextAction: string;
  ctaTool: string;
};

type AdvisorResult = NewToBaResult | TransitionResult | StuckResult | SeniorRoleResult | LeadTransitionResult | ContractorResult;

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
    "Interview Performance": "#7c3aed",
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
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHERE YOU ARE RIGHT NOW</div>
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

function ResultLeadTransition({ result, onBack }: { result: LeadTransitionResult; onBack?: () => void }) {
  const router = useRouter();
  const cta = CTA_ROUTES[result.ctaTool];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ ...card, borderColor: "rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHERE YOU ARE IN THE TRANSITION</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whereYouAreNow}</p>
      </div>

      <div style={{ ...card, borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>THE SHIFT YOU NEED TO MAKE</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.coreShift}</p>
      </div>

      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHAT LEADERSHIP ACTUALLY REQUIRES</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whatLeadershipActuallyRequires}</p>
      </div>

      <div style={{ ...card, borderColor: "rgba(110,231,183,0.25)", background: "rgba(16,185,129,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>ONE THING TO CHANGE THIS WEEK</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.oneThingToChangeThisWeek}</p>
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

function ResultContractor({ result, onBack }: { result: ContractorResult; onBack?: () => void }) {
  const router = useRouter();
  const cta = CTA_ROUTES[result.ctaTool];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ ...card, borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR CURRENT POSITIONING</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.currentPositioning}</p>
      </div>

      <div style={{ ...card, borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.red, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHAT IS CAPPING YOUR RATE</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.valueGap}</p>
      </div>

      <div style={card}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>WHAT PREMIUM ACTUALLY REQUIRES</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.whatPremiumActuallyRequires}</p>
      </div>

      <div style={{ ...card, borderColor: "rgba(110,231,183,0.25)", background: "rgba(16,185,129,0.06)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR SHARPEST MOVE RIGHT NOW</div>
        <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: 0 }}>{result.sharpestMove}</p>
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
    if (result.flowId === "lead_ba_transition") return <ResultLeadTransition result={result} onBack={restart} />;
    if (result.flowId === "contractor_positioning") return <ResultContractor result={result} onBack={restart} />;
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
              fontSize: "15px", color: C.text, background: "rgba(0,0,0,0.03)",
              border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.12s",
              fontFamily: "Inter, system-ui, sans-serif", lineHeight: "1.4",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = C.tealBg;
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.tealBorder;
              (e.currentTarget as HTMLButtonElement).style.color = C.teal;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.03)";
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

// ── Resume Loading Screen ───────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  "Procurement", "Purchasing", "RFQ", "RFP", "Expediting", "Supply Chain",
  "Oracle", "Maximo", "SAP S/4HANA", "SAP", "Power BI", "Advanced Excel",
  "Supplier Management", "Vendor Management", "Negotiation", "Contract Management",
  "Inventory Management", "Logistics", "ERP", "Business Analysis", "Stakeholder",
  "Agile", "Scrum", "JIRA", "Project Management", "SQL", "Python", "JavaScript",
  "React", "Six Sigma", "Process Improvement", "Data Analysis", "MS Dynamics",
  "Dynamics AX", "Instrumentation", "Mechanical", "Electrical", "CBAP",
];

function extractTitleFromResume(text: string): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if ((line.includes("|") || line.includes("–")) &&
        !line.startsWith("•") && line.length > 5 && line.length < 80) {
      const part = line.split(/[|–]/)[0].trim();
      if (part.length > 3 && part.length < 50 && !part.match(/^\d/)) return part;
    }
  }
  return "";
}

function extractSkillsFromResume(text: string): string[] {
  return SKILL_KEYWORDS.filter(k => text.toLowerCase().includes(k.toLowerCase())).slice(0, 10);
}

function ResumeLoadingScreen({ resumeText }: { resumeText: string }) {
  const name = extractNameFromResume(resumeText);
  const title = extractTitleFromResume(resumeText);
  const allSkills = extractSkillsFromResume(resumeText);
  const [visibleSkills, setVisibleSkills] = useState<string[]>([]);
  const [msgIdx, setMsgIdx] = useState(0);

  const displayName = name !== "Resume" ? name : null;
  const messages = [
    displayName ? `Reading ${displayName}'s resume...` : "Reading your resume...",
    "Scanning your work history...",
    "Identifying gaps and strengths...",
    "Preparing your questions...",
  ];

  useEffect(() => {
    let i = 0;
    const skillTimer = setInterval(() => {
      if (i < allSkills.length) { setVisibleSkills(prev => [...prev, allSkills[i]]); i++; }
      else clearInterval(skillTimer);
    }, 380);
    const msgTimer = setInterval(() => setMsgIdx(p => (p + 1) % messages.length), 2200);
    return () => { clearInterval(skillTimer); clearInterval(msgTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barWidths = ["88%", "72%", "95%", "65%", "80%", "58%"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "32px 0" }}>
      <div style={{ fontSize: "15px", fontWeight: 600, color: C.text, minHeight: "24px", transition: "opacity 0.3s" }}>
        {messages[msgIdx]}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

        {/* Document preview */}
        <div style={{ background: "#ffffff", border: `1px solid ${C.border}`, borderRadius: "10px", padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          {displayName && <div style={{ fontSize: "15px", fontWeight: 700, color: C.text, marginBottom: "2px" }}>{displayName}</div>}
          {title && <div style={{ fontSize: "12px", color: C.teal, fontWeight: 500, marginBottom: "12px" }}>{title}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {barWidths.map((w, i) => (
              <div key={i} style={{
                height: "9px", width: w, borderRadius: "4px",
                background: "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
                backgroundSize: "200% 100%",
                animation: `shimmer 1.6s ease-in-out infinite ${i * 0.12}s`,
              }} />
            ))}
          </div>
        </div>

        {/* Skills appearing */}
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>
            SKILLS FOUND
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {visibleSkills.map((skill, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", animation: "skillFadeIn 0.3s ease" }}>
                <span style={{ color: C.green, fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: "13px", color: C.text }}>{skill}</span>
              </div>
            ))}
            {visibleSkills.length < allSkills.length && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.4 }}>
                <span style={{ color: C.muted, fontSize: "12px" }}>●</span>
                <div style={{ height: "9px", width: "90px", borderRadius: "4px", background: C.border }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Gap Coach Card ──────────────────────────────────────────────────────────

function GapCoachCard({ gapText, gapState, classification, onAsk, onSubmit, onDismiss }: {
  gapText: string;
  gapState: GapState;
  classification: "addressed_by_bullet" | "addressed_by_reframe" | "perception_risk" | "real_gap";
  onAsk: () => void;
  onSubmit: (answer: string) => void;
  onDismiss: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const { status, result: coaching } = gapState;

  // addressed_by_bullet — static resolved card, no interaction needed
  if (classification === "addressed_by_bullet") {
    return (
      <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(110,231,183,0.35)", display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ color: C.green, fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>✓</span>
        <div>
          <div style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.55 }}>{gapText}</div>
          <div style={{ fontSize: "10px", color: C.green, marginTop: "4px", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em" }}>ADDRESSED BY SUGGESTED BULLET</div>
        </div>
      </div>
    );
  }

  const borderColor = status === "dismissed" ? "#e2e8f0"
    : status === "resolved" && coaching?.type === "bullet" ? "rgba(110,231,183,0.4)"
    : status === "resolved" && coaching?.type === "interview_prep" ? "rgba(251,191,36,0.35)"
    : classification === "addressed_by_reframe" ? "rgba(251,191,36,0.35)"
    : classification === "perception_risk" ? "rgba(251,191,36,0.35)"
    : "#fecaca";

  const bg = status === "dismissed" ? "#f8fafc"
    : status === "resolved" && coaching?.type === "bullet" ? "rgba(16,185,129,0.04)"
    : status === "resolved" && coaching?.type === "interview_prep" ? "rgba(251,191,36,0.04)"
    : classification === "addressed_by_reframe" ? "rgba(251,191,36,0.04)"
    : classification === "perception_risk" ? "rgba(251,191,36,0.04)"
    : "#fef2f2";

  return (
    <div style={{ padding: "14px 16px", borderRadius: "10px", background: bg, border: `1px solid ${borderColor}`, opacity: status === "dismissed" ? 0.5 : 1, transition: "all 0.2s" }}>

      {/* Gap text + classification label */}
      <div style={{ marginBottom: status === "idle" ? "10px" : status === "asking" ? "12px" : status === "resolved" ? "10px" : "0" }}>
        <div style={{ fontSize: "13px", color: status === "dismissed" ? C.faded : C.textMid, lineHeight: 1.55, textDecoration: status === "dismissed" ? "line-through" : "none" }}>
          {gapText}
        </div>
        {status === "idle" && classification === "addressed_by_reframe" && (
          <div style={{ fontSize: "10px", color: C.amber, marginTop: "4px", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em" }}>EXPERIENCE EXISTS — NEEDS BETTER FRAMING</div>
        )}
        {status === "idle" && classification === "perception_risk" && (
          <div style={{ fontSize: "10px", color: C.amber, marginTop: "4px", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em" }}>RECRUITER MAY QUESTION THIS — PREPARE AN ANSWER</div>
        )}
      </div>

      {/* idle */}
      {status === "idle" && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onAsk} style={{ fontSize: "12px", fontWeight: 600, color: C.teal, background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>
            {classification === "addressed_by_reframe" ? "Write a bullet for this" : classification === "perception_risk" ? "Prepare an answer" : "Work through this"}
          </button>
          {(classification === "real_gap" || classification === "perception_risk") && (
            <button onClick={onDismiss} style={{ fontSize: "12px", color: C.faded, background: "transparent", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>
              Not relevant
            </button>
          )}
        </div>
      )}

      {/* loading */}
      {status === "loading" && (
        <div style={{ fontSize: "12px", color: C.faded }}>Working through this…</div>
      )}

      {/* asking */}
      {status === "asking" && gapState.question && (
        <div>
          <p style={{ fontSize: "13px", color: C.text, lineHeight: 1.6, margin: "0 0 10px", fontWeight: 500 }}>{gapState.question}</p>
          <textarea
            rows={3}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: C.text, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", background: "#ffffff" }}
            placeholder="Take your time. Even rough notes work."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => { if (answer.trim()) { onSubmit(answer); setAnswer(""); } }} disabled={!answer.trim()}
              style={{ fontSize: "12px", fontWeight: 600, color: "#fff", background: "#0f172a", border: "none", borderRadius: "6px", padding: "7px 14px", cursor: answer.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: answer.trim() ? 1 : 0.4 }}>
              Submit
            </button>
            <button onClick={onDismiss} style={{ fontSize: "12px", color: C.faded, background: "transparent", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* resolved: bullet */}
      {status === "resolved" && coaching?.type === "bullet" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <span style={{ color: C.green, fontSize: "13px" }}>✓</span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.07em" }}>NEW BULLET</span>
          </div>
          {coaching.where && <div style={{ fontSize: "11px", color: C.faded, marginBottom: "4px" }}>{coaching.where}</div>}
          <div style={{ fontSize: "13px", color: C.text, lineHeight: 1.55, padding: "10px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid rgba(110,231,183,0.4)", marginBottom: "6px" }}>
            {coaching.bullet}
          </div>
          <button onClick={() => navigator.clipboard.writeText(coaching.bullet || "").catch(() => {})}
            style={{ fontSize: "12px", color: C.teal, background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
            Copy
          </button>
        </div>
      )}

      {/* resolved: interview prep */}
      {status === "resolved" && coaching?.type === "interview_prep" && coaching.interviewPrep && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.07em", marginBottom: "8px" }}>ADDRESS IN INTERVIEW</div>
          <div style={{ fontSize: "12px", color: C.faded, fontStyle: "italic", marginBottom: "6px" }}>"{coaching.interviewPrep.likelyQuestion}"</div>
          <div style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.55 }}>{coaching.interviewPrep.framework}</div>
        </div>
      )}

      {/* dismissed */}
      {status === "dismissed" && (
        <div style={{ fontSize: "12px", color: C.faded }}>Dismissed</div>
      )}
    </div>
  );
}

// ── Resume Improvement ──────────────────────────────────────────────────────

interface JDContext { jobTitle: string; company: string; jdText: string; gaps: string[]; score: number; resumeText?: string; improvedResumeText?: string; interviewFocus?: string[]; }

function extractNameFromResume(text: string): string {
  const firstLine = text.split(/\r?\n/).map(l => l.trim()).find(l => l.length > 0) || "";
  const clean = firstLine.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 5 && clean.length <= 60) return clean;
  return "Resume";
}

function ResumeTool({ fullName, onNavigate, intentHeading, onBack, jdContext }: {
  fullName: string;
  onNavigate?: (tool: Tool) => void;
  intentHeading?: { heading: string; subtext: string } | null;
  onBack?: () => void;
  jdContext?: JDContext | null;
}) {
  const [step, setStep] = useState<"upload" | "loading" | "intro" | "question" | "building" | "done">("upload");
  const [resumeText, setResumeText] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [pastedText, setPastedText] = useState("");
  const [buildingStep, setBuildingStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resumeSections, setResumeSections] = useState<Record<string, any> | null>(null);
  const [editedText, setEditedText] = useState("");
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();
  const [questions, setQuestions] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [biggestGap, setBiggestGap] = useState("");
  const [coachIntro, setCoachIntro] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [error, setError] = useState("");
  const autoStartedRef = useRef(false);

  // Auto-start when arriving from JD Analyzer with resume already known
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (jdContext?.resumeText && jdContext.resumeText.length > 100 && step === "upload") {
      autoStartedRef.current = true;
      setResumeText(jdContext.resumeText);
      fetchQuestions(jdContext.resumeText);
    }
  }, [jdContext]);

  useEffect(() => {
    if (step !== "building") return;
    setBuildingStep(0);
    const timers = [
      setTimeout(() => setBuildingStep(1), 2500),
      setTimeout(() => setBuildingStep(2), 6000),
      setTimeout(() => setBuildingStep(3), 10000),
      setTimeout(() => setBuildingStep(4), 13500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const fetchQuestions = async (text: string) => {
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/career/resume-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: text,
          ...(jdContext ? { targetRole: { jobTitle: jdContext.jobTitle, company: jdContext.company }, gaps: jdContext.gaps } : {}),
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setQuestions(data.questions || []);
      setStrengths(data.strengths || []);
      setBiggestGap(data.biggestGap || "");
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
        body: JSON.stringify({ resumeText, questions, answers, fullName: extractNameFromResume(resumeText), jdContext }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Something went wrong");
      setResumeSections(data.sections);
      setEditedText(data.plainText || "");
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

  const buildingSteps = [
    "Reading your original resume",
    "Analysing your answers",
    "Rewriting your experience",
    jdContext ? `Tailoring for ${jdContext.jobTitle}` : "Optimising language and impact",
    "Optimising ATS keywords",
  ];

  // Loading — reading the resume
  if (step === "loading") return <ResumeLoadingScreen resumeText={resumeText} />;

  // Building the improved resume — animated steps
  if (step === "building") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "40px 0" }}>
      <div style={{ fontSize: "16px", fontWeight: 700, color: C.text, marginBottom: "20px" }}>Building your improved resume...</div>
      {buildingSteps.map((s, i) => {
        const done = i < buildingStep;
        const active = i === buildingStep;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", opacity: i > buildingStep ? 0.3 : 1, transition: "opacity 0.5s" }}>
            <div style={{ width: "20px", textAlign: "center", fontSize: "14px", flexShrink: 0, color: done ? "#22c55e" : active ? C.teal : C.muted, fontWeight: 700 }}>
              {done ? "✓" : active ? "●" : "○"}
            </div>
            <span style={{ fontSize: "14px", color: done ? "#22c55e" : active ? C.text : C.muted, fontWeight: active ? 600 : 400, transition: "color 0.3s" }}>{s}</span>
          </div>
        );
      })}
    </div>
  );

  // Done
  if (step === "done") {
    const handleDownloadWord = async () => {
      if (!resumeSections) return;
      setDownloading(true);
      try {
        const res = await fetch("/api/career/resume/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: resumeSections, name: extractNameFromResume(resumeText) }),
        });
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${extractNameFromResume(resumeText).replace(/\s+/g, "_") || "Resume"}_Improved_Resume.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* silent */ } finally { setDownloading(false); }
    };

    const handleReScore = () => {
      try {
        sessionStorage.setItem("career_jd_targeted", JSON.stringify({ ...jdContext, improvedResumeText: editedText }));
      } catch { /* ignore */ }
      router.push("/career?cat=land&intent=analyze_job_description&from=resume_builder");
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header + actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: C.green, letterSpacing: "-0.02em" }}>Your resume is ready.</div>
            <div style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>Review and edit below, then download or re-analyze.</div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={handleDownloadWord} disabled={downloading}
              style={{ padding: "10px 20px", borderRadius: "8px", background: C.green, color: "#fff", fontSize: "13px", fontWeight: 600, border: "none", cursor: downloading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: downloading ? 0.6 : 1 }}>
              {downloading ? "Preparing…" : "Download Word file"}
            </button>
            {jdContext && (
              <button onClick={handleReScore}
                style={{ padding: "10px 20px", borderRadius: "8px", background: C.tealBg, border: `1px solid ${C.tealBorder}`, color: C.teal, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Re-analyze against {jdContext.jobTitle}
              </button>
            )}
            {jdContext && (
              <button
                onClick={() => {
                  try {
                    sessionStorage.setItem("career_interview_context", JSON.stringify({
                      jdText: jdContext.jdText,
                      company: jdContext.company,
                      resumeText: editedText,
                      gaps: jdContext.gaps ?? [],
                      interviewFocus: jdContext.interviewFocus ?? [],
                    }));
                  } catch { /* ignore */ }
                  router.push("/career?cat=grow&intent=interview_preparation");
                }}
                style={{ padding: "10px 20px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Prep for this interview
              </button>
            )}
          </div>
        </div>

        {/* Editable resume */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR IMPROVED RESUME — EDIT DIRECTLY</div>
          <ResumeEditor
            html={resumeSections ? sectionsToHtml(resumeSections, fullName || "") : ""}
            onChange={setEditedText}
          />
        </div>

        {/* Bottom actions */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {!jdContext && onNavigate && (
            <button onClick={() => onNavigate("cover-letter")}
              style={{ padding: "10px 20px", borderRadius: "8px", background: C.tealBg, border: `1px solid ${C.tealBorder}`, color: C.teal, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Write a cover letter
            </button>
          )}
          <button onClick={() => { setStep("upload"); setResumeText(""); setPastedText(""); setInputMode("upload"); setQuestions([]); setAnswers([]); setQIdx(0); setResumeSections(null); setEditedText(""); }}
            style={{ padding: "10px 20px", borderRadius: "8px", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            Start with a different resume
          </button>
        </div>

      </div>
    );
  }

  // Intro — coach intro + structured first impression
  if (step === "intro") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {coachIntro && (
        <p style={{ fontSize: "15px", color: C.text, lineHeight: "1.7", margin: 0 }}>
          {coachIntro}
        </p>
      )}

      {(strengths.length > 0 || biggestGap) && (
        <div style={{ ...card, borderLeft: `3px solid ${C.teal}`, background: "rgba(8,145,178,0.05)", padding: "20px 24px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "16px" }}>FIRST IMPRESSION</div>

          {strengths.length > 0 && (
            <div style={{ marginBottom: biggestGap ? "16px" : 0 }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.07em", marginBottom: "8px" }}>WHAT IS WORKING</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {strengths.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ color: C.green, fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>✓</span>
                    <span style={{ fontSize: "14px", color: C.text, lineHeight: 1.55 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {biggestGap && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.amber, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.07em", marginBottom: "8px" }}>BIGGEST OPPORTUNITY</div>
              <p style={{ fontSize: "14px", color: C.text, lineHeight: 1.55, margin: 0 }}>{biggestGap}</p>
            </div>
          )}
        </div>
      )}

      <button style={{ ...btn(), alignSelf: "flex-start", padding: "12px 28px" }}
        onClick={() => setStep("question")}>
        Start the questions
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
            onChange={e => { setError(""); setAnswers(prev => { const a = [...prev]; a[qIdx] = e.target.value; return a; }); }}
          />
        </div>

        {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button style={{ ...btn(), padding: "12px 28px" }} onClick={advanceQuestion}>
            {isLast ? "Build my improved resume" : "Next question"}
          </button>
          <button style={{ ...btn("ghost") }} onClick={() => { setError(""); advanceQuestion(); }}>
            Skip this one
          </button>
          {qIdx > 0 && (
            <button style={btn("ghost")} onClick={() => { setQIdx(qIdx - 1); setError(""); }}>
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

      {/* Targeted mode banner */}
      {jdContext && (
        <div style={{ padding: "14px 18px", borderRadius: "10px", background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.2)", borderLeft: "3px solid #7c3aed" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "4px" }}>TARGETED MODE</div>
          <p style={{ fontSize: "13px", color: C.text, margin: 0, lineHeight: 1.5 }}>
            Building your resume for: <strong>{jdContext.jobTitle}</strong> at <strong>{jdContext.company}</strong>. The questions will focus on the gaps identified in your analysis.
          </p>
        </div>
      )}

      {intentHeading ? (
        <div>
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
            border: `1px solid ${inputMode === mode ? C.tealBorder : C.border}`,
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

      <p style={{ fontSize: "12px", color: C.faded, lineHeight: "1.5", margin: 0 }}>
        Your resume is only used to generate your improved version. Nothing is stored or shared.
      </p>

      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}

      <button style={{ ...btn(), alignSelf: "flex-start", padding: "12px 28px", opacity: (!activeResumeText || activeResumeText.length < 100) ? 0.4 : 1 }}
        disabled={!activeResumeText || activeResumeText.length < 100} onClick={() => fetchQuestions(activeResumeText)}>
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
  const [mode, setMode] = useState<"write" | "review">("write");
  const [step, setStep] = useState<"setup" | "questions" | "loading" | "preview" | "done">("setup");
  const [letterContent, setLetterContent] = useState<{ opening: string; body1: string; body2: string; closing: string; jobTitle: string; company: string } | null>(null);
  const [letterPreviewText, setLetterPreviewText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [jdSummary, setJdSummary] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");

  // Review mode state
  const [coverLetterText, setCoverLetterText] = useState("");
  const [reviewJdText, setReviewJdText] = useState("");
  const [reviewResumeText, setReviewResumeText] = useState("");
  const [reviewResult, setReviewResult] = useState<null | {
    verdict: string; topStrength: string; topFix: string;
    sections: { label: string; original: string; status: "strong" | "needs-work" | "cut"; feedback: string; rewrite?: string }[];
    missing: string[];
  }>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewLoadingStep, setReviewLoadingStep] = useState(0);
  const [reviewError, setReviewError] = useState("");
  const [sectionChoices, setSectionChoices] = useState<Record<number, "apply" | "keep" | "cut">>({});
  const [assembledLetter, setAssembledLetter] = useState("");
  const [activeSection, setActiveSection] = useState(0);

  // Auto-load context when arriving from JD Analyzer
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("career_jd_context");
      if (raw) {
        const ctx = JSON.parse(raw);
        sessionStorage.removeItem("career_jd_context");
        if (ctx.jdText) setJdText(ctx.jdText);
        if (ctx.resumeText) {
          setResumeText(ctx.resumeText);
          fetchQuestions(ctx.jdText, ctx.resumeText);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runReview = async () => {
    setReviewLoading(true);
    setReviewLoadingStep(0);
    setReviewError("");
    setReviewResult(null);
    setSectionChoices({});
    setAssembledLetter("");
    setActiveSection(0);
    try {
      const res = await fetch("/api/career/cover-letter/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter: coverLetterText, jdText: reviewJdText, resumeText: reviewResumeText }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setReviewResult(data);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setReviewLoading(false);
    }
  };

  const fetchQuestions = async (jdOverride?: string, resumeOverride?: string) => {
    const jd = jdOverride ?? jdText;
    const resume = resumeOverride ?? resumeText;
    setStep("loading");
    setLoadingMsg("Reviewing resume and job description…");
    setError("");
    try {
      const res = await fetch("/api/career/cover-letter-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: resume, jdText: jd }),
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

  const generateLetter = async () => {
    setStep("loading");
    setLoadingMsg("Writing your cover letter…");
    setError("");
    try {
      const letterRes = await fetch("/api/career/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText, questions, answers, fullName }),
      });
      const letter = await letterRes.json();
      if (!letterRes.ok || letter.error) throw new Error(letter.error || "Failed to generate letter");
      setLetterContent(letter);
      // Assemble plain text for editing
      const assembled = [letter.opening, letter.body1, letter.body2, letter.closing].filter(Boolean).join("\n\n");
      setLetterPreviewText(assembled);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("questions");
    }
  };

  const downloadLetter = async () => {
    setLoadingMsg("Preparing your Word document…");
    setError("");
    try {
      const exportRes = await fetch("/api/career/cover-letter/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...letterContent, fullName }),
      });
      if (!exportRes.ok) {
        const data = await exportRes.json().catch(() => ({}));
        throw new Error(data.error || "Export failed");
      }
      const blob = await exportRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(fullName || "CoverLetter").replace(/\s+/g, "_")}_Cover_Letter.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  // Must be before any early returns — hooks cannot come after conditional returns
  useEffect(() => {
    if (!reviewLoading) return;
    setReviewLoadingStep(0);
    const id = setInterval(() => {
      setReviewLoadingStep(s => { if (s >= 3) { clearInterval(id); return s; } return s + 1; });
    }, 900);
    return () => clearInterval(id);
  }, [reviewLoading]);

  if (step === "loading") return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ color: C.teal, fontSize: "15px", marginBottom: "8px" }}>{loadingMsg}</div>
    </div>
  );

  if (step === "preview") return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 700, color: C.text, marginBottom: "4px" }}>Your cover letter</div>
        <p style={{ fontSize: "13px", color: C.muted, margin: "0 0 10px" }}>Read through it and edit anything before downloading. Changes here update the downloaded file.</p>
      </div>
      <textarea
        rows={20}
        value={letterPreviewText}
        onChange={e => {
          setLetterPreviewText(e.target.value);
          // Keep letterContent in sync so download uses edited text
          if (letterContent) {
            const paras = e.target.value.split(/\n\n+/);
            setLetterContent({ ...letterContent, opening: paras[0] || "", body1: paras[1] || "", body2: paras[2] || "", closing: paras[3] || "" });
          }
        }}
        style={{ ...textarea(20), fontFamily: "inherit", fontSize: "14px", lineHeight: "1.75" }}
      />
      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button style={btn()} onClick={downloadLetter}>Download as Word</button>
        <button style={btn("ghost")} onClick={() => navigator.clipboard.writeText(letterPreviewText).catch(() => {})}>Copy text</button>
        <button style={btn("ghost")} onClick={() => setStep("questions")}>Back to questions</button>
      </div>
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
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button
          style={{ ...btn(), opacity: answers.every(a => !a.trim()) ? 0.4 : 1 }}
          disabled={answers.every(a => !a.trim())}
          onClick={generateLetter}
        >Generate my cover letter</button>
        <button style={btn("ghost")} onClick={() => setStep("setup")}>Back</button>
        {answers.every(a => !a.trim()) && (
          <span style={{ fontSize: "12px", color: C.faded }}>Answer at least one question first.</span>
        )}
      </div>
    </div>
  );

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
    cursor: "pointer", border: "none", fontFamily: "inherit",
    background: active ? "#0f172a" : "transparent",
    color: active ? "#fff" : C.muted,
    transition: "all 0.15s",
  });

  // ── Review mode UI ──────────────────────────────────────────────────────────
  if (mode === "review") {
    const statusColor = (s: string) => s === "strong" ? C.green : s === "needs-work" ? C.amber : C.red;
    const statusLabel = (s: string) => s === "strong" ? "Strong" : s === "needs-work" ? "Needs work" : "Cut this";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "2px", background: C.panel, borderRadius: "8px", padding: "3px", alignSelf: "flex-start" }}>
          <button style={tabStyle(false)} onClick={() => { setMode("write"); setReviewResult(null); }}>Write a letter</button>
          <button style={tabStyle(true)}>Review my letter</button>
        </div>

        {!reviewResult ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Loading overlay — ticks in while API runs, inputs stay visible */}
            {reviewLoading && (
              <div style={{ background: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: "12px", padding: "20px 24px" }}>
                {[
                  "Reading your cover letter",
                  "Reading the job description",
                  "Comparing both documents",
                  "Reviewing paragraph by paragraph",
                ].map((step, i) => {
                  const done = reviewLoadingStep > i;
                  const active = reviewLoadingStep === i;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: i < 3 ? "10px" : 0 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                        background: done ? C.teal : active ? C.tealBg : "#f1f5f9",
                        border: `2px solid ${done ? C.teal : active ? C.teal : "#e2e8f0"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {done && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        {active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.teal }} />}
                      </div>
                      <span style={{ fontSize: "13px", color: done ? C.textMid : active ? C.text : C.muted, fontWeight: active ? 600 : 400 }}>{step}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action bar — description left, button right, always visible */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <p style={{ fontSize: "13px", color: C.muted, lineHeight: 1.5, margin: 0 }}>
                Get clear feedback on what works, what is missing, and what to improve. Your voice stays yours.
              </p>
              <button
                style={{ ...btn(), flexShrink: 0, opacity: coverLetterText.trim().length < 50 || reviewJdText.trim().length < 50 ? 0.4 : 1 }}
                disabled={coverLetterText.trim().length < 50 || reviewJdText.trim().length < 50 || reviewLoading}
                onClick={runReview}>
                {reviewLoading ? "Reviewing…" : "Review my letter →"}
              </button>
            </div>

            {reviewError && <div style={{ color: C.red, fontSize: "13px" }}>{reviewError}</div>}

            {/* Two column input area */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "12px", alignItems: "start" }}>

              {/* Left — cover letter is the hero */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={label}>Cover letter</span>
                <textarea
                  rows={14}
                  style={{ ...textarea(14), resize: "vertical", fontFamily: "inherit" }}
                  placeholder="Paste your cover letter here…"
                  value={coverLetterText}
                  onChange={e => setCoverLetterText(e.target.value)}
                />
              </div>

              {/* Right — supporting context */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <span style={label}>Job description</span>
                  <textarea
                    rows={6}
                    style={textarea(6)}
                    placeholder="Paste the job description here…"
                    value={reviewJdText}
                    onChange={e => setReviewJdText(e.target.value)}
                  />
                </div>

                <FileUpload label="Resume (optional)" onParsed={(text) => setReviewResumeText(text)} />

                <div style={{ borderTop: `1px solid ${C.borderSoft}`, paddingTop: "10px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: C.muted, letterSpacing: "0.08em", fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>YOU WILL RECEIVE</div>
                  {["Overall verdict", "What works and what to cut", "Missing points the JD expects", "Paragraph by paragraph feedback", "Suggested revisions in your voice"].map((item) => (
                    <div key={item} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.teal, flexShrink: 0, marginTop: "5px" }} />
                      <span style={{ fontSize: "12px", color: C.muted, lineHeight: 1.45 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Verdict — full width header */}
            <div>
              <p style={{ fontSize: "15px", color: C.text, lineHeight: 1.75, margin: "0 0 8px", fontWeight: 500 }}>{reviewResult.verdict}</p>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "12px", color: C.green, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "12px", color: C.textMid, lineHeight: 1.5 }}>{reviewResult.topStrength}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "12px", color: C.amber, fontWeight: 700, flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: "12px", color: C.textMid, lineHeight: 1.5 }}>Fix first: {reviewResult.topFix}</span>
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "16px", alignItems: "start" }}>

              {/* Left — paragraph list, clickable */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {reviewResult.sections.map((sec, i) => {
                  const borderCol = sec.status === "strong" ? C.green : sec.status === "needs-work" ? C.amber : C.red;
                  const statusText = sec.status === "strong" ? "Strong" : sec.status === "needs-work" ? "Needs work" : "Cut this";
                  const isActive = activeSection === i;
                  const choice = sectionChoices[i] ?? (sec.status === "strong" ? "keep" : sec.status === "needs-work" ? "apply" : "cut");
                  return (
                    <div key={i}
                      onClick={() => setActiveSection(i)}
                      style={{
                        paddingLeft: "14px", borderLeft: `3px solid ${borderCol}`,
                        cursor: "pointer", borderRadius: "0 8px 8px 0",
                        background: isActive ? `${borderCol}08` : "transparent",
                        padding: "10px 12px 10px 14px",
                        transition: "background 0.15s",
                      }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: borderCol, letterSpacing: "0.07em", marginBottom: "6px" }}>{statusText.toUpperCase()}</div>
                      <p style={{
                        fontSize: "13px", lineHeight: 1.65, margin: 0,
                        color: choice === "cut" ? C.muted : C.text,
                        opacity: choice === "cut" ? 0.5 : 1,
                        textDecoration: choice === "cut" ? "line-through" : "none",
                        display: "-webkit-box", WebkitLineClamp: isActive ? undefined : 3,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: isActive ? "visible" : "hidden",
                      }}>
                        {sec.original}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Right — feedback panel, sticky */}
              <div style={{ position: "sticky", top: "16px" }}>
                {(() => {
                  const sec = reviewResult.sections[activeSection];
                  if (!sec) return null;
                  const borderCol = sec.status === "strong" ? C.green : sec.status === "needs-work" ? C.amber : C.red;
                  const statusText = sec.status === "strong" ? "Strong" : sec.status === "needs-work" ? "Needs work" : "Cut this";
                  const defaultChoice = sec.status === "strong" ? "keep" : sec.status === "needs-work" ? "apply" : "cut";
                  const choice = sectionChoices[activeSection] ?? defaultChoice;
                  const pillBtn = (active: boolean): React.CSSProperties => ({
                    fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "20px",
                    border: `1px solid ${active ? "#0f172a" : C.border}`,
                    background: active ? "#0f172a" : "transparent",
                    color: active ? "#fff" : C.muted,
                    cursor: "pointer", fontFamily: "inherit",
                  });
                  return (
                    <div style={{ background: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: borderCol, letterSpacing: "0.07em" }}>{statusText.toUpperCase()}</div>
                      <p style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.65, margin: 0 }}>{sec.feedback}</p>

                      {sec.rewrite && choice !== "keep" && (
                        <div style={{ paddingLeft: "12px", borderLeft: `2px solid ${C.teal}` }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: C.teal, letterSpacing: "0.07em", marginBottom: "8px" }}>SUGGESTED FIX</div>
                          <p style={{ fontSize: "13px", color: C.text, lineHeight: 1.65, margin: "0 0 8px" }}>{sec.rewrite}</p>
                          <button onClick={() => navigator.clipboard.writeText(sec.rewrite!).catch(() => {})}
                            style={{ fontSize: "11px", fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Copy</button>
                        </div>
                      )}

                      {sec.status === "needs-work" && sec.rewrite && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button style={pillBtn(choice === "apply")} onClick={() => setSectionChoices(p => ({ ...p, [activeSection]: "apply" }))}>Apply fix</button>
                          <button style={pillBtn(choice === "keep")} onClick={() => setSectionChoices(p => ({ ...p, [activeSection]: "keep" }))}>Keep original</button>
                        </div>
                      )}
                      {sec.status === "cut" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button style={pillBtn(choice === "cut")} onClick={() => setSectionChoices(p => ({ ...p, [activeSection]: "cut" }))}>Cut this</button>
                          <button style={pillBtn(choice === "keep")} onClick={() => setSectionChoices(p => ({ ...p, [activeSection]: "keep" }))}>Keep it</button>
                        </div>
                      )}

                      {/* Navigate between sections */}
                      <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: `1px solid ${C.borderSoft}` }}>
                        <button disabled={activeSection === 0}
                          style={{ fontSize: "12px", color: activeSection === 0 ? C.muted : C.text, background: "none", border: "none", cursor: activeSection === 0 ? "default" : "pointer", padding: 0, fontFamily: "inherit", opacity: activeSection === 0 ? 0.4 : 1 }}
                          onClick={() => setActiveSection(s => Math.max(0, s - 1))}>← Previous</button>
                        <span style={{ fontSize: "12px", color: C.muted }}>{activeSection + 1} of {reviewResult.sections.length}</span>
                        <button disabled={activeSection === reviewResult.sections.length - 1}
                          style={{ fontSize: "12px", color: activeSection === reviewResult.sections.length - 1 ? C.muted : C.text, background: "none", border: "none", cursor: activeSection === reviewResult.sections.length - 1 ? "default" : "pointer", padding: 0, fontFamily: "inherit", opacity: activeSection === reviewResult.sections.length - 1 ? 0.4 : 1 }}
                          onClick={() => setActiveSection(s => Math.min(reviewResult.sections.length - 1, s + 1))}>Next →</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Worth adding */}
            {reviewResult.missing.length > 0 && (
              <div style={{ paddingTop: "20px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>WORTH ADDING BEFORE YOU SEND</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {reviewResult.missing.map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "13px", color: C.muted, flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.6 }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assembly */}
            <div style={{ paddingTop: "20px", borderTop: `1px solid ${C.border}` }}>
              {!assembledLetter ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  <p style={{ fontSize: "13px", color: C.muted, margin: 0 }}>Happy with your choices? Build the revised letter and copy it.</p>
                  <button style={{ ...btn(), flexShrink: 0 }} onClick={() => {
                    const paras = reviewResult.sections.map((sec, i) => {
                      const choice = sectionChoices[i] ?? (sec.status === "strong" ? "keep" : sec.status === "needs-work" ? "apply" : "cut");
                      if (choice === "cut") return null;
                      if (choice === "apply" && sec.rewrite) return sec.rewrite;
                      return sec.original;
                    }).filter(Boolean);
                    setAssembledLetter(paras.join("\n\n"));
                  }}>Build my revised letter</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>YOUR REVISED LETTER</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button style={{ ...btn(), fontSize: "12px", padding: "6px 14px" }}
                        onClick={() => navigator.clipboard.writeText(assembledLetter).catch(() => {})}>Copy full letter</button>
                      <button style={{ ...btn("ghost"), fontSize: "12px", padding: "6px 14px" }}
                        onClick={() => setAssembledLetter("")}>Reconfigure</button>
                    </div>
                  </div>
                  <textarea value={assembledLetter} onChange={e => setAssembledLetter(e.target.value)}
                    rows={16} style={{ ...textarea(16), fontFamily: "inherit", fontSize: "14px", lineHeight: "1.75" }} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button style={btn("ghost")} onClick={() => { setMode("write"); setReviewResult(null); }}>Write a new letter instead</button>
              <button style={btn("ghost")} onClick={() => { setReviewResult(null); setAssembledLetter(""); }}>Review a different letter</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Write mode UI ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", background: C.panel, borderRadius: "8px", padding: "3px", alignSelf: "flex-start" }}>
        <button style={tabStyle(true)}>Write a letter</button>
        <button style={tabStyle(false)} onClick={() => setMode("review")}>Review my letter</button>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <p style={{ fontSize: "13px", color: C.muted, lineHeight: 1.5, margin: 0 }}>
          {intentHeading ? intentHeading.subtext : "Paste the job description and upload your resume. I will ask two or three questions and write a letter specific to this role."}
        </p>
        <button style={{ ...btn(), flexShrink: 0, opacity: (!resumeText || jdText.trim().length < 50) ? 0.4 : 1 }}
          disabled={!resumeText || jdText.trim().length < 50} onClick={() => fetchQuestions()}>
          Next →
        </button>
      </div>

      {error && <div style={{ color: C.red, fontSize: "13px" }}>{error}</div>}

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "12px", alignItems: "start" }}>
        <div>
          <span style={label}>Job description</span>
          <textarea rows={14} style={{ ...textarea(14) }} placeholder="Paste the full job description here…"
            value={jdText} onChange={e => setJdText(e.target.value)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <FileUpload label="Your resume" onParsed={(text) => setResumeText(text)} />
          <div style={{ borderTop: `1px solid ${C.borderSoft}`, paddingTop: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: C.muted, letterSpacing: "0.08em", fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>HOW IT WORKS</div>
            {["Reads your resume and the job description", "Asks 2 to 3 targeted questions", "Writes a letter specific to this role", "Download as Word when done"].map(item => (
              <div key={item} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "6px" }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.teal, flexShrink: 0, marginTop: "5px" }} />
                <span style={{ fontSize: "12px", color: C.muted, lineHeight: 1.45 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Apply Engine helpers ──────────────────────────────────────────────────────

async function downloadDocx(text: string, type: "resume" | "cover_letter", fileName: string) {
  try {
    const res = await fetch("/api/career/generate-docx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, type, fileName }) });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch { /* ignore */ }
}

function CopyBlock({ label, text, mono, onDownload }: { label: string; text: string; mono?: boolean; onDownload?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: C.faded, letterSpacing: "0.1em" }}>{label}</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {onDownload && (
            <button onClick={onDownload} style={{ fontSize: "12px", fontWeight: 600, color: C.muted, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>
              Download .docx
            </button>
          )}
          <button onClick={copy} style={{ fontSize: "12px", fontWeight: 600, color: C.teal, background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
      <pre style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: mono ? "JetBrains Mono, monospace" : "inherit", maxHeight: "520px", overflowY: "auto" }}>{text}</pre>
    </div>
  );
}

// ── JD Analyzer helpers ──────────────────────────────────────────────────────

function BulletCard({ where, bullet, type, replaces, source_line, claim_type }: { where: string; bullet: string; type: "replace" | "add"; replaces?: string | null; source_line?: string | null; claim_type?: "confirmed" | "inference" | "new_info" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(bullet).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const isInference = claim_type === "inference";
  const isNewInfo = claim_type === "new_info";
  const borderColor = isNewInfo ? "rgba(239,68,68,0.25)" : isInference ? "rgba(251,191,36,0.35)" : type === "replace" ? "rgba(251,191,36,0.2)" : "rgba(16,185,129,0.2)";
  const bg = isNewInfo ? "rgba(239,68,68,0.04)" : isInference ? "rgba(251,191,36,0.05)" : type === "replace" ? "rgba(251,191,36,0.05)" : "rgba(16,185,129,0.05)";

  return (
    <div style={{ padding: "14px 16px", borderRadius: "10px", background: bg, border: `1px solid ${borderColor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
        <div>
          <span style={{ fontSize: "10px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.07em", color: isNewInfo ? "#dc2626" : isInference ? C.amber : type === "replace" ? C.amber : C.green }}>
            {isNewInfo ? "CONSIDER ADDING" : type === "replace" ? "REPLACE" : "ADD NEW"}
          </span>
          <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{where}</div>
        </div>
        <button onClick={copy} style={{ ...btn("ghost"), fontSize: "12px", padding: "4px 10px", flexShrink: 0 }}>{copied ? "Copied" : "Copy"}</button>
      </div>
      {type === "replace" && replaces && (
        <div style={{ fontSize: "12px", color: C.muted, fontStyle: "italic", marginBottom: "6px" }}>Remove: &ldquo;{replaces}…&rdquo;</div>
      )}
      <div style={{ fontSize: "14px", color: C.text, lineHeight: "1.5", marginBottom: (source_line || isInference || isNewInfo) ? "8px" : "0" }}>{bullet}</div>
      {source_line && !isNewInfo && (
        <div style={{ fontSize: "11px", color: C.muted, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "7px" }}>
          Based on: <span style={{ fontStyle: "italic" }}>&ldquo;{source_line}&rdquo;</span>
        </div>
      )}
      {isInference && (
        <div style={{ fontSize: "11px", color: "#92400e", background: "#fef9ec", border: "1px solid #fde68a", borderRadius: "5px", padding: "5px 9px", marginTop: source_line ? "6px" : "0" }}>
          We inferred this from your resume — confirm it is accurate before using it in an interview.
        </div>
      )}
      {isNewInfo && (
        <div style={{ fontSize: "11px", color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "5px", padding: "5px 9px" }}>
          This detail is not on your current resume. Only use it if it accurately describes your experience.
        </div>
      )}
    </div>
  );
}

function ProfileSuggestionCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ position: "relative", padding: "14px 16px", borderRadius: "10px", background: C.tealBg, border: `1px solid ${C.tealBorder}` }}>
      <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.6", margin: "0 0 10px" }}>{text}</p>
      <button onClick={copy} style={{ ...btn("ghost"), fontSize: "12px", padding: "4px 10px" }}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

// ── JD Analyzer ─────────────────────────────────────────────────────────────

function JDAnalyzerTool({ intentHeading, onBack, returningContext }: {
  intentHeading?: { heading: string; subtext: string } | null;
  onBack?: () => void;
  returningContext?: JDContext | null;
}) {
  const router = useRouter();
  const [jdText, setJdText] = useState(returningContext?.jdText ?? "");
  const [resumeText, setResumeText] = useState(returningContext?.improvedResumeText ?? "");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState("");
  const [quickMessage, setQuickMessage] = useState<string | null>(null);
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [fitAnswer, setFitAnswer] = useState<string | null>(null);
  const [generatingFit, setGeneratingFit] = useState(false);
  const [fitError, setFitError] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [extraResult, setExtraResult] = useState<null | { verdict: string; gapsAddressed: string[]; positioningNote: string; resumeBullet: string | null }>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [extraError, setExtraError] = useState("");
  const [diagnosis, setDiagnosis] = useState<"accurate" | "more_experience" | "wrong_resume" | null>(null);
  const [jdFileLoading, setJdFileLoading] = useState(false);
  const [resumeFileLoading, setResumeFileLoading] = useState(false);
  const [savedJobId, setSavedJobId] = useState<string | null>(null);
  const [savingJob, setSavingJob] = useState(false);
  const [jobSaved, setJobSaved] = useState(false);
  const [roleContextOpen, setRoleContextOpen] = useState(false);
  const jdRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (!result && !loading) jdRef.current?.focus(); }, []);

  const [jdUploadError, setJdUploadError] = useState("");
  const [resumeUploadError, setResumeUploadError] = useState("");

  const parseFile = async (file: File, onDone: (text: string) => void, setLoading: (v: boolean) => void, setErr?: (e: string) => void) => {
    setLoading(true);
    setErr?.("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/career/parse-resume", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (data.text) { onDone(data.text); }
      else if (data.error) { setErr?.(data.error); }
      else { setErr?.("Could not read that file. Try a Word document or paste the text directly."); }
    } catch { setErr?.("Could not read that file. Try a Word document or paste the text directly."); }
    finally { setLoading(false); }
  };
  const [jdTruncated, setJdTruncated] = useState(false);
  const [gapCoaching, setGapCoaching] = useState<Record<number, GapState>>({});
  const [applicationPackage, setApplicationPackage] = useState<null | {
    jobTitle: string; company: string;
    tailoredResume: string; changes: string[];
    risk: string | null; riskPrep: string | null;
    coverLetter: string; whyInterested: string; whyGoodFit: string;
    interviewQuestions: { question: string; answer: string }[];
  }>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "cover" | "answers" | "interview">("resume");
  const [loadingText, setLoadingText] = useState("Building your application...");
  const [interviewPhase, setInterviewPhase] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<{ question: string; targets: string }[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [qaAnswers, setQaAnswers] = useState<{ question: string; answer: string | null }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [result, setResult] = useState<null | {
    jobTitle: string;
    company: string;
    matchScore: number | null;
    decision: string | null;
    strengths: string[];
    gaps: { text: string; type: "visibility" | "experience"; difficulty: "easy" | "moderate" | "hard" }[];
    howToPosition: string;
    whatThisRoleIsAbout: string;
    interviewFocus: string[];
    // kept for backward compat / deep-detail expand
    resumeAlignment: {
      strengths: string[];
      gaps: string[];
      suggestedBullets: { where: string; bullet: string; type: "replace" | "add"; replaces?: string | null; source_line?: string | null; claim_type?: "confirmed" | "inference" | "new_info" }[];
      suggestedRemovals: { where: string; what: string; reason: string }[];
      profileSuggestion: { current: string; suggested: string | null; needsRevision: boolean } | null;
      gapClassifications?: { gapIndex: number; classification: "addressed_by_bullet" | "addressed_by_reframe" | "perception_risk" | "real_gap"; reframe_evidence?: string | null }[];
    } | null;
  }>(null);

  const JD_STAGES = resumeText.trim().length > 100 ? [
    "Reading job description",
    "Extracting requirements and responsibilities",
    "Identifying must-have skills",
    "Analysing the business context",
    "Matching against your resume",
    "Writing your suggested bullets",
    "Drafting profile improvements",
  ] : [
    "Reading job description",
    "Extracting requirements and responsibilities",
    "Identifying must-have skills",
    "Analysing the business context",
    "Putting your analysis together",
  ];

  const askAboutGap = async (gapIdx: number, gapText: string) => {
    if (!result) return;
    setGapCoaching(prev => ({ ...prev, [gapIdx]: { status: "loading" } }));
    try {
      const res = await fetch("/api/career/gap-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gap: gapText, resumeText, jdText, jobTitle: result.jobTitle, company: result.company }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setGapCoaching(prev => ({ ...prev, [gapIdx]: { status: "asking", question: data.question } }));
    } catch {
      setGapCoaching(prev => ({ ...prev, [gapIdx]: { status: "idle" } }));
    }
  };

  const submitGapAnswer = async (gapIdx: number, gapText: string, answer: string) => {
    if (!result) return;
    setGapCoaching(prev => ({ ...prev, [gapIdx]: { ...prev[gapIdx], status: "loading", answer } }));
    try {
      const res = await fetch("/api/career/gap-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gap: gapText, resumeText, jdText, jobTitle: result.jobTitle, company: result.company, userAnswer: answer }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setGapCoaching(prev => ({ ...prev, [gapIdx]: { ...prev[gapIdx], status: "resolved", result: data } }));
    } catch {
      setGapCoaching(prev => ({ ...prev, [gapIdx]: { ...prev[gapIdx], status: "asking" } }));
    }
  };

  const dismissGap = (gapIdx: number) =>
    setGapCoaching(prev => ({ ...prev, [gapIdx]: { status: "dismissed" } }));

  const buildPackage = async (qa: { question: string; answer: string | null }[]) => {
    setInterviewPhase(false);
    setLoadingText("Building your application... About 30 seconds.");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/career/apply-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, resumeText, qaContext: qa }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Something went wrong");
      setApplicationPackage(data);
      setGapCoaching({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const analyse = async () => {
    setDiagnosis(null);
    setQuickMessage(null);
    setSavedJobId(null);
    setJobSaved(false);
    setApplicationPackage(null);
    setActiveTab("resume");
    setInterviewPhase(false);
    setInterviewQuestions([]);
    setCurrentQ(0);
    setQaAnswers([]);
    setCurrentAnswer("");
    setError("");

    setLoadingText("Reviewing your resume against this role...");
    setLoading(true);
    try {
      const res = await fetch("/api/career/apply-engine/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, resumeText }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({ questions: [] }));
      const qs: { question: string; targets: string }[] = data.questions ?? [];
      setLoading(false);

      if (qs.length === 0) {
        await buildPackage([]);
      } else {
        setInterviewQuestions(qs);
        setQaAnswers(qs.map(q => ({ question: q.question, answer: null })));
        setInterviewPhase(true);
      }
    } catch {
      setLoading(false);
      await buildPackage([]);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: C.text, marginBottom: "8px" }}>{loadingText}</div>
        <div style={{ fontSize: "13px", color: C.faded }}>
          {loadingText.includes("30 seconds") ? "Resume, cover letter, and interview prep." : "This only takes a few seconds."}
        </div>
      </div>
    </div>
  );

  if (interviewPhase && interviewQuestions.length > 0) {
    const q = interviewQuestions[currentQ];
    const isLast = currentQ === interviewQuestions.length - 1;
    const total = interviewQuestions.length;

    const saveAndAdvance = (answer: string | null) => {
      const updated = [...qaAnswers];
      updated[currentQ] = { question: q.question, answer };
      setQaAnswers(updated);
      setCurrentAnswer("");
      // Save to vault immediately — answer is preserved even if package generation fails
      if (answer?.trim()) {
        fetch("/api/career/profile/vault", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q.question, answer, jdText }) }).catch(() => {});
      }
      if (isLast) {
        buildPackage(updated);
      } else {
        setCurrentQ(currentQ + 1);
      }
    };

    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "580px", maxWidth: "100%", background: "#fff", borderRadius: "20px", padding: "40px 44px", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>

          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: C.teal, letterSpacing: "0.08em", marginBottom: "8px" }}>BEFORE WE BUILD</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: C.text, marginBottom: "6px" }}>
              {total === 1 ? "One question to strengthen your application." : `${total} questions to strengthen your application.`}
            </div>
            <div style={{ fontSize: "13px", color: C.faded, lineHeight: 1.5 }}>
              Answer what you can. Skip anything that does not apply. Your application builds after the last question — no waiting in between.
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "28px" }}>
            {interviewQuestions.map((_, i) => (
              <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i < currentQ ? C.green : i === currentQ ? "#0f172a" : "#e2e8f0", transition: "background 0.2s" }} />
            ))}
          </div>

          <div style={{ fontSize: "11px", fontWeight: 700, color: C.faded, letterSpacing: "0.07em", marginBottom: "10px" }}>
            QUESTION {currentQ + 1} OF {total}
          </div>
          <p style={{ fontSize: "15px", color: C.text, lineHeight: 1.6, fontWeight: 500, margin: "0 0 16px" }}>{q.question}</p>

          <textarea
            rows={4}
            value={currentAnswer}
            onChange={e => setCurrentAnswer(e.target.value)}
            autoFocus
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", color: "#0f172a", background: "#fff", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6, marginBottom: "14px", outline: "none" }}
            placeholder="Take your time. Even rough notes help."
          />

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => saveAndAdvance(currentAnswer.trim() || null)}
              style={{ fontSize: "14px", fontWeight: 600, color: "#fff", background: "#0f172a", border: "none", borderRadius: "8px", padding: "10px 22px", cursor: "pointer", fontFamily: "inherit" }}>
              {isLast ? "Build my application" : "Next question"}
            </button>
            <button
              onClick={() => saveAndAdvance(null)}
              style={{ fontSize: "13px", color: C.faded, background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", fontFamily: "inherit" }}>
              {isLast ? "Skip and build" : "Skip"}
            </button>
            {currentQ > 0 && (
              <button
                onClick={() => buildPackage(qaAnswers)}
                style={{ fontSize: "12px", color: C.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginLeft: "auto" }}>
                Build now with {currentQ} answer{currentQ !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (applicationPackage) {
    const pkg = applicationPackage;
    const tabs = [
      { key: "resume" as const, label: "Resume" },
      { key: "cover" as const, label: "Cover Letter" },
      { key: "answers" as const, label: "Application Answers" },
      { key: "interview" as const, label: "Interview Prep" },
    ];

    const reset = () => { setApplicationPackage(null); setResult(null); setJdText(""); setResumeText(""); setCurrentAnswer(""); setActiveTab("resume"); setSavedJobId(null); setJobSaved(false); };

    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: "24px 20px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0" }}>

          {/* Header */}
          <div style={{ background: C.panel, borderRadius: "14px 14px 0 0", padding: "20px 24px", border: `1px solid ${C.borderSoft}`, borderBottom: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: C.green, letterSpacing: "0.08em", marginBottom: "4px" }}>APPLICATION READY</div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: C.text }}>{pkg.jobTitle}</div>
                {pkg.company && pkg.company !== "Not specified" && <div style={{ fontSize: "12px", color: C.faded, marginTop: "2px" }}>{pkg.company}</div>}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {!jobSaved ? (
                  <button disabled={savingJob}
                    style={{ fontSize: "12px", fontWeight: 600, color: C.teal, background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: "7px", padding: "6px 12px", cursor: savingJob ? "wait" : "pointer", fontFamily: "inherit", opacity: savingJob ? 0.6 : 1 }}
                    onClick={async () => {
                      setSavingJob(true);
                      try {
                        const res = await fetch("/api/career/profile/user-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: pkg.jobTitle, company: pkg.company ?? "Unknown", description: jdText, jd_analysis: pkg, interview_questions: pkg.interviewQuestions, submitted_resume_text: pkg.tailoredResume }) });
                        const data = await res.json();
                        if (res.ok) { setSavedJobId(data.job.id); setJobSaved(true); }
                      } catch { /* ignore */ } finally { setSavingJob(false); }
                    }}>{savingJob ? "Saving…" : "Save to Job Plans"}</button>
                ) : (
                  <a href="/job-plans" style={{ fontSize: "12px", fontWeight: 600, color: "#166534", background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: "7px", padding: "6px 12px", textDecoration: "none" }}>Saved</a>
                )}
                <button onClick={reset} style={{ fontSize: "12px", color: C.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "6px 0" }}>← Try another role</button>
              </div>
            </div>

            {/* What changed */}
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {pkg.changes.map((c, i) => (
                <div key={i} style={{ fontSize: "13px", color: C.textMid }}>✓ {c}</div>
              ))}
              {pkg.risk && (
                <div style={{ fontSize: "13px", color: C.amber, marginTop: "4px" }}>⚠ {pkg.risk}{pkg.riskPrep ? ` ${pkg.riskPrep}` : ""}</div>
              )}
            </div>

          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "#f1f5f9", borderLeft: `1px solid ${C.borderSoft}`, borderRight: `1px solid ${C.borderSoft}` }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ flex: 1, padding: "11px 6px", fontSize: "12px", fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? C.text : C.faded, background: activeTab === t.key ? C.panel : "transparent", border: "none", borderBottom: activeTab === t.key ? "2px solid #0f172a" : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ background: C.panel, border: `1px solid ${C.borderSoft}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "24px" }}>

            {activeTab === "resume" && (
              <CopyBlock label="TAILORED RESUME" text={pkg.tailoredResume} mono
                onDownload={() => downloadDocx(pkg.tailoredResume, "resume", `${(pkg.company || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-resume.docx`)} />
            )}

            {activeTab === "cover" && (
              <CopyBlock label="COVER LETTER" text={pkg.coverLetter}
                onDownload={() => downloadDocx(pkg.coverLetter, "cover_letter", `${(pkg.company || "cover").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cover-letter.docx`)} />
            )}

            {activeTab === "answers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: C.faded, letterSpacing: "0.1em", marginBottom: "8px" }}>WHY ARE YOU INTERESTED IN THIS ROLE?</div>
                  <p style={{ fontSize: "14px", color: C.textMid, lineHeight: 1.65, margin: "0 0 8px" }}>{pkg.whyInterested}</p>
                  <button onClick={() => navigator.clipboard.writeText(pkg.whyInterested).catch(() => {})} style={{ fontSize: "11px", fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Copy</button>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: C.faded, letterSpacing: "0.1em", marginBottom: "8px" }}>WHY ARE YOU A GOOD FIT?</div>
                  <p style={{ fontSize: "14px", color: C.textMid, lineHeight: 1.65, margin: "0 0 8px" }}>{pkg.whyGoodFit}</p>
                  <button onClick={() => navigator.clipboard.writeText(pkg.whyGoodFit).catch(() => {})} style={{ fontSize: "11px", fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Copy</button>
                </div>
              </div>
            )}

            {activeTab === "interview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {pkg.interviewQuestions.map((q, i) => (
                  <div key={i} style={{ paddingBottom: "20px", borderBottom: i < pkg.interviewQuestions.length - 1 ? `1px solid ${C.borderSoft}` : "none" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.text, marginBottom: "10px" }}>{i + 1}. {q.question}</div>
                    <p style={{ fontSize: "14px", color: C.textMid, lineHeight: 1.65, margin: "0 0 8px" }}>{q.answer}</p>
                    <button onClick={() => navigator.clipboard.writeText(q.answer).catch(() => {})} style={{ fontSize: "11px", fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Copy answer</button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const score = result.matchScore;
    const scoreColor = score == null ? C.muted : score >= 80 ? C.teal : score >= 60 ? C.amber : score >= 40 ? "#f97316" : C.red;

  const sec = { background: C.panel, borderRadius: "14px", padding: "20px 22px", border: `1px solid ${C.borderSoft}` } as const;
  const label = { fontSize: "10px", fontWeight: 700, color: C.faded, letterSpacing: "0.1em" } as const;
  const prose = { fontSize: "14px", color: C.textMid, lineHeight: 1.65, margin: 0 } as const;
  const diffColor = { easy: "#16a34a", moderate: C.amber, hard: "#dc2626" } as const;
  const diffBg = { easy: "#f0fdf4", moderate: "#fef9ec", hard: "#fef2f2" } as const;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "24px 20px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* ── Header: role + decision ── */}
        <div style={{ ...sec, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: result.decision ? "12px" : "0" }}>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: C.text }}>{result.jobTitle}</div>
              {result.company && result.company !== "Not specified" && (
                <div style={{ fontSize: "12px", color: C.faded, marginTop: "2px" }}>{result.company}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button style={{ fontSize: "12px", color: C.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "6px 0" }}
                onClick={() => { setResult(null); setJdText(""); setResumeText(""); setQuickMessage(null); setFitAnswer(null); setSavedJobId(null); setJobSaved(false); }}>
                ← Try another role
              </button>
              {!jobSaved ? (
                <button disabled={savingJob}
                  style={{ fontSize: "12px", fontWeight: 600, color: C.teal, background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: "7px", padding: "6px 12px", cursor: savingJob ? "wait" : "pointer", fontFamily: "inherit", opacity: savingJob ? 0.6 : 1 }}
                  onClick={async () => {
                    setSavingJob(true);
                    try {
                      const res = await fetch("/api/career/profile/user-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: result.jobTitle, company: result.company ?? "Unknown company", description: jdText, jd_analysis: result, interview_questions: result.interviewFocus ?? [], submitted_resume_text: resumeText || undefined }) });
                      const data = await res.json();
                      if (res.ok) { setSavedJobId(data.job.id); setJobSaved(true); }
                    } catch { /* ignore */ } finally { setSavingJob(false); }
                  }}>{savingJob ? "Saving…" : "Save to Job Plans"}</button>
              ) : (
                <a href="/job-plans" style={{ fontSize: "12px", fontWeight: 600, color: "#166534", background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: "7px", padding: "6px 12px", textDecoration: "none" }}>Saved to Job Plans</a>
              )}
            </div>
          </div>
          {result.decision && (
            <div style={{ fontSize: "15px", fontWeight: 600, color: scoreColor, lineHeight: 1.5 }}>{result.decision}</div>
          )}
        </div>

        {/* ── Revised summary ── */}
        {result.resumeAlignment?.profileSuggestion?.needsRevision && result.resumeAlignment.profileSuggestion.suggested && (
          <div style={sec}>
            <div style={{ ...label, display: "block", marginBottom: "10px" }}>REVISED SUMMARY</div>
            <ProfileSuggestionCard text={result.resumeAlignment.profileSuggestion.suggested} />
          </div>
        )}

        {/* ── Resume bullets ── */}
        {(result.resumeAlignment?.suggestedBullets ?? []).length > 0 && (
          <div style={sec}>
            <div style={{ ...label, display: "block", marginBottom: "12px" }}>RESUME CHANGES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(result.resumeAlignment!.suggestedBullets ?? []).map((item, i) => (
                <BulletCard key={i} where={item.where} bullet={item.bullet} type={item.type} replaces={item.replaces} source_line={item.source_line} claim_type={item.claim_type} />
              ))}
            </div>
            {(result.resumeAlignment?.suggestedRemovals ?? []).length > 0 && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${C.borderSoft}` }}>
                <div style={{ ...label, color: "#dc2626", display: "block", marginBottom: "8px" }}>ALSO REMOVE OR REFRAME FOR THIS ROLE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(result.resumeAlignment!.suggestedRemovals ?? []).map((item, i) => (
                    <div key={i} style={{ fontSize: "13px", color: C.textSub, lineHeight: 1.5 }}>
                      <span style={{ fontStyle: "italic", color: C.faded }}>&ldquo;{item.what}…&rdquo;</span> — {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Gaps + Strengths ── */}
        {(result.gaps?.length > 0 || result.strengths?.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: result.strengths?.length > 0 && result.gaps?.length > 0 ? "1fr 1fr" : "1fr", gap: "12px" }}>
            {result.strengths?.length > 0 && (
              <div style={sec}>
                <div style={{ ...label, color: C.green, display: "block", marginBottom: "10px" }}>WHAT YOU HAVE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {result.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.5, paddingLeft: "10px", borderLeft: `2px solid ${C.green}` }}>{s}</div>
                  ))}
                </div>
              </div>
            )}
            {result.gaps?.length > 0 && (
              <div style={sec}>
                <div style={{ ...label, display: "block", marginBottom: "10px" }}>GAPS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {result.gaps.map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: diffColor[g.difficulty], background: diffBg[g.difficulty], borderRadius: "4px", padding: "2px 6px", flexShrink: 0, marginTop: "2px", whiteSpace: "nowrap" }}>{g.difficulty}</span>
                      <span style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.5 }}>{g.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Application message ── */}
        <div style={sec}>
          <div style={{ ...label, display: "block", marginBottom: "10px" }}>APPLICATION MESSAGE</div>
          {!quickMessage ? (
            <>
              <button disabled={generatingMessage}
                style={{ fontSize: "13px", fontWeight: 600, color: "#fff", background: "#0f172a", border: "none", borderRadius: "8px", padding: "10px 20px", cursor: generatingMessage ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: generatingMessage ? 0.5 : 1 }}
                onClick={async () => {
                  setGeneratingMessage(true); setMessageError("");
                  try {
                    const res = await fetch("/api/career/quick-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jdText, resumeText, jobTitle: result.jobTitle, company: result.company, howToPosition: result.howToPosition, strengths: result.strengths ?? [] }) });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await res.json().catch(() => ({}));
                    if (!res.ok || data.error) throw new Error(data.error || "Something went wrong");
                    setQuickMessage(data.message);
                    if (savedJobId && data.message) fetch(`/api/career/profile/user-jobs/${savedJobId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cover_letter: data.message }) }).catch(() => {});
                  } catch (err) { setMessageError(err instanceof Error ? err.message : "Something went wrong"); }
                  finally { setGeneratingMessage(false); }
                }}>{generatingMessage ? "Writing…" : "Write application message"}</button>
              {messageError && <div style={{ fontSize: "12px", color: "#dc2626", marginTop: "8px" }}>{messageError}</div>}
            </>
          ) : (
            <>
              <p style={{ fontSize: "14px", color: C.textMid, lineHeight: 1.7, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{quickMessage}</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ fontSize: "12px", fontWeight: 600, color: "#fff", background: "#0f172a", border: "none", borderRadius: "7px", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }} onClick={() => navigator.clipboard.writeText(quickMessage).catch(() => {})}>Copy</button>
                <button style={{ fontSize: "12px", color: C.faded, background: "none", border: "1px solid #e2e8f0", borderRadius: "7px", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }} onClick={() => setQuickMessage(null)}>Regenerate</button>
              </div>
            </>
          )}
        </div>

        {/* ── More detail (collapsed) ── */}
        <div style={sec}>
          <button onClick={() => setRoleContextOpen(p => !p)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            <span style={{ ...label }}>{roleContextOpen ? "▾" : "▸"} MORE DETAIL</span>
            {!roleContextOpen && <span style={{ fontSize: "12px", color: C.faded, fontWeight: 400 }}>Positioning advice, role context, interview questions</span>}
          </button>
          {roleContextOpen && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {result.howToPosition && (
                <div>
                  <div style={{ ...label, display: "block", marginBottom: "8px" }}>HOW TO POSITION YOURSELF</div>
                  <p style={prose}>{result.howToPosition}</p>
                </div>
              )}
              {result.whatThisRoleIsAbout && (
                <div>
                  <div style={{ ...label, display: "block", marginBottom: "8px" }}>WHAT THIS ROLE IS ABOUT</div>
                  <p style={prose}>{result.whatThisRoleIsAbout}</p>
                </div>
              )}
              {(result.interviewFocus ?? []).length > 0 && (
                <div>
                  <div style={{ ...label, display: "block", marginBottom: "8px" }}>LIKELY INTERVIEW QUESTIONS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(result.interviewFocus ?? []).map((q, i) => (
                      <div key={i} style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.55, paddingLeft: "10px", borderLeft: "2px solid #e2e8f0" }}>{q}</div>
                    ))}
                  </div>
                </div>
              )}
              {/* Write cover letter + fit answer in detail section */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button style={{ fontSize: "12px", fontWeight: 600, color: "#fff", background: "#0f172a", border: "none", borderRadius: "7px", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}
                  onClick={() => { try { sessionStorage.setItem("career_jd_context", JSON.stringify({ jdText, resumeText: resumeText || undefined, jobTitle: result.jobTitle, company: result.company, howToPosition: result.howToPosition, strengths: result.strengths })); } catch { /* ignore */ } router.push("/career?cat=land&intent=tailor_application"); }}>
                  Write cover letter
                </button>
                {score != null && score >= 50 && (
                  <button style={{ fontSize: "12px", fontWeight: 600, color: C.teal, background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: "7px", padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}
                    onClick={() => { try { sessionStorage.setItem("career_interview_context", JSON.stringify({ jdText, company: result.company, resumeText: resumeText || "", gaps: result.gaps?.map(g => g.text) ?? [], interviewFocus: result.interviewFocus ?? [] })); } catch { /* ignore */ } router.push("/career?cat=grow&intent=interview_preparation"); }}>
                    Prep for interview
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Anything else to add ── */}
        <div style={sec}>
          <div style={{ ...label, display: "block", marginBottom: "4px" }}>SOMETHING NOT ON YOUR RESUME?</div>
          <p style={{ fontSize: "12px", color: C.faded, margin: "0 0 10px", lineHeight: 1.5 }}>Experience, context, or a qualification you forgot to include. Drop it here and we will factor it in.</p>
          {!extraResult ? (
            <>
              <textarea rows={2} style={{ ...textarea(2), marginBottom: "8px", fontSize: "13px" }}
                placeholder="e.g. I worked on a mine site for two years but left it off my resume…"
                value={extraDetails} onChange={e => setExtraDetails(e.target.value)} />
              {extraError && <div style={{ fontSize: "12px", color: C.red, marginBottom: "6px" }}>{extraError}</div>}
              <button disabled={extraDetails.trim().length < 10 || extraLoading}
                style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a", background: C.bg, border: "1px solid #e2e8f0", borderRadius: "7px", padding: "7px 14px", cursor: extraDetails.trim().length < 10 || extraLoading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: extraDetails.trim().length < 10 || extraLoading ? 0.5 : 1 }}
                onClick={async () => {
                  setExtraLoading(true); setExtraError("");
                  try {
                    const res = await fetch("/api/career/jd-extra", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jdText, resumeText, extraDetails, gaps: result.gaps?.map(g => g.text) ?? [], strengths: result.strengths ?? [], jobTitle: result.jobTitle, company: result.company }) });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await res.json().catch(() => ({}));
                    if (!res.ok || data.error) throw new Error(data.error || "Something went wrong");
                    setExtraResult(data);
                  } catch (err) { setExtraError(err instanceof Error ? err.message : "Something went wrong"); }
                  finally { setExtraLoading(false); }
                }}>{extraLoading ? "Factoring in…" : "Factor this in"}</button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "14px", color: C.text, lineHeight: 1.7, margin: 0 }}>{extraResult.verdict}</p>
              {extraResult.resumeBullet && (
                <div style={{ background: C.tealBg, border: `1px solid ${C.tealBorder}`, borderRadius: "9px", padding: "12px 14px" }}>
                  <p style={{ fontSize: "13px", color: C.text, lineHeight: 1.65, margin: "0 0 8px" }}>{extraResult.resumeBullet}</p>
                  <button onClick={() => navigator.clipboard.writeText(extraResult.resumeBullet!).catch(() => {})} style={{ fontSize: "11px", fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Copy</button>
                </div>
              )}
              <button onClick={() => { setExtraResult(null); setExtraDetails(""); }} style={{ fontSize: "12px", color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", alignSelf: "flex-start" }}>Add something else</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
  } // end if (result)

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 24px" }}>

      {onBack && (
        <div style={{ width: "1100px", maxWidth: "100%", marginBottom: "8px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#64748b", padding: 0, fontFamily: "inherit" }}>← Back to Career Hub</button>
        </div>
      )}

      <div style={{ width: "1100px", maxWidth: "100%", background: "#ffffff", borderRadius: "28px", padding: "28px 40px 28px", boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12)" }}>

        {returningContext && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: C.green, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "4px" }}>
              {returningContext.improvedResumeText ? "READY TO REANALYZE" : "WELCOME BACK"}
            </div>
            <p style={{ fontSize: "13px", color: "#1e293b", margin: 0, lineHeight: 1.5 }}>
              {returningContext.improvedResumeText
                ? <>Your improved resume and the <strong>{returningContext.jobTitle}</strong> JD at <strong>{returningContext.company}</strong> are both loaded. Click Analyze to see your new score.</>
                : <>Your JD for <strong>{returningContext.jobTitle}</strong> at <strong>{returningContext.company}</strong> is pre-loaded. Paste your updated resume and click Reanalyze Now.</>
              }
            </p>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: "22px", fontWeight: 800, color: "#0b1120", letterSpacing: "-0.3px", marginBottom: "4px", fontFamily: "'Inter','Open Sans',sans-serif" }}>
          JD Analyzer
        </div>

        <div style={{ textAlign: "center", fontSize: "13px", color: C.faded, marginBottom: "16px", lineHeight: 1.5 }}>
          Paste a job description and your resume to see how well you match before you apply.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>

          <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px 18px 18px", border: "1px solid #e9edf2" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", display: "block", marginBottom: "8px" }}>Job Description</span>
            <textarea
              ref={jdRef}
              style={{ width: "100%", height: "220px", border: "1.5px solid #b8c8d8", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", fontFamily: "inherit", resize: "vertical", background: "#fafafa", color: "#1e293b", display: "block", marginBottom: "10px", outline: "none", boxSizing: "border-box" }}
              placeholder="Paste the full job description here..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
            <label style={{ display: "block", background: "#ffffff", border: `1px dashed ${jdUploadError ? "#dc2626" : "#cbd5e1"}`, borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: 500, color: "#64748b", cursor: "pointer", textAlign: "center" }}>
              <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }}
                onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0], setJdText, setJdFileLoading, setJdUploadError); e.currentTarget.value = ""; }} />
              {jdFileLoading ? "Reading file…" : "Upload PDF or Word file"}
            </label>
            {jdUploadError && <p style={{ fontSize: "12px", color: "#dc2626", margin: "6px 0 0", lineHeight: 1.4 }}>{jdUploadError} Paste the text directly into the box above instead.</p>}
          </div>

          <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px 18px 18px", border: "1px solid #e9edf2" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", display: "block", marginBottom: "8px" }}>Resume</span>
            <textarea
              style={{ width: "100%", height: "220px", border: "1.5px solid #b8c8d8", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", fontFamily: "inherit", resize: "vertical", background: "#fafafa", color: "#1e293b", display: "block", marginBottom: "10px", outline: "none", boxSizing: "border-box" }}
              placeholder="Paste your resume here for a personalised match score..."
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
            />
            <label style={{ display: "block", background: "#ffffff", border: `1px dashed ${resumeUploadError ? "#dc2626" : "#cbd5e1"}`, borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: 500, color: "#64748b", cursor: "pointer", textAlign: "center" }}>
              <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }}
                onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0], setResumeText, setResumeFileLoading, setResumeUploadError); e.currentTarget.value = ""; }} />
              {resumeFileLoading ? "Reading file…" : "Upload PDF or Word file"}
            </label>
            {resumeUploadError && <p style={{ fontSize: "12px", color: "#dc2626", margin: "6px 0 0", lineHeight: 1.4 }}>{resumeUploadError} Paste the text directly into the box above instead.</p>}
          </div>

        </div>

        {error && <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            disabled={jdText.trim().length < 50}
            onClick={() => analyse()}
            style={{
              background: jdText.trim().length >= 50 ? "#0f172a" : "#e2e8f0",
              color: jdText.trim().length >= 50 ? "#ffffff" : C.faded,
              border: "none", padding: "11px 40px", borderRadius: "8px",
              fontSize: "14px", fontWeight: 600,
              cursor: jdText.trim().length >= 50 ? "pointer" : "not-allowed",
              transition: "all 0.15s", fontFamily: "inherit",
            }}>
            {returningContext ? "Optimize Again" : "Optimize My Application"}
          </button>
        </div>

      </div>
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
  const [loadingFocus, setLoadingFocus] = useState<string[]>([]);
  const [loadingCheckStep, setLoadingCheckStep] = useState(0);

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [analysing, setAnalysing] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Auto-load context when arriving from JD Analyzer or Resume Improvement
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("career_interview_context");
      if (raw) {
        const ctx = JSON.parse(raw);
        sessionStorage.removeItem("career_interview_context");
        setJdText(ctx.jdText || "");
        setCompany(ctx.company || "");
        setResumeText(ctx.resumeText || "");
        generateQuestions(ctx);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateQuestions = async (overrides?: { jdText?: string; company?: string; resumeText?: string; gaps?: string[]; interviewFocus?: string[] }) => {
    const jd = overrides?.jdText ?? jdText;
    const co = overrides?.company ?? company;
    const res = overrides?.resumeText ?? resumeText;
    const gaps = overrides?.gaps ?? [];
    const interviewFocus = overrides?.interviewFocus ?? [];

    setLoadingFocus(interviewFocus);
    setLoadingCheckStep(0);
    setStep("generating");
    setError("");
    try {
      const fetchRes = await fetch("/api/career/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: jd, company: co, resumeText: res, gaps, interviewFocus }),
      });
      const data = await fetchRes.json();
      if (!fetchRes.ok || data.error) throw new Error(data.error || "Failed");
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

  useEffect(() => {
    if (step !== "generating") return;
    setLoadingCheckStep(0);
    const id = setInterval(() => {
      setLoadingCheckStep(s => {
        if (s >= 4) { clearInterval(id); return s; }
        return s + 1;
      });
    }, 1100);
    return () => clearInterval(id);
  }, [step]);

  if (step === "generating") {
    const STEPS = [
      "Reading the job description",
      "Reviewing your background",
      "Identifying the employer's priorities",
      "Selecting likely interview topics",
      "Building your personalised questions",
    ];
    return (
      <div style={{ padding: "48px 0", maxWidth: "420px", margin: "0 auto" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: "20px" }}>PREPARING YOUR INTERVIEW</div>

        {/* Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          {STEPS.map((label, i) => {
            const done = loadingCheckStep > i;
            const active = loadingCheckStep === i;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: done ? C.teal : active ? C.tealBg : "#f1f5f9",
                  border: `2px solid ${done ? C.teal : active ? C.teal : "#e2e8f0"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s",
                }}>
                  {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal }} />}
                </div>
                <span style={{ fontSize: "14px", color: done ? C.text : active ? C.text : C.muted, fontWeight: active ? 600 : 400, transition: "all 0.3s" }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Focus areas — appear once step 3 is reached */}
        {loadingCheckStep >= 3 && loadingFocus.length > 0 && (
          <div style={{ background: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: "12px", padding: "16px 18px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: "12px" }}>INTERVIEW FOCUS DETECTED</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {loadingFocus.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <svg style={{ marginTop: 3, flexShrink: 0 }} width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke={C.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback if no focus areas */}
        {loadingCheckStep >= 3 && loadingFocus.length === 0 && (
          <div style={{ fontSize: "13px", color: C.muted }}>Analysing role requirements…</div>
        )}
      </div>
    );
  }

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
              <div key={key} style={{ background: "rgba(0,0,0,0.03)", borderRadius: "8px", padding: "12px" }}>
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
        <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.03)", borderRadius: "8px", border: `1px solid ${C.border}` }}>
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
          <div style={{ fontSize: "13px", color: C.muted, padding: "12px 16px", background: "rgba(0,0,0,0.03)", borderRadius: "8px" }}>
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
            <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: "8px", padding: "14px", fontSize: "14px", color: C.text, lineHeight: "1.6", minHeight: "80px", maxHeight: "200px", overflowY: "auto" }}>
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
      <button style={btn()} disabled={jdText.trim().length < 50} onClick={() => generateQuestions()}>
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
    colour: "#7c3aed",
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
    title: "Advance my career",
    description: "I want to grow, get promoted, or increase my earning power as a BA",
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
    { label: "I have a role I want to apply for", intent: "analyze_job_description" },
  ],
  grow: [
    { label: "I want to move into a more senior or higher paying BA role", intent: "move_to_senior_role" },
    { label: "I want to step into a leadership role where I guide others and shape direction", intent: "lead_ba_transition" },
    { label: "I want to position myself as a specialist and earn more as a contractor or consultant", intent: "contractor_positioning" },
    { label: "I want help negotiating an offer", intent: "offer_negotiation" },
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
  lead_ba_transition: "advisor",
  contractor_positioning: "advisor",
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
    heading: "Let's work on this role",
    subtext: "Paste the job description and your resume. I will tell you how well you fit, what they really want, and how to position yourself. From there you can tailor your resume and write a cover letter.",
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
  lead_ba_transition: {
    heading: "Let's map your move into leadership",
    subtext: "Four questions to work out where you are in the transition and what you need to do differently.",
  },
  contractor_positioning: {
    heading: "Let's sharpen your specialist positioning",
    subtext: "Four questions to work out your niche, your value, and how to command a higher rate.",
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

export default function CareerClient({ fullName, profile, user }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cat = searchParams.get("cat") as Category | null;
  const intent = searchParams.get("intent");
  const fromParam = searchParams.get("from");

  // Derive the active tool from the intent
  const activeTool: Tool | null = intent ? (INTENT_TO_TOOL[intent] ?? null) : null;

  // Read JD context from sessionStorage when coming from JD Analyzer
  const [jdContext, setJdContext] = useState<JDContext | null>(null);
  useEffect(() => {
    if (fromParam === "jd_analyzer" || fromParam === "resume_builder") {
      try {
        const raw = sessionStorage.getItem("career_jd_targeted");
        if (raw) {
          setJdContext(JSON.parse(raw));
          sessionStorage.removeItem("career_jd_targeted");
        }
      } catch { /* ignore */ }
    }
  }, [fromParam]);

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

      <AppSidebar activeHref="/career" profile={profile} user={user} />

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto"
        style={{ background: C.bg }}>

        {/* Header — hidden for JD Analyzer (it renders its own layout) */}
        {activeTool !== "jd" && (
          <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-20"
            style={{
              background: "rgba(241,245,249,0.95)",
              backdropFilter: "blur(24px)",
              borderBottom: `1px solid ${C.border}`,
            }}>
            <div>
              {(activeTool || cat) && (
                <h1 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800, fontSize: "22px", color: C.text, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {currentToolInfo?.label ?? activeCat?.title ?? "Career Hub"}
                </h1>
              )}
            </div>
            {(activeTool || cat) && (
              <button className="btn-ghost" style={{ color: C.muted, fontFamily: "inherit" }} onClick={goHome}>Back to Career Hub</button>
            )}
          </header>
        )}

        {/* Content */}
        <div className={activeTool === "jd" ? "" : "px-8 py-8"}>

          {/* ── Home: Entry ── */}
          {!cat && !intent && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "560px" }}>
              <div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, color: C.text, margin: 0, lineHeight: 1.2, fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.03em" }}>
                  Career Hub
                </h1>
                <p style={{ marginTop: "10px", fontSize: "15px", color: C.muted, margin: "10px 0 0", lineHeight: 1.5 }}>
                  What are you working on right now? Pick one and I will guide you through it.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {CATEGORIES.map((c) => (
                  <button key={c.id}
                    onClick={() => goToCategory(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "18px",
                      background: C.panel, border: `1px solid ${C.border}`,
                      borderLeft: `4px solid ${c.colour}`,
                      borderRadius: "14px", padding: "20px 24px", cursor: "pointer",
                      textAlign: "left", transition: "all 0.15s", width: "100%",
                      fontFamily: "inherit",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = c.bg;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = c.border;
                      (e.currentTarget as HTMLButtonElement).style.borderLeftColor = c.colour;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = C.panel;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
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
                      <div style={{ fontSize: "17px", fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{c.title}</div>
                      <div style={{ fontSize: "14px", color: C.muted, marginTop: "4px", lineHeight: 1.4 }}>{c.description}</div>
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
                    fontSize: "13px", color: C.muted, padding: "0",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px",
                  }}>
                  ← Back
                </button>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: C.text, margin: "14px 0 6px", fontFamily: "'Inter','Open Sans',sans-serif", letterSpacing: "-0.02em" }}>
                  {activeCat.title}
                </h2>
                <p style={{ fontSize: "14px", color: C.muted, margin: 0 }}>
                  What fits your situation?
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {CATEGORY_OPTIONS[cat].map((opt) => (
                  <button key={opt.intent}
                    onClick={() => goToIntent(cat, opt.intent)}
                    style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      background: C.panel, border: `1px solid ${C.border}`,
                      borderRadius: "10px", padding: "16px 18px", cursor: "pointer",
                      textAlign: "left", transition: "all 0.15s", width: "100%",
                      fontSize: "15px", color: C.textMid, fontFamily: "inherit",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = activeCat.bg;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = activeCat.border;
                      (e.currentTarget as HTMLButtonElement).style.color = activeCat.colour;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = C.panel;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                      (e.currentTarget as HTMLButtonElement).style.color = C.textMid;
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
                  jdContext={fromParam === "jd_analyzer" ? jdContext : null}
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
                  returningContext={fromParam === "resume_builder" ? jdContext : null}
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
