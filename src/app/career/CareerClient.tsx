"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ChallengeAttempt, UserBadge, UserProgress } from "@/lib/progress";

// ── Types ──────────────────────────────────────────────────────────────────────

type CareerTool = "resume" | "cover-letter" | "jd" | "interview" | "linkedin";
type ResumeTemplate = "technical" | "operational" | "strategic";
type CoverLetterTone = "professional" | "conversational" | "executive";
type LinkedInStyle = "concise" | "detailed" | "confident";
type InterviewCategory = "behavioral" | "technical" | "stakeholder" | "process";

interface Skills {
  elicitation: number;
  requirements: number;
  solutionAnalysis: number;
  stakeholderMgmt: number;
}

interface JDAnalysis {
  matchScore: number;
  roleSummary: string;
  matchedSkills: { skill: string; evidence: string }[];
  gapSkills: { skill: string; priority: "high" | "medium" | "low"; recommendation: string }[];
  interviewTalkingPoints: string[];
  questionsToExpect: string[];
  fitVerdict: string;
}

interface StarScore {
  score: number;
  feedback: string;
}

interface InterviewFeedback {
  overallScore: number;
  star: { situation: StarScore; task: StarScore; action: StarScore; result: StarScore };
  delivery: { pacing: { score: number; wpm: number; feedback: string }; confidence: { score: number; feedback: string } };
  topStrength: string;
  topImprovement: string;
  missingElement: string;
  suggestedRewrite: string;
  interviewerPerspective: string;
}

interface Props {
  userId: string;
  fullName: string;
  tier: string;
  attempts: ChallengeAttempt[];
  badges: UserBadge[];
  progress: UserProgress;
  skills: Skills;
}

// ── Interview Question Bank ────────────────────────────────────────────────────

const INTERVIEW_QUESTIONS: Record<InterviewCategory, string[]> = {
  behavioral: [
    "Tell me about a time you had to manage conflicting stakeholder requirements. What did you do and what was the outcome?",
    "Describe a situation where your analysis uncovered a problem the business hadn't anticipated. How did you handle it?",
    "Give me an example of when you had to influence a decision without having direct authority over the people involved.",
    "Tell me about a time a project requirement changed significantly mid-delivery. How did you adapt?",
    "Describe a situation where you disagreed with a stakeholder's direction. What did you do?",
  ],
  technical: [
    "Walk me through your end-to-end approach when starting a new requirements-gathering engagement.",
    "How do you decide which elicitation techniques to use for a given stakeholder group?",
    "Explain how you would write a use case for a system that has no documentation.",
    "How do you handle requirements traceability across a large, complex project?",
    "Describe your process for validating that a delivered solution actually meets the original business need.",
  ],
  stakeholder: [
    "How do you manage a stakeholder who is frequently unavailable but whose sign-off is critical to your project?",
    "Describe your approach to building trust quickly with a new stakeholder group.",
    "Tell me how you would handle a situation where two senior stakeholders have directly opposing views on what the solution should be.",
    "How do you communicate complex analytical findings to a non-technical executive audience?",
    "What is your strategy for keeping stakeholders engaged throughout a long-running programme?",
  ],
  process: [
    "How do you approach process mapping for a workflow that no one fully understands end to end?",
    "Describe how you would document an as-is process that has multiple regional variations.",
    "Walk me through how you identify process improvement opportunities from a current-state analysis.",
    "How do you measure whether a process change has actually delivered the intended benefit?",
    "What frameworks or methodologies have you used to analyse and improve business processes?",
  ],
};

// ── Score Ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#e05547";
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size < 64 ? 12 : 18} fontWeight="700" fontFamily="system-ui">
        {score}
      </text>
    </svg>
  );
}

// ── Star Bar ───────────────────────────────────────────────────────────────────

function StarBar({ label, score, feedback }: { label: string; score: number; feedback: string }) {
  const [open, setOpen] = useState(false);
  const color = score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#e05547";
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px", marginBottom: "12px" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontFamily: "JetBrains Mono, monospace", width: "80px", textAlign: "left" }}>{label}</span>
          <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: "3px", transition: "width 0.6s ease" }} />
          </div>
          <span style={{ color, fontSize: "13px", fontWeight: "700", width: "36px", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{score}</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <p style={{ margin: "10px 0 0 92px", color: "rgba(255,255,255,0.65)", fontSize: "13px", lineHeight: 1.65 }}>{feedback}</p>
      )}
    </div>
  );
}

// ── Waveform Animation (for interview recording) ───────────────────────────────

function WaveformBars() {
  return (
    <>
      <style>{`
        @keyframes csWave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "32px" }}>
        {[0.2, 0.5, 0.8, 0.4, 1.0, 0.6, 0.3, 0.9, 0.5, 0.7, 0.4, 0.8].map((delay, i) => (
          <div key={i} style={{
            width: "3px", height: "100%", background: "#d97706", borderRadius: "2px",
            animation: `csWave 1.1s ease-in-out ${delay * 0.6}s infinite`,
            transformOrigin: "center",
          }} />
        ))}
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CareerClient({ userId, fullName, tier, attempts, badges, progress, skills }: Props) {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<CareerTool>("resume");

  // Resume state
  const [resumeTemplate, setResumeTemplate] = useState<ResumeTemplate>("technical");
  const [resumeJobTarget, setResumeJobTarget] = useState("");
  const [resumeYearsExp, setResumeYearsExp] = useState("");
  const [resumeCerts, setResumeCerts] = useState("");
  const [resumeGenerating, setResumeGenerating] = useState(false);
  const [resumeError, setResumeError] = useState("");

  // Cover letter state
  const [clJobTitle, setClJobTitle] = useState("");
  const [clCompany, setClCompany] = useState("");
  const [clTone, setClTone] = useState<CoverLetterTone>("professional");
  const [clSelected, setClSelected] = useState<string[]>([]);
  const [clGenerating, setClGenerating] = useState(false);
  const [clError, setClError] = useState("");

  // JD state
  const [jdText, setJdText] = useState("");
  const [jdGenerating, setJdGenerating] = useState(false);
  const [jdResult, setJdResult] = useState<JDAnalysis | null>(null);
  const [jdError, setJdError] = useState("");

  // Interview state
  const [interviewCategory, setInterviewCategory] = useState<InterviewCategory>("behavioral");
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [interviewFeedback, setInterviewFeedback] = useState<InterviewFeedback | null>(null);
  const [interviewGenerating, setInterviewGenerating] = useState(false);
  const [interviewError, setInterviewError] = useState("");
  const [micAllowed, setMicAllowed] = useState(false);

  // LinkedIn state
  const [liStyle, setLiStyle] = useState<LinkedInStyle>("concise");
  const [liResult, setLiResult] = useState<string | null>(null);
  const [liGenerating, setLiGenerating] = useState(false);
  const [liError, setLiError] = useState("");
  const [liCopied, setLiCopied] = useState(false);

  // Refs for interview recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    setSpeechSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Resume download ────────────────────────────────────────────────────────

  const handleResumeDownload = async () => {
    setResumeGenerating(true);
    setResumeError("");
    try {
      const res = await fetch("/api/career/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: resumeTemplate,
          fullName,
          jobTarget: resumeJobTarget,
          yearsExp: resumeYearsExp,
          certifications: resumeCerts,
          attempts,
          badges,
          skills,
          progress,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(fullName || "BA_Resume").replace(/\s+/g, "_")}_Resume.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setResumeGenerating(false);
    }
  };

  // ── Cover letter download ──────────────────────────────────────────────────

  const handleCoverLetterDownload = async () => {
    setClGenerating(true);
    setClError("");
    const selectedAttempts = attempts.filter(a => clSelected.includes(a.id));
    try {
      const res = await fetch("/api/career/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: clJobTitle,
          company: clCompany,
          tone: clTone,
          fullName,
          selectedAttempts,
          badges,
          progress,
          skills,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(fullName || "Cover_Letter").replace(/\s+/g, "_")}_Cover_Letter.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setClError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setClGenerating(false);
    }
  };

  // ── JD analyze ────────────────────────────────────────────────────────────

  const handleJDAnalyze = async () => {
    setJdGenerating(true);
    setJdError("");
    setJdResult(null);
    try {
      const res = await fetch("/api/career/jd-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, skills, attempts, badges, progress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setJdResult(data.analysis);
    } catch (err) {
      setJdError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setJdGenerating(false);
    }
  };

  // ── Interview recording ────────────────────────────────────────────────────

  const pickQuestion = () => {
    const questions = INTERVIEW_QUESTIONS[interviewCategory];
    const q = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(q);
    setTranscript("");
    setInterimTranscript("");
    setWordCount(0);
    setRecordingTime(0);
    setInterviewFeedback(null);
    setInterviewError("");
    finalTranscriptRef.current = "";
  };

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
      setInterviewFeedback(null);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

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
            if (event.results[i].isFinal) finalAdded += text + " ";
            else interim += text;
          }
          if (finalAdded) {
            finalTranscriptRef.current += finalAdded;
            const wc = finalTranscriptRef.current.trim().split(/\s+/).filter(Boolean).length;
            setWordCount(wc);
          }
          setTranscript(finalTranscriptRef.current);
          setInterimTranscript(interim);
        };

        recognition.onerror = () => { /* silent — MediaRecorder still captures */ };
        recognition.start();
      }
    } catch {
      setInterviewError("Microphone access denied. Please allow microphone access and try again.");
    }
  }, [speechSupported]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
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
  }, []);

  const submitInterviewAnswer = async () => {
    const finalText = finalTranscriptRef.current.trim();
    if (!finalText || finalText.length < 20) {
      setInterviewError("Answer too short to analyse. Record for at least 30 seconds.");
      return;
    }
    setInterviewGenerating(true);
    setInterviewError("");
    try {
      const res = await fetch("/api/career/interview-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          transcript: finalText,
          category: interviewCategory,
          duration: recordingTime,
          wordCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setInterviewFeedback(data.feedback);
    } catch (err) {
      setInterviewError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setInterviewGenerating(false);
    }
  };

  // ── LinkedIn generate ──────────────────────────────────────────────────────

  const handleLinkedIn = async () => {
    setLiGenerating(true);
    setLiError("");
    setLiResult(null);
    try {
      const res = await fetch("/api/career/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: liStyle, fullName, progress, skills, badges, attempts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setLiResult(data.summary);
    } catch (err) {
      setLiError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLiGenerating(false);
    }
  };

  const copyLinkedIn = async () => {
    if (!liResult) return;
    await navigator.clipboard.writeText(liResult);
    setLiCopied(true);
    setTimeout(() => setLiCopied(false), 2500);
  };

  // ── Nav items ──────────────────────────────────────────────────────────────

  const navItems: { id: CareerTool; label: string; desc: string }[] = [
    { id: "resume", label: "Resume Builder", desc: "AI-tailored to your profile" },
    { id: "cover-letter", label: "Cover Letter", desc: "Evidence-based, ready to download" },
    { id: "jd", label: "JD Analyzer", desc: "Paste a role, see your fit score" },
    { id: "interview", label: "Interview Prep", desc: "Voice practice with AI coaching" },
    { id: "linkedin", label: "LinkedIn Summary", desc: "Written from your portal activity" },
  ];

  // ── Styles ─────────────────────────────────────────────────────────────────

  const S = {
    page: {
      minHeight: "100vh",
      background: "#0a0d14",
      display: "flex",
      fontFamily: "Open Sans, system-ui, sans-serif",
    } as React.CSSProperties,

    sidebar: {
      width: "220px",
      flexShrink: 0,
      background: "#0d1117",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column" as const,
      padding: "0",
    },

    sidebarTop: {
      padding: "24px 20px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    },

    logo: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "4px",
      cursor: "pointer",
    },

    logoIcon: {
      width: "32px",
      height: "32px",
      borderRadius: "8px",
      background: "linear-gradient(135deg, #d97706, #92400e)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      fontWeight: "700",
      color: "white",
      fontFamily: "JetBrains Mono, monospace",
    },

    logoText: {
      fontSize: "13px",
      fontWeight: "700",
      color: "white",
      fontFamily: "Inter, system-ui, sans-serif",
    },

    logoSub: {
      fontSize: "11px",
      color: "rgba(255,255,255,0.3)",
      marginLeft: "42px",
      fontFamily: "JetBrains Mono, monospace",
    },

    navSection: {
      flex: 1,
      padding: "16px 12px",
      overflowY: "auto" as const,
    },

    navItem: (active: boolean): React.CSSProperties => ({
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "10px 12px",
      borderRadius: "8px",
      marginBottom: "4px",
      cursor: "pointer",
      border: "none",
      background: active ? "rgba(217,119,6,0.15)" : "none",
      borderLeft: active ? "2px solid #d97706" : "2px solid transparent",
      transition: "all 0.15s",
    }),

    navLabel: (active: boolean): React.CSSProperties => ({
      fontSize: "13px",
      fontWeight: active ? "600" : "400",
      color: active ? "#fbbf24" : "rgba(255,255,255,0.6)",
      display: "block",
    }),

    navDesc: {
      fontSize: "11px",
      color: "rgba(255,255,255,0.3)",
      marginTop: "2px",
      display: "block",
    },

    sidebarBottom: {
      padding: "16px 12px",
      borderTop: "1px solid rgba(255,255,255,0.06)",
    },

    backBtn: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "rgba(255,255,255,0.35)",
      fontSize: "12px",
      padding: "6px 8px",
    },

    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    },

    topBar: {
      background: "#0d1117",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "14px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },

    toolTitle: {
      fontSize: "18px",
      fontWeight: "700",
      color: "white",
      fontFamily: "Inter, system-ui, sans-serif",
    },

    statsRow: {
      display: "flex",
      gap: "20px",
    },

    statChip: {
      fontSize: "12px",
      color: "rgba(255,255,255,0.4)",
      fontFamily: "JetBrains Mono, monospace",
    },

    content: {
      flex: 1,
      overflow: "auto",
      padding: "32px",
      maxWidth: "860px",
    },

    card: {
      background: "#131920",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding: "28px",
      marginBottom: "20px",
    },

    cardTitle: {
      fontSize: "15px",
      fontWeight: "700",
      color: "white",
      marginBottom: "20px",
      fontFamily: "Inter, system-ui, sans-serif",
    },

    label: {
      fontSize: "12px",
      fontWeight: "600",
      color: "rgba(255,255,255,0.45)",
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      marginBottom: "8px",
      display: "block",
      fontFamily: "JetBrains Mono, monospace",
    },

    input: {
      width: "100%",
      background: "#0a0d14",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "8px",
      padding: "10px 14px",
      color: "white",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box" as const,
    },

    textarea: {
      width: "100%",
      background: "#0a0d14",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "8px",
      padding: "12px 14px",
      color: "white",
      fontSize: "14px",
      outline: "none",
      resize: "vertical" as const,
      minHeight: "120px",
      boxSizing: "border-box" as const,
      fontFamily: "Open Sans, system-ui, sans-serif",
    },

    select: {
      background: "#0a0d14",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "8px",
      padding: "10px 14px",
      color: "white",
      fontSize: "14px",
      outline: "none",
      cursor: "pointer",
    },

    btnPrimary: {
      background: "linear-gradient(135deg, #d97706, #b45309)",
      border: "none",
      borderRadius: "8px",
      padding: "11px 24px",
      color: "white",
      fontSize: "14px",
      fontWeight: "700",
      cursor: "pointer",
      fontFamily: "Inter, system-ui, sans-serif",
    },

    btnSecondary: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "8px",
      padding: "10px 20px",
      color: "rgba(255,255,255,0.7)",
      fontSize: "14px",
      cursor: "pointer",
    },

    btnDanger: {
      background: "rgba(239,68,68,0.15)",
      border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: "8px",
      padding: "10px 20px",
      color: "#f87171",
      fontSize: "14px",
      cursor: "pointer",
    },

    errorText: {
      color: "#f87171",
      fontSize: "13px",
      marginTop: "12px",
    },

    formRow: {
      display: "grid",
      gap: "16px",
      gridTemplateColumns: "1fr 1fr",
      marginBottom: "16px",
    } as React.CSSProperties,

    formGroup: {
      marginBottom: "16px",
    },
  };

  // ── Render tool views ──────────────────────────────────────────────────────

  function renderResume() {
    const templates: { id: ResumeTemplate; label: string; desc: string }[] = [
      { id: "technical", label: "Technical BA", desc: "Works with dev teams, writes specs, leads UAT" },
      { id: "operational", label: "Operational BA", desc: "Process improvement, change management, efficiency" },
      { id: "strategic", label: "Strategic BA", desc: "Portfolio-level, business cases, operating models" },
    ];
    return (
      <div>
        <div style={S.card}>
          <p style={S.cardTitle}>Resume Builder</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.6 }}>
            Claude reads your completed challenges, scores, and badges — then writes a tailored BA resume built around real evidence of your work. Choose your specialisation, add your details, and download as a Word file you can edit.
          </p>

          <div style={{ marginBottom: "20px" }}>
            <label style={S.label}>Specialisation</label>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" as const }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => setResumeTemplate(t.id)}
                  style={{
                    flex: 1, minWidth: "180px", padding: "14px 16px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                    background: resumeTemplate === t.id ? "rgba(217,119,6,0.12)" : "rgba(255,255,255,0.03)",
                    border: resumeTemplate === t.id ? "1px solid #d97706" : "1px solid rgba(255,255,255,0.08)",
                  }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: resumeTemplate === t.id ? "#fbbf24" : "rgba(255,255,255,0.7)", marginBottom: "4px" }}>{t.label}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={S.formRow}>
            <div>
              <label style={S.label}>Target Role Title</label>
              <input style={S.input} value={resumeJobTarget} onChange={e => setResumeJobTarget(e.target.value)}
                placeholder="e.g. Senior Business Analyst" />
            </div>
            <div>
              <label style={S.label}>Years of Experience</label>
              <input style={S.input} value={resumeYearsExp} onChange={e => setResumeYearsExp(e.target.value)}
                placeholder="e.g. 5" />
            </div>
          </div>

          <div style={S.formGroup}>
            <label style={S.label}>Certifications</label>
            <input style={S.input} value={resumeCerts} onChange={e => setResumeCerts(e.target.value)}
              placeholder="e.g. CBAP, CCBA, PMP, Agile BA Certificate" />
          </div>

          <div style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.15)", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px" }}>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6 }}>
              Claude will use your <strong style={{ color: "#fbbf24" }}>{progress.challenges_completed} completed simulations</strong> and{" "}
              <strong style={{ color: "#fbbf24" }}>{badges.length} earned badges</strong> as evidence to write achievement bullets. The more challenges you complete, the stronger your resume.
            </p>
          </div>

          <button onClick={handleResumeDownload} disabled={resumeGenerating} style={{ ...S.btnPrimary, opacity: resumeGenerating ? 0.6 : 1 }}>
            {resumeGenerating ? "Generating..." : "Generate & Download Resume (.docx)"}
          </button>
          {resumeError && <p style={S.errorText}>{resumeError}</p>}
        </div>
      </div>
    );
  }

  function renderCoverLetter() {
    const toggleAttempt = (id: string) => {
      setClSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
    };
    return (
      <div>
        <div style={S.card}>
          <p style={S.cardTitle}>Cover Letter Generator</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.6 }}>
            Selects your strongest challenge simulations as proof points and writes a cover letter that turns practice into credible evidence.
          </p>

          <div style={S.formRow}>
            <div>
              <label style={S.label}>Job Title</label>
              <input style={S.input} value={clJobTitle} onChange={e => setClJobTitle(e.target.value)}
                placeholder="e.g. Business Analyst" />
            </div>
            <div>
              <label style={S.label}>Company Name</label>
              <input style={S.input} value={clCompany} onChange={e => setClCompany(e.target.value)}
                placeholder="e.g. Accenture" />
            </div>
          </div>

          <div style={S.formGroup}>
            <label style={S.label}>Tone</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {(["professional", "conversational", "executive"] as CoverLetterTone[]).map(t => (
                <button key={t} onClick={() => setClTone(t)}
                  style={{
                    padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px",
                    background: clTone === t ? "rgba(217,119,6,0.15)" : "rgba(255,255,255,0.04)",
                    border: clTone === t ? "1px solid #d97706" : "1px solid rgba(255,255,255,0.08)",
                    color: clTone === t ? "#fbbf24" : "rgba(255,255,255,0.55)",
                    fontWeight: clTone === t ? "600" : "400",
                    textTransform: "capitalize" as const,
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={S.formGroup}>
            <label style={S.label}>Select up to 3 Challenges as Evidence</label>
            {attempts.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Complete some challenges first to use them as evidence.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {attempts.slice(0, 8).map(a => {
                  const selected = clSelected.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => toggleAttempt(a.id)}
                      style={{
                        textAlign: "left", padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                        background: selected ? "rgba(217,119,6,0.1)" : "rgba(255,255,255,0.03)",
                        border: selected ? "1px solid #d97706" : "1px solid rgba(255,255,255,0.07)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                      <span>
                        <span style={{ fontSize: "13px", color: selected ? "#fbbf24" : "rgba(255,255,255,0.65)", fontWeight: selected ? "600" : "400" }}>{a.challenge_title}</span>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "10px" }}>{a.challenge_type} · {a.industry}</span>
                      </span>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono, monospace" }}>{a.total_score}/100</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={handleCoverLetterDownload} disabled={clGenerating} style={{ ...S.btnPrimary, opacity: clGenerating ? 0.6 : 1 }}>
            {clGenerating ? "Generating..." : "Generate & Download Cover Letter (.docx)"}
          </button>
          {clError && <p style={S.errorText}>{clError}</p>}
        </div>
      </div>
    );
  }

  function renderJD() {
    const priorityColor = (p: string) => p === "high" ? "#f87171" : p === "medium" ? "#f59e0b" : "#6ee7b7";
    return (
      <div>
        <div style={S.card}>
          <p style={S.cardTitle}>Job Description Analyzer</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "20px", lineHeight: 1.6 }}>
            Paste a job description and get an honest fit assessment — matched skills backed by your challenge history, gaps with specific recommendations, and interview questions to expect.
          </p>
          <div style={S.formGroup}>
            <label style={S.label}>Job Description</label>
            <textarea style={{ ...S.textarea, minHeight: "200px" }} value={jdText} onChange={e => setJdText(e.target.value)}
              placeholder="Paste the full job description here..." />
          </div>
          <button onClick={handleJDAnalyze} disabled={jdGenerating || jdText.trim().length < 50}
            style={{ ...S.btnPrimary, opacity: (jdGenerating || jdText.trim().length < 50) ? 0.6 : 1 }}>
            {jdGenerating ? "Analysing..." : "Analyse My Fit"}
          </button>
          {jdError && <p style={S.errorText}>{jdError}</p>}
        </div>

        {jdResult && (
          <>
            <div style={S.card}>
              <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "20px" }}>
                <ScoreRing score={jdResult.matchScore} size={88} />
                <div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", fontFamily: "JetBrains Mono, monospace", marginBottom: "4px" }}>MATCH SCORE</div>
                  <div style={{ fontSize: "15px", color: "white", fontWeight: "600", lineHeight: 1.5 }}>{jdResult.roleSummary}</div>
                </div>
              </div>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.65, background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "14px 16px" }}>
                {jdResult.fitVerdict}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div style={S.card}>
                <p style={{ ...S.cardTitle, color: "#6ee7b7" }}>Matched Skills</p>
                {jdResult.matchedSkills.map((m, i) => (
                  <div key={i} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: i < jdResult.matchedSkills.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)", marginBottom: "4px" }}>{m.skill}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{m.evidence}</div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <p style={{ ...S.cardTitle, color: "#f87171" }}>Skills to Build</p>
                {jdResult.gapSkills.map((g, i) => (
                  <div key={i} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: i < jdResult.gapSkills.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>{g.skill}</span>
                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: `${priorityColor(g.priority)}22`, color: priorityColor(g.priority), fontFamily: "JetBrains Mono, monospace", textTransform: "uppercase" as const }}>{g.priority}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{g.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <p style={S.cardTitle}>Talking Points for Interview</p>
              {jdResult.interviewTalkingPoints.map((tp, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <span style={{ color: "#d97706", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", marginTop: "2px", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                  <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>{tp}</p>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <p style={S.cardTitle}>Questions to Prepare For</p>
              {jdResult.questionsToExpect.map((q, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px", borderLeft: "2px solid rgba(217,119,6,0.4)" }}>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>{q}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderInterview() {
    const categories: { id: InterviewCategory; label: string }[] = [
      { id: "behavioral", label: "Behavioural (STAR)" },
      { id: "technical", label: "Technical BA" },
      { id: "stakeholder", label: "Stakeholder Management" },
      { id: "process", label: "Process & Methodology" },
    ];

    return (
      <div>
        <div style={S.card}>
          <p style={S.cardTitle}>Interview Prep — Voice Practice</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "20px", lineHeight: 1.6 }}>
            Spoken communication is one of the biggest gaps for BA professionals. This module forces you to answer out loud — no hiding behind polished writing. Pick a category, get a question, and answer it as if you're in the real interview.
          </p>

          <div style={S.formGroup}>
            <label style={S.label}>Question Category</label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
              {categories.map(c => (
                <button key={c.id} onClick={() => { setInterviewCategory(c.id); setCurrentQuestion(null); setInterviewFeedback(null); }}
                  style={{
                    padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px",
                    background: interviewCategory === c.id ? "rgba(217,119,6,0.15)" : "rgba(255,255,255,0.04)",
                    border: interviewCategory === c.id ? "1px solid #d97706" : "1px solid rgba(255,255,255,0.08)",
                    color: interviewCategory === c.id ? "#fbbf24" : "rgba(255,255,255,0.55)",
                    fontWeight: interviewCategory === c.id ? "600" : "400",
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={pickQuestion} style={S.btnSecondary}>
            {currentQuestion ? "Get Another Question" : "Get a Question"}
          </button>
        </div>

        {currentQuestion && (
          <div style={S.card}>
            <div style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: "10px", padding: "20px 22px", marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", color: "#d97706", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: "10px" }}>INTERVIEW QUESTION</div>
              <p style={{ fontSize: "17px", color: "white", lineHeight: 1.65, margin: 0, fontWeight: "500" }}>{currentQuestion}</p>
            </div>

            {!speechSupported && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" }}>
                <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>
                  Live transcription is not supported in this browser. Use Chrome or Edge for the best experience. Recording will still capture your audio.
                </p>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
              {!isRecording ? (
                <button onClick={startRecording} style={S.btnPrimary}>
                  Start Answer
                </button>
              ) : (
                <button onClick={stopRecording} style={S.btnDanger}>
                  Stop Recording
                </button>
              )}

              {isRecording && (
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <WaveformBars />
                  <span style={{ color: "#f87171", fontFamily: "JetBrains Mono, monospace", fontSize: "14px" }}>{formatTime(recordingTime)}</span>
                </div>
              )}

              {!isRecording && recordingTime > 0 && (
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", fontFamily: "JetBrains Mono, monospace" }}>
                  {formatTime(recordingTime)} · {wordCount} words
                </span>
              )}
            </div>

            {(transcript || interimTranscript) && (
              <div style={{ background: "#0a0d14", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px", minHeight: "80px" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>LIVE TRANSCRIPT</div>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "14px", lineHeight: 1.65, margin: 0 }}>
                  {transcript}
                  {interimTranscript && <span style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>{interimTranscript}</span>}
                </p>
              </div>
            )}

            {!isRecording && recordingTime > 0 && !interviewFeedback && (
              <button onClick={submitInterviewAnswer} disabled={interviewGenerating}
                style={{ ...S.btnPrimary, opacity: interviewGenerating ? 0.6 : 1 }}>
                {interviewGenerating ? "Analysing your answer..." : "Get AI Coaching Feedback"}
              </button>
            )}

            {interviewError && <p style={S.errorText}>{interviewError}</p>}
          </div>
        )}

        {interviewFeedback && (
          <>
            <div style={S.card}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
                <ScoreRing score={interviewFeedback.overallScore} size={88} />
                <div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono, monospace", marginBottom: "6px" }}>OVERALL INTERVIEW SCORE</div>
                  <div style={{ fontSize: "14px", color: "#10b981", fontWeight: "600", marginBottom: "4px" }}>Top Strength: <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: "400" }}>{interviewFeedback.topStrength}</span></div>
                  <div style={{ fontSize: "14px", color: "#f59e0b", fontWeight: "600" }}>Top Fix: <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: "400" }}>{interviewFeedback.topImprovement}</span></div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "JetBrains Mono, monospace", marginBottom: "14px", letterSpacing: "0.06em" }}>STAR FRAMEWORK</div>
                <StarBar label="SITUATION" score={interviewFeedback.star.situation.score} feedback={interviewFeedback.star.situation.feedback} />
                <StarBar label="TASK" score={interviewFeedback.star.task.score} feedback={interviewFeedback.star.task.feedback} />
                <StarBar label="ACTION" score={interviewFeedback.star.action.score} feedback={interviewFeedback.star.action.feedback} />
                <StarBar label="RESULT" score={interviewFeedback.star.result.score} feedback={interviewFeedback.star.result.feedback} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "JetBrains Mono, monospace", marginBottom: "14px", letterSpacing: "0.06em" }}>DELIVERY</div>
                <StarBar label="PACING" score={interviewFeedback.delivery.pacing.score} feedback={`${interviewFeedback.delivery.pacing.wpm} wpm. ${interviewFeedback.delivery.pacing.feedback}`} />
                <StarBar label="CONFIDENCE" score={interviewFeedback.delivery.confidence.score} feedback={interviewFeedback.delivery.confidence.feedback} />
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "14px 16px", marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>WHAT WAS MISSING</div>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", lineHeight: 1.65, margin: 0 }}>{interviewFeedback.missingElement}</p>
              </div>

              <div style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.18)", borderRadius: "8px", padding: "14px 16px", marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "#d97706", fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>SUGGESTED REWRITE</div>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "14px", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>&ldquo;{interviewFeedback.suggestedRewrite}&rdquo;</p>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>INTERVIEWER PERSPECTIVE</div>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", lineHeight: 1.65, margin: 0 }}>{interviewFeedback.interviewerPerspective}</p>
              </div>
            </div>

            <button onClick={pickQuestion} style={S.btnSecondary}>Practice Another Question</button>
          </>
        )}
      </div>
    );
  }

  function renderLinkedIn() {
    const styles: { id: LinkedInStyle; label: string; desc: string }[] = [
      { id: "concise", label: "Concise", desc: "150-180 words, scannable, mobile-first" },
      { id: "detailed", label: "Detailed", desc: "280-320 words, comprehensive, narrative" },
      { id: "confident", label: "Confident", desc: "Under 200 words, bold opener, punchy" },
    ];
    return (
      <div>
        <div style={S.card}>
          <p style={S.cardTitle}>LinkedIn Summary Generator</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.6 }}>
            Written from your actual portal profile — your BA level, challenge history, skill scores, and earned badges. No generic templates. Reads like a real person, not a keyword farm.
          </p>

          <div style={{ marginBottom: "24px" }}>
            <label style={S.label}>Style</label>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" as const }}>
              {styles.map(s => (
                <button key={s.id} onClick={() => setLiStyle(s.id)}
                  style={{
                    flex: 1, minWidth: "160px", padding: "14px 16px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                    background: liStyle === s.id ? "rgba(217,119,6,0.12)" : "rgba(255,255,255,0.03)",
                    border: liStyle === s.id ? "1px solid #d97706" : "1px solid rgba(255,255,255,0.08)",
                  }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: liStyle === s.id ? "#fbbf24" : "rgba(255,255,255,0.7)", marginBottom: "4px" }}>{s.label}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleLinkedIn} disabled={liGenerating} style={{ ...S.btnPrimary, opacity: liGenerating ? 0.6 : 1 }}>
            {liGenerating ? "Generating..." : "Generate LinkedIn Summary"}
          </button>
          {liError && <p style={S.errorText}>{liError}</p>}
        </div>

        {liResult && (
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <p style={{ ...S.cardTitle, marginBottom: 0 }}>Your LinkedIn Summary</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={copyLinkedIn}
                  style={{
                    ...S.btnSecondary, fontSize: "13px", padding: "8px 16px",
                    background: liCopied ? "rgba(16,185,129,0.12)" : undefined,
                    border: liCopied ? "1px solid rgba(16,185,129,0.3)" : undefined,
                    color: liCopied ? "#6ee7b7" : undefined,
                  }}>
                  {liCopied ? "Copied!" : "Copy to Clipboard"}
                </button>
                <button onClick={handleLinkedIn} style={{ ...S.btnSecondary, fontSize: "13px", padding: "8px 16px" }}>
                  Regenerate
                </button>
              </div>
            </div>

            <div style={{ background: "#0a0d14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "20px 22px" }}>
              {liResult.split("\n\n").map((para, i) => (
                <p key={i} style={{ color: "rgba(255,255,255,0.78)", fontSize: "15px", lineHeight: 1.75, margin: "0 0 16px 0" }}>{para}</p>
              ))}
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", marginTop: "12px" }}>
              Tip: Paste this into your LinkedIn &ldquo;About&rdquo; section and personalise the details that only you can add — specific companies, technologies, or projects.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeToolLabel = navItems.find(n => n.id === activeTool)?.label || "Career Suite";

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sidebarTop}>
          <div style={S.logo} onClick={() => router.push("/dashboard")}>
            <div style={S.logoIcon}>CS</div>
            <span style={S.logoText}>Career Suite</span>
          </div>
          <div style={S.logoSub}>BA job search toolkit</div>
        </div>

        <nav style={S.navSection}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTool(item.id)} style={S.navItem(activeTool === item.id)}>
              <span style={S.navLabel(activeTool === item.id)}>{item.label}</span>
              <span style={S.navDesc}>{item.desc}</span>
            </button>
          ))}
        </nav>

        <div style={S.sidebarBottom}>
          <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono, monospace", marginBottom: "6px" }}>YOUR PROFILE</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{progress.ba_level}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{progress.challenges_completed} challenges · avg {progress.avg_score}%</div>
          </div>
          <button onClick={() => router.push("/dashboard")} style={S.backBtn}>
            ← Dashboard
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        <div style={S.topBar}>
          <span style={S.toolTitle}>{activeToolLabel}</span>
          <div style={S.statsRow}>
            <span style={S.statChip}>{fullName || "BA Professional"}</span>
            <span style={S.statChip}>·</span>
            <span style={S.statChip}>{badges.length} badges</span>
            <span style={S.statChip}>·</span>
            <span style={S.statChip}>{attempts.length} simulations</span>
          </div>
        </div>

        <div style={S.content}>
          {activeTool === "resume" && renderResume()}
          {activeTool === "cover-letter" && renderCoverLetter()}
          {activeTool === "jd" && renderJD()}
          {activeTool === "interview" && renderInterview()}
          {activeTool === "linkedin" && renderLinkedIn()}
        </div>
      </main>
    </div>
  );
}
