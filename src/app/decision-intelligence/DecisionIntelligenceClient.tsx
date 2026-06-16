"use client";

import { useState, useRef, useEffect } from "react";
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
      nodes.push(<h3 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--violet)", letterSpacing: "-0.01em", margin: "24px 0 8px", paddingBottom: 6, borderBottom: "1px solid rgba(124,110,245,.15)" }}>{line.slice(3)}</h3>);
    } else if (line.startsWith("### ")) {
      nodes.push(<h4 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 700, color: "var(--t1)", margin: "18px 0 6px" }}>{line.slice(4)}</h4>);
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      nodes.push(<div key={i} style={{ fontWeight: 700, color: "var(--t1)", fontSize: 13.5, margin: "6px 0 3px" }}>{line.replace(/\*\*/g, "")}</div>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 5 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--violet)", flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}>{line.slice(2).replace(/\*\*/g, "")}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const content = line.replace(/^\d+\.\s/, "").replace(/\*\*/g, "");
      nodes.push(
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(124,110,245,.1)", border: "1px solid rgba(124,110,245,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--violet)", flexShrink: 0, marginTop: 2 }}>{num}</div>
          <span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}>{content}</span>
        </div>
      );
    } else if (line.startsWith("|")) {
      // Table — collect all rows
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].includes("---")) tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length > 0) {
        const headers = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim());
        const rows = tableLines.slice(1).map(r => r.split("|").filter(c => c.trim()).map(c => c.trim()));
        nodes.push(
          <div key={i} style={{ overflowX: "auto", margin: "12px 0 16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {headers.map((h, hi) => (
                    <th key={hi} style={{ padding: "8px 12px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--violet)", letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid rgba(124,110,245,.2)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: "8px 12px", color: "var(--t2)", borderBottom: "1px solid rgba(255,255,255,.04)", lineHeight: 1.5, verticalAlign: "top" }}>{cell.replace(/\*\*/g, "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
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
  id: string;
  label: string;
  tag: string;
  color: string;
  icon: React.ReactNode;
  desc: string;
  longDesc: string;
  examples: string[];
  inputPlaceholderInitial: string;
  inputPlaceholderFollowup: string;
  isOutput: (text: string) => boolean;
  skipClarify?: boolean;
}

const TOOLS: ToolConfig[] = [
  {
    id: "solution-evaluator",
    label: "Solution Evaluator",
    tag: "Compare Options",
    color: "#7c6ef5",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#7c6ef5" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
    desc: "Compare 2–3 solution options. Get scoring, side-by-side analysis, and a clear recommendation with reasoning.",
    longDesc: "Paste your options, describe the business context, and let the engine evaluate cost, risk, complexity, and strategic fit — then recommend one.",
    examples: [
      "Build vs buy vs integrate: we need a new CRM and have three options on the table",
      "Option A is a phased rollout, Option B is a big bang go-live — which is right for our situation?",
      "We are choosing between outsourcing claims processing or building an internal team",
      "Cloud migration: lift and shift vs re-platform vs rebuild — comparing three approaches",
    ],
    inputPlaceholderInitial: "Describe the decision you need to make and the options you are considering. Include as much context as you can about your organisation, constraints, and what success looks like.",
    inputPlaceholderFollowup: "Answer the questions above — the more specific you are, the sharper the recommendation.",
    isOutput: (t) => t.includes("# Solution Evaluation") || t.includes("## Recommendation"),
  },
  {
    id: "risk-radar",
    label: "Risk Radar",
    tag: "Risk Register",
    color: "#f87171",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    desc: "Describe your project or situation. Get a complete risk register with probability, impact, mitigations, and the risks your team isn't talking about.",
    longDesc: "Surface hidden risks before they surface themselves. The engine covers Technical, Business, People, Regulatory, and External risk categories.",
    examples: [
      "We are six months into a core banking system replacement and go-live is in Q1",
      "New product launch — we are building a lending product for an emerging market",
      "Digital transformation programme — moving 200 staff to a new ERP system",
      "Outsourcing our IT support function to a third-party provider next quarter",
    ],
    inputPlaceholderInitial: "Describe your project, programme, or situation. Include what phase you are in, who is involved, and any concerns you already have.",
    inputPlaceholderFollowup: "Answer the questions above to get a risk register that actually reflects your situation.",
    isOutput: (t) => t.includes("# Risk Radar") || t.includes("## Risk Register"),
  },
  {
    id: "assumptions-challenger",
    label: "Assumptions Challenger",
    tag: "Instant Analysis",
    color: "#fb923c",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    desc: "Paste any document, plan, or problem statement. The engine identifies every assumption — stated and hidden — and challenges each one.",
    longDesc: "No clarifying questions. Paste and go. Most teams don't realise how many assumptions they're building on until something breaks.",
    examples: [
      "Paste your project brief or scope document",
      "Paste your requirements document or BRD",
      "Paste a business case or proposal",
      "Paste meeting notes or a stakeholder summary",
    ],
    inputPlaceholderInitial: "Paste your document, plan, business case, or any text you want analysed for assumptions. The longer and more detailed, the more assumptions the engine will find.",
    inputPlaceholderFollowup: "",
    isOutput: (t) => t.includes("# Assumptions Audit") || t.includes("## Assumptions Identified"),
    skipClarify: true,
  },
  {
    id: "stakeholder-intelligence",
    label: "Stakeholder Intelligence",
    tag: "People & Politics",
    color: "#facc15",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    desc: "Describe your stakeholders and the change you are managing. Get an influence map, objection predictions, communication plan, and alignment strategy.",
    longDesc: "The most underestimated skill in BA work. Know your stakeholders before you walk into the room.",
    examples: [
      "We have a new CRM rollout — the sales director is supportive but the ops team is resistant",
      "Process redesign affecting three departments with different reporting lines",
      "Board-driven digital transformation — IT is onboard but business units are not",
      "New regulatory compliance requirement — legal is pushing, operations is pushing back",
    ],
    inputPlaceholderInitial: "Describe your project or change and list the key stakeholders involved. Include their roles, what you know about their stance, and any political dynamics you are aware of.",
    inputPlaceholderFollowup: "Answer the questions above so I can map the dynamics accurately.",
    isOutput: (t) => t.includes("# Stakeholder Intelligence") || t.includes("## Stakeholder Map"),
  },
];

// ── Export helper ─────────────────────────────────────────────────────────────
async function downloadDIOutput(content: string, title: string, format: "txt" | "docx") {
  try {
    const res = await fetch("/api/workspace/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, title, format }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch { /* fail silently */ }
}

// ── File upload (DI) ──────────────────────────────────────────────────────────
function DIFileUpload({ onParsed, color }: { onParsed: (text: string, name: string) => void; color: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg]  = useState("");

  async function handleFile(file: File) {
    setStatus("loading");
    const form = new FormData();
    form.append("file", file);
    try {
      const res  = await fetch("/api/tools/parse-document", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Could not read file.");
      onParsed(data.text, data.fileName);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Could not read file.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <label title={status === "loading" ? "Parsing…" : "Attach a document (PDF, Word, TXT)"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, background: status === "done" ? `${color}18` : "none", border: `1px solid ${status === "done" ? color + "35" : "var(--border)"}`, cursor: status === "loading" ? "wait" : "pointer", transition: "all .2s", color: status === "done" ? color : "var(--t4)" }}
        onMouseEnter={e => { if (status === "idle") { (e.currentTarget as HTMLLabelElement).style.borderColor = `${color}35`; (e.currentTarget as HTMLLabelElement).style.color = color; } }}
        onMouseLeave={e => { if (status === "idle") { (e.currentTarget as HTMLLabelElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLLabelElement).style.color = "var(--t4)"; } }}
      >
        <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} disabled={status === "loading"}
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
        />
        {status === "loading" ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg>
        ) : status === "done" ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        )}
      </label>
      {status === "error" && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "rgba(26,8,8,.97)", border: "1px solid rgba(248,113,113,.3)", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "#f87171", zIndex: 10, maxWidth: 260, lineHeight: 1.5 }}>
          {errMsg}
        </div>
      )}
    </div>
  );
}

// ── Session ────────────────────────────────────────────────────────────────────
function DISession({ tool, onBack }: { tool: ToolConfig; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [phase, setPhase]       = useState<"initial" | "followup" | "done">("initial");
  const endRef      = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/decision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, tool: tool.id }),
      });
      const data = await res.json();
      const reply = data.response ?? "Something went wrong. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (phase === "initial") setPhase(tool.skipClarify ? "done" : "followup");
      else if (tool.isOutput(reply)) setPhase("done");
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--t2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--t3)"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Decision Intelligence
        </button>
        <div style={{ width: 1, height: 16, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: tool.color, animation: "pulse-dot 1.8s ease-in-out infinite" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>{tool.label}</span>
        </div>
        {phase === "done" && (
          <button onClick={() => { setMessages([]); setPhase("initial"); setInput(""); }} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--t3)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--t1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--t3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Start over
          </button>
        )}
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

        {messages.length === 0 && (
          <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${tool.color}14`, border: `1px solid ${tool.color}28`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              {tool.icon}
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 10 }}>{tool.label}</h2>
            <p style={{ fontSize: 14.5, color: "var(--t3)", lineHeight: 1.7, marginBottom: 36 }}>{tool.longDesc}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left" }}>
              {tool.examples.map((ex, i) => (
                <button key={i} onClick={() => setInput(ex)} style={{ padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--t2)", textAlign: "left", lineHeight: 1.5, cursor: "pointer", transition: "border-color .15s, color .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${tool.color}35`; e.currentTarget.style.color = "var(--t1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t2)"; }}
                >{ex}</button>
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
              <div style={{ maxWidth: "72%", padding: "12px 16px", background: `${tool.color}14`, border: `1px solid ${tool.color}28`, borderRadius: "14px 14px 3px 14px", fontSize: 14, color: "var(--t1)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {msg.content}
              </div>
            </div>
          );

          if (isOutput) return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${tool.color}14`, border: `1px solid ${tool.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{tool.icon}</div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>Analysis complete</span>
                {isLast && <div style={{ width: 6, height: 6, borderRadius: "50%", background: tool.color }} />}
              </div>
              <div style={{ background: "var(--bg-1)", border: `1px solid ${tool.color}18`, borderRadius: "var(--radius-lg)", padding: "28px 32px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)` }} />
                {renderMarkdown(msg.content)}
              </div>
            </div>
          );

          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${tool.color}14`, border: `1px solid ${tool.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{tool.icon}</div>
              <div style={{ maxWidth: "78%", padding: "12px 16px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "3px 14px 14px 14px", fontSize: 14, color: "var(--t1)", lineHeight: 1.68 }}>
                {renderMarkdown(msg.content)}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${tool.color}14`, border: `1px solid ${tool.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{tool.icon}</div>
            <div style={{ padding: "12px 16px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "3px 14px 14px 14px", display: "flex", gap: 5 }}>
              {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--t3)", animation: `typing-dot 1.2s ${j * 0.2}s infinite ease-in-out` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      {phase !== "done" && (
        <div style={{ padding: "16px 32px 24px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", transition: "border-color .2s" }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = `${tool.color}45`)}
            onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={phase === "initial" ? tool.inputPlaceholderInitial : tool.inputPlaceholderFollowup}
              rows={tool.id === "assumptions-challenger" && phase === "initial" ? 6 : 3}
              style={{ width: "100%", background: "none", border: "none", outline: "none", padding: "16px 18px", fontSize: 14, color: "var(--t1)", lineHeight: 1.65, resize: "none", fontFamily: "var(--font-body)" }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DIFileUpload color={tool.color} onParsed={(text, name) => setInput(prev => prev ? `${prev}\n\n[From: ${name}]\n${text}` : `[From: ${name}]\n${text}`)} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t4)" }}>Attach doc or Enter to send</span>
              </div>
              <button onClick={send} disabled={!input.trim() || loading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: input.trim() && !loading ? tool.color : `${tool.color}20`, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, color: input.trim() && !loading ? "#041a13" : "var(--t4)", transition: "all .2s" }}>
                {loading ? "Thinking..." : "Send"}
                {!loading && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div style={{ padding: "16px 32px 24px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>Analysis complete.</span>
            <button onClick={() => { setMessages([]); setPhase("initial"); setInput(""); }}
              style={{ padding: "9px 18px", borderRadius: 8, background: tool.color, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#041a13" }}>
              Start over
            </button>
            {(["docx", "txt"] as const).map(fmt => (
              <button key={fmt} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", transition: "color .15s, border-color .15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--t1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--t2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                onClick={() => { const t = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n---\n\n"); downloadDIOutput(t, tool.label, fmt); }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                .{fmt}
              </button>
            ))}
            <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 8, background: "none", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--t3)" }}
              onClick={() => { const t = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n---\n\n"); navigator.clipboard?.writeText(t); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hub ────────────────────────────────────────────────────────────────────────
function DIHub({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div style={{ padding: "32px 36px" }}>
      <header style={{ marginBottom: 36 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 99, background: "rgba(124,110,245,.08)", border: "1px solid rgba(124,110,245,.2)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--violet)", letterSpacing: ".08em", marginBottom: 14 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--violet)", animation: "pulse-dot 1.8s ease-in-out infinite" }} />
          DECISION INTELLIGENCE
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Not just analysis. Judgment.
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--t3)", lineHeight: 1.65, maxWidth: 560 }}>
          Most BA tools generate requirements. This module goes further — it helps you reason through decisions, surface hidden risks, challenge assumptions, and navigate stakeholder dynamics.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        {TOOLS.map(tool => (
          <div key={tool.id}
            onClick={() => onSelect(tool.id)}
            style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px 26px", cursor: "pointer", transition: "border-color .2s, background .2s, transform .15s", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${tool.color}35`; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
          >
            <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(ellipse, ${tool.color}07 0%, transparent 65%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: `${tool.color}12`, border: `1px solid ${tool.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tool.icon}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: `${tool.color}10`, color: tool.color, border: `1px solid ${tool.color}20` }}>
                {tool.tag}
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 10, letterSpacing: "-0.01em" }}>{tool.label}</div>
            <p style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65, marginBottom: 18 }}>{tool.desc}</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: tool.color }}>
              Launch
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        ))}
      </div>

      {/* What makes this different */}
      <div style={{ background: "rgba(124,110,245,.03)", border: "1px solid rgba(124,110,245,.12)", borderRadius: "var(--radius)", padding: "24px 28px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--violet)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>Why this is different</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { title: "Takes a position", body: "The Solution Evaluator recommends one option and tells you why. No hedging, no 'it depends'." },
            { title: "Surfaces what's hidden", body: "The Assumptions Challenger finds what your team is treating as fact that is actually a guess." },
            { title: "Thinks about people", body: "The Stakeholder Intelligence tool models how individuals will react — before they do." },
          ].map(item => (
            <div key={item.title}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--t1)", marginBottom: 5 }}>{item.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--t3)", lineHeight: 1.6 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function DecisionIntelligenceClient({ profile, user }: Props) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const tool = TOOLS.find(t => t.id === activeTool) ?? null;

  useEffect(() => {
    const id = "di-globals";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      :root {
        --bg: #07070a; --bg-1: #0d0d12; --bg-2: #111117; --bg-3: #16161e;
        --teal: #1fbf9f; --violet: #7c6ef5;
        --t1: #f2f2f8; --t2: #9090a8; --t3: #505068; --t4: #2a2a38;
        --border: rgba(255,255,255,0.07);
        --surface: #0d0d12; --text-1: #f2f2f8; --text-2: #9090a8; --text-3: #505068;
        --teal-soft: rgba(31,191,159,0.08); --teal-border: rgba(31,191,159,0.18);
        --font-display: 'Inter', sans-serif; --font-body: 'Open Sans', sans-serif;
        --font-mono: 'JetBrains Mono', monospace;
        --radius-sm: 10px; --radius: 16px; --radius-lg: 22px;
      }
      @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:.6;} }
      @keyframes typing-dot { 0%,80%,100%{transform:scale(.6);opacity:.3;} 40%{transform:scale(1);opacity:1;} }
      @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      textarea::placeholder { color: var(--t4); }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/decision-intelligence" profile={profile} user={user} />
      <main style={{ flex: 1, overflowY: tool ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
        {tool ? (
          <DISession tool={tool} onBack={() => setActiveTool(null)} />
        ) : (
          <DIHub onSelect={setActiveTool} />
        )}
      </main>
    </div>
  );
}
