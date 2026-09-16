"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const FAQ_GROUPS = [
  {
    group: "Getting Started",
    items: [
      {
        q: "What exactly is The BA Portal?",
        a: "The BA Portal is a work tool for practising business analysts. You create a project, describe the problem, and work through Problem Analysis, Stakeholder Analysis, Requirements, User Stories, Process Analysis, Testing, and Decision Lab — with each step's approved context carrying forward automatically into the next.",
      },
      {
        q: "Who is this for?",
        a: "Business analysts doing real project work — whether you're on a delivery team, consulting, or running a project solo. It's built around the day-to-day BA lifecycle, not training or certification prep.",
      },
      {
        q: "Do I need to set anything up before I start?",
        a: "No. Create a project, add a short problem statement, and start with whichever workstream makes sense. The tools work with rough notes or a plain-language description — the more context you give, the better the output.",
      },
      {
        q: "How is this different from a generic AI chat tool?",
        a: "A generic AI chat starts from zero every time. The BA Portal keeps your project context — problem statement, approved requirements, prior decisions — and carries it forward automatically as you move between workstreams, so later steps build on earlier ones instead of repeating them.",
      },
    ],
  },
  {
    group: "The Tools",
    items: [
      {
        q: "What is a Project?",
        a: "A Project is where your BA work lives. Inside it, you work through Problem Analysis, Stakeholder Analysis, Requirements, User Stories, Process Analysis, Testing, and a Business Case — each one a focused conversation that produces a real, editable deliverable, with approved outputs from one step automatically feeding the next. A Requirements Traceability Matrix view shows coverage across requirements, stories, and test cases at a glance.",
      },
      {
        q: "What is Decision Lab?",
        a: "Decision Lab is for structured reasoning, separate from document generation. Compare Options weighs 2–3 choices and recommends one with stated reasoning. Assess Risks builds a risk register. Challenge Assumptions surfaces stated and hidden assumptions in anything you paste. Stakeholder Intelligence maps influence and likely objections. A Decision Explorer lets you ask follow-up questions against the same analysis.",
      },
      {
        q: "What is Template Studio?",
        a: "A library of practical, downloadable templates for common BA deliverables — Business Requirements Document, Functional Requirements Document, Use Cases, Stakeholder Register / RACI, Business Case, Process Analysis, Requirements Traceability Matrix, and User Story Backlog. All are Word-compatible and free to download.",
      },
    ],
  },
  {
    group: "Pricing & Account",
    items: [
      {
        q: "What is free?",
        a: "Unlimited projects, all core workstreams (Problem Analysis, Stakeholder Analysis, Requirements, User Stories, Process Analysis), a limited number of Decision Lab analyses per month, and all downloadable templates. No credit card required.",
      },
      {
        q: "What does Pro unlock?",
        a: "Unlimited Decision Lab analyses across all modes, Testing and RTM, priority document generation, and Template Studio organisation customisation.",
      },
      {
        q: "Can I cancel at any time?",
        a: "Yes. Cancel from Settings at any time. You keep full access until the end of your billing period. No cancellation fees or complicated steps.",
      },
    ],
  },
  {
    group: "Technical",
    items: [
      {
        q: "What file types can I attach?",
        a: "PDF, Word (.docx, .doc), and plain text (.txt). The document is parsed server-side and the text is inserted into the input field so you can review it before sending. Maximum file size is 10 MB.",
      },
      {
        q: "What browser do I need?",
        a: "Any modern browser — Chrome, Firefox, Safari, or Edge.",
      },
      {
        q: "Is my data private?",
        a: "Yes. Your projects and business information are private to your account. We do not sell or share personal data. See our Privacy Policy for full details.",
      },
      {
        q: "Something is not working. What do I do?",
        a: "Email us directly. We are a small team and we read every message. Pro members typically get a response within one business day.",
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
