"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Background,
  Controls,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  Grid3X3, Undo2, Redo2, Wand2, LayoutList,
  MousePointer2, Loader2,
} from "lucide-react";
import AppSidebar from "@/components/AppSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "draw" | "generate" | "structured";

interface Profile { full_name: string | null; subscription_tier: string | null; }

interface Lane { id: string; label: string; color?: string; }

interface Step {
  id: string; action: string; actor: string; isDecision: boolean;
  yesBranch: string; yesLabel: string; noBranch: string; noLabel: string;
}

// ── Sizes ─────────────────────────────────────────────────────────────────────

const SZ = {
  terminal: { w: 140, h: 44 },
  process:  { w: 200, h: 70 },
  decision: { w: 150, h: 90 },
  data:     { w: 180, h: 60 },
  document: { w: 180, h: 70 },
  step:     { w: 190, h: 72 },  // draw-mode alias for process
};

const HS: React.CSSProperties = { width: 9, height: 9, background: "#334155", border: "1.5px solid #475569" };

// ── Layout ────────────────────────────────────────────────────────────────────

const LANE_H        = 155;
const LANE_HDR_W    = 120;
const COLS_PER_BAND = 5;
const X_GAP         = 80;
const Y_GAP         = 50;
const BAND_GAP      = 140;
const START_X       = 40;
const START_Y       = 40;

function bfsColumns(nodes: Node[], edges: Edge[]): Record<string, number> {
  const outAdj: Record<string, string[]> = {};
  const inDeg:  Record<string, number>   = {};
  nodes.forEach(n => { outAdj[n.id] = []; inDeg[n.id] = 0; });
  edges.forEach(e => {
    if (e.source in outAdj) outAdj[e.source].push(e.target);
    if (e.target in inDeg)  inDeg[e.target]++;
  });
  const col: Record<string, number> = {};
  const q = nodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
  q.forEach(id => { col[id] = 0; });
  const tmp = { ...inDeg };
  let qi = 0;
  while (qi < q.length) {
    const id = q[qi++];
    for (const t of outAdj[id] ?? []) {
      col[t] = Math.max(col[t] ?? 0, (col[id] ?? 0) + 1);
      if (--tmp[t] === 0) q.push(t);
    }
  }
  nodes.forEach(n => { if (!(n.id in col)) col[n.id] = 0; });
  return col;
}

// Wrapped LR layout — wraps into bands of COLS_PER_BAND
function simpleLayout(rawNodes: Node[], edges: Edge[]): Node[] {
  if (rawNodes.length === 0) return rawNodes;
  const col = bfsColumns(rawNodes, edges);
  const getBand   = (c: number) => Math.floor(c / COLS_PER_BAND);
  const getRelCol = (c: number) => c % COLS_PER_BAND;

  const atCell: Record<string, Node[]> = {};
  rawNodes.forEach(n => {
    const key = `${getBand(col[n.id] ?? 0)}-${getRelCol(col[n.id] ?? 0)}`;
    (atCell[key] ??= []).push(n);
  });
  const maxCol   = Math.max(...rawNodes.map(n => col[n.id] ?? 0), 0);
  const numBands = getBand(maxCol) + 1;

  const relColX: Record<number, number> = {};
  let x = START_X;
  for (let rc = 0; rc < COLS_PER_BAND; rc++) {
    relColX[rc] = x;
    const w = Math.max(...rawNodes.filter(n => getRelCol(col[n.id] ?? 0) === rc).map(n => n.width ?? SZ.step.w), SZ.step.w);
    x += w + X_GAP;
  }
  const bandStartY: Record<number, number> = {};
  let bandY = START_Y;
  for (let b = 0; b < numBands; b++) {
    bandStartY[b] = bandY;
    let maxH = 0;
    for (let rc = 0; rc < COLS_PER_BAND; rc++) {
      const cell = atCell[`${b}-${rc}`] ?? [];
      const h = cell.reduce((acc, n, i) => acc + (n.height ?? SZ.step.h) + (i < cell.length - 1 ? Y_GAP : 0), 0);
      maxH = Math.max(maxH, h);
    }
    bandY += (maxH || SZ.step.h) + BAND_GAP;
  }
  return rawNodes.map(n => {
    const c = col[n.id] ?? 0;
    const cell = atCell[`${getBand(c)}-${getRelCol(c)}`] ?? [];
    const row  = cell.findIndex(cn => cn.id === n.id);
    let y = bandStartY[getBand(c)] ?? START_Y;
    for (let r = 0; r < row; r++) y += (cell[r].height ?? SZ.step.h) + Y_GAP;
    return { ...n, position: { x: relColX[getRelCol(c)] ?? START_X, y } };
  });
}

// Swimlane layout — horizontal lanes stacked vertically
function swimlaneLayout(
  rawNodes: Node[], edges: Edge[], lanes: Lane[]
): { nodes: Node[]; laneNodes: Node[] } {
  if (lanes.length === 0) return { nodes: simpleLayout(rawNodes, edges), laneNodes: [] };

  const col = bfsColumns(rawNodes, edges);
  const maxCol = Math.max(...rawNodes.map(n => col[n.id] ?? 0), 0);

  // x per column (left-to-right, starting after lane header)
  const colX: Record<number, number> = {};
  let x = LANE_HDR_W + 30;
  for (let c = 0; c <= maxCol; c++) {
    colX[c] = x;
    const w = Math.max(...rawNodes.filter(n => (col[n.id] ?? 0) === c).map(n => n.width ?? SZ.process.w), SZ.process.w);
    x += w + X_GAP;
  }
  const totalW = x + 100;

  // Lane y positions
  const laneIdx: Record<string, number> = {};
  lanes.forEach((l, i) => { laneIdx[l.id] = i; });

  const positioned = rawNodes.map(n => {
    const c       = col[n.id] ?? 0;
    const laneId  = String(n.data?.laneId ?? "");
    const li      = laneIdx[laneId] ?? 0;
    const nodeH   = n.height ?? SZ.process.h;
    return {
      ...n,
      position: {
        x: colX[c] ?? (LANE_HDR_W + 30),
        y: li * LANE_H + Math.round((LANE_H - nodeH) / 2),
      },
    };
  });

  const laneNodes: Node[] = lanes.map((lane, i) => ({
    id: `__lane_${lane.id}`,
    type: "laneNode",
    position: { x: 0, y: i * LANE_H },
    data: { label: lane.label, color: lane.color },
    style: { width: Math.max(totalW, 1600), height: LANE_H, pointerEvents: "none" },
    draggable: false,
    selectable: false,
    connectable: false,
    focusable: false,
    zIndex: -1,
  }));

  return { nodes: positioned, laneNodes };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

const YES_LABELS = new Set(["yes", "approved", "approve", "success", "true", "complete", "pass", "accept", "accepted", "ok"]);
const NO_LABELS  = new Set(["no", "rejected", "reject", "failed", "fail", "false", "incomplete", "decline", "declined", "error"]);

function edgeColor(label: string | undefined, isFromDecision: boolean, edgeIndexFromDecision: number): string {
  if (!isFromDecision) return "#334155";
  const low = (label ?? "").toLowerCase();
  if (YES_LABELS.has(low)) return "#1fbf9f";
  if (NO_LABELS.has(low))  return "#f87171";
  return edgeIndexFromDecision === 0 ? "#1fbf9f" : "#f87171";
}

function edgeSourceHandle(label: string | undefined, isFromDecision: boolean, edgeIndexFromDecision: number): string | undefined {
  if (!isFromDecision) return undefined;
  const low = (label ?? "").toLowerCase();
  if (YES_LABELS.has(low)) return "yes";
  if (NO_LABELS.has(low))  return "no";
  return edgeIndexFromDecision === 0 ? "yes" : "no";
}

function mkEdge(source: string, target: string, label?: string, color = "#334155", sourceHandle?: string, animated?: boolean): Edge {
  return {
    id: `${source}-${sourceHandle ?? ""}-${target}-${uid()}`,
    source, target,
    sourceHandle: sourceHandle ?? null,
    animated: animated ?? false,
    label: label || undefined,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    style: { stroke: color, strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fontWeight: 700, fill: color },
    labelBgStyle: { fill: "#0d0d12", fillOpacity: 0.95 },
    labelBgPadding: [4, 6] as [number, number],
    labelBgBorderRadius: 4,
  };
}

function stepsToGraph(title: string, steps: Step[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    { id: "start", type: "terminalNode", data: { label: title || "Start" }, position: { x: 0, y: 0 }, width: SZ.terminal.w, height: SZ.terminal.h },
    { id: "end",   type: "terminalNode", data: { label: "End", isEnd: true }, position: { x: 0, y: 0 }, width: SZ.terminal.w, height: SZ.terminal.h },
    ...steps.map(s => ({
      id: s.id, type: s.isDecision ? "decisionNode" : "stepNode",
      data: { label: s.action || "…", actor: s.actor }, position: { x: 0, y: 0 },
      width: s.isDecision ? SZ.decision.w : SZ.step.w, height: s.isDecision ? SZ.decision.h : SZ.step.h,
    })),
  ];
  const edges: Edge[] = [];
  const res = (v: string, fallback: string) => (!v || v === "auto") ? fallback : v === "end" ? "end" : v;
  if (steps.length === 0) {
    edges.push(mkEdge("start", "end"));
  } else {
    edges.push(mkEdge("start", steps[0].id));
    steps.forEach((s, i) => {
      const next = i < steps.length - 1 ? steps[i + 1].id : "end";
      if (s.isDecision) {
        edges.push(mkEdge(s.id, res(s.yesBranch, next), s.yesLabel || "Yes", "#1fbf9f", "yes"));
        edges.push(mkEdge(s.id, res(s.noBranch, "end"),  s.noLabel  || "No",  "#f87171", "no"));
      } else { edges.push(mkEdge(s.id, next)); }
    });
  }
  return { nodes, edges };
}

// ── Inline edit ───────────────────────────────────────────────────────────────

function useInlineEdit(id: string, label: string) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(label);
  const { setNodes } = useReactFlow();
  useEffect(() => { setDraft(label); }, [label]);
  const commit = useCallback(() => {
    setEditing(false);
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, label: draft } } : n));
  }, [id, draft, setNodes]);
  return { editing, draft, setDraft, startEdit: () => setEditing(true), commit };
}

// ── Node components ───────────────────────────────────────────────────────────

function TerminalNode({ id, data, selected }: NodeProps) {
  const { editing, draft, setDraft, startEdit, commit } = useInlineEdit(id, String(data.label ?? "Start"));
  const isEnd   = !!data.isEnd;
  const accent  = isEnd ? "#f87171" : "#1fbf9f";
  const bg      = isEnd ? "#2d0a0a" : "#0d2e24";
  return (
    <div onDoubleClick={startEdit}
      style={{ width: "100%", height: "100%", minWidth: SZ.terminal.w, minHeight: SZ.terminal.h, borderRadius: 999, background: bg, border: `2px solid ${selected ? "#fff" : accent}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={36} color={accent} />
      <Handle type="target" position={Position.Left}  style={HS} />
      <Handle type="target" position={Position.Top}   style={{ ...HS, opacity: 0.4 }} />
      {editing
        ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "75%", background: "transparent", border: "none", outline: "none", color: accent, fontWeight: 700, fontSize: 12, textAlign: "center" }} />
        : <span style={{ fontSize: 12, fontWeight: 700, color: accent, userSelect: "none", padding: "0 12px", textAlign: "center" }}>{String(data.label)}</span>
      }
      <Handle type="source" position={Position.Right}  style={HS} />
      <Handle type="source" position={Position.Bottom} style={{ ...HS, opacity: 0.4 }} />
    </div>
  );
}

// Generic rectangle node factory
function makeRectNode(accent: string, bg: string, defaultLabel: string, minW: number, minH: number) {
  return function RectNode({ id, data, selected }: NodeProps) {
    const { editing, draft, setDraft, startEdit, commit } = useInlineEdit(id, String(data.label ?? defaultLabel));
    return (
      <div onDoubleClick={startEdit}
        style={{ width: "100%", height: "100%", minWidth: minW, minHeight: minH, borderRadius: 8, background: bg, border: `1.5px solid ${selected ? accent : accent + "60"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 14px", cursor: "default", boxSizing: "border-box" }}>
        <NodeResizer isVisible={selected} minWidth={120} minHeight={40} color={accent} />
        <Handle type="target" position={Position.Left}   style={HS} />
        <Handle type="target" position={Position.Top}    style={{ ...HS, opacity: 0.4 }} />
        {editing
          ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${accent}`, outline: "none", color: "#e2e8f0", fontWeight: 600, fontSize: 12, textAlign: "center" }} />
          : <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", textAlign: "center", lineHeight: 1.4, userSelect: "none" }}>{String(data.label)}</div>
        }
        {data.actor && !editing && <div style={{ fontSize: 10, color: accent, marginTop: 4, fontFamily: "monospace" }}>{String(data.actor)}</div>}
        {data.description && !editing && <div style={{ fontSize: 10, color: "#475569", marginTop: 3, textAlign: "center", lineHeight: 1.4 }}>{String(data.description)}</div>}
        <Handle type="source" position={Position.Right}  style={HS} />
        <Handle type="source" position={Position.Bottom} style={{ ...HS, opacity: 0.4 }} />
      </div>
    );
  };
}

const StepNode     = makeRectNode("#475569", "#12121e",  "Step",            SZ.step.w,    SZ.step.h);
const ProcessNode  = makeRectNode("#3b82f6", "#0f1f3d",  "Process step",    SZ.process.w, SZ.process.h);
const DocumentNode = makeRectNode("#f59e0b", "#1c1404",  "Document",        SZ.document.w, SZ.document.h);

// Data node — parallelogram
function DataNode({ id, data, selected }: NodeProps) {
  const { editing, draft, setDraft, startEdit, commit } = useInlineEdit(id, String(data.label ?? "Data"));
  const accent = "#06b6d4";
  return (
    <div onDoubleClick={startEdit}
      style={{ width: "100%", height: "100%", minWidth: SZ.data.w, minHeight: SZ.data.h, position: "relative", cursor: "default" }}>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={44} color={accent} />
      {/* Parallelogram background */}
      <div style={{ position: "absolute", inset: 0, background: "#031821", border: `1.5px solid ${selected ? accent : accent + "60"}`, transform: "skewX(-12deg)", borderRadius: 4 }} />
      <Handle type="target" position={Position.Left}   style={HS} />
      <Handle type="target" position={Position.Top}    style={{ ...HS, opacity: 0.4 }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px", zIndex: 1 }}>
        {editing
          ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${accent}`, outline: "none", color: "#e2e8f0", fontWeight: 600, fontSize: 12, textAlign: "center" }} />
          : <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", textAlign: "center", lineHeight: 1.4, userSelect: "none" }}>{String(data.label)}</span>
        }
      </div>
      <Handle type="source" position={Position.Right}  style={HS} />
      <Handle type="source" position={Position.Bottom} style={{ ...HS, opacity: 0.4 }} />
    </div>
  );
}

// Decision diamond
function DecisionNode({ id, data, selected }: NodeProps) {
  const { editing, draft, setDraft, startEdit, commit } = useInlineEdit(id, String(data.label ?? "Decision?"));
  return (
    <div onDoubleClick={startEdit}
      style={{ width: "100%", height: "100%", minWidth: SZ.decision.w, minHeight: SZ.decision.h, position: "relative", cursor: "default" }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={60} color="#a78bfa" />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon points="50,2 98,50 50,98 2,50" fill="#160d28" stroke={selected ? "#c4b5fd" : "#a78bfa"} strokeWidth={selected ? 4 : 2.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <Handle type="target" position={Position.Left}   style={{ ...HS, top: "50%" }} />
      <Handle type="target" position={Position.Top}    style={{ ...HS, left: "50%", opacity: 0.4 }} />
      <Handle type="source" id="yes" position={Position.Right}  style={{ ...HS, top: "50%" }} />
      <Handle type="source" id="no"  position={Position.Bottom} style={{ ...HS, left: "50%" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 30px", zIndex: 1 }}>
        {editing
          ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #7c3aed", outline: "none", color: "#ddd6fe", fontWeight: 600, fontSize: 11, textAlign: "center" }} />
          : <span style={{ fontSize: 11, fontWeight: 600, color: "#ddd6fe", textAlign: "center", lineHeight: 1.3, userSelect: "none" }}>{String(data.label)}</span>
        }
      </div>
    </div>
  );
}

// Swimlane background — non-interactive, sits behind content nodes
function LaneNode({ data }: NodeProps) {
  const color = data.color as string | undefined;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", borderBottom: "1px solid #1e293b", pointerEvents: "none" }}>
      {/* Header strip */}
      <div style={{ width: LANE_HDR_W, background: color ? `${color}18` : "rgba(51,65,85,0.25)", borderRight: "1px solid #2d3748", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ writingMode: "vertical-lr" as const, transform: "rotate(180deg)", fontSize: 10, fontWeight: 700, color: color ?? "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "monospace" }}>
          {String(data.label ?? "")}
        </span>
      </div>
      {/* Content area */}
      <div style={{ flex: 1, background: color ? `${color}06` : "transparent" }} />
    </div>
  );
}

const nodeTypes = {
  terminalNode: TerminalNode,
  stepNode:     StepNode,
  processNode:  ProcessNode,
  decisionNode: DecisionNode,
  dataNode:     DataNode,
  documentNode: DocumentNode,
  laneNode:     LaneNode,
};

// ── Palette (Draw mode) ───────────────────────────────────────────────────────

function PaletteItem({ shape, label, children }: { shape: string; label: string; children: React.ReactNode }) {
  return (
    <div draggable
      onDragStart={e => { e.dataTransfer.setData("application/rftype", shape); e.dataTransfer.effectAllowed = "move"; }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 8, border: "1px solid #1e293b", background: "#0c0c16", cursor: "grab", userSelect: "none" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#334155")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e293b")}>
      {children}
      <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{label}</span>
    </div>
  );
}

function Palette() {
  return (
    <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>Drag to canvas</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <PaletteItem shape="terminal" label="Start / End">
          <div style={{ width: 68, height: 26, borderRadius: 13, background: "#0d2e24", border: "2px solid #1fbf9f" }} />
        </PaletteItem>
        <PaletteItem shape="step" label="Process">
          <div style={{ width: 68, height: 34, borderRadius: 6, background: "#12121e", border: "1.5px solid #2d3748" }} />
        </PaletteItem>
        <PaletteItem shape="decision" label="Decision">
          <svg width={64} height={40} viewBox="0 0 64 40">
            <polygon points="32,2 62,20 32,38 2,20" fill="#160d28" stroke="#a78bfa" strokeWidth={1.5} />
          </svg>
        </PaletteItem>
        <PaletteItem shape="data" label="Data / I/O">
          <div style={{ width: 68, height: 34, background: "#031821", border: "1.5px solid #06b6d4", transform: "skewX(-12deg)", borderRadius: 3 }} />
        </PaletteItem>
      </div>
      <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(51,65,85,0.12)", border: "1px solid #1e293b" }}>
        <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.8 }}>
          <strong style={{ color: "#64748b" }}>Drag</strong> shapes to canvas<br />
          <strong style={{ color: "#64748b" }}>Drag handle</strong> to connect<br />
          <strong style={{ color: "#64748b" }}>Double-click</strong> to rename<br />
          <strong style={{ color: "#64748b" }}>Delete</strong> removes selected
        </div>
      </div>
    </div>
  );
}

// ── Structured panel ──────────────────────────────────────────────────────────

function StructuredPanel({ title, setTitle, steps, setSteps, onBuild, building }: {
  title: string; setTitle: (t: string) => void;
  steps: Step[]; setSteps: React.Dispatch<React.SetStateAction<Step[]>>;
  onBuild: () => void; building: boolean;
}) {
  const addStep    = () => setSteps(s => [...s, { id: uid(), action: "", actor: "", isDecision: false, yesBranch: "", yesLabel: "", noBranch: "", noLabel: "" }]);
  const removeStep = (id: string) => setSteps(s => s.filter(x => x.id !== id).map(x => ({ ...x, yesBranch: x.yesBranch === id ? "" : x.yesBranch, noBranch: x.noBranch === id ? "" : x.noBranch })));
  const updateStep = (id: string, patch: Partial<Step>) => setSteps(s => s.map(x => x.id === id ? { ...x, ...patch } : x));
  const moveStep   = (i: number, dir: -1 | 1) => setSteps(s => { const n = [...s], j = i + dir; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const branchOpts = (id: string) => [
    { value: "", label: "Next step (auto)" }, { value: "end", label: "→ End" },
    ...steps.filter(s => s.id !== id).map(s => ({ value: s.id, label: s.action || `Step ${steps.indexOf(s) + 1}` })),
  ];
  const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #1e293b", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "14px 12px 0", flexShrink: 0 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Process title" style={{ ...inp, marginBottom: 10, fontWeight: 600, fontSize: 13 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid #1e293b" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>Steps</span>
          <button onClick={addStep} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "rgba(31,191,159,0.08)", border: "1px solid rgba(31,191,159,0.2)", color: "#1fbf9f", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><Plus size={10} /> Add</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ marginBottom: 8, padding: 11, borderRadius: 9, border: `1px solid ${step.isDecision ? "#3b1f6e" : "#1e293b"}`, background: "#0c0c16" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: step.isDecision ? "#a78bfa" : "#475569", fontFamily: "monospace", letterSpacing: "0.1em" }}>{step.isDecision ? "◇ DECISION" : `STEP ${i + 1}`}</span>
              <div style={{ display: "flex", gap: 1 }}>
                <button onClick={() => moveStep(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "not-allowed" : "pointer", color: "#475569", opacity: i === 0 ? 0.25 : 1, padding: 2 }}><ChevronUp size={11} /></button>
                <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} style={{ background: "none", border: "none", cursor: i === steps.length - 1 ? "not-allowed" : "pointer", color: "#475569", opacity: i === steps.length - 1 ? 0.25 : 1, padding: 2 }}><ChevronDown size={11} /></button>
                <button onClick={() => removeStep(step.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 2 }}><Trash2 size={11} /></button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <input style={inp} placeholder="What happens?" value={step.action} onChange={e => updateStep(step.id, { action: e.target.value })} />
              <input style={inp} placeholder="Who does it? (optional)" value={step.actor} onChange={e => updateStep(step.id, { actor: e.target.value })} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 2 }}>
                <div onClick={() => updateStep(step.id, { isDecision: !step.isDecision })} style={{ width: 30, height: 16, borderRadius: 8, background: step.isDecision ? "#7c3aed" : "rgba(255,255,255,0.05)", border: `1px solid ${step.isDecision ? "#a78bfa" : "#1e293b"}`, position: "relative", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: step.isDecision ? 12 : 2, width: 10, height: 10, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                </div>
                <span style={{ fontSize: 10, color: step.isDecision ? "#a78bfa" : "#475569" }}>Decision point</span>
              </label>
              {step.isDecision && (
                <div style={{ marginTop: 4, padding: 9, borderRadius: 7, background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.18)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {([
                    { branch: "yes", label: step.yesLabel, key: "yesLabel", target: "yesBranch", targetVal: step.yesBranch, color: "#1fbf9f" },
                    { branch: "no",  label: step.noLabel,  key: "noLabel",  target: "noBranch",  targetVal: step.noBranch,  color: "#f87171" },
                  ] as const).map(b => (
                    <div key={b.branch}>
                      <div style={{ fontSize: 9, color: b.color, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 3 }}>{b.branch.toUpperCase()} BRANCH</div>
                      <div style={{ display: "flex", gap: 5 }}>
                        <input style={{ ...inp, flex: 1, borderColor: `${b.color}30`, fontSize: 11 }} placeholder="Label" value={b.label} onChange={e => updateStep(step.id, { [b.key]: e.target.value })} />
                        <select style={{ ...inp, flex: 1.4, borderColor: `${b.color}30`, cursor: "pointer" }} value={b.targetVal} onChange={e => updateStep(step.id, { [b.target]: e.target.value })}>
                          {branchOpts(step.id).map(o => <option key={o.value} value={o.value} style={{ background: "#0d0d12" }}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <p style={{ fontSize: 10, color: "#334155", lineHeight: 1.6, margin: "4px 0 0" }}>Branch targets create loops and merges.</p>
      </div>
      <div style={{ padding: "10px 12px", flexShrink: 0, borderTop: "1px solid #1e1e2e" }}>
        <button onClick={onBuild} disabled={building}
          style={{ width: "100%", padding: "9px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: building ? "rgba(31,191,159,0.06)" : "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.3)", color: building ? "#475569" : "#1fbf9f", fontSize: 12, fontWeight: 700, cursor: building ? "not-allowed" : "pointer" }}>
          {building
            ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Building…</>
            : "Build diagram from form"}
        </button>
      </div>
    </div>
  );
}

// ── Generate panel ────────────────────────────────────────────────────────────

function GeneratePanel({ onGenerate, onClear, generating, hasContent }: {
  onGenerate: (desc: string) => void; onClear: () => void;
  generating: boolean; hasContent: boolean;
}) {
  const [desc, setDesc] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleClearClick = () => {
    if (hasContent) { setConfirmingClear(true); return; }
    setDesc(""); onClear();
  };
  const confirmClear = () => { setDesc(""); setConfirmingClear(false); onClear(); };

  return (
    <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>Describe your process</div>
      <textarea
        value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="e.g. A customer submits a loan application. The underwriter reviews it and decides if it's complete. If complete, the manager approves or rejects. If rejected, the customer is notified. If approved, funds are disbursed."
        style={{ flex: 1, minHeight: 180, padding: "10px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", fontSize: 12, lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "inherit" }}
      />
      {confirmingClear && (
        <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#fca5a5", fontWeight: 600 }}>Clear this diagram?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmingClear(false)} style={{ flex: 1, padding: "7px", borderRadius: 7, background: "transparent", border: "1px solid #2d3748", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
            <button onClick={confirmClear} style={{ flex: 1, padding: "7px", borderRadius: 7, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)", color: "#f87171", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Clear</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => desc.trim() && onGenerate(desc)} disabled={generating || !desc.trim()}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 8, background: generating ? "rgba(31,191,159,0.06)" : "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.3)", color: generating ? "#475569" : "#1fbf9f", fontSize: 12, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer" }}>
          {generating ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Generating…</> : <><Wand2 size={13} /> Generate</>}
        </button>
        <button onClick={handleClearClick} disabled={generating}
          style={{ padding: "10px 14px", borderRadius: 8, background: "transparent", border: "1px solid #1e293b", color: "#475569", fontSize: 12, cursor: generating ? "not-allowed" : "pointer", fontWeight: 500, whiteSpace: "nowrap" as const }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#475569"; }}>
          Clear
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 10, color: "#334155", lineHeight: 1.7, margin: 0 }}>
        DiagramForge reads your description and produces a clean diagram. Edit nodes after generation.
      </p>
    </div>
  );
}

// ── Inner flow ────────────────────────────────────────────────────────────────

function FlowInner({ profile, user }: { profile: Profile | null; user: { email: string } }) {
  const [mode, setMode] = useState<Mode>("draw");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [title, setTitle] = useState("New Process");
  const [steps, setSteps] = useState<Step[]>([{ id: uid(), action: "", actor: "", isDecision: false, yesBranch: "", yesLabel: "", noBranch: "", noLabel: "" }]);
  const [generating, setGenerating] = useState(false);
  const [building,   setBuilding]   = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([{ nodes: [], edges: [] }]);
  const histIdxRef = useRef(0);
  const { project, fitView, setViewport } = useReactFlow();

  const updateUndoRedo = useCallback(() => {
    setCanUndo(histIdxRef.current > 0);
    setCanRedo(histIdxRef.current < historyRef.current.length - 1);
  }, []);

  const pushSnapshot = useCallback((n: Node[], e: Edge[]) => {
    const trimmed = historyRef.current.slice(0, histIdxRef.current + 1);
    trimmed.push({ nodes: JSON.parse(JSON.stringify(n)), edges: JSON.parse(JSON.stringify(e)) });
    if (trimmed.length > 50) trimmed.shift();
    historyRef.current = trimmed;
    histIdxRef.current = trimmed.length - 1;
    updateUndoRedo();
  }, [updateUndoRedo]);

  const undo = useCallback(() => {
    if (histIdxRef.current <= 0) return;
    const snap = historyRef.current[--histIdxRef.current];
    setNodes(snap.nodes); setEdges(snap.edges); updateUndoRedo();
  }, [setNodes, setEdges, updateUndoRedo]);

  const redo = useCallback(() => {
    if (histIdxRef.current >= historyRef.current.length - 1) return;
    const snap = historyRef.current[++histIdxRef.current];
    setNodes(snap.nodes); setEdges(snap.edges); updateUndoRedo();
  }, [setNodes, setEdges, updateUndoRedo]);

  // Detect deletions for undo snapshot
  const prevCountRef = useRef({ n: 0, e: 0 });
  useEffect(() => {
    const prev = prevCountRef.current;
    const realN = nodes.filter(n => !n.id.startsWith("__lane_")).length;
    if ((realN < prev.n || edges.length < prev.e) && (realN > 0 || prev.n > 0)) pushSnapshot(nodes, edges);
    prevCountRef.current = { n: realN, e: edges.length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length]);

  // Keyboard undo/redo
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  const onNodeDragStop = useCallback(() => { pushSnapshot(nodes, edges); }, [nodes, edges, pushSnapshot]);

  const onConnect = useCallback((params: Connection) => {
    const isYes = params.sourceHandle === "yes";
    const isNo  = params.sourceHandle === "no";
    const color = isYes ? "#1fbf9f" : isNo ? "#f87171" : "#334155";
    const label = isYes ? "Yes" : isNo ? "No" : undefined;
    setEdges(es => {
      const next = addEdge({ ...params, type: "smoothstep", label, markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 }, style: { stroke: color, strokeWidth: 1.5 }, labelStyle: { fontSize: 10, fontWeight: 700, fill: color }, labelBgStyle: { fill: "#0d0d12", fillOpacity: 0.9 }, labelBgPadding: [4, 6] as [number, number], labelBgBorderRadius: 4 }, es);
      pushSnapshot(nodes, next);
      return next;
    });
  }, [nodes, pushSnapshot, setEdges]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!wrapperRef.current) return;
    const shape = e.dataTransfer.getData("application/rftype");
    if (!shape) return;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = project({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    const typeMap: Record<string, string> = { terminal: "terminalNode", step: "stepNode", decision: "decisionNode", data: "dataNode" };
    const szMap:   Record<string, { w: number; h: number }> = { terminal: SZ.terminal, step: SZ.step, decision: SZ.decision, data: SZ.data };
    const lblMap:  Record<string, string> = { terminal: "Start / End", step: "Process step", decision: "Decision?", data: "Data" };
    const sz = szMap[shape] ?? SZ.step;
    const newNode: Node = { id: uid(), type: typeMap[shape] ?? "stepNode", position, data: { label: lblMap[shape] ?? "Step" }, width: sz.w, height: sz.h };
    setNodes(ns => { const next = [...ns, newNode]; pushSnapshot(next, edges); return next; });
  }, [project, edges, setNodes, pushSnapshot]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);

  const fitViewDelayed = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.18, duration: 400 }), 80);
  }, [fitView]);

  // Shared: converts API diagram JSON → React Flow nodes/edges and applies them.
  // Handles both the DiagramForge schema (start/end/process/decision with data.label)
  // and the legacy direct-type schema (terminalNode/stepNode with top-level label).
  const applyDiagramData = useCallback((data: Record<string, unknown>) => {
    if (typeof data.title === "string" && data.title.trim()) setTitle(data.title.trim());

    const lanes: Lane[] = ((data.lanes as Lane[] | undefined) ?? []).map(l => ({
      id: l.id, label: l.label, color: l.color,
    }));

    const rfTypeMap: Record<string, string> = {
      start: "terminalNode",  end: "terminalNode",
      process: "processNode", decision: "decisionNode",
      data: "dataNode",       document: "documentNode",
      terminalNode: "terminalNode", stepNode: "stepNode",
      processNode: "processNode",  decisionNode: "decisionNode",
      dataNode: "dataNode",        documentNode: "documentNode",
    };
    const rfSzMap: Record<string, { w: number; h: number }> = {
      start: SZ.terminal,   end: SZ.terminal,
      process: SZ.process,  decision: SZ.decision,
      data: SZ.data,        document: SZ.document,
      terminalNode: SZ.terminal,  stepNode: SZ.step,
      processNode: SZ.process,   decisionNode: SZ.decision,
      dataNode: SZ.data,         documentNode: SZ.document,
    };

    type ApiNode = {
      id: string; type?: string;
      label?: string; actor?: string; description?: string;
      data?: { label?: string; description?: string };
      laneId?: string; position?: { x: number; y: number };
    };
    type ApiEdge = {
      id?: string; source: string; target: string;
      label?: string; sourceHandle?: string; animated?: boolean;
    };

    const rawNodes: Node[] = ((data.nodes as ApiNode[]) ?? []).map(n => {
      const dfType = n.type ?? "process";
      const sz     = rfSzMap[dfType] ?? SZ.process;
      return {
        id:   n.id,
        type: rfTypeMap[dfType] ?? "stepNode",
        data: {
          label:       n.data?.label ?? n.label ?? "",   // new schema first, legacy fallback
          actor:       n.actor,
          description: n.description ?? n.data?.description,
          laneId:      n.laneId,
          isEnd:       n.id === "end" || dfType === "end",
        },
        position: n.position ?? { x: 0, y: 0 },
        width: sz.w, height: sz.h,
      };
    });

    const decisionIds = new Set(rawNodes.filter(n => n.type === "decisionNode").map(n => n.id));
    const edgeCountFromDecision: Record<string, number> = {};

    const rawEdges: Edge[] = ((data.edges as ApiEdge[]) ?? []).map(e => {
      const isFromDecision = decisionIds.has(e.source);
      const idx = edgeCountFromDecision[e.source] ?? 0;
      edgeCountFromDecision[e.source] = idx + 1;
      const color  = edgeColor(e.label, isFromDecision, idx);
      const handle = e.sourceHandle ?? edgeSourceHandle(e.label, isFromDecision, idx);
      return mkEdge(e.source, e.target, e.label, color, handle, e.animated);
    });

    let finalNodes: Node[];
    let laneNodes: Node[] = [];
    if (lanes.length > 0) {
      const result = swimlaneLayout(rawNodes, rawEdges, lanes);
      finalNodes = result.nodes;
      laneNodes  = result.laneNodes;
    } else {
      finalNodes = simpleLayout(rawNodes, rawEdges);
    }

    const allNodes = [...laneNodes, ...finalNodes];
    setNodes(allNodes);
    setEdges(rawEdges);
    pushSnapshot(allNodes, rawEdges);
    fitViewDelayed();
  }, [setNodes, setEdges, pushSnapshot, fitViewDelayed, setTitle]);

  const handleBuildFromForm = useCallback(async () => {
    setBuilding(true);
    try {
      const res = await fetch("/api/tools/process-flow/structured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, steps }),
      });
      if (!res.ok) throw new Error(await res.text());
      applyDiagramData(await res.json());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Build failed: ${msg}`);
    } finally {
      setBuilding(false);
    }
  }, [title, steps, applyDiagramData]);

  const handleClear = useCallback(() => {
    setNodes([]); setEdges([]); pushSnapshot([], []);
    setTimeout(() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 }), 50);
  }, [setNodes, setEdges, pushSnapshot, setViewport]);

  const handleGenerate = useCallback(async (description: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/tools/process-flow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error(await res.text());
      applyDiagramData(await res.json());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[generate]", msg);
      alert(`Generate failed: ${msg}`);
    } finally {
      setGenerating(false);
    }
  }, [applyDiagramData]);

  const isDraw = mode === "draw";
  const hasContent = nodes.filter(n => !n.id.startsWith("__lane_")).length > 0;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0d0d12" }}>
      <AppSidebar activeHref="/tools/process-flow" profile={profile} user={user} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <header style={{ height: 54, flexShrink: 0, padding: "0 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1e1e2e", background: "rgba(9,9,11,0.95)" }}>
          {mode !== "structured"
            ? <input value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", background: "none", border: "none", outline: "none", width: 180, letterSpacing: "-0.02em" }} placeholder="Process name" />
            : <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", width: 180 }}>{title || "New Process"}</span>
          }

          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: 9, padding: 3 }}>
            {(["draw", "generate", "structured"] as const).map(m => {
              const icons = { draw: <MousePointer2 size={11} />, generate: <Wand2 size={11} />, structured: <LayoutList size={11} /> };
              const labels = { draw: "Draw", generate: "Generate", structured: "Structured" };
              const active = mode === m;
              return (
                <button key={m} onClick={() => setMode(m)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, background: active ? "rgba(255,255,255,0.07)" : "transparent", border: active ? "1px solid #2d3748" : "1px solid transparent", color: active ? "#f1f5f9" : "#475569", fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer" }}>
                  {icons[m]} {labels[m]}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            style={{ display: "flex", alignItems: "center", padding: "5px 9px", borderRadius: 7, background: "transparent", border: "1px solid #1e293b", color: canUndo ? "#94a3b8" : "#2d3748", cursor: canUndo ? "pointer" : "not-allowed" }}>
            <Undo2 size={13} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            style={{ display: "flex", alignItems: "center", padding: "5px 9px", borderRadius: 7, background: "transparent", border: "1px solid #1e293b", color: canRedo ? "#94a3b8" : "#2d3748", cursor: canRedo ? "pointer" : "not-allowed" }}>
            <Redo2 size={13} />
          </button>

          {isDraw && (
            <button onClick={() => setSnapToGrid(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: snapToGrid ? "rgba(31,191,159,0.1)" : "transparent", border: `1px solid ${snapToGrid ? "rgba(31,191,159,0.3)" : "#1e293b"}`, color: snapToGrid ? "#1fbf9f" : "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              <Grid3X3 size={12} /> {snapToGrid ? "Grid on" : "Grid off"}
            </button>
          )}
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left panel */}
          <div style={{ width: 280, flexShrink: 0, borderRight: "1px solid #1e1e2e", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {mode === "draw"       && <Palette />}
            {mode === "generate"   && <GeneratePanel onGenerate={handleGenerate} onClear={handleClear} generating={generating} hasContent={hasContent} />}
            {mode === "structured" && <StructuredPanel title={title} setTitle={setTitle} steps={steps} setSteps={setSteps} onBuild={handleBuildFromForm} building={building} />}
          </div>

          {/* Canvas — always mounted */}
          <div ref={wrapperRef} style={{ flex: 1, position: "relative" }}>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={isDraw ? onConnect : undefined}
              onDrop={isDraw ? onDrop : undefined}
              onDragOver={isDraw ? onDragOver : undefined}
              onNodeDragStop={onNodeDragStop}
              nodeTypes={nodeTypes}
              snapToGrid={snapToGrid && isDraw} snapGrid={[16, 16]}
              deleteKeyCode={isDraw ? "Delete" : null}
              nodesDraggable={isDraw} nodesConnectable={isDraw} edgesUpdatable={isDraw}
              elementsSelectable
              fitView fitViewOptions={{ padding: 0.18 }}
              minZoom={0.05} maxZoom={3}
              proOptions={{ hideAttribution: true }}
              style={{ background: "#08080f" }}
            >
              <Background variant={BackgroundVariant.Dots} color="#1a1a2e" gap={20} size={1.5} />
              <Controls showInteractive={false} style={{ background: "#12121e", border: "1px solid #2d3748", borderRadius: 8 }} />
            </ReactFlow>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ProcessFlowClient({ profile, user }: { profile: Profile | null; user: { email: string } }) {
  return (
    <ReactFlowProvider>
      <FlowInner profile={profile} user={user} />
    </ReactFlowProvider>
  );
}
