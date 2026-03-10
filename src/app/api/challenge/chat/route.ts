import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { challenge, stakeholder, messages, difficultyMode } = await request.json();

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const difficultyInstructions: Record<string, string> = {
      normal: "You are cooperative and straightforward. You answer questions honestly and directly. You want the BA to succeed.",
      hard: "You are defensive and evasive. You give vague or partial answers, deflect uncomfortable questions, and protect your own department. You reveal real information only when asked very directly and specifically.",
      expert: "You have hidden motives and contradict what other stakeholders have said. You are politically shrewd and domineering. You try to steer the investigation toward conclusions that benefit you. You reveal real information only under sustained, precise questioning.",
    };

    const persona = difficultyInstructions[difficultyMode] || difficultyInstructions.normal;

    const systemPrompt = `You are ${stakeholder.name}, ${stakeholder.role}.

SITUATION:
${challenge.brief.situation}

YOUR PERSONALITY AND BEHAVIOR:
${persona}

RULES:
- Stay in character as ${stakeholder.name} at all times. Never break character.
- Respond as a real professional in a stakeholder meeting — conversational, concise, 2-4 sentences.
- Do not offer information the BA hasn't asked for. Make them dig for it.
- If a question is off-topic or irrelevant, redirect professionally: "That's not really relevant here. Let's stay focused on the business challenge."
- If a question is vague, ask for clarification.
- NEVER say "I don't know how to respond to that" — you are a real person with real knowledge. Always respond in character.
- Never start your response with your own name.`;

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const text = response.content[0].type === "text"
      ? response.content[0].text
      : "Could you clarify what you mean by that?";

    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Chat route error:", error);
    // Always return 200 so the UI doesn't hard-fail
    return NextResponse.json({ response: "I'm having a moment — could you rephrase that?" }, { status: 200 });
  }
}