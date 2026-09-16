import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";
import { buildRequirementsWorkbook, buildUserStoriesWorkbook, buildTestingWorkbook } from "@/lib/xlsxExport";

const XLSX_TYPES = new Set(["requirements", "user_stories", "test_case"]);

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function currentDateStr() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function extractProjectName(content: string, fallback: string): string {
  // Prefer explicit project/situation fields
  const projectMatch = content.match(/\*\*Project(?:\s*\/\s*Situation)?:\*\*\s*([^\n]+)/);
  if (projectMatch) {
    // Strip a trailing " — subtitle" using a real em/en dash only. A plain ASCII
    // hyphen is often just part of the project's own name (e.g. "Website Redesign
    // - Phase 2") and must not be truncated away.
    return projectMatch[1].replace(/\s*[—–]+.*$/, "").trim().slice(0, 60);
  }
  // Process Analysis has no **Project:** field of its own — it names the
  // process instead. Without this, every Process Analysis export fell through
  // to the generic "Process Analysis" fallback regardless of the actual process.
  const processMatch = content.match(/\*\*Process:\*\*\s*([^\n]+)/);
  if (processMatch) {
    return processMatch[1].replace(/\s*[—–]+.*$/, "").trim().slice(0, 60);
  }
  // For Solution Evaluator: skip leading question word, take first 5 content words
  const decisionMatch = content.match(/\*\*Decision:\*\*\s*([^\n]+)/);
  if (decisionMatch) {
    const words = decisionMatch[1].trim().split(/\s+/);
    const skip = ["how","whether","which","what","when","if"];
    const start = skip.includes(words[0]?.toLowerCase()) ? 1 : 0;
    return words.slice(start, start + 5).join(" ").replace(/[,.:;]+$/, "");
  }
  // Fall back to first H1 heading in content
  const h1Match = content.match(/^#\s+(.+)/m);
  if (h1Match) return h1Match[1].replace(/\*\*/g, "").trim();
  return fallback;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (isRateLimited(`ai:${user.id}`)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  try {
    const { content, title, format, type, projectId } = await request.json();
    if (!content || !title) return NextResponse.json({ error: "Content and title required" }, { status: 400 });

    const dateStr = currentDateStr();
    const projectName = extractProjectName(content, title);

    // ── XLSX export ──────────────────────────────────────────────────────────
    if (format === "xlsx") {
      if (!XLSX_TYPES.has(type)) return NextResponse.json({ error: "This deliverable does not support an XLSX export." }, { status: 400 });

      let buffer: Awaited<ReturnType<typeof buildRequirementsWorkbook>>;
      if (type === "requirements") {
        buffer = await buildRequirementsWorkbook(content);
      } else if (type === "user_stories") {
        buffer = await buildUserStoriesWorkbook(content);
      } else {
        // Testing's Traceability Matrix sheet needs every approved requirements /
        // user_stories / test_case artifact in the project, not just the one being
        // exported, to match the in-app RTM panel's own coverage computation.
        if (!projectId) return NextResponse.json({ error: "projectId is required for the Testing workbook" }, { status: 400 });
        const db = admin();
        const { data: rtmArtifacts, error } = await db
          .from("artifacts")
          .select("type,status,content")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .in("type", ["requirements", "user_stories", "test_case"]);
        if (error) { console.error("[export xlsx] artifact fetch failed:", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
        buffer = await buildTestingWorkbook(content, rtmArtifacts ?? []);
      }

      const safeFilename = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return new Response(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${safeFilename}-${type.replace(/_/g, "-")}.xlsx"`,
        },
      });
    }

    // ── Plain text export ────────────────────────────────────────────────────
    if (format === "txt") {
      const lines = content.split("\n");
      const output: string[] = [];

      output.push(projectName.toUpperCase());
      output.push("=".repeat(Math.min(projectName.length, 72)));
      output.push(`Prepared by The BA Portal  |  ${dateStr}`);
      output.push("=".repeat(72));
      output.push("");

      for (const line of lines) {
        const t = line.trim();
        if (!t) { output.push(""); continue; }

        const clean = t.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "");

        if (t.startsWith("# "))        { output.push(""); output.push(clean.replace(/^# /, "").toUpperCase()); output.push("─".repeat(60)); output.push(""); }
        else if (t.startsWith("## "))  { output.push(""); output.push(clean.replace(/^## /, "")); output.push("─".repeat(40)); output.push(""); }
        else if (t.startsWith("### ")) { output.push(clean.replace(/^### /, "") + ":"); output.push(""); }
        else if (t.startsWith("- ") || t.startsWith("* ")) { output.push("  • " + clean.slice(2)); }
        else if (/^\d+\.\s/.test(t))  { output.push("  " + clean); }
        else if (t.startsWith("|") && t.includes("---")) { /* skip */ }
        else if (t.startsWith("|"))    {
          const cells = t.split("|").filter((c: string) => c.trim()).map((c: string) => c.replace(/\*\*/g, "").trim());
          output.push("  " + cells.join("   |   "));
        }
        else if (t === "---") { output.push(""); output.push("─".repeat(60)); output.push(""); }
        else { output.push(clean); }
      }

      const safeFilename = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return new Response(output.join("\n"), {
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}.txt"`,
        },
      });
    }

    // ── DOCX export ──────────────────────────────────────────────────────────
    if (format === "docx") {
      const {
        Document, Packer, Paragraph, TextRun, HeadingLevel,
        Table, TableRow, TableCell, WidthType, AlignmentType,
        BorderStyle, ShadingType, Header, Footer, PageNumber,
        TabStopType,
      } = await import("docx");

      function inlineRuns(text: string, defaultSize = 22, defaultColor?: string, forceBold = false): InstanceType<typeof TextRun>[] {
        const clean = text.replace(/\*/g, "**").replace(/\*{4}/g, "**");
        const parts = clean.split(/\*\*([^*]+)\*\*/);
        return parts.filter(p => p !== "").map((part, i) =>
          new TextRun({ text: part, bold: forceBold || i % 2 === 1, size: defaultSize, color: defaultColor })
        );
      }

      // ── Page header ──────────────────────────────────────────────────────
      const pageHeader = new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "THE BA PORTAL", bold: true, size: 16, color: "1FBF9F" }),
              new TextRun({ text: "  •  ", size: 16, color: "AAAAAA" }),
              new TextRun({ text: projectName, size: 16, color: "555566" }),
              new TextRun({ text: "\t", size: 16 }),
              new TextRun({ text: dateStr, size: 16, color: "AAAAAA" }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E0E0E8" } },
            spacing: { after: 120 },
          }),
        ],
      });

      // ── Page footer ──────────────────────────────────────────────────────
      const pageFooter = new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "The BA Portal  —  Intelligence Engine", size: 14, color: "BBBBCC", italics: true }),
              new TextRun({ text: "\t", size: 14 }),
              new TextRun({ text: "Page ", size: 14, color: "AAAAAA" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "AAAAAA" }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E0E0E8" } },
            spacing: { before: 120 },
          }),
        ],
      });

      // ── Document body ────────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children: any[] = [];

      // Title block
      children.push(
        new Paragraph({
          children: [new TextRun({ text: projectName, bold: true, size: 52, color: "1A1A2E" })],
          spacing: { before: 240, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: title, size: 18, color: "1FBF9F", bold: true }),
            new TextRun({ text: "  •  ", size: 18, color: "CCCCCC" }),
            new TextRun({ text: `Prepared by The BA Portal`, size: 18, color: "AAAAAA" }),
          ],
          spacing: { after: 480 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1FBF9F" } },
        })
      );

      const lines = content.split("\n");
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];
        const t = line.trim();

        if (!t) { children.push(new Paragraph({ text: "", spacing: { after: 80 } })); i++; continue; }

        if (t.startsWith("# ")) {
          children.push(new Paragraph({
            children: [new TextRun({ text: t.slice(2).replace(/\*\*/g, ""), bold: true, size: 32, color: "1A1A2E" })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 480, after: 160 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "1FBF9F" } },
          }));
          i++; continue;
        }

        if (t.startsWith("## ")) {
          children.push(new Paragraph({
            children: [new TextRun({ text: t.slice(3).replace(/\*\*/g, ""), bold: true, size: 26, color: "1F3040" })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 360, after: 120 },
          }));
          i++; continue;
        }

        if (t.startsWith("### ")) {
          children.push(new Paragraph({
            children: [new TextRun({ text: t.slice(4).replace(/\*\*/g, ""), bold: true, size: 22, color: "2A3A50" })],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 80 },
          }));
          i++; continue;
        }

        if (t === "---") {
          children.push(new Paragraph({
            text: "",
            spacing: { before: 120, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" } },
          }));
          i++; continue;
        }

        if (t.startsWith("|") && i + 1 < lines.length && lines[i + 1]?.trim().startsWith("|")) {
          const tableLines: string[] = [];
          while (i < lines.length && lines[i]?.trim().startsWith("|")) {
            if (!lines[i].includes("---")) tableLines.push(lines[i].trim());
            i++;
          }
          if (tableLines.length > 0) {
            const allRows = tableLines.map(r => r.split("|").filter(c => c.trim()).map(c => c.trim()));
            const maxCols = Math.max(...allRows.map(r => r.length));
            const colWidth = Math.floor(9000 / maxCols);
            const tblRows = allRows.map((row, ri) =>
              new TableRow({
                tableHeader: ri === 0,
                children: Array.from({ length: maxCols }, (_, ci) => {
                  const cellText = row[ci] ?? "";
                  const isHeader = ri === 0;
                  return new TableCell({
                    width: { size: colWidth, type: WidthType.DXA },
                    shading: isHeader ? { type: ShadingType.SOLID, fill: "E8F8F4" } : undefined,
                    children: [new Paragraph({
                      children: inlineRuns(cellText, 18, undefined, isHeader),
                      spacing: { before: 60, after: 60 },
                    })],
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                  });
                }),
              })
            );
            children.push(new Table({ rows: tblRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
            children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
          }
          continue;
        }

        if (t.startsWith("- ") || t.startsWith("* ")) {
          children.push(new Paragraph({ children: inlineRuns(t.slice(2), 20), bullet: { level: 0 }, spacing: { after: 80 } }));
          i++; continue;
        }

        if (/^\d+\.\s/.test(t)) {
          children.push(new Paragraph({
            children: inlineRuns(t.replace(/^\d+\.\s/, ""), 20),
            numbering: { reference: "default-numbering", level: 0 },
            spacing: { after: 80 },
          }));
          i++; continue;
        }

        if (t.toLowerCase().includes("analysis complete") || t.toLowerCase().includes("recommended next workstream")) {
          children.push(new Paragraph({
            children: inlineRuns(t.replace(/\*\*/g, ""), 20, "1F3040"),
            spacing: { after: 80 },
            indent: { left: 240 },
          }));
          i++; continue;
        }

        if (t.startsWith("**") && t.endsWith("**") && !t.slice(2, -2).includes("**")) {
          children.push(new Paragraph({
            children: [new TextRun({ text: t.slice(2, -2), bold: true, size: 22 })],
            spacing: { before: 160, after: 60 },
          }));
          i++; continue;
        }

        children.push(new Paragraph({ children: inlineRuns(t, 22), spacing: { after: 120 } }));
        i++;
      }

      const doc = new Document({
        numbering: {
          config: [{
            reference: "default-numbering",
            levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }],
          }],
        },
        styles: {
          default: {
            document: {
              run: { font: "Calibri", size: 22, color: "1A1A2E" },
              paragraph: { spacing: { line: 276 } },
            },
          },
        },
        sections: [{
          headers: { default: pageHeader },
          footers: { default: pageFooter },
          properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
          children,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      const safeFilename = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return new Response(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${safeFilename}.docx"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format. Use txt, docx, or xlsx." }, { status: 400 });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
