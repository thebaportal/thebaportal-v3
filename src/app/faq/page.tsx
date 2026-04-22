"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const FAQ_GROUPS = [
  {
    group: "Getting Started",
    items: [
      {
        q: "What exactly is TheBAPortal?",
        a: "TheBAPortal is a practice platform for Business Analysts. You simulate real BA scenarios — interviewing AI stakeholders, writing deliverables like requirements documents and problem statements, then getting scored by Alex Rivera, a Senior BA Coach. It is not a course. It is a practice environment.",
      },
      {
        q: "Who is this for?",
        a: "Anyone working toward a BA career or trying to get sharper in an existing one. That includes people new to BA, professionals transitioning from adjacent roles (project management, product, operations), and practising BAs preparing for interviews, certifications, or a step up to senior.",
      },
      {
        q: "Do I need BA experience to start?",
        a: "No. The platform has a Beginner difficulty tier and a Learning Academy that starts from foundations. You can go from zero background to producing real BA deliverables. That said, the platform rewards effort — if you show up and take the feedback seriously, you will improve quickly.",
      },
      {
        q: "How is this different from a BA course?",
        a: "Courses teach you theory. TheBAPortal makes you practice under realistic conditions. You cannot pass a challenge by reading slides — you have to actually interview stakeholders, uncover information, and produce a written deliverable that holds up under scrutiny. The scoring reflects that.",
      },
    ],
  },
  {
    group: "Challenges & Features",
    items: [
      {
        q: "What happens in a BA challenge?",
        a: "You are dropped into a real business scenario — a rising churn problem at a bank, a patient referral system overhaul, a production incident at an insurer. You interview AI stakeholders (2–4 per scenario), gather evidence, then write the required deliverable. Alex Rivera evaluates your submission across four dimensions and gives you detailed, specific feedback.",
      },
      {
        q: "What is Alex Rivera?",
        a: "Alex Rivera is TheBAPortal's Senior BA Coach — an AI evaluator trained to assess BA work the way a senior practitioner would. Alex does not hand out gold stars for effort. The feedback is specific, sometimes blunt, and designed to tell you exactly what to improve.",
      },
      {
        q: "What is the Career Suite?",
        a: "The Career Suite is a set of tools built around job searching and positioning: a personalised career advisor that gives you a roadmap based on your situation, a resume bullet generator, an interview answer generator, a cover letter tool, a LinkedIn optimiser, and a salary benchmarking guide.",
      },
      {
        q: "What is PitchReady?",
        a: "PitchReady is an interview practice tool. You record yourself answering BA interview questions, and the platform analyses your response for clarity, structure, confidence, filler words, pacing, and executive presence. You get a detailed report with specific rewrites for your opening, closing, and key lines.",
      },
      {
        q: "What certifications does Exam Prep cover?",
        a: "CBAP (Certified Business Analysis Professional), CCBA (Certification of Capability in Business Analysis), and PMI-PBA (PMI Professional in Business Analysis). Questions are BABOK-aligned and organised by knowledge area. There is a practice mode and a timed mock exam.",
      },
    ],
  },
  {
    group: "Pricing & Account",
    items: [
      {
        q: "What is included in the free tier?",
        a: "Three BA challenge simulations on Normal difficulty, basic progress tracking, and the starter flows in the Career Advisor. No credit card required to sign up.",
      },
      {
        q: "What does Pro unlock?",
        a: "All challenge simulations across all industries and difficulty modes (Normal, Hard, Expert), the full Career Suite, PitchReady, the Portfolio Case Study Builder, Exam Prep, and advanced analytics. Pro is $29/month or $19/month billed annually.",
      },
      {
        q: "Can I cancel at any time?",
        a: "Yes. Cancel from Settings at any time. You keep access until the end of your current billing period. No cancellation fees.",
      },
      {
        q: "Is there a student or nonprofit discount?",
        a: "Not currently listed on the pricing page, but reach out via email and we will see what we can do.",
      },
    ],
  },
  {
    group: "Technical",
    items: [
      {
        q: "What browser do I need?",
        a: "Any modern browser — Chrome, Firefox, Safari, or Edge. PitchReady requires microphone access, which all modern browsers support with permission.",
      },
      {
        q: "Is my data private?",
        a: "Yes. Your submissions, scores, and career data are private to your account. We do not sell or share personal data. See our Privacy Policy for the full details.",
      },
      {
        q: "I found a bug or something is not working. What do I do?",
        a: "Email us directly. We are a small team and we read every message. Response time is typically within one business day for Pro members.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "20px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontFamily: "'Inter','Open Sans',sans-serif", fontSize: "15px", fontWeight: 600, color: open ? "var(--teal, #1fbf9f)" : "#f2f2f8", lineHeight: 1.4, transition: "color 0.15s" }}>{q}</span>
        <ChevronDown size={16} style={{ color: open ? "var(--teal, #1fbf9f)" : "#505068", flexShrink: 0, transition: "transform 0.2s, color 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>
      {open && (
        <p style={{ fontSize: "14px", color: "#9090a8", lineHeight: 1.75, paddingBottom: "20px", maxWidth: "680px" }}>{a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div style={{ background: "#07070a", color: "#f2f2f8", minHeight: "100vh", fontFamily: "'Open Sans',sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* Nav */}
      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 28px", background: "rgba(7,7,10,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 800, color: "#f2f2f8", letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 9, fontWeight: 600, color: "#1fbf9f" }}>BA</div>
            The<span style={{ color: "#1fbf9f" }}>BA</span>Portal
          </Link>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/pricing" style={{ fontSize: 13, color: "#505068", textDecoration: "none", transition: "color .15s" }} onMouseEnter={e => (e.currentTarget.style.color = "#9090a8")} onMouseLeave={e => (e.currentTarget.style.color = "#505068")}>Pricing</Link>
            <Link href="/auth/login"   style={{ fontSize: 13, color: "#505068", textDecoration: "none", transition: "color .15s" }} onMouseEnter={e => (e.currentTarget.style.color = "#9090a8")} onMouseLeave={e => (e.currentTarget.style.color = "#505068")}>Sign in</Link>
            <Link href="/auth/signup"  style={{ fontSize: 13, fontWeight: 700, color: "#041a13", background: "#1fbf9f", padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "110px 28px 80px" }}>
        <div style={{ marginBottom: "56px" }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "#1fbf9f", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px" }}>Support</div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#f2f2f8", marginBottom: "16px", lineHeight: 1.05 }}>
            Frequently asked questions
          </h1>
          <p style={{ fontSize: "16px", color: "#9090a8", lineHeight: 1.68, maxWidth: "480px" }}>
            Everything you need to know about the platform. Can not find an answer? Email us directly.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
          {FAQ_GROUPS.map(group => (
            <div key={group.group}>
              <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#2a2a38", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {group.group}
              </div>
              {group.items.map(item => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "64px", padding: "40px", borderRadius: "20px", background: "rgba(31,191,159,0.04)", border: "1px solid rgba(31,191,159,0.12)", textAlign: "center" }}>
          <p style={{ fontSize: "16px", color: "#9090a8", marginBottom: "8px" }}>Still have questions?</p>
          <p style={{ fontSize: "14px", color: "#505068", marginBottom: "24px" }}>
            Email us at{" "}
            <a href="mailto:hello@thebaportal.com" style={{ color: "#1fbf9f", textDecoration: "none" }}>hello@thebaportal.com</a>
            {" "}and we will get back to you within one business day.
          </p>
          <Link href="/auth/signup" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", borderRadius: "12px", background: "#1fbf9f", color: "#041a13", fontSize: "14px", fontWeight: 700, textDecoration: "none", fontFamily: "'Inter',sans-serif" }}>
            Start free — no credit card required
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "28px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          {[["Home", "/"], ["Pricing", "/pricing"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: "12px", color: "#2a2a38", textDecoration: "none", transition: "color .15s" }} onMouseEnter={e => (e.currentTarget.style.color = "#505068")} onMouseLeave={e => (e.currentTarget.style.color = "#2a2a38")}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
