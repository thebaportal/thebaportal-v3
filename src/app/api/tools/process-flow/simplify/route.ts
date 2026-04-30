import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM = `You are a business process editor. The user will paste a raw process description — it may be long, messy, repetitive, or contain jargon. Your job is to rewrite it as a clear, concise process description that still captures every distinct step, decision point, and outcome.

Rules:
- Keep ALL decision points (anything with yes/no, approve/reject, pass/fail paths)
- Keep ALL named actors, systems, or departments
- Remove redundancy, filler phrases, and repeated information
- Use plain, direct language — no bullet points, just flowing sentences
- Aim for roughly half the original length without losing meaning
- Do NOT add steps that weren't in the original
- Return ONLY the simplified description, no preamble, no explanation`;

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();
    if (!description?.trim()) return new NextResponse("description required", { status: 400 });

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: description.trim() }],
    });

    const simplified = msg.content[0].type === "text" ? msg.content[0].text.trim() : description;
    return NextResponse.json({ simplified });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[process-flow/simplify]", msg);
    return new NextResponse(`Simplify failed: ${msg}`, { status: 500 });
  }
}
