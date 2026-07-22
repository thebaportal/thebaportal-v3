import { getCareerUser } from "@/lib/career-auth";
import { Document, Paragraph, TextRun, AlignmentType, Packer, BorderStyle } from "docx";

export const runtime = "nodejs";

type LineKind = "name" | "contact" | "section" | "job_header" | "date" | "bullet" | "text" | "empty";

function classify(lines: string[]): { text: string; kind: LineKind }[] {
  let nameFound = false;
  let contactFound = false;

  return lines.map(raw => {
    const t = raw.trim();
    if (!t) return { text: "", kind: "empty" };

    if (!nameFound) {
      nameFound = true;
      return { text: t, kind: "name" };
    }

    if (!contactFound && (t.includes("@") || (t.includes("|") && !t.startsWith("•") && t.length < 140))) {
      contactFound = true;
      return { text: t, kind: "contact" };
    }

    // ALL CAPS section header (letters, spaces, &, /, -)
    if (/^[A-Z][A-Z\s&\/\-]+$/.test(t) && t.length >= 4 && t.length <= 50) {
      return { text: t, kind: "section" };
    }

    // Bullet
    if (t.startsWith("•") || (t.startsWith("- ") && t.length > 3)) {
      return { text: t.replace(/^[•\-]\s*/, ""), kind: "bullet" };
    }

    // Pipe-separated job header
    if (t.includes("|") && !t.startsWith("•")) {
      const parts = t.split("|").map(p => p.trim());
      if (parts.length >= 2 && parts.every(p => p.length < 70)) {
        return { text: t, kind: "job_header" };
      }
    }

    // Date line
    if (
      /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i.test(t) ||
      /\b\d{4}\s*[–—-]\s*(Present|\d{4})/i.test(t)
    ) {
      return { text: t, kind: "date" };
    }

    return { text: t, kind: "text" };
  });
}

async function buildResume(text: string): Promise<Buffer> {
  const classified = classify(text.split(/\r?\n/));
  const paragraphs: Paragraph[] = [];

  for (const { text: t, kind } of classified) {
    if (kind === "empty") {
      paragraphs.push(new Paragraph({ text: "", spacing: { after: 60 } }));
      continue;
    }

    if (kind === "name") {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: t, bold: true, size: 36, color: "0f172a" })],
      }));
      continue;
    }

    if (kind === "contact") {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1", space: 6 } },
        children: [new TextRun({ text: t, size: 18, color: "64748b" })],
      }));
      continue;
    }

    if (kind === "section") {
      paragraphs.push(new Paragraph({
        spacing: { before: 220, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "0f766e", space: 4 } },
        children: [new TextRun({ text: t, bold: true, size: 20, color: "0f766e", allCaps: true })],
      }));
      continue;
    }

    if (kind === "job_header") {
      const parts = t.split("|").map(p => p.trim());
      const runs: TextRun[] = [];
      parts.forEach((p, i) => {
        if (i > 0) runs.push(new TextRun({ text: "  ·  ", size: 20, color: "94a3b8" }));
        runs.push(new TextRun({ text: p, bold: i === 0, size: 20, color: i === 0 ? "0f172a" : "475569" }));
      });
      paragraphs.push(new Paragraph({ spacing: { before: 120, after: 20 }, children: runs }));
      continue;
    }

    if (kind === "date") {
      paragraphs.push(new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: t, italics: true, size: 18, color: "64748b" })],
      }));
      continue;
    }

    if (kind === "bullet") {
      paragraphs.push(new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360, hanging: 280 },
        children: [
          new TextRun({ text: "•  ", size: 20, color: "0f766e" }),
          new TextRun({ text: t, size: 20, color: "0f172a" }),
        ],
      }));
      continue;
    }

    paragraphs.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: t, size: 20, color: "0f172a" })],
    }));
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1224, right: 1224 } } },
      children: paragraphs,
    }],
  });

  return Packer.toBuffer(doc);
}

async function buildCoverLetter(text: string): Promise<Buffer> {
  const blocks = text.split(/\n{2,}/).filter(Boolean);

  const paragraphs = blocks.map(block =>
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: block.replace(/\n/g, " ").trim(), size: 22, color: "0f172a" })],
    })
  );

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1584, right: 1584 } } },
      children: paragraphs,
    }],
  });

  return Packer.toBuffer(doc);
}

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return new Response("Unauthorised", { status: 401 });

  const { text, type, fileName } = await req.json();
  if (!text?.trim()) return new Response("No text provided", { status: 400 });

  const buffer = type === "cover_letter"
    ? await buildCoverLetter(text as string)
    : await buildResume(text as string);

  const name = (fileName as string) || (type === "cover_letter" ? "cover-letter.docx" : "resume.docx");

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
