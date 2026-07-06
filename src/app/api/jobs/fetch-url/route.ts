import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Extract <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const rawTitle = titleMatch?.[1]?.replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim() ?? "";

    // Common patterns: "Job Title at Company | Platform" or "Job Title - Company | Platform"
    let jobTitle = "";
    let company = "";

    const atMatch = rawTitle.match(/^(.+?)\s+at\s+(.+?)(?:\s*[|\-–].+)?$/i);
    const dashMatch = rawTitle.match(/^(.+?)\s*[-–]\s*(.+?)(?:\s*[|\-–][^|\-–]+)?$/i);
    const pipeMatch = rawTitle.match(/^(.+?)\s*\|\s*(.+)/i);

    if (atMatch) {
      jobTitle = atMatch[1].trim();
      company  = atMatch[2].trim();
    } else if (dashMatch) {
      jobTitle = dashMatch[1].trim();
      company  = dashMatch[2].trim();
    } else if (pipeMatch) {
      jobTitle = pipeMatch[1].trim();
      company  = pipeMatch[2].trim();
    } else {
      jobTitle = rawTitle.split(/[|\-–]/)[0].trim();
    }

    // Trim platform suffixes like "| LinkedIn", "| Indeed"
    const platforms = /\b(linkedin|indeed|glassdoor|seek|monster|reed|totaljobs|ziprecruiter)\b/i;
    company = company.replace(platforms, "").replace(/[|\-–].*$/, "").trim();

    return NextResponse.json({ title: jobTitle || rawTitle, company });
  } catch {
    return NextResponse.json({ error: "Could not fetch that URL" }, { status: 422 });
  }
}
