"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";

// ── Types ────────────────────────────────────────────────────────────────────

interface JobAnalysis {
  score: number;
  recommendation: "apply_now" | "improve_first" | "move_on";
  recommendation_reason: string;
  effort_estimate: string | null;
  priority_task: string | null;
  strengths: string[];
  gaps: string[];
  hidden: string[];
  action_tool: "resume" | "jd" | "interview" | "cover_letter" | null;
}

type Status = "saved" | "applied" | "interviewing" | "offer" | "rejected";
type Filter = "all" | "apply_now" | "improve_first" | "move_on";

interface JobItem {
  id: string;
  job_id: string;
  source: "portal" | "user";
  title: string | null;
  company: string | null;
  location: string | null;
  apply_url: string | null;
  has_description?: boolean;
  analysis_result: unknown;
  status: string;
  created_at: string;
  submitted_resume_text?: string | null;
  submitted_resume_name?: string | null;
  applied_at?: string | null;
  cover_letter?: string | null;
  jd_analysis?: unknown;
  interview_questions?: unknown;
  _analysing?: boolean;
}

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  allJobs: JobItem[];
  hasResumes: boolean;
}

// ── Design tokens ────────────────────────────────────────────────────────────

const D = {
  pageBg:       "oklch(0.98 0.004 250)",
  text:         "oklch(0.22 0.015 250)",
  textMid:      "oklch(0.4 0.01 250)",
  textSub:      "oklch(0.5 0.01 250)",
  textMuted:    "oklch(0.6 0.01 250)",
  white:        "#fff",
  border:       "oklch(0.91 0.005 250)",
  borderSoft:   "oklch(0.92 0.005 250)",
  green:        "oklch(0.5 0.14 165)",
  greenActive:  "oklch(0.55 0.13 165)",
  greenNavBg:   "oklch(0.94 0.03 165)",
  greenNavText: "oklch(0.4 0.1 165)",
  greenInsight: "oklch(0.96 0.025 165)",
  amber:        "oklch(0.68 0.14 75)",
  amberInsight: "oklch(0.96 0.03 85)",
  moveOn:       "oklch(0.52 0.03 25)",
  moveOnBg:     "oklch(0.95 0.008 25)",
};

const REC_STYLES = {
  apply_now:     { btn: D.greenActive, insight: D.greenInsight, label: "Apply Now",      dot: D.greenActive,           dotLabel: "Strong match",    nextStep: "Update resume"      },
  improve_first: { btn: D.amber,       insight: D.amberInsight, label: "Improve First",  dot: D.amber,                 dotLabel: "Worth improving", nextStep: "Build STAR stories" },
  move_on:       { btn: D.moveOn,      insight: D.moveOnBg,     label: "Lower Priority", dot: "oklch(0.72 0.005 250)", dotLabel: "Lower priority",  nextStep: "Archive"            },
};

const TOOL_LINKS: Record<string, string> = {
  resume:       "/career?cat=land&intent=improve_resume",
  jd:           "/career?cat=land&intent=analyze_job_description",
  interview:    "/career?cat=grow&intent=interview_preparation",
  cover_letter: "/career?cat=land&intent=cover_letter",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  saved:        { label: "Saved",        color: "oklch(0.5 0.01 250)",   bg: "oklch(0.95 0.005 250)"  },
  applied:      { label: "Applied",      color: "oklch(0.45 0.12 250)",  bg: "oklch(0.94 0.03 250)"   },
  interviewing: { label: "Interviewing", color: "oklch(0.5 0.14 165)",   bg: "oklch(0.94 0.03 165)"   },
  offer:        { label: "Offer",        color: "oklch(0.45 0.14 145)",  bg: "oklch(0.93 0.04 145)"   },
  rejected:     { label: "Rejected",     color: "oklch(0.5 0.03 25)",    bg: "oklch(0.95 0.008 25)"   },
};

const ALL_STATUSES: Status[] = ["saved", "applied", "interviewing", "offer", "rejected"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function getA(job: JobItem): JobAnalysis | null {
  const a = job.analysis_result as JobAnalysis | null;
  if (!a?.recommendation || !["apply_now", "improve_first", "move_on"].includes(a.recommendation)) return null;
  return a;
}

function greeting(name: string | null): string {
  const h = new Date().getHours();
  const t = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name?.split(" ")[0] ?? "";
  return first ? `${t}, ${first}` : t;
}

function subheading(jobs: JobItem[]): string {
  const apply   = jobs.filter(j => getA(j)?.recommendation === "apply_now").length;
  const improve = jobs.filter(j => getA(j)?.recommendation === "improve_first").length;
  const moveOn  = jobs.filter(j => getA(j)?.recommendation === "move_on").length;
  if (!apply && !improve && !moveOn) return "Add a job to get your personalised action plan.";
  const parts: string[] = [];
  if (apply)   parts.push(`${apply} job${apply > 1 ? "s" : ""} ready to apply`);
  if (improve) parts.push(`${improve} that need${improve > 1 ? "" : "s"} work first`);
  if (moveOn)  parts.push(`${moveOn} worth dropping`);
  return `You have ${parts.join(", and ")}.`;
}

// ── Today's Focus card ────────────────────────────────────────────────────────

function TodaysFocusCard({ job, onStatusChange }: { job: JobItem; onStatusChange: (id: string, s: Status) => void }) {
  const a = getA(job)!;
  const rec = REC_STYLES[a.recommendation];
  const applyHref = job.apply_url ?? (job.source === "portal" ? `/jobs/${job.job_id}` : "#");

  const primaryBtn = a.recommendation === "apply_now" ? (
    <a href={applyHref} target={job.apply_url ? "_blank" : undefined} rel="noopener noreferrer"
      onClick={() => {
        onStatusChange(job.id, "applied");
        fetch("/api/career/profile/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.job_id, source: job.source, status: "applied" }) });
      }}
      style={{ background: rec.btn, color: "#fff", fontWeight: 700, fontSize: 16, padding: "14px 26px", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap" }}>
      Apply
    </a>
  ) : a.recommendation === "improve_first" && a.action_tool ? (
    <Link href={TOOL_LINKS[a.action_tool] ?? "/career"}
      style={{ background: rec.btn, color: "#fff", fontWeight: 700, fontSize: 16, padding: "14px 26px", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap" }}>
      Continue
    </Link>
  ) : (
    <button onClick={() => { onStatusChange(job.id, "rejected"); fetch("/api/career/profile/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.job_id, source: job.source, status: "rejected" }) }); }}
      style={{ background: rec.btn, color: "#fff", fontWeight: 700, fontSize: 16, padding: "14px 26px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
      Archive
    </button>
  );

  return (
    <div style={{ borderRadius: 16, padding: 2, background: "linear-gradient(135deg, oklch(0.6 0.14 165), oklch(0.7 0.15 90))", marginBottom: 32 }}>
      <div style={{ background: D.white, borderRadius: 14, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: D.green, background: D.greenNavBg, padding: "3px 9px", borderRadius: 5 }}>TODAY'S FOCUS</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: D.text }}>{job.title}</div>
          <div style={{ fontSize: 14, color: D.textSub, marginBottom: 12 }}>{job.company}{job.location ? ` · ${job.location}` : ""}</div>
          <div style={{ fontSize: 16, lineHeight: 1.5, color: "oklch(0.28 0.01 250)", maxWidth: 640 }}>{a.recommendation_reason}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, flexShrink: 0 }}>
          {primaryBtn}
        </div>
      </div>
    </div>
  );
}

// ── Job list card ─────────────────────────────────────────────────────────────

function JobListCard({ job, onRemove, onAnalysed, onStatusChange, hasResumes }: {
  job: JobItem;
  onRemove: (id: string) => void;
  onAnalysed: (id: string, a: JobAnalysis) => void;
  onStatusChange: (id: string, s: Status) => void;
  hasResumes: boolean;
}) {
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const a = getA(job);
  const rec = a ? REC_STYLES[a.recommendation] : null;
  const isExpired = !job.title && job.source === "portal";
  const noDescription = job.source === "portal" && job.has_description === false;
  const statusMeta = STATUS_META[job.status] ?? STATUS_META.saved;
  const hasPackage = !!(job.submitted_resume_text || job.cover_letter || job.interview_questions);

  async function analyse() {
    if (!hasResumes) { setError("Upload a resume in Career Profile first."); return; }
    setAnalysing(true); setError("");
    try {
      const res = await fetch("/api/career/profile/analyze-job", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.job_id, source: job.source }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || data.error || "Analysis failed."); return; }
      onAnalysed(job.id, data.analysis);
    } finally { setAnalysing(false); }
  }

  async function remove() {
    onRemove(job.id);
    if (job.source === "user") fetch(`/api/career/profile/user-jobs/${job.id}`, { method: "DELETE" });
    else fetch("/api/workspace/save-job", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.job_id }) });
  }

  async function reanalyse() {
    setAnalysing(true); setError("");
    try {
      const res = await fetch("/api/career/profile/analyze-job", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.job_id, source: job.source, force: true }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || data.error || "Analysis failed."); return; }
      onAnalysed(job.id, data.analysis);
    } finally { setAnalysing(false); }
  }

  async function changeStatus(s: Status) {
    setShowStatusMenu(false);
    onStatusChange(job.id, s);
    fetch("/api/career/profile/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.job_id, source: job.source, status: s }) });
  }

  const cta = noDescription ? null : !isExpired && a && rec ? (
    a.recommendation === "apply_now" ? (
      <a href={job.apply_url ?? (job.source === "portal" ? `/jobs/${job.job_id}` : "#")}
        target={job.apply_url ? "_blank" : undefined} rel="noopener noreferrer"
        onClick={() => changeStatus("applied")}
        style={{ background: rec.btn, color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "11px 20px", borderRadius: 9, textDecoration: "none", whiteSpace: "nowrap" }}>
        Apply
      </a>
    ) : a.recommendation === "improve_first" && a.action_tool ? (
      <Link href={TOOL_LINKS[a.action_tool] ?? "/career"}
        style={{ background: rec.btn, color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "11px 20px", borderRadius: 9, textDecoration: "none", whiteSpace: "nowrap" }}>
        Continue
      </Link>
    ) : (
      <button onClick={remove}
        style={{ background: rec.btn, color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "11px 20px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
        Archive
      </button>
    )
  ) : !isExpired && !a && !job._analysing && hasResumes ? (
    <button onClick={analyse} disabled={analysing}
      style={{ background: D.green, color: "#fff", fontWeight: 600, fontSize: 14, padding: "11px 20px", borderRadius: 9, border: "none", cursor: analysing ? "wait" : "pointer", fontFamily: "inherit", opacity: analysing ? 0.7 : 1 }}>
      {analysing ? "Analysing…" : "Analyse fit"}
    </button>
  ) : null;

  const iqList = Array.isArray(job.interview_questions) ? job.interview_questions as string[] : null;

  return (
    <div style={{ background: D.white, border: `1px solid ${D.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Main row */}
      <div style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 22 }}>
        {/* Fit indicator */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 72, flexShrink: 0 }}>
          {a && rec ? (
            <>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: rec.dot }} />
              <div style={{ fontSize: 10.5, color: D.textMuted, textAlign: "center", lineHeight: 1.3 }}>{rec.dotLabel}</div>
            </>
          ) : job._analysing ? (
            <div style={{ fontSize: 11, color: D.green }}>…</div>
          ) : (
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: D.border }} />
          )}
        </div>

        {/* Title + company + status badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: isExpired ? D.textMuted : D.text }}>{job.title ?? "Listing expired"}</div>
          <div style={{ fontSize: 13.5, color: D.textSub, marginTop: 2 }}>{job.company}{job.location ? ` · ${job.location}` : ""}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {/* Status badge + menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowStatusMenu(p => !p)}
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: statusMeta.color, background: statusMeta.bg, border: "none", borderRadius: 5, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit" }}>
                {statusMeta.label} ▾
              </button>
              {showStatusMenu && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: D.white, border: `1px solid ${D.border}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 50, minWidth: 140 }}>
                  {ALL_STATUSES.map(s => {
                    const sm = STATUS_META[s];
                    return (
                      <button key={s} onClick={() => changeStatus(s)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, fontWeight: job.status === s ? 700 : 400, color: job.status === s ? sm.color : D.textMid, background: job.status === s ? sm.bg : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                        {sm.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {job.applied_at && <span style={{ fontSize: 11, color: D.textMuted }}>Applied {fmtDate(job.applied_at)}</span>}
            {job.source === "user" && <span style={{ fontSize: 10, color: D.textMuted, letterSpacing: "0.05em" }}>EXTERNAL</span>}
          </div>
        </div>

        {/* Insight pill */}
        <div style={{ flex: 1.6, minWidth: 0 }}>
          {job._analysing ? (
            <div style={{ background: "oklch(0.96 0.03 250)", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: D.green }}>Analysing your fit…</div>
          ) : a && rec ? (
            <div style={{ background: rec.insight, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "oklch(0.25 0.01 250)", marginBottom: (a.recommendation === "apply_now" ? a.strengths : a.gaps).length > 0 ? 8 : 0 }}>
                {a.recommendation_reason}
              </div>
              {(a.recommendation === "apply_now" ? a.strengths : a.gaps).length > 0 && (
                <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                  {(a.recommendation === "apply_now" ? a.strengths : a.gaps).slice(0, 3).map((b, i) => (
                    <li key={i} style={{ fontSize: 12.5, color: "oklch(0.35 0.01 250)", marginBottom: 2, lineHeight: 1.4 }}>{b}</li>
                  ))}
                </ul>
              )}
              {a.hidden.length > 0 && a.recommendation !== "apply_now" && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${rec.insight === D.moveOnBg ? "oklch(0.88 0.005 25)" : "oklch(0.88 0.01 85)"}`, fontSize: 12, color: D.textMuted }}>
                  Your experience may not be fully represented. Add more resume versions in <Link href="/career/profile" style={{ color: D.textMid, fontWeight: 600 }}>Career Profile</Link> for a more accurate read.
                </div>
              )}
            </div>
          ) : noDescription ? (
            <div style={{ background: "oklch(0.96 0.005 250)", borderRadius: 10, padding: "12px 16px", fontSize: 13.5, color: D.textMuted, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: D.textMid, display: "block", marginBottom: 2 }}>Analysis unavailable</span>
              We could not retrieve the job description. Revisit the posting or paste the description to enable AI analysis.
            </div>
          ) : !isExpired ? (
            <div style={{ background: "oklch(0.96 0.005 250)", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: D.textMuted }}>
              {hasResumes ? "Not yet analysed." : "Upload a resume to analyse this role."}
            </div>
          ) : null}
          {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error} <Link href="/career/profile" style={{ color: "#dc2626", fontWeight: 700 }}>Go to Career Profile</Link></div>}
        </div>

        {/* Action */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          {rec && <div style={{ fontSize: 11.5, color: D.textMuted }}>{rec.nextStep}</div>}
          {cta}
          <div style={{ display: "flex", gap: 10 }}>
            {hasPackage && (
              <button onClick={() => setExpanded(p => !p)} style={{ fontSize: 11, color: D.green, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontFamily: "inherit" }}>
                {expanded ? "Hide package" : "View package"}
              </button>
            )}
            {a && !analysing && (
              <button onClick={reanalyse} style={{ fontSize: 11, color: D.textMuted, background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontFamily: "inherit" }}>Re-analyse</button>
            )}
            {a?.recommendation !== "move_on" && (
              <button onClick={remove} style={{ fontSize: 11, color: D.textMuted, background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontFamily: "inherit" }}>Remove</button>
            )}
          </div>
        </div>
      </div>

      {/* Application package — expands when user has been called for interview */}
      {expanded && hasPackage && (
        <div style={{ borderTop: `1px solid ${D.border}`, padding: "24px 22px", background: "oklch(0.985 0.003 250)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: D.textMuted, marginBottom: 16 }}>APPLICATION PACKAGE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Resume snapshot */}
            {job.submitted_resume_text && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.textMid, marginBottom: 6 }}>
                  Resume submitted{job.submitted_resume_name ? ` — ${job.submitted_resume_name}` : ""}
                </div>
                <pre style={{ fontSize: 12, color: D.textSub, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", background: D.white, border: `1px solid ${D.borderSoft}`, borderRadius: 8, padding: "14px 16px", maxHeight: 320, overflowY: "auto", margin: 0, fontFamily: "inherit" }}>
                  {job.submitted_resume_text}
                </pre>
                <button onClick={() => navigator.clipboard.writeText(job.submitted_resume_text!).catch(() => {})}
                  style={{ marginTop: 6, fontSize: 11, color: D.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  Copy resume text
                </button>
              </div>
            )}

            {/* Cover letter / application message */}
            {job.cover_letter && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.textMid, marginBottom: 6 }}>Application message / cover letter</div>
                <pre style={{ fontSize: 12, color: D.textSub, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", background: D.white, border: `1px solid ${D.borderSoft}`, borderRadius: 8, padding: "14px 16px", maxHeight: 240, overflowY: "auto", margin: 0, fontFamily: "inherit" }}>
                  {job.cover_letter}
                </pre>
                <button onClick={() => navigator.clipboard.writeText(job.cover_letter!).catch(() => {})}
                  style={{ marginTop: 6, fontSize: 11, color: D.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  Copy
                </button>
              </div>
            )}

            {/* Interview questions */}
            {iqList && iqList.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.textMid, marginBottom: 8 }}>Likely interview questions</div>
                <ol style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {iqList.map((q, i) => (
                    <li key={i} style={{ fontSize: 13, color: D.textSub, lineHeight: 1.6, marginBottom: 6 }}>{q}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Job Modal ─────────────────────────────────────────────────────────────

function AddJobModal({ onClose, onAdded, hasResumes }: { onClose: () => void; onAdded: (j: JobItem) => void; hasResumes: boolean }) {
  const [desc, setDesc] = useState(""); const [title, setTitle] = useState(""); const [company, setCompany] = useState("");
  const [location, setLocation] = useState(""); const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const timer = useRef<NodeJS.Timeout | null>(null);

  const onDesc = useCallback(async (text: string) => {
    setDesc(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 100) return;
    timer.current = setTimeout(async () => {
      setExtracting(true);
      try {
        const res = await fetch("/api/career/profile/extract-jd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        if (res.ok) { const { extracted } = await res.json(); if (extracted.title && !title) setTitle(extracted.title); if (extracted.company && !company) setCompany(extracted.company); if (extracted.location && !location) setLocation(extracted.location); if (extracted.apply_url && !url) setUrl(extracted.apply_url); }
      } finally { setExtracting(false); }
    }, 900);
  }, [title, company, location, url]);

  async function submit() {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/career/profile/user-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, company, location, description: desc, apply_url: url }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      const newJob: JobItem = { id: data.job.id, job_id: data.job.id, source: "user", title: data.job.title, company: data.job.company, location: data.job.location, apply_url: data.job.apply_url, analysis_result: null, status: "saved", created_at: data.job.created_at, _analysing: hasResumes };
      onAdded(newJob); onClose();
      if (hasResumes) {
        const ar = await fetch("/api/career/profile/analyze-job", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: data.job.id, source: "user" }) });
        if (ar.ok) { const { analysis } = await ar.json(); onAdded({ ...newJob, analysis_result: analysis, _analysing: false }); }
      }
    } finally { setSaving(false); }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${D.border}`, fontSize: 14, color: D.text, background: "#fafafa", fontFamily: "inherit", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: D.textSub, marginBottom: 6, letterSpacing: "0.04em" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: D.white, borderRadius: 16, padding: 32, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: D.text, marginBottom: 4 }}>Save a new job</div>
        <div style={{ fontSize: 13, color: D.textSub, marginBottom: 20 }}>Paste the job description. Title, company and location fill automatically.</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={lbl}>JOB DESCRIPTION</label>
            {extracting && <span style={{ fontSize: 12, color: D.green }}>Reading posting…</span>}
          </div>
          <textarea rows={7} value={desc} onChange={e => onDesc(e.target.value)} autoFocus placeholder="Paste the full job posting here. Details fill in automatically." style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div><label style={lbl}>JOB TITLE</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Auto-filled" style={inp} /></div>
          <div><label style={lbl}>COMPANY</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Auto-filled" style={inp} /></div>
          <div><label style={lbl}>LOCATION</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Auto-filled" style={inp} /></div>
          <div><label style={lbl}>APPLY URL</label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="Auto-filled" style={inp} /></div>
        </div>

        {!hasResumes && (
          <div style={{ padding: "10px 14px", background: "oklch(0.96 0.03 85)", border: "1px solid oklch(0.88 0.05 85)", borderRadius: 8, fontSize: 13, color: D.textMid, marginBottom: 14 }}>
            <Link href="/career/profile" style={{ color: D.textMid, fontWeight: 700 }}>Upload a resume</Link> and we will analyse your fit automatically when you save.
          </div>
        )}

        {error && <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={saving || !title.trim() || !company.trim() || desc.trim().length < 50}
            style={{ padding: "11px 24px", borderRadius: 9, background: D.green, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "inherit", opacity: (!title.trim() || !company.trim() || desc.trim().length < 50 || saving) ? 0.5 : 1 }}>
            {saving ? "Saving…" : hasResumes ? "Save and analyse" : "Save job"}
          </button>
          <button onClick={onClose} style={{ padding: "11px 20px", borderRadius: 9, background: "transparent", border: `1px solid ${D.border}`, color: D.textSub, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function JobsClient({ user, profile, allJobs, hasResumes }: Props) {
  const [jobs, setJobs] = useState(allJobs);
  const [filter, setFilter] = useState<Filter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  function handleRemove(id: string) { setJobs(p => p.filter(j => j.id !== id)); }
  function handleAnalysed(id: string, a: JobAnalysis) { setJobs(p => p.map(j => j.id === id ? { ...j, analysis_result: a, _analysing: false } : j)); }
  function handleStatusChange(id: string, s: Status) { setJobs(p => p.map(j => j.id === id ? { ...j, status: s } : j)); }
  function handleAdded(job: JobItem) { setJobs(p => { const e = p.find(j => j.id === job.id); return e ? p.map(j => j.id === job.id ? job : j) : [job, ...p]; }); }

  const q = search.toLowerCase().trim();
  const searchFiltered = q
    ? jobs.filter(j =>
        (j.company ?? "").toLowerCase().includes(q) ||
        (j.title ?? "").toLowerCase().includes(q)
      )
    : null;

  const active       = jobs.filter(j => j.status === "saved");
  const applyNow     = active.filter(j => getA(j)?.recommendation === "apply_now");
  const improveFirst = active.filter(j => getA(j)?.recommendation === "improve_first");
  const moveOnJobs   = active.filter(j => getA(j)?.recommendation === "move_on");

  const todayJob = applyNow[0] ?? improveFirst[0] ?? null;

  const visibleJobs = searchFiltered ?? (
    filter === "apply_now"     ? applyNow :
    filter === "improve_first" ? improveFirst :
    filter === "move_on"       ? moveOnJobs :
    active
  );

  const counts = { all: active.length, apply_now: applyNow.length, improve_first: improveFirst.length, move_on: moveOnJobs.length };

  const filterBtnStyle = (key: Filter): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${filter === key ? D.green : D.border}`,
    background: filter === key ? D.green : D.white,
    color: filter === key ? "#fff" : D.textMid,
    fontFamily: "inherit",
  });

  const STAT_COLOR = {
    apply_now:     "oklch(0.55 0.13 165)",
    improve_first: "oklch(0.6 0.14 75)",
    move_on:       "oklch(0.5 0.03 25)",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: D.pageBg, color: D.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" }}>
      <AppSidebar activeHref="/job-plans" profile={profile} user={user} />

      {showAdd && <AddJobModal onClose={() => setShowAdd(false)} onAdded={handleAdded} hasResumes={hasResumes} />}

      <div style={{ flex: 1, padding: "32px 40px", maxWidth: 1400 }}>

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by company or job title…"
            style={{ width: "100%", maxWidth: 420, padding: "10px 16px", borderRadius: 9, border: `1px solid ${D.border}`, fontSize: 14, color: D.text, background: D.white, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{greeting(profile?.full_name ?? null)}</div>
            <div style={{ fontSize: 14.5, color: D.textSub, marginTop: 4 }}>{subheading(jobs)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setShowAdd(true)}
              style={{ border: `1px solid ${D.border}`, background: D.white, borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", color: D.textMid, fontFamily: "inherit" }}>
              + Save a new job
            </button>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "oklch(0.9 0.01 250)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: D.textMid }}>
              {(profile?.full_name ?? user.email ?? "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "BA"}
            </div>
          </div>
        </div>

        {/* What to do today */}
        {!searchFiltered && (applyNow.length > 0 || improveFirst.length > 0 || moveOnJobs.length > 0) && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", color: D.textMuted, marginBottom: 10 }}>WHAT TO DO TODAY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 32 }}>
              {([
                { count: applyNow.length,    label: "Ready to Apply",  sub: "Strong fit, act now",         key: "apply_now"     },
                { count: improveFirst.length, label: "Improve First",   sub: "Close a gap before applying", key: "improve_first" },
                { count: moveOnJobs.length,   label: "Lower Priority",  sub: "Focus on stronger roles",     key: "move_on"       },
              ] as const).map(s => (
                <div key={s.key} style={{ background: D.white, border: `1px solid ${D.border}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: STAT_COLOR[s.key] }}>{s.count}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: D.textMuted }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Today's Focus */}
        {!searchFiltered && todayJob && <TodaysFocusCard job={todayJob} onStatusChange={handleStatusChange} />}

        {/* No resumes */}
        {!hasResumes && jobs.length > 0 && (
          <div style={{ padding: "12px 18px", background: "oklch(0.96 0.03 85)", border: "1px solid oklch(0.88 0.05 85)", borderRadius: 10, fontSize: 14, color: D.textMid, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span>Upload your resume to see your fit score and action plan for every job.</span>
            <Link href="/career/profile" style={{ padding: "8px 16px", borderRadius: 8, background: D.amber, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Add resume</Link>
          </div>
        )}

        {/* Job list */}
        {jobs.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 19, fontWeight: 700 }}>
                {searchFiltered ? `${searchFiltered.length} result${searchFiltered.length !== 1 ? "s" : ""} for "${search}"` : "Your Job Plans"}
              </div>
              {!searchFiltered && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={filterBtnStyle("all")}           onClick={() => setFilter("all")}>All ({counts.all})</button>
                  <button style={filterBtnStyle("apply_now")}     onClick={() => setFilter("apply_now")}>Apply Now ({counts.apply_now})</button>
                  <button style={filterBtnStyle("improve_first")} onClick={() => setFilter("improve_first")}>Improve First ({counts.improve_first})</button>
                  <button style={filterBtnStyle("move_on")}       onClick={() => setFilter("move_on")}>Lower Priority ({counts.move_on})</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {visibleJobs.map(j => (
                <JobListCard key={j.id} job={j} onRemove={handleRemove} onAnalysed={handleAnalysed} onStatusChange={handleStatusChange} hasResumes={hasResumes} />
              ))}
              {visibleJobs.length === 0 && (
                <div style={{ padding: "32px 24px", background: D.white, border: `1px solid ${D.border}`, borderRadius: 12, textAlign: "center", color: D.textMuted, fontSize: 14 }}>No jobs in this category.</div>
              )}
            </div>
          </>
        )}

        {/* Empty state */}
        {jobs.length === 0 && (
          <div style={{ padding: "64px 24px", background: D.white, border: `1px solid ${D.border}`, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: D.textMid, marginBottom: 8 }}>No jobs yet.</div>
            <div style={{ fontSize: 14, color: D.textMuted, marginBottom: 24 }}>Save a job from the board, or paste any job description from anywhere.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowAdd(true)} style={{ padding: "11px 24px", borderRadius: 9, background: D.green, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "inherit" }}>+ Add a job</button>
              <Link href="/opportunities" style={{ padding: "11px 24px", borderRadius: 9, border: `1px solid ${D.border}`, background: "transparent", color: D.textMid, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Browse jobs</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
