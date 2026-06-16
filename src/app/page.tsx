"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DemoMessage {
  role: "user" | "ai";
  text: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const DEMO_MESSAGES: DemoMessage[] = [
  { role: "user", text: "Our customer onboarding takes 15 days and we're getting complaints." },
  { role: "ai",  text: "Who owns the onboarding process — one team or shared across departments?" },
  { role: "user", text: "Operations and IT share it. No clear handoff documented." },
  { role: "ai",  text: "What changed in the last 90 days — new system, process change, or volume spike?" },
  { role: "user", text: "We migrated to a new CRM in Q1. Complaints started shortly after." },
  { role: "ai",  text: "Got it. Building your analysis package now." },
];

const DEMO_ARTIFACTS = [
  { label: "Problem Statement", color: "#1fbf9f" },
  { label: "Stakeholder Map",   color: "#38bdf8" },
  { label: "Root Cause Analysis", color: "#a78bfa" },
  { label: "Requirements",      color: "#fb923c" },
  { label: "Business Case",     color: "#facc15" },
];

const TICKER_ITEMS = [
  "Problem Analyzer", "User Story Generator", "BRD Generator", "FRD Generator",
  "Stakeholder Intelligence", "Root Cause Analysis", "Resume Analyzer",
  "Interview Copilot", "Business Case Generator", "Process Analyzer",
  "BABOK Aligned", "Decision Intelligence", "Template Studio",
  "Banking", "Healthcare", "Energy", "Technology", "Insurance",
];

const PLATFORM_GROUPS = [
  {
    group: "Work", color: "#1fbf9f",
    items: [
      { label: "BA Workspace",         desc: "From problem to full deliverable package",                 href: "/workspace",    color: "#1fbf9f", icon: "⚡" },
      { label: "Decision Intelligence", desc: "Analyze options, identify risks, get recommendations",     href: "/decision-intelligence", color: "#a78bfa", icon: "🧠" },
    ],
  },
  {
    group: "Career", color: "#38bdf8",
    items: [
      { label: "Career Hub", desc: "Resume analyzer, interview copilot, portfolio builder",  href: "/career",       color: "#38bdf8", icon: "💼" },
      { label: "Jobs",       desc: "Curated BA roles and how to win them",                   href: "/opportunities", color: "#34d399", icon: "🌐" },
    ],
  },
  {
    group: "Grow", color: "#fb923c",
    items: [
      { label: "Learning Hub",  desc: "Structured BA paths from beginner to advanced",            href: "/learning",   color: "#fb923c", icon: "📚" },
      { label: "Practice Lab",  desc: "Stakeholder simulations and scenario practice",             href: "/scenarios",  color: "#38bdf8", icon: "🎯" },
    ],
  },
];

const PLATFORM_ITEMS = PLATFORM_GROUPS.flatMap(g => g.items);

const INDUSTRIES = [
  "Banking", "Healthcare", "Energy", "Technology",
  "Insurance", "Government", "Retail", "Logistics",
];

// ── Icon helpers ───────────────────────────────────────────────────────────────
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

// ── Intelligence Demo ──────────────────────────────────────────────────────────
function IntelligenceDemo() {
  const [visibleMessages, setVisibleMessages] = useState<DemoMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [artifactsVisible, setArtifactsVisible] = useState<number>(0);
  const [building, setBuilding] = useState(false);
  const msgIndexRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isTyping, artifactsVisible]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function runDemo() {
      const idx = msgIndexRef.current;
      if (idx >= DEMO_MESSAGES.length) {
        // Build artifacts one by one
        setBuilding(true);
        let count = 0;
        function nextArtifact() {
          if (count < DEMO_ARTIFACTS.length) {
            count++;
            setArtifactsVisible(count);
            timeout = setTimeout(nextArtifact, 420);
          } else {
            // Reset after pause
            timeout = setTimeout(() => {
              setVisibleMessages([]);
              setArtifactsVisible(0);
              setBuilding(false);
              msgIndexRef.current = 0;
              timeout = setTimeout(runDemo, 800);
            }, 3800);
          }
        }
        timeout = setTimeout(nextArtifact, 500);
        return;
      }

      const msg = DEMO_MESSAGES[idx];
      if (msg.role === "user") {
        setVisibleMessages(prev => [...prev, msg]);
        msgIndexRef.current++;
        timeout = setTimeout(runDemo, 1300);
      } else {
        setIsTyping(true);
        timeout = setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages(prev => [...prev, msg]);
          msgIndexRef.current++;
          timeout = setTimeout(runDemo, msg.text.includes("Building") ? 600 : 1500);
        }, 900);
      }
    }

    timeout = setTimeout(runDemo, 1000);
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
      {/* Chrome bar */}
      <div style={{ background: "var(--bg-2)", padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#f87171","#fb923c","#1fbf9f"].map((c,i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.65 }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--t3)", letterSpacing: "0.04em" }}>
          Intelligence Engine · BA Workspace
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--teal)" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--teal)", animation: "pulse-dot 1.8s ease-in-out infinite" }} />
          Thinking
        </div>
      </div>

      {/* Messages */}
      <div style={{ padding: 18, minHeight: 260, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 290 }}>
        {visibleMessages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 7, animation: "slide-msg .25s ease both" }}>
            {msg.role === "ai" && (
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: "var(--teal)", flexShrink: 0, marginTop: 2 }}>
                BA
              </div>
            )}
            <div style={{
              maxWidth: "78%", padding: "9px 13px", fontSize: 12.5, lineHeight: 1.56, color: "var(--t1)",
              background: msg.role === "user" ? "rgba(31,191,159,.1)" : "var(--bg-3)",
              border: msg.role === "user" ? "1px solid rgba(31,191,159,.18)" : "1px solid var(--border)",
              borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: "var(--teal)", flexShrink: 0 }}>BA</div>
            <div style={{ padding: "9px 14px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "3px 12px 12px 12px", display: "flex", gap: 4 }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--t3)", animation: `typing-dot 1.2s ${j * 0.2}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Artifacts panel */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", background: "var(--bg)", padding: "14px 18px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--t4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          {building ? "Building deliverables" : "Deliverables"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {DEMO_ARTIFACTS.map((a, i) => (
            <div key={a.label} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 11px", borderRadius: 8,
              background: i < artifactsVisible ? `${a.color}10` : "var(--bg-2)",
              border: i < artifactsVisible ? `1px solid ${a.color}28` : "1px solid var(--border)",
              fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 600,
              color: i < artifactsVisible ? a.color : "var(--t4)",
              transition: "all .3s ease",
              animation: i < artifactsVisible ? "slide-msg .25s ease both" : "none",
            }}>
              {i < artifactsVisible && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {a.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Ticker ─────────────────────────────────────────────────────────────────────
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-1)", overflow: "hidden" }}>
      <div style={{ display: "flex", whiteSpace: "nowrap", animation: "ticker 36s linear infinite" }}>
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

// ── useReveal ──────────────────────────────────────────────────────────────────
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

// ── Eyebrow ────────────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--teal)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 18 }}>
      <div style={{ width: 18, height: 1, background: "var(--teal)", opacity: 0.6 }} />
      {children}
    </div>
  );
}

// ── PricingCard ────────────────────────────────────────────────────────────────
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

// ── IndustryIcon ───────────────────────────────────────────────────────────────
function IndustryIcon({ name }: { name: string }) {
  const s = { width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "Banking":    return <svg {...s} viewBox="0 0 24 24"><path d="M3 9l9-6 9 6v12a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/><path d="M9 22V12h6v10"/></svg>;
    case "Healthcare": return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>;
    case "Energy":     return <svg {...s} viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case "Technology": return <svg {...s} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
    case "Insurance":  return <svg {...s} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "Government": return <svg {...s} viewBox="0 0 24 24"><path d="M3 22h18M12 3L2 9h20L12 3z"/><path d="M5 9v10M9 9v10M15 9v10M19 9v10"/></svg>;
    case "Retail":     return <svg {...s} viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
    case "Logistics":  return <svg {...s} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    default: return null;
  }
}

// ── Nav helpers ────────────────────────────────────────────────────────────────
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

// ── Platform Dropdown ──────────────────────────────────────────────────────────
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
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 500, color: open ? "var(--t1)" : "var(--t2)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color .15s" }}
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
        <div style={{ position: "absolute", top: "calc(100% + 16px)", left: "50%", transform: "translateX(-50%)", background: "#0B0F14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "10px", width: 380, boxShadow: "0 16px 48px rgba(0,0,0,0.6)", zIndex: 300, animation: "slide-down-fade .18s ease both" }}>
          <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)", width: 10, height: 5, overflow: "hidden" }}>
            <div style={{ width: 8, height: 8, background: "rgba(255,255,255,0.09)", transform: "rotate(45deg) translateY(3px)", margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.09)", borderLeft: "1px solid rgba(255,255,255,0.09)" }} />
          </div>
          {PLATFORM_GROUPS.map((group, gi) => (
            <div key={group.group} style={{ marginBottom: gi < PLATFORM_GROUPS.length - 1 ? 4 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: group.color, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "8px 12px 6px", opacity: 0.8 }}>{group.group}</div>
              {group.items.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", borderRadius: 12, textDecoration: "none", marginBottom: 2, transition: "background .15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${item.color}09`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}12`, border: `1px solid ${item.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 500, color: "#D1D5DB", lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </Link>
              ))}
              {gi < PLATFORM_GROUPS.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0 2px" }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── GuestCTAs ──────────────────────────────────────────────────────────────────
function GuestCTAs() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Link href="/auth/login" style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)", padding: "8px 16px", borderRadius: "var(--radius-sm)", textDecoration: "none", transition: "color .15s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
      >
        Sign in
      </Link>
      <Link href="/auth/signup" style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "9px 20px", borderRadius: "var(--radius-sm)", textDecoration: "none", transition: "background .15s, transform .15s", letterSpacing: "0.01em", whiteSpace: "nowrap" }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; }}
      >
        Try It Free
      </Link>
    </div>
  );
}

// ── UserMenu ───────────────────────────────────────────────────────────────────
function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const first = name.split(" ")[0] || "there";
  const color = avatarColor(name);
  const abbr  = initials(name) || "BA";

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
      <span style={{ fontSize: 13, color: "var(--t2)", fontWeight: 500, animation: "fade-in-avatar .25s ease both" }}>
        Hi, {first}
      </span>
      <button onClick={() => setOpen(o => !o)} style={{ width: 34, height: 34, borderRadius: "50%", background: `${color}20`, border: `1.5px solid ${color}45`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color, cursor: "pointer", outline: "2px solid transparent", outlineOffset: "2px", transition: "outline-color .15s, outline-offset .15s", animation: "fade-in-avatar .2s ease both" }}
        onMouseEnter={e => { e.currentTarget.style.outlineColor = "var(--teal)"; }}
        onMouseLeave={e => { e.currentTarget.style.outlineColor = "transparent"; }}
        aria-label="Account menu"
      >
        {abbr}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, background: "rgba(10,10,15,0.98)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "5px", width: 176, boxShadow: "0 24px 64px rgba(0,0,0,.72), 0 0 0 1px rgba(255,255,255,.03)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 300, animation: "slide-down-fade .15s ease both" }}>
          <Link href="/workspace" onClick={() => setOpen(false)} style={{ ...menuItemStyle, color: "var(--t1)" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
          >Workspace</Link>
          <Link href="/dashboard" onClick={() => setOpen(false)} style={{ ...menuItemStyle, color: "var(--t1)" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
          >Dashboard</Link>
          <Link href="/settings" onClick={() => setOpen(false)} style={{ ...menuItemStyle, color: "var(--t1)" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}
          >Settings</Link>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 6px" }} />
          <button onClick={handleSignOut} style={{ ...menuItemStyle, color: "#f87171", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.08)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
          >Sign out</button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled]         = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authState, setAuthState]       = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [navUserName, setNavUserName]   = useState("");

  const modulesReveal   = useReveal();
  const statsReveal     = useReveal();
  const hiwReveal       = useReveal();
  const featuresReveal  = useReveal();
  const industriesReveal = useReveal();
  const pricingHeadReveal = useReveal();
  const pricingReveal   = useReveal();
  const finalReveal     = useReveal();

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setAuthState("authenticated");
          setNavUserName(session.user.user_metadata?.full_name ?? session.user.email ?? "");
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
        .hero-grid{grid-template-columns:1fr !important; gap:40px !important;}
        .hero-grid > *:last-child{display:none !important;}
        .fast-lanes{grid-template-columns:1fr 1fr !important;}
        .module-grid{grid-template-columns:1fr 1fr !important;}
        .stats-grid{grid-template-columns:1fr 1fr !important;}
        .hiw-grid{grid-template-columns:1fr 1fr !important;}
        .industry-grid{grid-template-columns:repeat(2,1fr) !important;}
        .feature-grid{grid-template-columns:1fr !important;}
        .footer-inner{flex-direction:column !important; gap:16px !important; text-align:center !important;}
        .footer-links{gap:12px !important; justify-content:center !important;}
      }
    `;
    document.head.appendChild(style);
  }, []);

  const workspaceHref = authState === "authenticated" ? "/workspace" : "/auth/signup";

  return (
    <div style={{ background: "var(--bg)", color: "var(--t1)", fontFamily: "var(--font-body)", overflowX: "hidden", minHeight: "100vh", WebkitFontSmoothing: "antialiased" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 200, height: 62, display: "flex", alignItems: "center", padding: "0 28px", background: scrolled ? "rgba(7,7,10,0.95)" : "rgba(7,7,10,0.75)", backdropFilter: "blur(24px) saturate(1.5)", WebkitBackdropFilter: "blur(24px) saturate(1.5)", borderBottom: "1px solid var(--border)", transition: "background .3s" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.01em" }}>
            <LogoMark />
            The<span style={{ color: "var(--teal)" }}>BA</span>Portal
          </Link>

          <div className="dsk-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <PlatformDropdown />
            {[["How it Works", "#how-it-works"], ["Pricing", "#pricing"]].map(([l, href]) => (
              <Link key={l} href={href} style={{ fontSize: 14, fontWeight: 500, color: "var(--t2)", textDecoration: "none", transition: "color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
              >{l}</Link>
            ))}
          </div>

          <div className="dsk-nav" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 260 }}>
            {authState === "loading"         ? <div style={{ width: 260, height: 34 }} /> : null}
            {authState === "authenticated"   ? <UserMenu name={navUserName} /> : null}
            {authState === "unauthenticated" ? <GuestCTAs /> : null}
          </div>

          <button className="mob-only" onClick={() => setMobileNavOpen(true)}
            style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 5, width: 38, height: 38, background: "none", border: "1px solid var(--border)", borderRadius: 9, cursor: "pointer" }}>
            {[0,1,2].map(i => <span key={i} style={{ width: 16, height: 1.5, background: "var(--t2)", borderRadius: 2, display: "block" }} />)}
          </button>
        </div>
      </nav>

      {/* ── MOBILE NAV ───────────────────────────────────────────────────── */}
      {mobileNavOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex" }}>
          <div onClick={() => setMobileNavOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
          <div style={{ position: "relative", width: "85%", maxWidth: 320, height: "100%", background: "var(--bg-1)", borderRight: "1px solid var(--border)", padding: "22px 18px", display: "flex", flexDirection: "column", overflowY: "auto", animation: "slide-in-left .22s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <Link href="/" onClick={() => setMobileNavOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--t1)" }}>
                <LogoMark size={24} />
                The<span style={{ color: "var(--teal)" }}>BA</span>Portal
              </Link>
              <button onClick={() => setMobileNavOpen(false)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

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
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
              {[["How it Works", "#how-it-works"], ["Pricing", "#pricing"], ["Contact", "/contact"]].map(([label, href]) => (
                <Link key={label} href={href} onClick={() => setMobileNavOpen(false)}
                  style={{ padding: "11px 10px", fontSize: 14, fontWeight: 500, color: "var(--t2)", textDecoration: "none", borderRadius: 10, transition: "color .15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--t1)"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--t2)"}
                >{label}</Link>
              ))}
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {authState === "authenticated" ? (
                <>
                  <Link href="/workspace" onClick={() => setMobileNavOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#041a13", background: "var(--teal)", textDecoration: "none" }}>
                    Open Workspace <ArrowRight size={14} />
                  </Link>
                  <button onClick={async () => { setMobileNavOpen(false); const { createClient } = await import("@/lib/supabase/client"); await createClient().auth.signOut(); window.location.href = "/"; }} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#f87171", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", cursor: "pointer" }}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMobileNavOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "var(--t1)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", textDecoration: "none" }}>Sign in</Link>
                  <Link href="/auth/signup" onClick={() => setMobileNavOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#041a13", background: "var(--teal)", textDecoration: "none" }}>
                    Try It Free <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", paddingTop: 62, display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(31,191,159,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(31,191,159,.025) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse 70% 60% at 55% 40%, black 0%, transparent 100%)" }} />
          <div style={{ position: "absolute", top: "-18%", left: "42%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,191,159,.08) 0%, transparent 60%)", filter: "blur(48px)" }} />
          <div style={{ position: "absolute", bottom: "-24%", right: "8%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,110,245,.06) 0%, transparent 60%)", filter: "blur(56px)" }} />
          <div style={{ position: "absolute", top: "30%", left: "-8%", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(56,189,248,.04) 0%, transparent 60%)", filter: "blur(60px)" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, width: "100%", padding: "80px 0 100px" }}>
          <div className="hero-grid" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

            {/* Left */}
            <div>
              {/* Badge */}
              <div className="a1" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 99, background: "rgba(31,191,159,.08)", border: "1px solid rgba(31,191,159,.18)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--teal)", letterSpacing: "0.05em", marginBottom: 28 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", animation: "pulse-dot 1.8s ease-in-out infinite" }} />
                BA OPERATING SYSTEM
              </div>

              <h1 className="a2" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(44px, 5.4vw, 70px)", fontWeight: 900, lineHeight: 0.97, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 26 }}>
                The only platform<br />
                that thinks like<br />
                <span style={{ background: "linear-gradient(110deg, var(--teal) 0%, #2ddbb8 38%, #60d4f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  a senior BA.
                </span>
              </h1>

              <p className="a3" style={{ fontSize: 17, color: "var(--t2)", lineHeight: 1.72, maxWidth: 440, marginBottom: 38 }}>
                Paste your notes. Enter your problem. Describe your situation.{" "}
                <strong style={{ color: "var(--t1)", fontWeight: 600 }}>
                  The Intelligence Engine asks what a senior BA would ask — then builds a complete, connected package of deliverables.
                </strong>
              </p>

              {/* Fast lanes */}
              <div className="a4 fast-lanes" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 40 }}>
                {[
                  { label: "I need to get work done",    href: workspaceHref,              color: "#1fbf9f", icon: "⚡" },
                  { label: "I need to make a decision",  href: "/decision-intelligence",   color: "#a78bfa", icon: "🧠" },
                  { label: "I am job hunting",           href: "/career",                  color: "#38bdf8", icon: "💼" },
                  { label: "I am learning BA",           href: "/learning",                color: "#fb923c", icon: "📚" },
                ].map(lane => (
                  <Link key={lane.label} href={lane.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--bg-2)", border: "1px solid var(--border)", textDecoration: "none", transition: "border-color .2s, background .2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `${lane.color}35`; (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-3)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-2)"; }}
                  >
                    <span style={{ fontSize: 15 }}>{lane.icon}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--t2)", lineHeight: 1.3 }}>{lane.label}</span>
                    <ChevronRight />
                  </Link>
                ))}
              </div>

              {/* Social proof */}
              <div className="a5" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex" }}>
                  {[["#a78bfa","rgba(167,139,250,.12)"],["#38bdf8","rgba(56,189,248,.12)"],["#1fbf9f","rgba(31,191,159,.12)"],["#fb923c","rgba(251,146,60,.12)"],["#f87171","rgba(248,113,113,.12)"]].map(([c,bg], i) => (
                    <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--bg)", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, color: c, marginLeft: i > 0 ? -8 : 0 }}>BA</div>
                  ))}
                </div>
                <div>
                  <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>{[1,2,3,4,5].map(i => <StarIcon key={i} />)}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)" }}><strong style={{ color: "var(--t2)" }}>Trusted by BA practitioners</strong> across banking, energy and tech</div>
                </div>
              </div>
            </div>

            {/* Right — Intelligence Demo */}
            <div className="a5"><IntelligenceDemo /></div>
          </div>
        </div>
      </section>

      {/* ── TICKER ───────────────────────────────────────────────────────── */}
      <Ticker />

      {/* ── THE FOUR MODULES ─────────────────────────────────────────────── */}
      <section id="modules" style={{ padding: "90px 0 70px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={modulesReveal.ref} style={{ ...modulesReveal.style, textAlign: "center", marginBottom: 52 }}>
            <Eyebrow>The Platform</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 16 }}>
              One place for everything a BA needs
            </h2>
            <p style={{ fontSize: 16, color: "var(--t2)", maxWidth: 500, margin: "0 auto", lineHeight: 1.68 }}>
              From the work on your desk today to the role you want next. All six modules serve a single purpose — making your life as a BA easier.
            </p>
          </div>

          <div className="module-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              {
                href: workspaceHref,
                color: "#1fbf9f",
                title: "BA Workspace",
                tag: "Daily Driver",
                desc: "Paste anything — notes, a problem, a transcript. Get a complete, connected set of BABOK-aligned deliverables.",
                tools: ["Problem Analyzer", "User Story Generator", "BRD / FRD", "Process Analyzer"],
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
              },
              {
                href: workspaceHref,
                color: "#a78bfa",
                title: "Decision Intelligence",
                tag: "Differentiator",
                desc: "Bring a real business problem. The platform reasons through it like a senior BA — root causes, risks, options, and a recommendation.",
                tools: ["Root Cause Analysis", "Solution Evaluator", "Risk Radar", "Stakeholder Intelligence"],
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
              },
              {
                href: "/career",
                color: "#38bdf8",
                title: "Career Hub",
                tag: "For Every Stage",
                desc: "Resume analyzer, job match scoring, interview copilot, and portfolio builder — all optimized specifically for BA roles.",
                tools: ["Resume Analyzer", "Job Match Analyzer", "Interview Copilot", "Portfolio Builder"],
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" width="22" height="22"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
              },
              {
                href: "/learning",
                color: "#fb923c",
                title: "Learning Hub",
                tag: "Aspiring BAs",
                desc: "Structured paths from beginner to advanced. Learning happens as a byproduct of real work — every output explains why it was built that way.",
                tools: ["Beginner Path", "Intermediate Path", "Advanced Path", "BABOK Foundations"],
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
              },
              {
                href: "/scenarios",
                color: "#facc15",
                title: "Practice Lab",
                tag: "Build Confidence",
                desc: "Simulate real stakeholder conversations, discovery workshops, and elicitation sessions. For the BA who learns best by doing.",
                tools: ["Stakeholder Simulator", "Workshop Simulator", "Elicitation Practice", "Conflict Scenarios"],
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
              },
              {
                href: workspaceHref,
                color: "#f87171",
                title: "Template Studio",
                tag: "Your Standards",
                desc: "Start from BABOK-compliant templates. Customise them to your organisation's format. Save and reuse them forever.",
                tools: ["Generic Templates", "Org Customiser", "Saved Templates", "Team Sharing"],
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
              },
            ].map(card => (
              <Link key={card.title} href={card.href} style={{ textDecoration: "none", display: "block" }}>
                <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "32px 28px", position: "relative", overflow: "hidden", transition: "border-color .2s, background .2s", cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${card.color}30`; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; }}
                >
                  <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(ellipse, ${card.color}08 0%, transparent 65%)`, pointerEvents: "none" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: `${card.color}12`, border: `1px solid ${card.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {card.icon}
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, padding: "3px 9px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: `${card.color}10`, color: card.color, border: `1px solid ${card.color}20` }}>{card.tag}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 10, letterSpacing: "-0.02em" }}>{card.title}</div>
                  <p style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.68, marginBottom: 20, flex: 1 }}>{card.desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                    {card.tools.map(t => (
                      <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: `${card.color}08`, color: "var(--t3)", border: `1px solid ${card.color}14` }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: card.color }}>
                    Explore <ArrowRight size={13} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 80px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={statsReveal.ref} style={{ ...statsReveal.style, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {[
              { val: "15+",  label: "Deliverable Types",  sub: "BRD, FRD, User Stories, Stakeholder Maps and more" },
              { val: "6",    label: "Intelligent Modules", sub: "Workspace, Career, Decision, Learning, Practice, Templates" },
              { val: "100%", label: "BABOK Aligned",       sub: "Every output follows BABOK knowledge areas" },
              { val: "3",    label: "Personas Served",     sub: "Aspiring · Practicing · Senior BA" },
            ].map((s, i) => (
              <div key={i} style={{ background: "var(--bg-1)", padding: "36px 28px", textAlign: "center", transition: "background .2s", cursor: "default" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-1)")}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 800, color: "var(--teal)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{s.val}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)", lineHeight: 1.5 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW THE INTELLIGENCE ENGINE WORKS ────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={hiwReveal.ref} style={{ ...hiwReveal.style, textAlign: "center", marginBottom: 64 }}>
            <Eyebrow>The Intelligence Engine</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)", marginBottom: 16 }}>
              It does not generate. It thinks first.
            </h2>
            <p style={{ fontSize: 16, color: "var(--t2)", maxWidth: 520, margin: "0 auto", lineHeight: 1.68 }}>
              Most AI tools produce output the moment you hit enter. This one behaves like a senior BA — it interrogates before it builds, so what it builds is actually right.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, position: "relative" }}>
            <div style={{ position: "absolute", top: 44, left: "calc(12.5% + 10px)", right: "calc(12.5% + 10px)", height: 1, background: "linear-gradient(to right, transparent 0%, rgba(31,191,159,.25) 15%, rgba(31,191,159,.25) 85%, transparent 100%)", pointerEvents: "none", zIndex: 0 }} />

            {[
              { num: "01", color: "#1fbf9f", title: "You bring the situation",  desc: "Paste meeting notes, type a problem, describe a situation. No forms. No structure required. Just your words." },
              { num: "02", color: "#38bdf8", title: "The engine interrogates",  desc: "Before building anything, the engine asks exactly what a senior BA would ask — filling the gaps, challenging assumptions." },
              { num: "03", color: "#a78bfa", title: "Everything is connected",  desc: "Artifacts are not produced in isolation. Every user story links to a requirement. Every requirement links to a business problem." },
              { num: "04", color: "#fb923c", title: "You walk away with work",  desc: "BABOK-compliant deliverables, ready to use. Plus explanations of why each section was built the way it was." },
            ].map((step, i) => (
              <div key={step.num} style={{ position: "relative", zIndex: 1 }}>
                <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "28px 24px", height: "100%", transition: "border-color .2s, background .2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${step.color}30`; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${step.color}12`, border: `2px solid ${step.color}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: step.color }}>
                    {step.num}
                  </div>
                  {i < 3 && (
                    <div style={{ position: "absolute", top: 44, right: -8, width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(31,191,159,0.35)" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700, color: "var(--t1)", marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{step.title}</div>
                  <div style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Traceability callout */}
          <div style={{ marginTop: 24, background: "rgba(31,191,159,.03)", border: "1px solid rgba(31,191,159,.12)", borderRadius: "var(--radius)", padding: "28px 36px", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--teal)", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>Full Traceability</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
              {["Business Problem", "Stakeholders", "Requirements", "User Stories", "Acceptance Criteria", "Risks", "Business Case"].map((item, i, arr) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, color: "var(--t2)", padding: "4px 10px", borderRadius: 7, background: "var(--bg-2)", border: "1px solid var(--border)" }}>{item}</span>
                  {i < arr.length - 1 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--t3)", maxWidth: 260, lineHeight: 1.6 }}>Every artifact links back to the one above it. Nothing exists in isolation.</div>
          </div>
        </div>
      </section>

      {/* ── FEATURE SHOWCASE ─────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={featuresReveal.ref} style={{ ...featuresReveal.style, textAlign: "center", marginBottom: 56 }}>
            <Eyebrow>What You Can Do</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)" }}>
              The tools that matter most to a BA
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>

            {/* Large feature — Intelligence Engine */}
            <div style={{ gridRow: "1 / 3", background: "var(--bg-1)", border: "1px solid rgba(31,191,159,.14)", borderRadius: "var(--radius-xl)", padding: "44px 40px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,191,159,.07) 0%, transparent 65%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--teal), transparent)" }} />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--teal)", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 14 }}>Core Feature</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.03em", marginBottom: 16, lineHeight: 1.15 }}>
                From a sentence to a full BA package
              </div>
              <p style={{ fontSize: 15, color: "var(--t2)", lineHeight: 1.72, marginBottom: 32, flex: 1 }}>
                Enter any business problem in plain language. The Intelligence Engine asks clarifying questions, then produces a Problem Statement, Stakeholder Map, Root Cause Analysis, Requirements, User Stories, and a Business Case — all linked together.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {[
                  { input: "Customer onboarding takes 15 days",    output: "Problem statement + root causes + stakeholder map + requirements" },
                  { input: "Stakeholders disagree on priorities",   output: "Influence matrix + alignment strategies + communication plan" },
                  { input: "Messy meeting notes from a workshop",   output: "Action items + decisions log + functional requirements" },
                ].map((ex, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--t2)", flex: 1, minWidth: 0 }}>&ldquo;{ex.input}&rdquo;</div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--teal)", flex: 1, minWidth: 0 }}>{ex.output}</div>
                  </div>
                ))}
              </div>
              <Link href={workspaceHref} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "13px 24px", borderRadius: "var(--radius-sm)", textDecoration: "none", transition: "background .2s", alignSelf: "flex-start" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; }}
              >
                Open the Workspace <ArrowRight size={14} />
              </Link>
            </div>

            {/* Resume Analyzer */}
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "32px 32px", position: "relative", overflow: "hidden", transition: "border-color .2s, background .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(56,189,248,.25)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--t1)", marginBottom: 8 }}>Resume Analyzer</div>
              <p style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65, marginBottom: 16 }}>Upload your resume. Get an ATS score, a BA competency score, missing keywords, and specific improvement recommendations.</p>
              <Link href="/career" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#38bdf8", textDecoration: "none" }}>
                Go to Career Hub <ChevronRight />
              </Link>
            </div>

            {/* Interview Copilot */}
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "32px 32px", position: "relative", overflow: "hidden", transition: "border-color .2s, background .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(167,139,250,.25)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--t1)", marginBottom: 8 }}>Interview Copilot</div>
              <p style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65, marginBottom: 16 }}>Paste a job description. Get tailored STAR responses, likely scenario questions, and coached answers ready before your interview.</p>
              <Link href="/interview" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#a78bfa", textDecoration: "none" }}>
                Prep for my interview <ChevronRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ───────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={industriesReveal.ref} style={{ ...industriesReveal.style, textAlign: "center", marginBottom: 44 }}>
            <Eyebrow>Industry Coverage</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--t1)" }}>
              Optimized for your industry
            </h2>
            <p style={{ fontSize: 15, color: "var(--t2)", maxWidth: 480, margin: "16px auto 0", lineHeight: 1.68 }}>
              The Intelligence Engine understands that a banking BRD looks different from a healthcare one. Context matters. Output reflects it.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
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
            +6 more industries on the roadmap
          </p>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
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
              plan="Free" price="$0" period="forever" href="/auth/signup" cta="Get Started" featured={false}
              features={[
                "BA Workspace — 5 analyses per month",
                "User Story Generator",
                "Resume Analyzer",
                "Beginner Learning Path",
                "3 Practice Lab simulations",
                "Generic template library",
              ]}
            />
            <PricingCard
              plan="Pro" price={billingAnnual ? "$19" : "$29"} period={billingAnnual ? "/mo · billed annually" : "/month"} href="/pricing" cta="Upgrade to Pro" featured={true}
              features={[
                "Unlimited BA Workspace analyses",
                "Full Decision Intelligence suite",
                "Complete Career Hub (resume, interview, portfolio)",
                "All learning paths — beginner to advanced",
                "Unlimited Practice Lab simulations",
                "Template Studio with org customisation",
                "Full traceability across all deliverables",
                "Priority support",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px" }}>
          <div ref={finalReveal.ref} style={{ ...finalReveal.style, background: "rgba(31,191,159,.04)", border: "1px solid rgba(31,191,159,.14)", borderRadius: "var(--radius-xl)", padding: "88px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 340, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,191,159,.08) 0%, transparent 65%)", filter: "blur(40px)", pointerEvents: "none" }} />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.04em", marginBottom: 18, position: "relative" }}>
              Bring your next<br />problem here.
            </h2>
            <p style={{ fontSize: 17, color: "var(--t2)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 38px", position: "relative" }}>
              The most senior BA in the room is waiting. Start in under 60 seconds.
            </p>
            <Link href={workspaceHref} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#041a13", background: "var(--teal)", padding: "17px 36px", borderRadius: 14, textDecoration: "none", transition: "all .2s", boxShadow: "0 0 52px rgba(31,191,159,.28)", position: "relative" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal-hi)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 56px rgba(31,191,159,.38)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--teal)"; (e.currentTarget as HTMLAnchorElement).style.transform = "none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 52px rgba(31,191,159,.28)"; }}
            >
              Open the Workspace <ArrowRight size={19} />
            </Link>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--t4)", marginTop: 14 }}>
              Free forever · No credit card required · Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--bg-1)", padding: "44px 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: "var(--t1)" }}>
            <LogoMark size={26} />
            The<span style={{ color: "var(--teal)" }}>BA</span>Portal
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              ["Workspace", workspaceHref],
              ["Career Hub", "/career"],
              ["Learning", "/learning"],
              ["Practice Lab", "/scenarios"],
              ["Jobs", "/opportunities"],
              ["Pricing", "#pricing"],
              ["FAQ", "/faq"],
              ["Contact", "/contact"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
            ].map(([l, href]) => (
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
