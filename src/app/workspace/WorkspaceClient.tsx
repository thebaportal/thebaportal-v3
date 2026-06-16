"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  resumes: unknown[];
  savedJobs: unknown[];
}

// ── Markdown renderer (simple) ─────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      nodes.push(
        <h3 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--teal)", letterSpacing: "-0.01em", margin: "22px 0 8px", paddingBottom: 6, borderBottom: "1px solid rgba(31,191,159,.12)" }}>
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      nodes.push(
        <h2 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          {line.slice(2)}
        </h2>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 5 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--teal)", flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}>{line.slice(2)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      const content = line.replace(/^\d+\.\s/, "");
      nodes.push(
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(31,191,159,.1)", border: "1px solid rgba(31,191,159,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--teal)", flexShrink: 0, marginTop: 2 }}>{num}</div>
          <span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}>{content}</span>
        </div>
      );
    } else if (line.trim() === "") {
      nodes.push(<div key={i} style={{ height: 6 }} />);
    } else {
      nodes.push(
        <p key={i} style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.72, margin: "0 0 8px" }}>
          {line}
        </p>
      );
    }
    i++;
  }
  return nodes;
}

// ── Tool definitions ───────────────────────────────────────────────────────────
interface Tool { id: string; label: string; tag: string; tagColor: string; color: string; desc: string; live: boolean; icon: React.ReactNode; href?: string; }
const TOOLS: Tool[] = [
  {
    id: "problem-analyzer",
    label: "Problem Analyzer",
    tag: "Intelligence Engine",
    tagColor: "#1fbf9f",
    color: "#1fbf9f",
    desc: "Enter any business problem. The engine interrogates like a senior BA, then delivers a complete connected analysis package.",
    live: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  },
  {
    id: "requirements-analyzer",
    label: "Requirements Analyzer",
    tag: "Intelligence Engine",
    tagColor: "#34d399",
    color: "#34d399",
    desc: "Paste meeting notes, transcripts, or emails. Get structured FR, NFR, business rules, assumptions, risks, and open questions.",
    live: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  {
    id: "user-story-generator",
    label: "User Story Generator",
    tag: "Intelligence Engine",
    tagColor: "#a78bfa",
    color: "#a78bfa",
    desc: "Convert requirements or epics into prioritised user stories with acceptance criteria, dependencies, and gap detection.",
    live: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  },
  {
    id: "document-generator",
    label: "Document Generator",
    tag: "Intelligence Engine",
    tagColor: "#fb923c",
    color: "#fb923c",
    desc: "Generate a BABOK-compliant BRD, FRD, or full Use Case set from your project context or requirements.",
    live: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  },
  {
    id: "stakeholder-intelligence",
    label: "Stakeholder Intelligence",
    tag: "Decision Intelligence",
    tagColor: "#facc15",
    color: "#facc15",
    desc: "Map stakeholder influence, predict objections, and generate a targeted communication and alignment strategy.",
    live: true,
    href: "/decision-intelligence",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" width="22" height="22"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    id: "process-analyzer",
    label: "Process Analyzer",
    tag: "Intelligence Engine",
    tagColor: "#38bdf8",
    color: "#38bdf8",
    desc: "Describe your process in plain language. Get current state, bottleneck analysis, future state, and a step-by-step improvement plan.",
    live: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" width="22" height="22"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>,
  },
];



// ── Priority color ────────────────────────────────────────────────────────────
function priorityColor(p: string) {
  if (p.includes("HIGH"))   return { bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.25)", text: "#f87171" };
  if (p.includes("MEDIUM")) return { bg: "rgba(251,146,60,.1)",  border: "rgba(251,146,60,.25)",  text: "#fb923c" };
  return                           { bg: "rgba(31,191,159,.1)",  border: "rgba(31,191,159,.25)",  text: "#1fbf9f" };
}

// ── Story card renderer ───────────────────────────────────────────────────────
function renderStoryOutput(text: string): React.ReactNode {
  // Split on story dividers
  const blocks = text.split(/\n---\n/);

  return (
    <div>
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Story block — starts with **US-
        if (trimmed.startsWith("**US-")) {
          const lines = trimmed.split("\n");
          const headerLine = lines[0].replace(/\*\*/g, "");
          const parts = headerLine.split("·").map(s => s.trim());
          const storyId = parts[0] ?? "US";
          const priority = parts[1] ?? "MEDIUM";
          const pc = priorityColor(priority.toUpperCase());

          // "As a ... I want ... so that ..." line
          const storyLine = lines.find(l => l.toLowerCase().startsWith("as a"));
          const storyText = storyLine?.replace(/\*\*/g, "") ?? "";

          // Acceptance criteria
          const acStart = lines.findIndex(l => l.includes("Acceptance Criteria"));
          const notesStart = lines.findIndex(l => l.includes("**Notes:**"));
          const acLines = acStart > -1
            ? lines.slice(acStart + 1, notesStart > -1 ? notesStart : undefined).filter(l => l.trim().startsWith("-"))
            : [];
          const notes = notesStart > -1 ? lines[notesStart].replace("**Notes:**", "").trim() : "";

          return (
            <div key={bi} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginBottom: 12, overflow: "hidden" }}>
              {/* Story header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>{storyId}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                  {priority}
                </span>
              </div>
              {/* Story body */}
              <div style={{ padding: "16px 18px" }}>
                <p style={{ fontSize: 14, color: "var(--t1)", lineHeight: 1.65, marginBottom: acLines.length ? 16 : 0 }}>
                  {storyText}
                </p>
                {acLines.length > 0 && (
                  <>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--t3)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>
                      Acceptance Criteria
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {acLines.map((ac, ai) => (
                        <div key={ai} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid rgba(31,191,159,.3)", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 6, height: 6, borderRadius: 1, background: "rgba(31,191,159,.3)" }} />
                          </div>
                          <span style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>{ac.replace(/^-\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {notes && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,255,255,.03)", borderRadius: 8, borderLeft: "2px solid rgba(255,255,255,.08)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>Note: {notes}</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Summary/meta sections after all stories
        return (
          <div key={bi} style={{ marginTop: 8 }}>
            {renderMarkdown(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

// ── Generic workspace session ─────────────────────────────────────────────────
interface SessionConfig {
  id: string;
  label: string;
  color: string;
  apiEndpoint: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  examples: string[];
  inputPlaceholderInitial: string;
  inputPlaceholderFollowup: string;
  isAnalysis: (text: string) => boolean;
  renderOutput?: (text: string) => React.ReactNode;
}

const DOC_TYPES = [
  { id: "brd", label: "Business Requirements Document", short: "BRD", color: "#fb923c", desc: "Full BRD with objectives, scope, stakeholders, requirements, risks and approval sign-off." },
  { id: "frd", label: "Functional Requirements Document", short: "FRD", color: "#f87171", desc: "System-level FRD with functional requirements, NFRs, business rules and integration specs." },
  { id: "usecases", label: "Use Cases", short: "Use Cases", color: "#facc15", desc: "Complete use case set with actors, main flows, alternative flows and exception handling." },
];

const SESSION_CONFIGS: Record<string, SessionConfig> = {
  "problem-analyzer": {
    id: "problem-analyzer",
    label: "Problem Analyzer",
    color: "#1fbf9f",
    apiEndpoint: "/api/workspace/analyze",
    welcomeTitle: "What business problem are you working on?",
    welcomeSubtitle: "Describe your situation in plain language. I will ask a few follow-up questions, then build you a complete, connected analysis package.",
    examples: [
      "Customer onboarding takes 15 days and we're getting complaints",
      "Two departments disagree on project priorities and it's blocking delivery",
      "Our legacy system is failing and leadership wants a business case for replacement",
      "We're losing customers after the product update but don't know why",
    ],
    inputPlaceholderInitial: "Describe the business problem or situation you are facing. Be as specific as you can — the more context, the better the analysis.",
    inputPlaceholderFollowup: "Answer the questions above. The more detail you give, the sharper the analysis will be.",
    isAnalysis: (text) => text.includes("## Problem Statement") || text.includes("## Current State"),
  },
  "user-story-generator": {
    id: "user-story-generator",
    label: "User Story Generator",
    color: "#a78bfa",
    apiEndpoint: "/api/workspace/user-stories",
    welcomeTitle: "What requirements or feature are you turning into stories?",
    welcomeSubtitle: "Paste your requirements, describe an epic, or summarise what needs to be built. I will clarify the personas and scope, then write a complete, prioritised set of user stories.",
    examples: [
      "We need a customer portal where users can track their order status and manage returns",
      "Automate the monthly compliance reporting process currently done manually in Excel",
      "Build a notification system for our field technicians when jobs are assigned or updated",
      "Add multi-currency support to our billing module for international clients",
    ],
    inputPlaceholderInitial: "Paste your requirements, describe the epic, or explain what needs to be built. Include any context about the system or users if you have it.",
    inputPlaceholderFollowup: "Answer the questions above so I can write stories that actually match your users and scope.",
    isAnalysis: (text) => text.includes("**US-") || text.includes("## Story Summary"),
    renderOutput: renderStoryOutput,
  },
  "requirements-analyzer": {
    id: "requirements-analyzer",
    label: "Requirements Analyzer",
    color: "#34d399",
    apiEndpoint: "/api/workspace/requirements",
    welcomeTitle: "Paste your notes and I will extract your requirements.",
    welcomeSubtitle: "Give me meeting notes, a workshop transcript, an email thread, or any unstructured input. I will extract and structure every functional requirement, business rule, assumption, risk, and open question buried in it.",
    examples: [
      "Paste meeting notes from a requirements workshop",
      "Paste a stakeholder interview transcript",
      "Paste an email thread with requirement requests from the business",
      "Paste a scope document or project brief that needs structuring",
    ],
    inputPlaceholderInitial: "Paste your meeting notes, transcript, email thread, or any unstructured input here. The messier it is, the more value you will get out.",
    inputPlaceholderFollowup: "Answer the questions above so I can extract requirements with the right context and priorities.",
    isAnalysis: (text) => text.includes("# Requirements Package") || text.includes("## Functional Requirements"),
  },
  "interview-copilot": {
    id: "interview-copilot",
    label: "Interview Copilot",
    color: "#7c6ef5",
    apiEndpoint: "/api/workspace/interview-prep",
    welcomeTitle: "Paste the job description and I will build your prep pack.",
    welcomeSubtitle: "Give me the full JD — or even just the role title and key requirements. I will decode what they are really testing for, build a question bank specific to this role, and give you STAR templates ready to fill in.",
    examples: [
      "Senior Business Analyst — Financial Services, London. Requirements: BABOK, Agile, stakeholder management, regulatory experience preferred.",
      "Business Analyst, Healthcare Technology. Must have: requirements elicitation, process mapping, HL7/FHIR a plus.",
      "Lead BA — Digital Transformation. 7+ years exp. Enterprise architecture, change management, executive stakeholder engagement.",
      "Junior BA / Associate Business Analyst — graduate scheme, financial services, no experience required.",
    ],
    inputPlaceholderInitial: "Paste the full job description here. The more detail you give me, the more specific your prep pack will be.",
    inputPlaceholderFollowup: "Tell me your experience level — first BA role, mid-level (2–5 years), or senior/lead.",
    isAnalysis: (text) => text.includes("# Interview Prep Pack") || text.includes("## Question Bank"),
  },
  "portfolio-builder": {
    id: "portfolio-builder",
    label: "Portfolio Builder",
    color: "#a78bfa",
    apiEndpoint: "/api/workspace/portfolio",
    welcomeTitle: "Tell me about a project you worked on.",
    welcomeSubtitle: "Describe any real BA project — what you were asked to do, what you actually did, and what happened. I will ask two questions, then write a professional case study ready for interviews and applications.",
    examples: [
      "I was the BA on a core banking system replacement — 18 months, 4 departments, multiple integration challenges",
      "I led requirements for a new customer portal — the stakeholders kept changing their minds and we were behind schedule",
      "I analysed and redesigned the claims processing workflow for an insurance company — reduced processing time significantly",
      "I worked on a digital transformation programme — moving a 500-person ops team to a new ERP system",
    ],
    inputPlaceholderInitial: "Describe the project — what it was, your role, what you did, and what the outcome was. Don't worry about format — write it as you'd explain it to a colleague.",
    inputPlaceholderFollowup: "Answer the questions above so I can make your case study as specific and impactful as possible.",
    isAnalysis: (text) => text.includes("## The Situation") || text.includes("## Interview Talking Points"),
  },
  "process-analyzer": {
    id: "process-analyzer",
    label: "Process Analyzer",
    color: "#38bdf8",
    apiEndpoint: "/api/workspace/process",
    welcomeTitle: "Which process are you analysing?",
    welcomeSubtitle: "Describe the process in plain language — an SOP, a workflow, or just how things work today. I will ask two questions, then map the current state, find the bottlenecks, and design the future state.",
    examples: [
      "Our customer onboarding process involves 6 departments and takes 15 days on average",
      "The monthly financial close process — it takes 8 days and always has errors in the final reconciliation",
      "New employee onboarding from offer acceptance to first day — too many manual steps and handoffs",
      "Our incident management process — tickets get stuck waiting for approvals and SLAs are breached",
    ],
    inputPlaceholderInitial: "Describe the process — how it works today, who is involved, and what systems are used. The more detail the better.",
    inputPlaceholderFollowup: "Answer the questions above so I can map the process accurately and find where it actually breaks.",
    isAnalysis: (text) => text.includes("# Process Analysis") || text.includes("## Current State"),
  },
  "document-generator-brd": {
    id: "document-generator-brd",
    label: "BRD Generator",
    color: "#fb923c",
    apiEndpoint: "/api/workspace/documents",
    welcomeTitle: "Tell me about your project and I will write your BRD.",
    welcomeSubtitle: "Describe the business problem, the proposed solution, or paste your existing notes. I will ask a few clarifying questions, then produce a complete, stakeholder-ready Business Requirements Document.",
    examples: [
      "We are replacing our legacy claims system with a modern cloud platform",
      "We need to build a self-service customer portal for our banking clients",
      "Our manual compliance reporting process needs to be automated",
      "We are launching a new mobile app for field service technicians",
    ],
    inputPlaceholderInitial: "Describe your project, the business problem, or paste your existing notes and requirements.",
    inputPlaceholderFollowup: "Answer the questions above so the BRD reflects your actual scope and stakeholders.",
    isAnalysis: (text) => text.includes("# Business Requirements Document") || text.includes("## 1. Executive Summary"),
  },
  "document-generator-frd": {
    id: "document-generator-frd",
    label: "FRD Generator",
    color: "#f87171",
    apiEndpoint: "/api/workspace/documents",
    welcomeTitle: "What system or feature are you documenting?",
    welcomeSubtitle: "Describe the system, feature, or paste your requirements. I will ask about the user types and integrations, then produce a complete Functional Requirements Document.",
    examples: [
      "A customer account management module for our insurance platform",
      "Notification system for job assignments in our field service app",
      "Multi-currency billing module for international clients",
      "Role-based access control system for our enterprise portal",
    ],
    inputPlaceholderInitial: "Describe the system or feature you need to document. Include any requirements you already have.",
    inputPlaceholderFollowup: "Answer the questions above so the FRD covers the right scope and integrations.",
    isAnalysis: (text) => text.includes("# Functional Requirements Document") || text.includes("## 4. Functional Requirements"),
  },
  "document-generator-usecases": {
    id: "document-generator-usecases",
    label: "Use Case Generator",
    color: "#facc15",
    apiEndpoint: "/api/workspace/documents",
    welcomeTitle: "What system or feature needs use cases?",
    welcomeSubtitle: "Describe the system or paste your requirements. I will ask about the actors and key workflows, then produce a complete use case set ready for development and testing.",
    examples: [
      "A patient appointment booking system for a private clinic",
      "Customer self-service returns and refunds portal",
      "Loan application and approval workflow for a bank",
      "Inventory management system for a warehouse operation",
    ],
    inputPlaceholderInitial: "Describe the system, feature, or user journeys you need use cases for.",
    inputPlaceholderFollowup: "Answer the questions above so the use cases cover the right actors and workflows.",
    isAnalysis: (text) => text.includes("# Use Case Document") || text.includes("## UC-"),
  },
};

// ── Doc type picker ───────────────────────────────────────────────────────────
function DocTypePicker({ onSelect, onBack }: { onSelect: (id: string) => void; onBack: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color .15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--t2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--t3)"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Workspace
        </button>
        <div style={{ width: 1, height: 16, background: "var(--border)" }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Document Generator</span>
      </header>

      <div style={{ flex: 1, padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 560, width: "100%" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 8, textAlign: "center" }}>
            Which document do you need?
          </h2>
          <p style={{ fontSize: 14, color: "var(--t3)", textAlign: "center", lineHeight: 1.6, marginBottom: 36 }}>
            Each document type has its own Intelligence Engine tuned specifically for that format.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {DOC_TYPES.map(doc => (
              <button key={doc.id} onClick={() => onSelect(`document-generator-${doc.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left", transition: "border-color .2s, background .2s, transform .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${doc.color}35`; e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.transform = "translateX(4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-1)"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${doc.color}12`, border: `1px solid ${doc.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, color: doc.color }}>{doc.short}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>{doc.label}</div>
                  <div style={{ fontSize: 13, color: "var(--t3)", lineHeight: 1.5 }}>{doc.desc}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export helper ─────────────────────────────────────────────────────────────
async function downloadOutput(content: string, title: string, format: "txt" | "docx") {
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

// ── File upload button ────────────────────────────────────────────────────────
function FileUploadButton({ onParsed, color }: { onParsed: (text: string, name: string) => void; color: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg, setErrMsg]  = useState("");

  async function handleFile(file: File) {
    setStatus("loading");
    setErrMsg("");
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
      <label
        title={status === "loading" ? "Parsing document…" : "Attach a document (PDF, Word, TXT)"}
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

// ── Workspace session (shared engine) ─────────────────────────────────────────
function WorkspaceSession({ toolId, onBack }: { toolId: string; onBack: () => void }) {
  const config = SESSION_CONFIGS[toolId];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [phase, setPhase]       = useState<"initial" | "followup" | "done">("initial");
  const endRef      = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { textareaRef.current?.focus(); }, [phase]);

  if (!config) return null;

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const docType = toolId.startsWith("document-generator-") ? toolId.replace("document-generator-", "") : undefined;
      const res  = await fetch(config.apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMessages, ...(docType && { docType }) }) });
      const data = await res.json();
      const reply = data.response ?? "Something went wrong. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (phase === "initial") setPhase("followup");
      else if (config.isAnalysis(reply)) setPhase("done");
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function reset() { setMessages([]); setPhase("initial"); setInput(""); }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color .15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--t2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--t3)"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Workspace
        </button>
        <div style={{ width: 1, height: 16, background: "var(--border)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: config.color, animation: "pulse-dot 1.8s ease-in-out infinite" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>{config.label}</span>
        </div>
        {phase === "done" && (
          <button onClick={reset} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--t3)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", transition: "color .15s, border-color .15s" }}
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
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${config.color}14`, border: `1px solid ${config.color}28`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: config.color }}>BA</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 10 }}>
              {config.welcomeTitle}
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--t3)", lineHeight: 1.7, marginBottom: 36 }}>
              {config.welcomeSubtitle}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left" }}>
              {config.examples.map((ex, i) => (
                <button key={i} onClick={() => setInput(ex)} style={{ padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--t2)", textAlign: "left", lineHeight: 1.5, cursor: "pointer", transition: "border-color .15s, color .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${config.color}35`; e.currentTarget.style.color = "var(--t1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t2)"; }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const isLast = i === messages.length - 1;
          const isStructured = !isUser && config.isAnalysis(msg.content);

          if (isUser) return (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <div style={{ maxWidth: "72%", padding: "12px 16px", background: `${config.color}14`, border: `1px solid ${config.color}28`, borderRadius: "14px 14px 3px 14px", fontSize: 14, color: "var(--t1)", lineHeight: 1.6 }}>
                {msg.content}
              </div>
            </div>
          );

          if (isStructured) return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${config.color}14`, border: `1px solid ${config.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: config.color, flexShrink: 0 }}>BA</div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)" }}>
                  {toolId === "user-story-generator" ? "Stories ready" : "Analysis complete"}
                </span>
                {isLast && <div style={{ width: 6, height: 6, borderRadius: "50%", background: config.color }} />}
              </div>
              <div style={{ background: "var(--bg-1)", border: `1px solid ${config.color}18`, borderRadius: "var(--radius-lg)", padding: "24px 28px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }} />
                {config.renderOutput ? config.renderOutput(msg.content) : renderMarkdown(msg.content)}
              </div>
            </div>
          );

          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${config.color}14`, border: `1px solid ${config.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: config.color, flexShrink: 0, marginTop: 2 }}>BA</div>
              <div style={{ maxWidth: "78%", padding: "12px 16px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "3px 14px 14px 14px", fontSize: 14, color: "var(--t1)", lineHeight: 1.68 }}>
                {renderMarkdown(msg.content)}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${config.color}14`, border: `1px solid ${config.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: config.color, flexShrink: 0 }}>BA</div>
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
            onFocusCapture={e => (e.currentTarget.style.borderColor = `${config.color}45`)}
            onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={phase === "initial" ? config.inputPlaceholderInitial : config.inputPlaceholderFollowup}
              rows={3}
              style={{ width: "100%", background: "none", border: "none", outline: "none", padding: "16px 18px", fontSize: 14, color: "var(--t1)", lineHeight: 1.65, resize: "none", fontFamily: "var(--font-body)" }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileUploadButton color={config.color} onParsed={(text, name) => setInput(prev => prev ? `${prev}\n\n[From: ${name}]\n${text}` : `[From: ${name}]\n${text}`)} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t4)" }}>Attach doc or Enter to send</span>
              </div>
              <button onClick={send} disabled={!input.trim() || loading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: input.trim() && !loading ? config.color : `${config.color}20`, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, color: input.trim() && !loading ? "#041a13" : "var(--t4)", transition: "all .2s" }}>
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
            <button onClick={reset} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, background: config.color, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#041a13" }}>
              Start over
            </button>
            {(["docx", "txt"] as const).map(fmt => (
              <button key={fmt} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--t2)", transition: "color .15s, border-color .15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--t1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--t2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                onClick={() => { const t = messages.filter(m => m.role === "assistant").map(m => m.content).join("\n\n---\n\n"); downloadOutput(t, config.label, fmt); }}
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

// ── Workspace Hub ──────────────────────────────────────────────────────────────
function WorkspaceHub({ onSelectTool }: { onSelectTool: (id: string) => void }) {
  return (
    <div style={{ padding: "32px 36px" }}>
      <header style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 6 }}>
          What are you working on today?
        </h1>
        <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.6 }}>
          Choose a tool to get started. The Intelligence Engine does the heavy lifting.
        </p>
      </header>

      <div className="ws-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {TOOLS.map(tool => (
          <div key={tool.id}
            onClick={() => {
              if (!tool.live) return;
              if (tool.href) { window.location.href = tool.href; return; }
              onSelectTool(tool.id);
            }}
            style={{
              background: "var(--bg-1)",
              border: `1px solid ${tool.live ? "var(--border)" : "rgba(255,255,255,.04)"}`,
              borderRadius: "var(--radius-lg)",
              padding: "28px 24px",
              cursor: tool.live ? "pointer" : "not-allowed",
              opacity: tool.live ? 1 : 0.5,
              transition: "border-color .2s, background .2s, transform .2s",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={e => {
              if (!tool.live) return;
              (e.currentTarget as HTMLDivElement).style.borderColor = `${tool.color}35`;
              (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = tool.live ? "var(--border)" : "rgba(255,255,255,.04)";
              (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)";
              (e.currentTarget as HTMLDivElement).style.transform = "none";
            }}
          >
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(ellipse, ${tool.color}07 0%, transparent 65%)`, pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${tool.color}12`, border: `1px solid ${tool.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tool.icon}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase" as const, letterSpacing: ".06em", background: `${tool.tagColor}15`, color: tool.tagColor, border: `1px solid ${tool.tagColor}25` }}>
                {tool.tag}
              </span>
            </div>

            <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700, color: "var(--t1)", marginBottom: 8, letterSpacing: "-0.01em" }}>
              {tool.label}
            </div>
            <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65, flex: 1, marginBottom: 16 }}>
              {tool.desc}
            </p>

            {tool.live && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: tool.color }}>
                {tool.href ? "Open" : "Launch"}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick links to existing tools */}
      <div style={{ marginTop: 32, padding: "20px 24px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t3)", flexShrink: 0 }}>Also in your workspace</span>
        {[
          { label: "Resume Analyzer",    href: "/workspace/resumes",      color: "#38bdf8" },
          { label: "Portfolio Builder",  href: "portfolio-builder",       color: "#a78bfa", internal: true },
          { label: "Interview Copilot",  href: "interview-copilot",       color: "#7c6ef5", internal: true },
          { label: "Career Suite",       href: "/career",                 color: "#fb923c" },
          { label: "Process Flow",       href: "/tools/process-flow",     color: "#34d399" },
          { label: "Saved Jobs",         href: "/workspace/jobs",         color: "#facc15" },
        ].map(link => (
          link.internal ? (
            <button key={link.label} onClick={() => onSelectTool(link.href)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--t2)", background: "none", border: "none", cursor: "pointer", transition: "color .15s", padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = link.color)}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
            >
              {link.label}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ) : (
            <Link key={link.label} href={link.href} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--t2)", textDecoration: "none", transition: "color .15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = link.color)}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
            >
              {link.label}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </Link>
          )
        ))}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function WorkspaceClient({ user, profile, resumes, savedJobs }: Props) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Inject CSS vars and animations if not already present
  useEffect(() => {
    const id = "workspace-globals";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      :root {
        --bg: #07070a; --bg-1: #0d0d12; --bg-2: #111117; --bg-3: #16161e;
        --teal: #1fbf9f; --teal-hi: #2ddbb8;
        --teal-soft: rgba(31,191,159,0.08); --teal-border: rgba(31,191,159,0.18);
        --surface: #0d0d12;
        --t1: #f2f2f8; --t2: #9090a8; --t3: #505068; --t4: #2a2a38;
        --text-1: #f2f2f8; --text-2: #9090a8; --text-3: #505068;
        --border: rgba(255,255,255,0.07);
        --font-display: 'Inter', sans-serif;
        --font-body: 'Open Sans', sans-serif;
        --font-mono: 'JetBrains Mono', monospace;
        --radius-sm: 10px; --radius: 16px; --radius-lg: 24px;
      }
      @keyframes pulse-dot {
        0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(31,191,159,.22);}
        50%{opacity:.7;box-shadow:0 0 0 6px transparent;}
      }
      @keyframes typing-dot {
        0%,80%,100%{transform:scale(.6);opacity:.3;}
        40%{transform:scale(1);opacity:1;}
      }
      @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #07070a; }
      textarea::placeholder { color: var(--t4); }
      @media(max-width: 768px) {
        .ws-grid { grid-template-columns: 1fr 1fr !important; }
        .ws-session-pad { padding: 16px !important; }
      }
      @media(max-width: 480px) {
        .ws-grid { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/workspace" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: activeTool ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
        {activeTool === "document-generator" ? (
          <DocTypePicker onSelect={setActiveTool} onBack={() => setActiveTool(null)} />
        ) : activeTool && SESSION_CONFIGS[activeTool] ? (
          <WorkspaceSession toolId={activeTool} onBack={() => setActiveTool(null)} />
        ) : (
          <WorkspaceHub onSelectTool={setActiveTool} />
        )}
      </main>
    </div>
  );
}
