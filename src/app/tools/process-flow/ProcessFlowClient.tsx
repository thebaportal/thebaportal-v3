"use client";

import dagre from "dagre";
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
  getNodesBounds,
  getTransformForBounds,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from "reactflow";
import { toPng } from "html-to-image";
import "reactflow/dist/style.css";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import {
  Plus, Trash2, ChevronUp, ChevronDown,
  Grid3X3, Undo2, Redo2, Wand2, LayoutList,
  MousePointer2, Loader2, Download, Copy,
} from "lucide-react";
import jsPDF from "jspdf";
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
  step:     { w: 190, h: 72 },
  note:     { w: 220, h: 90 },
};

// Professional light-blue palette (matches draw.io / Visio standard)
const NODE_FILL   = "#d6eaf8";
const NODE_BORDER = "#5b9bd5";
const NODE_TEXT   = "#1e293b";
const NODE_SEL    = "#1a6eb5";

const HS: React.CSSProperties = { width: 8, height: 8, background: "#5b9bd5", border: "2px solid #fff", borderRadius: "50%" };

const NODE_COLORS = ["#d6eaf8","#d5f5e3","#fef9c3","#fde8e8","#ede9fe","#f1f5f9","#fff3e0","#e0f7fa"];

const NODE_TYPE_OPTIONS = [
  { value: "terminalNode", label: "Start / End" },
  { value: "processNode",  label: "Process" },
  { value: "stepNode",     label: "Step" },
  { value: "decisionNode", label: "Decision" },
  { value: "dataNode",     label: "Data / I-O" },
  { value: "documentNode", label: "Document" },
  { value: "noteNode",     label: "Note / Callout" },
];

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

// Dagre auto-layout — clean ranked layout for AI-generated diagrams
function dagreLayout(nodes: Node[], edges: Edge[], direction: "TB" | "LR" = "TB"): Node[] {
  if (nodes.length === 0) return nodes;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });
  nodes.forEach(n => g.setNode(n.id, { width: n.width ?? SZ.step.w, height: n.height ?? SZ.step.h }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return { ...n, position: { x: pos.x - (n.width ?? SZ.step.w) / 2, y: pos.y - (n.height ?? SZ.step.h) / 2 } };
  });
}

// Snake layout — uses dagre LR for column assignment (handles cycles; BFS cannot),
// then maps columns into alternating L→R / R→L rows of SNAKE_COLS.
const SNAKE_COLS   = 7;
const SNAKE_X_STEP = 230;
const SNAKE_Y_STEP = 185;

function snakeLayout(rawNodes: Node[], edges: Edge[]): Node[] {
  if (rawNodes.length === 0) return rawNodes;

  // Dagre LR gives correct rank/column numbers even when the graph has cycles
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 60 });
  rawNodes.forEach(n => g.setNode(n.id, { width: n.width ?? SZ.step.w, height: n.height ?? SZ.step.h }));
  edges.forEach(e => { try { g.setEdge(e.source, e.target); } catch { /* skip */ } });
  dagre.layout(g);

  // Map continuous dagre x-positions → 0-based integer column indices
  const uniqueXs = [...new Set(rawNodes.map(n => { const p = g.node(n.id); return p ? Math.round(p.x) : 0; }))].sort((a, b) => a - b);
  const xToCol: Record<number, number> = {};
  uniqueXs.forEach((x, i) => { xToCol[x] = i; });

  const col: Record<string, number> = {};
  rawNodes.forEach(n => { const p = g.node(n.id); col[n.id] = xToCol[p ? Math.round(p.x) : 0] ?? 0; });

  const byCol: Record<number, string[]> = {};
  rawNodes.forEach(n => { const c = col[n.id] ?? 0; (byCol[c] ??= []).push(n.id); });

  return rawNodes.map(n => {
    const c        = col[n.id] ?? 0;
    const band     = Math.floor(c / SNAKE_COLS);
    const pos      = c % SNAKE_COLS;
    const isEven   = band % 2 === 0;
    const stackIdx = (byCol[c] ?? []).indexOf(n.id);
    const x = START_X + (isEven ? pos : SNAKE_COLS - 1 - pos) * SNAKE_X_STEP;
    const y = START_Y + band * SNAKE_Y_STEP + stackIdx * ((n.height ?? SZ.step.h) + 20);
    return { ...n, position: { x, y } };
  });
}

// Auto-insert reference node pairs for edges that would draw long or backward lines.
// Replaces each such edge with: source → Ref(n) exit  +  Ref(n) entry → target
// The two circles share the same number label — visually implied connection, no drawn line.
function insertRefs(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const posMap = new Map(nodes.map(n => [n.id, n]));
  const finalNodes = [...nodes];
  const finalEdges: Edge[] = [];
  let refNum = 1;

  for (const e of edges) {
    const src = posMap.get(e.source);
    const tgt = posMap.get(e.target);
    if (!src || !tgt) { finalEdges.push(e); continue; }

    const dy   = tgt.position.y - src.position.y;
    const dx   = Math.abs(tgt.position.x - src.position.x);
    const dist = Math.abs(dy) + dx;
    // Trigger ref when going backward (upward) or spanning > ~60% of a full row width
    const needsRef = dy < -(SNAKE_Y_STEP * 0.4) || dist > SNAKE_X_STEP * SNAKE_COLS * 0.6;

    // Row-transition: same X position, short downward drop — route via bottom→top handles
    // to avoid the U-curve that smoothstep creates when source and target share an X
    const isRowTransition = !needsRef
      && dx < SNAKE_X_STEP * 0.25
      && dy > SNAKE_Y_STEP * 0.5 && dy < SNAKE_Y_STEP * 2;

    if (isRowTransition) {
      finalEdges.push({ ...e, sourceHandle: "b", targetHandle: "t" });
      continue;
    }

    if (needsRef) {
      const n   = refNum++;
      const sz  = 34;
      const exitId = `__rx${n}`;
      const entId  = `__rn${n}`;
      const srcW = src.width  ?? SZ.step.w;
      const srcH = src.height ?? SZ.step.h;
      const tgtH = tgt.height ?? SZ.step.h;

      finalNodes.push({
        id: exitId, type: "refNode", selectable: false, draggable: false,
        data: { label: String(n) },
        position: { x: src.position.x + srcW / 2 + 6, y: src.position.y + srcH / 2 - sz / 2 },
        width: sz, height: sz,
      });
      finalNodes.push({
        id: entId, type: "refNode", selectable: false, draggable: false,
        data: { label: String(n) },
        position: { x: tgt.position.x - sz - 6, y: tgt.position.y + tgtH / 2 - sz / 2 },
        width: sz, height: sz,
      });

      // Short edge from source → exit ref (keeps label + styling of original)
      finalEdges.push({ ...e, id: e.id + "_x", target: exitId });
      // Short edge from entry ref → target (no label needed)
      finalEdges.push(mkEdge(entId, e.target));
    } else {
      finalEdges.push(e);
    }
  }

  return { nodes: finalNodes, edges: finalEdges };
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
  if (!isFromDecision) return NODE_BORDER;
  const low = (label ?? "").toLowerCase();
  if (YES_LABELS.has(low)) return "#2e7d32";
  if (NO_LABELS.has(low))  return "#c62828";
  return edgeIndexFromDecision === 0 ? "#2e7d32" : "#c62828";
}

function edgeSourceHandle(label: string | undefined, isFromDecision: boolean, edgeIndexFromDecision: number): string | undefined {
  if (!isFromDecision) return undefined;
  const low = (label ?? "").toLowerCase();
  if (YES_LABELS.has(low)) return "yes";
  if (NO_LABELS.has(low))  return "no";
  return edgeIndexFromDecision === 0 ? "yes" : "no";
}

function mkEdge(source: string, target: string, label?: string, color = NODE_BORDER, sourceHandle?: string, animated?: boolean, targetHandle?: string): Edge {
  return {
    id: `${source}-${sourceHandle ?? ""}-${target}-${uid()}`,
    source, target,
    sourceHandle: sourceHandle ?? null,
    targetHandle: targetHandle ?? null,
    animated: animated ?? false,
    label: label || undefined,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    style: { stroke: color, strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fontWeight: 700, fill: color },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95 },
    labelBgPadding: [3, 6] as [number, number],
    labelBgBorderRadius: 3,
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
  const fill = (data.color as string | undefined) ?? NODE_FILL;
  const fs   = (data.fontSize as number | undefined) ?? 12;
  const tc   = (data.textColor as string | undefined) ?? NODE_TEXT;
  const border = selected ? NODE_SEL : NODE_BORDER;
  return (
    <div onDoubleClick={startEdit}
      style={{ width: "100%", height: "100%", minWidth: SZ.terminal.w, minHeight: SZ.terminal.h, borderRadius: 999, background: fill, border: `2px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default", boxShadow: selected ? `0 0 0 2px ${NODE_SEL}40` : "0 1px 3px rgba(0,0,0,0.12)" }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={36} color={NODE_SEL} />
      <Handle id="l" type="source" position={Position.Left}   style={HS} />
      <Handle id="t" type="source" position={Position.Top}    style={{ ...HS, opacity: 0.5 }} />
      {editing
        ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "75%", background: "transparent", border: "none", outline: "none", color: tc, fontWeight: 700, fontSize: fs, textAlign: "center" }} />
        : <span style={{ fontSize: fs, fontWeight: 700, color: tc, userSelect: "none", padding: "0 12px", textAlign: "center" }}>{String(data.label)}</span>
      }
      <Handle id="r" type="source" position={Position.Right}  style={HS} />
      <Handle id="b" type="source" position={Position.Bottom} style={{ ...HS, opacity: 0.5 }} />
    </div>
  );
}

// Generic rectangle node — professional light-blue style
function makeRectNode(defaultLabel: string, minW: number, minH: number) {
  return function RectNode({ id, data, selected }: NodeProps) {
    const { editing, draft, setDraft, startEdit, commit } = useInlineEdit(id, String(data.label ?? defaultLabel));
    const fill = (data.color     as string | undefined) ?? NODE_FILL;
    const fs   = (data.fontSize  as number | undefined) ?? 12;
    const tc   = (data.textColor as string | undefined) ?? NODE_TEXT;
    const border = selected ? NODE_SEL : NODE_BORDER;
    return (
      <div onDoubleClick={startEdit}
        style={{ width: "100%", height: "100%", minWidth: minW, minHeight: minH, borderRadius: 6, background: fill, border: `1.5px solid ${border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 14px", cursor: "default", boxSizing: "border-box", boxShadow: selected ? `0 0 0 2px ${NODE_SEL}40` : "0 1px 3px rgba(0,0,0,0.10)" }}>
        <NodeResizer isVisible={selected} minWidth={120} minHeight={40} color={NODE_SEL} />
        <Handle id="l" type="source" position={Position.Left}   style={HS} />
        <Handle id="t" type="source" position={Position.Top}    style={{ ...HS, opacity: 0.5 }} />
        {editing
          ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${NODE_BORDER}`, outline: "none", color: tc, fontWeight: 600, fontSize: fs, textAlign: "center" }} />
          : <div style={{ fontSize: fs, fontWeight: 600, color: tc, textAlign: "center", lineHeight: 1.4, userSelect: "none" }}>{String(data.label)}</div>
        }
        {data.actor && !editing && <div style={{ fontSize: 10, color: NODE_BORDER, marginTop: 4, fontFamily: "monospace" }}>{String(data.actor)}</div>}
        {data.description && !editing && <div style={{ fontSize: 10, color: "#64748b", marginTop: 3, textAlign: "center", lineHeight: 1.4 }}>{String(data.description)}</div>}
        <Handle id="r" type="source" position={Position.Right}  style={HS} />
        <Handle id="b" type="source" position={Position.Bottom} style={{ ...HS, opacity: 0.5 }} />
      </div>
    );
  };
}

const StepNode     = makeRectNode("Step",         SZ.step.w,     SZ.step.h);
const ProcessNode  = makeRectNode("Process step", SZ.process.w,  SZ.process.h);
const DocumentNode = makeRectNode("Document",     SZ.document.w, SZ.document.h);

// Note / callout node — sticky note style for bracketed annotations
function NoteNode({ id, data, selected }: NodeProps) {
  const { editing, draft, setDraft, startEdit, commit } = useInlineEdit(id, String(data.label ?? "Note"));
  const fs = (data.fontSize  as number | undefined) ?? 11;
  const tc = (data.textColor as string | undefined) ?? "#78350f";
  const border = selected ? "#b45309" : "#d97706";
  const NH: React.CSSProperties = { ...HS, background: "#d97706" };
  return (
    <div onDoubleClick={startEdit}
      style={{ width: "100%", height: "100%", minWidth: SZ.note.w, minHeight: SZ.note.h, borderRadius: 6, background: "#fef9c3", border: `1.5px dashed ${border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 14px", cursor: "default", boxSizing: "border-box", boxShadow: selected ? `0 0 0 2px #d9770640` : "0 2px 6px rgba(0,0,0,0.08)" }}>
      <NodeResizer isVisible={selected} minWidth={140} minHeight={60} color="#d97706" />
      <Handle id="l" type="source" position={Position.Left}   style={NH} />
      <Handle id="t" type="source" position={Position.Top}    style={{ ...NH, opacity: 0.5 }} />
      {editing
        ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #d97706", outline: "none", color: tc, fontWeight: 500, fontSize: fs, textAlign: "center", fontFamily: "inherit" }} />
        : <div style={{ fontSize: fs, fontWeight: 500, color: tc, textAlign: "center", lineHeight: 1.5, userSelect: "none", fontStyle: "italic" }}>{String(data.label)}</div>
      }
      <Handle id="r" type="source" position={Position.Right}  style={NH} />
      <Handle id="b" type="source" position={Position.Bottom} style={{ ...NH, opacity: 0.5 }} />
    </div>
  );
}

// Data node — parallelogram
function DataNode({ id, data, selected }: NodeProps) {
  const { editing, draft, setDraft, startEdit, commit } = useInlineEdit(id, String(data.label ?? "Data"));
  const fill = (data.color     as string | undefined) ?? NODE_FILL;
  const fs   = (data.fontSize  as number | undefined) ?? 12;
  const tc   = (data.textColor as string | undefined) ?? NODE_TEXT;
  const border = selected ? NODE_SEL : NODE_BORDER;
  return (
    <div onDoubleClick={startEdit}
      style={{ width: "100%", height: "100%", minWidth: SZ.data.w, minHeight: SZ.data.h, position: "relative", cursor: "default" }}>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={44} color={NODE_SEL} />
      <div style={{ position: "absolute", inset: 0, background: fill, border: `1.5px solid ${border}`, transform: "skewX(-12deg)", borderRadius: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.10)" }} />
      <Handle id="l" type="source" position={Position.Left}   style={HS} />
      <Handle id="t" type="source" position={Position.Top}    style={{ ...HS, opacity: 0.5 }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px", zIndex: 1 }}>
        {editing
          ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${NODE_BORDER}`, outline: "none", color: tc, fontWeight: 600, fontSize: fs, textAlign: "center" }} />
          : <span style={{ fontSize: fs, fontWeight: 600, color: tc, textAlign: "center", lineHeight: 1.4, userSelect: "none" }}>{String(data.label)}</span>
        }
      </div>
      <Handle id="r" type="source" position={Position.Right}  style={HS} />
      <Handle id="b" type="source" position={Position.Bottom} style={{ ...HS, opacity: 0.5 }} />
    </div>
  );
}

// Decision diamond
function DecisionNode({ id, data, selected }: NodeProps) {
  const { editing, draft, setDraft, startEdit, commit } = useInlineEdit(id, String(data.label ?? "Decision?"));
  const fill = (data.color     as string | undefined) ?? NODE_FILL;
  const fs   = (data.fontSize  as number | undefined) ?? 11;
  const tc   = (data.textColor as string | undefined) ?? NODE_TEXT;
  const stroke = selected ? NODE_SEL : NODE_BORDER;
  return (
    <div onDoubleClick={startEdit}
      style={{ width: "100%", height: "100%", minWidth: SZ.decision.w, minHeight: SZ.decision.h, position: "relative", cursor: "default" }}>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={60} color={NODE_SEL} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <polygon points="50,2 98,50 50,98 2,50" fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 2} vectorEffect="non-scaling-stroke" />
      </svg>
      <Handle id="l"   type="source" position={Position.Left}   style={{ ...HS, top: "50%" }} />
      <Handle id="t"   type="source" position={Position.Top}    style={{ ...HS, left: "50%", opacity: 0.5 }} />
      <Handle id="yes" type="source" position={Position.Right}  style={{ ...HS, top: "50%" }} />
      <Handle id="no"  type="source" position={Position.Bottom} style={{ ...HS, left: "50%" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 28px", zIndex: 1 }}>
        {editing
          ? <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${NODE_BORDER}`, outline: "none", color: tc, fontWeight: 600, fontSize: fs, textAlign: "center" }} />
          : <span style={{ fontSize: fs, fontWeight: 600, color: tc, textAlign: "center", lineHeight: 1.3, userSelect: "none" }}>{String(data.label)}</span>
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

// Reference node — small circle matching the PDF "Ref 1 / Ref 2" convention
function RefNode({ data }: NodeProps) {
  return (
    <div style={{
      width: "100%", height: "100%", borderRadius: "50%",
      background: "#bfdbfe", border: `2px solid ${NODE_BORDER}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 800, color: NODE_TEXT,
      boxShadow: "0 1px 3px rgba(0,0,0,0.12)", userSelect: "none", cursor: "default",
    }}>
      <Handle type="target" position={Position.Left}   style={{ ...HS, opacity: 0.5 }} />
      <Handle type="target" position={Position.Top}    style={{ ...HS, opacity: 0.3 }} />
      {String(data.label ?? "")}
      <Handle type="source" position={Position.Right}  style={HS} />
      <Handle type="source" position={Position.Bottom} style={{ ...HS, opacity: 0.3 }} />
    </div>
  );
}

const TEXT_COLORS = ["#1e293b","#1e40af","#166534","#9a3412","#6b21a8","#374151","#1d4ed8","#dc2626"];

// ── Node properties panel ─────────────────────────────────────────────────────

function NodePropertiesPanel({ node, multiCount, onClose, onTypeChange, onColorChange, onFontSizeChange, onTextColorChange, onDelete }: {
  node: Node;
  multiCount?: number;
  onClose: () => void;
  onTypeChange: (t: string) => void;
  onColorChange: (c: string) => void;
  onFontSizeChange: (s: number) => void;
  onTextColorChange: (c: string) => void;
  onDelete: () => void;
}) {
  const isSingle    = !multiCount;
  const currentColor = (node.data?.color     as string | undefined) ?? NODE_FILL;
  const currentFs    = (node.data?.fontSize   as number | undefined) ?? 12;
  const currentTc    = (node.data?.textColor  as string | undefined) ?? "#1e293b";
  const s: React.CSSProperties = { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #1e293b", fontSize: 11, color: "#e2e8f0", background: "#0c0c16", cursor: "pointer", outline: "none" };
  return (
    <div style={{ padding: "14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {multiCount ? `${multiCount} nodes` : "Node"}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#334155", fontSize: 13, lineHeight: 1, padding: 2 }}>✕</button>
      </div>

      {isSingle && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 5 }}>Shape</div>
          <select value={node.type ?? "processNode"} onChange={e => onTypeChange(e.target.value)} style={s}>
            {NODE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: "#0d0d12" }}>{o.label}</option>)}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Fill colour</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {NODE_COLORS.map(c => (
            <div key={c} onClick={() => onColorChange(c)}
              style={{ width: 20, height: 20, borderRadius: 4, background: c, border: `2px solid ${currentColor === c ? NODE_SEL : "#1e293b"}`, cursor: "pointer" }} />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Text colour</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {TEXT_COLORS.map(c => (
            <div key={c} onClick={() => onTextColorChange(c)}
              style={{ width: 20, height: 20, borderRadius: 4, background: c, border: `2px solid ${currentTc === c ? NODE_SEL : "#1e293b"}`, cursor: "pointer" }} />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>Font size</div>
        <div style={{ display: "flex", gap: 4 }}>
          {([10, 11, 12, 14, 16] as const).map(fs => (
            <button key={fs} onClick={() => onFontSizeChange(fs)}
              style={{ flex: 1, padding: "4px 0", borderRadius: 5, background: currentFs === fs ? "#1e3a5f" : "transparent", border: `1px solid ${currentFs === fs ? NODE_BORDER : "#1e293b"}`, fontSize: 10, color: currentFs === fs ? "#93c5fd" : "#475569", cursor: "pointer" }}>
              {fs}
            </button>
          ))}
        </div>
      </div>

      {isSingle && (
        <button onClick={onDelete} style={{ width: "100%", padding: "7px 0", borderRadius: 6, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Delete node
        </button>
      )}
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
  noteNode:     NoteNode,
  laneNode:     LaneNode,
  refNode:      RefNode,
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
          <div style={{ width: 68, height: 26, borderRadius: 13, background: NODE_FILL, border: `2px solid ${NODE_BORDER}` }} />
        </PaletteItem>
        <PaletteItem shape="step" label="Process">
          <div style={{ width: 68, height: 34, borderRadius: 6, background: NODE_FILL, border: `1.5px solid ${NODE_BORDER}` }} />
        </PaletteItem>
        <PaletteItem shape="decision" label="Decision">
          <svg width={64} height={40} viewBox="0 0 64 40">
            <polygon points="32,2 62,20 32,38 2,20" fill={NODE_FILL} stroke={NODE_BORDER} strokeWidth={1.5} />
          </svg>
        </PaletteItem>
        <PaletteItem shape="data" label="Data / I/O">
          <div style={{ width: 68, height: 34, background: NODE_FILL, border: `1.5px solid ${NODE_BORDER}`, transform: "skewX(-12deg)", borderRadius: 3 }} />
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

function StructuredPanel({ title, setTitle, steps, setSteps, onBuild }: {
  title: string; setTitle: (t: string) => void;
  steps: Step[]; setSteps: React.Dispatch<React.SetStateAction<Step[]>>;
  onBuild: () => void;
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
        <button onClick={onBuild}
          style={{ width: "100%", padding: "9px", borderRadius: 8, background: "rgba(31,191,159,0.12)", border: "1px solid rgba(31,191,159,0.3)", color: "#1fbf9f", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Build diagram from form
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
  const [done, setDone] = useState(false);

  const handleGenerate = () => {
    if (!desc.trim() || generating) return;
    setDone(false);
    onGenerate(desc);
  };

  useEffect(() => {
    if (!generating && hasContent && desc.trim()) {
      setDone(true);
      const t = setTimeout(() => setDone(false), 3000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating]);

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
        <button onClick={handleGenerate} disabled={generating || !desc.trim()}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 8, background: done ? "rgba(31,191,159,0.18)" : generating ? "rgba(31,191,159,0.06)" : "rgba(31,191,159,0.12)", border: `1px solid ${done ? "rgba(31,191,159,0.5)" : "rgba(31,191,159,0.3)"}`, color: generating ? "#475569" : "#1fbf9f", fontSize: 12, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer" }}>
          {generating ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Building diagram…</> : done ? <>✓ Done — click to regenerate</> : <><Wand2 size={13} /> Generate</>}
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

function FlowInner({ profile, user }: { profile: Profile | null; user: { email: string } | null }) {
  const [mode, setMode] = useState<Mode>("draw");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [title, setTitle] = useState("New Process");
  const [steps, setSteps] = useState<Step[]>([{ id: uid(), action: "", actor: "", isDecision: false, yesBranch: "", yesLabel: "", noBranch: "", noLabel: "" }]);
  const [generating, setGenerating] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([{ nodes: [], edges: [] }]);
  const histIdxRef = useRef(0);
  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
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

  // Keyboard: undo/redo, copy/paste, delete (custom handler keeps pre-deletion snapshot for undo)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }

      // Custom delete — snapshot BEFORE removal so undo can restore
      if ((e.key === "Delete" || e.key === "Backspace") && !ctrl) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
        const selNodes = nodes.filter(n => n.selected && !n.id.startsWith("__"));
        const selEdges = edges.filter(e2 => e2.selected);
        if (selNodes.length === 0 && selEdges.length === 0) return;
        e.preventDefault();
        pushSnapshot(nodes, edges); // pre-deletion snapshot for undo
        const selIds = new Set(selNodes.map(n => n.id));
        setNodes(ns => ns.filter(n => !n.selected || n.id.startsWith("__")));
        setEdges(es => es.filter(e2 => !e2.selected && !selIds.has(e2.source) && !selIds.has(e2.target)));
      }

      if (ctrl && e.key === "c") {
        const selectedNodes = nodes.filter(n => n.selected && !n.id.startsWith("__"));
        if (selectedNodes.length === 0) return;
        const selectedIds = new Set(selectedNodes.map(n => n.id));
        const selectedEdges = edges.filter(e2 => selectedIds.has(e2.source) && selectedIds.has(e2.target));
        clipboardRef.current = {
          nodes: JSON.parse(JSON.stringify(selectedNodes)),
          edges: JSON.parse(JSON.stringify(selectedEdges)),
        };
      }

      if (ctrl && e.key === "v") {
        const cb = clipboardRef.current;
        if (!cb || cb.nodes.length === 0) return;
        const idMap: Record<string, string> = {};
        cb.nodes.forEach(n => { idMap[n.id] = uid(); });
        const newNodes: Node[] = cb.nodes.map(n => ({
          ...n, id: idMap[n.id],
          position: { x: n.position.x + 50, y: n.position.y + 30 },
          selected: true,
        }));
        const newEdges: Edge[] = cb.edges.map(e2 =>
          mkEdge(idMap[e2.source], idMap[e2.target], e2.label as string | undefined,
            (e2.style as { stroke?: string } | undefined)?.stroke ?? NODE_BORDER,
            e2.sourceHandle ?? undefined)
        );
        setNodes(ns => {
          const deselected = ns.map(n => ({ ...n, selected: false }));
          const next = [...deselected, ...newNodes];
          pushSnapshot(next, [...edges, ...newEdges]);
          return next;
        });
        setEdges(es => [...es, ...newEdges]);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo, nodes, edges, pushSnapshot, setNodes, setEdges]);

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

    const calloutNodes: Node[]   = [];
    const calloutEdges: Edge[]   = [];

    const rawNodes: Node[] = ((data.nodes as ApiNode[]) ?? []).map(n => {
      const dfType = n.type ?? "process";
      const fullLabel = n.data?.label ?? n.label ?? "";
      const isTerminal = ["start", "end", "terminalNode"].includes(dfType);
      const isDecision = ["decision", "decisionNode"].includes(dfType);

      // Extract trailing bracket/paren annotation → create a separate noteNode below
      const bracketMatch = !isTerminal && !isDecision
        ? fullLabel.match(/^(.*?)\s*[\[\(]([^\[\]\(\)]{4,})[\]\)]\s*$/)
        : null;
      const cleanLabel   = bracketMatch ? (bracketMatch[1].trim() || fullLabel) : fullLabel;
      const calloutText  = bracketMatch ? bracketMatch[2].trim() : null;

      const sz = rfSzMap[dfType] ?? SZ.process;

      if (calloutText) {
        const cid = `__co_${n.id}`;
        calloutNodes.push({
          id: cid, type: "noteNode", selectable: true, draggable: true,
          data: { label: calloutText, parentId: n.id },
          position: { x: 0, y: 0 },
          width: SZ.note.w, height: SZ.note.h,
        });
        calloutEdges.push({
          id: `${n.id}-co-${cid}`, source: n.id, target: cid,
          type: "smoothstep", sourceHandle: "b", targetHandle: "t",
          style: { stroke: "#d97706", strokeWidth: 1.5, strokeDasharray: "4 3" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706", width: 8, height: 8 },
        });
      }

      return {
        id:   n.id,
        type: rfTypeMap[dfType] ?? "stepNode",
        data: {
          label: cleanLabel,
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
    let finalEdges: Edge[] = rawEdges;
    let laneNodes: Node[] = [];

    if (lanes.length > 0) {
      const result = swimlaneLayout(rawNodes, rawEdges, lanes);
      finalNodes = result.nodes;
      laneNodes  = result.laneNodes;
    } else {
      const snaked = snakeLayout(rawNodes, rawEdges);
      const withRefs = insertRefs(snaked, rawEdges);
      finalNodes = withRefs.nodes;
      finalEdges = withRefs.edges;
    }

    // Position callout nodes directly below their parent after layout
    const posMap = new Map(finalNodes.map(n => [n.id, n]));
    const positionedCallouts = calloutNodes.map(co => {
      const parent = posMap.get(co.data.parentId as string);
      if (!parent) return co;
      const pw = parent.width  ?? SZ.process.w;
      const ph = parent.height ?? SZ.process.h;
      const cw = co.width      ?? SZ.note.w;
      return {
        ...co,
        position: {
          x: parent.position.x + (pw - cw) / 2,
          y: parent.position.y + ph + 18,
        },
      };
    });

    const allNodes = [...laneNodes, ...finalNodes, ...positionedCallouts];
    setNodes(allNodes);
    setEdges([...finalEdges, ...calloutEdges]);
    pushSnapshot(allNodes, finalEdges);
    fitViewDelayed();
  }, [setNodes, setEdges, pushSnapshot, fitViewDelayed, setTitle]);

  const handleBuildFromForm = useCallback(() => {
    const { nodes: n, edges: e } = stepsToGraph(title, steps);
    const snaked = snakeLayout(n, e);
    const { nodes: finalN, edges: finalE } = insertRefs(snaked, e);
    setNodes(finalN); setEdges(finalE); pushSnapshot(finalN, finalE); fitViewDelayed();
  }, [title, steps, setNodes, setEdges, pushSnapshot, fitViewDelayed]);

  const handleClear = useCallback(() => {
    setNodes([]); setEdges([]); pushSnapshot([], []);
    setTimeout(() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 }), 50);
  }, [setNodes, setEdges, pushSnapshot, setViewport]);

  const exportToPng = useCallback(async (): Promise<string | null> => {
    const viewport = wrapperRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewport) return null;
    const realNodes = nodes.filter(n => !n.id.startsWith("__lane_") && !n.id.startsWith("__rx") && !n.id.startsWith("__rn"));
    if (realNodes.length === 0) return null;
    const bounds = getNodesBounds(realNodes);
    const pad = 60;
    const imgW = Math.max(bounds.width  + pad * 2, 400);
    const imgH = Math.max(bounds.height + pad * 2, 300);
    const [tx, ty, scale] = getTransformForBounds(bounds, imgW, imgH, 0.5, 2, pad / Math.max(imgW, imgH));
    return toPng(viewport, {
      backgroundColor: "#f8fafc",
      width: imgW,
      height: imgH,
      style: { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: "top left", width: `${imgW}px`, height: `${imgH}px` },
    });
  }, [nodes]);

  const handleExportPng = useCallback(async () => {
    const dataUrl = await exportToPng();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${title || "diagram"}.png`;
    a.click();
  }, [exportToPng, title]);

  const handleExportPdf = useCallback(async () => {
    const realNodes = nodes.filter(n => !n.id.startsWith("__lane_") && !n.id.startsWith("__rx") && !n.id.startsWith("__rn"));
    if (realNodes.length === 0) return;
    const dataUrl = await exportToPng();
    if (!dataUrl) return;
    const pad = 60;
    const bounds = getNodesBounds(realNodes);
    const pxW = Math.max(bounds.width  + pad * 2, 400);
    const pxH = Math.max(bounds.height + pad * 2, 300);
    const ptW = Math.round(pxW * 0.75);
    const ptH = Math.round(pxH * 0.75);
    const pdf = new jsPDF({ orientation: ptW > ptH ? "landscape" : "portrait", unit: "pt", format: [ptW, ptH] });
    pdf.addImage(dataUrl, "PNG", 0, 0, ptW, ptH);
    pdf.save(`${title || "diagram"}.pdf`);
  }, [nodes, exportToPng, title]);

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

  // ── Node properties panel handlers ──────────────────────────────────────────
  const selectedNodes = nodes.filter(n => n.selected && !n.id.startsWith("__"));
  const singleNode    = selectedNodes.length === 1 ? selectedNodes[0] : null;

  const patchAllSelected = useCallback((dataPatch: Record<string, unknown>) => {
    setNodes(ns => ns.map(n => (n.selected && !n.id.startsWith("__")) ? { ...n, data: { ...n.data, ...dataPatch } } : n));
  }, [setNodes]);

  const handlePanelTypeChange = useCallback((t: string) => {
    if (!singleNode) return;
    const szMap: Record<string, { w: number; h: number }> = {
      terminalNode: SZ.terminal, stepNode: SZ.step, processNode: SZ.process,
      decisionNode: SZ.decision, dataNode: SZ.data, documentNode: SZ.document, noteNode: SZ.note,
    };
    const sz = szMap[t] ?? SZ.process;
    setNodes(ns => ns.map(n => n.id === singleNode.id ? { ...n, type: t, width: sz.w, height: sz.h } : n));
  }, [singleNode, setNodes]);

  const handlePanelColorChange = useCallback((c: string) => patchAllSelected({ color: c }),     [patchAllSelected]);
  const handlePanelFsChange    = useCallback((fs: number) => patchAllSelected({ fontSize: fs }), [patchAllSelected]);
  const handlePanelTcChange    = useCallback((tc: string) => patchAllSelected({ textColor: tc }), [patchAllSelected]);
  const handlePanelDelete      = useCallback(() => {
    if (!singleNode) return;
    const id = singleNode.id;
    pushSnapshot(nodes, edges);
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
  }, [singleNode, nodes, edges, pushSnapshot, setNodes, setEdges]);

  const isDraw = mode === "draw";
  const hasContent = nodes.filter(n => !n.id.startsWith("__lane_")).length > 0;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0d0d12" }}>
      <AppSidebar activeHref="/tools/process-flow" profile={profile} user={user ?? { email: "" }} />
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

          <div style={{ width: 1, height: 20, background: "#1e293b" }} />

          <button onClick={handleExportPng} title="Export PNG" disabled={!hasContent}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: "transparent", border: "1px solid #1e293b", color: hasContent ? "#94a3b8" : "#2d3748", fontSize: 11, fontWeight: 500, cursor: hasContent ? "pointer" : "not-allowed" }}
            onMouseEnter={e => { if (hasContent) { e.currentTarget.style.borderColor = "#5b9bd5"; e.currentTarget.style.color = "#5b9bd5"; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = hasContent ? "#94a3b8" : "#2d3748"; }}>
            <Download size={12} /> PNG
          </button>

          <button onClick={handleExportPdf} title="Export PDF" disabled={!hasContent}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: "transparent", border: "1px solid #1e293b", color: hasContent ? "#94a3b8" : "#2d3748", fontSize: 11, fontWeight: 500, cursor: hasContent ? "pointer" : "not-allowed" }}
            onMouseEnter={e => { if (hasContent) { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = hasContent ? "#94a3b8" : "#2d3748"; }}>
            <Download size={12} /> PDF
          </button>

          <button
            title="Copy selected (Ctrl+C) then paste (Ctrl+V)"
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, background: "transparent", border: "1px solid #1e293b", color: "#475569", fontSize: 11, fontWeight: 500, cursor: "default" }}>
            <Copy size={12} /> Copy / Paste
          </button>
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left panel */}
          <div style={{ width: 280, flexShrink: 0, borderRight: "1px solid #1e1e2e", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {mode === "draw"       && <Palette />}
            {mode === "generate"   && <GeneratePanel onGenerate={handleGenerate} onClear={handleClear} generating={generating} hasContent={hasContent} />}
            {mode === "structured" && <StructuredPanel title={title} setTitle={setTitle} steps={steps} setSteps={setSteps} onBuild={handleBuildFromForm} />}
          </div>

          {/* Canvas — always mounted */}
          <div ref={wrapperRef} style={{ flex: 1, position: "relative" }}>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={isDraw ? onDrop : undefined}
              onDragOver={isDraw ? onDragOver : undefined}
              onNodeDragStop={onNodeDragStop}
              nodeTypes={nodeTypes}
              snapToGrid={snapToGrid && isDraw} snapGrid={[16, 16]}
              deleteKeyCode={null}
              nodesDraggable nodesConnectable edgesUpdatable
              connectionMode={"loose" as never}
              elementsSelectable
              fitView fitViewOptions={{ padding: 0.18 }}
              minZoom={0.05} maxZoom={3}
              proOptions={{ hideAttribution: true }}
              style={{ background: "#f8fafc" }}
            >
              <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={20} size={1} />
              <Controls showInteractive={false} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} />
            </ReactFlow>
          </div>

          {/* Right properties panel — always visible */}
          <div style={{ width: 200, flexShrink: 0, borderLeft: "1px solid #1e1e2e", background: "#09090b", overflowY: "auto" }}>
            {selectedNodes.length === 0
              ? <div style={{ padding: "20px 14px", color: "#334155", fontSize: 11, lineHeight: 1.7 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1e293b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Properties</div>
                  Click a node to edit it.<br />
                  Hold Shift to select multiple nodes and change their colour or font size all at once.
                </div>
              : <NodePropertiesPanel
                  node={singleNode ?? selectedNodes[0]}
                  multiCount={selectedNodes.length > 1 ? selectedNodes.length : undefined}
                  onClose={() => setNodes(ns => ns.map(n => ({ ...n, selected: false })))}
                  onTypeChange={handlePanelTypeChange}
                  onColorChange={handlePanelColorChange}
                  onFontSizeChange={handlePanelFsChange}
                  onTextColorChange={handlePanelTcChange}
                  onDelete={handlePanelDelete}
                />
            }
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ProcessFlowClient({ profile, user }: { profile: Profile | null; user: { email: string } | null }) {
  return (
    <ReactFlowProvider>
      <FlowInner profile={profile} user={user} />
    </ReactFlowProvider>
  );
}
