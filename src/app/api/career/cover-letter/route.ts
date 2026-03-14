import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle, LevelFormat,
} from "docx";

const ai = new Anthropic();
const DARK = "1e2d3d";
const MID = "475569";

function spacer(after = 200): Paragraph {
  return new Paragraph({ spacing: { after } });
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { jobTitle, company, tone, fullName, selectedAttempts, badges, progress, skills } = await req.json();

  const toneDesc: Record<string, string> = {
    professional: "Formal and polished — appropriate for corporate or government roles.",
    conversational: "Warm but credible — confident without being stiff. Good for mid-market or startup roles.",
    executive: "Assertive and direct — written for senior roles. Opens with impact, closes with authority.",
  };

  const attemptsStr = (selectedAttempts || []).map((a: { challenge_title: string; challenge_type: string; total_score: number; industry: string }) =>
    `- ${a.challenge_title} (${a.challenge_type} in ${a.industry}, scored ${a.total_score}/100)`
  ).join("\n") || "No specific challenges selected.";

  const badgeStr = (badges || []).map((b: { badge_name: string }) => b.badge_name).join(", ") || "None";

  const userPrompt = `You are an expert BA career coach writing a cover letter for a business analyst. Write in this tone: ${toneDesc[tone] || toneDesc.professional}

ROLE APPLIED FOR: ${jobTitle || "Business Analyst"}
COMPANY: ${company || "the organisation"}
CANDIDATE NAME: ${fullName}
BA LEVEL: ${progress?.ba_level || "Associate"}
CHALLENGES COMPLETED: ${progress?.challenges_completed || 0} (avg score ${progress?.avg_score || 0}/100)
SKILLS: Elicitation ${skills?.elicitation || 0}%, Requirements ${skills?.requirements || 0}%, Solution Analysis ${skills?.solutionAnalysis || 0}%, Stakeholder Management ${skills?.stakeholderMgmt || 0}%

SELECTED CHALLENGE EVIDENCE TO USE:
${attemptsStr}

BADGES EARNED: ${badgeStr}

Write a compelling cover letter with four distinct paragraphs. Return ONLY valid JSON:
{
  "opening": "<First paragraph — hook that immediately signals value to the employer. Connect their likely needs to the candidate's specific expertise. Do NOT start with 'I am writing to apply'. 3-4 sentences.>",
  "evidence1": "<Second paragraph — use the first challenge simulation as a specific, concrete proof point of capability. Reference the challenge type and what was demonstrated. 3-4 sentences.>",
  "evidence2": "<Third paragraph — use the second challenge or the candidate's badge/skill profile as additional evidence. Show range or depth. 3-4 sentences.>",
  "closing": "<Fourth paragraph — confident close. Express genuine interest in this specific role/company. Include a clear CTA. Do not be sycophantic. 2-3 sentences.>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const c = JSON.parse(jsonMatch[0]);

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const doc = new Document({
      numbering: { config: [] },
      sections: [{
        properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
        children: [
          // Date
          new Paragraph({
            spacing: { after: 320 },
            children: [new TextRun({ text: today, size: 20, color: MID, font: "Calibri" })],
          }),

          // Hiring manager
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: "Hiring Manager", bold: true, size: 22, color: DARK, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: company || "Company Name", size: 20, color: MID, font: "Calibri" })],
          }),
          spacer(320),

          // Salutation
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: `Dear Hiring Manager,`, size: 22, font: "Calibri", color: DARK })],
          }),

          // Subject line
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({
              text: `Re: Application for ${jobTitle || "Business Analyst"}`,
              bold: true, size: 22, font: "Calibri", color: DARK,
            })],
          }),

          // Opening paragraph
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: c.opening, size: 22, font: "Calibri" })],
          }),

          // Evidence paragraph 1
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: c.evidence1, size: 22, font: "Calibri" })],
          }),

          // Evidence paragraph 2
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: c.evidence2, size: 22, font: "Calibri" })],
          }),

          // Closing
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: c.closing, size: 22, font: "Calibri" })],
          }),

          // Sign off
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: "Yours sincerely,", size: 22, font: "Calibri" })],
          }),
          spacer(400),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: fullName || "Your Name", bold: true, size: 22, font: "Calibri", color: DARK })],
          }),

          // Footer
          new Paragraph({
            spacing: { before: 480 },
            alignment: AlignmentType.CENTER,
            border: { top: { color: "e2e8f0", size: 4, style: BorderStyle.SINGLE, space: 4 } },
            children: [new TextRun({
              text: `Portfolio: thebaportal.com/portfolio  |  ${progress?.challenges_completed || 0} BA simulations completed  |  Avg score ${progress?.avg_score || 0}/100`,
              size: 16, color: "94a3b8", italics: true, font: "Calibri",
            })],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeName = (fullName || "CoverLetter").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}_Cover_Letter.docx"`,
      },
    });
  } catch (err) {
    console.error("Cover letter generation error:", err);
    return Response.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
