"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const challenges = [
  {
    id: "banking-discovery",
    industry: "Banking",
    title: "GTBank Core Banking Migration",
    type: "Discovery",
    difficulty: "Normal",
    duration: "30–40 min",
    description: "A legacy core banking system is failing silently. Three executives each have a different diagnosis. Only one is right.",
    color: "#3b82f6",
    photo: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=600&q=80",
  },
  {
    id: "healthcare-requirements",
    industry: "Healthcare",
    title: "MediFlow EHR Requirements",
    type: "Requirements",
    difficulty: "Hard",
    duration: "35–45 min",
    description: "Document requirements for a hospital EHR overhaul. Clinicians want efficiency. Compliance wants everything in writing. You're in the middle.",
    color: "#10b981",
    photo: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80",
  },
  {
    id: "saas-elicitation-validation",
    industry: "Technology",
    title: "CloudSync Pro Migration",
    type: "Elicitation + Validation",
    difficulty: "Expert",
    duration: "45–60 min",
    description: "Interview four executives at a $3.4M SaaS migration. Then catch the errors a junior analyst planted in the requirements doc.",
    color: "#1fbf9f",
    photo: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Pick a Challenge",
    body: "7 scenarios across Banking, Healthcare, Energy, SaaS, and Insurance. Each one is a real-world BA situation — not a quiz.",
  },
  {
    step: "02",
    title: "Interview AI Stakeholders",
    body: "Ask questions. The stakeholders push back, contradict each other, and withhold information — just like real projects.",
  },
  {
    step: "03",
    title: "Submit Your Deliverable",
    body: "Write your BRD, requirements doc, or analysis. No templates. No hand-holding. This is your work.",
  },
  {
    step: "04",
    title: "Get Coached by Alex Rivera",
    body: "Senior BA Coach Alex Rivera scores your work across 4 dimensions and gives line-specific coaching you can act on.",
  },
];

const testimonials = [
  {
    quote: "I've done every BA course on Coursera and LinkedIn Learning. None of them prepared me for a stakeholder who changes their story mid-interview. TheBAPortal did.",
    name: "Priya M.",
    role: "Senior BA · Deloitte",
    initials: "PM",
    color: "#3b82f6",
  },
  {
    quote: "The Expert difficulty mode is genuinely hard. I failed my first two attempts. That's exactly why I kept coming back — and why I'm now better at my job.",
    name: "James O.",
    role: "Lead BA · RBC",
    initials: "JO",
    color: "#f59e0b",
  },
  {
    quote: "Alex Rivera's feedback is uncomfortably specific. In the best possible way. I didn't realise how vague my requirements writing was until I saw it scored.",
    name: "Claire T.",
    role: "Business Analyst · NHS",
    initials: "CT",
    color: "#1fbf9f",
  },
];

const audience = [
  { icon: "🎯", title: "Mid-career BAs", body: "You've got 2–5 years of experience and want to close the gap between 'good enough' and 'senior.'" },
  { icon: "📋", title: "BA Cert Candidates", body: "Preparing for CBAP, CCBA, or PMI-PBA? Apply the BABOK concepts in simulation before the exam tests you on paper." },
  { icon: "🔄", title: "Career Changers", body: "Transitioning from project management, operations, or IT? Build the BA artifact portfolio and stakeholder instincts you don't have yet." },
  { icon: "🏢", title: "BA Team Leads", body: "Run your team through challenges as a cohort. Debrief together. Identify skill gaps before they show up on client engagements." },
];

const faqs = [
  {
    q: "Is this just another video course?",
    a: "No. There are no videos, no slideshows, no passive learning. TheBAPortal is a simulation platform. You do the work — write requirements, interview stakeholders, catch errors in documents. You learn by doing, not watching.",
  },
  {
    q: "How is this different from case study platforms?",
    a: "Static case studies tell you what happened. TheBAPortal puts you in the situation live. Stakeholders respond to your specific questions in real time. Your deliverable gets evaluated against what you actually uncovered — not a model answer.",
  },
  {
    q: "What does the AI coaching actually evaluate?",
    a: "Alex Rivera scores your work across four dimensions: Problem Framing, Root Cause Analysis, Evidence Use, and Recommendation Quality. Each dimension gets a score out of 25, a verdict, and a specific coaching tip — not generic feedback.",
  },
  {
    q: "Do I need to be a senior BA to use this?",
    a: "No. Normal difficulty is designed for BAs at any level. Hard and Expert modes push even experienced practitioners. If you've ever written a requirements document, you're ready to start.",
  },
  {
    q: "What's included in the Pro subscription?",
    a: "All 7 challenges, all 3 difficulty modes, full AI stakeholder simulation, Alex Rivera coaching, progress tracking, badges, and every new challenge added to the platform.",
  },
];

const pricing = {
  monthly: { price: 29, label: "/month" },
  annual: { price: 19, label: "/month, billed annually" },
};


// ─── Logo ─────────────────────────────────────────────────────────────────────
export function BAPortalLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer hexagon */}
      <path
        d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
        fill="none"
        stroke="#1fbf9f"
        strokeWidth="1.5"
        opacity="0.4"
      />
      {/* Inner diamond */}
      <path
        d="M20 8L32 20L20 32L8 20L20 8Z"
        fill="none"
        stroke="#1fbf9f"
        strokeWidth="1.5"
        opacity="0.7"
      />
      {/* BA lettermark */}
      <text
        x="20" y="24"
        textAnchor="middle"
        fontFamily="'Inter', sans-serif"
        fontWeight="800"
        fontSize="11"
        fill="#1fbf9f"
        letterSpacing="-0.5"
      >BA</text>
      {/* Corner accent dots */}
      <circle cx="20" cy="2" r="2" fill="#1fbf9f" opacity="0.8" />
      <circle cx="36" cy="11" r="1.5" fill="#1fbf9f" opacity="0.4" />
      <circle cx="36" cy="29" r="1.5" fill="#1fbf9f" opacity="0.4" />
      <circle cx="20" cy="38" r="2" fill="#1fbf9f" opacity="0.8" />
      <circle cx="4" cy="29" r="1.5" fill="#1fbf9f" opacity="0.4" />
      <circle cx="4" cy="11" r="1.5" fill="#1fbf9f" opacity="0.4" />
    </svg>
  );
}

// ─── Hero Mockup ──────────────────────────────────────────────────────────────
const chatMessages = [
  { from: "user", text: "What's driving the decision to migrate now rather than in Q1 next year?" },
  { from: "ai", name: "Priya Shah", initials: "PS", text: "Q3 ARR targets. We can't afford to slip the migration — every month of delay costs us enterprise renewal conversations.", color: "#3b82f6" },
  { from: "user", text: "Dan mentioned a 6-month parallel run requirement. Is that reflected in your timeline?" },
  { from: "ai", name: "Priya Shah", initials: "PS", text: "That's... not what I agreed to. A 6-month parallel run would blow our Q3 window entirely. Where did Dan get that figure?", color: "#3b82f6" },
];

const scoreData = [
  { label: "Problem Framing", score: 22, max: 25, color: "#38bdf8" },
  { label: "Root Cause", score: 19, max: 25, color: "#a78bfa" },
  { label: "Evidence Use", score: 21, max: 25, color: "#fb923c" },
  { label: "Recommendation", score: 23, max: 25, color: "#1fbf9f" },
];

function HeroMockup() {
  const [activeTab, setActiveTab] = useState<"interview" | "score">("interview");

  return (
    <div style={{
      position: "relative",
      transform: "perspective(1200px) rotateY(-6deg) rotateX(2deg)",
      transformStyle: "preserve-3d",
    }}>
      {/* Glow behind mockup */}
      <div style={{
        position: "absolute", inset: "-40px",
        background: "radial-gradient(ellipse, rgba(31,191,159,0.12) 0%, transparent 70%)",
        filter: "blur(30px)", pointerEvents: "none", zIndex: 0,
      }} />

      {/* Main window chrome */}
      <div style={{
        position: "relative", zIndex: 1,
        background: "#0e0e12",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(31,191,159,0.08)",
      }}>
        {/* Window titlebar */}
        <div style={{
          height: "44px", display: "flex", alignItems: "center",
          padding: "0 16px", gap: "8px",
          background: "rgba(9,9,11,0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          {["#ef4444","#f59e0b","#22c55e"].map(c => (
            <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c, opacity: 0.7 }} />
          ))}
          <div style={{
            flex: 1, textAlign: "center",
            fontSize: "12px", color: "#505060",
            fontFamily: "'Inter', sans-serif",
          }}>
            CloudSync Pro — Requirements Elicitation
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(9,9,11,0.5)",
        }}>
          {[
            { key: "interview", label: "Interview" },
            { key: "score", label: "Phase A Score" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as "interview" | "score")} style={{
              padding: "10px 20px", fontSize: "12px", fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
              borderBottom: activeTab === tab.key ? "2px solid #1fbf9f" : "2px solid transparent",
              color: activeTab === tab.key ? "#f0f0f4" : "#505060",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ height: "420px", overflow: "hidden" }}>
          {activeTab === "interview" ? (
            <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: "14px", height: "100%", boxSizing: "border-box" }}>
              {/* Stakeholder strip */}
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                {[
                  { initials: "PS", name: "Priya Shah", color: "#3b82f6", active: true },
                  { initials: "DK", name: "Dan Kowalski", color: "#f59e0b", active: false },
                  { initials: "FA", name: "Fatima A.", color: "#a78bfa", active: false },
                  { initials: "MC", name: "Marcus Chen", color: "#10b981", active: false },
                ].map(s => (
                  <div key={s.initials} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", borderRadius: "8px",
                    background: s.active ? `${s.color}15` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${s.active ? `${s.color}40` : "rgba(255,255,255,0.06)"}`,
                  }}>
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "50%",
                      background: s.active ? s.color : "rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "8px", fontWeight: 700,
                      color: s.active ? "#fff" : "#505060",
                      fontFamily: "'Inter', sans-serif",
                    }}>{s.initials}</div>
                    <span style={{ fontSize: "11px", color: s.active ? "#f0f0f4" : "#505060", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{s.name}</span>
                  </div>
                ))}
              </div>

              {/* Chat */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", overflowY: "hidden" }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                    gap: "8px", alignItems: "flex-start",
                  }}>
                    {msg.from === "ai" && (
                      <div style={{
                        width: "26px", height: "26px", borderRadius: "50%",
                        background: `${msg.color}20`, border: `1px solid ${msg.color}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "9px", fontWeight: 700, color: msg.color,
                        fontFamily: "'Inter', sans-serif", flexShrink: 0, marginTop: "2px",
                      }}>{msg.initials}</div>
                    )}
                    <div style={{
                      maxWidth: "75%", padding: "10px 13px",
                      borderRadius: msg.from === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                      background: msg.from === "user" ? "rgba(31,191,159,0.1)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${msg.from === "user" ? "rgba(31,191,159,0.2)" : "rgba(255,255,255,0.07)"}`,
                      fontSize: "12px", color: "#c0c0cc", lineHeight: 1.55,
                    }}>{msg.text}</div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div style={{
                display: "flex", gap: "8px", flexShrink: 0,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                alignItems: "center",
              }}>
                <span style={{ flex: 1, fontSize: "12px", color: "#333342", fontFamily: "'Open Sans', sans-serif" }}>
                  Ask Priya a question...
                </span>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px",
                  background: "#1fbf9f",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", color: "#05120f",
                }}>↑</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Score hero */}
              <div style={{
                display: "flex", alignItems: "center", gap: "20px",
                padding: "20px 22px", borderRadius: "12px",
                background: "rgba(31,191,159,0.05)",
                border: "1px solid rgba(31,191,159,0.15)",
              }}>
                <div>
                  <div style={{
                    fontSize: "52px", fontWeight: 800,
                    color: "#1fbf9f", lineHeight: 1,
                    fontFamily: "'Inter', sans-serif", letterSpacing: "-0.04em",
                  }}>85</div>
                  <div style={{ fontSize: "11px", color: "#505060" }}>out of 100</div>
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", marginBottom: "6px" }}>
                    Strong submission.
                  </div>
                  <div style={{
                    height: "4px", width: "180px", borderRadius: "99px",
                    background: "rgba(255,255,255,0.06)", overflow: "hidden",
                  }}>
                    <div style={{ width: "85%", height: "100%", background: "#1fbf9f", borderRadius: "99px" }} />
                  </div>
                </div>
              </div>

              {/* Dimension bars */}
              {scoreData.map(d => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{
                    fontSize: "11px", color: "#9090a0", width: "130px",
                    fontFamily: "'Inter', sans-serif", flexShrink: 0,
                  }}>{d.label}</span>
                  <div style={{
                    flex: 1, height: "5px", borderRadius: "99px",
                    background: "rgba(255,255,255,0.06)", overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${(d.score / d.max) * 100}%`, height: "100%",
                      background: d.color, borderRadius: "99px",
                    }} />
                  </div>
                  <span style={{
                    fontSize: "12px", fontWeight: 700, color: d.color,
                    fontFamily: "'Inter', sans-serif", width: "36px", textAlign: "right",
                  }}>{d.score}/{d.max}</span>
                </div>
              ))}

              {/* Alex Rivera */}
              <div style={{
                padding: "14px 16px", borderRadius: "10px",
                background: "rgba(167,139,250,0.06)",
                border: "1px solid rgba(167,139,250,0.15)",
                marginTop: "4px",
              }}>
                <div style={{
                  fontSize: "10px", fontWeight: 700, color: "#a78bfa",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  marginBottom: "6px", fontFamily: "'Inter', sans-serif",
                }}>Alex Rivera · Senior BA Coach</div>
                <p style={{
                  fontSize: "12px", color: "#9090a0", margin: 0, lineHeight: 1.6,
                }}>
                  You surfaced the timeline conflict between Priya and Dan — that's the pivotal insight. Your NFR coverage was thorough. Push harder on the budget approval gap next time.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating badge */}
      <div style={{
        position: "absolute", bottom: "-16px", right: "-16px",
        padding: "10px 16px", borderRadius: "12px",
        background: "#0e0e12", border: "1px solid rgba(31,191,159,0.3)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", gap: "10px",
        zIndex: 2,
      }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%",
          background: "rgba(31,191,159,0.1)",
          border: "1px solid rgba(31,191,159,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px",
        }}>🎯</div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif" }}>Expert mode unlocked</div>
          <div style={{ fontSize: "11px", color: "#505060" }}>Score 80+ on Hard to unlock</div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const plan = billingAnnual ? pricing.annual : pricing.monthly;

  return (
    <div style={{
      background: "#09090b",
      color: "#f0f0f4",
      fontFamily: "'Open Sans', sans-serif",
      overflowX: "hidden",
    }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px",
        background: scrollY > 40 ? "rgba(9,9,11,0.92)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.06)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BAPortalLogo size={32} />
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}>
            TheBAPortal
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          {["Challenges", "Pricing", "FAQ"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{
              fontSize: "14px", color: "#9090a0",
              textDecoration: "none", transition: "color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f0f0f4")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9090a0")}
            >{item}</a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/login" style={{
            fontSize: "14px", color: "#9090a0", textDecoration: "none",
            padding: "8px 16px",
          }}>Sign in</Link>
          <Link href="/signup" style={{
            fontSize: "14px", fontWeight: 600,
            background: "#1fbf9f", color: "#05120f",
            padding: "9px 20px", borderRadius: "10px",
            textDecoration: "none", transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#25d4b0")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1fbf9f")}
          >Try a Challenge Free</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{
        minHeight: "100vh",
        display: "flex", alignItems: "center",
        padding: "120px 48px 80px",
        position: "relative", overflow: "hidden",
        maxWidth: "1280px", margin: "0 auto",
      }}>
        {/* Background grid */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(31,191,159,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(31,191,159,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 100%)",
        }} />

        {/* Left — text */}
        <div style={{ position: "relative", zIndex: 1, flex: "0 0 48%", paddingRight: "48px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "6px 16px", borderRadius: "99px",
            background: "rgba(31,191,159,0.08)",
            border: "1px solid rgba(31,191,159,0.2)",
            fontSize: "13px", fontWeight: 600, color: "#1fbf9f",
            marginBottom: "28px",
            fontFamily: "'Inter', sans-serif",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1fbf9f", boxShadow: "0 0 6px #1fbf9f" }} />
            Built by BA practitioners
          </div>

          <h1 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#f0f0f4",
            margin: "0 0 24px",
          }}>
            Real BA work.<br />
            <span style={{
              background: "linear-gradient(135deg, #1fbf9f 0%, #25d4b0 60%, #7dd3c8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Simulated pressure.
            </span><br />
            No hand-holding.
          </h1>

          <p style={{
            fontSize: "17px", color: "#9090a0", lineHeight: 1.7,
            margin: "0 0 36px", maxWidth: "440px",
          }}>
            Interview AI stakeholders, write real deliverables, and get scored by Alex Rivera — a Senior BA Coach who doesn't sugarcoat.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "48px" }}>
            <Link href="/signup" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "14px 28px", borderRadius: "12px",
              background: "#1fbf9f", color: "#05120f",
              fontSize: "15px", fontWeight: 700,
              textDecoration: "none", fontFamily: "'Inter', sans-serif",
              boxShadow: "0 0 32px rgba(31,191,159,0.2)",
              transition: "all 0.2s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#25d4b0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1fbf9f"; e.currentTarget.style.transform = "none"; }}
            >
              Try a Challenge Free →
            </Link>
            <a href="#challenges" style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "14px 28px", borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "#f0f0f4", fontSize: "15px", fontWeight: 600,
              textDecoration: "none", fontFamily: "'Inter', sans-serif",
              transition: "all 0.2s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(31,191,159,0.3)"; e.currentTarget.style.background = "rgba(31,191,159,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              See Challenges
            </a>
          </div>

          <div style={{ display: "flex", gap: "28px", flexWrap: "wrap" }}>
            {[
              { val: "7", label: "Challenges" },
              { val: "4", label: "Eval dimensions" },
              { val: "3", label: "Difficulty modes" },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{
                  fontSize: "26px", fontWeight: 800, color: "#1fbf9f",
                  letterSpacing: "-0.03em", fontFamily: "'Inter', sans-serif",
                }}>{stat.val}</div>
                <div style={{ fontSize: "12px", color: "#505060", marginTop: "2px" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — product mockup */}
        <div style={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <HeroMockup />
        </div>
      </section>

      {/* ── WHO THIS IS FOR ── */}
      <section style={{ padding: "100px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={eyebrow}>Who This Is For</div>
          <h2 style={h2}>Built for BAs who are done with passive learning</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {audience.map((item) => (
            <div key={item.title} style={{
              padding: "28px 26px", borderRadius: "16px",
              background: "#0e0e12", border: "1px solid #1e1e26",
              transition: "border-color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(31,191,159,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e1e26")}
            >
              <div style={{ fontSize: "28px", marginBottom: "14px" }}>{item.icon}</div>
              <div style={{
                fontSize: "16px", fontWeight: 700, color: "#f0f0f4",
                fontFamily: "'Inter', sans-serif", marginBottom: "10px",
              }}>{item.title}</div>
              <p style={{ fontSize: "14px", color: "#9090a0", lineHeight: 1.65, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "100px 24px", background: "#0a0a0e" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <div style={eyebrow}>How It Works</div>
            <h2 style={h2}>Four steps. Zero shortcuts.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2px" }}>
            {howItWorks.map((item, i) => (
              <div key={item.step} style={{
                padding: "36px 28px", position: "relative",
                borderRight: i < howItWorks.length - 1 ? "1px solid #1e1e26" : "none",
              }}>
                <div style={{
                  fontSize: "48px", fontWeight: 800,
                  color: "rgba(31,191,159,0.12)",
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "-0.04em",
                  lineHeight: 1, marginBottom: "20px",
                }}>{item.step}</div>
                <div style={{
                  fontSize: "18px", fontWeight: 700, color: "#f0f0f4",
                  fontFamily: "'Inter', sans-serif", marginBottom: "12px",
                }}>{item.title}</div>
                <p style={{ fontSize: "14px", color: "#9090a0", lineHeight: 1.7, margin: 0 }}>{item.body}</p>
                {i < howItWorks.length - 1 && (
                  <div style={{
                    position: "absolute", right: "-10px", top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "18px", color: "#1e1e26",
                    zIndex: 1,
                  }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHALLENGES ── */}
      <section id="challenges" style={{ padding: "100px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={eyebrow}>Challenge Library</div>
          <h2 style={h2}>Real industries. Real pressure. Real feedback.</h2>
          <p style={{ fontSize: "16px", color: "#9090a0", maxWidth: "500px", margin: "16px auto 0", lineHeight: 1.6 }}>
            Each challenge is a self-contained BA engagement. No toy scenarios.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          {challenges.map((c) => (
            <div key={c.id} style={{
              borderRadius: "18px", overflow: "hidden",
              background: "#0e0e12", border: "1px solid #1e1e26",
              transition: "all 0.25s ease", cursor: "pointer",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(31,191,159,0.25)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e26"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{
                height: "180px", overflow: "hidden", position: "relative",
              }}>
                <img src={c.photo} alt={c.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(14,14,18,0.9) 0%, transparent 60%)",
                }} />
                <div style={{
                  position: "absolute", top: "14px", left: "14px",
                  display: "flex", gap: "6px",
                }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
                    color: "#f0f0f4", border: "1px solid rgba(255,255,255,0.1)",
                    fontFamily: "'Inter', sans-serif",
                  }}>{c.industry}</span>
                  <span style={{
                    padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                    background: c.difficulty === "Expert" ? "rgba(248,113,113,0.2)" : c.difficulty === "Hard" ? "rgba(251,146,60,0.2)" : "rgba(31,191,159,0.2)",
                    backdropFilter: "blur(8px)",
                    color: c.difficulty === "Expert" ? "#f87171" : c.difficulty === "Hard" ? "#fb923c" : "#1fbf9f",
                    border: `1px solid ${c.difficulty === "Expert" ? "rgba(248,113,113,0.3)" : c.difficulty === "Hard" ? "rgba(251,146,60,0.3)" : "rgba(31,191,159,0.3)"}`,
                    fontFamily: "'Inter', sans-serif",
                  }}>{c.difficulty}</span>
                </div>
              </div>
              <div style={{ padding: "22px 24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#505060", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", fontFamily: "'Inter', sans-serif" }}>
                  {c.type} · {c.duration}
                </div>
                <div style={{ fontSize: "17px", fontWeight: 700, color: "#f0f0f4", fontFamily: "'Inter', sans-serif", marginBottom: "10px", lineHeight: 1.3 }}>
                  {c.title}
                </div>
                <p style={{ fontSize: "14px", color: "#9090a0", lineHeight: 1.65, margin: 0 }}>{c.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <p style={{ fontSize: "14px", color: "#505060" }}>+ 4 more challenges across Energy, Insurance, and Facilitation</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "100px 24px", background: "#0a0a0e" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <div style={eyebrow}>From the Community</div>
            <h2 style={h2}>BAs who stopped watching and started doing</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            {testimonials.map((t) => (
              <div key={t.name} style={{
                padding: "28px 28px 24px",
                borderRadius: "18px",
                background: "#0e0e12",
                border: "1px solid #1e1e26",
              }}>
                <div style={{
                  fontSize: "32px", color: t.color, lineHeight: 1,
                  marginBottom: "16px", opacity: 0.6,
                }}>"</div>
                <p style={{
                  fontSize: "15px", color: "#c0c0cc",
                  lineHeight: 1.75, margin: "0 0 24px",
                }}>
                  {t.quote}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: `${t.color}20`,
                    border: `1px solid ${t.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700, color: t.color,
                    fontFamily: "'Inter', sans-serif", flexShrink: 0,
                  }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0f4", fontFamily: "'Inter', sans-serif" }}>{t.name}</div>
                    <div style={{ fontSize: "12px", color: "#505060" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 24px", maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={eyebrow}>Pricing</div>
          <h2 style={h2}>One plan. Everything included.</h2>
          <p style={{ fontSize: "16px", color: "#9090a0", marginTop: "12px", lineHeight: 1.6 }}>
            No tiers. No feature gates. All 7 challenges, all difficulty modes, full coaching.
          </p>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "36px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0",
            background: "#0e0e12", border: "1px solid #1e1e26",
            borderRadius: "12px", padding: "4px",
          }}>
            {[{ label: "Monthly", val: false }, { label: "Annual", val: true }].map(opt => (
              <button key={opt.label} onClick={() => setBillingAnnual(opt.val)} style={{
                padding: "8px 20px", borderRadius: "9px", fontSize: "14px", fontWeight: 600,
                cursor: "pointer", border: "none", transition: "all 0.15s",
                background: billingAnnual === opt.val ? "#1fbf9f" : "transparent",
                color: billingAnnual === opt.val ? "#05120f" : "#9090a0",
                fontFamily: "'Inter', sans-serif",
              }}>
                {opt.label}{opt.val && <span style={{ fontSize: "11px", marginLeft: "6px", opacity: 0.8 }}>Save 34%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing card */}
        <div style={{
          padding: "44px 44px 40px",
          borderRadius: "24px",
          background: "#0e0e12",
          border: "1px solid rgba(31,191,159,0.25)",
          boxShadow: "0 0 60px rgba(31,191,159,0.06)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: "300px", height: "300px", pointerEvents: "none",
            background: "radial-gradient(circle, rgba(31,191,159,0.06) 0%, transparent 70%)",
          }} />
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "8px" }}>
            <span style={{
              fontSize: "60px", fontWeight: 800, color: "#f0f0f4",
              fontFamily: "'Inter', sans-serif", letterSpacing: "-0.04em", lineHeight: 1,
            }}>${plan.price}</span>
            <span style={{ fontSize: "16px", color: "#9090a0", paddingBottom: "10px" }}>{plan.label}</span>
          </div>
          <p style={{ fontSize: "14px", color: "#505060", marginBottom: "32px" }}>
            {billingAnnual ? `$${pricing.annual.price * 12} billed annually` : "Billed monthly. Cancel anytime."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "36px" }}>
            {[
              "All 7 industry challenges",
              "Normal, Hard, and Expert difficulty",
              "Full AI stakeholder simulation",
              "Alex Rivera coaching & scoring",
              "Progress tracking & badges",
              "Every new challenge added",
            ].map(feature => (
              <div key={feature} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                  background: "rgba(31,191,159,0.12)",
                  border: "1px solid rgba(31,191,159,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", color: "#1fbf9f",
                }}>✓</div>
                <span style={{ fontSize: "15px", color: "#c0c0cc" }}>{feature}</span>
              </div>
            ))}
          </div>
          <Link href="/signup" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "16px", borderRadius: "12px",
            background: "#1fbf9f", color: "#05120f",
            fontSize: "16px", fontWeight: 700,
            textDecoration: "none",
            fontFamily: "'Inter', sans-serif",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#25d4b0")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1fbf9f")}
          >
            Try a Challenge Free →
          </Link>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#505060", marginTop: "14px" }}>
            No credit card required to start. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "100px 24px", background: "#0a0a0e" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div style={eyebrow}>FAQ</div>
            <h2 style={h2}>Questions you'll actually ask</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                borderBottom: "1px solid #1e1e26",
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "22px 0", background: "none", border: "none",
                  cursor: "pointer", textAlign: "left", gap: "16px",
                }}>
                  <span style={{
                    fontSize: "16px", fontWeight: 600, color: "#f0f0f4",
                    fontFamily: "'Inter', sans-serif", lineHeight: 1.4,
                  }}>{faq.q}</span>
                  <span style={{
                    color: "#505060", fontSize: "20px", flexShrink: 0,
                    transition: "transform 0.2s",
                    transform: openFaq === i ? "rotate(45deg)" : "none",
                    display: "inline-block",
                  }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: "22px" }}>
                    <p style={{ fontSize: "15px", color: "#9090a0", lineHeight: 1.75, margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "120px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "500px", height: "300px", pointerEvents: "none",
          background: "radial-gradient(ellipse, rgba(31,191,159,0.1) 0%, transparent 70%)",
          filter: "blur(30px)",
        }} />
        <div style={{ position: "relative", maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "#f0f0f4",
            marginBottom: "20px",
          }}>
            Stop reading about BA work.<br />Start doing it.
          </h2>
          <p style={{ fontSize: "17px", color: "#9090a0", lineHeight: 1.65, marginBottom: "40px" }}>
            Your first challenge is free. No credit card. No tutorial video. Just a scenario and a stakeholder waiting.
          </p>
          <Link href="/signup" style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            padding: "17px 40px", borderRadius: "14px",
            background: "#1fbf9f", color: "#05120f",
            fontSize: "17px", fontWeight: 700,
            textDecoration: "none",
            fontFamily: "'Inter', sans-serif",
            boxShadow: "0 0 40px rgba(31,191,159,0.2)",
            transition: "all 0.2s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#25d4b0"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#1fbf9f"; e.currentTarget.style.transform = "none"; }}
          >
            Try a Challenge Free →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid #1e1e26",
        padding: "40px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BAPortalLogo size={24} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#9090a0", fontFamily: "'Inter', sans-serif" }}>
            TheBAPortal
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "#333342", margin: 0 }}>
          © {new Date().getFullYear()} TheBAPortal. Built by practitioners, for practitioners.
        </p>
        <div style={{ display: "flex", gap: "24px" }}>
          {["Privacy", "Terms", "Contact"].map(link => (
            <a key={link} href="#" style={{ fontSize: "13px", color: "#505060", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#9090a0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#505060")}
            >{link}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const eyebrow: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#1fbf9f",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: "16px",
  fontFamily: "'Inter', sans-serif",
};

const h2: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "clamp(28px, 4vw, 44px)",
  fontWeight: 800,
  letterSpacing: "-0.03em",
  lineHeight: 1.1,
  color: "#f0f0f4",
  margin: 0,
};