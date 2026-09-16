"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import DocumentViewer from "@/components/DocumentViewer";
import { buildRTM } from "@/lib/rtm";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Organization { name: string; country?: string; industry?: string; }
interface Project {
  id: string; name: string; problem_statement?: string; methodology?: string;
  industry?: string; country?: string; relevant_context?: string; status: string;
  organizations?: Organization;
}
interface Artifact {
  id: string; type: string; title?: string; content: string;
  status: string; version: number; created_at: string; reasoning_context?: Record<string, unknown>;
}
interface Decision {
  id: string; decision_text: string; made_by?: string;
  decision_date?: string; status: string; impact_notes?: string; created_at: string;
}
interface Message { role: "user" | "assistant"; content: string; truncated?: boolean; }

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
interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  project: Project;
  initialArtifacts: Artifact[];
  initialDecisions: Decision[];
  initialFindings: Finding[];
}

// ── Workstream definitions ─────────────────────────────────────────────────────
// contextTypes: approved artifact types automatically pulled into this workstream's
// context. Most workstreams only ever used problem_analysis (unchanged here).
// Requirements is the first to pull from more than one source.
// baIntelligenceCategories: which accepted BA Intelligence finding categories this
// workstream directly consumes, per the Connected Context Strategy architecture
// review — not every workstream gets every category, and most get none at all.
const WORKSTREAMS = [
  { id: "problem-analysis",    label: "Problem Analysis",    question: "What is happening and why?",      color: "#1fbf9f", endpoint: "/api/workspace/analyze",       artifactType: "problem_analysis",    suggestedAfter: [],                           contextTypes: [],                                                     methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: [] as string[], baFindingsNoun: "" },
  { id: "stakeholder-analysis",label: "Stakeholder Analysis",question: "Who influences success?",          color: "#facc15", endpoint: "/api/workspace/stakeholders",  artifactType: "stakeholder_analysis", suggestedAfter: ["problem_analysis"],         contextTypes: ["problem_analysis"],                                   methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: [] as string[], baFindingsNoun: "" },
  { id: "requirements",        label: "Requirements",        question: "What must change?",                color: "#34d399", endpoint: "/api/workspace/requirements",  artifactType: "requirements",         suggestedAfter: ["problem_analysis","stakeholder_analysis"], contextTypes: ["problem_analysis","stakeholder_analysis","decision_lab_output"], methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: ["requirement","business_rule","unresolved_question","contradiction","edge_case"] as string[], baFindingsNoun: "validated finding" },
  { id: "process-analysis",    label: "Process Analysis",    question: "How does work flow today?",        color: "#38bdf8", endpoint: "/api/workspace/process",       artifactType: "process_map",          suggestedAfter: ["problem_analysis"],         contextTypes: ["problem_analysis"],                                   methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: ["business_rule","edge_case"] as string[], baFindingsNoun: "process-relevant finding" },
  { id: "user-stories",        label: "User Stories",        question: "What does the team build?",        color: "#a78bfa", endpoint: "/api/workspace/user-stories",  artifactType: "user_stories",         suggestedAfter: ["requirements"],             contextTypes: ["requirements"],                                       methodologies: ["agile","safe","hybrid"], baIntelligenceCategories: [] as string[], baFindingsNoun: "" },
  { id: "business-case",       label: "Business Case",       question: "Why does this justify investment?",color: "#fb923c", endpoint: "/api/workspace/documents",     artifactType: "brd",                  suggestedAfter: ["problem_analysis","requirements"], contextTypes: ["problem_analysis","stakeholder_analysis","requirements"],                                   methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: [] as string[], baFindingsNoun: "" },
  { id: "testing",             label: "Testing",             question: "How do we know it works?",         color: "#f87171", endpoint: "/api/workspace/testing",       artifactType: "test_case",            suggestedAfter: ["requirements","user_stories"], contextTypes: ["requirements","user_stories"],                        methodologies: ["agile","waterfall","hybrid","safe","babok"], baIntelligenceCategories: ["edge_case"] as string[], baFindingsNoun: "validated edge case" },
] as const;

type WorkstreamId = typeof WORKSTREAMS[number]["id"];
type Workstream = typeof WORKSTREAMS[number];

// ── Constants ─────────────────────────────────────────────────────────────────
const METHODOLOGY_LABEL: Record<string, string> = { agile:"Agile", waterfall:"Waterfall", hybrid:"Hybrid", safe:"SAFe", babok:"BABOK" };
const ARTIFACT_TYPE_LABEL: Record<string, string> = {
  problem_analysis:"Problem Analysis", stakeholder_analysis:"Stakeholder Analysis",
  requirements:"Requirements", process_map:"Process Analysis",
  user_stories:"User Stories", brd:"Business Case", test_case:"Test Cases",
};
const STATUS_COLOR: Record<string, { bg:string; text:string; border:string }> = {
  draft:     { bg:"rgba(251,146,60,.1)",  text:"#fb923c", border:"rgba(251,146,60,.2)" },
  in_review: { bg:"rgba(96,165,250,.1)",  text:"#60a5fa", border:"rgba(96,165,250,.2)" },
  approved:  { bg:"rgba(31,191,159,.1)",  text:"#1fbf9f", border:"rgba(31,191,159,.2)" },
  superseded:{ bg:"rgba(80,80,104,.08)", text:"#505068", border:"rgba(80,80,104,.12)" },
  archived:  { bg:"rgba(80,80,104,.06)", text:"#404058", border:"rgba(80,80,104,.1)" },
};
const DECISION_STATUS_COLOR: Record<string, string> = { open:"#60a5fa", accepted:"#1fbf9f", deferred:"#fb923c", rejected:"#f87171" };

function fmtDate(iso:string){ return new Date(iso).toLocaleDateString("en-GB",{day:"numeric",month:"short"}); }

// Artifact types with a meaningful structured workbook. Everything else only
// ever offers DOCX/TXT — a free-text analysis has no rows and columns to give.
const XLSX_TYPES = new Set(["requirements", "user_stories", "test_case"]);

// Reuses the existing generic markdown export route already proven out in the
// standalone /workspace tool — no new export infrastructure needed.
async function downloadOutput(content: string, title: string, format: "txt" | "docx" | "xlsx", type?: string, projectId?: string) {
  try {
    const res = await fetch("/api/workspace/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, title, format, ...(type ? { type } : {}), ...(projectId ? { projectId } : {}) }),
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

// ── Workstream status logic ────────────────────────────────────────────────────
type WsStatus = "available" | "draft" | "in_review" | "approved";

function getWsStatus(artifactType: string, artifacts: Artifact[]): WsStatus {
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
  { id: "business_rule",       label: "Business Rules",         color: "#38bdf8" },
  { id: "unresolved_question", label: "Unresolved Questions",   color: "#d97706" },
  { id: "contradiction",       label: "Contradictions",         color: "#dc2626" },
  { id: "edge_case",           label: "Possible Edge Cases",    color: "#a78bfa" },
];
const FINDING_CATEGORY_GUIDANCE: Record<string, string> = {
  requirement: "may inform requirement drafting, do not copy directly into a formal requirement",
  business_rule: "treat as a constraint or governing logic on requirements, not a requirement itself",
  unresolved_question: "do not infer or assume an answer, carry into Open Questions if relevant",
  contradiction: "do not silently resolve, surface as an unresolved conflict in Open Questions if relevant",
  edge_case: "use for completeness and acceptance thinking, do not turn into a standalone requirement by itself",
};

function buildContext(ws: Workstream, project: Project, artifacts: Artifact[], findings: Finding[]): { text: string; sourceIds: string[]; findingIds: string[]; sessionIds: string[] } {
  const lines = ["[ESTABLISHED PROJECT CONTEXT]"];
  lines.push(`Project: ${project.name}`);
  if (project.problem_statement) lines.push(`Problem Statement: ${project.problem_statement}`);
  if (project.methodology) lines.push(`Methodology: ${METHODOLOGY_LABEL[project.methodology] ?? project.methodology}`);
  if (project.industry) lines.push(`Industry: ${project.industry}`);
  if (project.country) lines.push(`Country: ${project.country}`);
  if (project.relevant_context) lines.push(`Additional Context: ${project.relevant_context}`);

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
function MdBold({ t }: { t: string }) {
  const parts = t.split(/\*\*([^*]+)\*\*/);
  return <>{parts.map((p,i) => i%2===1 ? <strong key={i} style={{fontWeight:700,color:"var(--lc-text-1)"}}>{p}</strong> : <span key={i}>{p}</span>)}</>;
}
function renderMd(text: string, accent = "#1fbf9f"): React.ReactNode[] {
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
      nodes.push(<ul key={`ul${i}`} style={{margin:"6px 0 12px",paddingLeft:0,listStyle:"none"}}>{items.map((item,ii)=><li key={ii} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}><div style={{width:4,height:4,borderRadius:"50%",background:accent,flexShrink:0,marginTop:8}}/><span style={{fontSize:13,color:"var(--lc-text-2)",lineHeight:1.65}}><MdBold t={item}/></span></li>)}</ul>);
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
            <button onClick={save} disabled={!text.trim()||saving} style={{flex:1,padding:"10px",background:text.trim()?"var(--teal)":"rgba(31,191,159,.3)",border:"none",borderRadius:9,fontSize:13.5,fontWeight:700,color:"#041a13",cursor:text.trim()?"pointer":"not-allowed"}}>{saving?"Saving...":"Save decision"}</button>
            <button onClick={onClose} style={{padding:"10px 18px",background:"none",border:"1px solid var(--lc-border)",borderRadius:9,fontSize:13,color:"var(--lc-text-3)",cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Artifact viewer ────────────────────────────────────────────────────────────
function ArtifactViewer({artifact,projectId,onStatusChange,onClose}:{artifact:Artifact;projectId:string;onStatusChange:(id:string,s:string)=>void;onClose:()=>void}) {
  const sc = STATUS_COLOR[artifact.status] ?? STATUS_COLOR.draft;
  async function changeStatus(s:string) {
    const res = await fetch(`/api/projects/${projectId}/artifacts`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({artifactId:artifact.id,status:s})});
    if (res.ok) onStatusChange(artifact.id,s);
  }
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <header style={{padding:"16px 24px",borderBottom:"1px solid var(--lc-border)",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
        <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:"var(--lc-text-3)",background:"none",border:"none",cursor:"pointer",padding:0}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Back
        </button>
        <div style={{width:1,height:16,background:"var(--lc-border)"}}/>
        <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--lc-text-1)",flex:1}}>
          {ARTIFACT_TYPE_LABEL[artifact.type]??artifact.type} · v{artifact.version}
        </span>
        <span style={{fontFamily:"var(--font-mono)",fontSize:10,padding:"3px 8px",borderRadius:6,background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`}}>{artifact.status.replace("_"," ")}</span>
      </header>
      <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
        <div style={{background:"var(--lc-surface)",border:"1px solid rgba(31,191,159,.1)",borderRadius:"var(--radius)",padding:"22px 24px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,var(--teal),transparent)"}}/>
          {renderMd(artifact.content)}
        </div>
      </div>
      <div style={{padding:"12px 24px",borderTop:"1px solid var(--lc-border)",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",flexShrink:0}}>
        <span style={{fontSize:12,color:"var(--lc-text-3)",marginRight:2}}>Status:</span>
        {["draft","in_review","approved","archived"].map(s=>(
          <button key={s} onClick={()=>changeStatus(s)} style={{padding:"5px 11px",borderRadius:7,border:`1px solid ${artifact.status===s?"rgba(31,191,159,.3)":"var(--lc-border)"}`,background:artifact.status===s?"rgba(31,191,159,.08)":"none",color:artifact.status===s?"var(--teal)":"var(--lc-text-3)",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize" as const}}>{s.replace("_"," ")}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {artifact.type !== "process_diagram" && ([...(["docx","txt"] as const), ...(XLSX_TYPES.has(artifact.type) ? (["xlsx"] as const) : [])]).map(fmt=>(
            <button key={fmt} onClick={()=>downloadOutput(artifact.content, `${ARTIFACT_TYPE_LABEL[artifact.type]??artifact.type} v${artifact.version}`, fmt, artifact.type, projectId)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"none",border:"1px solid var(--lc-border)",borderRadius:8,fontSize:12,color:"var(--lc-text-2)",cursor:"pointer"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> .{fmt}
            </button>
          ))}
          <button style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"none",border:"1px solid var(--lc-border)",borderRadius:8,fontSize:12,color:"var(--lc-text-2)",cursor:"pointer"}} onClick={()=>navigator.clipboard?.writeText(artifact.content)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RTM panel ────────────────────────────────────────────────────────────────
function RTMPanel({artifacts, onClose}: {artifacts: Artifact[]; onClose: () => void}) {
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
          <div style={{fontSize:13,color:"var(--lc-text-4)",lineHeight:1.6}}>
            No approved Requirements or User Stories yet. Approve one, then generate Test Cases, to see traceability here.
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
                    <td style={{padding:"8px 13px",color:r.coveredBy.length ? "var(--teal)" : "#f87171"}}>
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
function WorkstreamSession({ws, project, artifacts, findings, onBack, onArtifactSaved, onDecisionLog, panelOpen, onTogglePanel}: {
  ws: Workstream; project: Project; artifacts: Artifact[]; findings: Finding[];
  onBack: ()=>void; onArtifactSaved:(a:Artifact)=>void; onDecisionLog:(prefill?:string)=>void;
  panelOpen: boolean; onTogglePanel: ()=>void;
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
  const endRef      = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Upstream artifact types this workstream normally builds on that have no
  // approved version yet — surfaced so a user knows why output may be generic.
  const missingContext = (ws.contextTypes as readonly string[]).filter(
    t => !artifacts.some(a => a.type === t && a.status === "approved")
  );

  // This workstream only ever sees the BA Intelligence categories it declares —
  // e.g. Requirements gets all five, Process Analysis only Business Rules and
  // Edge Cases. Every downstream use of "findings" in this component should read
  // from this filtered list, never the full project findings array.
  const relevantFindings = findings.filter(f => (ws.baIntelligenceCategories as readonly string[]).includes(f.category));

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
    const ctx = buildContext(ws, project, artifacts, relevantFindings);
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
        body: JSON.stringify({type:ws.artifactType,title:ARTIFACT_TYPE_LABEL[ws.artifactType]??ws.label,content:finalContent,reasoning_context:{tool:ws.id,methodology:project.methodology,saved_at:new Date().toISOString(),...((ws.baIntelligenceCategories as readonly string[]).length>0?{context_finding_ids:findingIds,context_session_ids:sessionIds}:{})},status:"draft",source_artifact_ids:sourceIds}),
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

    const ctx = buildContext(ws, project, artifacts, relevantFindings);
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

    const ctx = buildContext(ws, project, artifacts, relevantFindings);
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

  if (viewMode === "document" && analysisContent) {
    return (
      <DocumentViewer
        content={analysisContent}
        title={ws.label}
        accentColor={ws.color}
        onBack={() => setViewMode("chat")}
        onCopy={() => navigator.clipboard?.writeText(analysisContent)}
        onDownload={(fmt) => downloadOutput(analysisContent, ws.label, fmt, ws.artifactType, project.id)}
        downloadFormats={XLSX_TYPES.has(ws.artifactType) ? ["docx","txt","xlsx"] : ["docx","txt"]}
      />
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <header style={{padding:"14px 22px",borderBottom:"1px solid var(--lc-border)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:"var(--lc-text-3)",background:"none",border:"none",cursor:"pointer",padding:0}} onMouseEnter={e=>e.currentTarget.style.color="var(--lc-text-2)"} onMouseLeave={e=>e.currentTarget.style.color="var(--lc-text-3)"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Workstreams
        </button>
        <div style={{width:1,height:14,background:"var(--lc-border)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:ws.color,animation:"pulse-dot 1.8s ease-in-out infinite"}}/>
          <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--lc-text-1)"}}>{ws.label}</span>
          <span style={{fontSize:12,color:"var(--lc-text-4)"}}>— {ws.question}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",background:"rgba(31,191,159,.07)",border:"1px solid rgba(31,191,159,.15)",borderRadius:6,fontSize:11,color:"var(--teal)",fontFamily:"var(--font-mono)"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"var(--teal)"}}/>
          Context active
        </div>
        {relevantFindings.length > 0 && (
          <button onClick={()=>setShowFindings(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.18)",borderRadius:6,fontSize:11,color:"#6366f1",fontFamily:"var(--font-mono)",cursor:"pointer"}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#6366f1"}}/>
            BA Intelligence ({relevantFindings.length})
          </button>
        )}
        <button onClick={onTogglePanel} title={panelOpen ? "Hide project panel" : "Show project panel"}
          style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,background:"none",border:"1px solid var(--lc-border)",cursor:"pointer",fontSize:11,fontWeight:600,color:"var(--lc-text-3)",transition:"color .15s,border-color .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.color="var(--lc-text-2)";e.currentTarget.style.borderColor="rgba(0,0,0,.12)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="var(--lc-text-3)";e.currentTarget.style.borderColor="var(--lc-border)";}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {panelOpen
              ? <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></>
              : <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><path d="M14 9l3 3-3 3"/></>
            }
          </svg>
          {panelOpen ? "Hide panel" : "Show panel"}
        </button>
      </header>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 22px"}}>
        {messages.length === 0 && (
          <div style={{textAlign:"center",paddingTop:40,maxWidth:500,margin:"0 auto"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:`${ws.color}14`,border:`1px solid ${ws.color}28`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontFamily:"var(--font-mono)",fontSize:11,fontWeight:800,color:ws.color}}>BA</div>
            <h2 style={{fontFamily:"var(--font-display)",fontSize:19,fontWeight:800,color:"var(--lc-text-1)",letterSpacing:"-0.02em",marginBottom:8}}>{ws.label}</h2>
            <div style={{padding:"9px 12px",background:"rgba(31,191,159,.05)",border:"1px solid rgba(31,191,159,.12)",borderRadius:9,fontSize:12,color:"var(--teal)",marginBottom:missingContext.length?8:14,textAlign:"left",lineHeight:1.6}}>
              <strong>Context loaded:</strong> {project.problem_statement
                ? `"${project.problem_statement.slice(0,100)}${project.problem_statement.length>100?"...":""}"`
                : project.name}
            </div>
            {missingContext.length > 0 && (
              <div style={{padding:"9px 12px",background:"rgba(251,146,60,.06)",border:"1px solid rgba(251,146,60,.18)",borderRadius:9,fontSize:12,color:"#fb923c",marginBottom:14,textAlign:"left",lineHeight:1.6}}>
                <strong>No approved {missingContext.map(t=>CONTEXT_TYPE_LABEL[t]??t).join(" or ")} yet.</strong> This workstream normally builds on it — you can continue anyway, or go approve it first for a stronger result.
              </div>
            )}
            {relevantFindings.length > 0 && (
              <div style={{padding:"9px 12px",background:"rgba(99,102,241,.05)",border:"1px solid rgba(99,102,241,.15)",borderRadius:9,fontSize:12,color:"#6366f1",marginBottom:14,textAlign:"left",lineHeight:1.6,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <span><strong>BA Intelligence:</strong> {relevantFindings.length} {ws.baFindingsNoun}{relevantFindings.length===1?"":"s"} available.</span>
                <button onClick={()=>setShowFindings(true)} style={{fontSize:11.5,fontWeight:700,color:"#6366f1",background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0}}>View</button>
              </div>
            )}
            <p style={{fontSize:13,color:"var(--lc-text-3)",lineHeight:1.65}}>Your project context is active. Describe what you need and this workstream will use it automatically.</p>
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
                    <button onClick={submitEdit} disabled={!editText.trim()||loading} style={{padding:"6px 14px",background:editText.trim()?ws.color:"rgba(0,0,0,.08)",border:"none",borderRadius:7,fontSize:12.5,fontWeight:700,color:editText.trim()?"#041a13":"var(--lc-text-4)",cursor:editText.trim()?"pointer":"not-allowed"}}>Re-run</button>
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
              <div style={{background:"var(--lc-surface)",border:"1px solid rgba(251,146,60,.35)",borderRadius:"var(--radius)",padding:"24px 28px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#fb923c,transparent)"}}/>
                {renderMd(msg.content, ws.color)}
              </div>
              <div style={{marginTop:10,padding:"11px 14px",background:"rgba(251,146,60,.08)",border:"1px solid rgba(251,146,60,.25)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:7,fontSize:12.5,color:"#c2680a",fontWeight:600,lineHeight:1.5}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Generation stopped before finishing — it reached the model&apos;s output limit. This is not a complete deliverable and has not been saved.
                </span>
                <button onClick={()=>continueGeneration(i)} disabled={loading}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"#fb923c",border:"none",cursor:loading?"not-allowed":"pointer",fontSize:12.5,fontWeight:700,color:"#3a1d02",flexShrink:0}}>
                  {loading ? "Continuing..." : "Continue generation"}
                </button>
              </div>
            </div>
          );

          if (isStructured) return (
            <div key={i} style={{marginBottom:16}}>
              <div style={{background:"var(--lc-surface)",border:`1px solid ${ws.color}18`,borderRadius:"var(--radius)",padding:"24px 28px",position:"relative",overflow:"hidden"}}>
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

      {/* Clear end state */}
      {hasAnalysis && (
        <div style={{padding:"12px 22px",borderTop:"1px solid rgba(0,0,0,.06)",background:"rgba(31,191,159,.03)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{fontFamily:"var(--font-display)",fontSize:13,fontWeight:700,color:"var(--lc-text-1)"}}>Analysis complete</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setViewMode("document")}
              style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,background:ws.color,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,color:"#041a13"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              View as document
            </button>
            {saveStatus === "saving" && (
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"var(--lc-faint)",border:"1px solid var(--lc-border)",fontSize:12.5,color:"var(--lc-text-3)"}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg>
                Saving...
              </div>
            )}
            {saveStatus === "saved" && (
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"rgba(31,191,159,.08)",border:"1px solid rgba(31,191,159,.2)",fontSize:12.5,fontWeight:600,color:"var(--teal)"}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Saved to project
              </div>
            )}
            {saveStatus === "error" && (
              <button onClick={()=>saveArtifact()} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",fontSize:12.5,fontWeight:600,color:"#f87171",cursor:"pointer"}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Save failed — retry
              </button>
            )}
            <button onClick={()=>onDecisionLog()} style={{padding:"7px 12px",borderRadius:8,background:"none",border:"1px solid rgba(96,165,250,.25)",color:"#60a5fa",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Log decision
            </button>
            <button onClick={()=>navigator.clipboard?.writeText(analysisContent)} style={{padding:"7px 12px",borderRadius:8,background:"none",border:"1px solid var(--lc-border)",color:"var(--lc-text-3)",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Input — always open */}
      <div style={{padding:"12px 22px 18px",borderTop:"1px solid var(--lc-border)",flexShrink:0}}>
        <div style={{background:"var(--lc-faint)",border:"1px solid var(--lc-border)",borderRadius:"var(--radius)",overflow:"hidden",transition:"border-color .2s"}}
          onFocusCapture={e=>e.currentTarget.style.borderColor=`${ws.color}45`}
          onBlurCapture={e=>e.currentTarget.style.borderColor="var(--lc-border)"}
        >
          <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder={hasAnalysis
              ? "Add new context, a stakeholder update, a risk, or any new information..."
              : messages.length===0
                ? "Describe what you need — project context is already loaded."
                : "Continue the conversation..."}
            rows={3}
            style={{width:"100%",background:"none",border:"none",outline:"none",padding:"13px 15px",fontSize:13.5,color:"var(--lc-text-1)",lineHeight:1.65,resize:"none",fontFamily:"var(--font-body)"}}
          />
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 11px",borderTop:"1px solid rgba(0,0,0,.04)"}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--lc-text-4)"}}>
              {hasAnalysis ? "Conversation stays open — keep adding context" : "Enter to send · Shift+Enter for new line"}
            </span>
            <button onClick={send} disabled={!input.trim()||loading}
              style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:7,background:input.trim()&&!loading?ws.color:`${ws.color}20`,border:"none",cursor:input.trim()&&!loading?"pointer":"not-allowed",fontSize:12.5,fontWeight:700,color:input.trim()&&!loading?"#041a13":"var(--lc-text-4)",transition:"all .2s"}}>
              {loading?"Thinking...":"Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Workstreams hub ────────────────────────────────────────────────────────────
function WorkstreamsHub({project, artifacts, onSelectWs}: {project:Project; artifacts:Artifact[]; onSelectWs:(ws:Workstream)=>void}) {
  const recommended = getRecommended(artifacts, project.methodology);
  const methodology = project.methodology ?? "agile";

  const wsStatusLabel: Record<WsStatus, string> = { available:"Available", draft:"Draft", in_review:"In Review", approved:"Approved" };
  const wsStatusColor: Record<WsStatus, string> = { available:"var(--lc-text-4)", draft:"#fb923c", in_review:"#60a5fa", approved:"#1fbf9f" };

  return (
    <div style={{padding:"28px 24px",overflowY:"auto",height:"100%"}}>
      <h2 style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:800,color:"var(--lc-text-1)",letterSpacing:"-0.02em",marginBottom:4}}>
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
              style={{background:isRec?"rgba(31,191,159,.04)":"var(--lc-surface)",border:`1px solid ${isRec?"rgba(31,191,159,.2)":"var(--lc-border)"}`,borderRadius:"var(--radius)",padding:"16px 18px",cursor:"pointer",transition:"border-color .2s, background .2s",display:"flex",alignItems:"center",gap:14,position:"relative"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=`${ws.color}30`;(e.currentTarget as HTMLDivElement).style.background="var(--lc-faint)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=isRec?"rgba(31,191,159,.2)":"var(--lc-border)";(e.currentTarget as HTMLDivElement).style.background=isRec?"rgba(31,191,159,.04)":"var(--lc-surface)";}}
            >
              <div style={{width:36,height:36,borderRadius:10,background:`${ws.color}12`,border:`1px solid ${ws.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:ws.color}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--lc-text-1)"}}>{ws.label}</div>
                  {isRec && <span style={{fontFamily:"var(--font-mono)",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(31,191,159,.12)",color:"var(--teal)",border:"1px solid rgba(31,191,159,.2)"}}>SUGGESTED</span>}
                  {isAgileSuggested && <span style={{fontFamily:"var(--font-mono)",fontSize:9,color:"var(--lc-text-4)",padding:"2px 6px",borderRadius:4,border:"1px solid var(--lc-border)"}}>Agile only</span>}
                </div>
                <div style={{fontSize:12,color:"var(--lc-text-4)"}}>{ws.question}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:10,fontWeight:600,color:wsStatusColor[status]}}>{wsStatusLabel[status]}</span>
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
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function ProjectWorkspaceClient({user,profile,project,initialArtifacts,initialDecisions,initialFindings}:Props) {
  const router = useRouter();
  const [activeWs, setActiveWs]             = useState<Workstream|null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<Artifact|null>(null);
  const [artifacts, setArtifacts]           = useState<Artifact[]>(initialArtifacts);
  const [decisions, setDecisions]           = useState<Decision[]>(initialDecisions);
  const findings = initialFindings;
  const [decisionModal, setDecisionModal]   = useState<{open:boolean;prefill?:string}>({open:false});
  const [panelOpen, setPanelOpen]           = useState(true);
  const [showRTM, setShowRTM]               = useState(false);

  const handleArtifactSaved = useCallback((a:Artifact) => {
    setArtifacts(prev=>[a,...prev.filter(x=>x.id!==a.id)]);
  },[]);
  const handleDecisionSaved = useCallback((d:Decision) => {
    setDecisions(prev=>[d,...prev]);
  },[]);
  function handleStatusChange(id:string,status:string) {
    setArtifacts(prev=>prev.map(a=>a.id===id?{...a,status}:a));
    setViewingArtifact(prev=>prev?.id===id?{...prev,status}:prev);
  }

  const activeArtifacts = artifacts.filter(a=>a.status!=="superseded"&&a.status!=="archived");

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"var(--lc-bg)"}}>
      <AppSidebar activeHref="/projects" profile={profile} user={user}/>

      {/* Project panel */}
      <aside style={{width:panelOpen?260:0,flexShrink:0,borderRight:panelOpen?"1px solid var(--lc-border)":"none",display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--lc-surface)",transition:"width 240ms ease"}}>

        <div style={{padding:"14px 14px 12px",borderBottom:"1px solid var(--lc-border)",flexShrink:0}}>
          <button onClick={()=>router.push("/projects")}
            style={{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:"var(--lc-text-3)",background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:10}} onMouseEnter={e=>e.currentTarget.style.color="var(--lc-text-2)"} onMouseLeave={e=>e.currentTarget.style.color="var(--lc-text-3)"}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> All projects
          </button>
          <h1 style={{fontFamily:"var(--font-display)",fontSize:13.5,fontWeight:800,color:"var(--lc-text-1)",letterSpacing:"-0.01em",lineHeight:1.35,marginBottom:3}}>{project.name}</h1>
          {project.organizations?.name && (
            <div style={{fontSize:11,color:"var(--lc-text-3)",display:"flex",alignItems:"center",gap:3}}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              {project.organizations.name}
            </div>
          )}
        </div>

        {/* Context */}
        <div style={{padding:"12px 14px",borderBottom:"1px solid var(--lc-border)",flexShrink:0}}>
          <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,fontWeight:700,color:"var(--lc-text-4)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Context</div>
          {project.problem_statement && (
            <div style={{fontSize:12,color:"var(--lc-text-2)",lineHeight:1.58,marginBottom:7,padding:"8px 10px",background:"rgba(31,191,159,.04)",border:"1px solid rgba(31,191,159,.1)",borderRadius:8,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical" as never}}>
              {project.problem_statement}
            </div>
          )}
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {project.methodology && <span style={{fontFamily:"var(--font-mono)",fontSize:9.5,padding:"2px 6px",borderRadius:4,background:"rgba(31,191,159,.08)",color:"var(--teal)",border:"1px solid rgba(31,191,159,.15)"}}>{METHODOLOGY_LABEL[project.methodology]??project.methodology}</span>}
            {project.industry && <span style={{fontFamily:"var(--font-mono)",fontSize:9.5,padding:"2px 6px",borderRadius:4,background:"var(--lc-faint)",color:"var(--lc-text-3)",border:"1px solid var(--lc-border)"}}>{project.industry}</span>}
          </div>
        </div>

        {/* Artifacts + Decisions */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 14px 8px"}}>
          <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,fontWeight:700,color:"var(--lc-text-4)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:7}}>
            Artifacts {activeArtifacts.length>0&&<span style={{color:"var(--teal)"}}>({activeArtifacts.length})</span>}
          </div>

          {activeArtifacts.length===0 && <div style={{fontSize:11.5,color:"var(--lc-text-4)",lineHeight:1.6,paddingBottom:8}}>No artifacts yet. Open a workstream to start.</div>}

          {activeArtifacts.map(a=>{
            const sc=STATUS_COLOR[a.status]??STATUS_COLOR.draft;
            return (
              <div key={a.id} onClick={()=>{setViewingArtifact(a);setActiveWs(null);setShowRTM(false);}}
                style={{padding:"8px 9px",borderRadius:8,border:"1px solid transparent",cursor:"pointer",marginBottom:3,transition:"background .15s,border-color .15s",background:viewingArtifact?.id===a.id?"rgba(31,191,159,.06)":"none"}}
                onMouseEnter={e=>{if(viewingArtifact?.id!==a.id){(e.currentTarget as HTMLDivElement).style.background="var(--lc-faint)";(e.currentTarget as HTMLDivElement).style.borderColor="var(--lc-border)";}}}
                onMouseLeave={e=>{if(viewingArtifact?.id!==a.id){(e.currentTarget as HTMLDivElement).style.background="none";(e.currentTarget as HTMLDivElement).style.borderColor="transparent";}}}
              >
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--lc-text-1)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ARTIFACT_TYPE_LABEL[a.type]??a.type}</div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:8.5,padding:"1px 5px",borderRadius:3,background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`,flexShrink:0}}>{a.status}</span>
                </div>
                <div style={{fontSize:10.5,color:"var(--lc-text-4)"}}>v{a.version} · {fmtDate(a.created_at)}</div>
              </div>
            );
          })}

          <div style={{height:1,background:"var(--lc-border)",margin:"12px 0 10px"}}/>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,fontWeight:700,color:"var(--lc-text-4)",letterSpacing:".1em",textTransform:"uppercase"}}>
              Decisions {decisions.length>0&&<span style={{color:"#60a5fa"}}>({decisions.length})</span>}
            </div>
            <button onClick={()=>setDecisionModal({open:true})}
              style={{display:"flex",alignItems:"center",gap:2,fontSize:10.5,color:"var(--lc-text-3)",background:"none",border:"1px solid var(--lc-border)",borderRadius:5,padding:"2px 7px",cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.color="var(--lc-text-2)";e.currentTarget.style.borderColor="rgba(0,0,0,.12)";}} onMouseLeave={e=>{e.currentTarget.style.color="var(--lc-text-3)";e.currentTarget.style.borderColor="var(--lc-border)";}}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
            </button>
          </div>

          {decisions.length===0 && <div style={{fontSize:11.5,color:"var(--lc-text-4)",lineHeight:1.6,paddingBottom:10}}>Log decisions here so nothing gets forgotten.</div>}

          {decisions.map(d=>{
            const dc=DECISION_STATUS_COLOR[d.status]??"var(--lc-text-3)";
            return (
              <div key={d.id} style={{padding:"7px 9px",borderRadius:7,background:"var(--lc-faint)",border:"1px solid var(--lc-border)",marginBottom:5}}>
                <div style={{fontSize:11.5,color:"var(--lc-text-1)",lineHeight:1.5,marginBottom:3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as never}}>{d.decision_text}</div>
                <div style={{display:"flex",alignItems:"center",gap:7,fontSize:10.5}}>
                  <span style={{color:dc,fontWeight:600,textTransform:"capitalize" as const}}>{d.status}</span>
                  {d.made_by&&<span style={{color:"var(--lc-text-4)"}}>{d.made_by}</span>}
                  <span style={{color:"var(--lc-text-4)",marginLeft:"auto"}}>{d.decision_date?fmtDate(d.decision_date):fmtDate(d.created_at)}</span>
                </div>
              </div>
            );
          })}

          <div style={{height:1,background:"var(--lc-border)",margin:"12px 0 10px"}}/>

          <button onClick={()=>{setShowRTM(true);setViewingArtifact(null);setActiveWs(null);}}
            style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"8px 9px",borderRadius:8,background:showRTM?"rgba(31,191,159,.06)":"none",border:"1px solid var(--lc-border)",color:showRTM?"var(--teal)":"var(--lc-text-2)",fontSize:11.5,fontWeight:600,cursor:"pointer",textAlign:"left" as const}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 17H7a2 2 0 01-2-2V5a2 2 0 012-2h6l4 4v8a2 2 0 01-2 2h-2M9 12h6M9 16h3"/></svg>
            Traceability (RTM)
          </button>

          <div style={{height:1,background:"var(--lc-border)",margin:"12px 0 10px"}}/>

          <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,fontWeight:700,color:"var(--lc-text-4)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:7}}>
            Analysis Tools
          </div>
          <button onClick={()=>router.push(`/decision-lab?project=${project.id}`)}
            style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"8px 9px",borderRadius:8,background:"none",border:"1px solid var(--lc-border)",color:"var(--lc-text-2)",fontSize:11.5,fontWeight:600,cursor:"pointer",textAlign:"left" as const,marginBottom:6}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9.5 2a5.5 5.5 0 00-3.3 9.9c.5.4.8 1 .8 1.6v.5a1 1 0 001 1h4a1 1 0 001-1v-.5c0-.6.3-1.2.8-1.6A5.5 5.5 0 009.5 2z"/><line x1="8" y1="19" x2="11" y2="19"/></svg>
            Decision Lab
          </button>
          <button onClick={()=>router.push(`/ba-intelligence?project=${project.id}`)}
            style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"8px 9px",borderRadius:8,background:"none",border:"1px solid var(--lc-border)",color:"var(--lc-text-2)",fontSize:11.5,fontWeight:600,cursor:"pointer",textAlign:"left" as const}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            BA Intelligence
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {showRTM ? (
          <RTMPanel artifacts={artifacts} onClose={()=>setShowRTM(false)}/>
        ) : viewingArtifact ? (
          <ArtifactViewer artifact={viewingArtifact} projectId={project.id} onStatusChange={handleStatusChange} onClose={()=>setViewingArtifact(null)}/>
        ) : activeWs ? (
          <WorkstreamSession
            ws={activeWs} project={project} artifacts={artifacts} findings={findings}
            onBack={()=>{setActiveWs(null);setPanelOpen(true);}}
            onArtifactSaved={handleArtifactSaved}
            onDecisionLog={(prefill)=>setDecisionModal({open:true,prefill})}
            panelOpen={panelOpen}
            onTogglePanel={()=>setPanelOpen(v=>!v)}
          />
        ) : (
          <WorkstreamsHub project={project} artifacts={artifacts} onSelectWs={(ws)=>{setActiveWs(ws);setViewingArtifact(null);setShowRTM(false);setPanelOpen(false);}}/>
        )}
      </main>

      {decisionModal.open && (
        <AddDecisionModal projectId={project.id} onSaved={handleDecisionSaved} onClose={()=>setDecisionModal({open:false})} prefill={decisionModal.prefill}/>
      )}

      <style>{`
        .msg-group:hover .msg-actions { display: flex !important; }
        @keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(31,191,159,.22);}50%{opacity:.7;box-shadow:0 0 0 6px transparent;} }
        @keyframes typing-dot { 0%,80%,100%{transform:scale(.6);opacity:.3;}40%{transform:scale(1);opacity:1;} }
      `}</style>
    </div>
  );
}
