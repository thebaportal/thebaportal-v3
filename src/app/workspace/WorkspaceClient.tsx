"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DocumentViewer from "@/components/DocumentViewer";
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
function parseMdTableWs(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const dataLines = lines.filter(l => !l.includes("---"));
  if (dataLines.length < 2) return null;
  const parse = (l: string) => l.split("|").map(c => c.trim().replace(/\*\*/g, "")).filter((_,ix,a) => ix > 0 && ix < a.length - 1);
  return { headers: parse(dataLines[0]), rows: dataLines.slice(1).map(parse) };
}
function WsBold({ t, color = "#1fbf9f" }: { t: string; color?: string }) {
  const parts = t.split(/\*\*([^*]+)\*\*/);
  return <>{parts.map((p,i) => i%2===1 ? <strong key={i} style={{fontWeight:700,color:"var(--t1)"}}>{p}</strong> : <span key={i}>{p}</span>)}</>;
}
function renderMarkdown(text: string, accent = "#1fbf9f"): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { nodes.push(<div key={`s${i}`} style={{ height: 6 }} />); i++; continue; }
    if (t.startsWith("# "))   { nodes.push(<h2 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", margin: "4px 0 12px" }}>{t.slice(2).replace(/\*\*/g,"")}</h2>); i++; continue; }
    if (t.startsWith("## "))  { nodes.push(<h3 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: accent, letterSpacing: "-0.01em", margin: "22px 0 8px", paddingBottom: 6, borderBottom: `1px solid ${accent}20` }}>{t.slice(3).replace(/\*\*/g,"")}</h3>); i++; continue; }
    if (t.startsWith("### ")) { nodes.push(<h4 key={i} style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 700, color: "var(--t1)", margin: "14px 0 5px" }}>{t.slice(4).replace(/\*\*/g,"")}</h4>); i++; continue; }
    if (t === "---") { nodes.push(<div key={i} style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />); i++; continue; }
    if (t.startsWith("|") && lines[i+1]?.includes("---")) {
      const tLines: string[] = [];
      while (i < lines.length && lines[i]?.trim().startsWith("|")) { tLines.push(lines[i].trim()); i++; }
      const tbl = parseMdTableWs(tLines);
      if (tbl) nodes.push(
        <div key={`tbl${i}`} style={{ borderRadius: 8, border: `1px solid ${accent}18`, overflow: "hidden", margin: "12px 0 20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{tbl.headers.map((h,hi) => <th key={hi} style={{ textAlign: "left", padding: "10px 14px", background: `${accent}10`, borderBottom: `2px solid ${accent}28`, fontWeight: 700, color: "var(--t1)", fontSize: 12, fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{tbl.rows.map((row,ri) => <tr key={ri} style={{ background: ri%2===0 ? "rgba(255,255,255,.02)" : "transparent" }}>{tbl.headers.map((_,ci) => <td key={ci} style={{ padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "var(--t2)", lineHeight: 1.6, verticalAlign: "top" }}><WsBold t={row[ci]??""} color={accent}/></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i]?.trim().startsWith("- ") || lines[i]?.trim().startsWith("* "))) { items.push(lines[i].trim().slice(2)); i++; }
      nodes.push(<ul key={`ul${i}`} style={{ margin: "6px 0 14px", paddingLeft: 0, listStyle: "none" }}>{items.map((item,ii) => <li key={ii} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 }}><div style={{ width: 4, height: 4, borderRadius: "50%", background: accent, flexShrink: 0, marginTop: 9 }}/><span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}><WsBold t={item} color={accent}/></span></li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]?.trim() ?? "")) { items.push(lines[i].trim().replace(/^\d+\.\s/, "")); i++; }
      nodes.push(<ol key={`ol${i}`} style={{ margin: "6px 0 14px", paddingLeft: 0, listStyle: "none" }}>{items.map((item,ii) => <li key={ii} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: `${accent}10`, border: `1px solid ${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: accent, flexShrink: 0, marginTop: 2 }}>{ii+1}</div><span style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.65 }}><WsBold t={item} color={accent}/></span></li>)}</ol>);
      continue;
    }
    if (t.startsWith("**") && t.endsWith("**") && !t.slice(2,-2).includes("**")) { nodes.push(<p key={i} style={{ fontSize: 13.5, fontWeight: 700, color: "var(--t1)", margin: "10px 0 4px", fontFamily: "var(--font-display)" }}>{t.slice(2,-2)}</p>); i++; continue; }
    nodes.push(<p key={i} style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.72, margin: "0 0 8px" }}><WsBold t={t} color={accent}/></p>);
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
  "stakeholder-analyzer": {
    id: "stakeholder-analyzer",
    label: "Stakeholder Analysis",
    color: "#facc15",
    apiEndpoint: "/api/workspace/stakeholders",
    welcomeTitle: "Who influences the success of this project?",
    welcomeSubtitle: "Describe your project and the change being proposed. I'll ask two questions, then map your stakeholders, predict objections, and design an engagement strategy.",
    examples: [
      "Digital transformation programme — 3 departments, leadership resistant",
      "New ERP implementation — operations team worried about job changes",
      "Customer data platform rollout — legal, IT and marketing all have concerns",
      "Process automation project — manual workers fear being replaced",
    ],
    inputPlaceholderInitial: "Describe the project and the change being proposed. Who do you already know is involved or concerned?",
    inputPlaceholderFollowup: "Answer the questions above so I can map your stakeholders accurately.",
    isAnalysis: (text: string) => text.includes("## Stakeholder Register") || text.includes("Stakeholder analysis complete"),
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

// ── Extract project name from analysis content ────────────────────────────────
function suggestProjectName(content: string): string {
  // Try "## Problem Statement" section first
  const psMatch = content.match(/## Problem Statement\n+([^\n]+)/);
  if (psMatch) {
    const ps = psMatch[1].replace(/\*\*/g, "").trim();
    return ps.length > 60 ? ps.slice(0, 60).replace(/\s\S*$/, "") : ps;
  }
  // Try "**Project:**" pattern from requirements
  const projMatch = content.match(/\*\*Project:\*\*\s*([^\n]+)/);
  if (projMatch) return projMatch[1].trim().slice(0, 60);
  // Fall back to first meaningful non-header line
  const firstLine = content.split("\n").find(l => l.trim() && !l.startsWith("#") && !l.startsWith("|") && l.trim().length > 10);
  if (firstLine) {
    const clean = firstLine.replace(/\*\*/g, "").trim();
    return clean.length > 60 ? clean.slice(0, 60).replace(/\s\S*$/, "") : clean;
  }
  return "";
}

// ── Tool → artifact type map ──────────────────────────────────────────────────
const TOOL_ARTIFACT_TYPE: Record<string, string | null> = {
  "problem-analyzer":          "problem_analysis",
  "requirements-analyzer":     "requirements",
  "user-story-generator":      "user_stories",
  "process-analyzer":          "process_map",
  "document-generator-brd":    "brd",
  "document-generator-frd":    "frd",
  "document-generator-usecases":"use_cases",
  "interview-copilot":         null,
  "portfolio-builder":         null,
};

// ── Save to project modal ─────────────────────────────────────────────────────
interface ProjectItem { id: string; name: string; organizations?: { name: string }; }

function SaveToProjectModal({ content, toolId, onClose }: { content: string; toolId: string; onClose: () => void }) {
  const router = useRouter();
  const [projects, setProjects]     = useState<ProjectItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [mode, setMode]             = useState<"list" | "new">("list");
  const [projectName, setProjectName] = useState(() => suggestProjectName(content));
  const [orgName, setOrgName]       = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(d => { setProjects(d.projects ?? []); setMode(d.projects?.length ? "list" : "new"); })
      .catch(() => setMode("new"))
      .finally(() => setLoading(false));
  }, []);

  const artifactType = TOOL_ARTIFACT_TYPE[toolId] ?? "problem_analysis";
  const artifactTitle = SESSION_CONFIGS[toolId]?.label ?? toolId;

  async function saveToExisting(projectId: string) {
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: artifactType, title: artifactTitle, content, status: "draft", reasoning_context: { source: "workspace", tool: toolId } }),
    });
    if (res.ok) setSavedProjectId(projectId);
    setSaving(false);
  }

  async function saveToNew() {
    if (!projectName.trim()) return;
    setSaving(true);
    const projRes = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName.trim(), org_name: orgName.trim() || projectName.trim() }),
    });
    const projData = await projRes.json();
    if (!projRes.ok) { setSaving(false); return; }
    const artifactRes = await fetch(`/api/projects/${projData.project.id}/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: artifactType, title: artifactTitle, content, status: "draft", reasoning_context: { source: "workspace", tool: toolId } }),
    });
    if (artifactRes.ok) setSavedProjectId(projData.project.id);
    setSaving(false);
  }

  const inp = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", fontSize: 13, color: "var(--t1)", outline: "none", width: "100%", fontFamily: "var(--font-body)" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 }}>
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "28px", width: "100%", maxWidth: 460, boxShadow: "0 24px 64px rgba(0,0,0,.6)" }}>

        {savedProjectId ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(31,191,159,.12)", border: "1px solid rgba(31,191,159,.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 8 }}>Saved to project</h3>
            <p style={{ fontSize: 13.5, color: "var(--t3)", marginBottom: 22, lineHeight: 1.6 }}>Your analysis is saved as a draft artifact. Open the project to continue working on it.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => router.push(`/projects/${savedProjectId}`)} style={{ padding: "9px 20px", background: "var(--teal)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 700, color: "#041a13", cursor: "pointer" }}>
                Open project
              </button>
              <button onClick={onClose} style={{ padding: "9px 16px", background: "none", border: "1px solid var(--border)", borderRadius: 9, fontSize: 13, color: "var(--t3)", cursor: "pointer" }}>
                Stay here
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--t1)", margin: 0 }}>Save to project</h3>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--t4)", fontSize: 13 }}>Loading your projects...</div>
            ) : mode === "list" ? (
              <>
                <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 14, lineHeight: 1.55 }}>
                  Choose a project to save this {artifactTitle} to, or create a new one.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto", marginBottom: 14 }}>
                  {projects.map(p => (
                    <button key={p.id} onClick={() => saveToExisting(p.id)} disabled={saving}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, cursor: saving ? "wait" : "pointer", textAlign: "left", transition: "border-color .15s" }}
                      onMouseEnter={e => !saving && (e.currentTarget.style.borderColor = "rgba(31,191,159,.3)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t1)", marginBottom: 2 }}>{p.name}</div>
                        {p.organizations?.name && <div style={{ fontSize: 11.5, color: "var(--t4)" }}>{p.organizations.name}</div>}
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  ))}
                </div>
                <button onClick={() => setMode("new")} style={{ width: "100%", padding: "11px", background: "none", border: "1px dashed rgba(255,255,255,.1)", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "var(--t3)", cursor: "pointer", transition: "border-color .15s, color .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(31,191,159,.3)"; e.currentTarget.style.color = "var(--teal)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; e.currentTarget.style.color = "var(--t3)"; }}>
                  + Create new project
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 16, lineHeight: 1.55 }}>
                  Give this project a name and we will save your analysis to it automatically.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", marginBottom: 5 }}>Project name *</div>
                    <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Customer Onboarding Transformation" style={inp}
                      onFocus={e => e.target.style.borderColor = "rgba(31,191,159,.4)"} onBlur={e => e.target.style.borderColor = "var(--border)"}
                      onKeyDown={e => { if (e.key === "Enter" && projectName.trim()) saveToNew(); }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", marginBottom: 5 }}>Organisation / Client <span style={{ fontWeight: 400, color: "var(--t4)" }}>(optional)</span></div>
                    <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. First Bank Nigeria, Suncor Energy" style={inp}
                      onFocus={e => e.target.style.borderColor = "rgba(31,191,159,.4)"} onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                    <button onClick={saveToNew} disabled={!projectName.trim() || saving} style={{ flex: 1, padding: "10px", background: projectName.trim() ? "var(--teal)" : "rgba(31,191,159,.25)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 700, color: "#041a13", cursor: projectName.trim() ? "pointer" : "not-allowed" }}>
                      {saving ? "Saving..." : "Save and create project"}
                    </button>
                    {projects.length > 0 && (
                      <button onClick={() => setMode("list")} style={{ padding: "10px 14px", background: "none", border: "1px solid var(--border)", borderRadius: 9, fontSize: 13, color: "var(--t3)", cursor: "pointer" }}>Back</button>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
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
function WorkspaceSession({ toolId, onBack, onSaveToProject, initialInput, projectName }: { toolId: string; onBack: () => void; onSaveToProject: (content: string, toolId: string) => void; initialInput?: string; projectName?: string | null }) {
  const router = useRouter();
  const config = SESSION_CONFIGS[toolId];
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [phase, setPhase]             = useState<"initial" | "followup" | "done">("initial");
  const [viewMode, setViewMode]       = useState<"chat" | "document">("chat");
  const [autoProject, setAutoProject] = useState<{ id: string; name: string } | null>(null);
  const [saveStatus, setSaveStatus]   = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editingIdx, setEditingIdx]   = useState<number | null>(null);
  const [editText, setEditText]       = useState("");
  const endRef      = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { textareaRef.current?.focus(); }, [phase]);

  async function autoSave(content: string) {
    if (saveStatus === "saving" || saveStatus === "saved") return;
    const artifactType = TOOL_ARTIFACT_TYPE[toolId];
    if (!artifactType) return;
    setSaveStatus("saving");
    try {
      const name = projectName || suggestProjectName(content) || `Analysis ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
      const projRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, org_name: name }),
      });
      const projData = await projRes.json();
      if (!projRes.ok) {
        console.error("[autoSave] project create failed:", projRes.status, projData);
        setSaveStatus("error");
        return;
      }
      const project = projData.project;
      const artRes = await fetch(`/api/projects/${project.id}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: artifactType, title: config.label, content, status: "draft", reasoning_context: { source: "workspace", tool: toolId } }),
      });
      if (artRes.ok) {
        setAutoProject({ id: project.id, name: project.name });
        setSaveStatus("saved");
      } else {
        const artData = await artRes.json().catch(() => ({}));
        console.error("[autoSave] artifact save failed:", artRes.status, artData);
        setSaveStatus("error");
      }
    } catch (err) {
      console.error("[autoSave] network error:", err);
      setSaveStatus("error");
    }
  }

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
      else if (config.isAnalysis(reply)) { setPhase("done"); autoSave(reply); }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function reset() { setMessages([]); setPhase("initial"); setInput(""); setViewMode("chat"); setEditingIdx(null); setSaveStatus("idle"); setAutoProject(null); }

  async function submitEdit() {
    if (editingIdx === null || !editText.trim() || loading) return;
    const truncated = messages.slice(0, editingIdx);
    const newMsg: Message = { role: "user", content: editText.trim() };
    const newMessages = [...truncated, newMsg];
    setMessages(newMessages);
    setEditingIdx(null);
    setInput("");
    setLoading(true);
    setPhase("followup");
    setSaveStatus("idle");
    setAutoProject(null);
    try {
      const docType = toolId.startsWith("document-generator-") ? toolId.replace("document-generator-", "") : undefined;
      const res = await fetch(config.apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMessages, ...(docType && { docType }) }) });
      const data = await res.json();
      const reply = data.response ?? "Something went wrong.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (config.isAnalysis(reply)) { setPhase("done"); autoSave(reply); }
      else setPhase("followup");
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function printDocument(content: string, title: string) {
    const escHtml = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const mdToHtml = (md: string) => md.split("\n").map(line => {
      if (line.startsWith("### ")) return `<h3>${escHtml(line.slice(4))}</h3>`;
      if (line.startsWith("## "))  return `<h2>${escHtml(line.slice(3))}</h2>`;
      if (line.startsWith("# "))   return `<h1>${escHtml(line.slice(2))}</h1>`;
      if (line.startsWith("| ") && !line.includes("---")) return `<tr>${line.split("|").filter((_,i,a)=>i>0&&i<a.length-1).map(c=>`<td>${escHtml(c.trim())}</td>`).join("")}</tr>`;
      if (line.includes("---") && line.includes("|")) return "";
      if (line.startsWith("- ") || line.startsWith("* ")) return `<li>${escHtml(line.slice(2))}</li>`;
      if (line.trim() === "---") return "<hr/>";
      if (!line.trim()) return "<br/>";
      return `<p>${escHtml(line).replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>")}</p>`;
    }).join("\n");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${escHtml(title)}</title><style>
      body{font-family:Georgia,serif;max-width:820px;margin:40px auto;color:#1a1a2e;line-height:1.7;font-size:14px}
      h1{font-size:22px;border-bottom:2px solid #1fbf9f;padding-bottom:10px;margin-bottom:24px}
      h2{font-size:17px;margin-top:28px;margin-bottom:8px;color:#0d0d1a}
      h3{font-size:14px;font-weight:700;margin-top:18px;margin-bottom:6px}
      table{width:100%;border-collapse:collapse;margin:14px 0}
      tr:first-child td{background:#f0faf8;font-weight:700;border-bottom:2px solid #1fbf9f}
      td{padding:8px 12px;border-bottom:1px solid #dde}
      li{margin-bottom:4px}ul{padding-left:20px}
      hr{border:none;border-top:1px solid #dde;margin:20px 0}
      @media print{@page{margin:2cm}body{margin:0}}
    </style></head><body>
      <h1>${escHtml(title)}</h1>
      ${mdToHtml(content)}
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  // Auto-send pre-loaded input from ConversationHub
  useEffect(() => {
    if (!initialInput) return;
    const trimmed = initialInput.trim();
    if (!trimmed) return;
    const newMessages: Message[] = [{ role: "user", content: trimmed }];
    setMessages(newMessages);
    setPhase("followup");
    (async () => {
      try {
        const docType = toolId.startsWith("document-generator-") ? toolId.replace("document-generator-", "") : undefined;
        const res  = await fetch(config.apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMessages, ...(docType && { docType }) }) });
        const data = await res.json();
        const reply = data.response ?? "Something went wrong. Please try again.";
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
        if (config.isAnalysis(reply)) { setPhase("done"); autoSave(reply); }
      } catch {
        setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analysisContent = messages.filter(m => m.role === "assistant" && config.isAnalysis(m.content)).map(m => m.content).join("\n\n---\n\n");

  if (viewMode === "document" && analysisContent) {
    return (
      <DocumentViewer
        content={analysisContent}
        title={config.label}
        accentColor={config.color}
        onBack={() => setViewMode("chat")}
        onCopy={() => navigator.clipboard?.writeText(analysisContent)}
        onDownload={(fmt) => downloadOutput(analysisContent, config.label, fmt)}
      />
    );
  }

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
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
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

          if (isUser) {
            if (editingIdx === i) return (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <div style={{ width: "72%", display: "flex", flexDirection: "column", gap: 8 }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus rows={4}
                    style={{ width: "100%", background: `${config.color}0a`, border: `1px solid ${config.color}50`, borderRadius: "12px 12px 3px 12px", padding: "12px 16px", fontSize: 14, color: "var(--t1)", lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "var(--font-body)" }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === "Escape") setEditingIdx(null); }}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={submitEdit} disabled={!editText.trim() || loading}
                      style={{ padding: "6px 16px", borderRadius: 8, background: editText.trim() ? config.color : `${config.color}30`, border: "none", cursor: editText.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, color: "#041a13" }}>
                      Resubmit
                    </button>
                    <button onClick={() => setEditingIdx(null)} style={{ padding: "6px 12px", borderRadius: 8, background: "none", border: "1px solid var(--border)", cursor: "pointer", fontSize: 13, color: "var(--t3)" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
            return (
              <div key={i} className="msg-group" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, position: "relative" }}>
                <div style={{ position: "relative" }}>
                  <div className="msg-actions" style={{ position: "absolute", top: -30, right: 0, display: "none", alignItems: "center", gap: 3, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "3px 6px", zIndex: 10 }}>
                    <button onClick={() => navigator.clipboard?.writeText(msg.content)} title="Copy" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: "2px 5px", borderRadius: 4, fontSize: 11 }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--t1)"} onMouseLeave={e => e.currentTarget.style.color = "var(--t3)"}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                    <button onClick={() => { setEditingIdx(i); setEditText(msg.content); }} title="Edit and resubmit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: "2px 5px", borderRadius: 4, fontSize: 11 }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--t1)"} onMouseLeave={e => e.currentTarget.style.color = "var(--t3)"}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                  <div style={{ maxWidth: "72%", padding: "12px 16px", background: `${config.color}14`, border: `1px solid ${config.color}28`, borderRadius: "14px 14px 3px 14px", fontSize: 14, color: "var(--t1)", lineHeight: 1.6 }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          }

          if (isStructured) return (
            <div key={i} style={{ marginBottom: 36, paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 18, background: config.color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: config.color, letterSpacing: ".1em", textTransform: "uppercase" as const }}>
                  {toolId === "user-story-generator" ? "Stories" : config.label}
                </span>
                {isLast && <div style={{ width: 5, height: 5, borderRadius: "50%", background: config.color, animation: "pulse-dot 1.8s ease-in-out infinite" }} />}
              </div>
              <div>
                {config.renderOutput ? config.renderOutput(msg.content) : renderMarkdown(msg.content, config.color)}
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
      {/* Clear end state — two explicit choices, no auto-switch */}
      {phase === "done" && (
        <div style={{ padding: "14px 32px", borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(31,191,159,.03)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 700, color: "var(--t1)" }}>Analysis complete</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setViewMode("document")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: config.color, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#041a13" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              View as document
            </button>

            {/* Auto-save status — quiet, not a button */}
            {saveStatus === "saving" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--t4)" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg>
                Saving...
              </div>
            )}
            {saveStatus === "saved" && autoProject && (
              <button onClick={() => router.push(`/projects/${autoProject.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Saved to {autoProject.name}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
            {saveStatus === "error" && (
              <button onClick={() => { setSaveStatus("idle"); autoSave(analysisContent); }}
                style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Save failed — retry
              </button>
            )}

            {(["docx","txt"] as const).map(fmt => (
              <button key={fmt} onClick={() => downloadOutput(analysisContent, config.label, fmt)}
                style={{ padding: "8px 12px", borderRadius: 8, background: "none", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--t3)" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--t2)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--t3)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                .{fmt}
              </button>
            ))}
            <button onClick={() => printDocument(analysisContent, config.label)}
              style={{ padding: "8px 12px", borderRadius: 8, background: "none", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--t3)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--t2)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--t3)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              PDF
            </button>
            {toolId === "process-analyzer" && (
              <button onClick={() => router.push("/tools/process-flow")}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: "none", border: "1px solid rgba(56,189,248,.3)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#38bdf8" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(56,189,248,.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                Visualize
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
            <button onClick={reset} style={{ marginLeft: "auto", padding: "8px 12px", borderRadius: 8, background: "none", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--t3)" }}>
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Input — always open */}
      <div style={{ padding: "14px 32px 22px", borderTop: phase === "done" ? "none" : "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", transition: "border-color .2s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = `${config.color}45`)}
          onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder={
              phase === "done"
                ? "Continue the analysis — add new context, a stakeholder update, a risk, or any follow-up question..."
                : phase === "initial" ? config.inputPlaceholderInitial : config.inputPlaceholderFollowup
            }
            rows={3}
            style={{ width: "100%", background: "none", border: "none", outline: "none", padding: "14px 18px", fontSize: 14, color: "var(--t1)", lineHeight: 1.65, resize: "none", fontFamily: "var(--font-body)" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileUploadButton color={config.color} onParsed={(text, name) => setInput(prev => prev ? `${prev}\n\n[From: ${name}]\n${text}` : `[From: ${name}]\n${text}`)} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t4)" }}>
                {phase === "done" ? "Conversation stays open — keep adding context" : "Attach doc or Enter to send"}
              </span>
            </div>
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: input.trim() && !loading ? config.color : `${config.color}20`, border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, color: input.trim() && !loading ? "#041a13" : "var(--t4)", transition: "all .2s" }}>
              {loading ? "Thinking..." : "Send"}
              {!loading && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Routing heuristics ─────────────────────────────────────────────────────────
interface Suggestion { id: string; label: string; desc: string; color: string; primary?: boolean; href?: string; }

function getSuggestions(text: string): Suggestion[] {
  const t = text.toLowerCase();
  const results: Suggestion[] = [];

  const is = (...words: string[]) => words.some(w => t.includes(w));

  if (is("meeting notes","transcript","workshop","interview","email thread","conversation","they said","stakeholder said"))
    results.push({ id: "requirements-analyzer", label: "Extract requirements", desc: "Structure requirements from your notes", color: "#34d399", primary: true });

  if (is("problem","issue","challenge","taking too long","broken","failing","complaint","why is","what's wrong","not working","struggle"))
    results.push({ id: "problem-analyzer", label: "Analyze the problem", desc: "Identify root causes and business impact", color: "#1fbf9f", primary: results.length === 0 });

  if (is("stakeholder","resistance","politics","sponsor","executive","who owns","pushback","opposition","alignment"))
    results.push({ id: "stakeholder-analyzer", label: "Map stakeholders", desc: "Understand who influences success", color: "#facc15" });

  if (is("process","workflow","step","manual","how does","as-is","current state","takes too many steps","approval"))
    results.push({ id: "process-analyzer", label: "Analyze the process", desc: "Map current state and find bottlenecks", color: "#38bdf8" });

  if (is("user story","stories","epic","sprint","backlog","agile","acceptance criteria","as a user"))
    results.push({ id: "user-story-generator", label: "Generate user stories", desc: "Write stories with acceptance criteria", color: "#a78bfa" });

  if (is("business case","cost","benefit","roi","investment","justify","budget","option"))
    results.push({ id: "document-generator-brd", label: "Build a business case", desc: "Options, costs, benefits, recommendation", color: "#fb923c" });

  // Default if nothing matched
  if (results.length === 0)
    results.push({ id: "problem-analyzer", label: "Analyze the problem", desc: "I'll ask a few questions then build a complete analysis", color: "#1fbf9f", primary: true });

  // Ensure primary is set
  if (!results.some(r => r.primary)) results[0].primary = true;

  return results.slice(0, 3);
}

// ── Conversation Hub ──────────────────────────────────────────────────────────
function ConversationHub({ onLaunch }: { onLaunch: (toolId: string, input: string, projectName?: string | null) => void }) {
  const router = useRouter();
  const [input, setInput]               = useState("");
  const [suggestions, setSuggestions]   = useState<{ contentType: string; summary: string; projectName?: string | null; suggestions: Suggestion[] } | null>(null);
  const [classifying, setClassifying]   = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || classifying) return;
    setClassifying(true);
    try {
      const res = await fetch("/api/workspace/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.suggestions?.length) {
        setSuggestions(data);
      } else {
        setSuggestions({ contentType: "Content", summary: "", suggestions: getSuggestions(trimmed) });
      }
    } catch {
      setSuggestions({ contentType: "Content", summary: "", suggestions: getSuggestions(trimmed) });
    } finally {
      setClassifying(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  const DIRECT_TOOLS = [
    { id: "problem-analyzer",      label: "Problem Analysis",    color: "#1fbf9f" },
    { id: "requirements-analyzer", label: "Requirements",         color: "#34d399" },
    { id: "stakeholder-analyzer",  label: "Stakeholders",         color: "#facc15" },
    { id: "process-analyzer",      label: "Process Analysis",     color: "#38bdf8" },
    { id: "user-story-generator",  label: "User Stories",         color: "#a78bfa" },
    { id: "document-generator",    label: "BRD / FRD",            color: "#fb923c" },
  ];

  if (classifying) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--teal)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 14, color: "var(--t3)", fontFamily: "var(--font-display)" }}>Reading your content...</p>
      </div>
    );
  }

  if (suggestions) {
    const list = suggestions.suggestions;
    return (
      <div style={{ padding: "48px 5% 40px" }}>

        {/* Back + content type — single line */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <button onClick={() => setSuggestions(null)}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--t2)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--t3)"}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Edit
          </button>
          <div style={{ width: 1, height: 12, background: "var(--border)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--teal)", letterSpacing: ".08em", textTransform: "uppercase" as const }}>{suggestions.contentType}</span>
          {suggestions.summary && <span style={{ fontSize: 12.5, color: "var(--t4)" }}>{suggestions.summary}</span>}
        </div>

        {/* Pasted content — no card, just a left-bordered quote */}
        <div style={{ borderLeft: "3px solid rgba(255,255,255,.08)", paddingLeft: 14, marginBottom: 32, fontSize: 13, color: "var(--t4)", lineHeight: 1.6, maxHeight: 60, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as never }}>
          {input}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t4)", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 12 }}>What would you like to do?</div>

        {/* Flat suggestion rows — no cards, no icon circles */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
          {list.map((s) => (
            <button key={s.id} onClick={() => s.id === "career" ? router.push("/career") : onLaunch(s.id, input, suggestions?.projectName)}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: "none", border: "none", borderLeft: `3px solid transparent`, cursor: "pointer", textAlign: "left", transition: "all .12s", borderRadius: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.color}07`; (e.currentTarget as HTMLButtonElement).style.borderLeftColor = s.color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.borderLeftColor = "transparent"; }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700, color: "var(--t1)" }}>{s.label}</span>
                <span style={{ fontSize: 13, color: "var(--t3)", marginLeft: 10 }}>{s.desc}</span>
              </div>
              {s.primary && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, color: s.color, letterSpacing: ".06em", textTransform: "uppercase" as const, flexShrink: 0 }}>Recommended</span>}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>

        {/* Direct tools — compact */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "var(--t4)", marginRight: 4 }}>Or go directly to:</span>
          {DIRECT_TOOLS.map(t => (
            <button key={t.id} onClick={() => onLaunch(t.id, input)}
              style={{ padding: "4px 10px", borderRadius: 5, background: "none", border: "1px solid var(--border)", cursor: "pointer", fontSize: 11.5, color: "var(--t3)", transition: "all .12s", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.color = t.color; e.currentTarget.style.borderColor = `${t.color}40`; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--t3)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "56px 5% 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.1 }}>
            What are you working on?
          </h1>
          <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.6 }}>
            Describe a problem, paste meeting notes, upload a document, or ask a BA question.
          </p>
        </div>

        {/* Main input */}
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 14, transition: "border-color .2s", boxShadow: "0 4px 24px rgba(0,0,0,.2)" }}
          onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(31,191,159,.35)"}
          onBlurCapture={e => e.currentTarget.style.borderColor = "var(--border)"}
        >
          <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder={"Describe the business problem you're solving, paste meeting notes, or explain what you need help with...\n\nExamples:\n  • Customer onboarding takes 15 days and stakeholders are unhappy\n  • Paste workshop notes to extract requirements\n  • I need to map stakeholders for a digital transformation programme"}
            rows={8}
            style={{ width: "100%", background: "none", border: "none", outline: "none", padding: "20px 22px", fontSize: 15, color: "var(--t1)", lineHeight: 1.7, resize: "none", fontFamily: "var(--font-body)" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
            <FileUploadButton color="#1fbf9f" onParsed={(text, name) => setInput(prev => prev ? `${prev}\n\n[From: ${name}]\n${text}` : `[From: ${name}]\n${text}`)} />
            <button onClick={handleSubmit} disabled={!input.trim()}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, background: input.trim() ? "#1fbf9f" : "rgba(31,191,159,.2)", border: "none", cursor: input.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, color: input.trim() ? "#041a13" : "var(--t4)", transition: "all .2s" }}>
              Continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        {/* Projects nudge — inline text, no card */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, marginTop: 10 }}>
          <span style={{ fontSize: 12.5, color: "var(--t4)" }}>Working on a real project?</span>
          <button onClick={() => router.push("/projects")} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--teal)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textDecorationColor: "rgba(31,191,159,.3)" }}>
            Go to Projects
          </button>
          <span style={{ fontSize: 12.5, color: "var(--t4)" }}>to save your work and build on it over time.</span>
        </div>

        {/* Direct access — flat, always visible */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "var(--t4)" }}>Go directly to:</span>
          {DIRECT_TOOLS.map(t => (
            <button key={t.id} onClick={() => onLaunch(t.id, "")}
              style={{ padding: "4px 10px", borderRadius: 5, background: "none", border: "1px solid var(--border)", cursor: "pointer", fontSize: 11.5, color: "var(--t3)", transition: "all .12s" }}
              onMouseEnter={e => { e.currentTarget.style.color = t.color; e.currentTarget.style.borderColor = `${t.color}40`; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--t3)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function WorkspaceClient({ user, profile, resumes, savedJobs }: Props) {
  const [activeTool, setActiveTool]     = useState<string | null>(null);
  const [initialInput, setInitialInput] = useState<string>("");
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);
  const [saveModal, setSaveModal]       = useState<{ content: string; toolId: string } | null>(null);

  function launchTool(toolId: string, input: string, projectName?: string | null) {
    setInitialInput(input);
    setActiveProjectName(projectName ?? null);
    setActiveTool(toolId === "stakeholder-analyzer" ? "stakeholder-analyzer" : toolId);
  }

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
      .msg-group:hover .msg-actions { display: flex !important; }
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
          <WorkspaceSession
            key={activeTool + initialInput.slice(0, 20)}
            toolId={activeTool}
            onBack={() => { setActiveTool(null); setInitialInput(""); setActiveProjectName(null); }}
            onSaveToProject={(content, toolId) => setSaveModal({ content, toolId })}
            initialInput={initialInput}
            projectName={activeProjectName}
          />
        ) : (
          <ConversationHub onLaunch={launchTool} />
        )}
      </main>

      {saveModal && (
        <SaveToProjectModal
          content={saveModal.content}
          toolId={saveModal.toolId}
          onClose={() => setSaveModal(null)}
        />
      )}
    </div>
  );
}
