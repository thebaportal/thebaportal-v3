import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 26;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file received." }, { status: 400 });

    const fileName = file.name;
    const name = fileName.toLowerCase();

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Please upload a document under 10 MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let text = "";

    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      text = result.text;
    } else if (name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json({
        error: "Unsupported file type. Please upload a PDF, Word document (.docx), or text file (.txt).",
      }, { status: 400 });
    }

    const cleaned = text.replace(/\s{3,}/g, "\n\n").trim();

    if (cleaned.length < 50) {
      return NextResponse.json({
        error: "Could not extract readable text from that file. It may be image-based or password-protected. Try a Word document instead.",
      }, { status: 422 });
    }

    return NextResponse.json({ text: cleaned, fileName });

  } catch (err) {
    console.error("[parse-document] error:", err);
    return NextResponse.json({ error: "Could not read that file. Please try again." }, { status: 500 });
  }
}
