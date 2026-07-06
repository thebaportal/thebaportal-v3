import { getCareerUser } from "@/lib/career-auth";
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
} from "docx";

export const maxDuration = 15;

const DARK = "1e2d3d";
const MID = "475569";

function spacer(after = 200): Paragraph {
  return new Paragraph({ spacing: { after } });
}

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { opening, body1, body2, closing, jobTitle, company, fullName } = await req.json();

  if (!opening || !body1 || !body2 || !closing) {
    return Response.json({ error: "Letter content is required." }, { status: 400 });
  }

  try {
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
            children: [new TextRun({ text: company || "Company Name", size: 20, color: MID, font: "Calibri" })],
          }),
          spacer(320),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: "Dear Hiring Manager,", size: 22, font: "Calibri", color: DARK })],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({
              text: `Re: Application for ${jobTitle || "Business Analyst"}`,
              bold: true, size: 22, font: "Calibri", color: DARK,
            })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: opening, size: 22, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: body1, size: 22, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: body2, size: 22, font: "Calibri" })],
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: closing, size: 22, font: "Calibri" })],
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
    const namePrefix = (fullName || "").replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
    const filename = namePrefix ? `${namePrefix}_Cover_Letter.docx` : "Cover_Letter.docx";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Cover letter export error:", err);
    return Response.json({ error: "Could not export cover letter. Please try again." }, { status: 500 });
  }
}
