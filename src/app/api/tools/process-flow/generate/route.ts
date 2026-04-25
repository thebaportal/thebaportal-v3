import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a business process analyst. Convert the user's plain-English process description into a compact flow diagram.

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

HARD LIMITS — violating these will produce an unusable diagram:
1. Maximum 10 nodes total (including Start and End). If the process has more steps, group related steps into a single named phase node (e.g. "Process documents" covers 4 sub-steps).
2. Maximum 3 decisionNodes. Collapse multiple related decisions into one if needed.
3. Every branch from a decisionNode MUST reconnect to the main flow or go directly to "end". No dangling paths.
4. No long back-loops that skip many steps — if a retry loops back, go to the nearest relevant step only.
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

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();
    if (!description?.trim()) return new NextResponse("description required", { status: 400 });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: description.trim() }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-flow/generate]", msg);
    return new NextResponse(`Generate failed: ${msg}`, { status: 500 });
  }
}
