"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";

// ── Lifecycle stages — real product concepts, not decorative art ──────────────
const LIFECYCLE = [
  { label: "Problem Analysis",     icon: "doc" },
  { label: "Stakeholder Analysis", icon: "people" },
  { label: "Requirements",         icon: "list" },
  { label: "User Stories",         icon: "bookmark" },
  { label: "Process Analysis",     icon: "activity" },
  { label: "Testing",              icon: "check" },
];

// ── A marketing preview of a real Decision Lab output — Compare Options mode,
// same shape the tool actually produces, not an invented capability. ────────
const DECISION_SCENARIO = {
  question: "Should we replace the legacy scheduling platform?",
  options: [
    {
      label: "Standalone platform", tag: null,
      items: [{ text: "Lower cost", level: "good" }, { text: "Higher risk", level: "bad" }, { text: "Limited scalability", level: "bad" }],
    },
    {
      label: "ERP module", tag: "Recommended",
      items: [{ text: "Moderate cost", level: "mid" }, { text: "Lower risk", level: "good" }, { text: "Stronger fit", level: "good" }],
    },
    {
      label: "Custom build", tag: null,
      items: [{ text: "Higher cost", level: "bad" }, { text: "Higher risk", level: "bad" }, { text: "Longer timeframe", level: "bad" }],
    },
  ],
  recommendation: "ERP module",
};

const LEVEL_COLOR: Record<string, string> = { good: "#16a34a", mid: "#d97706", bad: "#dc2626" };

const TEMPLATE_PREVIEWS = [
  { label: "Business Requirements Document",   kind: "doc",   color: "#1fbf9f" },
  { label: "Functional Requirements Document", kind: "doc",   color: "#38bdf8" },
  { label: "Requirements Traceability Matrix", kind: "table", color: "#a78bfa" },
];

// ── A marketing preview of a coming capability — NOT a built feature yet.
// Shape mirrors the real workstreams (requirements, user stories, process,
// gap-checking) that already exist in Project Workspace, so the preview
// stays honest about what "same project context" actually means today. ────
const BA_INTEL_SOURCE = "Stakeholder Workshop Transcript";

const BA_INTEL_FINDINGS = [
  { count: 14, label: "Potential Requirements",       color: "#0e9c81" },
  { count: 6,  label: "Business Rules",                color: "#38bdf8" },
  { count: 3,  label: "Unresolved Questions",          color: "#d97706" },
  { count: 2,  label: "Stakeholder Contradictions",    color: "#dc2626" },
  { count: 4,  label: "Possible Edge Cases",           color: "#a78bfa" },
];

const BA_INTEL_ACTIONS = ["Review Requirements", "Generate User Stories", "Create Process Flow", "Check for Gaps"];

const DECISION_MODES = [
  { label: "Compare Options",          desc: "Weigh 2–3 choices and get a reasoned recommendation.", color: "#a78bfa" },
  { label: "Assess Risks",             desc: "Build a risk register anchored in your actual situation.", color: "#f472b6" },
  { label: "Challenge Assumptions",    desc: "Surface stated and hidden assumptions before they cost you.", color: "#60a5fa" },
  { label: "Stakeholder Intelligence", desc: "Map influence and likely objections before you present.", color: "#34d399" },
  { label: "Decision Explorer",        desc: "Ask follow-up questions against the same analysis.", color: "#fbbf24" },
];

const TEMPLATES = ["BRD", "FRD", "Use Cases", "RACI", "Business Case", "RTM"];

// ── Hero-only content — the connected-workflow panel and value strip ────────
const WORKFLOW_STAGES = [
  { label: "Business Need",         done: true },
  { label: "Stakeholder Analysis",  done: true },
  { label: "Requirements",          done: true },
  { label: "User Stories",          done: true },
  { label: "Process Analysis",      done: true },
  { label: "Testing",               done: false },
];

const VALUE_ITEMS = [
  { icon: "doc",    text: "Turn complexity into clarity" },
  { icon: "people", text: "Work with full context" },
  { icon: "bolt",   text: "Move faster with confidence" },
  { icon: "chart",  text: "Deliver measurable business value" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

// ── Icons ───────────────────────────────────────────────────────────────────
function ArrowRight({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const VALUE_ICONS: Record<string, React.ReactNode> = {
  doc: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  people: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  bolt: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

const LIFECYCLE_ICONS: Record<string, React.ReactNode> = {
  doc: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  people: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  list: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  bookmark: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  activity: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

function PlayCircle({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: "rgba(31,191,159,0.16)", border: "1px solid rgba(31,191,159,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace", fontSize: size * 0.34, fontWeight: 700, color: "#2ddbb8",
    }}>
      BA
    </div>
  );
}

// ── Layer 1 — slow drifting colour clouds, the "atmosphere" behind everything ─
function AuroraLayer() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div className="aurora-blob aurora-1" />
      <div className="aurora-blob aurora-2" />
      <div className="aurora-blob aurora-3" />
    </div>
  );
}

// ── Layer 2 — a living constellation of connected work, hand-built in canvas ──
// There's no licensed footage to drop in here, so this stands in for a video
// background: continuous motion, parallax to the cursor, always on.
function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = ["#1fbf9f", "#7c3aed", "#38bdf8", "#f59e0b"];
    let particles: { x: number; y: number; vx: number; vy: number; r: number; color: string }[] = [];
    let raf = 0;
    let mouse = { x: -9999, y: -9999 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const count = Math.min(85, Math.max(40, Math.floor(window.innerWidth / 17)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 1.5 + 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    function frame() {
      const w = window.innerWidth, h = window.innerHeight;
      ctx!.clearRect(0, 0, w, h);

      if (!prefersReduced) {
        for (const p of particles) {
          p.x += p.vx; p.y += p.vy;
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14000) { p.x += dx * 0.0025; p.y += dy * 0.0025; }
          if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
        }
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx!.strokeStyle = `rgba(45,219,184,${0.16 * (1 - dist / 130)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx!.beginPath();
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = 0.9;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      if (!prefersReduced) raf = requestAnimationFrame(frame);
    }
    frame();

    function onResize() { resize(); }
    function onMove(e: MouseEvent) { mouse = { x: e.clientX, y: e.clientY }; }
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} aria-hidden="true" />;
}

// ── Layer 3 — a whisper of film grain for texture ────────────────────────────
function GrainLayer() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2, opacity: 0.05, pointerEvents: "none", mixBlendMode: "overlay",
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    }} />
  );
}

// ── Kinetic headline — lines rise from behind a mask, film-title style ───────
function KineticHeadline({ lines }: { lines: { text: string; color?: string }[] }) {
  return (
    <h1 style={{
      fontFamily: "'Inter','Open Sans',sans-serif", fontWeight: 800,
      fontSize: "clamp(34px, 4.6vw, 54px)", lineHeight: 1.1, letterSpacing: "-0.03em",
      color: "#f8f8fb", margin: "0 0 20px",
    }}>
      {lines.map((line, i) => (
        <span key={i} style={{ display: "block", overflow: "hidden" }}>
          <motion.span
            style={{ display: "block", color: line.color }}
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: EASE }}
          >
            {line.text}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

// ── Cinematic clip — real footage of real people, not a photo trick. Muted
// autoplay + loop is required for browsers to allow autoplay at all, which
// is exactly right for a decorative background element with no need for sound.
function CinematicPortrait({ src, poster, focus = "55% 35%" }: { src: string; poster?: string; focus?: string }) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)" }}>
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: focus }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(8,8,11,0.5) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 60px rgba(0,0,0,0.35)", pointerEvents: "none" }} />
    </div>
  );
}

// ── Hero cinematic background — the hero's own supplied clip, full-bleed.
// Nothing floats on top of it as a "player"; it IS the scene. Graded down
// (dimmer, slightly desaturated, a hair of blur) so it reads as atmosphere,
// not as competing content, then layered with gradients for text contrast.
// Falls back to a static frame for prefers-reduced-motion instead of autoplaying.
function HeroCinematicVideo() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const frameStyle: React.CSSProperties = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover", objectPosition: "62% 30%",
    filter: "brightness(0.6) saturate(0.82) blur(0.5px)",
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }} aria-hidden="true">
      {reducedMotion ? (
        <img src="/photos/hero-video-poster.jpg" alt="" style={frameStyle} />
      ) : (
        <video autoPlay muted loop playsInline preload="metadata" poster="/photos/hero-video-poster.jpg" style={frameStyle}>
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      )}
      {/* left-to-right scrim — dark where the copy sits, clear where the scene reads */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(6,9,10,0.94) 0%, rgba(6,9,10,0.82) 28%, rgba(6,9,10,0.5) 52%, rgba(6,9,10,0.18) 75%, rgba(6,9,10,0.05) 100%)" }} />
      {/* top/bottom vignette — settles the nav seam and the value strip */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,8,10,0.55) 0%, transparent 18%, transparent 72%, rgba(5,8,10,0.75) 100%)" }} />
      {/* a whisper of brand teal to keep the grade on-identity rather than generic grey */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 70% at 15% 30%, rgba(31,191,159,0.1), transparent 60%)" }} />
      {/* full-bleed fade to the page's own dark base at the very bottom, so the seam into Lifecycle is invisible */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "18%", background: "linear-gradient(180deg, transparent, #08080b)" }} />
    </div>
  );
}

// ── Connected-workflow panel — a demonstration of the lifecycle, not nav ─────
function WorkflowPanel() {
  return (
    // Plain div owns the absolute positioning + vertical centering (top:50%
    // + translateY(-50%)). That has to live outside the motion.div: Framer
    // Motion writes its own `transform` for the x/y entrance animation and
    // clobbers any literal transform string set alongside it, which is why
    // this panel used to render at top:50% with the centering offset silently
    // dropped — it looked "too low" because it never actually got its -50%.
    <div className="home-workflow-panel" style={{ position: "absolute", right: "6%", top: "50%", transform: "translateY(-50%)", zIndex: 2, width: 240 }}>
      <motion.div
        initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
        style={{
          background: "rgba(14,18,20,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.55)",
        }}
      >
      {WORKFLOW_STAGES.map((s, i) => (
        <div key={s.label} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8,
          borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
        }}>
          {s.done ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" fill="rgba(45,219,184,0.16)" stroke="#2ddbb8" strokeWidth="1.5" />
              <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#2ddbb8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
          )}
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: s.done ? "#f0f0f4" : "#8a8aa0" }}>{s.label}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </div>
      ))}
      </motion.div>
    </div>
  );
}

// ── Value strip — four short proofs, not four cards ──────────────────────────
function ValueStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
      className="home-value-strip"
      style={{ position: "relative", zIndex: 2, padding: "0 48px" }}
    >
      <div className="home-value-row" style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0" }}>
        {VALUE_ITEMS.map((item, i) => (
          <div key={item.text} className="home-value-item" style={{
            display: "flex", alignItems: "center", gap: 10, padding: "0 22px",
            borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.14)",
          }}>
            <span style={{ color: "#2ddbb8", flexShrink: 0 }}>{VALUE_ICONS[item.icon]}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#dcdce4", lineHeight: 1.3, maxWidth: 150 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Lifecycle — one connected journey: a thin rail, restrained circular
// markers, and a teal fill that advances as the visitor scrolls through it.
// The first stage reads as "you start here" (solid, always active); the fill
// sweeping across is the "sequential progression" — one purposeful moving
// element, not six cards each animating independently. ──────────────────────
function LifecycleJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.6"] });
  const fillSize = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="home-journey" style={{ position: "relative", padding: "8px 0" }}>
      <div className="home-journey-rail" style={{ position: "absolute", background: "var(--lc-border)", borderRadius: 2 }} />
      <motion.div className="home-journey-fill" style={{ position: "absolute", background: "linear-gradient(90deg, #1fbf9f, #2ddbb8)", borderRadius: 2, width: fillSize }} />

      <div className="home-journey-row" style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${LIFECYCLE.length}, 1fr)` }}>
        {LIFECYCLE.map((stage, i) => (
          <motion.div
            key={stage.label}
            className="home-journey-node"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: i === 0 ? "#1fbf9f" : "var(--lc-surface)",
              border: i === 0 ? "none" : "1.5px solid var(--lc-border)",
              color: i === 0 ? "#ffffff" : "var(--lc-text-4)",
              boxShadow: i === 0 ? "0 6px 16px -4px rgba(31,191,159,0.55)" : "0 1px 3px rgba(15,23,42,0.05)",
            }}>
              {LIFECYCLE_ICONS[stage.icon]}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--lc-text-2)", textAlign: "center", lineHeight: 1.35, maxWidth: 96 }}>
              {stage.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Decision Lab preview — a real Compare Options output shape, staged as a
// marketing screenshot: dark surface, on purpose, for contrast against the
// light section around it. Not a live tool, not an invented capability. ────
function DecisionPreviewPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: EASE }}
      style={{
        background: "#0e0e12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px",
        boxShadow: "0 30px 70px -24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(45,219,184,0.16)", border: "1px solid rgba(45,219,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2ddbb8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f2f2f8", flex: 1 }}>Decision Explorer</span>
        <span style={{ fontSize: 11.5, color: "#8a8aa0", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /></svg>
          Share
        </span>
        <span style={{ color: "#5a5a68", fontSize: 15, letterSpacing: "1px" }}>⋯</span>
      </div>

      <p style={{ fontSize: 14.5, fontWeight: 700, color: "#f2f2f8", marginBottom: 16, lineHeight: 1.4 }}>{DECISION_SCENARIO.question}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }} className="home-decision-options">
        {DECISION_SCENARIO.options.map(opt => (
          <div key={opt.label} style={{
            background: opt.tag ? "rgba(45,219,184,0.07)" : "rgba(255,255,255,0.03)",
            border: opt.tag ? "1px solid rgba(45,219,184,0.28)" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "12px 12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f2f2f8", lineHeight: 1.3 }}>{opt.label}</span>
              {opt.tag && (
                <span style={{ fontSize: 8.5, fontWeight: 700, color: "#2ddbb8", background: "rgba(45,219,184,0.16)", border: "1px solid rgba(45,219,184,0.3)", borderRadius: 4, padding: "1px 5px", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {opt.tag}
                </span>
              )}
            </div>
            {opt.items.map(it => (
              <div key={it.text} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: LEVEL_COLOR[it.level], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#a8a8ba" }}>{it.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(45,219,184,0.09)", border: "1px solid rgba(45,219,184,0.25)", borderRadius: 10, padding: "10px 14px" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#2ddbb8" stroke="none" style={{ flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#2ddbb8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 1 }}>Recommended direction</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f2f2f8" }}>{DECISION_SCENARIO.recommendation}</div>
        </div>
        <ArrowRight size={15} />
      </div>
    </motion.div>
  );
}

// ── Templates preview — a light fan of real document shapes, not icons ──────
function TemplatePreviewCards() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 340, height: 240, margin: "0 auto" }}>
      {TEMPLATE_PREVIEWS.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
          style={{
            position: "absolute", top: i * 14, left: i * 26, width: 220,
            background: "#ffffff", border: "1px solid var(--lc-border-soft)", borderRadius: 10, padding: "16px 16px",
            boxShadow: "0 16px 40px -14px rgba(15,23,42,0.18)",
            transform: `rotate(${(i - 1) * 3}deg)`, zIndex: i,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: `${t.color}18`, border: `1px solid ${t.color}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lc-text-2)", lineHeight: 1.25 }}>{t.label}</span>
          </div>
          {t.kind === "table" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {Array.from({ length: 9 }).map((_, k) => (
                <div key={k} style={{ height: 8, borderRadius: 2, background: k < 3 ? "var(--lc-border)" : "var(--lc-faint)", border: "1px solid var(--lc-border-soft)" }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[100, 85, 92, 70, 88].map((w, k) => (
                <div key={k} style={{ height: 5, borderRadius: 3, background: "var(--lc-border)", width: `${w}%` }} />
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}


// ── BA Intelligence preview — a coming capability, staged honestly as a
// marketing screenshot of an analysis workspace, not a chatbot and not a
// live tool. Every action row reads from the same source at the top, which
// is the one idea this panel exists to communicate. ─────────────────────────
function BAIntelligencePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, ease: EASE }}
      style={{
        background: "#0e0e12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px",
        boxShadow: "0 30px 70px -24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(45,219,184,0.16)", border: "1px solid rgba(45,219,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2ddbb8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f2f2f8", flex: 1 }}>Analysis Workspace</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#8a8aa0", letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 4, padding: "3px 6px" }}>
          BA Intelligence
        </span>
      </div>

      {/* Source */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "11px 14px", marginBottom: 14 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a8aa0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#d4d4dc" }}>{BA_INTEL_SOURCE}</span>
      </div>

      {/* Findings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {BA_INTEL_FINDINGS.map(f => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "3px 0" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: "#f2f2f8", flexShrink: 0, width: 18 }}>{f.count}</span>
            <span style={{ fontSize: 12, color: "#a8a8ba" }}>{f.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
        <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#5a5a68", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Same project context
        </span>
        <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
      </div>

      {/* Linked actions — all read from the transcript + findings above */}
      <div className="home-baintel-actions" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {BA_INTEL_ACTIONS.map(a => (
          <div key={a} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            background: "rgba(45,219,184,0.06)", border: "1px solid rgba(45,219,184,0.2)", borderRadius: 8, padding: "10px 12px",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#e4e4ec" }}>{a}</span>
            <ArrowRight size={12} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── A running document-index mark used to structure each light section ──────
function SectionMark({ n, of, label }: { n: number; of: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 22 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: "#0e9c81", flexShrink: 0 }}>
        {String(n).padStart(2, "0")}<span style={{ color: "var(--lc-text-5)" }}>/{String(of).padStart(2, "0")}</span>
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--lc-text-4)", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--lc-border)" }} />
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"unknown" | "out" | "in">("unknown");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Session presence only — never fetches project or business data on this
  // public page. Used solely to swap CTA copy between logged-out and
  // logged-in states.
  useEffect(() => {
    let active = true;
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        if (active) setAuthState(data.session ? "in" : "out");
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setAuthState(session ? "in" : "out");
      });
      return () => sub.subscription.unsubscribe();
    });
    return () => { active = false; };
  }, []);

  const loggedIn = authState === "in";
  const primaryHref = loggedIn ? "/projects" : "/auth/signup";
  const primaryLabel = loggedIn ? "Open Projects" : "Start a project";

  async function signOut() {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <div style={{ background: "#08080b", minHeight: "100vh", fontFamily: "'Open Sans', sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <AuroraLayer />
      <CinematicBackground />
      <GrainLayer />

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,8,11,0.75)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 61, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <LogoMark />
            <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 15, color: "#f0f0f4", letterSpacing: "-0.02em" }}>
              The<span style={{ color: "#2ddbb8" }}>BA</span>Portal
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 28 }} className="home-nav-links">
            <a href="#lifecycle" style={{ fontSize: 13.5, color: "#9090a0", textDecoration: "none" }}>Product</a>
            <a href="#decision-lab" style={{ fontSize: 13.5, color: "#9090a0", textDecoration: "none" }}>Decision Lab</a>
            <Link href="/templates" style={{ fontSize: 13.5, color: "#9090a0", textDecoration: "none" }}>Templates</Link>
            <Link href="/pricing" style={{ fontSize: 13.5, color: "#9090a0", textDecoration: "none" }}>Pricing</Link>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }} className="home-nav-cta">
            {loggedIn ? (
              <>
                <button onClick={signOut} style={{ fontSize: 13, color: "#9090a0", background: "none", border: "none", cursor: "pointer" }}>Sign out</button>
                <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#05120f", background: "#2ddbb8", padding: "9px 16px", borderRadius: 6, textDecoration: "none" }}>
                  Open Projects
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" style={{ fontSize: 13, color: "#9090a0", textDecoration: "none" }}>Sign in</Link>
                <Link href="/auth/signup" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#05120f", background: "#2ddbb8", padding: "9px 16px", borderRadius: 6, textDecoration: "none" }}>
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileNavOpen(v => !v)}
            className="home-mobile-toggle"
            style={{ display: "none", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, width: 36, height: 36, color: "#f0f0f4", cursor: "pointer" }}
          >
            ☰
          </button>
        </div>

        {mobileNavOpen && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            <a href="#lifecycle" onClick={() => setMobileNavOpen(false)} style={{ fontSize: 14, color: "#c8c8d4", textDecoration: "none" }}>Product</a>
            <a href="#decision-lab" onClick={() => setMobileNavOpen(false)} style={{ fontSize: 14, color: "#c8c8d4", textDecoration: "none" }}>Decision Lab</a>
            <Link href="/templates" style={{ fontSize: 14, color: "#c8c8d4", textDecoration: "none" }}>Templates</Link>
            <Link href="/pricing" style={{ fontSize: 14, color: "#c8c8d4", textDecoration: "none" }}>Pricing</Link>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
            {loggedIn ? (
              <Link href="/projects" style={{ fontSize: 14, fontWeight: 700, color: "#2ddbb8", textDecoration: "none" }}>Open Projects</Link>
            ) : (
              <>
                <Link href="/auth/login" style={{ fontSize: 14, color: "#c8c8d4", textDecoration: "none" }}>Sign in</Link>
                <Link href="/auth/signup" style={{ fontSize: 14, fontWeight: 700, color: "#2ddbb8", textDecoration: "none" }}>Get started</Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* ── Hero — full-bleed cinematic environment ──
          Vertical rhythm is a single flex column so the layers below (value
          row, scroll cue) can never overlap the copy above, regardless of
          viewport height: copy gets the flexible middle (flex: 1, centered
          within it), the bottom block just takes its natural height at the
          end of the column. The workflow panel is the one genuinely
          absolutely-positioned element, anchored to the full-height section
          itself (not the copy wrap, which is only as tall as its own text —
          that mismatch was why it used to drift low). */}
      <section className="home-hero" style={{ position: "relative", zIndex: 1, minHeight: "calc(100vh - 61px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <HeroCinematicVideo />
        <WorkflowPanel />

        <div className="home-hero-wrap" style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", maxWidth: 1400, margin: "0 auto", padding: "0 48px" }}>
          <div className="home-hero-copy" style={{ maxWidth: 600 }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
              style={{ marginBottom: 22 }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#2ddbb8" }}>
                The connected workspace for business analysts
              </span>
            </motion.div>

            <KineticHeadline lines={[
              { text: "From insight" },
              { text: "to impact." },
              { text: "All in one place.", color: "#2ddbb8" },
            ]} />

            <motion.p
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
              style={{ fontSize: 16.5, lineHeight: 1.7, color: "#c4c4ce", maxWidth: 540, margin: "0 0 32px", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
            >
              Capture a business need once. Carry that context through stakeholder analysis, requirements, user stories,
              process analysis, and testing, so your work stays connected from problem to delivery.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.65, ease: EASE }}
              className="home-hero-cta" style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}
            >
              <Link href={primaryHref} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 8, background: "#2ddbb8",
                color: "#04140f", fontWeight: 700, fontSize: 15.5, textDecoration: "none",
                boxShadow: "0 0 0 1px rgba(45,219,184,0.4), 0 12px 30px -8px rgba(45,219,184,0.55)",
              }}>
                {primaryLabel} <ArrowRight />
              </Link>
              <a href="#lifecycle" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: 15, fontWeight: 700, color: "#f0f0f4", textDecoration: "none",
              }}>
                <PlayCircle /> See how it connects
              </a>
            </motion.div>
          </div>
        </div>

        {/* Bottom block — natural height, sits at the end of the column below
            the flexible copy area, so it can never overlap the CTA above it. */}
        <div style={{ position: "relative", zIndex: 2, flexShrink: 0, marginTop: 24, padding: "0 0 28px" }}>
          <ValueStrip />

          <motion.a
            href="#lifecycle"
            className="home-scroll-cue"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              margin: "22px auto 0", width: "fit-content",
              color: "#9090a0", textDecoration: "none",
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase" }}>Scroll to explore</span>
            <svg width="16" height="22" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="22" rx="7" /><line x1="8" y1="6" x2="8" y2="10" strokeLinecap="round" /></svg>
          </motion.a>
        </div>
      </section>

      {/* ── Lifecycle — pale icy blue, the first light surface after the hero ── */}
      <section id="lifecycle" style={{ position: "relative", zIndex: 1, background: "#eef4f8" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "88px 24px 80px" }}>
          <Reveal><SectionMark n={1} of={3} label="Connected Workflow" /></Reveal>

          <Reveal>
            <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--lc-text-1)", margin: "0 0 14px", lineHeight: 1.2, maxWidth: 620 }}>
              One business need.<br />One connected journey.
            </h2>
            <p style={{ fontSize: 15.5, color: "var(--lc-text-3)", lineHeight: 1.7, marginBottom: 56, maxWidth: 560 }}>
              Start where your project is. Approved context carries into whatever you work on next, so nothing gets re-explained from scratch.
            </p>
          </Reveal>

          <LifecycleJourney />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginTop: 64 }}>
            {[
              { title: "Describe the problem once", body: "A short problem statement becomes shared context the rest of your project can draw on." },
              { title: "Reuse what's already approved", body: "Approve a workstream's output and TheBAPortal carries it wherever it's relevant, no re-explaining, no copy-paste." },
              { title: "Export real deliverables", body: "Word-compatible documents you can hand to a sponsor, a delivery team, or a client, as-is." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "var(--lc-text-1)", marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "var(--lc-text-3)", lineHeight: 1.65, margin: 0 }}>{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Decision Lab — a subtly different cool neutral, dark preview panel for contrast ── */}
      <section id="decision-lab" style={{ position: "relative", zIndex: 1, background: "#eef1f2" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "88px 24px 96px" }}>
          <Reveal><SectionMark n={2} of={3} label="Decision Lab" /></Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 56, alignItems: "center" }} className="home-decision-grid">
            <Reveal>
              <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--lc-text-1)", margin: "0 0 16px", lineHeight: 1.2 }}>
                Some Business Analyst work isn't documentation.<br />It's judgement.
              </h2>
              <p style={{ fontSize: 15.5, color: "var(--lc-text-3)", lineHeight: 1.7, marginBottom: 28 }}>
                Compare options. Surface risks. Challenge assumptions. Understand stakeholders. Recommend a direction.
              </p>
              <Link href="/decision-lab" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: "#0e9c81", textDecoration: "none" }}>
                Open Decision Lab <ArrowRight size={14} />
              </Link>
            </Reveal>

            <Reveal delay={0.1}>
              <DecisionPreviewPanel />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── BA Intelligence — subtly warmer light than the two sections above,
          still calm and restrained. Replaces Templates as the third homepage
          chapter; Templates itself lives on unchanged at /templates. ── */}
      <section style={{ position: "relative", zIndex: 1, background: "#f6f1ea" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "88px 24px 96px" }}>
          <Reveal><SectionMark n={3} of={3} label="BA Intelligence" /></Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 56, alignItems: "center" }} className="home-decision-grid">
            <Reveal>
              <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--lc-text-1)", margin: "0 0 16px", lineHeight: 1.2 }}>
                Spend less time documenting.<br />Spend more time analysing.
              </h2>
              <p style={{ fontSize: 15.5, color: "var(--lc-text-3)", lineHeight: 1.7, marginBottom: 28 }}>
                Turn messy stakeholder input into structured analysis, surface what is missing, and move from
                conversation to requirements without starting from a blank page.
              </p>
              <Link href="/ba-intelligence" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: "#0e9c81", textDecoration: "none" }}>
                Open BA Intelligence <ArrowRight size={14} />
              </Link>
            </Reveal>

            <Reveal delay={0.1}>
              <BAIntelligencePreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Closing CTA — back onto the dark base; the fixed aurora/constellation
          layers show through naturally since this section paints no opaque
          background of its own. ── */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "120px 24px 110px", textAlign: "center" }}>
        <Reveal>
          <h2 style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", color: "#f8f8fb", marginBottom: 14 }}>
            Your next project starts with clarity.
          </h2>
          <p style={{ fontSize: 15, color: "#9090a8", marginBottom: 28 }}>
            Same context. Less rework. Greater impact.
          </p>
          <Link href={primaryHref} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 30px", borderRadius: 8, background: "#2ddbb8",
            color: "#04140f", fontWeight: 700, fontSize: 15.5, textDecoration: "none",
            boxShadow: "0 0 0 1px rgba(45,219,184,0.4), 0 12px 30px -8px rgba(45,219,184,0.55)",
          }}>
            {primaryLabel} <ArrowRight />
          </Link>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={22} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#9090a8" }}>TheBAPortal</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[["Pricing", "/pricing"], ["FAQ", "/faq"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([label, href]) => (
              <Link key={label} href={href} style={{ fontSize: 13, color: "#6b6b80", textDecoration: "none" }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        .aurora-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.32; }
        .aurora-1 { width: 520px; height: 520px; background: #1fbf9f; top: -12%; left: -10%; animation: auroraDrift1 26s ease-in-out infinite; }
        .aurora-2 { width: 480px; height: 480px; background: #7c3aed; top: 28%; right: -15%; animation: auroraDrift2 32s ease-in-out infinite; }
        .aurora-3 { width: 420px; height: 420px; background: #0ea5e9; bottom: -15%; left: 22%; animation: auroraDrift3 24s ease-in-out infinite; }
        @keyframes auroraDrift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,40px) scale(1.15); } }
        @keyframes auroraDrift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,60px) scale(1.1); } }
        @keyframes auroraDrift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-50px) scale(1.2); } }
        .home-journey-rail, .home-journey-fill { top: 19px; left: 8.333%; right: 8.333%; height: 3px; }
        @media (prefers-reduced-motion: reduce) {
          .aurora-1, .aurora-2, .aurora-3 { animation: none; }
        }
        @media (max-width: 1180px) {
          .home-workflow-panel { display: none !important; }
        }
        @media (max-width: 860px) {
          .home-nav-links, .home-nav-cta { display: none !important; }
          .home-mobile-toggle { display: flex !important; align-items: center; justify-content: center; }
          .home-decision-grid { grid-template-columns: 1fr !important; }
          .home-template-cards-order { order: 2; margin-top: 32px; }
          .home-hero { min-height: 0 !important; }
          .home-hero-wrap { padding: 32px 20px 24px !important; }
          .home-hero-copy { max-width: 100% !important; }
          .home-value-strip { padding: 0 20px !important; }
          .home-value-row { row-gap: 14px !important; }
          .home-value-item { flex: 1 1 45% !important; border-left: none !important; padding: 0 10px 0 0 !important; }
          .home-decision-options { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .home-journey-rail { left: 19px; right: auto; top: 8.333%; bottom: 8.333%; width: 3px; height: auto; }
          .home-journey-fill { display: none; }
          .home-journey-row { grid-template-columns: 1fr !important; row-gap: 28px; }
          .home-journey-node { flex-direction: row !important; justify-content: flex-start; text-align: left; gap: 16px !important; }
          .home-journey-node span { max-width: none !important; text-align: left !important; }
          .home-baintel-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
