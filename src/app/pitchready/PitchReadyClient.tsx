"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Square, Play, ChevronRight, ArrowLeft,
  Clock, BarChart2, BookOpen, History, TrendingUp, Home,
  AlertCircle, CheckCircle, XCircle, RefreshCw, Target,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type PitchView = "home" | "scenarios" | "studio" | "feedback" | "history" | "progress";
type StudioPhase = "setup" | "ready" | "recording" | "review" | "processing";
type PulseMood = "Yay" | "Good" | "Meh" | "Tough" | "Rough";

interface Scenario {
  id: string;
  title: string;
  mode: "get-the-job" | "perform-in-the-job";
  difficulty: "Foundation" | "Professional" | "Executive";
  audience: string;
  duration: string;
  type: string;
  category: string;
  description: string;
  coachTip: string;
}

interface FeedbackDimension {
  score: number;
}
interface FeedbackReport {
  overallScore: number;
  dimensions: {
    clarity: FeedbackDimension;
    structure: FeedbackDimension;
    stakeholderAwareness: FeedbackDimension;
    relevance: FeedbackDimension;
    confidence: FeedbackDimension;
    conciseness: FeedbackDimension;
  };
  topWin: string;
  topFix: string;
  doThisNext: string;
  coachRewrite: string;
  improvedOpening?: string | null;
  improvedClosing?: string | null;
}

interface SessionRecord {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  audience: string;
  transcript: string;
  duration: number;
  wordCount: number;
  feedback: FeedbackReport;
  score: number;
  createdAt: string;
}

interface StudioSetup {
  scenario: Scenario | null;
  audience: string;
  difficulty: string;
  timeLimit: number;
  focus: string;
}

// ── Scenarios Data ────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  // ── Get the Job ─────────────────────────────────────────────────────────────
  {
    id: "s-13",
    title: "Introduce Yourself as a Business Analyst",
    mode: "get-the-job",
    difficulty: "Foundation",
    audience: "Hiring manager and interview panel",
    duration: "2 to 3 minutes",
    type: "Interview",
    category: "Career",
    description: "You have two minutes to tell a hiring panel who you are as a BA, what you stand for, and why you are the right person for this role. Make it specific, confident, and memorable. Not a CV recital — a positioning statement.",
    coachTip: "The strongest BA introductions end with one concrete outcome you delivered. Not your job title. What changed because of your work.",
  },
  {
    id: "s-14",
    title: "Walk Me Through a Project You Worked On",
    mode: "get-the-job",
    difficulty: "Foundation",
    audience: "Senior hiring manager",
    duration: "3 to 4 minutes",
    type: "Interview",
    category: "Career",
    description: "The interviewer wants a real project walkthrough — not a job description. Pick one project and explain: what the problem was, what your role was, how you handled the requirements, what got in the way, and what the outcome was. Be specific.",
    coachTip: "Pick one project and own it fully. Interviewers lose confidence when candidates hedge with 'we did this' instead of 'I did this.' Lead with the problem before your solution.",
  },
  {
    id: "s-15",
    title: "How Have You Handled Conflicting Stakeholder Priorities?",
    mode: "get-the-job",
    difficulty: "Professional",
    audience: "Hiring panel including a technical lead",
    duration: "3 to 4 minutes",
    type: "Interview",
    category: "Career",
    description: "This is a behavioural question that tests your stakeholder management, political awareness, and decision-making. Give a real example. Do not give a textbook answer — show how you actually navigated the conflict and what you would do differently.",
    coachTip: "Name the stakeholders and the specific conflict. Vague answers like 'I facilitated alignment' say nothing. Show that you understood what each party actually needed, not just what they asked for.",
  },
  {
    id: "s-16",
    title: "Explain a Requirement to a Non-Technical Stakeholder",
    mode: "get-the-job",
    difficulty: "Foundation",
    audience: "Business owner with no technical background",
    duration: "2 to 3 minutes",
    type: "Interview",
    category: "Career",
    description: "You have been asked to explain a complex system requirement to a business owner who does not understand technical language. Make it clear, meaningful, and relevant to their world without dumbing it down.",
    coachTip: "Use their language, not yours. Translate the requirement into a business outcome they care about. Avoid jargon. If they have to ask what something means, the explanation failed.",
  },
  {
    id: "s-17",
    title: "Tell Me About a Time a Project Didn't Go as Planned",
    mode: "get-the-job",
    difficulty: "Professional",
    audience: "Hiring manager assessing judgement and accountability",
    duration: "3 to 4 minutes",
    type: "Interview",
    category: "Career",
    description: "The interviewer wants to see how you handle failure, ambiguity, and pressure. Pick a real situation where something went wrong — not something minor. Show your thinking, your response, and what you learned. Do not blame the team or the client.",
    coachTip: "This question is about self-awareness, not perfection. The best answers name exactly what went wrong, own your part in it, and describe a concrete change in how you now work as a result.",
  },
  {
    id: "s-18",
    title: "Why Should We Hire You Over Other BAs?",
    mode: "get-the-job",
    difficulty: "Professional",
    audience: "Senior hiring decision-maker",
    duration: "2 to 3 minutes",
    type: "Interview",
    category: "Career",
    description: "This is the closing question that separates confident candidates from forgettable ones. You need to articulate your specific value, not generic BA skills. What do you bring that others do not? Be direct, be specific, and do not be vague.",
    coachTip: "Do not list BA competencies everyone has. Name the specific gap you fill — the type of project, the type of stakeholder, the type of problem you are particularly strong with. Specificity is credibility.",
  },

  // ── Perform in the Job ───────────────────────────────────────────────────────
  {
    id: "s-01",
    title: "Requirements Walkthrough to Skeptical Stakeholders",
    mode: "perform-in-the-job",
    difficulty: "Professional",
    audience: "Mixed business and technical stakeholders",
    duration: "3 to 5 minutes",
    type: "Walkthrough",
    category: "Requirements",
    description: "You are presenting a requirements document to a group that includes David from engineering, who thinks requirements are always wrong, and Priya from compliance, who has seen three similar projects fail. Walk them through what you found and why they should trust it.",
    coachTip: "Lead with your methodology before your conclusions. Skeptical stakeholders need to trust your process before they trust your output.",
  },
  {
    id: "s-02",
    title: "Presenting a Change Request to Leadership",
    mode: "perform-in-the-job",
    difficulty: "Executive",
    audience: "Senior leadership and project sponsor",
    duration: "2 to 4 minutes",
    type: "Change Request",
    category: "Governance",
    description: "Scope has changed. You need to present a formal change request that adds two weeks and 15% to the budget. The sponsor is under board pressure. Make the case clearly, own the impact, and propose a path forward.",
    coachTip: "Never bury the impact. State the change, the cost, and your recommendation in the first 30 seconds. Executives respect brevity and decisiveness.",
  },
  {
    id: "s-03",
    title: "Solution Proposal to a Mixed Technical and Business Audience",
    mode: "perform-in-the-job",
    difficulty: "Professional",
    audience: "Business owners and engineering leads",
    duration: "4 to 6 minutes",
    type: "Proposal",
    category: "Solution Design",
    description: "You are recommending a solution approach that the business team will love but the technical team thinks is over-engineered. Present it in a way that speaks to both without losing either.",
    coachTip: "Structure your talk in two halves: lead with the business outcome, then transition to the technical rationale. Use a clear verbal marker between them.",
  },
  {
    id: "s-04",
    title: "Sprint Review Update After Delays",
    mode: "perform-in-the-job",
    difficulty: "Professional",
    audience: "Product owner, scrum team, and business stakeholder",
    duration: "2 to 3 minutes",
    type: "Status Update",
    category: "Agile",
    description: "The sprint delivered 60% of the committed stories. Two features slipped. A key stakeholder is in the room who has been asking about those features for three weeks. Give the update without deflecting.",
    coachTip: "Own the miss, explain the cause in one sentence, and pivot immediately to the recovery plan. Stakeholders forgive delays they understand.",
  },
  {
    id: "s-05",
    title: "Business Case Pitch with Finance Leadership",
    mode: "perform-in-the-job",
    difficulty: "Executive",
    audience: "CFO and finance leadership",
    duration: "4 to 5 minutes",
    type: "Business Case",
    category: "Strategy",
    description: "You are presenting a business case for a 400,000 investment in process automation. The CFO wants ROI, payback period, and risk. Present the financials clearly and defend your assumptions.",
    coachTip: "Finance stakeholders respond to numbers and risk transparency. State the payback period and confidence level early. Do not hide uncertainty — quantify it.",
  },
  {
    id: "s-06",
    title: "Explaining Process Changes to Operational Teams",
    mode: "perform-in-the-job",
    difficulty: "Foundation",
    audience: "Frontline operational staff",
    duration: "3 to 4 minutes",
    type: "Change Communication",
    category: "Change Management",
    description: "You are communicating a new approval process to a team of 20 operations staff. Some of them have been doing it the old way for eight years. Focus on what changes, what stays the same, and what it means for their daily work.",
    coachTip: "Always answer the unspoken question first: what does this mean for me tomorrow morning? People resist change they do not understand, not change itself.",
  },
  {
    id: "s-07",
    title: "Introducing Yourself as a BA in an Interview",
    mode: "get-the-job",
    difficulty: "Foundation",
    audience: "Hiring manager and panel",
    duration: "2 to 3 minutes",
    type: "Interview",
    category: "Career",
    description: "You have 2 minutes to tell a hiring panel who you are as a BA, what you stand for, and why you are the right person for this role. Make it specific, confident, and memorable.",
    coachTip: "The strongest BA introductions include one concrete outcome you delivered. Not your job title — what changed because of your work.",
  },
  {
    id: "s-08",
    title: "Walking Through UAT Findings to the Project Team",
    mode: "perform-in-the-job",
    difficulty: "Professional",
    audience: "Project manager, development team, and business owner",
    duration: "3 to 4 minutes",
    type: "Test Findings",
    category: "Testing",
    description: "UAT surfaced 12 defects, three of which are blocking go-live. The development team thinks two of them are design issues, not defects. Walk through the findings without starting a blame conversation.",
    coachTip: "Present findings against acceptance criteria, not against people. Lead with evidence, not opinion. Frame blocking defects as go-live risks, not failures.",
  },
  {
    id: "s-09",
    title: "Defending a Recommendation with Incomplete Information",
    mode: "perform-in-the-job",
    difficulty: "Executive",
    audience: "Steering committee",
    duration: "3 to 5 minutes",
    type: "Recommendation",
    category: "Strategy",
    description: "You are recommending a direction to the steering committee but your data is incomplete — one key system was unavailable and two SMEs did not respond in time. Make the case for your recommendation while being transparent about what you do not yet know.",
    coachTip: "Distinguish what you know, what you inferred, and what remains uncertain. Executives make decisions under uncertainty every day — they need you to be honest about the confidence level of your analysis.",
  },
  {
    id: "s-10",
    title: "Handling Pushback During a Stakeholder Presentation",
    mode: "perform-in-the-job",
    difficulty: "Professional",
    audience: "Challenging senior stakeholder",
    duration: "2 to 3 minutes",
    type: "Facilitation",
    category: "Stakeholder Management",
    description: "Mid-presentation, a senior stakeholder challenges your methodology and suggests your analysis is incomplete. Stay composed, address the challenge, and return to your presentation thread without losing the room.",
    coachTip: "Acknowledge the challenge, validate the concern, answer concisely, and return to your thread with a bridging phrase. Do not get drawn into a debate during a presentation.",
  },
  {
    id: "s-11",
    title: "Presenting Requirements Analysis at a Project Kickoff",
    mode: "perform-in-the-job",
    difficulty: "Foundation",
    audience: "Full project team at kickoff",
    duration: "4 to 5 minutes",
    type: "Kickoff Presentation",
    category: "Requirements",
    description: "You are opening the requirements phase at a project kickoff. Explain what you will do, how long it will take, what you need from the team, and what the output will look like. Make everyone feel confident in the approach.",
    coachTip: "A kickoff audience needs to leave feeling informed and confident. Cover: what we are doing, how you will do it, what you need from each of them, and what success looks like.",
  },
  {
    id: "s-12",
    title: "Summarising Analysis Findings for a Board Report",
    mode: "perform-in-the-job",
    difficulty: "Executive",
    audience: "Board members with limited BA context",
    duration: "3 to 4 minutes",
    type: "Executive Summary",
    category: "Reporting",
    description: "The board has five minutes for your slot. Summarise six weeks of analysis into the three things they need to know, the decision they need to make, and what happens if they delay.",
    coachTip: "Board members want one thing: what is the decision and what does it cost to delay it. Everything else is supporting detail. Structure your summary around the decision, not the process.",
  },
];

// ── Pulse Check Data ──────────────────────────────────────────────────────────

const PULSE_FLOWS: Record<PulseMood, { reply: string; followUp: string; action: string }> = {
  "Yay": {
    reply: "Good energy is worth channeling. The sharpest sessions tend to happen when you show up already engaged.",
    followUp: "What would make today feel like a proper win for you?",
    action: "Try the Business Case Pitch — it rewards clear thinking under pressure.",
  },
  "Good": {
    reply: "Solid footing. Consistent days build real progress more reliably than the occasional brilliant one.",
    followUp: "Is there a scenario that has been on your mind — one you keep avoiding?",
    action: "Pick something slightly outside your comfort zone today.",
  },
  "Meh": {
    reply: "Meh days are honest days. Sometimes showing up and doing the work anyway is the whole practice.",
    followUp: "Low energy or low motivation? The approach changes depending on which one it is.",
    action: "A short 2-minute Foundation session might be the right warm-up.",
  },
  "Tough": {
    reply: "Noted. Tough days have a way of making everything feel heavier than it is.",
    followUp: "If you do practice today, something low-stakes might be the right call. No pressure to push hard.",
    action: "Try the Process Changes scenario — it is structured and low intensity.",
  },
  "Rough": {
    reply: "That is okay. Some days are just rough. You do not have to perform today.",
    followUp: "If you want a quiet distraction, reviewing a past feedback report requires no energy at all.",
    action: "Come back when the time is right. The scenarios will be here.",
  },
};

// ── Pulse helpers ─────────────────────────────────────────────────────────────

function shouldShowPulse(): boolean {
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem("pitchready_pulse_date");
  return last !== new Date().toDateString();
}

function markPulseShown() {
  localStorage.setItem("pitchready_pulse_date", new Date().toDateString());
}

// ── Waveform Component ────────────────────────────────────────────────────────

function WaveformBars({ active }: { active: boolean }) {
  return (
    <>
      <style>{`
        @keyframes prWave {
          0%   { transform: scaleY(0.25); }
          50%  { transform: scaleY(1); }
          100% { transform: scaleY(0.25); }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "56px" }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} style={{
            width: "3px",
            borderRadius: "2px",
            background: active ? `rgba(31,191,159,${0.5 + (i % 5) * 0.1})` : "rgba(255,255,255,0.08)",
            height: active ? `${16 + (i % 7) * 5}px` : "4px",
            transformOrigin: "bottom",
            animation: active ? `prWave ${0.7 + (i % 6) * 0.12}s ease-in-out infinite` : "none",
            animationDelay: `${i * 0.045}s`,
            transition: "height 0.4s, background 0.4s",
          }} />
        ))}
      </div>
    </>
  );
}

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "#1fbf9f" : score >= 55 ? "#f59e0b" : "#e05547";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

// ── Dimension Score Bar ───────────────────────────────────────────────────────

function DimBar({ label, score, feedback, examples }: {
  label: string; score: number; feedback: string; examples?: string[];
}) {
  const [open, setOpen] = useState(false);
  const color = score >= 75 ? "#1fbf9f" : score >= 55 ? "#f59e0b" : "#e05547";
  return (
    <div style={{ marginBottom: "14px" }}>
      <button onClick={() => setOpen(p => !p)} style={{
        width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>{label}</span>
          <span style={{ fontSize: "13px", fontWeight: 800, color }}>{score}</span>
        </div>
        <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "3px", transition: "width 1s ease" }} />
        </div>
      </button>
      {open && (
        <div style={{ marginTop: "10px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", borderLeft: `3px solid ${color}` }}>
          <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.75, margin: 0 }}>{feedback}</p>
          {examples && examples.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              {examples.map((ex, i) => (
                <div key={i} style={{ fontSize: "12px", color: "#e05547", fontStyle: "italic", marginTop: "4px" }}>
                  &ldquo;{ex}&rdquo;
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable Answer Card ──────────────────────────────────────────────────────

function ReusableAnswerCard({ answer }: { answer: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(224,85,71,0.06), rgba(249,115,22,0.04))",
      border: "1px solid rgba(224,85,71,0.3)",
      borderRadius: "14px", padding: "24px", marginBottom: "20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#e05547", letterSpacing: "0.09em", marginBottom: "2px" }}>
            YOUR REUSABLE ANSWER
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-3)" }}>
            A stronger version of your response. Save it. Use it.
          </div>
        </div>
        <button onClick={copy} style={{
          padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
          background: copied ? "rgba(31,191,159,0.12)" : "rgba(224,85,71,0.1)",
          border: `1px solid ${copied ? "rgba(31,191,159,0.3)" : "rgba(224,85,71,0.3)"}`,
          color: copied ? "var(--teal)" : "#e05547",
          cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
        }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p style={{ fontSize: "15px", color: "var(--text-1)", lineHeight: 1.85, margin: 0, borderLeft: "3px solid #e05547", paddingLeft: "16px" }}>
        {answer}
      </p>
    </div>
  );
}

// ── Scenario Tile ─────────────────────────────────────────────────────────────

function ScenarioTile({ scenario: s, color, onSelect }: { scenario: Scenario; color: string; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.025)" : "var(--card)",
        border: `1px solid ${hovered ? color + "60" : "var(--border)"}`,
        borderRadius: "14px", padding: "22px",
        display: "flex", flexDirection: "column", cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px ${color}20` : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color, background: `${color}15`, padding: "3px 9px", borderRadius: "10px", letterSpacing: "0.06em" }}>
          {s.difficulty.toUpperCase()}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "4px" }}>
          <Clock size={11} /> {s.duration}
        </span>
      </div>
      <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1.3, marginBottom: "8px" }}>{s.title}</div>
      <div style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "10px" }}>
        {s.type} · {s.audience}
      </div>
      <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.7, flex: 1, marginBottom: "14px" }}>{s.description}</p>
      <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", borderLeft: "3px solid var(--teal)", marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.07em", marginBottom: "4px" }}>ALEX RIVERA&rsquo;S TIP</div>
        <p style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>{s.coachTip}</p>
      </div>
      <button
        className="btn-teal"
        onClick={onSelect}
        style={{
          justifyContent: "center",
          transform: hovered ? "scale(1.02)" : "scale(1)",
          transition: "transform 0.15s ease",
          filter: hovered ? "brightness(1.15)" : "none",
        }}
      >
        <Mic size={13} /> Practise this scenario
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props { tier: string; userName: string; initialSessions?: SessionRecord[]; }

export default function PitchReadyClient({ userName, initialSessions = [] }: Props) {
  const router = useRouter();
  const [view, setView] = useState<PitchView>("home");

  // Studio state
  const [studioPhase, setStudioPhase] = useState<StudioPhase>("setup");
  const [studioSetup, setStudioSetup] = useState<StudioSetup>({
    scenario: null, audience: "", difficulty: "Professional", timeLimit: 300, focus: "all",
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Feedback state
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackReport | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Sessions / history — seeded from server, updated after each session
  const [sessions, setSessions] = useState<SessionRecord[]>(
    initialSessions.map(s => ({
      id: s.id,
      scenarioId: (s as any).scenario_id,
      scenarioTitle: (s as any).scenario_title,
      audience: (s as any).audience ?? "",
      transcript: (s as any).transcript ?? "",
      duration: (s as any).duration ?? 0,
      wordCount: (s as any).word_count ?? 0,
      feedback: (s as any).feedback_output ?? {} as FeedbackReport,
      score: (s as any).overall_score ?? 0,
      createdAt: (s as any).created_at,
    }))
  );

  // Scenario filters
  const [filterMode, setFilterMode] = useState<"all" | "get-the-job" | "perform-in-the-job">("all");
  const [filterDiff, setFilterDiff] = useState("All");
  const [filterType, setFilterType] = useState("All");

  // Back guard
  const [showExitGuard, setShowExitGuard] = useState(false);

  // Pulse Check
  const [pulseOpen, setPulseOpen] = useState(false);
  const [pulseMood, setPulseMood] = useState<PulseMood | null>(null);
  const [pulseStep, setPulseStep] = useState<"mood" | "reply" | "action">("mood");

  // Alex Rivera intro (shown once)
  const [showAlexIntro, setShowAlexIntro] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("pr_alex_seen")) {
      setShowAlexIntro(true);
    }
  }, []);

  // Processing status
  const [processingStatusIdx, setProcessingStatusIdx] = useState(0);
  const processingMessages = [
    "Transcribing your response",
    "Reviewing your delivery",
    "Checking how this lands with your audience",
  ];

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalTranscriptRef = useRef("");
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobUrlRef = useRef<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  // On mount: check speech support + show Pulse Check once per day
  useEffect(() => {
    setSpeechSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    if (shouldShowPulse()) {
      const t = setTimeout(() => { setPulseOpen(true); markPulseShown(); }, 1800);
      return () => clearTimeout(t);
    }
  }, []);

  // Back button guard during recording
  useEffect(() => {
    if (!isRecording) return;
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
      setShowExitGuard(true);
    };
    const handleUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("popstate", handlePop);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [isRecording]);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Auto-stop when time limit reached
  useEffect(() => {
    if (isRecording && studioSetup.timeLimit > 0 && recordingTime >= studioSetup.timeLimit) {
      stopRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingTime]);

  // Processing status cycling
  useEffect(() => {
    if (studioPhase !== "processing") { setProcessingStatusIdx(0); return; }
    const t1 = setTimeout(() => setProcessingStatusIdx(1), 5000);
    const t2 = setTimeout(() => setProcessingStatusIdx(2), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [studioPhase]);

  // ── Recording ───────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicAllowed(true);
      finalTranscriptRef.current = "";
      setTranscript("");
      setInterimTranscript("");
      setWordCount(0);
      setRecordingTime(0);

      audioChunksRef.current = [];
      if (audioBlobUrlRef.current) { URL.revokeObjectURL(audioBlobUrlRef.current); audioBlobUrlRef.current = null; }
      setAudioBlobUrl(null);

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      setStudioPhase("recording");

      if (speechSupported) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as new () => any;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let interim = "";
          let finalAdded = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalAdded += text + " ";
            } else {
              interim += text;
            }
          }
          if (finalAdded) {
            finalTranscriptRef.current += finalAdded;
            setTranscript(finalTranscriptRef.current);
            setWordCount(finalTranscriptRef.current.trim().split(/\s+/).filter(Boolean).length);
          }
          setInterimTranscript(interim);
        };

        recognition.onerror = () => { /* silent — recording still captures audio */ };
        recognition.start();
      }
    } catch {
      setMicAllowed(false);
    }
  }, [speechSupported]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          audioBlobUrlRef.current = url;
          setAudioBlobUrl(url);
        }
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript("");
    setStudioPhase("review");
  }, []);

  const submitForFeedback = useCallback(async () => {
    if (!studioSetup.scenario || isSubmitting) return;
    const finalTranscript = finalTranscriptRef.current.trim() || transcript.trim();
    setIsSubmitting(true);
    setSubmitError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch("/api/pitchready/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          transcript: finalTranscript || "The speaker did not produce a detectable transcript. Please provide basic feedback on starting strong.",
          scenario: studioSetup.scenario.title,
          audience: studioSetup.scenario.audience,
          duration: recordingTime,
          wordCount,
          focus: studioSetup.focus,
        }),
      });
      clearTimeout(timeout);
      const data = await res.json();
      const feedback: FeedbackReport = data.feedback;
      if (!feedback) throw new Error("No feedback returned");
      setCurrentFeedback(feedback);

      const session: SessionRecord = {
        id: `${Date.now()}`,
        scenarioId: studioSetup.scenario.id,
        scenarioTitle: studioSetup.scenario.title,
        audience: studioSetup.scenario.audience,
        transcript: finalTranscript,
        duration: recordingTime,
        wordCount,
        feedback,
        score: feedback.overallScore,
        createdAt: new Date().toISOString(),
      };
      setCurrentSession(session);
      setSessions(prev => [session, ...prev]);
      // Save to DB (fire-and-forget — don't block UI)
      fetch("/api/pitch/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          scenarioId: session.scenarioId,
          scenarioTitle: session.scenarioTitle,
          audience: session.audience,
          transcript: session.transcript,
          duration: session.duration,
          wordCount: session.wordCount,
          overallScore: session.score,
          feedback: session.feedback,
          focusArea: studioSetup.focus,
          timeLimit: studioSetup.timeLimit,
        }),
      }).catch(() => { /* silent — session already in state */ });
      setView("feedback");
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error && err.name === "AbortError"
        ? "Request timed out. Check your connection and try again."
        : "Analysis failed. Please try again.";
      setSubmitError(msg);
      setStudioPhase("processing"); // stay on processing screen to show error + retry
    } finally {
      setIsSubmitting(false);
    }
  }, [studioSetup, transcript, recordingTime, wordCount, isSubmitting]);

  function fmtTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function resetStudio() {
    setStudioPhase("setup");
    setTranscript("");
    setInterimTranscript("");
    setWordCount(0);
    setRecordingTime(0);
    finalTranscriptRef.current = "";
    audioChunksRef.current = [];
    if (audioBlobUrlRef.current) { URL.revokeObjectURL(audioBlobUrlRef.current); audioBlobUrlRef.current = null; }
    setAudioBlobUrl(null);
    setSubmitError("");
    setProcessingStatusIdx(0);
  }

  // ── Filters ─────────────────────────────────────────────────────────────────

  const difficulties = ["All", "Foundation", "Professional", "Executive"];
  const types = ["All", ...Array.from(new Set(SCENARIOS.map(s => s.type)))];

  const filteredScenarios = SCENARIOS.filter(s => {
    if (filterMode !== "all" && s.mode !== filterMode) return false;
    if (filterDiff !== "All" && s.difficulty !== filterDiff) return false;
    if (filterType !== "All" && s.type !== filterType) return false;
    return true;
  });

  // ── Progress stats ───────────────────────────────────────────────────────────

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length)
    : null;

  const recentSessions = sessions.slice(0, 6);
  const scoresByDate = recentSessions.map(s => ({
    date: new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    score: s.score,
  })).reverse();

  const dimAvgs = sessions.length > 0 ? (() => {
    const keys = ["clarity", "structure", "stakeholderAwareness", "relevance", "confidence", "conciseness"] as const;
    return Object.fromEntries(keys.map(k => [
      k,
      Math.round(sessions.reduce((a, s) => a + ((s.feedback.dimensions as Record<string, FeedbackDimension>)[k]?.score ?? 0), 0) / sessions.length)
    ]));
  })() : null;

  // ── Shared layout ────────────────────────────────────────────────────────────

  const navItems = [
    { view: "home" as PitchView, label: "Home", icon: Home },
    { view: "scenarios" as PitchView, label: "Scenario Library", icon: BookOpen },
    { view: "studio" as PitchView, label: "Practice Studio", icon: Mic },
    { view: "history" as PitchView, label: "Session History", icon: History },
    { view: "progress" as PitchView, label: "Progress", icon: TrendingUp },
  ];

  const CORAL = "#e05547";

  function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex" }}>

        {/* Pulse Check Modal */}
        {pulseOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              background: "var(--card)", border: "1px solid var(--border-mid)",
              borderRadius: "20px", padding: "36px", maxWidth: "420px", width: "90%",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: "12px" }}>
                PULSE CHECK
              </div>
              {pulseStep === "mood" && (
                <>
                  <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-1)", marginBottom: "6px" }}>
                    How are you showing up today?
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "24px", lineHeight: 1.7 }}>
                    Take 10 seconds. Be honest.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                    {(["Yay", "Good", "Meh", "Tough", "Rough"] as PulseMood[]).map((m) => {
                      const colors: Record<PulseMood, string> = { Yay: "#1fbf9f", Good: "#4ade80", Meh: "#f59e0b", Tough: "#f97316", Rough: CORAL };
                      return (
                        <button key={m} onClick={() => { setPulseMood(m); setPulseStep("reply"); }}
                          style={{
                            padding: "12px 18px", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
                            cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                            background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-mid)",
                            color: colors[m],
                          }}>
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setPulseOpen(false)} style={{ fontSize: "12px", color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "center" }}>
                    Not today
                  </button>
                </>
              )}
              {pulseStep === "reply" && pulseMood && (
                <>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                    {pulseMood.toUpperCase()}
                  </div>
                  <p style={{ fontSize: "15px", color: "var(--text-1)", lineHeight: 1.8, marginBottom: "12px" }}>
                    {PULSE_FLOWS[pulseMood].reply}
                  </p>
                  <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.7, marginBottom: "24px" }}>
                    {PULSE_FLOWS[pulseMood].followUp}
                  </p>
                  <button onClick={() => setPulseStep("action")} className="btn-teal" style={{ width: "100%", justifyContent: "center" }}>
                    Continue
                  </button>
                  <button onClick={() => setPulseOpen(false)} style={{ fontSize: "12px", color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "center", marginTop: "12px" }}>
                    Not today
                  </button>
                </>
              )}
              {pulseStep === "action" && pulseMood && (
                <>
                  <p style={{ fontSize: "15px", color: "var(--text-2)", lineHeight: 1.75, marginBottom: "24px" }}>
                    {PULSE_FLOWS[pulseMood].action}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button onClick={() => { setPulseOpen(false); setView("studio"); }} className="btn-teal" style={{ justifyContent: "center" }}>
                      Go to Practice Studio
                    </button>
                    <button onClick={() => { setPulseOpen(false); setView("scenarios"); }}
                      style={{ padding: "11px", borderRadius: "10px", border: "1px solid var(--border-mid)", background: "none", color: "var(--text-2)", fontSize: "14px", cursor: "pointer" }}>
                      Browse Scenarios
                    </button>
                    <button onClick={() => setPulseOpen(false)} style={{ fontSize: "12px", color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", textAlign: "center", marginTop: "4px" }}>
                      Not today
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Exit guard modal */}
        {showExitGuard && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border-mid)", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-1)", marginBottom: "10px" }}>Stop recording?</h3>
              <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.75, marginBottom: "24px" }}>
                Your current recording will be lost. Your transcript will not be submitted for feedback.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => { setShowExitGuard(false); stopRecording(); setView("home"); resetStudio(); }}
                  style={{ flex: 1, padding: "11px", borderRadius: "8px", border: `1px solid ${CORAL}40`, background: `${CORAL}0f`, color: CORAL, fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                  Stop and leave
                </button>
                <button onClick={() => setShowExitGuard(false)} className="btn-teal" style={{ flex: 1, justifyContent: "center" }}>
                  Keep recording
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEFT SIDEBAR */}
        <div style={{
          width: "240px", flexShrink: 0, borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column", minHeight: "100vh",
          position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        }}>
          <div style={{ padding: "24px 20px 16px" }}>
            <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-3)", textDecoration: "none", marginBottom: "14px", opacity: 0.7 }}>
              <ArrowLeft size={12} /> Dashboard
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: `linear-gradient(135deg, ${CORAL}, #f97316)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Mic size={14} color="#fff" />
              </div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.02em" }}>PitchReady</div>
            </div>
          </div>

          <div style={{ padding: "0 10px", flex: 1 }}>
            {navItems.map(({ view: v, label, icon: Icon }) => {
              const active = view === v || (view === "feedback" && v === "studio");
              return (
                <button key={v} onClick={() => {
                  if (isRecording) { setShowExitGuard(true); return; }
                  setView(v);
                  if (v === "studio") resetStudio();
                }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "8px", border: "none",
                    background: active ? `${CORAL}12` : "transparent",
                    borderLeft: active ? `3px solid ${CORAL}` : "3px solid transparent",
                    cursor: "pointer", marginBottom: "2px", transition: "all 0.15s",
                    paddingLeft: active ? "9px" : "12px",
                  }}>
                  <Icon size={15} color={active ? CORAL : "var(--text-3)"} />
                  <span style={{ fontSize: "13px", fontWeight: active ? 700 : 500, color: active ? "var(--text-1)" : "var(--text-2)" }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {sessions.length > 0 && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", margin: "0 0 0" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "8px" }}>YOUR PROGRESS</div>
              {avgScore !== null && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" }}>
                  <span style={{ color: "var(--text-3)" }}>Avg score</span>
                  <span style={{ fontWeight: 800, color: avgScore >= 70 ? "var(--teal)" : "#f59e0b" }}>{avgScore}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--text-3)" }}>Sessions</span>
                <span style={{ fontWeight: 800, color: CORAL }}>{sessions.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HOME
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "home") return (
    <Layout>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, #0e0a0a 0%, #0f0d0d 40%, rgba(224,85,71,0.05) 100%)`,
        borderBottom: "1px solid var(--border)",
        padding: "64px 48px 48px",
      }}>
        <div style={{ maxWidth: "720px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: `${CORAL}12`, border: `1px solid ${CORAL}28`, borderRadius: "20px", padding: "5px 14px", marginBottom: "20px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: CORAL }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.08em" }}>PITCHREADY — BA COMMUNICATION PRACTICE</span>
          </div>
          <h1 style={{ fontSize: "42px", fontWeight: 900, color: "var(--text-1)", marginBottom: "16px", lineHeight: 1.08, letterSpacing: "-0.04em" }}>
            Most candidates fail not because they lack experience — but because they cannot communicate it clearly.
          </h1>
          <p style={{ fontSize: "17px", color: "var(--text-2)", lineHeight: 1.75, marginBottom: "8px", maxWidth: "540px" }}>
            Fix that before your next interview or meeting.
          </p>
          <p style={{ fontSize: "15px", color: "var(--text-3)", lineHeight: 1.7, marginBottom: "32px", maxWidth: "540px" }}>
            Speak real BA scenarios out loud. Get specific coaching from Alex Rivera on what to fix before it matters.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
            <button className="btn-teal" onClick={() => setView("studio")} style={{ fontSize: "15px", padding: "13px 28px" }}>
              <Mic size={16} /> Start Practising
            </button>
            <button onClick={() => setView("scenarios")}
              style={{ padding: "13px 24px", borderRadius: "10px", border: "1px solid var(--border-mid)", background: "transparent", color: "var(--text-1)", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
              Browse Scenarios <ChevronRight size={15} style={{ display: "inline", verticalAlign: "middle" }} />
            </button>
          </div>
          {/* Mode entry points */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => { setFilterMode("get-the-job"); setView("scenarios"); }}
              style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${CORAL}40`, background: `${CORAL}0a`, color: CORAL, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              Before the interview →
            </button>
            <button onClick={() => { setFilterMode("perform-in-the-job"); setView("scenarios"); }}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(31,191,159,0.3)", background: "rgba(31,191,159,0.06)", color: "var(--teal)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              In the job →
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "40px 48px", maxWidth: "1200px" }}>

        {/* Alex Rivera intro — shown once */}
        {showAlexIntro && (
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-mid)",
            borderRadius: "14px", padding: "20px 24px", marginBottom: "28px",
            display: "flex", alignItems: "flex-start", gap: "16px",
          }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `linear-gradient(135deg, ${CORAL}, #f97316)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>AR</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "4px" }}>MEET YOUR COACH</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-1)", marginBottom: "4px" }}>Alex Rivera</div>
              <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.7, margin: 0 }}>
                Senior Business Analyst who helps you structure your thinking, communicate clearly, and present with confidence in real BA situations.
              </p>
            </div>
            <button onClick={() => { localStorage.setItem("pr_alex_seen", "1"); setShowAlexIntro(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontSize: "18px", lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>
              ×
            </button>
          </div>
        )}

        {/* Stats row */}
        {sessions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "40px" }}>
            {[
              { label: "Sessions Completed", value: String(sessions.length), color: CORAL },
              { label: "Average Score", value: avgScore != null ? String(avgScore) : "No data", color: avgScore != null && avgScore >= 70 ? "var(--teal)" : "#f59e0b" },
              { label: "Scenarios Practiced", value: String(new Set(sessions.map(s => s.scenarioId)).size), color: "var(--teal)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "8px" }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: "32px", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* How it works */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "20px" }}>HOW IT WORKS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { step: "01", title: "Choose a Scenario", body: "12 workplace scenarios built for BAs — stakeholder walkthroughs, executive pitches, sprint reviews, change requests, and more. Each one mirrors a real situation.", action: () => setView("scenarios"), cta: "Browse scenarios" },
              { step: "02", title: "Record Your Delivery", body: "Press record and speak directly in the browser. Live transcript appears as you talk. A waveform shows you are being heard. Speak for 2 to 5 minutes.", action: () => setView("studio"), cta: "Open studio" },
              { step: "03", title: "Get Specific Coaching", body: "Alex Rivera scores your clarity, structure, confidence, executive presence, filler words, pacing, and audience alignment — with direct quotes from your own words.", action: () => { if (sessions.length > 0) { router.push(`/pitchready/session/${sessions[0].id}`); } else setView("studio"); }, cta: sessions.length > 0 ? "View last feedback" : "See an example" },
            ].map(({ step, title, body, action, cta }) => (
              <div key={step} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: CORAL, letterSpacing: "0.08em", marginBottom: "12px" }}>{step}</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-1)", marginBottom: "10px", lineHeight: 1.3 }}>{title}</div>
                <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.75, flex: 1 }}>{body}</p>
                <button onClick={action} style={{ marginTop: "18px", fontSize: "12px", fontWeight: 700, color: CORAL, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                  {cta} <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Last session */}
        {sessions.length > 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em" }}>LAST SESSION</div>
              <button onClick={() => setView("history")} style={{ fontSize: "12px", color: CORAL, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View all</button>
            </div>
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
                <ScoreRing score={sessions[0].score} size={80} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: "var(--text-1)", lineHeight: 1 }}>{sessions[0].score}</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-1)", marginBottom: "4px" }}>{sessions[0].scenarioTitle}</div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "10px" }}>
                  {new Date(sessions[0].createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {fmtTime(sessions[0].duration)} · {sessions[0].wordCount} words
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>
                  {sessions[0].feedback.topWin}
                </p>
              </div>
              <button onClick={() => router.push(`/pitchready/session/${sessions[0].id}`)} className="btn-teal" style={{ flexShrink: 0 }}>
                View feedback
              </button>
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div style={{ background: `linear-gradient(135deg, ${CORAL}06, transparent)`, border: `1px solid ${CORAL}20`, borderRadius: "14px", padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-1)", marginBottom: "8px" }}>Your first session is waiting</div>
            <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "20px", lineHeight: 1.7 }}>
              Pick a scenario and record yourself speaking for two minutes. Alex Rivera will tell you exactly what to fix before the real meeting.
            </p>
            <button className="btn-teal" onClick={() => setView("studio")}>
              <Mic size={14} /> Start your first session
            </button>
          </div>
        )}
      </div>
    </Layout>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SCENARIOS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "scenarios") return (
    <Layout>
      <div style={{ padding: "40px 48px" }}>
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-1)", marginBottom: "8px" }}>What situation do you want to handle better?</h2>
          <p style={{ fontSize: "15px", color: "var(--text-2)" }}>
            {SCENARIOS.length} real BA situations — interviews, stakeholder meetings, and on the job.
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {([
            { key: "all", label: "All scenarios" },
            { key: "get-the-job", label: "Get the Job" },
            { key: "perform-in-the-job", label: "Perform in the Job" },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => { setFilterMode(key); setFilterDiff("All"); setFilterType("All"); }}
              style={{
                padding: "9px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
                border: `1px solid ${filterMode === key ? CORAL : "var(--border-mid)"}`,
                background: filterMode === key ? `${CORAL}12` : "transparent",
                color: filterMode === key ? CORAL : "var(--text-3)",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Secondary filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "28px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {difficulties.map(d => (
              <button key={d} onClick={() => setFilterDiff(d)}
                style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: `1px solid ${filterDiff === d ? CORAL : "var(--border-mid)"}`, background: filterDiff === d ? `${CORAL}15` : "transparent", color: filterDiff === d ? CORAL : "var(--text-3)" }}>
                {d}
              </button>
            ))}
          </div>
          <div style={{ width: "1px", background: "var(--border)", margin: "0 4px" }} />
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {types.map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: `1px solid ${filterType === t ? "var(--teal)" : "var(--border-mid)"}`, background: filterType === t ? "var(--teal-soft)" : "transparent", color: filterType === t ? "var(--teal)" : "var(--text-3)" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {filteredScenarios.map(s => {
            const diffColors: Record<string, string> = { Foundation: "var(--teal)", Professional: "#f59e0b", Executive: CORAL };
            const color = diffColors[s.difficulty];
            return (
              <ScenarioTile key={s.id} scenario={s} color={color} onSelect={() => {
                setStudioSetup({ scenario: s, audience: s.audience, difficulty: s.difficulty, timeLimit: 300, focus: "clarity" });
                resetStudio();
                setStudioPhase("ready");
                setView("studio");
              }} />
            );
          })}
        </div>
      </div>
    </Layout>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PRACTICE STUDIO
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "studio" || (view === "feedback" && (studioPhase === "processing" || studioPhase === "review"))) {
    const focusOptions = [
      { value: "all", label: "All aspects (recommended)" },
      { value: "clarity", label: "Clarity" },
      { value: "confidence", label: "Confidence" },
      { value: "structure", label: "Structure" },
      { value: "executive-presence", label: "Executive Presence" },
      { value: "filler-words", label: "Filler Words" },
    ];

    return (
      <Layout>
        <div style={{ padding: "40px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-1)", margin: 0 }}>Practice Studio</h2>
            {studioPhase === "recording" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "20px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444", animation: "prWave 0.8s ease-in-out infinite" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", letterSpacing: "0.07em" }}>RECORDING</span>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px", alignItems: "start" }}>

            {/* Center: Studio workspace */}
            <div>

              {/* SETUP PHASE */}
              {studioPhase === "setup" && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "32px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-1)", marginBottom: "24px" }}>Configure your session</h3>

                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "12px" }}>SCENARIO</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
                      {SCENARIOS.map(s => {
                        const sel = studioSetup.scenario?.id === s.id;
                        return (
                          <button key={s.id} onClick={() => setStudioSetup(p => ({ ...p, scenario: s, audience: s.audience }))}
                            style={{ textAlign: "left", padding: "12px 16px", borderRadius: "10px", border: `2px solid ${sel ? CORAL : "var(--border)"}`, background: sel ? `${CORAL}12` : "transparent", cursor: "pointer", transition: "all 0.15s", transform: sel ? "scale(1.01)" : "scale(1)", boxShadow: sel ? `0 0 0 3px ${CORAL}18` : "none" }}>
                            <div style={{ fontSize: "13px", fontWeight: sel ? 700 : 600, color: sel ? CORAL : "var(--text-2)", marginBottom: "2px" }}>{s.title}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{s.difficulty} · {s.duration}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "10px" }}>TIME LIMIT</div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {[{ v: 120, l: "2 min" }, { v: 300, l: "5 min" }, { v: 480, l: "8 min" }].map(({ v, l }) => (
                          <button key={v} onClick={() => setStudioSetup(p => ({ ...p, timeLimit: v }))}
                            style={{ flex: 1, padding: "9px 6px", borderRadius: "8px", border: `1px solid ${studioSetup.timeLimit === v ? CORAL + "50" : "var(--border)"}`, background: studioSetup.timeLimit === v ? `${CORAL}0f` : "transparent", color: studioSetup.timeLimit === v ? CORAL : "var(--text-2)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "4px" }}>FOCUS AREA</div>
                      <div style={{ fontSize: "11px", color: "var(--text-4)", marginBottom: "8px" }}>Choose what you want feedback on</div>
                      <select value={studioSetup.focus} onChange={e => setStudioSetup(p => ({ ...p, focus: e.target.value }))}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-1)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        {focusOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <button className="btn-teal" onClick={() => studioSetup.scenario && setStudioPhase("ready")}
                    style={{ justifyContent: "center", width: "100%", opacity: studioSetup.scenario ? 1 : 0.4 }}
                    disabled={!studioSetup.scenario}>
                    Continue to Studio <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* READY PHASE */}
              {studioPhase === "ready" && studioSetup.scenario && (
                <div>
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.08em", marginBottom: "6px" }}>YOUR SCENARIO</div>
                        <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-1)", margin: 0, lineHeight: 1.3 }}>{studioSetup.scenario.title}</h3>
                      </div>
                      <button onClick={() => setStudioPhase("setup")} style={{ fontSize: "12px", color: "var(--text-3)", background: "none", border: "none", cursor: "pointer" }}>Change</button>
                    </div>
                    <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.75, marginBottom: "16px" }}>{studioSetup.scenario.description}</p>
                    <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", borderLeft: "3px solid var(--teal)" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.07em", marginBottom: "5px" }}>ALEX RIVERA&rsquo;S TIP</div>
                      <p style={{ fontSize: "13px", color: "var(--text-2)", margin: 0, lineHeight: 1.7 }}>{studioSetup.scenario.coachTip}</p>
                    </div>
                  </div>

                  {/* Mic check */}
                  {micAllowed === false && (
                    <div style={{ padding: "14px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: "1px" }} />
                      <div style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>
                        Microphone access was denied. Please allow microphone access in your browser settings and refresh the page.
                      </div>
                    </div>
                  )}

                  {!speechSupported && (
                    <div style={{ padding: "14px 18px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", marginBottom: "16px", fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>
                      Live transcript is not supported in this browser. Your session will still be recorded and submitted for feedback. For best results, use Chrome or Edge.
                    </div>
                  )}

                  <div style={{ textAlign: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-3)" }}>
                      You have {Math.round(studioSetup.timeLimit / 60)} minute{studioSetup.timeLimit !== 60 ? "s" : ""}. Start when ready.
                    </span>
                  </div>
                  <button className="btn-teal" onClick={startRecording} style={{ width: "100%", justifyContent: "center", fontSize: "16px", padding: "16px" }}>
                    <Mic size={18} /> Start your delivery
                  </button>
                </div>
              )}

              {/* RECORDING PHASE */}
              {studioPhase === "recording" && (() => {
                const timeLeft = Math.max(0, studioSetup.timeLimit - recordingTime);
                const isLastTen = timeLeft <= 10;
                const timerColor = isLastTen ? "#ef4444" : "var(--text-1)";
                return (
                <div>
                  <div style={{ background: "var(--card)", border: `1px solid ${isLastTen ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.2)"}`, borderRadius: "16px", padding: "32px", marginBottom: "16px", textAlign: "center", transition: "border-color 0.3s" }}>
                    <WaveformBars active={isRecording} />
                    <div style={{
                      fontSize: "64px", fontWeight: 900, color: timerColor, marginTop: "16px",
                      fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
                      animation: isLastTen ? "prWave 0.8s ease-in-out infinite" : "none",
                      transition: "color 0.3s",
                    }}>
                      {fmtTime(timeLeft)}
                    </div>
                    <div style={{ fontSize: "13px", color: isLastTen ? "#ef4444" : "var(--text-3)", marginTop: "6px", transition: "color 0.3s" }}>
                      {isLastTen ? "Finish your sentence" : wordCount > 0 ? `${wordCount} words captured` : "Listening..."}
                    </div>
                    <div style={{ marginTop: "24px" }}>
                      <button onClick={stopRecording}
                        style={{ padding: "14px 32px", borderRadius: "12px", background: "#ef4444", border: "none", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <Square size={16} /> Stop recording
                      </button>
                    </div>
                  </div>

                  {/* Live transcript */}
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "12px" }}>
                      LIVE TRANSCRIPT {!speechSupported && "· Not available in this browser"}
                    </div>
                    <div style={{ fontSize: "15px", color: "var(--text-2)", lineHeight: 1.85, minHeight: "80px" }}>
                      {transcript}
                      {interimTranscript && (
                        <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>{interimTranscript}</span>
                      )}
                      {!transcript && !interimTranscript && (
                        <span style={{ color: "var(--text-4)" }}>Your words will appear here as you speak...</span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })()}

              {/* REVIEW PHASE */}
              {studioPhase === "review" && (
                <div>
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.09em", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle size={12} /> RECORDING COMPLETE
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "20px" }}>
                      {fmtTime(recordingTime)} recorded · {wordCount} words
                    </div>

                    {audioBlobUrl && (
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "8px" }}>PLAYBACK</div>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <audio controls src={audioBlobUrl} style={{ width: "100%", borderRadius: "8px", accentColor: CORAL }} />
                      </div>
                    )}

                    {transcript.length > 0 && (
                      <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "16px", marginBottom: "20px", maxHeight: "160px", overflowY: "auto" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "10px" }}>YOUR TRANSCRIPT</div>
                        <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.8, margin: 0 }}>{transcript}</p>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "12px" }}>
                      <button className="btn-teal" onClick={() => { setStudioPhase("processing"); submitForFeedback(); }} style={{ flex: 1, justifyContent: "center" }}>
                        Submit for review
                      </button>
                      <button onClick={() => { resetStudio(); setStudioPhase("ready"); }}
                        style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid var(--border-mid)", background: "none", color: "var(--text-2)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        Re-record
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PROCESSING PHASE */}
              {studioPhase === "processing" && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "48px", textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: `3px solid ${CORAL}`, borderTopColor: "transparent", animation: "spin 0.9s linear infinite" }} />
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-1)", marginBottom: "6px" }}>
                    Alex Rivera is reviewing how this would land with your audience
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "24px" }}>
                    Looking at your clarity, structure, and executive presence
                  </p>

                  {/* Status steps */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "280px", margin: "0 auto 24px" }}>
                    {processingMessages.map((msg, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", opacity: i <= processingStatusIdx ? 1 : 0.3, transition: "opacity 0.5s" }}>
                        <div style={{
                          width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                          background: i < processingStatusIdx ? "var(--teal)" : i === processingStatusIdx ? CORAL : "var(--text-4)",
                          transition: "background 0.5s",
                        }} />
                        <span style={{ fontSize: "13px", color: i === processingStatusIdx ? "var(--text-1)" : "var(--text-3)", fontWeight: i === processingStatusIdx ? 600 : 400, transition: "all 0.5s" }}>
                          {msg}
                        </span>
                      </div>
                    ))}
                  </div>

                  {submitError && (
                    <div style={{ marginTop: "16px" }}>
                      <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{submitError}</p>
                      <button className="btn-teal" onClick={() => { setStudioPhase("processing"); submitForFeedback(); }} style={{ justifyContent: "center" }}>
                        Try again
                      </button>
                      <button onClick={() => setStudioPhase("review")}
                        style={{ display: "block", margin: "10px auto 0", fontSize: "12px", color: "var(--text-3)", background: "none", border: "none", cursor: "pointer" }}>
                        Go back to review
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: session info */}
            <div>
              {studioSetup.scenario && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "14px" }}>SESSION DETAILS</div>
                  {[
                    { label: "Scenario", value: studioSetup.scenario.title },
                    { label: "Audience", value: studioSetup.scenario.audience },
                    { label: "Difficulty", value: studioSetup.scenario.difficulty },
                    { label: "Time limit", value: fmtTime(studioSetup.timeLimit) },
                    { label: "Focus", value: focusOptions.find(f => f.value === studioSetup.focus)?.label ?? "" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-4)", marginBottom: "2px" }}>{label}</div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)" }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "14px" }}>COACHING DIMENSIONS</div>
                {["Clarity", "Structure", "Confidence", "Audience alignment", "Executive presence", "Filler words", "Pacing"].map(d => (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: CORAL, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{d}</span>
                  </div>
                ))}
                <p style={{ fontSize: "11px", color: "var(--text-4)", lineHeight: 1.65, marginTop: "12px" }}>
                  Alex Rivera scores and explains each dimension with direct quotes from your delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FEEDBACK REPORT
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "feedback" && currentFeedback) {
    const fb = currentFeedback;
    const sess = currentSession;
    const scoreColor = fb.overallScore >= 75 ? "var(--teal)" : fb.overallScore >= 55 ? "#f59e0b" : CORAL;

    return (
      <Layout>
        <div style={{ padding: "40px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "6px" }}>COACHING REPORT</div>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-1)", margin: 0 }}>{sess?.scenarioTitle ?? "Practice Session"}</h2>
              {sess && (
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
                  {new Date(sess.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {fmtTime(sess.duration)} · {sess.wordCount} words
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { resetStudio(); setView("studio"); }} className="btn-teal">
                <Mic size={14} /> Practice again
              </button>
              <button onClick={() => setView("scenarios")} style={{ padding: "11px 18px", borderRadius: "10px", border: "1px solid var(--border-mid)", background: "transparent", color: "var(--text-2)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                New scenario
              </button>
            </div>
          </div>

          {/* Now use this */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 24px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.07em", flexShrink: 0 }}>NOW USE THIS</span>
            <a href="/resume" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: `${CORAL}10`, border: `1px solid ${CORAL}30`, color: CORAL, fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
              Improve your resume
            </a>
            <a href="/opportunities" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-2)", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
              Review a role
            </a>
            <button onClick={() => { resetStudio(); setView("scenarios"); }} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-2)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              Practice another scenario
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>

            {/* Left: full report */}
            <div>
              {/* Top win / top fix */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
                <div style={{ background: "rgba(31,191,159,0.06)", border: "1px solid rgba(31,191,159,0.2)", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.09em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <CheckCircle size={12} /> TOP WIN
                  </div>
                  <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.75, margin: 0 }}>{fb.topWin}</p>
                </div>
                <div style={{ background: `${CORAL}08`, border: `1px solid ${CORAL}28`, borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: CORAL, letterSpacing: "0.09em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Target size={12} /> TOP FIX
                  </div>
                  <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.75, margin: 0 }}>{fb.topFix}</p>
                </div>
              </div>

              {/* Reusable Answer */}
              {fb.coachRewrite && (
                <ReusableAnswerCard answer={fb.coachRewrite} />
              )}

              {/* Do This Next */}
              <div style={{
                background: `${CORAL}0a`, border: `2px solid ${CORAL}40`,
                borderRadius: "14px", padding: "22px", marginBottom: "20px",
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.09em", marginBottom: "10px" }}>DO THIS NEXT</div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-1)", lineHeight: 1.65, margin: "0 0 14px" }}>{fb.doThisNext}</p>
                <button onClick={() => { resetStudio(); setStudioPhase("ready"); }} className="btn-teal" style={{ fontSize: "12px", padding: "9px 18px" }}>
                  Try again with this improvement
                </button>
              </div>

              {/* Dimension scores */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "20px" }}>DIMENSION SCORES</div>
                {([
                  ["Clarity", fb.dimensions.clarity?.score ?? 0],
                  ["Structure", fb.dimensions.structure?.score ?? 0],
                  ["Stakeholder Awareness", fb.dimensions.stakeholderAwareness?.score ?? 0],
                  ["Relevance", fb.dimensions.relevance?.score ?? 0],
                  ["Confidence", fb.dimensions.confidence?.score ?? 0],
                  ["Conciseness", fb.dimensions.conciseness?.score ?? 0],
                ] as [string, number][]).map(([label, score]) => {
                  const c = score >= 75 ? "var(--teal)" : score >= 55 ? "#f59e0b" : CORAL;
                  return (
                    <div key={label} style={{ marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>{label}</span>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: c }}>{score}</span>
                      </div>
                      <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${score}%`, background: c, borderRadius: "3px", transition: "width 1s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Conditional rewrites */}
              {(fb.improvedOpening || fb.improvedClosing) && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "20px" }}>SUGGESTED REWRITES</div>
                  {fb.improvedOpening && (
                    <div style={{ marginBottom: "18px", paddingBottom: "18px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.07em", marginBottom: "8px" }}>STRONGER OPENING</div>
                      <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.8, margin: 0 }}>{fb.improvedOpening}</p>
                    </div>
                  )}
                  {fb.improvedClosing && (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: CORAL, letterSpacing: "0.07em", marginBottom: "8px" }}>STRONGER CLOSING</div>
                      <p style={{ fontSize: "14px", color: "var(--text-1)", lineHeight: 1.8, margin: 0 }}>{fb.improvedClosing}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: score summary */}
            <div>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "16px" }}>OVERALL SCORE</div>
                <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 12px" }}>
                  <ScoreRing score={fb.overallScore} size={120} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "36px", fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{fb.overallScore}</span>
                    <span style={{ fontSize: "10px", color: "var(--text-4)", marginTop: "2px" }}>out of 100</span>
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>
                  {fb.overallScore >= 80 ? "Excellent delivery. You are ready for the real meeting." : fb.overallScore >= 65 ? "Solid session. Apply the top fix and record again." : "Good start. Focus on the top fix first. One session is all it takes to see a jump."}
                </div>
              </div>

              {/* Quick dim summary */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "14px" }}>AT A GLANCE</div>
                {([
                  ["Clarity", fb.dimensions.clarity?.score ?? 0],
                  ["Structure", fb.dimensions.structure?.score ?? 0],
                  ["Confidence", fb.dimensions.confidence?.score ?? 0],
                  ["Stakeholder", fb.dimensions.stakeholderAwareness?.score ?? 0],
                  ["Conciseness", fb.dimensions.conciseness?.score ?? 0],
                ] as [string, number][]).map(([label, score]) => {
                  const s = score as number;
                  const c = s >= 75 ? "var(--teal)" : s >= 55 ? "#f59e0b" : CORAL;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-3)", width: "90px", flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                        <div style={{ height: "100%", width: `${s}%`, background: c, borderRadius: "2px", transition: "width 1s" }} />
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: c, width: "28px", textAlign: "right" }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Transcript review */}
          {sess?.transcript && (
            <div style={{ marginTop: "24px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "14px" }}>YOUR TRANSCRIPT</div>
              <p style={{ fontSize: "15px", color: "var(--text-2)", lineHeight: 1.9, margin: 0 }}>{sess.transcript}</p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION HISTORY
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "history") return (
    <Layout>
      <div style={{ padding: "40px 48px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-1)", marginBottom: "6px" }}>Session History</h2>
          <p style={{ fontSize: "14px", color: "var(--text-3)" }}>{sessions.length} sessions recorded</p>
        </div>

        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <History size={26} color="var(--text-4)" />
            </div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-2)", marginBottom: "8px" }}>No sessions yet</div>
            <p style={{ fontSize: "14px", color: "var(--text-3)", marginBottom: "24px" }}>Complete your first practice session to see your history here.</p>
            <button className="btn-teal" onClick={() => setView("studio")}>
              <Mic size={14} /> Start practising
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sessions.map((s, i) => {
              const c = s.score >= 75 ? "var(--teal)" : s.score >= 55 ? "#f59e0b" : CORAL;
              const topDim = Object.entries(s.feedback.dimensions).map(([k, v]) => ({ key: k, score: (v as FeedbackDimension).score })).sort((a, b) => b.score - a.score)[0];
              const weakDim = Object.entries(s.feedback.dimensions).map(([k, v]) => ({ key: k, score: (v as FeedbackDimension).score })).sort((a, b) => a.score - b.score)[0];
              return (
                <div key={s.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px", display: "flex", gap: "20px", alignItems: "center", cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-mid)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}>
                  <div style={{ textAlign: "center", flexShrink: 0, width: "48px" }}>
                    <div style={{ fontSize: "24px", fontWeight: 900, color: c, lineHeight: 1 }}>{s.score}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-4)", marginTop: "2px" }}>score</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-1)", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {i === 0 && <span style={{ fontSize: "10px", fontWeight: 700, color: CORAL, background: `${CORAL}15`, padding: "2px 7px", borderRadius: "8px", marginRight: "8px" }}>LATEST</span>}
                      {s.scenarioTitle}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "8px" }}>
                      {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {fmtTime(s.duration)} · {s.wordCount} words
                    </div>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <span style={{ fontSize: "11px", color: "var(--teal)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle size={11} /> {topDim?.key ?? ""}
                      </span>
                      <span style={{ fontSize: "11px", color: "#f59e0b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Target size={11} /> {weakDim?.key ?? ""}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => router.push(`/pitchready/session/${s.id}`)} className="btn-teal" style={{ flexShrink: 0, fontSize: "12px", padding: "9px 16px" }}>
                    View report
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PROGRESS DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "progress") return (
    <Layout>
      <div style={{ padding: "40px 48px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-1)", marginBottom: "6px" }}>Progress Dashboard</h2>
          <p style={{ fontSize: "14px", color: "var(--text-3)" }}>Your development across {sessions.length} sessions</p>
        </div>

        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <TrendingUp size={26} color="var(--text-4)" />
            </div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-2)", marginBottom: "8px" }}>No progress data yet</div>
            <p style={{ fontSize: "14px", color: "var(--text-3)", marginBottom: "24px" }}>Complete at least two sessions to see trends here.</p>
            <button className="btn-teal" onClick={() => setView("studio")}>
              <Mic size={14} /> Start your first session
            </button>
          </div>
        ) : (
          <>
            {/* Insight line */}
            {dimAvgs && (() => {
              const dimLabels: Record<string, string> = { clarity: "Clarity", structure: "Structure", stakeholderAwareness: "Stakeholder Awareness", relevance: "Relevance", confidence: "Confidence", conciseness: "Conciseness" };
              const sorted = Object.entries(dimAvgs).sort((a, b) => b[1] - a[1]);
              const strong = dimLabels[sorted[0][0]];
              const weak = dimLabels[sorted[sorted.length - 1][0]];
              return (
                <div style={{ background: `${CORAL}08`, border: `1px solid ${CORAL}22`, borderRadius: "12px", padding: "18px 24px", marginBottom: "28px" }}>
                  <p style={{ fontSize: "15px", color: "var(--text-1)", lineHeight: 1.7, margin: 0 }}>
                    Your strongest area is <strong style={{ color: "var(--teal)" }}>{strong}</strong>. <strong style={{ color: CORAL }}>{weak}</strong> still needs work — make it your focus next session.
                  </p>
                </div>
              );
            })()}

            {/* Key metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "28px" }}>
              {[
                { label: "Average Score", value: avgScore != null ? String(avgScore) : "N/A", color: avgScore != null && avgScore >= 70 ? "var(--teal)" : "#f59e0b" },
                { label: "Sessions Completed", value: String(sessions.length), color: CORAL },
                { label: "Scenarios Covered", value: String(new Set(sessions.map(s => s.scenarioId)).size), color: "var(--teal)" },
                { label: "Latest Score", value: String(sessions[0]?.score ?? 0), color: sessions[0]?.score >= 70 ? "var(--teal)" : "#f59e0b" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.08em", marginBottom: "8px" }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize: "30px", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Score trend */}
            {scoresByDate.length >= 2 && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "20px" }}>SCORE TREND — last {scoresByDate.length} sessions</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px" }}>
                  {scoresByDate.map(({ date, score }, i) => {
                    const c = score >= 75 ? "var(--teal)" : score >= 55 ? "#f59e0b" : CORAL;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 800, color: c }}>{score}</div>
                        <div style={{ width: "100%", height: `${(score / 100) * 70}px`, background: c, borderRadius: "4px 4px 0 0", opacity: 0.8, transition: "height 0.8s" }} />
                        <div style={{ fontSize: "9px", color: "var(--text-4)", whiteSpace: "nowrap" }}>{date}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dimension averages */}
            {dimAvgs && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "18px" }}>DIMENSION AVERAGES</div>
                  {Object.entries(dimAvgs).map(([key, score]) => {
                    const labels: Record<string, string> = { clarity: "Clarity", structure: "Structure", stakeholderAwareness: "Stakeholder Awareness", relevance: "Relevance", confidence: "Confidence", conciseness: "Conciseness" };
                    const c = score >= 75 ? "var(--teal)" : score >= 55 ? "#f59e0b" : CORAL;
                    return (
                      <div key={key} style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-2)" }}>{labels[key]}</span>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: c }}>{score}</span>
                        </div>
                        <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                          <div style={{ height: "100%", width: `${score}%`, background: c, borderRadius: "2px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Weakest + recommendation */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {(() => {
                    const weakKey = Object.entries(dimAvgs).sort((a, b) => a[1] - b[1])[0];
                    const strongKey = Object.entries(dimAvgs).sort((a, b) => b[1] - a[1])[0];
                    const dimLabels: Record<string, string> = { clarity: "Clarity", structure: "Structure", stakeholderAwareness: "Stakeholder Awareness", relevance: "Relevance", confidence: "Confidence", conciseness: "Conciseness" };
                    return (
                      <>
                        <div style={{ background: `${CORAL}07`, border: `1px solid ${CORAL}20`, borderRadius: "12px", padding: "20px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: CORAL, letterSpacing: "0.09em", marginBottom: "10px" }}>WEAKEST DIMENSION</div>
                          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-1)", marginBottom: "6px" }}>{dimLabels[weakKey[0]]} · {weakKey[1]}</div>
                          <p style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.65, margin: "0 0 14px" }}>Your average here is your biggest coaching opportunity. Prioritise this in your next session.</p>
                          <button className="btn-teal" style={{ fontSize: "12px", padding: "9px 16px" }} onClick={() => { setStudioSetup(p => ({ ...p, focus: weakKey[0] })); resetStudio(); setView("studio"); }}>
                            Practice this focus
                          </button>
                        </div>
                        <div style={{ background: "rgba(31,191,159,0.06)", border: "1px solid rgba(31,191,159,0.18)", borderRadius: "12px", padding: "20px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--teal)", letterSpacing: "0.09em", marginBottom: "6px" }}>STRONGEST DIMENSION</div>
                          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-1)" }}>{dimLabels[strongKey[0]]} · {strongKey[1]}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Most practiced scenarios */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.09em", marginBottom: "18px" }}>SCENARIOS PRACTICED</div>
              {(() => {
                const counts: Record<string, { title: string; count: number; bestScore: number }> = {};
                sessions.forEach(s => {
                  if (!counts[s.scenarioId]) counts[s.scenarioId] = { title: s.scenarioTitle, count: 0, bestScore: 0 };
                  counts[s.scenarioId].count++;
                  counts[s.scenarioId].bestScore = Math.max(counts[s.scenarioId].bestScore, s.score);
                });
                return Object.entries(counts).sort((a, b) => b[1].count - a[1].count).map(([id, { title, count, bestScore }]) => {
                  const c = bestScore >= 75 ? "var(--teal)" : bestScore >= 55 ? "#f59e0b" : CORAL;
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)", marginBottom: "2px" }}>{title}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-4)" }}>{count} session{count !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-4)", marginBottom: "2px" }}>best</div>
                        <div style={{ fontSize: "16px", fontWeight: 900, color: c }}>{bestScore}</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ padding: "80px 48px", textAlign: "center" }}>
        <div style={{ fontSize: "14px", color: "var(--text-4)" }}>Select a section from the sidebar to get started.</div>
      </div>
    </Layout>
  );
}
