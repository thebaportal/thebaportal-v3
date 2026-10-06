"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import ProjectNavBar from "@/components/ProjectNavBar";
import DocumentViewer from "@/components/DocumentViewer";
import { buildRTM } from "@/lib/rtm";
import { computeAttention, extractItemIds, type AttentionItem } from "@/lib/projects/attention";
import ProjectHome from "./ProjectHome";
import ImportArtifact from "./ImportArtifact";
import ProjectContextDrawer from "./ProjectContextDrawer";
import ExportMenu from "@/components/ExportMenu";
import { copyArtifact, type ExportMeta } from "@/lib/exportDoc";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Organization { name: string; country?: string; industry?: string; }
interface Project {
  id: string; name: string; problem_statement?: string; methodology?: string;
  industry?: string; country?: string; relevant_context?: string; status: string;
  created_at?: string; updated_at?: string;
  organizations?: Organization;
}
interface Artifact {
  id: string; type: string; title?: string; content: string;
  status: string; version: number; created_at: string; updated_at?: string;
  reasoning_context?: Record<string, unknown>; source_artifact_ids?: string[];
}
interface Decision {
  id: string; decision_text: string; made_by?: string;
  decision_date?: string; status: string; impact_notes?: string; created_at: string;
}
interface Message { role: "user" | "assistant"; content: string; truncated?: boolean; }
// A Project Context note ("Add context") — BA-supplied source material.
export interface ProjectNote { id: string; source_label: string | null; source_text: string; created_at: string; }

// Sent as an ephemeral user turn (never persisted/shown as its own chat bubble,
// same convention as the context block in buildContext) when the BA clicks
// "Continue generation" on a response that was cut off at the model's output
// limit. Narrowly scoped on purpose — ordinary conversational follow-up must
// not be relied on to recover a truncated deliverable, since the model's own
// "reproduce everything in full" instruction would otherwise make it restart
// the whole document under the same output cap and truncate again.
const CONTINUATION_INSTRUCTION = "Continue generating the same document exactly where you left off. Do not repeat, restate, or summarise any content already produced above. Do not restart section or item numbering, continue with the next unused number in each category. Continue until the document is complete.";
interface Finding {
  id: string; session_id: string; category: string;
  finding_text: string; source_evidence: string | null; created_at: string;
}
interface ReviewFinding { id: string; review_status: string; }
interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  project: Project;
  initialArtifacts: Artifact[];
  initialDecisions: Decision[];
  initialFindings: Finding[];
  initialReviewFindings: ReviewFinding[];
  initialTab?: "home"|"work";
  initialNotes?: ProjectNote[];
}

// ── Workstream definitions ─────────────────────────────────────────────────────
// contextTypes: approved artifact types automatically pulled into this workstream's
// context. Most workstreams only ever used problem_analysis (unchanged here).
// Requirements is the first to pull from more than one source.
// baIntelligenceCategories: which accepted BA Intelligence finding categories this
// workstream directly consumes, per the Connected Context Strategy architecture
// review — not every workstream gets every category, and most get none at all.
// Workstream colours — one coherent muted-earth-and-slate family (Folio),
// not seven unrelated saturated hues. Kept per-workstream because it aids
// orientation across 7 tools; none collide with a status colour.
// bringLabel: customer-facing phrasing for bringing existing work of this
// workstream's OWN type into the project — the start state's one quiet door,
// for work produced outside TheBAPortal (work already inside it is used automatically).
const WORKSTREAMS = [
  { id: "problem-analysis",    label: "Problem Analysis",    question: "What is happening and why?",      color: "#52658a", endpoint: "/api/workspace/analyze",       artifactType: "problem_analysis",    suggestedAfter: [],                           contextTypes: [],                                                     methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: [] as string[], baFindingsNoun: "", bringLabel: "Bring existing problem analysis" },
  { id: "stakeholder-analysis",label: "Stakeholder Analysis",question: "Who influences success?",          color: "#8a7440", endpoint: "/api/workspace/stakeholders",  artifactType: "stakeholder_analysis", suggestedAfter: ["problem_analysis"],         contextTypes: ["problem_analysis"],                                   methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: [] as string[], baFindingsNoun: "", bringLabel: "Bring existing stakeholder work" },
  { id: "requirements",        label: "Requirements",        question: "What must change?",                color: "#6b8452", endpoint: "/api/workspace/requirements",  artifactType: "requirements",         suggestedAfter: ["problem_analysis","stakeholder_analysis"], contextTypes: ["problem_analysis","stakeholder_analysis","decision_lab_output"], methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: ["requirement","business_rule","unresolved_question","contradiction","edge_case"] as string[], baFindingsNoun: "validated finding", bringLabel: "Bring existing requirements" },
  { id: "process-analysis",    label: "Process Analysis",    question: "How does work flow today?",        color: "#6e7c8c", endpoint: "/api/workspace/process",       artifactType: "process_map",          suggestedAfter: ["problem_analysis"],         contextTypes: ["problem_analysis"],                                   methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: ["business_rule","edge_case"] as string[], baFindingsNoun: "process-relevant finding", bringLabel: "Bring existing process analysis" },
  { id: "user-stories",        label: "User Stories",        question: "What does the team build?",        color: "#74628f", endpoint: "/api/workspace/user-stories",  artifactType: "user_stories",         suggestedAfter: ["requirements"],             contextTypes: ["requirements"],                                       methodologies: ["agile","safe","hybrid"], baIntelligenceCategories: [] as string[], baFindingsNoun: "", bringLabel: "Bring existing user stories" },
  { id: "business-case",       label: "Business Case",       question: "Why does this justify investment?",color: "#9c6b4a", endpoint: "/api/workspace/documents",     artifactType: "brd",                  suggestedAfter: ["problem_analysis","requirements"], contextTypes: ["problem_analysis","stakeholder_analysis","requirements"],                                   methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: [] as string[], baFindingsNoun: "", bringLabel: "Bring existing business case" },
  { id: "testing",             label: "Testing",             question: "How do we know it works?",         color: "#8c5850", endpoint: "/api/workspace/testing",       artifactType: "test_case",            suggestedAfter: ["requirements","user_stories"], contextTypes: ["requirements","user_stories"],                        methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: ["edge_case"] as string[], baFindingsNoun: "validated edge case", bringLabel: "Bring existing testing work" },
] as const;

type WorkstreamId = typeof WORKSTREAMS[number]["id"];
type Workstream = typeof WORKSTREAMS[number];

// Simplified start state per work area: project context (and any relevant
// approved upstream work) is used automatically, so the start is just a quiet
// "Using …" line, one door for work done outside TheBAPortal, and the composer
// with example prompts. A prompt only fills the composer — it never starts a
// different generation path. The BA may start in any work area.
const START_COPY: Record<WorkstreamId, { placeholder: string; prompts: string[] }> = {
  "problem-analysis": {
    placeholder: "Describe the problem, paste notes or evidence, ask a question, or tell TheBAPortal what you need...",
    prompts: ["Clarify the core business problem", "Identify root causes", "Define scope and constraints", "Identify assumptions and open questions"],
  },
  "stakeholder-analysis": {
    placeholder: "Describe the stakeholders, paste notes, ask a question, or tell TheBAPortal what you need...",
    prompts: ["Identify key stakeholders", "Assess stakeholder influence and interest", "Create a stakeholder matrix", "Plan stakeholder engagement"],
  },
  "requirements": {
    placeholder: "Describe what must change, paste notes or existing requirements, ask a question, or tell TheBAPortal what you need...",
    prompts: ["Identify business requirements", "Elicit functional and non-functional requirements", "Identify business rules", "Draft acceptance criteria"],
  },
  "process-analysis": {
    placeholder: "Describe how the work flows today, paste process notes, ask a question, or tell TheBAPortal what you need...",
    prompts: ["Map the current-state process", "Identify process gaps and bottlenecks", "Design a future-state process", "Identify process rules and exceptions"],
  },
  "user-stories": {
    placeholder: "Describe a feature or need, paste requirements, ask a question, or tell TheBAPortal what you need...",
    prompts: ["Draft user stories from requirements", "Break a feature into user stories", "Improve acceptance criteria", "Identify missing or edge-case stories"],
  },
  "business-case": {
    placeholder: "Describe the investment decision, paste figures or evidence, ask a question, or tell TheBAPortal what you need...",
    prompts: ["Clarify the business need and expected value", "Compare solution options", "Identify costs, benefits and risks", "Draft a recommendation"],
  },
  "testing": {
    placeholder: "Describe what needs testing, paste requirements or scenarios, ask a question, or tell TheBAPortal what you need...",
    prompts: ["Create test scenarios from selected requirements", "Draft test cases", "Identify coverage gaps", "Prepare UAT scenarios"],
  },
};

// ── Constants ─────────────────────────────────────────────────────────────────
const METHODOLOGY_LABEL: Record<string, string> = { agile:"Agile", waterfall:"Waterfall", hybrid:"Hybrid", safe:"SAFe", babok:"Structured Analysis" };
const ARTIFACT_TYPE_LABEL: Record<string, string> = {
  problem_analysis:"Problem Analysis", stakeholder_analysis:"Stakeholder Analysis",
  requirements:"Requirements", process_map:"Process Analysis",
  user_stories:"User Stories", brd:"Business Case", test_case:"Test Cases",
};
// Status colours — deliberately independent of the brand accent (var(--teal),
// now indigo). Never reuse var(--teal) for a status; each gets its own token.
const STATUS_COLOR: Record<string, { bg:string; text:string; border:string }> = {
  draft:     { bg:"rgba(181,116,31,.09)", text:"#b5741f", border:"rgba(181,116,31,.22)" },
  in_review: { bg:"rgba(59,114,172,.09)", text:"#3b72ac", border:"rgba(59,114,172,.22)" },
  approved:  { bg:"rgba(46,122,78,.09)",  text:"#2e7a4e", border:"rgba(46,122,78,.22)" },
  superseded:{ bg:"rgba(122,115,96,.08)", text:"#7a7360", border:"rgba(122,115,96,.15)" },
  archived:  { bg:"rgba(156,148,128,.07)",text:"#9c9480", border:"rgba(156,148,128,.12)" },
};
const WS_STATUS_LABEL: Record<WsStatus, string> = { available:"Not started", draft:"Draft", in_review:"In Review", approved:"Approved" };
const WS_STATUS_COLOR: Record<WsStatus, string> = { available:"var(--lc-text-4)", draft:"#b5741f", in_review:"#3b72ac", approved:"#2e7a4e" };
function wsStatusInfo(artifactType: string, artifacts: { type: string; status: string }[]): { label: string; color: string } {
  const status = getWsStatus(artifactType, artifacts);
  return { label: WS_STATUS_LABEL[status], color: WS_STATUS_COLOR[status] };
}

// Customer-facing provenance — never implies TheBAPortal witnessed an
// approval it didn't. "imported" (Replace, or a fresh first import) is
// wholly external, so its approved state reads as externally asserted.
// "mixed" (Add) is only ever approved by the BA's own action inside the
// tool on the combined document, so it keeps the normal "Approved" label
// and only the tag notes that part of the content came from outside.
function provenanceInfo(a: { status: string; reasoning_context?: Record<string, unknown> | null }): { tag: string | null; statusLabel: string } {
  const origin = a.reasoning_context?.origin as string | undefined;
  const defaultLabel = a.status.replace(/_/g, " ");
  if (origin === "imported") return { tag: "External source", statusLabel: a.status === "approved" ? "Externally approved" : defaultLabel };
  if (origin === "mixed") return { tag: "Includes external source", statusLabel: defaultLabel };
  return { tag: null, statusLabel: defaultLabel };
}

// Export header for a saved artifact version — status/version/date always come
// from the saved row itself, so every export matches what is being viewed.
export interface ExportContext { projectName: string; organization?: string | null }
// ── Artifact lifecycle (shared by the Work page and ArtifactViewer) ───────────
// Normal BA lifecycle is just Draft → Approved (→ Revise into a new Draft).
// Approving goes through the one existing server path (PATCH), which stamps
// the version as approved and supersedes the previous approved version of
// that type — that approved version is what downstream work areas use.
async function setArtifactStatus(projectId: string, artifactId: string, status: string): Promise<boolean> {
  const res = await fetch(`/api/projects/${projectId}/artifacts`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({artifactId,status})});
  return res.ok;
}
// Revise never edits the approved row. It copies the approved content into a
// fresh draft (a new version); the approved version stays the trusted project
// version until the new draft is itself approved.
async function reviseArtifact(projectId: string, artifact: Artifact): Promise<Artifact | null> {
  const {was_approved: _drop, ...carriedContext} = (artifact.reasoning_context ?? {}) as Record<string, unknown>;
  void _drop;
  const res = await fetch(`/api/projects/${projectId}/artifacts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    type:artifact.type, title:artifact.title, content:artifact.content,
    reasoning_context:carriedContext, status:"draft",
    source_artifact_ids:artifact.source_artifact_ids??[],
  })});
  if (!res.ok) return null;
  const {artifact:a} = await res.json();
  return a as Artifact;
}

function artifactExportMeta(a: Artifact, ctx: ExportContext): ExportMeta {
  const s = provenanceInfo(a).statusLabel;
  return {
    projectName: ctx.projectName, organization: ctx.organization ?? null,
    artifactLabel: ARTIFACT_TYPE_LABEL[a.type] ?? CONTEXT_TYPE_LABEL[a.type] ?? a.type,
    status: s.charAt(0).toUpperCase() + s.slice(1),
    version: a.version, updatedAt: a.updated_at ?? a.created_at,
  };
}

// timeZone must be pinned explicitly — this renders on the server (Vercel,
// UTC) and then hydrates on the client (the visitor's own browser timezone).
// Without a fixed zone, toLocaleDateString resolves to each runtime's local
// time, so the same timestamp can format to a different calendar date on
// each side of a day boundary — a real, reproducible hydration mismatch
// (React errors #425/#418/#423), not a cosmetic warning.
function fmtDate(iso:string){ return new Date(iso).toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"}); }

// Artifact types with a meaningful structured workbook. Everything else only
// ever offers Word/PDF/Print — a free-text analysis has no rows and columns to give.
const XLSX_TYPES = new Set(["requirements", "user_stories", "test_case"]);


// ── Workstream status logic ────────────────────────────────────────────────────
type WsStatus = "available" | "draft" | "in_review" | "approved";

function getWsStatus(artifactType: string, artifacts: { type: string; status: string }[]): WsStatus {
  const active = artifacts.filter(a => a.type === artifactType && a.status !== "superseded" && a.status !== "archived");
  if (!active.length) return "available";
  if (active.some(a => a.status === "approved"))  return "approved";
  if (active.some(a => a.status === "in_review")) return "in_review";
  return "draft";
}

function getRecommended(artifacts: Artifact[], methodology = "agile"): WorkstreamId | null {
  if (!artifacts.some(a => a.type === "problem_analysis")) return "problem-analysis";
  if (!artifacts.some(a => a.type === "requirements"))      return "requirements";
  if (["agile","safe","hybrid"].includes(methodology) && !artifacts.some(a => a.type === "user_stories")) return "user-stories";
  return null;
}

function isAnalysisDone(wsId: WorkstreamId, text: string): boolean {
  if (wsId === "problem-analysis")     return text.includes("## Problem Statement") || text.includes("Confidence Level");
  if (wsId === "stakeholder-analysis") return text.includes("## Stakeholder Register") || text.includes("Stakeholder analysis complete");
  if (wsId === "requirements")         return text.includes("# Requirements Package") || text.includes("## Functional Requirements");
  if (wsId === "user-stories")         return text.includes("**US-") || text.includes("## Story Summary");
  if (wsId === "process-analysis")     return text.includes("# Process Analysis") || text.includes("## Current State");
  if (wsId === "business-case")        return text.includes("# Business Requirements") || text.includes("## 1. Executive Summary");
  if (wsId === "testing")              return text.includes("## Test Cases") || text.includes("**TC-001");
  return false;
}

// ── Project context builder ────────────────────────────────────────────────────
// Only approved artifacts are pulled in automatically. Draft or in review work is
// visible in the sidebar but never silently feeds another workstream's generation
// until someone approves it. Most types are one evolving document per project, so
// only the latest approved one is included. decision_lab_output is different — a
// project can hold several distinct approved decisions at once, so all of them go in.
const CONTEXT_TYPE_LABEL: Record<string, string> = {
  problem_analysis: "Problem Analysis", stakeholder_analysis: "Stakeholder Analysis",
  decision_lab_output: "Decision Lab Analysis", requirements: "Requirements",
  user_stories: "User Stories",
};
const MULTI_INSTANCE_TYPES = ["decision_lab_output"];

// BA Intelligence findings are a separate, distinctly-trusted context layer, not
// another entry in contextTypes — a finding is a small, individually-validated
// unit, not a document artifact, and its five categories carry different handling
// rules the model must preserve. Label/color match BAIntelligenceClient's own
// CATEGORY_META so the two surfaces read as the same product.
const FINDING_CATEGORY_META: { id: string; label: string; color: string }[] = [
  { id: "requirement",         label: "Potential Requirements", color: "var(--teal)" },
  { id: "business_rule",       label: "Business Rules",         color: "#3b72ac" },
  { id: "unresolved_question", label: "Unresolved Questions",   color: "#b5741f" },
  { id: "contradiction",       label: "Contradictions",         color: "#a83f32" },
  { id: "edge_case",           label: "Possible Edge Cases",    color: "#74628f" },
];
const FINDING_CATEGORY_GUIDANCE: Record<string, string> = {
  requirement: "may inform requirement drafting, do not copy directly into a formal requirement",
  business_rule: "treat as a constraint or governing logic on requirements, not a requirement itself",
  unresolved_question: "do not infer or assume an answer, carry into Open Questions if relevant",
  contradiction: "do not silently resolve, surface as an unresolved conflict in Open Questions if relevant",
  edge_case: "use for completeness and acceptance thinking, do not turn into a standalone requirement by itself",
};

function buildContext(ws: Workstream, project: Project, notes: ProjectNote[], artifacts: Artifact[], findings: Finding[]): { text: string; sourceIds: string[]; findingIds: string[]; sessionIds: string[] } {
  const lines = ["[ESTABLISHED PROJECT CONTEXT]"];
  lines.push(`Project: ${project.name}`);
  if (project.problem_statement) lines.push(`Problem Statement: ${project.problem_statement}`);
  if (project.methodology) lines.push(`Methodology: ${METHODOLOGY_LABEL[project.methodology] ?? project.methodology}`);
  if (project.industry) lines.push(`Industry: ${project.industry}`);
  if (project.country) lines.push(`Country: ${project.country}`);
  if (project.relevant_context) lines.push(`Additional Context: ${project.relevant_context}`);

  // Project Context notes — part of the project's accumulated context, but
  // BA-supplied source material only: never an approved artifact, accepted
  // requirement, business rule or decision. The label says so to the model.
  if (notes.length > 0) {
    lines.push("\n[BA-SUPPLIED PROJECT NOTES]");
    lines.push("Notes the Business Analyst added to the project, oldest first. They are unvalidated source material — use them as context, but do not treat any note as an approved artifact, accepted requirement, business rule or decision merely because it was supplied.");
    for (const n of notes) {
      const date = new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      lines.push(`\n- ${date} · ${n.source_label || "Project note"}:\n${n.source_text}`);
    }
  }

  const sourceIds: string[] = [];
  for (const type of ws.contextTypes as readonly string[]) {
    const approved = artifacts.filter(a => a.type === type && a.status === "approved");
    const included = MULTI_INSTANCE_TYPES.includes(type) ? approved : approved.slice(0, 1);
    for (const a of included) {
      const label = CONTEXT_TYPE_LABEL[type] ?? type;
      lines.push(`\nApproved ${label}${a.title ? ` — ${a.title}` : ""}:\n${a.content}`);
      sourceIds.push(a.id);
    }
  }

  const findingIds: string[] = [];
  const sessionIds: string[] = [];
  if (findings.length > 0) {
    lines.push("\n[VALIDATED BA INTELLIGENCE]");
    lines.push("Findings below were reviewed and explicitly accepted by the Business Analyst from stakeholder input analysis. They are validated context, not formal requirements. Each category below has its own handling rule, stated in brackets.");
    for (const meta of FINDING_CATEGORY_META) {
      const items = findings.filter(f => f.category === meta.id);
      if (!items.length) continue;
      lines.push(`\n${meta.label} (${FINDING_CATEGORY_GUIDANCE[meta.id]}):`);
      for (const f of items) {
        lines.push(`- ${f.finding_text}`);
        findingIds.push(f.id);
        if (!sessionIds.includes(f.session_id)) sessionIds.push(f.session_id);
      }
    }
  }

  lines.push("\n[USER INPUT]");
  return { text: lines.join("\n"), sourceIds, findingIds, sessionIds };
}

// ── RTM (Requirements Traceability Matrix) ─────────────────────────────────────
// Shared with the Testing XLSX export — see src/lib/rtm.ts. Both callers must
// agree on what "covered" means, so the logic lives in exactly one place.

// ── Markdown + table renderer ─────────────────────────────────────────────────
function parseMdTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const dataLines = lines.filter(l => !l.includes("---"));
  if (dataLines.length < 2) return null;
  const parse = (l: string) => l.split("|").map(c => c.trim().replace(/\*\*/g, "")).filter((_,ix,a) => ix > 0 && ix < a.length - 1);
  return { headers: parse(dataLines[0]), rows: dataLines.slice(1).map(parse) };
}
// Handles **bold** first, then *italic* within whatever plain text is left —
// the model's output uses both, and either one left unparsed shows up as
// literal asterisks in the rendered product.
function MdItalic({ t }: { t: string }) {
  const parts = t.split(/\*([^*]+)\*/);
  return <>{parts.map((p,i) => i%2===1 ? <em key={i}>{p}</em> : p)}</>;
}
function MdBold({ t }: { t: string }) {
  const parts = t.split(/\*\*([^*]+)\*\*/);
  return <>{parts.map((p,i) => i%2===1 ? <strong key={i} style={{fontWeight:700,color:"var(--lc-text-1)"}}>{p}</strong> : <span key={i}><MdItalic t={p}/></span>)}</>;
}
function renderMd(text: string, accent = "#34407d"): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { nodes.push(<div key={`s${i}`} style={{height:5}}/>); i++; continue; }
    if (t.startsWith("# "))   { nodes.push(<h2 key={i} style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:800,color:"var(--lc-text-1)",margin:"4px 0 12px",letterSpacing:"-0.02em"}}>{t.slice(2).replace(/\*\*/g,"")}</h2>); i++; continue; }
    if (t.startsWith("## "))  { nodes.push(<h3 key={i} style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:accent,margin:"22px 0 8px",paddingBottom:5,borderBottom:`1px solid ${accent}22`}}>{t.slice(3).replace(/\*\*/g,"")}</h3>); i++; continue; }
    if (t.startsWith("### ")) { nodes.push(<h4 key={i} style={{fontFamily:"var(--font-display)",fontSize:13,fontWeight:700,color:"var(--lc-text-1)",margin:"14px 0 5px"}}>{t.slice(4).replace(/\*\*/g,"")}</h4>); i++; continue; }
    if (t === "---") { nodes.push(<div key={i} style={{height:1,background:"var(--lc-border)",margin:"14px 0"}}/>); i++; continue; }
    if (t.startsWith("|") && lines[i+1]?.includes("---")) {
      const tLines: string[] = [];
      while (i < lines.length && lines[i]?.trim().startsWith("|")) { tLines.push(lines[i].trim()); i++; }
      const tbl = parseMdTable(tLines);
      if (tbl) nodes.push(
        <div key={`tbl${i}`} style={{overflowX:"auto",margin:"10px 0 18px",borderRadius:8,border:`1px solid ${accent}18`,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
            <thead><tr>{tbl.headers.map((h,hi)=><th key={hi} style={{textAlign:"left",padding:"9px 13px",background:`${accent}10`,borderBottom:`2px solid ${accent}28`,fontWeight:700,color:"var(--lc-text-1)",fontSize:11.5,fontFamily:"var(--font-display)",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{tbl.rows.map((row,ri)=><tr key={ri} style={{background:ri%2===0?"rgba(0,0,0,.02)":"transparent"}}>{tbl.headers.map((_,ci)=><td key={ci} style={{padding:"8px 13px",borderBottom:"1px solid rgba(0,0,0,.04)",color:"var(--lc-text-2)",lineHeight:1.6,verticalAlign:"top",fontSize:12.5}}><MdBold t={row[ci]??""}/></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i]?.trim().startsWith("- ") || lines[i]?.trim().startsWith("* "))) { items.push(lines[i].trim().slice(2)); i++; }
      {/* Bullet markers are neutral, not accent-coloured — a list marker
          carries no status or brand meaning, so it shouldn't compete with
          colour that does. */}
      nodes.push(<ul key={`ul${i}`} style={{margin:"6px 0 12px",paddingLeft:0,listStyle:"none"}}>{items.map((item,ii)=><li key={ii} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}><div style={{width:4,height:4,borderRadius:"50%",background:"var(--lc-text-5)",flexShrink:0,marginTop:8}}/><span style={{fontSize:13,color:"var(--lc-text-2)",lineHeight:1.65}}><MdBold t={item}/></span></li>)}</ul>);
      continue;
    }
    if (t.startsWith("**") && t.endsWith("**") && !t.slice(2,-2).includes("**")) { nodes.push(<p key={i} style={{fontSize:13,fontWeight:700,color:"var(--lc-text-1)",margin:"10px 0 4px",fontFamily:"var(--font-display)"}}>{t.slice(2,-2)}</p>); i++; continue; }
    nodes.push(<p key={i} style={{fontSize:13,color:"var(--lc-text-2)",lineHeight:1.72,margin:"0 0 7px"}}><MdBold t={t}/></p>);
    i++;
  }
  return nodes;
}

// ── Add Decision modal ─────────────────────────────────────────────────────────
function AddDecisionModal({projectId,onSaved,onClose,prefill}:{projectId:string;onSaved:(d:Decision)=>void;onClose:()=>void;prefill?:string}) {
  const [text,setText]     = useState(prefill ?? "");
  const [madeBy,setMadeBy] = useState("");
  const [impact,setImpact] = useState("");
  const [status,setStatus] = useState("accepted");
  const [saving,setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/decisions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision_text:text.trim(),made_by:madeBy.trim()||undefined,impact_notes:impact.trim()||undefined,status})});
    const data = await res.json();
    if (res.ok) { onSaved(data.decision); onClose(); }
    setSaving(false);
  }

  const inp = {background:"var(--lc-faint)",border:"1px solid var(--lc-border)",borderRadius:9,padding:"9px 12px",fontSize:13,color:"var(--lc-text-1)",outline:"none",width:"100%",fontFamily:"var(--font-body)"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:24}}>
      <div style={{background:"var(--lc-surface)",border:"1px solid var(--lc-border)",borderRadius:"var(--radius-lg)",padding:"28px",width:"100%",maxWidth:480}}>
        <h3 style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:700,color:"var(--lc-text-1)",marginBottom:20}}>Log a decision</h3>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><div style={{fontSize:12,fontWeight:600,color:"var(--lc-text-3)",marginBottom:5}}>Decision *</div><textarea value={text} onChange={e=>setText(e.target.value)} rows={2} style={{...inp,resize:"none"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><div style={{fontSize:12,fontWeight:600,color:"var(--lc-text-3)",marginBottom:5}}>Made by</div><input value={madeBy} onChange={e=>setMadeBy(e.target.value)} placeholder="Stakeholder name" style={inp}/></div>
            <div><div style={{fontSize:12,fontWeight:600,color:"var(--lc-text-3)",marginBottom:5}}>Status</div><select value={status} onChange={e=>setStatus(e.target.value)} style={{...inp,cursor:"pointer"}}><option value="open">Open</option><option value="accepted">Accepted</option><option value="deferred">Deferred</option><option value="rejected">Rejected</option></select></div>
          </div>
          <div><div style={{fontSize:12,fontWeight:600,color:"var(--lc-text-3)",marginBottom:5}}>Impact / Artifacts affected</div><input value={impact} onChange={e=>setImpact(e.target.value)} placeholder="e.g. Affects Requirements and User Stories" style={inp}/></div>
          <div style={{display:"flex",gap:10,paddingTop:4}}>
            <button onClick={save} disabled={!text.trim()||saving} style={{flex:1,padding:"10px",background:text.trim()?"var(--teal)":"rgba(52,64,125,.3)",border:"none",borderRadius:9,fontSize:13.5,fontWeight:700,color:"#f5f1e7",cursor:text.trim()?"pointer":"not-allowed"}}>{saving?"Saving...":"Save decision"}</button>
            <button onClick={onClose} style={{padding:"10px 18px",background:"none",border:"1px solid var(--lc-border)",borderRadius:9,fontSize:13,color:"var(--lc-text-3)",cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Artifact viewer ────────────────────────────────────────────────────────────
// Exported so Decision Lab can manage its own saved outputs with the exact
// same lifecycle (edit draft / approve / revise / archive) — reused, not copied.
export function ArtifactViewer({artifact,projectId,exportContext,onStatusChange,onClose,onRevised}:{artifact:Artifact;projectId:string;exportContext?:ExportContext;onStatusChange:(id:string,s:string)=>void;onClose:()=>void;onRevised:(a:Artifact)=>void}) {
  const sc = STATUS_COLOR[artifact.status] ?? STATUS_COLOR.draft;
  const prov = provenanceInfo(artifact);
  const [draftText,setDraftText] = useState(artifact.content);
  const [savingEdit,setSavingEdit] = useState(false);
  const [revising,setRevising] = useState(false);
  useEffect(()=>{ setDraftText(artifact.content); }, [artifact.id, artifact.content]);

  async function changeStatus(s:string) {
    if (await setArtifactStatus(projectId, artifact.id, s)) onStatusChange(artifact.id,s);
  }

  // Editing a draft updates this same row in place — normal autosave
  // behaviour, unavailable once the row has ever been approved (the API
  // enforces this independent of what the UI offers).
  async function saveDraftEdit() {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        type:artifact.type, title:artifact.title, content:draftText,
        reasoning_context:artifact.reasoning_context??{}, status:"draft",
        source_artifact_ids:artifact.source_artifact_ids??[],
      })});
      if (res.ok) { const {artifact:a} = await res.json(); onRevised(a); }
    } finally { setSavingEdit(false); }
  }

  // Revise never edits this row. It copies the approved content into a fresh
  // draft (a new version, since no draft exists to update in place while
  // this one stays approved) and switches the view to that new draft for
  // editing. The approved row underneath is untouched — still current, still
  // authoritative, until the new draft is itself approved.
  async function revise() {
    setRevising(true);
    try {
      const a = await reviseArtifact(projectId, artifact);
      if (a) onRevised(a);
    } finally { setRevising(false); }
  }

  const editable = artifact.status === "draft";

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <header style={{padding:"16px 24px",borderBottom:"1px solid var(--lc-border)",display:"flex",alignItems:"center",gap:14,flexShrink:0,flexWrap:"wrap",rowGap:8}}>
        <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:"var(--lc-text-3)",background:"none",border:"none",cursor:"pointer",padding:0}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Back
        </button>
        <div style={{width:1,height:16,background:"var(--lc-border)"}}/>
        <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--lc-text-1)",flex:1}}>
          {ARTIFACT_TYPE_LABEL[artifact.type]??artifact.type} · v{artifact.version}
        </span>
        {prov.tag && (
          <span style={{fontSize:11.5,color:"var(--lc-text-4)",fontStyle:"italic",flexShrink:0}}>{prov.tag}</span>
        )}
        <span style={{fontFamily:"var(--font-mono)",fontSize:10,padding:"3px 8px",borderRadius:6,background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`}}>{prov.statusLabel}</span>
      </header>
      <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
        {editable ? (
          <textarea value={draftText} onChange={e=>setDraftText(e.target.value)}
            style={{width:"100%",minHeight:360,boxSizing:"border-box",background:"var(--lc-surface)",border:"1px solid var(--lc-border)",borderRadius:"var(--radius)",padding:"18px 20px",fontSize:13.5,lineHeight:1.65,color:"var(--lc-text-1)",fontFamily:"inherit",resize:"vertical"}}/>
        ) : (
          <div style={{background:"var(--lc-surface)",border:"1px solid rgba(52,64,125,.1)",borderRadius:"var(--radius)",padding:"22px 24px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,var(--teal),transparent)"}}/>
            {renderMd(artifact.content)}
          </div>
        )}
      </div>
      {/* Approving is a workflow action, not a display filter — it gets its
          own primary button, sized and coloured for what it actually is.
          Other status moves stay available as small text actions, clearly
          secondary to Approve. Once approved, this row is a closed historical
          milestone: no action here ever edits it again — Revise starts a new
          version instead. */}
      <div style={{padding:"12px 24px",borderTop:"1px solid var(--lc-border)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",flexShrink:0}}>
        {editable && (
          <button onClick={saveDraftEdit} disabled={savingEdit||draftText===artifact.content} style={{padding:"7px 14px",borderRadius:8,border:"1px solid var(--lc-border)",background:"none",color:"var(--lc-text-2)",fontSize:12.5,fontWeight:600,cursor:savingEdit||draftText===artifact.content?"default":"pointer",opacity:savingEdit||draftText===artifact.content?.6:1}}>
            {savingEdit?"Saving…":"Save changes"}
          </button>
        )}
        {(artifact.status==="draft"||artifact.status==="in_review") && (
          <button onClick={()=>changeStatus("approved")} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",background:"var(--lc-green)",color:"#f5f1e7",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Approve
          </button>
        )}
        {artifact.status==="approved" && (
          <>
            <span style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"var(--lc-green-bg)",border:"1px solid var(--lc-green-border)",color:"var(--lc-green)",fontSize:12.5,fontWeight:700}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {prov.statusLabel}
            </span>
            {/* Revise reads as its own action, not a housekeeping link next to
                Archive — it creates a new version rather than editing this one,
                and needs the same visual weight as Approve to say so. */}
            <button onClick={revise} disabled={revising} title="Starts a new draft version to edit — this approved version is unchanged"
              style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:"1px solid rgba(52,64,125,.3)",background:"var(--lc-teal-bg)",color:"var(--teal)",fontSize:12.5,fontWeight:700,cursor:revising?"default":"pointer"}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8 6.5h4a4 4 0 014 4"/></svg>
              {revising?"Starting new version…":"Revise → new version"}
            </button>
          </>
        )}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {/* Normal lifecycle is Draft → Approved; "In review" is no longer
              offered. Older rows already in review can still go back to Draft
              (or be approved above). Archive stays as a quiet history action. */}
          {artifact.status==="in_review" && (
            <button onClick={()=>changeStatus("draft")} style={{padding:"5px 10px",borderRadius:6,border:"none",background:"none",color:"var(--lc-text-3)",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>Back to draft</button>
          )}
          {artifact.status!=="archived" && (
            <button onClick={()=>changeStatus("archived")} style={{padding:"5px 10px",borderRadius:6,border:"none",background:"none",color:"var(--lc-text-3)",fontSize:11.5,fontWeight:600,cursor:"pointer"}}>Archive</button>
          )}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {/* Exports always use the saved row (artifact.content), never unsaved
              edits in the draft textarea — what's exported is this version. */}
          {artifact.type !== "process_diagram" ? (
            <ExportMenu content={artifact.content} meta={artifactExportMeta(artifact, exportContext ?? {projectName: "Project"})}
              artifactType={artifact.type} projectId={projectId} xlsx={XLSX_TYPES.has(artifact.type)} placement="up"/>
          ) : (
            <button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"none",border:"1px solid var(--lc-border)",borderRadius:8,fontSize:12,color:"var(--lc-text-2)",cursor:"pointer"}} onClick={()=>navigator.clipboard?.writeText(artifact.content)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RTM panel ────────────────────────────────────────────────────────────────
function RTMPanel({artifacts, onClose, onGoToRequirements}: {artifacts: Artifact[]; onClose: () => void; onGoToRequirements: () => void}) {
  const rows = buildRTM(artifacts);
  const covered = rows.filter(r => r.coveredBy.length > 0).length;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <header style={{padding:"16px 24px",borderBottom:"1px solid var(--lc-border)",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
        <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:"var(--lc-text-3)",background:"none",border:"none",cursor:"pointer",padding:0}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Back
        </button>
        <div style={{width:1,height:16,background:"var(--lc-border)"}}/>
        <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--lc-text-1)",flex:1}}>Requirements Traceability Matrix</span>
        {rows.length > 0 && <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--lc-text-3)"}}>{covered} of {rows.length} covered</span>}
      </header>
      <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
        {rows.length === 0 ? (
          <div style={{maxWidth:420}}>
            <div style={{width:32,height:32,borderRadius:8,background:"var(--lc-faint)",border:"1px solid var(--lc-border)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lc-text-3)" strokeWidth="2" strokeLinecap="round"><path d="M9 17H7a2 2 0 01-2-2V5a2 2 0 012-2h6l4 4v8a2 2 0 01-2 2h-2M9 12h6M9 16h3"/></svg>
            </div>
            <p style={{fontSize:13,color:"var(--lc-text-3)",lineHeight:1.6,margin:"0 0 14px"}}>
              No approved Requirements or User Stories yet. Approve one, then generate Test Cases, to see traceability here.
            </p>
            <button onClick={onGoToRequirements} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 15px",borderRadius:8,border:"none",background:"var(--teal)",color:"#f5f1e7",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>
              Go to Requirements
            </button>
          </div>
        ) : (
          <div style={{overflowX:"auto",borderRadius:8,border:"1px solid var(--lc-border)",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--lc-surface)"}}>
                  <th style={{textAlign:"left",padding:"9px 13px",borderBottom:"2px solid var(--lc-border)",fontWeight:700,color:"var(--lc-text-1)",fontSize:11.5}}>Requirement / Story</th>
                  <th style={{textAlign:"left",padding:"9px 13px",borderBottom:"2px solid var(--lc-border)",fontWeight:700,color:"var(--lc-text-1)",fontSize:11.5}}>Covered by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{borderBottom:"1px solid var(--lc-border)"}}>
                    <td style={{padding:"8px 13px",color:"var(--lc-text-1)",fontFamily:"var(--font-mono)",fontWeight:600}}>{r.id}</td>
                    <td style={{padding:"8px 13px",color:r.coveredBy.length ? "var(--lc-green)" : "var(--lc-red)"}}>
                      {r.coveredBy.length ? r.coveredBy.join(", ") : "Not covered"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BA Intelligence findings panel (read-only) ──────────────────────────────────
// Visibility and trust only, per product rule: no editing, accepting, rejecting,
// and never a proposed or rejected finding. Editing/review stays in /ba-intelligence.
function BAIntelligenceFindingsPanel({findings, onClose}: {findings: Finding[]; onClose: () => void}) {
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <header style={{padding:"16px 24px",borderBottom:"1px solid var(--lc-border)",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
        <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:"var(--lc-text-3)",background:"none",border:"none",cursor:"pointer",padding:0}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Back
        </button>
        <div style={{width:1,height:16,background:"var(--lc-border)"}}/>
        <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--lc-text-1)",flex:1}}>BA Intelligence — Validated Findings</span>
        <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--lc-text-3)"}}>{findings.length} accepted</span>
      </header>
      <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
        <p style={{fontSize:12,color:"var(--lc-text-4)",lineHeight:1.6,marginBottom:18}}>
          These are the accepted findings currently supplied as context to this workstream. Review, edit, accept, or reject findings in BA Intelligence itself.
        </p>
        {findings.length === 0 && (
          <div style={{fontSize:13,color:"var(--lc-text-4)",lineHeight:1.6}}>No accepted findings yet.</div>
        )}
        {FINDING_CATEGORY_META.map(meta => {
          const items = findings.filter(f => f.category === meta.id);
          if (!items.length) return null;
          return (
            <div key={meta.id} style={{marginBottom:22}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:meta.color,flexShrink:0}}/>
                <span style={{fontFamily:"var(--font-mono)",fontSize:10.5,fontWeight:700,color:"var(--lc-text-2)",letterSpacing:".04em",textTransform:"uppercase"}}>{meta.label}</span>
                <span style={{fontSize:11,color:"var(--lc-text-4)"}}>({items.length})</span>
              </div>
              {items.map(f => (
                <div key={f.id} style={{padding:"9px 12px",borderRadius:8,border:"1px solid var(--lc-border)",marginBottom:6,fontSize:12.5,color:"var(--lc-text-1)",lineHeight:1.55}}>
                  {f.finding_text}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Workstream session ─────────────────────────────────────────────────────────
// ── Work page local nav row ─────────────────────────────────────────────────────
// Compact row under the project tabs: where you are on the left, Project
// context (the only permanent action) on the right.
function WorkNavRow({children, onOpenContext}: {children: React.ReactNode; onOpenContext: ()=>void}) {
  return (
    <div className="work-nav-row" style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"0 32px",minHeight:44,borderBottom:"1px solid var(--lc-border-soft)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>{children}</div>
      <button onClick={onOpenContext}
        style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,background:"none",border:"none",padding:"6px 0",cursor:"pointer",fontSize:12.5,fontWeight:600,color:"var(--teal)",fontFamily:"inherit"}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
        Project context
      </button>
    </div>
  );
}

// Switches between the seven existing work areas — a plain menu, not a catalogue.
function WorkstreamSwitcher({current, onSwitch}: {current: Workstream; onSwitch: (ws: Workstream)=>void}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} style={{position:"relative",minWidth:0}}>
      <button onClick={()=>setOpen(v=>!v)} aria-haspopup="menu" aria-expanded={open}
        style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",padding:"6px 2px",cursor:"pointer",fontSize:12.5,fontWeight:600,color:"var(--lc-text-2)",fontFamily:"inherit",whiteSpace:"nowrap"}}>
        {current.label}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div role="menu" style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:60,minWidth:220,background:"var(--lc-surface)",border:"1px solid var(--lc-border)",borderRadius:12,boxShadow:"var(--lc-shadow-md)",padding:6}}>
          {WORKSTREAMS.map(w => {
            const isCurrent = w.id === current.id;
            return (
              <button key={w.id} role="menuitem" onClick={()=>{setOpen(false); if (!isCurrent) onSwitch(w);}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,background:isCurrent?"var(--lc-bg)":"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:isCurrent?700:500,color:"var(--lc-text-1)",textAlign:"left",fontFamily:"inherit"}}
                onMouseEnter={e=>{if(!isCurrent)e.currentTarget.style.background="var(--lc-bg)";}}
                onMouseLeave={e=>{if(!isCurrent)e.currentTarget.style.background="none";}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:w.color,flexShrink:0}}/>
                <span style={{flex:1}}>{w.label}</span>
                {isCurrent && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkstreamSession({ws, project, notes, artifacts, findings, onBack, onSwitchWs, onArtifactSaved, onStatusChange, onDecisionLog, onOpenContext, onOpenArtifact, onOpenRTM}: {
  ws: Workstream; project: Project; notes: ProjectNote[]; artifacts: Artifact[]; findings: Finding[];
  onBack: ()=>void; onSwitchWs:(ws:Workstream)=>void; onArtifactSaved:(a:Artifact)=>void; onStatusChange:(id:string,status:string)=>void; onDecisionLog:(prefill?:string)=>void;
  onOpenContext: ()=>void; onOpenArtifact:(a:Artifact)=>void; onOpenRTM: ()=>void;
}) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [saveStatus, setSaveStatus]   = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [viewMode, setViewMode]       = useState<"chat"|"document">("chat");
  const [editingIdx, setEditingIdx]   = useState<number|null>(null);
  const [editText, setEditText]       = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [contextSourceIds, setContextSourceIds] = useState<string[]>([]);
  const [contextFindingIds, setContextFindingIds] = useState<string[]>([]);
  const [contextSessionIds, setContextSessionIds] = useState<string[]>([]);
  const [showFindings, setShowFindings] = useState(false);
  const [importTarget, setImportTarget] = useState<string|null>(null);
  const [scopeIds, setScopeIds]         = useState<string[]>([]);
  const [lifecycleBusy, setLifecycleBusy] = useState<"approve"|"revise"|null>(null);
  const [lifecycleError, setLifecycleError] = useState("");
  const endRef      = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // This workstream only ever sees the BA Intelligence categories it declares —
  // e.g. Requirements gets all five, Process Analysis only Business Rules and
  // Edge Cases. Every downstream use of "findings" in this component should read
  // from this filtered list, never the full project findings array.
  const relevantFindings = findings.filter(f => (ws.baIntelligenceCategories as readonly string[]).includes(f.category));

  // This work area's saved artifact(s), newest version first — usually one;
  // two while an approved version and its newer revision draft coexist.
  // Each opens in the existing ArtifactViewer (edit / approve / revise / archive).
  const savedVersions = artifacts
    .filter(a => a.type === ws.artifactType && a.status !== "superseded" && a.status !== "archived")
    .sort((x, y) => y.version - x.version);

  // Simplified start (see START_COPY). "Using …" names exactly what
  // buildContext will send: project context (overview, project notes) plus the
  // approved upstream artifacts this area builds on — same selection rule.
  const startCopy = START_COPY[ws.id];
  const usedUpstream = (ws.contextTypes as readonly string[]).flatMap(t => {
    const approved = artifacts.filter(a => a.type === t && a.status === "approved");
    if (!approved.length) return [];
    const label = CONTEXT_TYPE_LABEL[t] ?? t;
    return [MULTI_INSTANCE_TYPES.includes(t) ? (approved.length > 1 ? `${label} (${approved.length})` : label) : `${label} v${approved[0].version}`];
  });
  const isBlankStart = messages.length === 0 && savedVersions.length === 0;
  // Blank start uses the wide, centred layout: context strip, white composer
  // surface, four prompts in a 2×2 grid.
  const centredStart = isBlankStart;
  const contextInUse = ["Project context", ...usedUpstream];

  // Testing's declared scope. Recognisable ids (FR-001 etc.) pulled from
  // whatever approved upstream artifacts exist — imported or native, no
  // distinction — so the BA can say which ones this round is testing
  // against. Nothing here is ever assumed to be in scope; scopeIds starts
  // empty and only grows from an explicit checkbox.
  const scopeCandidateIds = ws.id === "testing"
    ? [...new Set(artifacts.filter(a => (ws.contextTypes as readonly string[]).includes(a.type) && a.status === "approved").flatMap(a => extractItemIds(a.content)))]
    : [];

  // Load saved conversation
  useEffect(() => {
    async function loadConversation() {
      try {
        const res = await fetch(`/api/projects/${project.id}/conversations?type=${ws.artifactType}`);
        const data = await res.json();
        if (res.ok && data.conversations?.[0]?.messages?.length) {
          const msgs: Message[] = data.conversations[0].messages;
          setMessages(msgs);
          const hasA = msgs.some(m => m.role === "assistant" && isAnalysisDone(ws.id, m.content) && !m.truncated);
          setHasAnalysis(hasA);
          if (hasA) {
            const alreadySaved = artifacts.some(a => a.type === ws.artifactType && a.status !== "superseded" && a.status !== "archived");
            setSaveStatus(alreadySaved ? "saved" : "idle");
          }
        }
      } catch { /* start fresh */ }
      setLoadingHistory(false);
    }
    loadConversation();
  }, [ws.id, ws.artifactType, project.id]);

  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, loading]);
  // The start composer grows with its content (typed, pasted or a prompt fill).
  useEffect(() => {
    const t = textareaRef.current;
    if (!t || !t.dataset.autogrow) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 360)}px`;
  }, [input]);
  useEffect(() => { if (!loadingHistory) textareaRef.current?.focus(); }, [loadingHistory]);

  async function persistConversation(msgs: Message[], artifactId?: string) {
    try {
      const res = await fetch(`/api/projects/${project.id}/conversations`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({workstream_type: ws.artifactType, messages: msgs, ...(artifactId ? {artifact_id: artifactId} : {})}),
      });
      // fetch() does not throw on a non-2xx response, so a failed save was
      // previously indistinguishable from a successful one. Surface it in the
      // console rather than letting it silently masquerade as persisted.
      if (!res.ok) console.error(`[persistConversation] save failed for ${ws.artifactType}:`, res.status, await res.text().catch(() => ""));
    } catch (err) { console.error(`[persistConversation] request failed for ${ws.artifactType}:`, err); }
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const displayMessages: Message[] = [...messages, {role:"user",content:trimmed}];
    setMessages(displayMessages);
    setInput("");
    setLoading(true);

    // Context is reconstructed fresh for every generation call, using the current
    // artifacts/findings available to the client at that moment — not just on the
    // first message of the conversation. The persisted/displayed message history
    // (displayMessages / messages) never carries the context block; only the
    // ephemeral apiMessages payload for this one call does, attached to the
    // current turn only, so exactly one context block is ever in flight.
    const ctx = buildContext(ws, project, notes, artifacts, relevantFindings);
    setContextSourceIds(ctx.sourceIds);
    setContextFindingIds(ctx.findingIds);
    setContextSessionIds(ctx.sessionIds);
    const apiMessages: Message[] = [
      ...displayMessages.slice(0, -1),
      {role:"user", content:`${ctx.text}\n${trimmed}`},
    ];

    try {
      const body: Record<string,unknown> = {messages: apiMessages};
      if (ws.id === "business-case") body.docType = "brd";
      const res  = await fetch(ws.endpoint, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      const reply = data.response ?? "Something went wrong. Please try again.";
      const isTruncated = !!data.truncated;
      const updated = [...displayMessages, {role:"assistant" as const, content:reply, truncated:isTruncated}];
      setMessages(updated);
      let savedArtifactId: string | undefined;
      if (!isTruncated && isAnalysisDone(ws.id, reply)) {
        setHasAnalysis(true);
        savedArtifactId = await saveArtifact(reply, {sourceIds:ctx.sourceIds, findingIds:ctx.findingIds, sessionIds:ctx.sessionIds});
      }
      await persistConversation(updated, savedArtifactId);
    } catch {
      setMessages(prev=>[...prev,{role:"assistant",content:"Something went wrong. Please try again."}]);
    } finally {
      setLoading(false);
    }
  }

  // A truncated response (cut off at the model's output limit) must be
  // completed through this dedicated action, not ordinary chat follow-up —
  // the generation prompts instruct the model to reproduce the complete
  // document every turn, so a normal follow-up would restart the whole thing
  // under the same output cap and likely truncate again. This sends a fixed,
  // narrowly-scoped continuation instruction instead, and merges the result
  // into the SAME message rather than appending a new one, so the document
  // never gets duplicated sections.
  async function continueGeneration(idx: number) {
    if (loading) return;
    const target = messages[idx];
    if (!target || target.role !== "assistant" || !target.truncated) return;
    setLoading(true);
    const apiMessages: Message[] = [
      ...messages.slice(0, idx + 1),
      {role:"user", content: CONTINUATION_INSTRUCTION},
    ];
    try {
      const body: Record<string,unknown> = {messages: apiMessages};
      if (ws.id === "business-case") body.docType = "brd";
      const res = await fetch(ws.endpoint, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      const continuation = data.response ?? "";
      const stillTruncated = !!data.truncated;
      const mergedContent = target.content + continuation;
      const updated = messages.map((m,i) => i===idx ? {role:"assistant" as const, content:mergedContent, truncated:stillTruncated} : m);
      setMessages(updated);
      let savedArtifactId: string | undefined;
      if (!stillTruncated && isAnalysisDone(ws.id, mergedContent)) {
        setHasAnalysis(true);
        savedArtifactId = await saveArtifact(mergedContent);
      }
      await persistConversation(updated, savedArtifactId);
    } catch {
      // Leave the message as still truncated — the Continue generation button
      // stays available so the BA can simply try again.
    } finally {
      setLoading(false);
    }
  }

  // Returns the saved artifact's id on success so the caller can thread it into
  // the single, correct persistConversation() call for this turn — this function
  // must never write to artifact_conversations itself. It previously did, using
  // `messages` captured from this component's own state closure rather than the
  // turn's actual up-to-date message list; that stale write raced against the
  // correct persistConversation(updated) call and could silently overwrite a
  // just-saved conversation with an empty one. Root-caused live, not assumed.
  // ctxOverride carries the context ids computed THIS turn, passed directly by
  // the caller. React state setters (setContextSourceIds etc.) don't apply
  // until the next render, so reading the contextSourceIds/contextFindingIds/
  // contextSessionIds state variables here — instead of the fresh values the
  // caller just computed — silently saved the PREVIOUS turn's context ids (or
  // none, on a workstream's first-ever generation). Root-caused live: a fresh
  // conversation's first save recorded context_finding_ids: [] despite three
  // real accepted findings having been used as context for that exact call.
  async function saveArtifact(directContent?: string, ctxOverride?: {sourceIds:string[]; findingIds:string[]; sessionIds:string[]}): Promise<string | undefined> {
    if (saveStatus === "saving") return undefined;
    const finalContent = directContent ?? [...messages].reverse().find(m=>m.role==="assistant"&&isAnalysisDone(ws.id,m.content))?.content;
    if (!finalContent) return undefined;
    setSaveStatus("saving");
    const sourceIds = ctxOverride?.sourceIds ?? contextSourceIds;
    const findingIds = ctxOverride?.findingIds ?? contextFindingIds;
    const sessionIds = ctxOverride?.sessionIds ?? contextSessionIds;
    try {
      const res = await fetch(`/api/projects/${project.id}/artifacts`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({type:ws.artifactType,title:ARTIFACT_TYPE_LABEL[ws.artifactType]??ws.label,content:finalContent,reasoning_context:{tool:ws.id,methodology:project.methodology,saved_at:new Date().toISOString(),...((ws.baIntelligenceCategories as readonly string[]).length>0?{context_finding_ids:findingIds,context_session_ids:sessionIds}:{}),...(scopeIds.length>0?{scope_ids:scopeIds}:{})},status:"draft",source_artifact_ids:sourceIds}),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("saved");
        onArtifactSaved(data.artifact);
        return data.artifact.id as string;
      } else {
        setSaveStatus("error");
        return undefined;
      }
    } catch {
      setSaveStatus("error");
      return undefined;
    }
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setEditText(messages[idx].content);
  }

  async function submitEdit() {
    if (editingIdx === null || !editText.trim() || loading) return;
    const truncated = messages.slice(0, editingIdx);
    const newUser: Message = {role:"user", content:editText.trim()};
    const displayMessages: Message[] = [...truncated, newUser];
    setMessages(displayMessages);
    setEditingIdx(null);
    setInput("");
    setLoading(true);
    setHasAnalysis(false);
    setSaveStatus("idle");

    const ctx = buildContext(ws, project, notes, artifacts, relevantFindings);
    setContextSourceIds(ctx.sourceIds);
    setContextFindingIds(ctx.findingIds);
    setContextSessionIds(ctx.sessionIds);
    const apiMessages: Message[] = [
      ...truncated,
      {role:"user", content:`${ctx.text}\n${editText.trim()}`},
    ];

    try {
      const body: Record<string,unknown> = {messages: apiMessages};
      if (ws.id === "business-case") body.docType = "brd";
      const res  = await fetch(ws.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      const reply = data.response ?? "Something went wrong.";
      const isTruncated = !!data.truncated;
      const updated = [...displayMessages,{role:"assistant" as const,content:reply,truncated:isTruncated}];
      setMessages(updated);
      let savedArtifactId: string | undefined;
      if (!isTruncated && isAnalysisDone(ws.id,reply)) { setHasAnalysis(true); savedArtifactId = await saveArtifact(reply, {sourceIds:ctx.sourceIds, findingIds:ctx.findingIds, sessionIds:ctx.sessionIds}); }
      await persistConversation(updated, savedArtifactId);
    } catch {
      setMessages(prev=>[...prev,{role:"assistant",content:"Something went wrong. Please try again."}]);
    } finally {
      setLoading(false);
    }
  }

  async function rerunFromHere(idx: number) {
    if (loading) return;
    const truncated = messages.slice(0, idx + 1);
    setMessages(truncated);
    setHasAnalysis(false);
    setSaveStatus("idle");
    setLoading(true);

    const ctx = buildContext(ws, project, notes, artifacts, relevantFindings);
    setContextSourceIds(ctx.sourceIds);
    setContextFindingIds(ctx.findingIds);
    setContextSessionIds(ctx.sessionIds);
    const apiMessages: Message[] = [
      ...truncated.slice(0, idx),
      {role:"user", content:`${ctx.text}\n${truncated[idx].content}`},
    ];

    try {
      const body: Record<string,unknown> = {messages: apiMessages};
      if (ws.id === "business-case") body.docType = "brd";
      const res  = await fetch(ws.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      const reply = data.response ?? "Something went wrong.";
      const isTruncated = !!data.truncated;
      const updated = [...truncated,{role:"assistant" as const,content:reply,truncated:isTruncated}];
      setMessages(updated);
      let savedArtifactId: string | undefined;
      if (!isTruncated && isAnalysisDone(ws.id,reply)) { setHasAnalysis(true); savedArtifactId = await saveArtifact(reply, {sourceIds:ctx.sourceIds, findingIds:ctx.findingIds, sessionIds:ctx.sessionIds}); }
      await persistConversation(updated, savedArtifactId);
    } catch {
      setMessages(prev=>[...prev,{role:"assistant",content:"Something went wrong."}]);
    } finally {
      setLoading(false);
    }
  }

  if (loadingHistory) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
        <div style={{fontSize:13,color:"var(--lc-text-4)"}}>Loading conversation...</div>
      </div>
    );
  }

  const analysisContent = messages.filter(m => m.role === "assistant" && isAnalysisDone(ws.id, m.content) && !m.truncated).map(m => m.content).join("\n\n---\n\n");

  if (showFindings) {
    return <BAIntelligenceFindingsPanel findings={relevantFindings} onClose={()=>setShowFindings(false)}/>;
  }

  // Document view, Copy and every export use the saved version of this work
  // area (its own content, status, version and date) once it is saved — so an
  // export is always a real, identifiable artifact version, never a re-render
  // of the conversation. Before anything is saved, the analysis is shown and
  // exported as-is, labelled "Not saved".
  // The current saved version: the one this session's analysis was saved as,
  // or — with no conversation (e.g. work brought in from outside) — the latest
  // saved version itself.
  const savedCurrent = (saveStatus === "saved" || messages.length === 0) ? savedVersions[0] : undefined;
  const exportContext: ExportContext = { projectName: project.name, organization: project.organizations?.name ?? null };
  const docContent = savedCurrent?.content ?? analysisContent;
  const docMeta: ExportMeta = savedCurrent
    ? artifactExportMeta(savedCurrent, exportContext)
    : { ...exportContext, artifactLabel: ARTIFACT_TYPE_LABEL[ws.artifactType] ?? ws.label, status: "Not saved" };

  if (viewMode === "document" && (analysisContent || savedCurrent)) {
    return (
      <DocumentViewer
        content={docContent}
        title={docMeta.artifactLabel}
        accentColor={ws.color}
        onBack={() => setViewMode("chat")}
        meta={docMeta}
        actions={<ExportMenu content={docContent} meta={docMeta} artifactType={ws.artifactType} projectId={project.id} xlsx={XLSX_TYPES.has(ws.artifactType)}/>}
      />
    );
  }

  // Draft → Approved on the Work page itself, through the shared lifecycle
  // helpers (same server path as the saved-version viewer).
  const isApproved = savedCurrent?.status === "approved";
  async function approveCurrent() {
    if (!savedCurrent || lifecycleBusy) return;
    setLifecycleBusy("approve"); setLifecycleError("");
    try {
      if (await setArtifactStatus(project.id, savedCurrent.id, "approved")) onStatusChange(savedCurrent.id, "approved");
      else setLifecycleError("Couldn't approve — please try again.");
    } catch { setLifecycleError("Couldn't approve — please try again."); }
    finally { setLifecycleBusy(null); }
  }
  async function reviseCurrent() {
    if (!savedCurrent || lifecycleBusy) return;
    setLifecycleBusy("revise"); setLifecycleError("");
    try {
      const a = await reviseArtifact(project.id, savedCurrent);
      if (a) onArtifactSaved(a); else setLifecycleError("Couldn't start a new version — please try again.");
    } catch { setLifecycleError("Couldn't start a new version — please try again."); }
    finally { setLifecycleBusy(null); }
  }

  // Testing's declared scope — which approved requirements this round tests.
  // Kept on the start state: it decides what the test work is scoped to.
  const scopePicker = ws.id === "testing" && scopeCandidateIds.length > 0 ? (
    <div style={{padding:"10px 12px",background:"var(--lc-surface)",border:"1px solid var(--lc-border)",borderRadius:9,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--lc-text-3)"}}>Which requirements are you testing this round?</div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontFamily:"var(--font-mono)",fontSize:10.5,color:scopeIds.length?"var(--teal)":"var(--lc-text-4)"}}>
            {scopeIds.length} of {scopeCandidateIds.length} selected
          </span>
          <button onClick={()=>setScopeIds(scopeIds.length ? [] : scopeCandidateIds)}
            style={{background:"none",border:"none",color:"var(--teal)",fontSize:10.5,fontWeight:700,cursor:"pointer",padding:0}}>
            {scopeIds.length ? "Clear" : "Select all"}
          </button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))",gap:5,maxHeight:160,overflowY:"auto",paddingRight:2}}>
        {scopeCandidateIds.map(id=>{
          const on = scopeIds.includes(id);
          return (
            <button key={id} onClick={()=>setScopeIds(prev=>on?prev.filter(x=>x!==id):[...prev,id])}
              style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:6,border:`1px solid ${on?"rgba(52,64,125,.3)":"var(--lc-border)"}`,background:on?"var(--lc-teal-bg)":"none",color:on?"var(--teal)":"var(--lc-text-4)",fontSize:11,fontFamily:"var(--font-mono)",fontWeight:600,cursor:"pointer"}}>
              <span style={{width:10,height:10,borderRadius:3,border:`1.5px solid ${on?"var(--teal)":"var(--lc-text-5)"}`,background:on?"var(--teal)":"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {on && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#f5f1e7" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </span>
              {id}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  // The composer — the same send/persist flow wherever it renders. "main" is
  // the blank-start version: the primary element of the page.
  const composerBox = (main: boolean, bare = false) => (
    <div style={bare ? {} : {background:main?"var(--lc-surface)":"transparent",border:"1px solid var(--lc-border)",borderRadius:main?14:12,boxShadow:main?"var(--lc-shadow-sm)":"none",overflow:"hidden",transition:"border-color .2s, background .2s"}}
            onFocusCapture={bare ? undefined : e=>{e.currentTarget.style.borderColor=`${ws.color}55`;e.currentTarget.style.background="var(--lc-surface)";}}
            onBlurCapture={bare ? undefined : e=>{e.currentTarget.style.borderColor="var(--lc-border)";if(!main)e.currentTarget.style.background="transparent";}}
          >
            <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder={hasAnalysis
                ? "Add new context, a stakeholder update, a risk, or any new information..."
                : messages.length===0
                  ? startCopy.placeholder
                  : "Continue the conversation..."}
              rows={bare?3:main?4:2}
              data-autogrow={bare ? "1" : undefined}
              style={{width:"100%",background:"none",border:"none",outline:"none",padding:bare?"2px 0 10px":main?"14px 16px 6px":"11px 14px 4px",fontSize:bare?15:main?14.5:13.5,color:"var(--lc-text-1)",lineHeight:1.6,resize:"none",fontFamily:"var(--font-body)",...(bare?{maxHeight:360,overflowY:"auto"}:{})}}
            />
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:bare?"10px 0 0":"4px 8px 8px 14px",...(bare?{borderTop:"1px solid var(--lc-border-soft)"}:{})}}>
              <span style={{fontSize:11,color:"var(--lc-text-5)"}}>
                {hasAnalysis ? "Conversation stays open — keep adding context" : "Enter to send · Shift+Enter for new line"}
              </span>
              <button onClick={send} disabled={!input.trim()||loading}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:7,background:input.trim()&&!loading?ws.color:"transparent",border:input.trim()&&!loading?"none":"1px solid var(--lc-border)",cursor:input.trim()&&!loading?"pointer":"not-allowed",fontSize:12.5,fontWeight:700,color:input.trim()&&!loading?"#f5f1e7":"var(--lc-text-4)",transition:"all .2s",flexShrink:0}}>
                {loading?"Thinking...":"Send"}
              </button>
            </div>
          </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Local nav — ← Workstreams › current area (switcher); Project context on the right. */}
      <WorkNavRow onOpenContext={onOpenContext}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:5,fontSize:12.5,color:"var(--lc-text-3)",background:"none",border:"none",cursor:"pointer",padding:"6px 0",fontFamily:"inherit",whiteSpace:"nowrap"}} onMouseEnter={e=>e.currentTarget.style.color="var(--lc-text-1)"} onMouseLeave={e=>e.currentTarget.style.color="var(--lc-text-3)"}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Workstreams
        </button>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--lc-text-5)" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}><path d="M9 18l6-6-6-6"/></svg>
        <WorkstreamSwitcher current={ws} onSwitch={onSwitchWs}/>
      </WorkNavRow>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"0 32px 24px"}} className="ws-canvas">
        {/* Current work area — the strongest text on the page; the guiding
            question and saved-artifact metadata are quiet supporting lines. */}
        <div style={{padding:"26px 0 18px",...(centredStart?{maxWidth:1000,margin:"0 auto",padding:"34px 0 20px"}:{})}}>
          <h1 style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,color:"var(--lc-text-1)",letterSpacing:"-0.02em",lineHeight:1.2,margin:0}}>{ws.label}</h1>
          <p style={{fontSize:14,color:"var(--lc-text-3)",lineHeight:1.5,margin:"4px 0 0"}}>{ws.question}</p>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"6px 18px",marginTop:12,fontSize:12,color:"var(--lc-text-4)"}}>
            {savedVersions.map(a => {
              const prov = provenanceInfo(a);
              return (
                <span key={a.id} style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <span>{prov.statusLabel.charAt(0).toUpperCase() + prov.statusLabel.slice(1)} · v{a.version} · Updated {fmtDate(a.updated_at ?? a.created_at)}{prov.tag ? ` · ${prov.tag.toLowerCase()}` : ""}</span>
                  <button onClick={()=>onOpenArtifact(a)} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--teal)",fontFamily:"inherit",whiteSpace:"nowrap"}}>Open saved version →</button>
                </span>
              );
            })}
            {/* What this area uses automatically — quiet and informational,
                never a warning. */}
            <span className="ws-context-strip" aria-label={`Context in use: ${contextInUse.join(", ")}`}>
              <span className="ws-context-label">Context in use</span>
              {contextInUse.map(c => <span key={c} className="ws-context-item">{c}</span>)}
            </span>
            {relevantFindings.length > 0 && (
              <button onClick={()=>setShowFindings(true)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"2px 8px",background:"var(--lc-teal-bg)",border:"1px solid var(--lc-teal-border)",borderRadius:6,fontSize:11,color:"var(--teal)",fontFamily:"var(--font-mono)",cursor:"pointer"}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:"var(--teal)"}}/>
                BA Intelligence ({relevantFindings.length})
              </button>
            )}
            {/* RTM is contextual to Requirements and Testing only — not a
                project-wide control on every work area. */}
            {(ws.id === "requirements" || ws.id === "testing") && (
              <button onClick={onOpenRTM} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--teal)",fontFamily:"inherit",whiteSpace:"nowrap"}}>Traceability (RTM) →</button>
            )}
            {/* Work produced outside TheBAPortal only — never in-app work. */}
            {centredStart && (
              <button onClick={()=>setImportTarget(ws.artifactType)} className="ws-bring-btn">+ {ws.bringLabel}</button>
            )}
          </div>
        </div>
        {/* Simplified start: one door for work done outside TheBAPortal, then
            the composer as the main element with example prompts. Project
            context and approved upstream work are used automatically. */}
        {centredStart && (
          <div style={{maxWidth:1000,margin:"0 auto"}}>
            {scopePicker && <div style={{marginBottom:18}}>{scopePicker}</div>}
            <div className="ws-start-surface">
              <h2 style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"var(--lc-text-1)",letterSpacing:"-0.01em",margin:"0 0 10px"}}>What would you like to work through?</h2>
              {composerBox(true, true)}
            </div>
            <div className="ws-prompt-grid">
              {startCopy.prompts.map(pr => (
                <button key={pr} className="ws-prompt" onClick={()=>{setInput(pr);textareaRef.current?.focus();}}>
                  <span>{pr}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Saved work but no conversation (e.g. brought in from outside):
            show the saved version rather than a blank start. */}
        {messages.length === 0 && savedVersions.length > 0 && scopePicker && <div style={{maxWidth:860,marginBottom:16}}>{scopePicker}</div>}
        {messages.length === 0 && savedVersions.length > 0 && (
          <div className="ws-output" style={{background:"var(--lc-surface)",border:"1px solid var(--lc-border-soft)",boxShadow:"var(--lc-shadow-sm)",borderRadius:"var(--radius)",padding:"28px 36px",marginBottom:16}}>
            {renderMd(savedVersions[0].content, ws.color)}
          </div>
        )}
        {messages.map((msg,i) => {
          const isUser = msg.role === "user";
          const isStructured = !isUser && isAnalysisDone(ws.id, msg.content) && !msg.truncated;
          const isEditing = editingIdx === i;

          if (isUser) return (
            <div key={i} className="msg-group" style={{display:"flex",justifyContent:"flex-end",marginBottom:12,position:"relative"}}>
              {isEditing ? (
                <div style={{maxWidth:"72%",width:"100%"}}>
                  <textarea value={editText} onChange={e=>setEditText(e.target.value)} autoFocus rows={3}
                    style={{width:"100%",background:"var(--lc-faint)",border:`1px solid ${ws.color}45`,borderRadius:"14px 14px 3px 14px",padding:"11px 14px",fontSize:13.5,color:"var(--lc-text-1)",outline:"none",resize:"none",fontFamily:"var(--font-body)",lineHeight:1.6}}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitEdit();}if(e.key==="Escape")setEditingIdx(null);}}
                  />
                  <div style={{display:"flex",gap:7,marginTop:6,justifyContent:"flex-end"}}>
                    <button onClick={submitEdit} disabled={!editText.trim()||loading} style={{padding:"6px 14px",background:editText.trim()?ws.color:"rgba(0,0,0,.08)",border:"none",borderRadius:7,fontSize:12.5,fontWeight:700,color:editText.trim()?"#f5f1e7":"var(--lc-text-4)",cursor:editText.trim()?"pointer":"not-allowed"}}>Re-run</button>
                    <button onClick={()=>setEditingIdx(null)} style={{padding:"6px 12px",background:"none",border:"1px solid var(--lc-border)",borderRadius:7,fontSize:12,color:"var(--lc-text-3)",cursor:"pointer"}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{position:"relative",maxWidth:"72%"}}>
                  <div style={{padding:"11px 14px",background:`${ws.color}14`,border:`1px solid ${ws.color}28`,borderRadius:"14px 14px 3px 14px",fontSize:13.5,color:"var(--lc-text-1)",lineHeight:1.6}}>
                    {msg.content}
                  </div>
                  <div className="msg-actions" style={{position:"absolute",top:-28,right:0,display:"none",alignItems:"center",gap:4,background:"var(--lc-faint)",border:"1px solid var(--lc-border)",borderRadius:8,padding:"3px 6px"}}>
                    <button onClick={()=>{navigator.clipboard?.writeText(msg.content);}} title="Copy" style={{background:"none",border:"none",cursor:"pointer",color:"var(--lc-text-3)",padding:"2px 4px",borderRadius:4,fontSize:11}} onMouseEnter={e=>e.currentTarget.style.color="var(--lc-text-1)"} onMouseLeave={e=>e.currentTarget.style.color="var(--lc-text-3)"}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                    <button onClick={()=>startEdit(i)} title="Edit and re-run" style={{background:"none",border:"none",cursor:"pointer",color:"var(--lc-text-3)",padding:"2px 4px",borderRadius:4,fontSize:11}} onMouseEnter={e=>e.currentTarget.style.color="var(--lc-text-1)"} onMouseLeave={e=>e.currentTarget.style.color="var(--lc-text-3)"}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={()=>rerunFromHere(i)} title="Re-run from here" style={{background:"none",border:"none",cursor:"pointer",color:"var(--lc-text-3)",padding:"2px 4px",borderRadius:4,fontSize:11}} onMouseEnter={e=>e.currentTarget.style.color="var(--lc-text-1)"} onMouseLeave={e=>e.currentTarget.style.color="var(--lc-text-3)"}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );

          if (!isUser && msg.truncated) return (
            <div key={i} style={{marginBottom:16}}>
              <div style={{background:"var(--lc-surface)",border:"1px solid rgba(181,116,31,.35)",borderRadius:"var(--radius)",padding:"24px 28px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#b5741f,transparent)"}}/>
                {renderMd(msg.content, ws.color)}
              </div>
              <div style={{marginTop:10,padding:"11px 14px",background:"var(--lc-amber-bg)",border:"1px solid rgba(181,116,31,.3)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:7,fontSize:12.5,color:"var(--lc-amber)",fontWeight:600,lineHeight:1.5}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lc-amber)" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Generation stopped before finishing — it reached the model&apos;s output limit. This is not a complete deliverable and has not been saved.
                </span>
                <button onClick={()=>continueGeneration(i)} disabled={loading}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"#b5741f",border:"none",cursor:loading?"not-allowed":"pointer",fontSize:12.5,fontWeight:700,color:"#f5f1e7",flexShrink:0}}>
                  {loading ? "Continuing..." : "Continue generation"}
                </button>
              </div>
            </div>
          );

          if (isStructured) return (
            <div key={i} style={{marginBottom:16}}>
              <div className="ws-output" style={{background:"var(--lc-surface)",border:"1px solid var(--lc-border-soft)",boxShadow:"var(--lc-shadow-sm)",borderRadius:"var(--radius)",padding:"28px 36px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${ws.color},transparent)`}}/>
                {renderMd(msg.content, ws.color)}
              </div>
            </div>
          );

          return (
            <div key={i} style={{display:"flex",gap:8,marginBottom:12,alignItems:"flex-start"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:`${ws.color}14`,border:`1px solid ${ws.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-mono)",fontSize:8,fontWeight:700,color:ws.color,flexShrink:0,marginTop:2}}>BA</div>
              <div style={{maxWidth:"78%",padding:"10px 14px",background:"var(--lc-faint)",border:"1px solid var(--lc-border)",borderRadius:"3px 14px 14px 14px",fontSize:13.5,color:"var(--lc-text-1)",lineHeight:1.68}}>
                {renderMd(msg.content)}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"flex-start"}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:`${ws.color}14`,border:`1px solid ${ws.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-mono)",fontSize:8,fontWeight:700,color:ws.color,flexShrink:0}}>BA</div>
            <div style={{padding:"10px 14px",background:"var(--lc-faint)",border:"1px solid var(--lc-border)",borderRadius:"3px 14px 14px 14px",display:"flex",gap:4}}>
              {[0,1,2].map(j=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:"var(--lc-text-3)",animation:`typing-dot 1.2s ${j*0.2}s infinite ease-in-out`}}/>)}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Completion + lifecycle — "Analysis complete" means the AI finished;
          Draft / Approved is the BA's decision about this version. Status reads
          as status, not buttons. Primary: Approve this version (Draft) or
          Revise (Approved) · Secondary: View as document, Log decision · Quiet: Copy. */}
      {(hasAnalysis || savedCurrent) && (
        <div className="ws-actions" style={{padding:"10px 32px",borderTop:"1px solid var(--lc-border-soft)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px 16px",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:"6px 16px",flexWrap:"wrap",fontSize:12.5}}>
            {hasAnalysis && (
              <span style={{display:"flex",alignItems:"center",gap:6,fontWeight:700,color:"var(--lc-text-1)"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lc-green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Analysis complete
              </span>
            )}
            {saveStatus === "saving" && (
              <span style={{display:"flex",alignItems:"center",gap:6,color:"var(--lc-text-4)"}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg>
                Saving...
              </span>
            )}
            {saveStatus !== "saving" && savedCurrent && (isApproved ? (
              <span style={{display:"flex",alignItems:"center",gap:5,fontWeight:700,color:"var(--lc-green)"}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Approved · v{savedCurrent.version}
              </span>
            ) : (
              <span style={{color:"var(--lc-text-3)"}}>Saved as Draft</span>
            ))}
            {saveStatus === "error" && (
              <button onClick={()=>saveArtifact()} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:7,background:"var(--lc-red-bg)",border:"1px solid var(--lc-red-border)",fontSize:12,fontWeight:600,color:"var(--lc-red)",cursor:"pointer"}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Save failed — retry
              </button>
            )}
            {lifecycleError && <span role="alert" style={{color:"var(--lc-red)"}}>{lifecycleError}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>copyArtifact(docContent, docMeta)} title="Copy the whole artifact with formatting" style={{padding:"7px 10px",borderRadius:8,background:"none",border:"none",color:"var(--lc-text-3)",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--lc-text-1)"} onMouseLeave={e=>e.currentTarget.style.color="var(--lc-text-3)"}>
              Copy
            </button>
            <button onClick={()=>onDecisionLog()} style={{padding:"7px 14px",borderRadius:8,background:"var(--lc-surface)",border:"1px solid var(--lc-border)",color:"var(--lc-text-2)",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Log decision
            </button>
            <button onClick={()=>setViewMode("document")}
              style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"var(--lc-surface)",border:"1px solid var(--lc-border)",cursor:"pointer",fontSize:12.5,fontWeight:600,color:"var(--lc-text-2)",fontFamily:"inherit"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              View as document
            </button>
            {savedCurrent && saveStatus !== "saving" && (isApproved ? (
              <button onClick={reviseCurrent} disabled={!!lifecycleBusy} title="Starts a new Draft version — this approved version stays the trusted project version until the new one is approved"
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:"var(--lc-teal-bg)",border:"1px solid rgba(52,64,125,.3)",cursor:lifecycleBusy?"default":"pointer",fontSize:12.5,fontWeight:700,color:"var(--teal)",fontFamily:"inherit",opacity:lifecycleBusy?.6:1}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8 6.5h4a4 4 0 014 4"/></svg>
                {lifecycleBusy === "revise" ? "Starting new version…" : "Revise"}
              </button>
            ) : (
              <button onClick={approveCurrent} disabled={!!lifecycleBusy}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:"var(--lc-green)",border:"none",cursor:lifecycleBusy?"default":"pointer",fontSize:12.5,fontWeight:700,color:"#f5f1e7",fontFamily:"inherit",opacity:lifecycleBusy?.6:1}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {lifecycleBusy === "approve" ? "Approving…" : "Approve this version"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input — always open, deliberately lighter than the work output above.
          On a blank simplified start the composer sits in the page instead. */}
      {!isBlankStart && (
      <div style={{padding:"10px 32px 16px",flexShrink:0}} className="ws-composer">
        {composerBox(false)}
      </div>
      )}

      {importTarget && (
        <ImportArtifact
          projectId={project.id}
          targetType={importTarget}
          targetLabel={ARTIFACT_TYPE_LABEL[importTarget] ?? CONTEXT_TYPE_LABEL[importTarget] ?? importTarget}
          existingArtifacts={artifacts}
          onClose={()=>setImportTarget(null)}
          onImported={(a)=>{onArtifactSaved(a as Artifact);setImportTarget(null);}}
        />
      )}
    </div>
  );
}

// ── Workstreams hub ────────────────────────────────────────────────────────────
function WorkstreamsHub({project, artifacts, onSelectWs, onOpenContext}: {project:Project; artifacts:Artifact[]; onSelectWs:(ws:Workstream)=>void; onOpenContext:()=>void}) {
  const recommended = getRecommended(artifacts, project.methodology);
  const methodology = project.methodology ?? "agile";

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <WorkNavRow onOpenContext={onOpenContext}>
      <span style={{fontSize:12.5,fontWeight:600,color:"var(--lc-text-2)"}}>Workstreams</span>
    </WorkNavRow>
    <div className="ws-canvas" style={{padding:"26px 32px",overflowY:"auto",flex:1}}>
      <h2 style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,color:"var(--lc-text-1)",letterSpacing:"-0.02em",marginBottom:4}}>
        Workstreams
      </h2>
      <p style={{fontSize:13,color:"var(--lc-text-3)",lineHeight:1.6,marginBottom:24}}>
        All workstreams are available. Open any one — each knows your project context.
        {recommended && <span style={{color:"var(--teal)"}}> Suggested: {WORKSTREAMS.find(w=>w.id===recommended)?.label}.</span>}
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {WORKSTREAMS.map(ws => {
          const status = getWsStatus(ws.artifactType, artifacts);
          const isRec  = ws.id === recommended;
          const isAgileSuggested = ws.id === "user-stories" && !["agile","safe","hybrid"].includes(methodology);

          return (
            <div key={ws.id} onClick={()=>onSelectWs(ws)}
              style={{background:isRec?"rgba(52,64,125,.04)":"var(--lc-surface)",border:`1px solid ${isRec?"rgba(52,64,125,.2)":"var(--lc-border)"}`,borderRadius:"var(--radius)",padding:"16px 18px",cursor:"pointer",transition:"border-color .2s, background .2s",display:"flex",alignItems:"center",gap:14,position:"relative"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=`${ws.color}30`;(e.currentTarget as HTMLDivElement).style.background="var(--lc-faint)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=isRec?"rgba(52,64,125,.2)":"var(--lc-border)";(e.currentTarget as HTMLDivElement).style.background=isRec?"rgba(52,64,125,.04)":"var(--lc-surface)";}}
            >
              <div style={{width:36,height:36,borderRadius:10,background:`${ws.color}12`,border:`1px solid ${ws.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:ws.color}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--lc-text-1)"}}>{ws.label}</div>
                  {isRec && <span style={{fontFamily:"var(--font-mono)",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(52,64,125,.12)",color:"var(--teal)",border:"1px solid rgba(52,64,125,.2)"}}>SUGGESTED</span>}
                  {isAgileSuggested && <span style={{fontFamily:"var(--font-mono)",fontSize:9,color:"var(--lc-text-4)",padding:"2px 6px",borderRadius:4,border:"1px solid var(--lc-border)"}}>Agile only</span>}
                </div>
                <div style={{fontSize:12,color:"var(--lc-text-4)"}}>{ws.question}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:10,fontWeight:600,color:WS_STATUS_COLOR[status]}}>{WS_STATUS_LABEL[status]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--lc-text-4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:20,padding:"12px 16px",background:"var(--lc-surface)",border:"1px solid var(--lc-border)",borderRadius:"var(--radius)",fontSize:12.5,color:"var(--lc-text-3)",lineHeight:1.6}}>
        Workstreams are independent — open them in any order. The system tracks what is complete and suggests what makes sense next.
      </div>
    </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function ProjectWorkspaceClient({user,profile,project,initialArtifacts,initialDecisions,initialFindings,initialReviewFindings,initialTab="home",initialNotes=[]}:Props) {
  const router = useRouter();
  const [activeTab, setActiveTab]           = useState<"home"|"work">(initialTab);
  const [activeWs, setActiveWs]             = useState<Workstream|null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<Artifact|null>(null);
  const [artifacts, setArtifacts]           = useState<Artifact[]>(initialArtifacts);
  const [decisions, setDecisions]           = useState<Decision[]>(initialDecisions);
  const findings = initialFindings;
  // Project Context notes — every workstream receives these automatically;
  // a note added in the drawer is available to the next generation at once.
  const [notes, setNotes]                   = useState<ProjectNote[]>(initialNotes);
  const attentionItems: AttentionItem[]     = computeAttention(artifacts, initialReviewFindings);
  const [decisionModal, setDecisionModal]   = useState<{open:boolean;prefill?:string}>({open:false});
  const [showRTM, setShowRTM]               = useState(false);
  const [showContext, setShowContext]       = useState(false);

  // The Work page has no permanent side panel: supporting material opens on
  // demand — Project Context as the shared drawer, a saved artifact in the
  // existing ArtifactViewer, RTM from Requirements/Testing only. Opening any
  // of those keeps activeWs, so closing returns to the same work area.
  function goToWorkstream(wsId: WorkstreamId) {
    const ws = WORKSTREAMS.find(w => w.id === wsId);
    if (!ws) return;
    setActiveTab("work");
    setActiveWs(ws);
    setViewingArtifact(null);
    setShowRTM(false);
  }

  const handleArtifactSaved = useCallback((a:Artifact) => {
    setArtifacts(prev=>[a,...prev.filter(x=>x.id!==a.id)]);
  },[]);
  const handleDecisionSaved = useCallback((d:Decision) => {
    setDecisions(prev=>[d,...prev]);
  },[]);
  function handleStatusChange(id:string,status:string) {
    // Mirror the server: approving a version supersedes the previously
    // approved version of the same type (except multi-instance types), so the
    // page never shows two "current" approved versions until a reload.
    setArtifacts(prev=>{
      const target = prev.find(a=>a.id===id);
      return prev.map(a=>{
        if (a.id===id) return {...a,status};
        if (status==="approved" && target && a.type===target.type && a.status==="approved" && !MULTI_INSTANCE_TYPES.includes(a.type)) return {...a,status:"superseded"};
        return a;
      });
    });
    setViewingArtifact(prev=>prev?.id===id?{...prev,status}:prev);
  }

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"var(--lc-bg)"}}>
      <AppSidebar activeHref="/projects" profile={profile} user={user}/>

      <div className="app-shell-main" style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <ProjectNavBar projectId={project.id} projectName={project.name} active={activeTab}
          onHome={()=>setActiveTab("home")} onWork={()=>setActiveTab("work")}/>
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

      {/* Main area — no permanent project panel; the work canvas takes the full
          width after the app sidebar. */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <div style={{flex:1,minHeight:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {activeTab==="home" ? (
            <ProjectHome
              project={project}
              artifacts={artifacts}
              decisions={decisions}
              attentionItems={attentionItems}
              workstreams={WORKSTREAMS}
              methodologyLabel={METHODOLOGY_LABEL}
              wsStatusLabel={wsStatusInfo}
              onSelectWs={(wsId)=>goToWorkstream(wsId as WorkstreamId)}
              onOpenIntelligence={()=>router.push(`/ba-intelligence?project=${project.id}`)}
              onNoteAdded={(n)=>setNotes(prev=>[...prev,n])}
            />
          ) : showRTM ? (
            <RTMPanel artifacts={artifacts} onClose={()=>setShowRTM(false)} onGoToRequirements={()=>{setShowRTM(false);setActiveWs(WORKSTREAMS.find(w=>w.id==="requirements")??null);}}/>
          ) : viewingArtifact ? (
            <ArtifactViewer artifact={viewingArtifact} projectId={project.id} exportContext={{projectName:project.name, organization:project.organizations?.name ?? null}} onStatusChange={handleStatusChange} onClose={()=>setViewingArtifact(null)}
              onRevised={(a)=>{handleArtifactSaved(a);setViewingArtifact(a);}}/>
          ) : activeWs ? (
            // Keyed by work area so switching areas starts that area's session
            // fresh (its own conversation, input, save state) — never carries
            // the previous area's in-memory state across.
            <WorkstreamSession key={activeWs.id}
              ws={activeWs} project={project} notes={notes} artifacts={artifacts} findings={findings}
              onBack={()=>setActiveWs(null)}
              onSwitchWs={(ws)=>goToWorkstream(ws.id)}
              onArtifactSaved={handleArtifactSaved}
              onStatusChange={handleStatusChange}
              onDecisionLog={(prefill)=>setDecisionModal({open:true,prefill})}
              onOpenContext={()=>setShowContext(true)}
              onOpenArtifact={(a)=>setViewingArtifact(a)}
              onOpenRTM={()=>setShowRTM(true)}
            />
          ) : (
            <WorkstreamsHub project={project} artifacts={artifacts} onSelectWs={(ws)=>goToWorkstream(ws.id)} onOpenContext={()=>setShowContext(true)}/>
          )}
        </div>
      </main>
        </div>
      </div>

      {showContext && (
        <ProjectContextDrawer projectId={project.id} overview={project.problem_statement} onClose={()=>setShowContext(false)}
          onNoteAdded={(n)=>setNotes(prev=>[...prev,n])}/>
      )}

      {decisionModal.open && (
        <AddDecisionModal projectId={project.id} onSaved={handleDecisionSaved} onClose={()=>setDecisionModal({open:false})} prefill={decisionModal.prefill}/>
      )}

      <style>{`
        .msg-group:hover .msg-actions { display: flex !important; }
        @keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(52,64,125,.22);}50%{opacity:.7;box-shadow:0 0 0 6px transparent;} }
        @keyframes typing-dot { 0%,80%,100%{transform:scale(.6);opacity:.3;}40%{transform:scale(1);opacity:1;} }
      `}</style>
    </div>
  );
}
