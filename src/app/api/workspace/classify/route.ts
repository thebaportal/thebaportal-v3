import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a content classifier for a Business Analyst platform. Read what the user pasted and identify what it is. Then suggest the 2-3 most useful things they can do with it.

Available actions and their hex colours:
- problem-analyzer (#1fbf9f): Diagnose a business problem, identify root causes and impact
- requirements-analyzer (#34d399): Extract structured requirements from notes, emails, transcripts
- stakeholder-analyzer (#facc15): Map people who influence a project or change
- process-analyzer (#38bdf8): Map and improve a business process or workflow
- user-story-generator (#a78bfa): Convert requirements into developer-ready user stories
- document-generator-brd (#fb923c): Build a Business Requirements Document
- career (#f472b6): Resume review, career advice, interview prep, job matching — route to Career Suite

Classification rules:
- Resume or CV → primary: career
- Meeting notes, workshop output, email thread, interview transcript → primary: requirements-analyzer
- Business problem, complaint, "why is this happening", incident → primary: problem-analyzer
- Process steps, workflow, "how we do X", as-is description → primary: process-analyzer
- Requirements list, feature request, user needs → primary: requirements-analyzer then user-story-generator
- Project brief, investment request → primary: problem-analyzer then document-generator-brd
- Stakeholder list, org chart, politics → primary: stakeholder-analyzer
- If genuinely unclear → default to problem-analyzer

Return ONLY valid JSON. No explanation. No markdown. Just the JSON object:
{
  "contentType": "short label — what this content IS (e.g. Resume, Meeting notes, Business problem, Process description, Requirements list, Project brief, Email, Case study)",
  "summary": "One sentence — what is this content about?",
  "projectName": "3-6 word professional project name derived from the content — e.g. 'Customer Onboarding Transformation', 'KYC Process Review', 'Digital Banking Migration'. Use null for personal or career content like a resume.",
  "suggestions": [
    {
      "id": "tool-id",
      "label": "4-6 word action label",
      "desc": "One line — what will happen when they pick this",
      "color": "#hexcolor",
      "primary": true
    }
  ]
}`;

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text.slice(0, 3000) }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    const result = JSON.parse(match[0]);

    // Ensure suggestions array exists and has primary set
    if (!Array.isArray(result.suggestions) || result.suggestions.length === 0) {
      throw new Error("No suggestions returned");
    }
    if (!result.suggestions.some((s: { primary?: boolean }) => s.primary)) {
      result.suggestions[0].primary = true;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Classify error:", error);
    // Fallback to safe default
    return NextResponse.json({
      contentType: "Content",
      summary: "Let's figure out the best way to analyse this.",
      suggestions: [
        { id: "problem-analyzer", label: "Analyse the problem", desc: "Identify root causes and business impact", color: "#1fbf9f", primary: true },
        { id: "requirements-analyzer", label: "Extract requirements", desc: "Structure what needs to change", color: "#34d399" },
      ],
    });
  }
}
