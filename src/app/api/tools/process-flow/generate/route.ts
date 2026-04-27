import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Description is injected into the system prompt — not passed as a user message.
// This prevents the model from blending the description with conversation history
// in the user turn, which is the root cause of context bleeding.
function buildGeneratePrompt(description: string): string {
  return `You are DiagramForge. Create a 100% literal flowchart from ONLY the text in the "EXACT USER INPUT" section below.

STRICT RULES:
- Do NOT add, remove, summarize, or invent any steps.
- For lines with "→", split into logical process nodes (usually 2-3 nodes per arrow chain, not one node per word).
- Turn any line containing "Decision:" or a clear question into a diamond decision node.
- Keep node labels short, clean, and as close as possible to the original wording.
- Start with a "start" node. End with an "end" node.
- Node id "start" for Start, "end" for End, short unique ids (n1, n2, d1, etc.) for all others.
- Every decision branch must reconnect to the main flow or go to "end". No dangling paths.
- Return x:0, y:0 for all positions.

EXACT USER INPUT (this is the ONLY text you may use):
${description}

JSON SCHEMA (must be exact):
{
  "title": "string",
  "nodes": [
    {
      "id": "string",
      "type": "start | process | decision | end | data | document",
      "data": { "label": "string" },
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

Return ONLY the raw valid JSON. No other text.`;
}

const REPAIR_PROMPT = `You are DiagramForge Repair Mode.

You are given a JSON diagram that failed validation, along with the specific errors found.

The schema uses:
- node.data.label for all node labels
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

    // Description goes in the system prompt — not the user message
    let clean = await callAI(buildGeneratePrompt(description.trim()), "Generate the diagram.");
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
