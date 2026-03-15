import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, LevelFormat,
} from "docx";

export const maxDuration = 26;
const ai = new Anthropic();

const DARK = "1e2d3d";
const ACCENT = "1d4ed8";
const MID = "475569";

function hr(color = "cbd5e1"): Paragraph {
  return new Paragraph({
    border: { bottom: { color, size: 6, style: BorderStyle.SINGLE, space: 4 } },
    spacing: { after: 160 },
  });
}

function sectionHead(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: DARK, font: "Calibri" }),
    ],
    border: { bottom: { color: ACCENT, size: 8, style: BorderStyle.SINGLE, space: 3 } },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 20, font: "Calibri" })],
  });
}

function competencyTable(items: string[]): Table {
  const mid = Math.ceil(items.length / 2);
  const col1 = items.slice(0, mid);
  const col2 = items.slice(mid);
  const rowCount = Math.max(col1.length, col2.length);
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: Array.from({ length: rowCount }, (_, i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: col1[i] ? `\u2022  ${col1[i]}` : "", size: 20, font: "Calibri" })],
            })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: col2[i] ? `\u2022  ${col2[i]}` : "", size: 20, font: "Calibri" })],
            })],
          }),
        ],
      })
    ),
  });
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

  const { resumeText, questions, answers, fullName } = await req.json();
  if (!resumeText || resumeText.length < 100) {
    return Response.json({ error: "Resume text is required." }, { status: 400 });
  }

  const qaBlock = (questions as string[])
    .map((q: string, i: number) => `Q: ${q}\nA: ${(answers as string[])[i] || "(no answer)"}`)
    .join("\n\n");

  const prompt = `You are a senior BA career coach and professional resume writer. Your job is to take a client's existing resume and improve it using additional context they've provided through a coaching conversation.

ORIGINAL RESUME:
${resumeText.slice(0, 4000)}

COACHING Q&A (use these answers to fill gaps and strengthen the resume):
${qaBlock}

Rewrite and improve this resume. Keep the person's real experience and career history — don't invent jobs or qualifications they haven't mentioned. Use the coaching answers to:
- Add specific metrics, outcomes, and results where they were vague
- Replace weak bullet points with strong action + result statements
- Surface achievements they undersold or left out
- Add tools, technologies, or methodologies they mentioned in their answers
- Sharpen the professional summary to reflect their actual target and strength

Write like a real resume writer, not a template filler. Use confident, direct language. Every bullet should earn its place.

Return ONLY valid JSON — no text outside it:
{
  "professionalSummary": "<3-4 sentences. Specific, confident, no clichés. Reflects their actual background and target.>",
  "coreCompetencies": ["<10-12 specific competencies — mix of hard skills, tools, and BA techniques>"],
  "experienceBullets": {
    "<Job Title at Company>": [
      "<strong bullet — action verb + what you did + result/impact>",
      "<another bullet>"
    ]
  },
  "keyAchievements": [
    "<5 cross-role achievements that stand out — most impressive results from their career>"
  ],
  "education": "<education details preserved from original resume>",
  "certifications": "<certifications from original resume plus any mentioned in coaching answers>"
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const c = JSON.parse(jsonMatch[0]);

    const experienceSection: Paragraph[] = [];
    if (c.experienceBullets && typeof c.experienceBullets === "object") {
      for (const [role, bullets] of Object.entries(c.experienceBullets)) {
        experienceSection.push(
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [new TextRun({ text: role, bold: true, size: 22, color: DARK, font: "Calibri" })],
          })
        );
        for (const b of (bullets as string[])) {
          experienceSection.push(bullet(b));
        }
      }
    }

    const doc = new Document({
      numbering: {
        config: [{
          reference: "bullets",
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360, hanging: 360 } } },
          }],
        }],
      },
      sections: [{
        properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
        children: [
          // Name
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: fullName || "Your Name", bold: true, size: 60, color: DARK, font: "Calibri" })],
          }),
          hr(ACCENT),

          // Professional Summary
          sectionHead("Professional Summary"),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: c.professionalSummary, size: 21, font: "Calibri" })],
          }),

          // Core Competencies
          sectionHead("Core Competencies"),
          competencyTable(c.coreCompetencies || []),
          new Paragraph({ spacing: { after: 120 } }),

          // Key Achievements
          sectionHead("Key Achievements"),
          ...(c.keyAchievements || []).map(bullet),
          new Paragraph({ spacing: { after: 60 } }),

          // Experience
          ...(experienceSection.length > 0 ? [
            sectionHead("Professional Experience"),
            ...experienceSection,
            new Paragraph({ spacing: { after: 60 } }),
          ] : []),

          // Education
          ...(c.education ? [
            sectionHead("Education"),
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: c.education, size: 20, font: "Calibri" })],
            }),
          ] : []),

          // Certifications
          ...(c.certifications ? [
            sectionHead("Certifications & Professional Development"),
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: c.certifications, size: 20, font: "Calibri" })],
            }),
          ] : []),

          // Footer
          new Paragraph({
            spacing: { before: 320 },
            border: { top: { color: "e2e8f0", size: 4, style: BorderStyle.SINGLE, space: 4 } },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: "Improved with TheBAPortal career coaching",
              size: 16, color: "94a3b8", italics: true, font: "Calibri",
            })],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeName = (fullName || "Resume").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}_Improved_Resume.docx"`,
      },
    });
  } catch (err) {
    console.error("Resume improvement error:", err);
    return Response.json({ error: "Could not improve your resume. Please try again." }, { status: 500 });
  }
}
