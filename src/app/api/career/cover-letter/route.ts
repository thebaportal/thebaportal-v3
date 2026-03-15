import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
} from "docx";

export const maxDuration = 26;
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

  const { resumeText, jdText, questions, answers, fullName } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text is required." }, { status: 400 });
  }
  if (!jdText || jdText.trim().length < 50) {
    return Response.json({ error: "Job description is required." }, { status: 400 });
  }

  const qaBlock = (questions as string[])
    .map((q: string, i: number) => `Q: ${q}\nA: ${(answers as string[])[i] || "(no answer)"}`)
    .join("\n\n");

  // Extract job title and company from JD text (best effort)
  const jdLines = jdText.split("\n").slice(0, 5).join(" ");

  const prompt = `You are a senior BA career coach writing a cover letter for a client. Use the resume, job description, and coaching answers to write a cover letter that feels personal, credible, and targeted — not like a template.

RESUME:
${resumeText.slice(0, 2500)}

JOB DESCRIPTION:
${jdText.slice(0, 1500)}

COACHING ANSWERS (use these to personalise the letter):
${qaBlock}

Write a strong four-paragraph cover letter. Rules:
- Do NOT start with "I am writing to apply for"
- Every paragraph must earn its place — no filler
- Use specific language from both their resume and the JD
- Sound like a confident professional, not a textbook
- Reference their actual experience, not hypothetical skills

Return ONLY valid JSON — no text outside it:
{
  "jobTitle": "<job title from the JD>",
  "company": "<company name from the JD, or 'the organisation' if unclear>",
  "opening": "<First paragraph — hook that immediately shows value and fit. 3-4 sentences.>",
  "body1": "<Second paragraph — most relevant experience directly mapped to the role's core need. Be specific. 3-4 sentences.>",
  "body2": "<Third paragraph — a second strength or achievement that adds dimension. Use coaching answers. 3-4 sentences.>",
  "closing": "<Fourth paragraph — confident close, genuine interest, clear call to action. 2-3 sentences. No sycophancy.>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
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
          new Paragraph({
            spacing: { after: 320 },
            children: [new TextRun({ text: today, size: 20, color: MID, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: "Hiring Manager", bold: true, size: 22, color: DARK, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: c.company || "Company Name", size: 20, color: MID, font: "Calibri" })],
          }),
          spacer(320),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: "Dear Hiring Manager,", size: 22, font: "Calibri", color: DARK })],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({
              text: `Re: Application for ${c.jobTitle || "Business Analyst"}`,
              bold: true, size: 22, font: "Calibri", color: DARK,
            })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: c.opening, size: 22, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: c.body1, size: 22, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: c.body2, size: 22, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: c.closing, size: 22, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: "Yours sincerely,", size: 22, font: "Calibri" })],
          }),
          spacer(400),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: fullName || "Your Name", bold: true, size: 22, font: "Calibri", color: DARK })],
          }),
          new Paragraph({
            spacing: { before: 480 },
            alignment: AlignmentType.CENTER,
            border: { top: { color: "e2e8f0", size: 4, style: BorderStyle.SINGLE, space: 4 } },
            children: [new TextRun({
              text: "Written with TheBAPortal career coaching",
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
    console.error("Cover letter error:", err);
    return Response.json({ error: "Could not generate cover letter. Please try again." }, { status: 500 });
  }
}
