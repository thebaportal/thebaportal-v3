import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, LevelFormat,
} from "docx";

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

  const { template, fullName, jobTarget, yearsExp, certifications, attempts, badges, skills, progress } = await req.json();

  const templateDesc: Record<string, string> = {
    technical: "Technical BA who bridges business and IT — writes detailed functional specs, leads UAT, and works daily with development teams.",
    operational: "Operational BA focused on process improvement, efficiency gains, and organisational change management.",
    strategic: "Strategic BA operating at portfolio and enterprise level — advises on investment cases, operating models, and business direction.",
  };

  const attemptsStr = (attempts || []).slice(0, 6).map((a: { challenge_title: string; challenge_type: string; industry: string; total_score: number; difficulty_mode: string }) =>
    `- ${a.challenge_title} (Type: ${a.challenge_type}, Industry: ${a.industry}, Score: ${a.total_score}/100, Difficulty: ${a.difficulty_mode})`
  ).join("\n") || "No simulations completed yet.";

  const badgeNames = (badges || []).map((b: { badge_name: string }) => b.badge_name).join(", ") || "None";

  const userPrompt = `You are an expert BA career coach and professional CV writer. Write tailored resume content for a ${template} BA profile.

CANDIDATE PROFILE:
Name: ${fullName}
Target role: ${jobTarget || "Business Analyst"}
Years of experience: ${yearsExp || "Not specified"}
Certifications held: ${certifications || "None stated"}
BA level: ${progress?.ba_level || "Associate"}
Challenges completed: ${progress?.challenges_completed || 0}
Average score: ${progress?.avg_score || 0}/100
Skill scores — Elicitation: ${skills?.elicitation || 0}%, Requirements: ${skills?.requirements || 0}%, Solution Analysis: ${skills?.solutionAnalysis || 0}%, Stakeholder Management: ${skills?.stakeholderMgmt || 0}%

Template specialisation: ${templateDesc[template] || templateDesc.technical}

VERIFIED PRACTICE SIMULATIONS COMPLETED:
${attemptsStr}

ACHIEVEMENTS EARNED: ${badgeNames}

Return ONLY valid JSON — no markdown, no commentary outside the JSON:
{
  "professionalSummary": "<3-4 punchy sentences. Specific to the ${template} specialisation. Mention years of experience. No clichés like 'passionate' or 'results-driven'. Open strong.>",
  "coreCompetencies": ["<12 specific competencies relevant to ${template} BA — mix hard and soft skills, use industry-standard BA terminology>"],
  "keyAchievements": [
    "<5 strong achievement bullets — action verb + what you did + implied or explicit outcome. Reference challenge types where relevant.>"
  ],
  "methodologyApproach": "<2-3 sentences on their analytical and delivery approach, tailored to ${template} specialisation. Reference frameworks like BABOK, Agile, BPMN, or relevant ones.>",
  "professionalDevelopment": ["<3 items demonstrating continuous learning — reference challenge types, industries, or certifications mentioned>"]
}`;

  try {
    const response = await ai.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const c = JSON.parse(jsonMatch[0]);

    const today = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

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
          // Role line
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: jobTarget || "Business Analyst", size: 26, color: MID, italics: true, font: "Calibri" })],
          }),
          // Certifications / contact line
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({
              text: [certifications, "TheBAPortal.com"].filter(Boolean).join("  |  "),
              size: 18, color: MID, font: "Calibri",
            })],
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

          // Methodology
          sectionHead("Methodology & Approach"),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: c.methodologyApproach, size: 21, font: "Calibri" })],
          }),

          // Professional Development
          sectionHead("Professional Development"),
          ...(c.professionalDevelopment || []).map(bullet),

          // Certifications section
          ...(certifications ? [
            sectionHead("Certifications & Credentials"),
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: certifications, size: 20, font: "Calibri" })],
            }),
          ] : []),

          // Footer note
          new Paragraph({
            spacing: { before: 320 },
            border: { top: { color: "e2e8f0", size: 4, style: BorderStyle.SINGLE, space: 4 } },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: `Portfolio of verified BA work: thebaportal.com/portfolio  |  ${progress?.challenges_completed || 0} simulations  |  Avg score ${progress?.avg_score || 0}/100  |  ${today}`,
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
        "Content-Disposition": `attachment; filename="${safeName}_BA_Resume.docx"`,
      },
    });
  } catch (err) {
    console.error("Resume generation error:", err);
    return Response.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
