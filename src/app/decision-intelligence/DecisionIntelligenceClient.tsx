"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";

interface Message { role: "user" | "assistant"; content: string; }
interface Props {
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  user: { email: string };
}

// ── Markdown renderer ──────────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      nodes.push(<h2 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", margin: "0 0 16px" }}>{line.slice(2)}</h2>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h3 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#1fbf9f", letterSpacing: "-0.01em", margin: "24px 0 8px", paddingBottom: 6, borderBottom: "1px solid rgba(31,191,159,.15)" }}>{line.slice(3)}</h3>);
    } else if (line.startsWith("### ")) {
      nodes.push(<h4 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 700, color: "var(--t1)", margin: "18px 0 6px" }}>{line.slice(4)}</h4>);
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      nodes.push(<div key={i} style={{ fontWeight: 700, color: "var(--t1)", fontSize: 13.5, margin: "6px 0 3px" }}>{line.replace(/\*\*/g, "")}</div>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(<div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 5 }}><div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1fbf9f", flexShrink: 0, marginTop: 8 }} /><span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}>{line.slice(2).replace(/\*\*/g, "")}</span></div>);
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const content = line.replace(/^\d+\.\s/, "").replace(/\*\*/g, "");
      nodes.push(<div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(31,191,159,.1)", border: "1px solid rgba(31,191,159,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#1fbf9f", flexShrink: 0, marginTop: 2 }}>{num}</div><span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}>{content}</span></div>);
    } else if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) { if (!lines[i].includes("---")) tableLines.push(lines[i]); i++; }
      if (tableLines.length > 0) {
        const headers = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim());
        const rows = tableLines.slice(1).map(r => r.split("|").filter(c => c.trim()).map(c => c.trim()));
        nodes.push(<div key={i} style={{ overflowX: "auto", margin: "12px 0 16px" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}><thead><tr>{headers.map((h, hi) => <th key={hi} style={{ padding: "8px 12px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#1fbf9f", letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid rgba(31,191,159,.2)", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ padding: "8px 12px", color: "var(--t2)", borderBottom: "1px solid rgba(255,255,255,.04)", lineHeight: 1.5, verticalAlign: "top" }}>{cell.replace(/\*\*/g, "")}</td>)}</tr>)}</tbody></table></div>);
        continue;
      }
    } else if (line.trim() === "" || line.trim() === "---") {
      nodes.push(<div key={i} style={{ height: line.trim() === "---" ? 1 : 6, background: line.trim() === "---" ? "rgba(255,255,255,.05)" : "none", margin: line.trim() === "---" ? "16px 0" : 0 }} />);
    } else if (line.trim()) {
      nodes.push(<p key={i} style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.72, margin: "0 0 8px" }}>{line.replace(/\*\*/g, "")}</p>);
    }
    i++;
  }
  return nodes;
}

// ── Tool config ────────────────────────────────────────────────────────────────
interface ToolConfig {
  id: string; label: string; tag: string; color: string;
  icon: React.ReactNode; desc: string; longDesc: string;
  examples: string[]; inputPlaceholderInitial: string; inputPlaceholderFollowup: string;
  isOutput: (text: string) => boolean; skipClarify?: boolean;
}

const TOOLS: ToolConfig[] = [
  {
    id: "solution-evaluator", label: "Solution Evaluator", tag: "Compare Options", color: "#22c55e",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" width="20" height="20"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
    desc: "Compare 2–3 solution options side-by-side. Get scoring, recommendations, and reasoning.",
    longDesc: "Paste your options, describe the business context, and get a scored comparison with a clear recommendation.",
    examples: ["Build vs buy vs integrate: we need a new CRM", "Option A is phased rollout, Option B is big bang", "Outsourcing claims vs building internal team", "Cloud migration: lift-and-shift vs re-platform vs rebuild"],
    inputPlaceholderInitial: "Describe the decision and the options you are considering. Include constraints and what success looks like.",
    inputPlaceholderFollowup: "Answer the questions above — the more specific you are, the sharper the recommendation.",
    isOutput: (t) => t.includes("# Solution Evaluation") || t.includes("## Recommendation"),
  },
  {
    id: "risk-radar", label: "Risk Radar", tag: "Risk Register", color: "#f59e0b",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    desc: "Identify and analyze risks with probability, impact, mitigation strategies, and ownership.",
    longDesc: "Surface hidden risks before they surface themselves. Covers Technical, Business, People, Regulatory, and External categories.",
    examples: ["Core banking replacement — go-live in Q1", "New lending product for an emerging market", "Moving 200 staff to a new ERP system", "Outsourcing IT support to a third-party provider"],
    inputPlaceholderInitial: "Describe your project or situation. Include the phase you are in and any concerns you already have.",
    inputPlaceholderFollowup: "Answer the questions to get a risk register that reflects your situation.",
    isOutput: (t) => t.includes("# Risk Radar") || t.includes("## Risk Register"),
  },
  {
    id: "assumptions-challenger", label: "Assumptions Challenger", tag: "Instant Analysis", color: "#8b5cf6",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    desc: "Surface hidden assumptions, test their validity, and understand how they could impact your decision.",
    longDesc: "No clarifying questions. Paste and go. Most teams don't realise how many assumptions they are building on.",
    examples: ["Paste your project brief or scope document", "Paste your requirements document or BRD", "Paste a business case or proposal", "Paste meeting notes or a stakeholder summary"],
    inputPlaceholderInitial: "Paste your document, plan, or any text you want analysed for assumptions.",
    inputPlaceholderFollowup: "",
    isOutput: (t) => t.includes("# Assumptions Audit") || t.includes("## Assumptions Identified"),
    skipClarify: true,
  },
  {
    id: "stakeholder-intelligence", label: "Stakeholder Intelligence", tag: "People & Politics", color: "#1fbf9f",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round" width="20" height="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    desc: "Map stakeholders, analyze influence, interest, and impact, and plan engagement strategies.",
    longDesc: "Know your stakeholders before you walk into the room. Map influence, predict objections, and plan your approach.",
    examples: ["CRM rollout — sales director supportive, ops resistant", "Process redesign across three departments", "Board-driven digital transformation — IT onboard, business units not", "New compliance requirement — legal pushing, ops pushing back"],
    inputPlaceholderInitial: "Describe your project and list the key stakeholders. Include their roles, stance, and any political dynamics.",
    inputPlaceholderFollowup: "Answer the questions so I can map the dynamics accurately.",
    isOutput: (t) => t.includes("# Stakeholder Intelligence") || t.includes("## Stakeholder Map"),
  },
];

// ── Export helper ─────────────────────────────────────────────────────────────
async function downloadDIOutput(content: string, title: string, format: "txt" | "docx") {
  try {
    const res = await fetch("/api/workspace/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, title, format }) });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const disposition = res.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `${title.toLowerCase().replace(/\s+/g, "-")}.${format}`;
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch { /* fail silently */ }
}

// ── Hero wave SVG — subtle top-right decoration only ─────────────────────────
function HeroWave() {
  return (
    <svg viewBox="0 0 300 160" preserveAspectRatio="xMaxYMin meet"
      style={{ position: "absolute", right: 0, top: 0, width: 320, height: 160, opacity: 0.55, pointerEvents: "none" }}>
      <defs>
        <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1fbf9f" stopOpacity="0" />
          <stop offset="50%" stopColor="#1fbf9f" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1fbf9f" stopOpacity="0.1" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {["M20,40 C80,20 140,60 200,40 C250,24 280,50 310,35",
        "M10,65 C70,45 140,85 210,65 C260,50 285,72 310,58",
        "M0,90 C60,70 130,110 200,90 C255,74 285,95 310,82",
        "M20,115 C80,95 150,130 215,112 C262,98 288,118 310,106",
        "M40,138 C100,118 165,152 225,135 C268,122 292,140 310,130",
      ].map((d, i) => (
        <path key={i} d={d} stroke="url(#wg)" strokeWidth={1 + i * 0.2} fill="none" filter="url(#glow)"
          style={{ animation: `waveShift ${5 + i}s ${i * 0.6}s ease-in-out infinite alternate`, opacity: 0.6 + i * 0.08 }} />
      ))}
      {[[240,30],[270,55],[290,20],[310,70],[255,90],[305,100]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r={1.2} fill="#1fbf9f" style={{ opacity: 0.4, animation: `particlePulse ${3+i}s ${i*0.4}s ease-in-out infinite alternate` }} />
      ))}
    </svg>
  );
}

// ── File upload ────────────────────────────────────────────────────────────────
function DIFileUpload({ onParsed, color }: { onParsed: (text: string, name: string) => void; color: string }) {
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  async function handleFile(file: File) {
    setStatus("loading");
    const form = new FormData(); form.append("file", file);
    try {
      const res = await fetch("/api/tools/parse-document", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Could not read file.");
      onParsed(data.text, data.fileName); setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch { setStatus("error"); setTimeout(() => setStatus("idle"), 4000); }
  }
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: status === "done" ? `${color}18` : "none", border: `1px solid ${status === "done" ? color+"35" : "rgba(255,255,255,.1)"}`, cursor: status === "loading" ? "wait" : "pointer", color: status === "done" ? color : "rgba(255,255,255,.3)", transition: "all .2s" }}>
      <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} disabled={status === "loading"} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
      {status === "loading" ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>}
    </label>
  );
}

// ── Session ────────────────────────────────────────────────────────────────────
function DISession({ tool, onBack, initialInput }: { tool: ToolConfig; onBack: () => void; initialInput?: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [phase, setPhase]       = useState<"initial"|"followup"|"done">("initial");
  const [hasDeliveredOutput, setHasDeliveredOutput] = useState(false);
  const endRef      = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    if (!initialInput?.trim()) return;
    const newMessages: Message[] = [{ role: "user", content: initialInput.trim() }];
    setMessages(newMessages); setPhase("followup"); setLoading(true);
    fetch("/api/decision/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMessages, tool: tool.id }) })
      .then(r => r.json())
      .then(data => {
        const reply = data.response ?? "Something went wrong.";
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
        if (tool.isOutput(reply)) {
          if (tool.id === "stakeholder-intelligence") setHasDeliveredOutput(true);
          else setPhase("done");
        }
      })
      .catch(() => setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong." }]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const trimmed = input.trim(); if (!trimmed || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/decision/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMessages, tool: tool.id }) });
      const data = await res.json();
      const reply = data.response ?? "Something went wrong.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (phase === "initial") setPhase(tool.skipClarify ? "done" : "followup");
      else if (tool.isOutput(reply)) {
        if (tool.id === "stakeholder-intelligence") setHasDeliveredOutput(true);
        else setPhase("done");
      }
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong." }]); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 16, flexShrink: 0, background: "rgba(13,13,18,.8)" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,.4)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.7)"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.4)"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Decision Intelligence
        </button>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,.1)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: tool.color, boxShadow: `0 0 8px ${tool.color}` }} />
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: "#f2f2f8" }}>{tool.label}</span>
        </div>
        {phase === "done" && (
          <button onClick={() => { setMessages([]); setPhase("initial"); setInput(""); }} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.4)", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Start over
          </button>
        )}
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {messages.length === 0 && (
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${tool.color}18`, border: `1px solid ${tool.color}35`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>{tool.icon}</div>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: "#f2f2f8", marginBottom: 10 }}>{tool.label}</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.7, marginBottom: 32 }}>{tool.longDesc}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left" }}>
              {tool.examples.map((ex, i) => (
                <button key={i} onClick={() => setInput(ex)} style={{ padding: "11px 14px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, fontSize: 13, color: "rgba(255,255,255,.5)", textAlign: "left", lineHeight: 1.5, cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${tool.color}40`; (e.currentTarget as HTMLButtonElement).style.color = "#f2f2f8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.5)"; }}>{ex}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const isOutput = !isUser && tool.isOutput(msg.content);
          const isLast = i === messages.length - 1;
          if (isUser) return (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <div style={{ maxWidth: "72%", padding: "12px 16px", background: `${tool.color}18`, border: `1px solid ${tool.color}30`, borderRadius: "14px 14px 3px 14px", fontSize: 14, color: "#f2f2f8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          );
          if (isOutput) return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${tool.color}18`, border: `1px solid ${tool.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>{tool.icon}</div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.35)" }}>Analysis complete</span>
                {isLast && <div style={{ width: 6, height: 6, borderRadius: "50%", background: tool.color, boxShadow: `0 0 6px ${tool.color}` }} />}
              </div>
              <div style={{ background: "rgba(255,255,255,.02)", border: `1px solid ${tool.color}20`, borderRadius: 16, padding: "28px 32px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)` }} />
                {renderMarkdown(msg.content)}
              </div>
            </div>
          );
          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${tool.color}18`, border: `1px solid ${tool.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{tool.icon}</div>
              <div style={{ maxWidth: "78%", padding: "12px 16px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "3px 14px 14px 14px", fontSize: 14, color: "#f2f2f8", lineHeight: 1.68 }}>{renderMarkdown(msg.content)}</div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${tool.color}18`, border: `1px solid ${tool.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>{tool.icon}</div>
            <div style={{ padding: "12px 16px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "3px 14px 14px 14px", display: "flex", gap: 5 }}>
              {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.3)", animation: `typing-dot 1.2s ${j*.2}s infinite ease-in-out` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {phase !== "done" ? (
        <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
          {hasDeliveredOutput && (
            <div style={{ padding: "10px 32px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.25)", letterSpacing: ".06em", textTransform: "uppercase" as const, flexShrink: 0 }}>Analysis delivered</span>
              <button onClick={() => { setMessages([]); setPhase("initial"); setInput(""); setHasDeliveredOutput(false); }}
                style={{ padding: "5px 12px", borderRadius: 6, background: tool.color, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#041a13" }}>Start over</button>
              {(["docx","txt"] as const).map(fmt => (
                <button key={fmt} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.45)" }}
                  onClick={() => { const t = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n---\n\n"); downloadDIOutput(t, tool.label, fmt); }}>.{fmt}</button>
              ))}
              <button onClick={() => { const t = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n---\n\n"); navigator.clipboard?.writeText(t); }}
                style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,.45)" }}>Copy</button>
              {(() => {
                const fullOutput = messages.filter(m => m.role === "assistant").map(m => m.content).join(" ").toLowerCase();
                const isCareerRelated = /\b(resume|cv|interview|job|career|pivot|salary|role|hiring|recruiter|linkedin|application|portfolio|cover letter|employment|candidate|quit|transition|promotion)\b/.test(fullOutput);
                if (!isCareerRelated) return null;
                return (
                  <>
                    <div style={{ width: 1, height: 14, background: "rgba(255,255,255,.1)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)", letterSpacing: ".06em", textTransform: "uppercase" as const, flexShrink: 0 }}>Career Suite</span>
                    {([
                      { label: "Resume", url: "/career?cat=land&intent=improve_resume&from=di" },
                      { label: "Interview Prep", url: "/career?cat=grow&intent=interview_preparation&from=di" },
                      { label: "Cover Letter", url: "/career?cat=land&intent=tailor_application&from=di" },
                    ] as const).map(({ label, url }) => (
                      <button key={label}
                        onClick={() => {
                          const output = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n");
                          try { sessionStorage.setItem("di_career_context", JSON.stringify({ toolLabel: tool.label, output })); } catch { /* ignore */ }
                          router.push(url);
                        }}
                        style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.35)", transition: "all .15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${tool.color}50`; (e.currentTarget as HTMLButtonElement).style.color = "#f2f2f8"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.35)"; }}>
                        {label}
                      </button>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        <div style={{ padding: "16px 32px 24px" }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, overflow: "hidden" }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = `${tool.color}50`)}
            onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,.1)")}>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={phase === "initial" ? tool.inputPlaceholderInitial : tool.inputPlaceholderFollowup} rows={3}
              style={{ width: "100%", background: "none", border: "none", outline: "none", padding: "14px 16px", fontSize: 14, color: "#f2f2f8", lineHeight: 1.65, resize: "none", fontFamily: "'Open Sans',sans-serif" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
              <DIFileUpload color={tool.color} onParsed={(text, name) => setInput(p => p ? `${p}\n\n[From: ${name}]\n${text}` : `[From: ${name}]\n${text}`)} />
              <button onClick={send} disabled={!input.trim() || loading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: input.trim() && !loading ? tool.color : `${tool.color}20`, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, color: input.trim() && !loading ? "#041a13" : "rgba(255,255,255,.3)", transition: "all .2s" }}>
                {loading ? "Thinking..." : "Send"} {!loading && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
              </button>
            </div>
          </div>
        </div>
        </div>
      ) : (
        <>
          <div style={{ padding: "16px 32px 12px", borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,.3)" }}>Analysis complete.</span>
            <button onClick={() => { setMessages([]); setPhase("initial"); setInput(""); }} style={{ padding: "8px 16px", borderRadius: 8, background: tool.color, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#041a13" }}>Start over</button>
            {(["docx","txt"] as const).map(fmt => (
              <button key={fmt} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,.5)" }}
                onClick={() => { const t = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n---\n\n"); downloadDIOutput(t, tool.label, fmt); }}>.{fmt}</button>
            ))}
            <button onClick={() => { const t = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n---\n\n"); navigator.clipboard?.writeText(t); }}
              style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>Copy</button>
          </div>
          {(() => {
            const fullOutput = messages.filter(m => m.role === "assistant").map(m => m.content).join(" ").toLowerCase();
            const isCareerRelated = /\b(resume|cv|interview|job|career|pivot|salary|role|hiring|recruiter|linkedin|application|portfolio|cover letter|employment|candidate|quit|transition|promotion)\b/.test(fullOutput);
            if (!isCareerRelated) return null;
            return (
              <div style={{ padding: "0 32px 20px", flexShrink: 0 }}>
                <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,.2)", letterSpacing: ".07em", textTransform: "uppercase" as const, flexShrink: 0 }}>Build in Career Suite</span>
                  {([
                    { label: "Resume", url: "/career?cat=land&intent=improve_resume&from=di" },
                    { label: "Interview Prep", url: "/career?cat=grow&intent=interview_preparation&from=di" },
                    { label: "Cover Letter", url: "/career?cat=land&intent=tailor_application&from=di" },
                  ] as const).map(({ label, url }) => (
                    <button key={label}
                      onClick={() => {
                        const output = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n");
                        try { sessionStorage.setItem("di_career_context", JSON.stringify({ toolLabel: tool.label, output })); } catch { /* ignore */ }
                        router.push(url);
                      }}
                      style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.4)", transition: "all .15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${tool.color}50`; (e.currentTarget as HTMLButtonElement).style.color = "#f2f2f8"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.4)"; }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ── Hub ────────────────────────────────────────────────────────────────────────
const EXAMPLES = ["Should we buy or build?", "Should we migrate now or next year?", "Which vendor should we select?", "Is this requirement worth implementing?"];

function DIHub({ onSelect, onLaunch }: { onSelect: (id: string) => void; onLaunch: (id: string, input: string) => void }) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  function routeToTool(): string {
    const t = input.toLowerCase();
    if (t.includes("risk") || t.includes("threat") || t.includes("mitigat")) return "risk-radar";
    if (t.includes("assump") || t.includes("audit") || t.includes("paste")) return "assumptions-challenger";
    if (t.includes("stakeholder") || t.includes("politics") || t.includes("resist") || t.includes("people")) return "stakeholder-intelligence";
    return "solution-evaluator";
  }

  function handleSubmit() {
    const trimmed = input.trim(); if (!trimmed) return;
    onLaunch(routeToTool(), trimmed);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#07070d" }}>

      {/* ── Hero ── */}
      <div style={{ position: "relative", padding: "24px 40px 16px", flexShrink: 0, overflow: "hidden" }}>
        <HeroWave />
        <button style={{ position: "absolute", top: 18, right: 32, zIndex: 2, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.45)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.07)"; e.currentTarget.style.color = "#f2f2f8"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; e.currentTarget.style.color = "rgba(255,255,255,.45)"; }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Decision Log
        </button>
        <div style={{ position: "relative", zIndex: 2 }}>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.025em", margin: "0 0 6px" }}>
            <span style={{ fontSize: 28, color: "#f2f2f8" }}>Not just analysis. </span>
            <span style={{ fontSize: 28, color: "#1fbf9f" }}>Judgment.</span>
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.55, maxWidth: 480, margin: 0 }}>
            Move beyond information. Decision Intelligence helps you reason through choices, challenge assumptions, surface risks, and navigate stakeholder dynamics.
          </p>
        </div>
      </div>

      {/* ── Input card ── */}
      <div style={{ padding: "0 40px 16px", flexShrink: 0 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 0" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.55)", fontFamily: "'Inter',sans-serif" }}>What decision are you trying to make?</span>
            <button onClick={handleSubmit} disabled={!input.trim()}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 8, background: input.trim() ? "#1fbf9f" : "rgba(31,191,159,.18)", border: "none", cursor: input.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, color: input.trim() ? "#041a13" : "rgba(255,255,255,.2)", transition: "all .2s", whiteSpace: "nowrap" as const }}>
              Start Analysis
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", flexWrap: "wrap" as const }}>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", fontSize: 11.5, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap" as const, transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(31,191,159,.1)"; e.currentTarget.style.borderColor = "rgba(31,191,159,.35)"; e.currentTarget.style.color = "#1fbf9f"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; e.currentTarget.style.color = "rgba(255,255,255,.4)"; }}>
                {ex}
              </button>
            ))}
          </div>
          <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Describe your situation, challenge, or choice. We'll help you think it through."
            rows={2}
            style={{ width: "100%", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,.06)", outline: "none", padding: "10px 18px", fontSize: 14, color: "#f2f2f8", lineHeight: 1.6, resize: "none", fontFamily: "'Open Sans',sans-serif" }}
          />
        </div>
      </div>

      {/* ── Four tool cards — single row, fills remaining space ── */}
      <div style={{ padding: "0 40px 40px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1 }}>
        {TOOLS.map(tool => (
          <div key={tool.id}
            style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderTop: `2px solid ${tool.color}`, borderRadius: "0 0 10px 10px", padding: "20px 20px", cursor: "pointer", transition: "background .15s, transform .15s", display: "flex", flexDirection: "column" }}
            onClick={() => onSelect(tool.id)}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${tool.color}08`; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.025)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
          >
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: "#f2f2f8", marginBottom: 6 }}>{tool.label}</div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: `${tool.color}15`, color: tool.color, border: `1px solid ${tool.color}25`, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "inline-block", marginBottom: 12, alignSelf: "flex-start" }}>{tool.tag}</span>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", lineHeight: 1.6, flex: 1 }}>{tool.desc}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: tool.color, marginTop: 16 }}>
              Launch
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DecisionIntelligenceClient({ profile, user }: Props) {
  const [activeTool, setActiveTool]     = useState<string | null>(null);
  const [initialInput, setInitialInput] = useState<string>("");
  const tool = TOOLS.find(t => t.id === activeTool) ?? null;

  useEffect(() => {
    const id = "di-globals";
    if (document.getElementById(id)) return;
    const style = document.createElement("style"); style.id = id;
    style.textContent = `
      :root {
        --bg: #07070d; --bg-1: #0d0d15; --bg-2: #111119;
        --teal: #1fbf9f; --t1: #f2f2f8; --t2: #9090a8; --t3: #505068; --t4: #2a2a3a;
        --border: rgba(255,255,255,0.08);
        --font-display: 'Inter',sans-serif; --font-body: 'Open Sans',sans-serif; --font-mono: 'JetBrains Mono',monospace;
        --radius-sm: 10px; --radius: 14px; --radius-lg: 20px;
      }
      @keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(31,191,159,.3);} 50%{opacity:.7;box-shadow:0 0 0 5px transparent;} }
      @keyframes typing-dot { 0%,80%,100%{transform:scale(.6);opacity:.3;} 40%{transform:scale(1);opacity:1;} }
      @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
      @keyframes waveShift { from{transform:translateY(0) scaleX(1);} to{transform:translateY(-12px) scaleX(1.03);} }
      @keyframes particlePulse { from{opacity:.3;r:1;} to{opacity:.7;r:2;} }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #07070d; }
      textarea::placeholder { color: rgba(255,255,255,.2); }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#07070d" }}>
      <AppSidebar activeHref="/decision-intelligence" profile={profile} user={user} />
      <main style={{ flex: 1, overflowY: tool ? "hidden" : "hidden", display: "flex", flexDirection: "column" }}>
        {tool ? (
          <DISession tool={tool} onBack={() => { setActiveTool(null); setInitialInput(""); }} initialInput={initialInput} />
        ) : (
          <DIHub
            onSelect={(id) => { setInitialInput(""); setActiveTool(id); }}
            onLaunch={(id, inp) => { setInitialInput(inp); setActiveTool(id); }}
          />
        )}
      </main>
    </div>
  );
}
