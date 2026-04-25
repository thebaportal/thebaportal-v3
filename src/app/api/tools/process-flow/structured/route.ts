import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const STRUCTURED_PROMPT = `You are DiagramForge Structured Mode.

You are given a structured process definition — a title and an ordered list of steps. Each step has:
- id: unique identifier
- action: the step label
- actor: who performs it (may be empty)
- isDecision: true if this is a yes/no gate
- yesBranch: target step id for "yes" path (empty = next step in sequence, "end" = End node)
- yesLabel: label for the yes edge (default "Yes")
- noBranch: target step id for "no" path (empty = End node)
- noLabel: label for the no edge (default "No")

Your job:
- Convert this exactly into a process flow diagram JSON
- Do NOT reinterpret the logic — follow step order and branch targets exactly
- Use correct node types: terminalNode (Start/End only), stepNode (actions), decisionNode (decisions)
- A decisionNode "yes" edge uses sourceHandle "yes"; a "no" edge uses sourceHandle "no"
- Keep all action labels as given — do not shorten or rewrite them

Return ONLY valid JSON using this schema:

{
  "nodes": [
    { "id": "start", "type": "terminalNode", "label": "Start" },
    { "id": "s1", "type": "stepNode", "label": "Step label", "actor": "Actor" },
    { "id": "d1", "type": "decisionNode", "label": "Decision?" },
    { "id": "end", "type": "terminalNode", "label": "End" }
  ],
  "edges": [
    { "source": "start", "target": "s1" },
    { "source": "s1", "target": "d1" },
    { "source": "d1", "target": "s2", "sourceHandle": "yes", "label": "Yes" },
    { "source": "d1", "target": "end", "sourceHandle": "no", "label": "No" },
    { "source": "s2", "target": "end" }
  ]
}

No markdown, no code fences, no explanation — JSON only.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.steps) return new NextResponse("steps required", { status: 400 });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: STRUCTURED_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(body) }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-flow/structured]", msg);
    return new NextResponse(`Structured failed: ${msg}`, { status: 500 });
  }
}
