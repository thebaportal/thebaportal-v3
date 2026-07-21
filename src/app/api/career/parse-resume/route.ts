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

    if (name.endsWith(".docx")) {
      console.log("[parse-resume] parsing .docx with mammoth");
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        console.log(`[parse-resume] mammoth extracted ${text.length} chars`);
      } catch (mammothErr) {
        console.error("[parse-resume] mammoth error:", mammothErr);
        return Response.json({
          error: "We could not read that Word file. Please make sure it is a valid .docx file and try again.",
        }, { status: 422 });
      }
    } else if (name.endsWith(".doc")) {
      console.log("[parse-resume] parsing .doc with word-extractor");
      try {
        const WordExtractor = (await import("word-extractor")).default;
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(buffer);
        text = extracted.getBody();
        console.log(`[parse-resume] word-extractor extracted ${text.length} chars`);
      } catch (docErr) {
        console.error("[parse-resume] word-extractor error:", docErr);
        return Response.json({
          error: "We could not read that .doc file. Try opening it in Word, saving as .docx, and uploading again.",
        }, { status: 422 });
      }
    } else if (name.endsWith(".pdf")) {
      console.log("[parse-resume] parsing as PDF");
      // Try pdf-parse first, fall back to raw text extraction
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require("pdf-parse");
        const result = await pdfParse(buffer);
        text = result.text;
        console.log(`[parse-resume] pdf-parse extracted ${text.length} chars`);
      } catch (pdfErr) {
        console.error("[parse-resume] pdf-parse error:", pdfErr);
        return Response.json({
          error: "We could not read that PDF. Use the paste option below to paste your text directly.",
        }, { status: 422 });
      }
    } else if (name.endsWith(".txt") || name.endsWith(".rtf")) {
      console.log("[parse-resume] parsing as plain text");
      text = await file.text();
      console.log(`[parse-resume] text file read: ${text.length} chars`);
    } else {
      // Try reading as text — if it has content, use it
      try {
        text = await file.text();
        console.log(`[parse-resume] fallback text read: ${text.length} chars`);
      } catch {
        return Response.json({
          error: "We could not read that file. Please upload your resume as a Word document (.docx), PDF, or plain text file.",
        }, { status: 400 });
      }
    }

    const cleaned = text.replace(/\s{3,}/g, "\n\n").trim();
    console.log(`[parse-resume] cleaned text length: ${cleaned.length}`);

    if (cleaned.length < 100) {
      return Response.json({
        error: "We could not extract enough readable text from that file. Use the paste option to paste your text directly.",
      }, { status: 422 });
    }

    // Detect binary garbage — if more than 15% of characters are non-printable, reject it
    const nonPrintable = (cleaned.match(/[^\x20-\x7E\n\r\t]/g) || []).length;
    if (nonPrintable / cleaned.length > 0.15) {
      return Response.json({
        error: "The file contained unreadable data. Use the paste option to paste your text directly.",
      }, { status: 422 });
    }

    return Response.json({ text: cleaned, fileName: file.name });

  } catch (err) {
    console.error(`[parse-resume] unexpected error for file="${fileName}" size=${fileSize}:`, err);
    return Response.json({
      error: "We could not open that file. Please try a different format or paste your resume text directly.",
    }, { status: 500 });
  }
}
