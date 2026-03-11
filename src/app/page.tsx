"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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
  { name: "Banking",     emoji: "🏦" },
  { name: "Healthcare",  emoji: "🏥" },
  { name: "Energy",      emoji: "⚡" },
  { name: "Technology",  emoji: "💻" },
  { name: "Insurance",   emoji: "🛡️" },
  { name: "Government",  emoji: "🏛️" },
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
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        <div ref={msgsEndRef} />
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(true);

  // Reveal refs
  const statsReveal = useReveal();
  const hiwReveal = useReveal();
  const challengesHeadReveal = useReveal();
  const alexReveal = useReveal();
  const industriesHeadReveal = useReveal();
  const industriesGridReveal = useReveal();
  const pricingHeadReveal = useReveal();
  const pricingReveal = useReveal();
  const finalReveal = useReveal();

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
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            {["Challenges","Pricing","FAQ"].map(l => (
              <Link key={l} href={l === "Challenges" ? "#challenges" : l === "Pricing" ? "#pricing" : "#faq"} style={{ fontSize: 14, fontWeight: 500, color: "var(--t2)", textDecoration: "none", transition: "color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
              >{l}</Link>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)", padding: "8px 16px", borderRadius: "var(--radius-sm)", textDecoration: "none", transition: "color .15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
            >Sign in</Link>
            <Link href="/signup" style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "9px 20px", borderRadius: "var(--radius-sm)", textDecoration: "none", transition: "background .15s, transform .15s, box-shadow .15s", letterSpacing: "0.01em" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; }}
            >Try a Challenge Free</Link>
          </div>
        </div>
      </nav>

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
              <div className="a1" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 99, background: "rgba(31,191,159,.08)", border: "1px solid rgba(31,191,159,.18)", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--teal)", marginBottom: 30 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", animation: "pulse-dot 2.2s ease-in-out infinite" }} />
                Built by practicing Business Analysts
              </div>

              <h1 className="a2" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(46px, 5.6vw, 74px)", fontWeight: 900, lineHeight: 0.97, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 24 }}>
                Real BA work.<br />
                Simulated<br />
                <span style={{ background: "linear-gradient(110deg, var(--teal) 0%, #2ddbb8 38%, #60d4f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>pressure.</span>
              </h1>

              <p className="a3" style={{ fontSize: 17, color: "var(--t2)", lineHeight: 1.72, maxWidth: 430, marginBottom: 38 }}>
                Interview AI stakeholders, write real deliverables, and get scored by Alex Rivera —
                a Senior BA Coach who{" "}<strong style={{ color: "var(--t1)", fontWeight: 600 }}>does not sugarcoat.</strong>
              </p>

              <div className="a4" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48, flexWrap: "wrap" }}>
                <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "15px 30px", borderRadius: "var(--radius)", transition: "all .2s", letterSpacing: "0.01em", boxShadow: "0 0 32px rgba(31,191,159,.24), 0 2px 12px rgba(0,0,0,.4)", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 40px rgba(31,191,159,.36)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 32px rgba(31,191,159,.24), 0 2px 12px rgba(0,0,0,.4)"; }}
                >
                  Start a Challenge Free <ArrowRight size={16} />
                </Link>
                <Link href="/scenarios" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--t2)", padding: "15px 22px", borderRadius: "var(--radius)", background: "rgba(255,255,255,.04)", border: "1px solid var(--border)", transition: "all .2s", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--t1)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,.14)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--t2)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}
                >
                  View Challenges <ChevronRight />
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

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={statsReveal.ref} style={{ ...statsReveal.style, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {[
              { val: "7",   label: "Live Challenges",    sub: "across 5 industries" },
              { val: "3",   label: "Difficulty Modes",   sub: "Normal · Hard · Expert" },
              { val: "4",   label: "Eval Dimensions",    sub: "scored by Alex Rivera" },
              { val: "60+", label: "Challenges Roadmap", sub: "BABOK-aligned curriculum" },
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
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={hiwReveal.ref} style={{ ...hiwReveal.style, textAlign: "center", marginBottom: 64 }}>
            <Eyebrow>The Platform</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 16 }}>How TheBAPortal works</h2>
            <p style={{ fontSize: 16, color: "var(--t2)", maxWidth: 500, margin: "0 auto", lineHeight: 1.68 }}>Four steps that mirror exactly what real BA work looks like on the job.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {[
              { num: "1", title: "Choose a Scenario",      desc: "Pick from real BA scenarios across banking, healthcare, energy, tech, and insurance. Each one is a genuine business problem.", iconColor: "#38bdf8", iconBg: "rgba(56,189,248,.1)",  icon: <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
              { num: "2", title: "Interview Stakeholders", desc: "Conduct live AI conversations with 2–4 stakeholders who have competing priorities, hidden agendas, and real information to uncover.", iconColor: "#a78bfa", iconBg: "rgba(167,139,250,.1)", icon: <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" width="20" height="20"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
              { num: "3", title: "Write the Deliverable",  desc: "Produce a Problem Statement, Requirements Doc, UAT Assessment, or Incident Report. No templates handed to you.", iconColor: "#fb923c", iconBg: "rgba(251,146,60,.1)",  icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" width="20" height="20"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg> },
              { num: "4", title: "Get Scored",             desc: "Alex Rivera evaluates across 4 dimensions. Detailed, specific, unsparing feedback — exactly what you need to improve.", iconColor: "#1fbf9f", iconBg: "rgba(31,191,159,.1)",  icon: <svg viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round" width="20" height="20"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
            ].map(s => (
              <div key={s.num} style={{ background: "var(--bg-1)", padding: "36px 28px", position: "relative", overflow: "hidden", transition: "background .2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-1)")}
              >
                <div style={{ position: "absolute", bottom: -8, right: 12, fontFamily: "var(--font-display)", fontSize: 88, fontWeight: 800, color: "rgba(255,255,255,.025)", lineHeight: 1, pointerEvents: "none" }}>{s.num}</div>
                <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>{s.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--t1)", marginBottom: 10, letterSpacing: "-0.01em" }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHALLENGES ──────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }} id="challenges">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={challengesHeadReveal.ref} style={{ ...challengesHeadReveal.style, display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 44 }}>
            <div>
              <Eyebrow>Challenges</Eyebrow>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)" }}>Real scenarios.<br />Real deliverables.</h2>
            </div>
            <Link href="/scenarios" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--t2)", padding: "10px 18px", borderRadius: "var(--radius-sm)", background: "var(--bg-2)", border: "1px solid var(--border)", transition: "color .15s, border-color .15s", flexShrink: 0, textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--t1)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,.14)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--t2)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}
            >
              View all challenges <ChevronRight />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {CHALLENGES.map((c, i) => (
              <ChallengeCard key={i} {...c} accentColor={c.typeColor} />
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
                The gap between a good BA and a great one is practice under real pressure. Theory gets you the interview. Reps get you the job.
              </blockquote>
              <p style={{ fontSize: 14.5, color: "var(--t2)", lineHeight: 1.74, marginBottom: 28 }}>
                Every submission is evaluated across four dimensions: Problem Framing, Root Cause Analysis, Evidence Use, and Recommendation Quality. No gold stars for effort. Only feedback that makes you better.
              </p>
              <div style={{ display: "flex", gap: 32 }}>
                {[{ val: "4", label: "Eval dimensions" }, { val: "100", label: "Point scale" }, { val: "3", label: "Difficulty modes" }].map(m => (
                  <div key={m.label}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--violet)", letterSpacing: "-0.03em" }}>{m.val}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ──────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={industriesHeadReveal.ref} style={{ ...industriesHeadReveal.style, textAlign: "center", marginBottom: 44 }}>
            <Eyebrow>Coverage</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)" }}>Whatever industry you&apos;re targeting</h2>
          </div>
          <div ref={industriesGridReveal.ref} style={{ ...industriesGridReveal.style, display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 16 }}>
            {INDUSTRIES.map(ind => (
              <div key={ind.name} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "22px 14px", textAlign: "center", transition: "border-color .2s, background .2s", cursor: "default" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(31,191,159,.18)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
              >
                <div style={{ marginBottom: 10, fontSize: 20, lineHeight: 1 }}>{ind.emoji}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--t2)" }}>{ind.name}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t4)" }}>
            + Retail, Telecom, Manufacturing, Logistics, Legal, Aviation and 14 more on the roadmap
          </p>
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
              features={["3 free challenges (Banking, Healthcare, Energy)", "Normal difficulty mode", "Full AI stakeholder interviews", "Alex Rivera evaluation & scoring", "Progress tracking"]}
            />
            <PricingCard
              plan="Pro" price={billingAnnual ? "$19" : "$29"} period={billingAnnual ? "/mo · billed annually" : "/month"} href="/signup?plan=pro" cta="Start Pro Free" featured={true}
              features={["All 7 challenges + every new release", "Hard & Expert difficulty modes", "Phase B — Requirements Validation", "Full scoring history & analytics", "BA Copilot — coming soon", "Priority support"]}
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
              Your first challenge is free. No credit card. No setup. Real BA work starting in 60 seconds.
            </p>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "17px 36px", borderRadius: 14, textDecoration: "none", transition: "all .2s", boxShadow: "0 0 52px rgba(31,191,159,.28)", position: "relative" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 56px rgba(31,191,159,.38)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 52px rgba(31,191,159,.28)"; }}
            >
              Start a Challenge Free <ArrowRight size={19} />
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
          <div style={{ display: "flex", gap: 24 }}>
            {["About","Challenges","Pricing","FAQ"].map(l => (
              <Link key={l} href={l === "Challenges" ? "#challenges" : l === "Pricing" ? "#pricing" : `/${l.toLowerCase()}`} style={{ fontSize: 13, color: "var(--t3)", textDecoration: "none", transition: "color .15s" }}
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