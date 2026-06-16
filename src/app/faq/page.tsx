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
        a: "The BA Portal is an AI-powered operating system for business analysts. You bring your real work — a business problem, a set of messy meeting notes, a job description you want to prepare for — and the platform helps you think it through, produce professional deliverables, and grow your career. It serves aspiring BAs, practising BAs, and senior analysts or consultants.",
      },
      {
        q: "Who is this for?",
        a: "Three types of people. Aspiring BAs who are trying to break into the field and need structured learning, practice, and career tools. Practising BAs who need to produce deliverables faster and make better decisions at work. Senior BAs and consultants who want decision intelligence tools and a way to articulate their value.",
      },
      {
        q: "Do I need BA experience to start?",
        a: "No. The Learning Hub starts from foundations and follows a structured path from beginner to advanced. The BA Workspace tools are designed to work with whatever input you have — even rough notes or a plain-language description of a problem. The more context you give, the better the output.",
      },
      {
        q: "How is this different from ChatGPT or other AI tools?",
        a: "Generic AI tools produce generic output. The BA Portal is trained in BABOK knowledge areas, understands how BA work is structured, asks the questions a senior BA would ask before generating anything, and produces output that a real BA — or a hiring manager — would recognise as legitimate. It also maintains context across a session and links deliverables together.",
      },
    ],
  },
  {
    group: "The Tools",
    items: [
      {
        q: "What is the BA Workspace?",
        a: "The Workspace is where you do your real BA work. It has five AI tools: Problem Analyzer (business problem to full analysis package), Requirements Analyzer (messy notes to structured FR, NFR, assumptions, risks), User Story Generator (requirements to INVEST-format stories with acceptance criteria), Document Generator (BRD, FRD, or Use Cases), and Process Analyzer (current state, bottlenecks, future state). You can also attach PDF or Word documents to any tool.",
      },
      {
        q: "What is Decision Intelligence?",
        a: "Decision Intelligence is a separate module with four tools that go beyond document generation into judgment and reasoning. Solution Evaluator compares 2–3 options and recommends one with reasoning. Risk Radar produces a full risk register with the risks your team is probably not talking about. Assumptions Challenger finds every assumption — stated and hidden — in any document you paste. Stakeholder Intelligence maps influence, predicts objections, and generates an alignment strategy.",
      },
      {
        q: "What is the Career Hub?",
        a: "The Career Hub covers everything around getting hired and growing your BA career: a personalised career advisor, resume analyser, job description analyser, interview copilot (JD → full prep pack with 15 questions and STAR templates), cover letter generator, LinkedIn optimiser, and salary benchmarking. The Interview Copilot in the Workspace is a faster version for when you just need a prep pack quickly.",
      },
      {
        q: "What is the Template Studio?",
        a: "A library of eight BABOK-aligned templates — BRD, FRD, Use Cases, Stakeholder Register / RACI, Business Case, Process Analysis, RTM, and User Story Backlog. All are downloadable and Word-compatible. Pro members (coming soon) will be able to customise templates to their organisation's format and save them for reuse.",
      },
      {
        q: "What is the Portfolio Builder?",
        a: "A workspace tool that turns your real project experience into a professional BA case study. You describe the project, the engine asks two clarifying questions about outcome and the hardest challenge, then produces a structured write-up with BABOK techniques table, metrics, and three ready-to-use interview talking points drawn from your project.",
      },
      {
        q: "What is PitchReady?",
        a: "PitchReady is an interview communication practice tool. You record yourself answering BA interview questions and get feedback on clarity, structure, pacing, and executive presence. It sits in the Practice section alongside the Simulation Lab and is best used after you have used the Interview Copilot to prepare your content.",
      },
    ],
  },
  {
    group: "Pricing & Account",
    items: [
      {
        q: "What is free?",
        a: "The free tier includes five BA Workspace analyses per month, the User Story Generator, Requirements Analyzer, three Practice Lab simulations, Career Advisor starter flows, resume history, eight downloadable templates, and the Beginner Learning Path. No credit card required.",
      },
      {
        q: "What does Pro unlock?",
        a: "Unlimited BA Workspace analyses across all five tools, the full Decision Intelligence suite, Document Generator (BRD, FRD, Use Cases), Process Analyzer, Interview Copilot, Portfolio Builder, full Career Hub with all advisor flows, unlimited Practice Lab, all Learning Paths, Exam Prep, and Template Studio org customisation. Pro is $29/month or $19/month billed annually.",
      },
      {
        q: "Can I cancel at any time?",
        a: "Yes. Cancel from Settings at any time. You keep full access until the end of your billing period. No cancellation fees or complicated steps.",
      },
      {
        q: "Is there a student or nonprofit discount?",
        a: "Not listed on the pricing page currently, but reach out directly and we will see what we can do.",
      },
    ],
  },
  {
    group: "Technical",
    items: [
      {
        q: "What file types can I attach to the workspace tools?",
        a: "PDF, Word (.docx, .doc), and plain text (.txt). The document is parsed server-side and the text is inserted into the input field so you can review it before sending. Maximum file size is 10 MB.",
      },
      {
        q: "What browser do I need?",
        a: "Any modern browser — Chrome, Firefox, Safari, or Edge. PitchReady requires microphone access for recording, which all modern browsers support with a one-time permission prompt.",
      },
      {
        q: "Is my data private?",
        a: "Yes. Your workspace sessions, career data, and project information are private to your account. We do not sell or share personal data. See our Privacy Policy for full details.",
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
