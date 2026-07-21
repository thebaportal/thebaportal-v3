import { getCareerUser } from "@/lib/career-auth";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, LevelFormat,
} from "docx";

const DARK = "1e2d3d";
const ACCENT = "1d4ed8";

function hr(color = "cbd5e1"): Paragraph {
  return new Paragraph({
    border: { bottom: { color, size: 6, style: BorderStyle.SINGLE, space: 4 } },
    spacing: { after: 160 },
  });
}

function sectionHead(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: DARK, font: "Calibri" })],
    border: { bottom: { color: ACCENT, size: 8, style: BorderStyle.SINGLE, space: 3 } },
  });
}

function bulletPara(text: string): Paragraph {
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
  const nb = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: Array.from({ length: Math.max(col1.length, col2.length) }, (_, i) =>
      new TableRow({
        children: [col1, col2].map(col => new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: { top: nb, bottom: nb, left: nb, right: nb },
          children: [new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: col[i] ? `•  ${col[i]}` : "", size: 20, font: "Calibri" })],
          })],
        })),
      })
    ),
  });
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { sections, name } = await req.json() as { sections: Record<string, any>; name: string };
  if (!sections) return Response.json({ error: "No sections provided." }, { status: 400 });

  const c = sections;
  const experienceSection: Paragraph[] = [];
  if (c.experienceBullets && typeof c.experienceBullets === "object") {
    for (const [role, bullets] of Object.entries(c.experienceBullets as Record<string, string[]>)) {
      experienceSection.push(new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: role, bold: true, size: 22, color: DARK, font: "Calibri" })],
      }));
      for (const b of bullets) experienceSection.push(bulletPara(b));
    }
  }

  const doc = new Document({
    numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } }] }] },
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: name || "Resume", bold: true, size: 60, color: DARK, font: "Calibri" })] }),
        hr(ACCENT),
        sectionHead("Professional Summary"),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: c.professionalSummary || "", size: 21, font: "Calibri" })] }),
        sectionHead("Core Competencies"),
        competencyTable(c.coreCompetencies || []),
        new Paragraph({ spacing: { after: 120 } }),
        ...(c.keyAchievements?.length ? [sectionHead("Key Achievements"), ...(c.keyAchievements as string[]).map(bulletPara), new Paragraph({ spacing: { after: 60 } })] : []),
        ...(experienceSection.length > 0 ? [sectionHead("Professional Experience"), ...experienceSection, new Paragraph({ spacing: { after: 60 } })] : []),
        ...(c.education ? [sectionHead("Education"), new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: c.education, size: 20, font: "Calibri" })] })] : []),
        ...(c.certifications ? [sectionHead("Certifications & Professional Development"), new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: c.certifications, size: 20, font: "Calibri" })] })] : []),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const safeName = (name || "Resume").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}_Improved_Resume.docx"`,
    },
  });
}
