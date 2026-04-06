"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "ai";
  text: string;
  initials?: string;
  color?: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CHAT_MESSAGES: ChatMessage[] = [
  { role: "user", text: "What's driving the decision to migrate now rather than Q1 next year?" },
  { role: "ai", initials: "PS", color: "#a78bfa", text: "Q3 ARR targets. Every month of delay costs us enterprise renewal conversations with TechCorp and NovaBridge." },
  { role: "user", text: "Dan mentioned a 6-month parallel run requirement. Is that reflected in your timeline?" },
  { role: "ai", initials: "PS", color: "#a78bfa", text: "That's... not what I agreed to. A 6-month parallel run would blow our Q3 window entirely. Where did Dan get that figure?" },
  { role: "user", text: "Directly from him — he said ETL complexity requires it. Who owns the final call on timeline?" },
  { role: "ai", initials: "DK", color: "#38bdf8", text: "I do. And I'm telling you right now — 18 months is not realistic. The legacy Oracle DB alone is 14TB with 40% undocumented code." },
];

const TICKER_ITEMS = [
  "Stakeholder Interviews", "Requirements Documents", "UAT Assessments",
  "Incident Reports", "Problem Statements", "Process Flows",
  "Banking", "Healthcare", "Energy", "Technology", "Insurance",
  "Discovery", "Elicitation", "Validation", "Solution Analysis",
  "Alex Rivera Feedback", "Hard Mode", "Expert Mode", "BABOK Aligned",
];

const STAKEHOLDER_TABS = [
  { initials: "PS", name: "Priya Shah",   color: "#a78bfa" },
  { initials: "DK", name: "Dan Kowalski", color: "#38bdf8" },
  { initials: "FA", name: "Fatima A.",    color: "#1fbf9f" },
  { initials: "MC", name: "Marcus Chen",  color: "#fb923c" },
];

const CHALLENGES = [
  { title: "Rising Customer Churn at First National Bank",           industry: "Banking / Finance",   type: "Discovery",         difficulty: "Beginner",     typeColor: "#38bdf8", diffColor: "#22c55e" },
  { title: "Patient Referral System Overhaul",                       industry: "Healthcare",           type: "Requirements",      difficulty: "Intermediate", typeColor: "#a78bfa", diffColor: "#eab308" },
  { title: "Field Inspection Digitization at Cascade Energy",        industry: "Energy / Oil & Gas",   type: "Solution Analysis", difficulty: "Intermediate", typeColor: "#fb923c", diffColor: "#eab308" },
  { title: "CRM Launch UAT at Velocity Software",                    industry: "Technology / SaaS",    type: "UAT",               difficulty: "Advanced",     typeColor: "#1fbf9f", diffColor: "#ef4444" },
  { title: "Claims Processing Failure at Meridian Insurance",        industry: "Insurance",            type: "Production Incident",difficulty: "Advanced",    typeColor: "#f87171", diffColor: "#ef4444" },
  { title: "CloudSync Pro: Requirements Elicitation & Validation",   industry: "Technology / SaaS",    type: "Elicitation",       difficulty: "Intermediate", typeColor: "#facc15", diffColor: "#eab308" },
];

const INDUSTRIES = [
  "Banking", "Healthcare", "Energy", "Technology",
  "Insurance", "Government", "Retail", "Logistics",
];

// ── Subcomponents ─────────────────────────────────────────────────────────────

function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function ChevronRight({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function CheckIcon({ color = "#505068" }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 3 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#facc15">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      background: "rgba(31,191,159,0.12)",
      border: "1px solid rgba(31,191,159,0.25)",
      borderRadius: 8,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--teal)",
    }}>BA</div>
  );
}

// ── Chat Window ───────────────────────────────────────────────────────────────
function ChatWindow() {
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMsg, setTypingMsg] = useState<ChatMessage | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const msgIndexRef = useRef(0);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  }, [visibleMessages, isTyping]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function runChat() {
      const idx = msgIndexRef.current;
      if (idx >= CHAT_MESSAGES.length) {
        timeout = setTimeout(() => {
          setVisibleMessages([]);
          setQuestionCount(0);
          msgIndexRef.current = 0;
          timeout = setTimeout(runChat, 600);
        }, 4000);
        return;
      }
      const msg = CHAT_MESSAGES[idx];
      if (msg.role === "user") {
        setVisibleMessages(prev => [...prev, msg]);
        setQuestionCount(q => q + 1);
        msgIndexRef.current++;
        timeout = setTimeout(runChat, 1400);
      } else {
        setIsTyping(true);
        setTypingMsg(msg);
        timeout = setTimeout(() => {
          setIsTyping(false);
          setTypingMsg(null);
          setVisibleMessages(prev => [...prev, msg]);
          msgIndexRef.current++;
          timeout = setTimeout(runChat, 1600);
        }, 1000);
      }
    }

    timeout = setTimeout(runChat, 1200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      boxShadow: "0 0 0 1px rgba(255,255,255,.04), 0 32px 80px rgba(0,0,0,.56)",
    }}>
      {/* Chrome */}
      <div style={{ background: "var(--bg-2)", padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#f87171","#fb923c","#1fbf9f"].map((c,i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.65 }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--t3)", letterSpacing: "0.04em" }}>
          CloudSync Pro — Requirements Elicitation
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--teal)" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--teal)", animation: "pulse-dot 1.8s ease-in-out infinite" }} />
          Live
        </div>
      </div>

      {/* Stakeholder tabs */}
      <div style={{ padding: "10px 14px", display: "flex", gap: 6, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
        {STAKEHOLDER_TABS.map((s, i) => (
          <div key={s.initials} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8,
            background: i === 0 ? `${s.color}12` : "transparent",
            border: i === 0 ? `1px solid ${s.color}25` : "1px solid transparent",
            fontSize: 11.5, fontWeight: 600,
            color: i === 0 ? s.color : "var(--t3)",
            cursor: "pointer",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: s.color }}>
              {s.initials}
            </div>
            {s.name}
          </div>
        ))}
      </div>

      {/* Messages */}
      <div style={{ padding: 16, minHeight: 270, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 310 }}>
        {visibleMessages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 7, animation: "slide-msg .28s ease both" }}>
            {msg.role === "ai" && (
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${msg.color}18`, border: `1px solid ${msg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: msg.color, flexShrink: 0, marginTop: 2 }}>
                {msg.initials}
              </div>
            )}
            <div style={{
              maxWidth: "76%", padding: "9px 13px", fontSize: 12.5, lineHeight: 1.56, color: "var(--t1)",
              background: msg.role === "user" ? "rgba(31,191,159,.1)" : "var(--bg-3)",
              border: msg.role === "user" ? "1px solid rgba(31,191,159,.18)" : "1px solid var(--border)",
              borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && typingMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${typingMsg.color}18`, border: `1px solid ${typingMsg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: typingMsg.color, flexShrink: 0 }}>
              {typingMsg.initials}
            </div>
            <div style={{ padding: "9px 14px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "3px 12px 12px 12px", display: "flex", gap: 4 }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--t3)", animation: `typing-dot 1.2s ${j * 0.2}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{ padding: "9px 16px", background: "var(--bg)", borderTop: "1px solid rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 16 }}>
          {[{ label: "Questions", val: String(questionCount) }, { label: "Stakeholders", val: "2/4" }].map(s => (
            <div key={s.label} style={{ display: "flex", gap: 5, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 10 }}>
              <span style={{ color: "var(--t3)" }}>{s.label}</span>
              <span style={{ color: "var(--teal)", fontWeight: 600 }}>{s.val}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "3px 9px", borderRadius: 5, background: "rgba(31,191,159,.08)", border: "1px solid rgba(31,191,159,.15)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--teal)" }}>
          Phase A Active
        </div>
      </div>
    </div>
  );
}

// ── Ticker ────────────────────────────────────────────────────────────────────
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop
  return (
    <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-1)", overflow: "hidden" }}>
      <div style={{ display: "flex", whiteSpace: "nowrap", animation: "ticker 32s linear infinite" }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 36px", fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 500, color: "var(--t3)", flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
            {item}
            <span style={{ color: "var(--t4)", margin: "0 4px" }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Use Reveal Hook ───────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, style: { opacity: visible ? 1 : 0, transition: "opacity .7s ease" } };
}

// ── Section Eyebrow ───────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--teal)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 18 }}>
      <div style={{ width: 18, height: 1, background: "var(--teal)", opacity: 0.6 }} />
      {children}
    </div>
  );
}

// ── Challenge Card ────────────────────────────────────────────────────────────
function ChallengeCard({ title, industry, type, difficulty, typeColor, diffColor, accentColor }: {
  title: string; industry: string; type: string; difficulty: string;
  typeColor: string; diffColor: string; accentColor: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--bg-2)" : "var(--bg-1)",
        border: hovered ? "1px solid rgba(255,255,255,.12)" : "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 26,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color .2s, background .2s, transform .2s, box-shadow .2s",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "0 16px 48px rgba(0,0,0,.4)" : "none",
      }}
    >
      {/* Top accent line on hover */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accentColor, transform: hovered ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left", transition: "transform .35s ease" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 600, padding: "3px 9px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: `${typeColor}10`, color: typeColor, border: `1px solid ${typeColor}22` }}>{type}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 600, padding: "3px 9px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: `${diffColor}10`, color: diffColor, border: `1px solid ${diffColor}22` }}>{difficulty}</span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.02em", lineHeight: 1.32, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>{industry}</span>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: hovered ? "var(--teal-dim)" : "var(--bg-3)", border: hovered ? "1px solid var(--border-hi)" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
          <ChevronRight />
        </div>
      </div>
    </div>
  );
}

// ── Industry Icon ─────────────────────────────────────────────────────────────
function IndustryIcon({ name }: { name: string }) {
  const s = { width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "Banking":
      return <svg {...s} viewBox="0 0 24 24"><path d="M3 9l9-6 9 6v12a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/><path d="M9 22V12h6v10"/></svg>;
    case "Healthcare":
      return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>;
    case "Energy":
      return <svg {...s} viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case "Technology":
      return <svg {...s} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
    case "Insurance":
      return <svg {...s} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "Government":
      return <svg {...s} viewBox="0 0 24 24"><path d="M3 22h18M12 3L2 9h20L12 3z"/><path d="M5 9v10M9 9v10M15 9v10M19 9v10"/></svg>;
    case "Retail":
      return <svg {...s} viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
    case "Logistics":
      return <svg {...s} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    default:
      return null;
  }
}

// ── Pricing Card ──────────────────────────────────────────────────────────────
function PricingCard({ plan, price, period, features, cta, href, featured }: {
  plan: string; price: string; period: string; features: string[];
  cta: string; href: string; featured: boolean;
}) {
  return (
    <div style={{
      background: featured ? "rgba(31,191,159,.04)" : "var(--bg-1)",
      border: featured ? "1px solid rgba(31,191,159,.22)" : "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "40px 36px",
      position: "relative",
      overflow: "hidden",
      flex: 1,
    }}>
      {featured && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--teal), transparent)" }} />}
      {featured && (
        <div style={{ position: "absolute", top: 16, right: 16, fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, color: "var(--teal)", background: "rgba(31,191,159,.1)", border: "1px solid rgba(31,191,159,.22)", padding: "3px 10px", borderRadius: 5, letterSpacing: ".06em", textTransform: "uppercase" as const }}>
          Most Popular
        </div>
      )}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase" as const, letterSpacing: ".1em", marginBottom: 12 }}>{plan}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 28 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.04em" }}>{price}</span>
        <span style={{ fontSize: 13, color: "var(--t3)" }}>{period}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 30 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
            <CheckIcon color={featured ? "var(--teal)" : "var(--t3)"} />
            <span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>
      <Link href={href} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "13px 22px", borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
        background: featured ? "var(--teal)" : "rgba(255,255,255,.05)",
        color: featured ? "#041a13" : "var(--t1)",
        border: featured ? "none" : "1px solid var(--border)",
        transition: "all .2s",
        textDecoration: "none",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = featured ? "var(--teal-hi)" : "rgba(255,255,255,.09)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = featured ? "var(--teal)" : "rgba(255,255,255,.05)"; }}
      >
        {cta} {featured && <ArrowRight size={14} />}
      </Link>
    </div>
  );
}

// ── Platform Dropdown ─────────────────────────────────────────────────────────
const PLATFORM_GROUPS = [
  {
    group: "Practice", color: "#38bdf8",
    items: [
      { label: "Simulation Lab", desc: "Practice real BA scenarios with simulated stakeholders", href: "/scenarios",   color: "#38bdf8", icon: "🎯" },
      { label: "PitchReady",     desc: "Practice how you structure and deliver answers",          href: "/pitchready",  color: "#a78bfa", icon: "🎤" },
    ],
  },
  {
    group: "Learn", color: "#fb923c",
    items: [
      { label: "Learning",  desc: "Structured BA concepts and SDLC understanding", href: "/learning", color: "#fb923c", icon: "📚" },
      { label: "Exam Prep", desc: "Prepare for CBAP, CCBA, PMI-PBA",               href: "/exam",     color: "#facc15", icon: "📝" },
    ],
  },
  {
    group: "Advance", color: "#1fbf9f",
    items: [
      { label: "Career Suite", desc: "Build your resume, positioning, and career plan", href: "/career",        color: "#1fbf9f", icon: "💼" },
      { label: "Jobs",         desc: "Find BA roles and learn how to win them",         href: "/opportunities",  color: "#34d399", icon: "🌐" },
    ],
  },
];

// Flat list for mobile nav
const PLATFORM_ITEMS = PLATFORM_GROUPS.flatMap(g => g.items);

function PlatformDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 14, fontWeight: 500,
          color: open ? "var(--t1)" : "var(--t2)",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          transition: "color .15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = "var(--t2)"; }}
      >
        Platform
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: "transform .22s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", marginTop: 1 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 16px)", left: "50%", transform: "translateX(-50%)",
          background: "#0B0F14",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: "10px",
          width: 360,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          zIndex: 300,
          animation: "slide-down-fade .18s ease both",
        }}>
          {/* caret */}
          <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)", width: 10, height: 5, overflow: "hidden" }}>
            <div style={{ width: 8, height: 8, background: "rgba(255,255,255,0.09)", transform: "rotate(45deg) translateY(3px)", margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.09)", borderLeft: "1px solid rgba(255,255,255,0.09)" }} />
          </div>

          {PLATFORM_GROUPS.map((group, gi) => (
            <div key={group.group} style={{ marginBottom: gi < PLATFORM_GROUPS.length - 1 ? 4 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: group.color, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "8px 12px 6px", opacity: 0.8 }}>
                {group.group}
              </div>
              {group.items.map(item => (
                <Link key={item.label} href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "10px 12px", borderRadius: 12,
                    textDecoration: "none", marginBottom: 2,
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${item.color}09`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${item.color}12`, border: `1px solid ${item.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", marginBottom: 2, letterSpacing: "-0.01em" }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 500, color: "#D1D5DB", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </Link>
              ))}
              {gi < PLATFORM_GROUPS.length - 1 && (
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0 2px" }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nav helpers ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#1fbf9f","#a78bfa","#38bdf8","#fb923c","#f87171","#facc15","#34d399"];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── GuestCTAs ─────────────────────────────────────────────────────────────────
function GuestCTAs() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Link
        href="/login"
        style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)", padding: "8px 16px", borderRadius: "var(--radius-sm)", textDecoration: "none", transition: "color .15s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "9px 20px", borderRadius: "var(--radius-sm)", textDecoration: "none", transition: "background .15s, transform .15s", letterSpacing: "0.01em", whiteSpace: "nowrap" }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; }}
      >
        Start Your First Simulation
      </Link>
    </div>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────────────────
function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const first  = name.split(" ")[0] || "there";
  const color  = avatarColor(name);
  const abbr   = initials(name) || "BA";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const menuItemStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", width: "100%",
    padding: "9px 12px", borderRadius: 9,
    fontSize: 13, fontWeight: 600,
    textDecoration: "none", transition: "background .12s",
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
      {/* "Hi, First" — desktop only */}
      <span style={{ fontSize: 13, color: "var(--t2)", fontWeight: 500, animation: "fade-in-avatar .25s ease both" }}>
        Hi, {first}
      </span>

      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 34, height: 34, borderRadius: "50%",
          background: `${color}20`,
          border: `1.5px solid ${color}45`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color,
          cursor: "pointer",
          outline: "2px solid transparent", outlineOffset: "2px",
          transition: "outline-color .15s, outline-offset .15s",
          animation: "fade-in-avatar .2s ease both",
        }}
        onMouseEnter={e => { e.currentTarget.style.outlineColor = "var(--teal)"; }}
        onMouseLeave={e => { e.currentTarget.style.outlineColor = "transparent"; }}
        aria-label="Account menu"
      >
        {abbr}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 12px)", right: 0,
          background: "rgba(10,10,15,0.98)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14, padding: "5px",
          width: 176,
          boxShadow: "0 24px 64px rgba(0,0,0,.72), 0 0 0 1px rgba(255,255,255,.03)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          zIndex: 300,
          animation: "slide-down-fade .15s ease both",
        }}>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            style={{ ...menuItemStyle, color: "var(--t1)" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            style={{ ...menuItemStyle, color: "var(--t1)" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
          >
            Settings
          </Link>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 6px" }} />
          <button
            onClick={handleSignOut}
            style={{ ...menuItemStyle, color: "#f87171", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.08)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled]         = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authState, setAuthState]     = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [navUserName, setNavUserName] = useState("");

  // Reveal refs
  const statsReveal = useReveal();
  const hiwReveal = useReveal();
  const challengesHeadReveal = useReveal();
  const featuresReveal = useReveal();
  const alexReveal = useReveal();
  const industriesHeadReveal = useReveal();
  const industriesGridReveal = useReveal();
  const habitReveal = useReveal();
  const pricingHeadReveal = useReveal();
  const pricingReveal = useReveal();
  const finalReveal = useReveal();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();

      // onAuthStateChange fires INITIAL_SESSION on subscription — this is the
      // authoritative first-paint signal. We do NOT call getSession() separately
      // because it reads stale cookies and can briefly show the wrong state
      // before the token validation completes (especially with expired tokens).
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setAuthState("authenticated");
          setNavUserName(
            session.user.user_metadata?.full_name ?? session.user.email ?? ""
          );
        } else {
          setAuthState("unauthenticated");
          setNavUserName("");
        }
      });
      subscription = data.subscription;
    });

    return () => { subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Inline CSS vars + keyframes injected once
  useEffect(() => {
    const id = "baportal-globals";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      :root {
        --bg: #07070a; --bg-1: #0d0d12; --bg-2: #111117; --bg-3: #16161e;
        --teal: #1fbf9f; --teal-hi: #2ddbb8;
        --teal-dim: rgba(31,191,159,0.12); --teal-glow: rgba(31,191,159,0.22);
        --violet: #7c6ef5;
        --t1: #f2f2f8; --t2: #9090a8; --t3: #505068; --t4: #2a2a38;
        --border: rgba(255,255,255,0.07); --border-hi: rgba(31,191,159,0.3);
        --font-display: 'Inter', sans-serif;
        --font-body: 'Open Sans', sans-serif;
        --font-mono: 'JetBrains Mono', monospace;
        --radius-sm: 10px; --radius: 16px; --radius-lg: 24px; --radius-xl: 32px;
      }
      @keyframes pulse-dot {
        0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(31,191,159,.22);}
        50%{opacity:.7;box-shadow:0 0 0 6px transparent;}
      }
      @keyframes ticker {
        0%{transform:translateX(0);}
        100%{transform:translateX(-50%);}
      }
      @keyframes typing-dot {
        0%,80%,100%{transform:scale(.6);opacity:.3;}
        40%{transform:scale(1);opacity:1;}
      }
      @keyframes slide-msg {
        from{opacity:0;transform:translateY(8px);}
        to{opacity:1;transform:translateY(0);}
      }
      @keyframes fade-up {
        from{opacity:0;transform:translateY(28px);}
        to{opacity:1;transform:translateY(0);}
      }
      .a1{animation:fade-up .7s ease forwards;}
      .a2{animation:fade-up .7s .12s ease both;}
      .a3{animation:fade-up .7s .24s ease both;}
      .a4{animation:fade-up .7s .36s ease both;}
      .a5{animation:fade-up .7s .50s ease both;}
      @keyframes slide-down-fade{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
      @keyframes fade-in-avatar{from{opacity:0;}to{opacity:1;}}
      @keyframes slide-in-left{from{transform:translateX(-100%);}to{transform:translateX(0);}}
      .mob-only{display:none !important;}
      @media(max-width:768px){
        .mob-only{display:flex !important;}
        .dsk-nav{display:none !important;}
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{ background: "var(--bg)", color: "var(--t1)", fontFamily: "var(--font-body)", overflowX: "hidden", minHeight: "100vh", WebkitFontSmoothing: "antialiased" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", inset: "0 0 auto", zIndex: 200,
        height: 62, display: "flex", alignItems: "center", padding: "0 28px",
        background: scrolled ? "rgba(7,7,10,0.95)" : "rgba(7,7,10,0.75)",
        backdropFilter: "blur(24px) saturate(1.5)",
        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
        borderBottom: "1px solid var(--border)",
        transition: "background .3s",
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.01em" }}>
            <LogoMark />
            The<span style={{ color: "var(--teal)" }}>BA</span>Portal
          </Link>
          {/* Desktop nav links */}
          <div className="dsk-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <PlatformDropdown />
            {[["How it Works", "#how-it-works"], ["Pricing", "#pricing"]].map(([l, href]) => (
              <Link key={l} href={href} style={{ fontSize: 14, fontWeight: 500, color: "var(--t2)", textDecoration: "none", transition: "color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
              >{l}</Link>
            ))}
          </div>

          {/* Desktop auth — fixed width so center nav never shifts */}
          <div className="dsk-nav" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 260 }}>
            {authState === "loading"          ? <div style={{ width: 260, height: 34 }} /> : null}
            {authState === "authenticated"    ? <UserMenu name={navUserName} /> : null}
            {authState === "unauthenticated"  ? <GuestCTAs /> : null}
          </div>

          {/* Mobile hamburger */}
          <button className="mob-only" onClick={() => setMobileNavOpen(true)}
            style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 5, width: 38, height: 38, background: "none", border: "1px solid var(--border)", borderRadius: 9, cursor: "pointer" }}>
            {[0,1,2].map(i => <span key={i} style={{ width: 16, height: 1.5, background: "var(--t2)", borderRadius: 2, display: "block" }} />)}
          </button>
        </div>
      </nav>

      {/* ── MOBILE NAV OVERLAY ──────────────────────────────────────────── */}
      {mobileNavOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex" }}>
          <div onClick={() => setMobileNavOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
          <div style={{ position: "relative", width: "85%", maxWidth: 320, height: "100%", background: "var(--bg-1)", borderRight: "1px solid var(--border)", padding: "22px 18px", display: "flex", flexDirection: "column", overflowY: "auto", animation: "slide-in-left .22s ease both" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <Link href="/" onClick={() => setMobileNavOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--t1)" }}>
                <LogoMark size={24} />
                The<span style={{ color: "var(--teal)" }}>BA</span>Portal
              </Link>
              <button onClick={() => setMobileNavOpen(false)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Platform items */}
            <div style={{ marginBottom: 6 }}>
              {PLATFORM_GROUPS.map((group, gi) => (
                <div key={group.group} style={{ marginBottom: gi < PLATFORM_GROUPS.length - 1 ? 10 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: group.color, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, paddingLeft: 4, opacity: 0.8 }}>{group.group}</div>
                  {group.items.map(item => (
                    <Link key={item.label} href={item.href} onClick={() => setMobileNavOpen(false)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 10, textDecoration: "none", marginBottom: 2, transition: "background .15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${item.color}12`, border: `1px solid ${item.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{item.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{item.label}</div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} />

            {/* Secondary links */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
              {[["How it Works", "#how-it-works"], ["Pricing", "#pricing"], ["Contact", "/contact"]].map(([label, href]) => (
                <Link key={label} href={href} onClick={() => setMobileNavOpen(false)}
                  style={{ padding: "11px 10px", fontSize: 14, fontWeight: 500, color: "var(--t2)", textDecoration: "none", borderRadius: 10, transition: "color .15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--t1)"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--t2)"}
                >{label}</Link>
              ))}
            </div>

            {/* Mobile auth CTAs */}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {authState === "authenticated" ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileNavOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#041a13", background: "var(--teal)", textDecoration: "none" }}>
                    Dashboard <ArrowRight size={14} />
                  </Link>
                  <button onClick={async () => { setMobileNavOpen(false); const { createClient } = await import("@/lib/supabase/client"); await createClient().auth.signOut(); window.location.href = "/"; }} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#f87171", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", cursor: "pointer" }}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileNavOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "var(--t1)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", textDecoration: "none" }}>Sign in</Link>
                  <Link href="/signup" onClick={() => setMobileNavOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#041a13", background: "var(--teal)", textDecoration: "none" }}>
                    Start Your First Simulation <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", paddingTop: 62, display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
        {/* BG */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(31,191,159,.028) 1px, transparent 1px), linear-gradient(90deg, rgba(31,191,159,.028) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse 70% 60% at 55% 40%, black 0%, transparent 100%)" }} />
          <div style={{ position: "absolute", top: "-18%", left: "42%", width: 680, height: 680, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,191,159,.09) 0%, transparent 60%)", filter: "blur(48px)" }} />
          <div style={{ position: "absolute", bottom: "-24%", right: "8%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,110,245,.07) 0%, transparent 60%)", filter: "blur(56px)" }} />
          <div style={{ position: "absolute", top: "30%", left: "-8%", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(56,189,248,.04) 0%, transparent 60%)", filter: "blur(60px)" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, width: "100%", padding: "80px 0 100px" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

            {/* Left */}
            <div>
              <h1 className="a1" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(46px, 5.6vw, 74px)", fontWeight: 900, lineHeight: 0.97, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 24 }}>
                Real BA Work.<br />
                Simulated<br />
                <span style={{ background: "linear-gradient(110deg, var(--teal) 0%, #2ddbb8 38%, #60d4f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Pressure.</span>
              </h1>

              <p className="a3" style={{ fontSize: 17, color: "var(--t2)", lineHeight: 1.72, maxWidth: 430, marginBottom: 38 }}>
                Practice real stakeholder scenarios. Get scored on how you think and communicate.{" "}<strong style={{ color: "var(--t1)", fontWeight: 600 }}>Get ready for real BA roles.</strong>
              </p>

              <div className="a4" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48, flexWrap: "wrap" }}>
                <Link href={authState === "authenticated" ? "/scenarios" : "/signup"} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "15px 30px", borderRadius: "var(--radius)", transition: "all .2s", letterSpacing: "0.01em", boxShadow: "0 0 32px rgba(31,191,159,.24), 0 2px 12px rgba(0,0,0,.4)", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 40px rgba(31,191,159,.36)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 32px rgba(31,191,159,.24), 0 2px 12px rgba(0,0,0,.4)"; }}
                >
                  Start Simulation <ArrowRight size={16} />
                </Link>
                <Link href="/scenarios" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--t2)", padding: "15px 22px", borderRadius: "var(--radius)", background: "rgba(255,255,255,.04)", border: "1px solid var(--border)", transition: "all .2s", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--t1)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,.14)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--t2)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}
                >
                  Browse Simulations <ChevronRight />
                </Link>
              </div>

              <div className="a5" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex" }}>
                  {[["#a78bfa","rgba(167,139,250,.12)"],["#38bdf8","rgba(56,189,248,.12)"],["#1fbf9f","rgba(31,191,159,.12)"],["#fb923c","rgba(251,146,60,.12)"],["#f87171","rgba(248,113,113,.12)"]].map(([c,bg], i) => (
                    <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--bg)", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, color: c, marginLeft: i > 0 ? -8 : 0 }}>BA</div>
                  ))}
                </div>
                <div>
                  <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>{[1,2,3,4,5].map(i => <StarIcon key={i} />)}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)" }}><strong style={{ color: "var(--t2)" }}>Trusted by BA practitioners</strong> across banking, energy &amp; tech</div>
                </div>
              </div>
            </div>

            {/* Right — Live Chat */}
            <div className="a5"><ChatWindow /></div>
          </div>
        </div>
      </section>

      {/* ── TICKER ──────────────────────────────────────────────────────── */}
      <Ticker />

      {/* ── SYSTEM SECTION ──────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0 60px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Eyebrow>The System</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)", margin: 0 }}>
              From practice to job-ready
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              {
                label: "Practice", color: "#38bdf8",
                tools: ["Simulation Lab", "PitchReady"],
                desc: "Practice real scenarios. Improve how you think and speak.",
              },
              {
                label: "Learn", color: "#fb923c",
                tools: ["Learning", "Exam Prep"],
                desc: "Understand the frameworks behind real BA work.",
              },
              {
                label: "Advance", color: "#1fbf9f",
                tools: ["Career Suite", "Jobs"],
                desc: "Position yourself, apply strategically, and land the role.",
              },
            ].map(col => (
              <div key={col.label} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "32px 28px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: col.color, marginBottom: 16, textTransform: "uppercase" as const }}>{col.label}</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" as const }}>
                  {col.tools.map(t => (
                    <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: `${col.color}10`, border: `1px solid ${col.color}22`, color: col.color }}>{t}</span>
                  ))}
                </div>
                <p style={{ fontSize: 14, color: "var(--t2)", lineHeight: 1.65, margin: 0 }}>{col.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={statsReveal.ref} style={{ ...statsReveal.style, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {[
              { val: "7",   label: "Live Simulations",    sub: "across 5 industries" },
              { val: "3",   label: "Difficulty Modes",   sub: "Normal · Hard · Expert" },
              { val: "4",   label: "Eval Dimensions",    sub: "scored by Alex Rivera" },
              { val: "60+", label: "Simulations Roadmap", sub: "BABOK-aligned curriculum" },
            ].map((s, i) => (
              <div key={i} style={{ background: "var(--bg-1)", padding: "36px 28px", textAlign: "center", transition: "background .2s", cursor: "default" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-1)")}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 800, color: "var(--teal)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{s.val}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--t3)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={hiwReveal.ref} style={{ ...hiwReveal.style, textAlign: "center", marginBottom: 64 }}>
            <Eyebrow>Your Journey</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 16 }}>From first simulation to career-ready</h2>
            <p style={{ fontSize: 16, color: "var(--t2)", maxWidth: 520, margin: "0 auto", lineHeight: 1.68 }}>Every tool on the platform has a role. Here is how they connect into a single progression.</p>
          </div>

          {/* Journey steps */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, position: "relative" }}>
            {/* Connector line */}
            <div style={{ position: "absolute", top: 44, left: "calc(12.5% + 10px)", right: "calc(12.5% + 10px)", height: 1, background: "linear-gradient(to right, transparent 0%, rgba(31,191,159,0.25) 15%, rgba(31,191,159,0.25) 85%, transparent 100%)", pointerEvents: "none", zIndex: 0 }} />

            {[
              { num: "01", phase: "Practice",  color: "#38bdf8", title: "Run real scenarios",   desc: "Run real scenarios with simulated stakeholders. Get scored on how you frame problems and use evidence.", tools: ["Simulation Lab"] },
              { num: "02", phase: "Learn",     color: "#fb923c", title: "Build the theory",     desc: "Build the theory. Follow Vela, a Lagos fintech, through the full SDLC.", tools: ["Learning"] },
              { num: "03", phase: "Prepare",   color: "#a78bfa", title: "Nail the interview",   desc: "Nail your interview answers. Practice under pressure.", tools: ["PitchReady", "Exam Prep"] },
              { num: "04", phase: "Advance",   color: "#1fbf9f", title: "Land the role",        desc: "Personalized career plan, resume builder, and salary benchmarks.", tools: ["Career Suite"] },
            ].map((step, i) => (
              <div key={step.num} style={{ position: "relative", zIndex: 1 }}>
                <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "28px 24px", height: "100%", transition: "border-color .2s, background .2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${step.color}30`; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; }}
                >
                  {/* Step badge */}
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${step.color}12`, border: `2px solid ${step.color}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: step.color }}>
                    {step.num}
                  </div>
                  {/* Arrow connector (except last) */}
                  {i < 3 && (
                    <div style={{ position: "absolute", top: 44, right: -8, width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(31,191,159,0.35)" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: step.color, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>{step.phase}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--t1)", marginBottom: 10, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65, marginBottom: 18 }}>{step.desc}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {step.tools.map(tool => (
                      <span key={tool} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: `${step.color}10`, color: step.color, border: `1px solid ${step.color}20` }}>{tool}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHALLENGES ──────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }} id="simulations">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={challengesHeadReveal.ref} style={{ ...challengesHeadReveal.style, display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 44 }}>
            <div>
              <Eyebrow>Simulations</Eyebrow>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)" }}>Real scenarios.<br />Real deliverables.</h2>
            </div>
            <Link href="/scenarios" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--t2)", padding: "10px 18px", borderRadius: "var(--radius-sm)", background: "var(--bg-2)", border: "1px solid var(--border)", transition: "color .15s, border-color .15s", flexShrink: 0, textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--t1)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,.14)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--t2)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}
            >
              Browse simulations <ChevronRight />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {CHALLENGES.map((c, i) => (
              <ChallengeCard key={i} {...c} accentColor={c.typeColor} />
            ))}
          </div>
        </div>
      </section>

      {/* ── THE PLATFORM ─────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }} id="features">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={featuresReveal.ref} style={{ ...featuresReveal.style, textAlign: "center", marginBottom: 56 }}>
            <Eyebrow>The Platform</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 16 }}>Everything you need to grow as a Business Analyst</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              {
                href: "/scenarios",
                color: "#38bdf8",
                title: "Simulation Lab",
                desc: "Run real scenarios with simulated stakeholders. Get scored by Alex Rivera.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
              },
              {
                href: "/learning",
                color: "#fb923c",
                title: "Learning",
                desc: "Follow Vela, a Lagos fintech, through the full SDLC. Six modules, each with a simulation.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
              },
              {
                href: "/pitchready",
                color: "#a78bfa",
                title: "PitchReady",
                desc: "Practice your interview answers under pressure. Get real-time feedback.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>,
              },
              {
                href: "/exam",
                color: "#facc15",
                title: "Exam Prep",
                desc: "CBAP, CCBA, PMI-PBA practice questions. Flashcards and mock tests.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
              },
              {
                href: "/career",
                color: "#1fbf9f",
                title: "Career Suite",
                desc: "Personalized career plan, resume builder, salary guide.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round" width="22" height="22"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
              },
              {
                href: "/opportunities",
                color: "#34d399",
                title: "Jobs",
                desc: "Curated BA jobs in Canada. Alex Rivera tells you how to win before you apply.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" width="22" height="22"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
              },
            ].map(card => (
              <Link key={card.href} href={card.href} style={{ textDecoration: "none", display: "block" }}>
                <div
                  style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "36px 32px", position: "relative", overflow: "hidden", transition: "border-color .2s, background .2s", cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${card.color}30`; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; }}
                >
                  <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(ellipse, ${card.color}08 0%, transparent 65%)`, pointerEvents: "none" }} />
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: `${card.color}12`, border: `1px solid ${card.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    {card.icon}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 10, letterSpacing: "-0.02em" }}>{card.title}</div>
                  <p style={{ fontSize: 14, color: "var(--t2)", lineHeight: 1.68, marginBottom: 24, flex: 1 }}>{card.desc}</p>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: card.color }}>
                    Explore
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALEX RIVERA ─────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={alexReveal.ref} style={{ ...alexReveal.style, background: "var(--bg-1)", border: "1px solid rgba(124,110,245,.14)", borderRadius: "var(--radius-xl)", padding: 64, display: "grid", gridTemplateColumns: "220px 1fr", gap: 64, alignItems: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -120, right: -120, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,110,245,.07) 0%, transparent 65%)", pointerEvents: "none" }} />
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <div style={{ width: 108, height: 108, borderRadius: "50%", background: "rgba(124,110,245,.14)", border: "2px solid rgba(124,110,245,.28)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--violet)" }}>AR</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>Alex Rivera</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>Senior BA Coach · TheBAPortal</div>
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 52, color: "var(--violet)", opacity: 0.3, lineHeight: 1, marginBottom: 10 }}>&ldquo;</div>
              <blockquote style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.02em", lineHeight: 1.38, marginBottom: 20 }}>
                I&apos;ve coached over 2,000 Business Analysts. The ones who advance fastest practice under real pressure — not just study theory.
              </blockquote>
              <p style={{ fontSize: 14.5, color: "var(--t2)", lineHeight: 1.74, marginBottom: 28 }}>
                Every scenario comes with direct feedback on how you framed the problem, whether you identified the real root cause, and how you used evidence to support your decisions.
              </p>
              <div style={{ display: "flex", gap: 32, marginBottom: 28 }}>
                {[{ val: "4", label: "Eval dimensions" }, { val: "100", label: "Point scale" }, { val: "3", label: "Difficulty modes" }].map(m => (
                  <div key={m.label}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--violet)", letterSpacing: "-0.03em" }}>{m.val}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/scenarios" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--violet)", padding: "10px 20px", borderRadius: "var(--radius-sm)", background: "rgba(124,110,245,.1)", border: "1px solid rgba(124,110,245,.22)", textDecoration: "none", transition: "background .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(124,110,245,.18)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(124,110,245,.1)"; }}
              >
                See how it works <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ──────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={industriesHeadReveal.ref} style={{ ...industriesHeadReveal.style, textAlign: "center", marginBottom: 44 }}>
            <Eyebrow>Coverage</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)" }}>Practice where you want to work</h2>
          </div>
          <div ref={industriesGridReveal.ref} style={{ ...industriesGridReveal.style, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {INDUSTRIES.map(name => (
              <div key={name} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "26px 14px", textAlign: "center", transition: "border-color .2s, background .2s", cursor: "default" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(31,191,159,.18)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
              >
                <div style={{ marginBottom: 10, display: "flex", justifyContent: "center", color: "var(--t3)" }}>
                  <IndustryIcon name={name} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--t2)" }}>{name}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t4)" }}>
            +14 more industries on the roadmap
          </p>
        </div>
      </section>

      {/* ── DAILY HABIT ─────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={habitReveal.ref} style={{ ...habitReveal.style, background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "56px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(56,189,248,.05) 0%, transparent 65%)", pointerEvents: "none" }} />

            {/* Left: copy */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <Eyebrow>Daily Practice</Eyebrow>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 16 }}>
                Build the habit. One scenario a day.
              </h2>
              <p style={{ fontSize: 15, color: "var(--t2)", lineHeight: 1.72, marginBottom: 32 }}>
                The BAs who improve fastest are the ones who show up consistently. A new simulation drops every day. It takes 30 minutes. The feedback is immediate.
              </p>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t2)" }}><strong style={{ color: "var(--teal)" }}>47</strong> BAs active today</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-3.5-.944"/></svg>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t2)" }}><strong style={{ color: "#fb923c" }}>3 day</strong> streak</span>
                </div>
              </div>
            </div>

            {/* Right: Today's Challenge card */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--t4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Today&apos;s Simulation</div>
              <div style={{ background: "var(--bg-2)", border: "1px solid rgba(56,189,248,.18)", borderRadius: "var(--radius)", padding: "28px 28px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #38bdf8, transparent)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: "rgba(56,189,248,.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,.2)" }}>Discovery</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: "rgba(34,197,94,.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,.18)" }}>Beginner</span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--t1)", lineHeight: 1.3, marginBottom: 18, letterSpacing: "-0.02em" }}>
                  Rising Customer Churn at First National Bank
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    Banking
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    30 min
                  </div>
                </div>
                <Link href="/scenarios" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "12px 22px", borderRadius: "var(--radius-sm)", textDecoration: "none", transition: "background .2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; }}
                >
                  Start now <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }} id="pricing">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={pricingHeadReveal.ref} style={{ ...pricingHeadReveal.style, textAlign: "center", marginBottom: 0 }}>
            <Eyebrow>Pricing</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 24 }}>Simple, honest pricing</h2>
            <div style={{ display: "inline-flex", padding: 4, borderRadius: "var(--radius-sm)", background: "var(--bg-2)", border: "1px solid var(--border)", marginBottom: 48 }}>
              {[{ label: "Annual · Save 35%", val: "annual" }, { label: "Monthly", val: "monthly" }].map(opt => (
                <button key={opt.val} onClick={() => setBillingAnnual(opt.val === "annual")} style={{ padding: "7px 22px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, transition: "all .2s", background: (opt.val === "annual") === billingAnnual ? "var(--teal)" : "transparent", color: (opt.val === "annual") === billingAnnual ? "#041a13" : "var(--t2)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div ref={pricingReveal.ref} style={{ ...pricingReveal.style, display: "flex", gap: 16, maxWidth: 820, margin: "0 auto" }}>
            <PricingCard
              plan="Free" price="$0" period="forever" href="/signup" cta="Get Started" featured={false}
              features={["3 BA simulations", "Normal difficulty mode", "AI stakeholder interviews", "Alex Rivera evaluation and scoring", "Progress tracking", "Career advisor starter flows"]}
            />
            <PricingCard
              plan="Pro" price={billingAnnual ? "$19" : "$29"} period={billingAnnual ? "/mo · billed annually" : "/month"} href="/pricing" cta="Upgrade to Pro" featured={true}
              features={["All BA simulations", "Hard and Expert difficulty modes", "Full career advisor suite (5 flows)", "Portfolio case study builder", "Resume bullet and interview answer generator", "Exam prep module", "Advanced analytics", "Priority support"]}
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={finalReveal.ref} style={{ ...finalReveal.style, background: "rgba(31,191,159,.04)", border: "1px solid rgba(31,191,159,.14)", borderRadius: "var(--radius-xl)", padding: "88px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 340, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,191,159,.08) 0%, transparent 65%)", filter: "blur(40px)", pointerEvents: "none" }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.04em", marginBottom: 18, position: "relative" }}>
              Stop studying.<br />Start doing.
            </h2>
            <p style={{ fontSize: 17, color: "var(--t2)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 38px", position: "relative" }}>
              Start in under 60 seconds.
            </p>
            <Link href={authState === "authenticated" ? "/scenarios" : "/signup"} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "17px 36px", borderRadius: 14, textDecoration: "none", transition: "all .2s", boxShadow: "0 0 52px rgba(31,191,159,.28)", position: "relative" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 56px rgba(31,191,159,.38)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 52px rgba(31,191,159,.28)"; }}
            >
              Start Your First Simulation <ArrowRight size={19} />
            </Link>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--t4)", marginTop: 14 }}>
              Free forever · No credit card required · Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--bg-1)", padding: "44px 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: "var(--t1)" }}>
            <LogoMark size={26} />
            The<span style={{ color: "var(--teal)" }}>BA</span>Portal
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[["Simulations","#simulations"],["How it Works","#how-it-works"],["Jobs","/opportunities"],["Pricing","#pricing"],["FAQ","/faq"],["Contact","/contact"],["Privacy","/privacy"],["Terms","/terms"]].map(([l, href]) => (
              <Link key={l} href={href} style={{ fontSize: 13, color: "var(--t3)", textDecoration: "none", transition: "color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--t2)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t3)")}
              >{l}</Link>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t4)" }}>© 2026 TheBAPortal</div>
        </div>
      </footer>
    </div>
  );
}