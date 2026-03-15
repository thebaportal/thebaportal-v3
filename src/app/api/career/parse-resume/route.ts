import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "No file uploaded." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const name = file.name.toLowerCase();
    let text = "";

    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".pdf")) {
      // pdf-parse has a known Next.js issue with its test-file loader — import directly
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error no type declarations for this subpath
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else {
      return Response.json({ error: "Unsupported file type. Please upload a Word (.docx) or PDF file." }, { status: 400 });
    }

    const cleaned = text.replace(/\s{3,}/g, "\n\n").trim();
    if (cleaned.length < 100) {
      return Response.json({ error: "Could not extract enough text from this file. Try a different format." }, { status: 400 });
    }

    return Response.json({ text: cleaned, fileName: file.name });
  } catch (err) {
    console.error("Parse resume error:", err);
    return Response.json({ error: "Failed to read the file. Please try again." }, { status: 500 });
  }
}
