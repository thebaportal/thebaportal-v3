import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const GENERATE_PROMPT = `You are DiagramForge Generate Mode. Convert the user's plain-English process description into a compact flow diagram.

Return ONLY valid JSON — no markdown, no code fences, no explanation. Use this exact schema:

{
  "nodes": [
    { "id": "start", "type": "terminalNode", "label": "Start" },
    { "id": "n1", "type": "stepNode", "label": "Receive application", "actor": "Clerk" },
    { "id": "n2", "type": "decisionNode", "label": "Complete?" },
    { "id": "n3", "type": "stepNode", "label": "Approve or reject", "actor": "Manager" },
    { "id": "end", "type": "terminalNode", "label": "End" }
  ],
  "edges": [
    { "source": "start", "target": "n1" },
    { "source": "n1", "target": "n2" },
    { "source": "n2", "target": "n3", "sourceHandle": "yes", "label": "Yes" },
    { "source": "n2", "target": "end", "sourceHandle": "no", "label": "No" },
    { "source": "n3", "target": "end" }
  ]
}

DECISION DETECTION — apply these rules aggressively:
- Create a decisionNode whenever the description contains "if", "whether", "depends on", "checks", "verifies", "reviews", or any conditional or branching logic
- Always label outgoing edges clearly: "Yes" / "No", "Approved" / "Rejected", "Pass" / "Fail", or equivalent domain terms
- A decisionNode positive/forward edge MUST use sourceHandle "yes"
- A decisionNode rejection/loop-back edge MUST use sourceHandle "no"

HARD LIMITS — violating these will produce an unusable diagram:
1. Maximum 10 nodes total (including Start and End). Group related steps into a single named phase node if needed.
2. Maximum 3 decisionNodes. Collapse multiple related decisions into one if needed.
3. Every branch from a decisionNode MUST reconnect to the main flow or go directly to "end". No dangling paths.
4. No long back-loops that skip many steps — retry loops go to the nearest relevant step only.
5. Keep labels under 5 words. Include "actor" on stepNodes only when the user names who does the step.

Node types:
- terminalNode: Start and End only (id must be "start" and "end")
- stepNode: any action or phase
- decisionNode: yes/no gate only, label must end with "?"

Edge rules:
- A decisionNode "yes" edge uses sourceHandle "yes"
- A decisionNode "no" edge uses sourceHandle "no"
- All other edges have no sourceHandle field

Never include markdown, backticks, or any text outside the JSON object.`;

const REPAIR_PROMPT = `You are DiagramForge Repair Mode.

You are given a JSON diagram that failed validation, along with the specific errors found.

Fix ONLY the structural issues listed. Do not change business logic unless a fix requires it.

Rules:
- Make all node ids unique
- Ensure every edge source and target references a valid node id
- Ensure every node has a non-empty label
- If lanes exist, ensure every non-terminal node has a valid laneId
- Remove orphan nodes (no connected edges) unless they are "start" or "end"
- Ensure every decisionNode branch reconnects to the main flow or goes to "end"

Return ONLY valid JSON matching the original schema. No markdown, no code fences, no explanation.`;

interface RawNode { id?: string; type?: string; label?: string; laneId?: string; }
interface RawEdge { source?: string; target?: string; }
interface RawLane { id?: string; }
interface DiagramData { nodes: RawNode[]; edges: RawEdge[]; lanes?: RawLane[]; }

function validate(data: DiagramData): string[] {
  const errs: string[] = [];
  const { nodes = [], edges = [], lanes = [] } = data;
  const hasLanes = lanes.length > 0;
  const laneIds = new Set(lanes.map(l => l.id).filter(Boolean) as string[]);
  const nodeIds = new Set<string>();

  for (const n of nodes) {
    if (!n.id)              { errs.push("node missing id"); continue; }
    if (nodeIds.has(n.id))  errs.push(`duplicate node id: ${n.id}`);
    nodeIds.add(n.id);
    if (!n.label?.trim())   errs.push(`node ${n.id} has empty label`);
    if (hasLanes && n.type !== "terminalNode" && !laneIds.has(n.laneId ?? ""))
      errs.push(`node ${n.id} missing valid laneId`);
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

async function callAI(system: string, userContent: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: userContent }],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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
