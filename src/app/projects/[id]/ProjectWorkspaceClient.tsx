"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import DocumentViewer from "@/components/DocumentViewer";

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
interface Message { role: "user" | "assistant"; content: string; }
interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  project: Project;
  initialArtifacts: Artifact[];
  initialDecisions: Decision[];
}

// ── Workstream definitions ─────────────────────────────────────────────────────
const WORKSTREAMS = [
  { id: "problem-analysis",    label: "Problem Analysis",    question: "What is happening and why?",      color: "#1fbf9f", endpoint: "/api/workspace/analyze",       artifactType: "problem_analysis",    suggestedAfter: [],                           methodologies: ["agile","waterfall","hybrid","safe","babok"] },
  { id: "stakeholder-analysis",label: "Stakeholder Analysis",question: "Who influences success?",          color: "#facc15", endpoint: "/api/workspace/stakeholders",  artifactType: "stakeholder_analysis", suggestedAfter: ["problem_analysis"],         methodologies: ["agile","waterfall","hybrid","safe","babok"] },
  { id: "requirements",        label: "Requirements",        question: "What must change?",                color: "#34d399", endpoint: "/api/workspace/requirements",  artifactType: "requirements",         suggestedAfter: ["problem_analysis"],         methodologies: ["agile","waterfall","hybrid","safe","babok"] },
  { id: "process-analysis",    label: "Process Analysis",    question: "How does work flow today?",        color: "#38bdf8", endpoint: "/api/workspace/process",       artifactType: "process_map",          suggestedAfter: ["problem_analysis"],         methodologies: ["agile","waterfall","hybrid","safe","babok"] },
  { id: "user-stories",        label: "User Stories",        question: "What does the team build?",        color: "#a78bfa", endpoint: "/api/workspace/user-stories",  artifactType: "user_stories",         suggestedAfter: ["requirements"],             methodologies: ["agile","safe","hybrid"] },
  { id: "business-case",       label: "Business Case",       question: "Why does this justify investment?",color: "#fb923c", endpoint: "/api/workspace/documents",     artifactType: "brd",                  suggestedAfter: ["problem_analysis","requirements"], methodologies: ["agile","waterfall","hybrid","safe","babok"] },
] as const;

type WorkstreamId = typeof WORKSTREAMS[number]["id"];
type Workstream = typeof WORKSTREAMS[number];

// ── Constants ─────────────────────────────────────────────────────────────────
const METHODOLOGY_LABEL: Record<string, string> = { agile:"Agile", waterfall:"Waterfall", hybrid:"Hybrid", safe:"SAFe", babok:"BABOK" };
const ARTIFACT_TYPE_LABEL: Record<string, string> = {
  problem_analysis:"Problem Analysis", stakeholder_analysis:"Stakeholder Analysis",
  requirements:"Requirements", process_map:"Process Analysis",
  user_stories:"User Stories", brd:"Business Case",
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
  return false;
}

// ── Project context builder ────────────────────────────────────────────────────
function buildContext(project: Project, artifacts: Artifact[]): string {
  const lines = ["[PROJECT CONTEXT]"];
  lines.push(`Project: ${project.name}`);
  if (project.problem_statement) lines.push(`Problem Statement: ${project.problem_statement}`);
  if (project.methodology) lines.push(`Methodology: ${METHODOLOGY_LABEL[project.methodology] ?? project.methodology}`);
  if (project.industry) lines.push(`Industry: ${project.industry}`);
  if (project.country) lines.push(`Country: ${project.country}`);
  if (project.relevant_context) lines.push(`Additional Context: ${project.relevant_context}`);
  const pa = artifacts.find(a => a.type === "problem_analysis" && a.status !== "superseded" && a.status !== "archived");
  if (pa) lines.push(`\nApproved Problem Analysis:\n${pa.content.slice(0, 1200)}${pa.content.length > 1200 ? "..." : ""}`);
  lines.push("\n[USER INPUT]");
  return lines.join("\n");
}

// ── Markdown + table renderer ─────────────────────────────────────────────────
function parseMdTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const dataLines = lines.filter(l => !l.includes("---"));
  if (dataLines.length < 2) return null;
  const parse = (l: string) => l.split("|").map(c => c.trim().replace(/\*\*/g, "")).filter((_,ix,a) => ix > 0 && ix < a.length - 1);
  return { headers: parse(dataLines[0]), rows: dataLines.slice(1).map(parse) };
}
function MdBold({ t }: { t: string }) {
  const parts = t.split(/\*\*([^*]+)\*\*/);
  return <>{parts.map((p,i) => i%2===1 ? <strong key={i} style={{fontWeight:700,color:"var(--t1)"}}>{p}</strong> : <span key={i}>{p}</span>)}</>;
}
function renderMd(text: string, accent = "#1fbf9f"): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { nodes.push(<div key={`s${i}`} style={{height:5}}/>); i++; continue; }
    if (t.startsWith("# "))   { nodes.push(<h2 key={i} style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:800,color:"var(--t1)",margin:"4px 0 12px",letterSpacing:"-0.02em"}}>{t.slice(2).replace(/\*\*/g,"")}</h2>); i++; continue; }
    if (t.startsWith("## "))  { nodes.push(<h3 key={i} style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:accent,margin:"22px 0 8px",paddingBottom:5,borderBottom:`1px solid ${accent}22`}}>{t.slice(3).replace(/\*\*/g,"")}</h3>); i++; continue; }
    if (t.startsWith("### ")) { nodes.push(<h4 key={i} style={{fontFamily:"var(--font-display)",fontSize:13,fontWeight:700,color:"var(--t1)",margin:"14px 0 5px"}}>{t.slice(4).replace(/\*\*/g,"")}</h4>); i++; continue; }
    if (t === "---") { nodes.push(<div key={i} style={{height:1,background:"var(--border)",margin:"14px 0"}}/>); i++; continue; }
    if (t.startsWith("|") && lines[i+1]?.includes("---")) {
      const tLines: string[] = [];
      while (i < lines.length && lines[i]?.trim().startsWith("|")) { tLines.push(lines[i].trim()); i++; }
      const tbl = parseMdTable(tLines);
      if (tbl) nodes.push(
        <div key={`tbl${i}`} style={{overflowX:"auto",margin:"10px 0 18px",borderRadius:8,border:`1px solid ${accent}18`,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
            <thead><tr>{tbl.headers.map((h,hi)=><th key={hi} style={{textAlign:"left",padding:"9px 13px",background:`${accent}10`,borderBottom:`2px solid ${accent}28`,fontWeight:700,color:"var(--t1)",fontSize:11.5,fontFamily:"var(--font-display)",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{tbl.rows.map((row,ri)=><tr key={ri} style={{background:ri%2===0?"rgba(255,255,255,.02)":"transparent"}}>{tbl.headers.map((_,ci)=><td key={ci} style={{padding:"8px 13px",borderBottom:"1px solid rgba(255,255,255,.04)",color:"var(--t2)",lineHeight:1.6,verticalAlign:"top",fontSize:12.5}}><MdBold t={row[ci]??""}/></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i]?.trim().startsWith("- ") || lines[i]?.trim().startsWith("* "))) { items.push(lines[i].trim().slice(2)); i++; }
      nodes.push(<ul key={`ul${i}`} style={{margin:"6px 0 12px",paddingLeft:0,listStyle:"none"}}>{items.map((item,ii)=><li key={ii} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}><div style={{width:4,height:4,borderRadius:"50%",background:accent,flexShrink:0,marginTop:8}}/><span style={{fontSize:13,color:"var(--t2)",lineHeight:1.65}}><MdBold t={item}/></span></li>)}</ul>);
      continue;
    }
    if (t.startsWith("**") && t.endsWith("**") && !t.slice(2,-2).includes("**")) { nodes.push(<p key={i} style={{fontSize:13,fontWeight:700,color:"var(--t1)",margin:"10px 0 4px",fontFamily:"var(--font-display)"}}>{t.slice(2,-2)}</p>); i++; continue; }
    nodes.push(<p key={i} style={{fontSize:13,color:"var(--t2)",lineHeight:1.72,margin:"0 0 7px"}}><MdBold t={t}/></p>);
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

  const inp = {background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:9,padding:"9px 12px",fontSize:13,color:"var(--t1)",outline:"none",width:"100%",fontFamily:"var(--font-body)"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:24}}>
      <div style={{background:"var(--bg-1)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"28px",width:"100%",maxWidth:480}}>
        <h3 style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:700,color:"var(--t1)",marginBottom:20}}>Log a decision</h3>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><div style={{fontSize:12,fontWeight:600,color:"var(--t3)",marginBottom:5}}>Decision *</div><textarea value={text} onChange={e=>setText(e.target.value)} rows={2} style={{...inp,resize:"none"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><div style={{fontSize:12,fontWeight:600,color:"var(--t3)",marginBottom:5}}>Made by</div><input value={madeBy} onChange={e=>setMadeBy(e.target.value)} placeholder="Stakeholder name" style={inp}/></div>
            <div><div style={{fontSize:12,fontWeight:600,color:"var(--t3)",marginBottom:5}}>Status</div><select value={status} onChange={e=>setStatus(e.target.value)} style={{...inp,cursor:"pointer"}}><option value="open">Open</option><option value="accepted">Accepted</option><option value="deferred">Deferred</option><option value="rejected">Rejected</option></select></div>
          </div>
          <div><div style={{fontSize:12,fontWeight:600,color:"var(--t3)",marginBottom:5}}>Impact / Artifacts affected</div><input value={impact} onChange={e=>setImpact(e.target.value)} placeholder="e.g. Affects Requirements and User Stories" style={inp}/></div>
          <div style={{display:"flex",gap:10,paddingTop:4}}>
            <button onClick={save} disabled={!text.trim()||saving} style={{flex:1,padding:"10px",background:text.trim()?"var(--teal)":"rgba(31,191,159,.3)",border:"none",borderRadius:9,fontSize:13.5,fontWeight:700,color:"#041a13",cursor:text.trim()?"pointer":"not-allowed"}}>{saving?"Saving...":"Save decision"}</button>
            <button onClick={onClose} style={{padding:"10px 18px",background:"none",border:"1px solid var(--border)",borderRadius:9,fontSize:13,color:"var(--t3)",cursor:"pointer"}}>Cancel</button>
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
      <header style={{padding:"16px 24px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
        <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:"var(--t3)",background:"none",border:"none",cursor:"pointer",padding:0}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Back
        </button>
        <div style={{width:1,height:16,background:"var(--border)"}}/>
        <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--t1)",flex:1}}>
          {ARTIFACT_TYPE_LABEL[artifact.type]??artifact.type} · v{artifact.version}
        </span>
        <span style={{fontFamily:"var(--font-mono)",fontSize:10,padding:"3px 8px",borderRadius:6,background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`}}>{artifact.status.replace("_"," ")}</span>
      </header>
      <div style={{flex:1,overflowY:"auto",padding:"24px"}}>
        <div style={{background:"var(--bg-1)",border:"1px solid rgba(31,191,159,.1)",borderRadius:"var(--radius)",padding:"22px 24px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,var(--teal),transparent)"}}/>
          {renderMd(artifact.content)}
        </div>
      </div>
      <div style={{padding:"12px 24px",borderTop:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",flexShrink:0}}>
        <span style={{fontSize:12,color:"var(--t3)",marginRight:2}}>Status:</span>
        {["draft","in_review","approved","archived"].map(s=>(
          <button key={s} onClick={()=>changeStatus(s)} style={{padding:"5px 11px",borderRadius:7,border:`1px solid ${artifact.status===s?"rgba(31,191,159,.3)":"var(--border)"}`,background:artifact.status===s?"rgba(31,191,159,.08)":"none",color:artifact.status===s?"var(--teal)":"var(--t3)",fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize" as const}}>{s.replace("_"," ")}</button>
        ))}
        <button style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"none",border:"1px solid var(--border)",borderRadius:8,fontSize:12,color:"var(--t2)",cursor:"pointer"}} onClick={()=>navigator.clipboard?.writeText(artifact.content)}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy
        </button>
      </div>
    </div>
  );
}

// ── Workstream session ─────────────────────────────────────────────────────────
function WorkstreamSession({ws, project, artifacts, onBack, onArtifactSaved, onDecisionLog, panelOpen, onTogglePanel}: {
  ws: Workstream; project: Project; artifacts: Artifact[];
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
  const endRef      = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved conversation
  useEffect(() => {
    async function loadConversation() {
      try {
        const res = await fetch(`/api/projects/${project.id}/conversations?type=${ws.artifactType}`);
        const data = await res.json();
        if (res.ok && data.conversations?.[0]?.messages?.length) {
          const msgs: Message[] = data.conversations[0].messages;
          setMessages(msgs);
          const hasA = msgs.some(m => m.role === "assistant" && isAnalysisDone(ws.id, m.content));
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

  async function persistConversation(msgs: Message[]) {
    try {
      await fetch(`/api/projects/${project.id}/conversations`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({workstream_type: ws.artifactType, messages: msgs}),
      });
    } catch { /* non-critical */ }
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const displayMessages: Message[] = [...messages, {role:"user",content:trimmed}];
    setMessages(displayMessages);
    setInput("");
    setLoading(true);

    const apiMessages: Message[] = messages.length === 0
      ? [{role:"user", content:`${buildContext(project, artifacts)}\n${trimmed}`}, ...displayMessages.slice(1)]
      : displayMessages;

    try {
      const body: Record<string,unknown> = {messages: apiMessages};
      if (ws.id === "business-case") body.docType = "brd";
      const res  = await fetch(ws.endpoint, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      const reply = data.response ?? "Something went wrong. Please try again.";
      const updated = [...displayMessages, {role:"assistant" as const, content:reply}];
      setMessages(updated);
      if (isAnalysisDone(ws.id, reply)) {
        setHasAnalysis(true);
        saveArtifact(reply);
      }
      persistConversation(updated);
    } catch {
      setMessages(prev=>[...prev,{role:"assistant",content:"Something went wrong. Please try again."}]);
    } finally {
      setLoading(false);
    }
  }

  async function saveArtifact(directContent?: string) {
    if (saveStatus === "saving") return;
    const finalContent = directContent ?? [...messages].reverse().find(m=>m.role==="assistant"&&isAnalysisDone(ws.id,m.content))?.content;
    if (!finalContent) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/projects/${project.id}/artifacts`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({type:ws.artifactType,title:ARTIFACT_TYPE_LABEL[ws.artifactType]??ws.label,content:finalContent,reasoning_context:{tool:ws.id,methodology:project.methodology,saved_at:new Date().toISOString()},status:"draft"}),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("saved");
        onArtifactSaved(data.artifact);
        fetch(`/api/projects/${project.id}/conversations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workstream_type:ws.artifactType,messages,artifact_id:data.artifact.id})});
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
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

    const apiMessages: Message[] = editingIdx === 0
      ? [{role:"user", content:`${buildContext(project, artifacts)}\n${editText.trim()}`}, ...displayMessages.slice(1)]
      : displayMessages;

    try {
      const body: Record<string,unknown> = {messages: apiMessages};
      if (ws.id === "business-case") body.docType = "brd";
      const res  = await fetch(ws.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      const reply = data.response ?? "Something went wrong.";
      const updated = [...displayMessages,{role:"assistant" as const,content:reply}];
      setMessages(updated);
      if (isAnalysisDone(ws.id,reply)) { setHasAnalysis(true); saveArtifact(reply); }
      persistConversation(updated);
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

    const apiMessages: Message[] = idx === 0
      ? [{role:"user", content:`${buildContext(project, artifacts)}\n${truncated[0].content}`}, ...truncated.slice(1)]
      : truncated;

    try {
      const body: Record<string,unknown> = {messages: apiMessages};
      if (ws.id === "business-case") body.docType = "brd";
      const res  = await fetch(ws.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      const reply = data.response ?? "Something went wrong.";
      const updated = [...truncated,{role:"assistant" as const,content:reply}];
      setMessages(updated);
      if (isAnalysisDone(ws.id,reply)) { setHasAnalysis(true); saveArtifact(reply); }
      persistConversation(updated);
    } catch {
      setMessages(prev=>[...prev,{role:"assistant",content:"Something went wrong."}]);
    } finally {
      setLoading(false);
    }
  }

  if (loadingHistory) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
        <div style={{fontSize:13,color:"var(--t4)"}}>Loading conversation...</div>
      </div>
    );
  }

  const analysisContent = messages.filter(m => m.role === "assistant" && isAnalysisDone(ws.id, m.content)).map(m => m.content).join("\n\n---\n\n");

  if (viewMode === "document" && analysisContent) {
    return (
      <DocumentViewer
        content={analysisContent}
        title={ws.label}
        accentColor={ws.color}
        onBack={() => setViewMode("chat")}
        onCopy={() => navigator.clipboard?.writeText(analysisContent)}
      />
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <header style={{padding:"14px 22px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:"var(--t3)",background:"none",border:"none",cursor:"pointer",padding:0}} onMouseEnter={e=>e.currentTarget.style.color="var(--t2)"} onMouseLeave={e=>e.currentTarget.style.color="var(--t3)"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Workstreams
        </button>
        <div style={{width:1,height:14,background:"var(--border)"}}/>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:ws.color,animation:"pulse-dot 1.8s ease-in-out infinite"}}/>
          <span style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--t1)"}}>{ws.label}</span>
          <span style={{fontSize:12,color:"var(--t4)"}}>— {ws.question}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",background:"rgba(31,191,159,.07)",border:"1px solid rgba(31,191,159,.15)",borderRadius:6,fontSize:11,color:"var(--teal)",fontFamily:"var(--font-mono)"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"var(--teal)"}}/>
          Context active
        </div>
        <button onClick={onTogglePanel} title={panelOpen ? "Hide project panel" : "Show project panel"}
          style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,background:"none",border:"1px solid var(--border)",cursor:"pointer",fontSize:11,fontWeight:600,color:"var(--t3)",transition:"color .15s,border-color .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.color="var(--t2)";e.currentTarget.style.borderColor="rgba(255,255,255,.12)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="var(--t3)";e.currentTarget.style.borderColor="var(--border)";}}>
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
            <h2 style={{fontFamily:"var(--font-display)",fontSize:19,fontWeight:800,color:"var(--t1)",letterSpacing:"-0.02em",marginBottom:8}}>{ws.label}</h2>
            <div style={{padding:"9px 12px",background:"rgba(31,191,159,.05)",border:"1px solid rgba(31,191,159,.12)",borderRadius:9,fontSize:12,color:"var(--teal)",marginBottom:14,textAlign:"left",lineHeight:1.6}}>
              <strong>Context loaded:</strong> {project.problem_statement
                ? `"${project.problem_statement.slice(0,100)}${project.problem_statement.length>100?"...":""}"`
                : project.name}
            </div>
            <p style={{fontSize:13,color:"var(--t3)",lineHeight:1.65}}>Your project context is active. Describe what you need and this workstream will use it automatically.</p>
          </div>
        )}

        {messages.map((msg,i) => {
          const isUser = msg.role === "user";
          const isStructured = !isUser && isAnalysisDone(ws.id, msg.content);
          const isEditing = editingIdx === i;

          if (isUser) return (
            <div key={i} className="msg-group" style={{display:"flex",justifyContent:"flex-end",marginBottom:12,position:"relative"}}>
              {isEditing ? (
                <div style={{maxWidth:"72%",width:"100%"}}>
                  <textarea value={editText} onChange={e=>setEditText(e.target.value)} autoFocus rows={3}
                    style={{width:"100%",background:"var(--bg-2)",border:`1px solid ${ws.color}45`,borderRadius:"14px 14px 3px 14px",padding:"11px 14px",fontSize:13.5,color:"var(--t1)",outline:"none",resize:"none",fontFamily:"var(--font-body)",lineHeight:1.6}}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitEdit();}if(e.key==="Escape")setEditingIdx(null);}}
                  />
                  <div style={{display:"flex",gap:7,marginTop:6,justifyContent:"flex-end"}}>
                    <button onClick={submitEdit} disabled={!editText.trim()||loading} style={{padding:"6px 14px",background:editText.trim()?ws.color:"rgba(255,255,255,.1)",border:"none",borderRadius:7,fontSize:12.5,fontWeight:700,color:editText.trim()?"#041a13":"var(--t4)",cursor:editText.trim()?"pointer":"not-allowed"}}>Re-run</button>
                    <button onClick={()=>setEditingIdx(null)} style={{padding:"6px 12px",background:"none",border:"1px solid var(--border)",borderRadius:7,fontSize:12,color:"var(--t3)",cursor:"pointer"}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{position:"relative",maxWidth:"72%"}}>
                  <div style={{padding:"11px 14px",background:`${ws.color}14`,border:`1px solid ${ws.color}28`,borderRadius:"14px 14px 3px 14px",fontSize:13.5,color:"var(--t1)",lineHeight:1.6}}>
                    {msg.content}
                  </div>
                  <div className="msg-actions" style={{position:"absolute",top:-28,right:0,display:"none",alignItems:"center",gap:4,background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:8,padding:"3px 6px"}}>
                    <button onClick={()=>{navigator.clipboard?.writeText(msg.content);}} title="Copy" style={{background:"none",border:"none",cursor:"pointer",color:"var(--t3)",padding:"2px 4px",borderRadius:4,fontSize:11}} onMouseEnter={e=>e.currentTarget.style.color="var(--t1)"} onMouseLeave={e=>e.currentTarget.style.color="var(--t3)"}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                    <button onClick={()=>startEdit(i)} title="Edit and re-run" style={{background:"none",border:"none",cursor:"pointer",color:"var(--t3)",padding:"2px 4px",borderRadius:4,fontSize:11}} onMouseEnter={e=>e.currentTarget.style.color="var(--t1)"} onMouseLeave={e=>e.currentTarget.style.color="var(--t3)"}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={()=>rerunFromHere(i)} title="Re-run from here" style={{background:"none",border:"none",cursor:"pointer",color:"var(--t3)",padding:"2px 4px",borderRadius:4,fontSize:11}} onMouseEnter={e=>e.currentTarget.style.color="var(--t1)"} onMouseLeave={e=>e.currentTarget.style.color="var(--t3)"}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );

          if (isStructured) return (
            <div key={i} style={{marginBottom:16}}>
              <div style={{background:"var(--bg-1)",border:`1px solid ${ws.color}18`,borderRadius:"var(--radius)",padding:"24px 28px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${ws.color},transparent)`}}/>
                {renderMd(msg.content, ws.color)}
              </div>
            </div>
          );

          return (
            <div key={i} style={{display:"flex",gap:8,marginBottom:12,alignItems:"flex-start"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:`${ws.color}14`,border:`1px solid ${ws.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-mono)",fontSize:8,fontWeight:700,color:ws.color,flexShrink:0,marginTop:2}}>BA</div>
              <div style={{maxWidth:"78%",padding:"10px 14px",background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:"3px 14px 14px 14px",fontSize:13.5,color:"var(--t1)",lineHeight:1.68}}>
                {renderMd(msg.content)}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"flex-start"}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:`${ws.color}14`,border:`1px solid ${ws.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-mono)",fontSize:8,fontWeight:700,color:ws.color,flexShrink:0}}>BA</div>
            <div style={{padding:"10px 14px",background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:"3px 14px 14px 14px",display:"flex",gap:4}}>
              {[0,1,2].map(j=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:"var(--t3)",animation:`typing-dot 1.2s ${j*0.2}s infinite ease-in-out`}}/>)}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Clear end state */}
      {hasAnalysis && (
        <div style={{padding:"12px 22px",borderTop:"1px solid rgba(255,255,255,.06)",background:"rgba(31,191,159,.03)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{fontFamily:"var(--font-display)",fontSize:13,fontWeight:700,color:"var(--t1)"}}>Analysis complete</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setViewMode("document")}
              style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,background:ws.color,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,color:"#041a13"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              View as document
            </button>
            {saveStatus === "saving" && (
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"var(--bg-2)",border:"1px solid var(--border)",fontSize:12.5,color:"var(--t3)"}}>
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
            <button onClick={()=>navigator.clipboard?.writeText(analysisContent)} style={{padding:"7px 12px",borderRadius:8,background:"none",border:"1px solid var(--border)",color:"var(--t3)",fontSize:12,fontWeight:600,cursor:"pointer"}}>
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Input — always open */}
      <div style={{padding:"12px 22px 18px",borderTop:"1px solid var(--border)",flexShrink:0}}>
        <div style={{background:"var(--bg-2)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden",transition:"border-color .2s"}}
          onFocusCapture={e=>e.currentTarget.style.borderColor=`${ws.color}45`}
          onBlurCapture={e=>e.currentTarget.style.borderColor="var(--border)"}
        >
          <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder={hasAnalysis
              ? "Add new context, a stakeholder update, a risk, or any new information..."
              : messages.length===0
                ? "Describe what you need — project context is already loaded."
                : "Continue the conversation..."}
            rows={3}
            style={{width:"100%",background:"none",border:"none",outline:"none",padding:"13px 15px",fontSize:13.5,color:"var(--t1)",lineHeight:1.65,resize:"none",fontFamily:"var(--font-body)"}}
          />
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 11px",borderTop:"1px solid rgba(255,255,255,.04)"}}>
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--t4)"}}>
              {hasAnalysis ? "Conversation stays open — keep adding context" : "Enter to send · Shift+Enter for new line"}
            </span>
            <button onClick={send} disabled={!input.trim()||loading}
              style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:7,background:input.trim()&&!loading?ws.color:`${ws.color}20`,border:"none",cursor:input.trim()&&!loading?"pointer":"not-allowed",fontSize:12.5,fontWeight:700,color:input.trim()&&!loading?"#041a13":"var(--t4)",transition:"all .2s"}}>
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
  const wsStatusColor: Record<WsStatus, string> = { available:"var(--t4)", draft:"#fb923c", in_review:"#60a5fa", approved:"#1fbf9f" };

  return (
    <div style={{padding:"28px 24px",overflowY:"auto",height:"100%"}}>
      <h2 style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:800,color:"var(--t1)",letterSpacing:"-0.02em",marginBottom:4}}>
        Workstreams
      </h2>
      <p style={{fontSize:13,color:"var(--t3)",lineHeight:1.6,marginBottom:24}}>
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
              style={{background:isRec?"rgba(31,191,159,.04)":"var(--bg-1)",border:`1px solid ${isRec?"rgba(31,191,159,.2)":"var(--border)"}`,borderRadius:"var(--radius)",padding:"16px 18px",cursor:"pointer",transition:"border-color .2s, background .2s",display:"flex",alignItems:"center",gap:14,position:"relative"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=`${ws.color}30`;(e.currentTarget as HTMLDivElement).style.background="var(--bg-2)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=isRec?"rgba(31,191,159,.2)":"var(--border)";(e.currentTarget as HTMLDivElement).style.background=isRec?"rgba(31,191,159,.04)":"var(--bg-1)";}}
            >
              <div style={{width:36,height:36,borderRadius:10,background:`${ws.color}12`,border:`1px solid ${ws.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:ws.color}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700,color:"var(--t1)"}}>{ws.label}</div>
                  {isRec && <span style={{fontFamily:"var(--font-mono)",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(31,191,159,.12)",color:"var(--teal)",border:"1px solid rgba(31,191,159,.2)"}}>SUGGESTED</span>}
                  {isAgileSuggested && <span style={{fontFamily:"var(--font-mono)",fontSize:9,color:"var(--t4)",padding:"2px 6px",borderRadius:4,border:"1px solid var(--border)"}}>Agile only</span>}
                </div>
                <div style={{fontSize:12,color:"var(--t4)"}}>{ws.question}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontFamily:"var(--font-mono)",fontSize:10,fontWeight:600,color:wsStatusColor[status]}}>{wsStatusLabel[status]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:20,padding:"12px 16px",background:"var(--bg-1)",border:"1px solid var(--border)",borderRadius:"var(--radius)",fontSize:12.5,color:"var(--t3)",lineHeight:1.6}}>
        Workstreams are independent — open them in any order. The system tracks what is complete and suggests what makes sense next.
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function ProjectWorkspaceClient({user,profile,project,initialArtifacts,initialDecisions}:Props) {
  const router = useRouter();
  const [activeWs, setActiveWs]             = useState<Workstream|null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<Artifact|null>(null);
  const [artifacts, setArtifacts]           = useState<Artifact[]>(initialArtifacts);
  const [decisions, setDecisions]           = useState<Decision[]>(initialDecisions);
  const [decisionModal, setDecisionModal]   = useState<{open:boolean;prefill?:string}>({open:false});
  const [panelOpen, setPanelOpen]           = useState(true);

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
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"var(--bg)"}}>
      <AppSidebar activeHref="/projects" profile={profile} user={user}/>

      {/* Project panel */}
      <aside style={{width:panelOpen?260:0,flexShrink:0,borderRight:panelOpen?"1px solid var(--border)":"none",display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--bg-1)",transition:"width 240ms ease"}}>

        <div style={{padding:"14px 14px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <button onClick={()=>router.push("/projects")}
            style={{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:"var(--t3)",background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:10}} onMouseEnter={e=>e.currentTarget.style.color="var(--t2)"} onMouseLeave={e=>e.currentTarget.style.color="var(--t3)"}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> All projects
          </button>
          <h1 style={{fontFamily:"var(--font-display)",fontSize:13.5,fontWeight:800,color:"var(--t1)",letterSpacing:"-0.01em",lineHeight:1.35,marginBottom:3}}>{project.name}</h1>
          {project.organizations?.name && (
            <div style={{fontSize:11,color:"var(--t3)",display:"flex",alignItems:"center",gap:3}}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              {project.organizations.name}
            </div>
          )}
        </div>

        {/* Context */}
        <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,fontWeight:700,color:"var(--t4)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Context</div>
          {project.problem_statement && (
            <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.58,marginBottom:7,padding:"8px 10px",background:"rgba(31,191,159,.04)",border:"1px solid rgba(31,191,159,.1)",borderRadius:8,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical" as never}}>
              {project.problem_statement}
            </div>
          )}
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {project.methodology && <span style={{fontFamily:"var(--font-mono)",fontSize:9.5,padding:"2px 6px",borderRadius:4,background:"rgba(31,191,159,.08)",color:"var(--teal)",border:"1px solid rgba(31,191,159,.15)"}}>{METHODOLOGY_LABEL[project.methodology]??project.methodology}</span>}
            {project.industry && <span style={{fontFamily:"var(--font-mono)",fontSize:9.5,padding:"2px 6px",borderRadius:4,background:"var(--bg-2)",color:"var(--t3)",border:"1px solid var(--border)"}}>{project.industry}</span>}
          </div>
        </div>

        {/* Artifacts + Decisions */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 14px 8px"}}>
          <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,fontWeight:700,color:"var(--t4)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:7}}>
            Artifacts {activeArtifacts.length>0&&<span style={{color:"var(--teal)"}}>({activeArtifacts.length})</span>}
          </div>

          {activeArtifacts.length===0 && <div style={{fontSize:11.5,color:"var(--t4)",lineHeight:1.6,paddingBottom:8}}>No artifacts yet. Open a workstream to start.</div>}

          {activeArtifacts.map(a=>{
            const sc=STATUS_COLOR[a.status]??STATUS_COLOR.draft;
            return (
              <div key={a.id} onClick={()=>{setViewingArtifact(a);setActiveWs(null);}}
                style={{padding:"8px 9px",borderRadius:8,border:"1px solid transparent",cursor:"pointer",marginBottom:3,transition:"background .15s,border-color .15s",background:viewingArtifact?.id===a.id?"rgba(31,191,159,.06)":"none"}}
                onMouseEnter={e=>{if(viewingArtifact?.id!==a.id){(e.currentTarget as HTMLDivElement).style.background="var(--bg-2)";(e.currentTarget as HTMLDivElement).style.borderColor="var(--border)";}}}
                onMouseLeave={e=>{if(viewingArtifact?.id!==a.id){(e.currentTarget as HTMLDivElement).style.background="none";(e.currentTarget as HTMLDivElement).style.borderColor="transparent";}}}
              >
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ARTIFACT_TYPE_LABEL[a.type]??a.type}</div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:8.5,padding:"1px 5px",borderRadius:3,background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`,flexShrink:0}}>{a.status}</span>
                </div>
                <div style={{fontSize:10.5,color:"var(--t4)"}}>v{a.version} · {fmtDate(a.created_at)}</div>
              </div>
            );
          })}

          <div style={{height:1,background:"var(--border)",margin:"12px 0 10px"}}/>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,fontWeight:700,color:"var(--t4)",letterSpacing:".1em",textTransform:"uppercase"}}>
              Decisions {decisions.length>0&&<span style={{color:"#60a5fa"}}>({decisions.length})</span>}
            </div>
            <button onClick={()=>setDecisionModal({open:true})}
              style={{display:"flex",alignItems:"center",gap:2,fontSize:10.5,color:"var(--t3)",background:"none",border:"1px solid var(--border)",borderRadius:5,padding:"2px 7px",cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.color="var(--t2)";e.currentTarget.style.borderColor="rgba(255,255,255,.12)";}} onMouseLeave={e=>{e.currentTarget.style.color="var(--t3)";e.currentTarget.style.borderColor="var(--border)";}}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add
            </button>
          </div>

          {decisions.length===0 && <div style={{fontSize:11.5,color:"var(--t4)",lineHeight:1.6,paddingBottom:10}}>Log decisions here so nothing gets forgotten.</div>}

          {decisions.map(d=>{
            const dc=DECISION_STATUS_COLOR[d.status]??"var(--t3)";
            return (
              <div key={d.id} style={{padding:"7px 9px",borderRadius:7,background:"var(--bg-2)",border:"1px solid var(--border)",marginBottom:5}}>
                <div style={{fontSize:11.5,color:"var(--t1)",lineHeight:1.5,marginBottom:3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as never}}>{d.decision_text}</div>
                <div style={{display:"flex",alignItems:"center",gap:7,fontSize:10.5}}>
                  <span style={{color:dc,fontWeight:600,textTransform:"capitalize" as const}}>{d.status}</span>
                  {d.made_by&&<span style={{color:"var(--t4)"}}>{d.made_by}</span>}
                  <span style={{color:"var(--t4)",marginLeft:"auto"}}>{d.decision_date?fmtDate(d.decision_date):fmtDate(d.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main area */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {viewingArtifact ? (
          <ArtifactViewer artifact={viewingArtifact} projectId={project.id} onStatusChange={handleStatusChange} onClose={()=>setViewingArtifact(null)}/>
        ) : activeWs ? (
          <WorkstreamSession
            ws={activeWs} project={project} artifacts={artifacts}
            onBack={()=>{setActiveWs(null);setPanelOpen(true);}}
            onArtifactSaved={handleArtifactSaved}
            onDecisionLog={(prefill)=>setDecisionModal({open:true,prefill})}
            panelOpen={panelOpen}
            onTogglePanel={()=>setPanelOpen(v=>!v)}
          />
        ) : (
          <WorkstreamsHub project={project} artifacts={artifacts} onSelectWs={(ws)=>{setActiveWs(ws);setViewingArtifact(null);setPanelOpen(false);}}/>
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
