import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const GENERATE_PROMPT = `You are DiagramForge, a senior Business Process Analyst expert at creating clean, professional standard process flow diagrams (flowcharts only -- no swimlanes).

STRICT RULE (never break this):
Base the ENTIRE diagram EXCLUSIVELY on the description in the user's current message. Ignore every previous conversation, every example, and every prior diagram. Do not add or invent any steps that are not explicitly mentioned.

CRITICAL PROCESS (do this internally first):
1. Carefully read the full user description.
2. Clean up and reorganize the messy bullets into a clear, logical end-to-end sequence. Remove duplicates and fix fragmented steps.
3. Identify every decision point and create proper branches.
4. Keep the main success path as straight and clean as possible.
5. Map each step to the correct node type: start, end, process, decision, data, or document.

DECISION DETECTION:
- Create a decision node whenever the description contains "if", "whether", "depends on", "checks", "verifies", "reviews", "approves", or any conditional/branching logic.
- Label outgoing edges clearly: "Yes" / "No", "Approved" / "Rejected", "Pass" / "Fail", or equivalent domain terms.

LAYOUT RULE:
Return reasonable placeholder position values only. The frontend will run dagre auto-layout afterward for final polished spacing and alignment. You are responsible only for clean logic and structure.

JSON SCHEMA (strict -- no swimlanes):
{
  "title": "string",
  "nodes": [
    {
      "id": "string",
      "type": "start | process | decision | end | data | document",
      "data": {
        "label": "string",
        "description": "string"
      },
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "string",
      "target": "string",
      "label": "string",
      "animated": false
    }
  ]
}

Node id rules:
- Start node id must be "start"
- End node id must be "end"
- All other ids must be unique short strings (n1, n2, d1, d2, etc.)

HARD LIMITS:
1. Maximum 10 nodes total (including start and end). Group related steps into a single phase node if needed.
2. Maximum 3 decision nodes. Collapse multiple related decisions into one if needed.
3. Every branch from a decision MUST reconnect to the main flow or go to "end". No dangling paths.
4. No long back-loops that skip many steps -- retry loops go to the nearest relevant step only.
5. Keep labels under 6 words.

OUTPUT FORMAT:
Return ONLY the raw valid JSON object above. No markdown, no explanation, no summary text, no extra words whatsoever.`;

const REPAIR_PROMPT = `You are DiagramForge Repair Mode.

You are given a JSON diagram that failed validation, along with the specific errors found.

The schema uses:
- node.data.label (NOT node.label) for all node labels
- node types: "start", "end", "process", "decision", "data", "document"
- node id "start" for the Start node, "end" for the End node
- no lanes, no laneId

Fix ONLY the structural issues listed. Do not change business logic unless a fix requires it.

Rules:
- Make all node ids unique
- Ensure every edge source and target references a valid node id
- Ensure every node has a non-empty data.label
- Remove orphan nodes (no connected edges) unless they are "start" or "end"
- Ensure every decision branch reconnects to the main flow or goes to "end"

Return ONLY valid JSON matching the original schema. No markdown, no code fences, no explanation.`;

interface RawNode { id?: string; type?: string; label?: string; data?: { label?: string }; laneId?: string; }
interface RawEdge { source?: string; target?: string; }
interface DiagramData { title?: string; nodes: RawNode[]; edges: RawEdge[]; }

function validate(data: DiagramData): string[] {
  const errs: string[] = [];
  const { nodes = [], edges = [] } = data;
  const nodeIds = new Set<string>();

  for (const n of nodes) {
    if (!n.id)             { errs.push("node missing id"); continue; }
    if (nodeIds.has(n.id)) errs.push(`duplicate node id: ${n.id}`);
    nodeIds.add(n.id);
    const lbl = n.data?.label ?? n.label;
    if (!lbl?.trim())      errs.push(`node ${n.id} has empty label`);
  }

  for (const e of edges) {
    if (!e.source || !nodeIds.has(e.source)) errs.push(`edge has unknown source: ${e.source ?? "undefined"}`);
    if (!e.target || !nodeIds.has(e.target)) errs.push(`edge has unknown target: ${e.target ?? "undefined"}`);
  }

  const connected = new Set<string>();
  edges.forEach(e => { if (e.source) connected.add(e.source); if (e.target) connected.add(e.target); });
  nodes.forEach(n => {
    if (n.id && n.id !== "start" && n.id !== "end" && !connected.has(n.id))
      errs.push(`orphan node: ${n.id}`);
  });

  return errs;
}

function extractJSON(raw: string): string {
  const stripped = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  if (stripped.startsWith("{")) return stripped;
  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) return stripped.slice(start, end + 1);
  return stripped;
}

async function callAI(system: string, userContent: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userContent }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return extractJSON(raw);
}

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();
    if (!description?.trim()) return new NextResponse("description required", { status: 400 });

    let clean = await callAI(GENERATE_PROMPT, description.trim());
    let parsed: DiagramData = JSON.parse(clean);

    const errs = validate(parsed);
    if (errs.length > 0) {
      console.warn("[process-flow/generate] validation errors, running repair:", errs);
      clean = await callAI(REPAIR_PROMPT, JSON.stringify({ diagram: parsed, errors: errs }, null, 2));
      parsed = JSON.parse(clean);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-flow/generate]", msg);
    return new NextResponse(`Generate failed: ${msg}`, { status: 500 });
  }
}
