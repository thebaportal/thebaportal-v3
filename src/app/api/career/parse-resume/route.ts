import { getCareerUser } from "@/lib/career-auth";

export const runtime = "nodejs";
export const maxDuration = 26;

export async function POST(req: Request) {
  const user = await getCareerUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  let fileName = "(unknown)";
  let fileSize = 0;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file received. Please select a file and try again." }, { status: 400 });
    }

    fileName = file.name;
    fileSize = file.size;
    const name = file.name.toLowerCase();

    console.log(`[parse-resume] file="${fileName}" size=${fileSize} type="${file.type}"`);

    if (fileSize > 10 * 1024 * 1024) {
      return Response.json({ error: "That file is too large. Please upload a resume under 10 MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let text = "";

    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      console.log("[parse-resume] parsing as Word document");
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        console.log(`[parse-resume] mammoth extracted ${text.length} chars`);
      } catch (mammothErr) {
        console.error("[parse-resume] mammoth error:", mammothErr);
        return Response.json({
          error: "We could not read that Word document. Please make sure it is a valid .docx file and try again.",
        }, { status: 422 });
      }
    } else if (name.endsWith(".pdf")) {
      console.log("[parse-resume] parsing as PDF");
      try {
        const { PDFParse } = await import("pdf-parse");
        // Explicitly pass Uint8Array — pdfjs-dist expects TypedArray, not Buffer
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        text = result.text;
        console.log(`[parse-resume] pdf-parse extracted ${text.length} chars`);
      } catch (pdfErr) {
        console.error("[parse-resume] pdf-parse error:", pdfErr);
        return Response.json({
          error: "We could not read that PDF. If it is a scanned document or image-only PDF, it will not contain readable text. Please try a Word document instead.",
        }, { status: 422 });
      }
    } else {
      return Response.json({
        error: "That file type is not supported. Please upload your resume as a Word document (.docx) or PDF.",
      }, { status: 400 });
    }

    const cleaned = text.replace(/\s{3,}/g, "\n\n").trim();
    console.log(`[parse-resume] cleaned text length: ${cleaned.length}`);

    if (cleaned.length < 100) {
      return Response.json({
        error: "We could not extract enough readable text from that file. It may be image-based or protected. Please try exporting your resume as a standard Word document.",
      }, { status: 422 });
    }

    return Response.json({ text: cleaned, fileName: file.name });

  } catch (err) {
    console.error(`[parse-resume] unexpected error for file="${fileName}" size=${fileSize}:`, err);
    return Response.json({
      error: "We could not open that file. Please upload your resume as a Word document (.docx) or PDF and try again.",
    }, { status: 500 });
  }
}
