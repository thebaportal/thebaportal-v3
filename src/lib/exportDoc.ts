// Shared, client-side artifact export: rich Copy, Print and PDF.
//
// One markdown → blocks parse feeds all three, following the same block rules
// as the server DOCX renderer (/api/workspace/export) so every format carries
// the same content in the same order. Nothing here regenerates or edits
// content — it only formats the saved text it is given.

export interface ExportMeta {
  projectName: string;
  organization?: string | null;
  artifactLabel: string;   // e.g. "Problem Analysis"
  status: string;          // display label, e.g. "Draft", "Approved"
  version?: number | null;
  updatedAt?: string | null; // ISO
}

export type Run = { text: string; bold?: boolean; italic?: boolean };
export type Block =
  | { t: "h1" | "h2" | "h3" | "p" | "strong" | "callout"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "table"; rows: string[][] }
  | { t: "hr" };

// ── Metadata ────────────────────────────────────────────────────────────────
export function fmtLongDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// Header rows shown at the top of every export. Empty organisation / version
// are omitted rather than printed blank; no internal ids ever appear here.
export function metaRows(m: ExportMeta): [string, string][] {
  const rows: [string, string][] = [["Project", m.projectName]];
  if (m.organization) rows.push(["Organisation", m.organization]);
  rows.push(["Artifact", m.artifactLabel], ["Status", m.status]);
  if (m.version) rows.push(["Version", `v${m.version}`]);
  if (m.updatedAt) rows.push(["Updated", fmtLongDate(m.updatedAt)]);
  return rows;
}

function slug(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "untitled";
}

// [project-name]_[artifact-name]_v[version]_[YYYY-MM-DD].ext — the date is the
// saved version's own updated date, so the name matches the content inside.
export function exportFilename(m: ExportMeta, ext: string): string {
  const date = (m.updatedAt ? new Date(m.updatedAt) : new Date()).toISOString().slice(0, 10);
  return [slug(m.projectName), slug(m.artifactLabel), m.version ? `v${m.version}` : null, date].filter(Boolean).join("_") + `.${ext}`;
}

// ── Markdown → blocks (mirrors the DOCX route's rules) ───────────────────────
export function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { i++; continue; }
    if (t.startsWith("# "))   { out.push({ t: "h1", text: t.slice(2).replace(/\*\*/g, "") }); i++; continue; }
    if (t.startsWith("## "))  { out.push({ t: "h2", text: t.slice(3).replace(/\*\*/g, "") }); i++; continue; }
    if (t.startsWith("### ")) { out.push({ t: "h3", text: t.slice(4).replace(/\*\*/g, "") }); i++; continue; }
    if (t === "---")          { out.push({ t: "hr" }); i++; continue; }
    if (t.startsWith("|") && lines[i + 1]?.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!lines[i].includes("---")) rows.push(lines[i].trim().split("|").filter(c => c.trim()).map(c => c.trim()));
        i++;
      }
      if (rows.length) out.push({ t: "table", rows });
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) { items.push(lines[i].trim().slice(2)); i++; }
      out.push({ t: "ul", items }); continue;
    }
    if (/^\d+\.\s/.test(t)) {
      const items: string[] = [];
      // Blank lines between numbered items don't end the list (same rule as DOCX).
      while (i < lines.length) {
        const cur = lines[i].trim();
        if (/^\d+\.\s/.test(cur)) { items.push(cur.replace(/^\d+\.\s/, "")); i++; continue; }
        let j = i; while (j < lines.length && !lines[j].trim()) j++;
        if (!cur && j < lines.length && /^\d+\.\s/.test(lines[j].trim())) { i = j; continue; }
        break;
      }
      out.push({ t: "ol", items }); continue;
    }
    const low = t.toLowerCase();
    if (low.includes("analysis complete") || low.includes("recommended next workstream")) { out.push({ t: "callout", text: t.replace(/\*\*/g, "") }); i++; continue; }
    if (t.startsWith("**") && t.endsWith("**") && !t.slice(2, -2).includes("**")) { out.push({ t: "strong", text: t.slice(2, -2) }); i++; continue; }
    out.push({ t: "p", text: t }); i++;
  }
  return out;
}

// **bold** and *italic* → runs (same inline rules as the in-app renderers)
export function inlineRuns(text: string): Run[] {
  const runs: Run[] = [];
  text.split(/\*\*([^*]+)\*\*/).forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 1) { runs.push({ text: part, bold: true }); return; }
    part.split(/\*([^*]+)\*/).forEach((p, j) => { if (p) runs.push({ text: p, italic: j % 2 === 1 }); });
  });
  return runs;
}
const plain = (s: string) => inlineRuns(s).map(r => r.text).join("");

// ── HTML (rich clipboard + print) ────────────────────────────────────────────
// Inline styles only — Word, Outlook and Teams keep inline CSS on paste;
// Jira / Confluence / Azure DevOps keep the semantic tags.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inlineHtml = (s: string) => inlineRuns(s).map(r => r.bold ? `<strong>${esc(r.text)}</strong>` : r.italic ? `<em>${esc(r.text)}</em>` : esc(r.text)).join("");
const FONT = "font-family:Calibri,'Segoe UI',Arial,sans-serif;";
const INK = "color:#1d1a14;";

export function metaHtml(m: ExportMeta): string {
  return `<h1 style="${FONT}${INK}font-size:22pt;font-weight:700;margin:0 0 8pt;">${esc(m.artifactLabel)}</h1>`
    + `<table style="${FONT}border-collapse:collapse;font-size:10pt;margin:0 0 18pt;">`
    + metaRows(m).map(([k, v]) => `<tr><td style="padding:2pt 14pt 2pt 0;color:#5b5546;font-weight:700;vertical-align:top;">${esc(k)}</td><td style="padding:2pt 0;${INK}">${esc(v)}</td></tr>`).join("")
    + `</table><hr style="border:none;border-top:1.5pt solid #34407d;margin:0 0 14pt;">`;
}

export function bodyHtml(content: string): string {
  return parseBlocks(content).map(b => {
    switch (b.t) {
      case "h1": return `<h1 style="${FONT}${INK}font-size:18pt;font-weight:700;margin:18pt 0 6pt;">${esc(b.text)}</h1>`;
      case "h2": return `<h2 style="${FONT}color:#1f3040;font-size:14pt;font-weight:700;margin:16pt 0 6pt;border-bottom:1pt solid #d6ccaf;padding-bottom:3pt;">${esc(b.text)}</h2>`;
      case "h3": return `<h3 style="${FONT}color:#2a3a50;font-size:11.5pt;font-weight:700;margin:12pt 0 4pt;">${esc(b.text)}</h3>`;
      case "hr": return `<hr style="border:none;border-top:1pt solid #cccccc;margin:12pt 0;">`;
      case "strong": return `<p style="${FONT}${INK}font-size:11pt;font-weight:700;margin:10pt 0 4pt;">${inlineHtml(b.text)}</p>`;
      case "callout": return `<p style="${FONT}color:#1f3040;font-size:10.5pt;margin:0 0 6pt 12pt;">${inlineHtml(b.text)}</p>`;
      case "p": return `<p style="${FONT}${INK}font-size:11pt;line-height:1.45;margin:0 0 8pt;">${inlineHtml(b.text)}</p>`;
      case "ul": case "ol": {
        const tag = b.t;
        return `<${tag} style="${FONT}${INK}font-size:11pt;margin:0 0 8pt;padding-left:22pt;">` + b.items.map(it => `<li style="margin:0 0 3pt;line-height:1.4;">${inlineHtml(it)}</li>`).join("") + `</${tag}>`;
      }
      case "table": {
        const cols = Math.max(...b.rows.map(r => r.length));
        const cell = (c: string, h: boolean) => `<${h ? "th" : "td"} style="${FONT}border:1pt solid #c9c2ad;padding:4pt 6pt;vertical-align:top;text-align:left;font-size:9.5pt;${h ? "background:#e9ebf5;font-weight:700;" : ""}${INK}">${inlineHtml(c)}</${h ? "th" : "td"}>`;
        return `<table style="border-collapse:collapse;width:100%;margin:6pt 0 12pt;">`
          + b.rows.map((r, ri) => `<tr>${Array.from({ length: cols }, (_, ci) => cell(r[ci] ?? "", ri === 0)).join("")}</tr>`).join("")
          + `</table>`;
      }
    }
  }).join("\n");
}

// ── Plain text fallback ──────────────────────────────────────────────────────
export function toPlainText(content: string, m: ExportMeta): string {
  const out: string[] = [m.artifactLabel, ...metaRows(m).map(([k, v]) => `${k}: ${v}`), ""];
  for (const b of parseBlocks(content)) {
    switch (b.t) {
      case "h1": case "h2": case "h3": case "strong": out.push("", plain(b.text)); break;
      case "hr": out.push("", "—".repeat(20), ""); break;
      case "p": case "callout": out.push(plain(b.text)); break;
      case "ul": b.items.forEach(it => out.push(`• ${plain(it)}`)); break;
      case "ol": b.items.forEach((it, n) => out.push(`${n + 1}. ${plain(it)}`)); break;
      case "table": b.rows.forEach(r => out.push(r.map(plain).join("\t"))); break;  // tabs paste as columns in Excel/Word
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ── Rich Copy ────────────────────────────────────────────────────────────────
// The whole artifact as HTML (formatting kept) with a plain-text fallback for
// targets that only accept text. Returns whether anything was copied.
export async function copyArtifact(content: string, m: ExportMeta): Promise<boolean> {
  const html = `<div>${metaHtml(m)}${bodyHtml(content)}</div>`;
  const text = toPlainText(content, m);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      })]);
      return true;
    }
  } catch { /* fall through to the legacy path */ }
  // Legacy path: a selected off-screen copy of the HTML keeps formatting in
  // browsers without ClipboardItem; plain text is the last resort.
  try {
    const el = document.createElement("div");
    el.contentEditable = "true";
    el.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    el.innerHTML = html;
    document.body.appendChild(el);
    const range = document.createRange(); range.selectNodeContents(el);
    const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range);
    const ok = document.execCommand("copy");
    sel?.removeAllRanges(); el.remove();
    if (ok) return true;
  } catch { /* ignore */ }
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// ── Print ────────────────────────────────────────────────────────────────────
// Prints a standalone document (metadata + content) from a hidden iframe, so
// no application chrome can appear; "Save as PDF" in the dialog also works.
export function printArtifact(content: string, m: ExportMeta): void {
  const docHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(exportFilename(m, "pdf").replace(/\.pdf$/, ""))}</title>
<style>@page{size:A4;margin:18mm 18mm 20mm;} body{margin:0;${FONT}${INK}-webkit-print-color-adjust:exact;print-color-adjust:exact;}
table{page-break-inside:auto;} tr{page-break-inside:avoid;} h1,h2,h3{page-break-after:avoid;}
.foot{margin-top:24pt;padding-top:6pt;border-top:1pt solid #d6ccaf;font-size:8.5pt;color:#7a7360;}</style></head>
<body>${metaHtml(m)}${bodyHtml(content)}<div class="foot">The BA Portal • ${esc(m.projectName)} • ${esc(m.artifactLabel)}</div></body></html>`;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open(); doc.write(docHtml); doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  frame.contentWindow!.addEventListener("afterprint", cleanup);
  setTimeout(() => { frame.contentWindow!.focus(); frame.contentWindow!.print(); setTimeout(cleanup, 60000); }, 150);
}

// ── PDF ──────────────────────────────────────────────────────────────────────
async function fontB64(url: string): Promise<string> {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function buildPdf(content: string, m: ExportMeta): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  // Liberation Sans (SIL OFL, /public/fonts/liberation) — Arial-metric and
  // full Unicode punctuation/arrows, unlike the PDF base-14 fonts.
  const F = "LiberationSans";
  const faces: [string, string][] = [["normal", "Regular"], ["bold", "Bold"], ["italic", "Italic"]];
  for (const [style, file] of faces) {
    pdf.addFileToVFS(`${F}-${file}.ttf`, await fontB64(`/fonts/liberation/LiberationSans-${file}.ttf`));
    pdf.addFont(`${F}-${file}.ttf`, F, style);
  }
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
  const ML = 54, MR = 54, MT = 64, MB = 64, CW = W - ML - MR;
  let y = MT;
  const ink = () => pdf.setTextColor(29, 26, 20);
  const font = (r: Run | { bold?: boolean; italic?: boolean }, size: number) => { pdf.setFont(F, r.bold ? "bold" : r.italic ? "italic" : "normal"); pdf.setFontSize(size); };
  const ensure = (h: number) => { if (y + h > H - MB) { pdf.addPage(); y = MT; } };
  const glyph = (s: string) => s.replace(/[✓✔]/g, "√").replace(/\t/g, " ");

  // Word-wraps mixed bold/italic runs; returns the lines (each a list of runs).
  function layout(runs: Run[], size: number, width: number): Run[][] {
    const lines: Run[][] = [[]]; let lineW = 0;
    for (const r of runs) {
      for (const word of glyph(r.text).split(/(\s+)/)) {
        if (!word) continue;
        font(r, size); const w = pdf.getTextWidth(word);
        if (/^\s+$/.test(word)) { if (lineW > 0) { lines[lines.length - 1].push({ ...r, text: " " }); lineW += pdf.getTextWidth(" "); } continue; }
        if (lineW + w > width && lineW > 0) { const last = lines[lines.length - 1]; if (last.length && last[last.length - 1].text === " ") last.pop(); lines.push([]); lineW = 0; }
        lines[lines.length - 1].push({ ...r, text: word }); lineW += w;
      }
    }
    return lines;
  }
  function drawLines(lines: Run[][], x: number, size: number, lh: number, color?: [number, number, number]) {
    for (const line of lines) {
      ensure(lh);
      let cx = x;
      for (const r of line) { font(r, size); if (color) pdf.setTextColor(...color); else ink(); pdf.text(r.text, cx, y + size); cx += pdf.getTextWidth(r.text); }
      y += lh;
    }
  }
  const para = (runs: Run[], size: number, opts: { x?: number; width?: number; color?: [number, number, number]; before?: number; after?: number } = {}) => {
    y += opts.before ?? 0;
    const lh = size * 1.4;
    drawLines(layout(runs, size, opts.width ?? CW), opts.x ?? ML, size, lh, opts.color);
    y += opts.after ?? 0;
  };

  // Title + project metadata (first page)
  para([{ text: m.artifactLabel, bold: true }], 22, { after: 6 });
  for (const [k, v] of metaRows(m)) {
    ensure(15);
    font({ bold: true }, 9.5); pdf.setTextColor(91, 85, 70); pdf.text(k, ML, y + 9.5);
    font({}, 9.5); ink(); pdf.text(glyph(v), ML + 90, y + 9.5);
    y += 15;
  }
  y += 8; pdf.setDrawColor(52, 64, 125); pdf.setLineWidth(1.5); pdf.line(ML, y, W - MR, y); y += 18;

  for (const b of parseBlocks(content)) {
    switch (b.t) {
      case "h1": ensure(40); para([{ text: b.text, bold: true }], 16, { before: 14, after: 4 }); break;
      case "h2":
        ensure(44); para([{ text: b.text, bold: true }], 13, { before: 14, after: 2, color: [31, 48, 64] });
        pdf.setDrawColor(214, 204, 175); pdf.setLineWidth(0.75); pdf.line(ML, y, W - MR, y); y += 8; break;
      case "h3": ensure(32); para([{ text: b.text, bold: true }], 11, { before: 10, after: 2, color: [42, 58, 80] }); break;
      case "hr": ensure(16); y += 6; pdf.setDrawColor(204, 204, 204); pdf.setLineWidth(0.5); pdf.line(ML, y, W - MR, y); y += 10; break;
      case "strong": para([{ text: b.text, bold: true }], 10.5, { before: 8, after: 2 }); break;
      case "callout": para(inlineRuns(b.text), 10, { x: ML + 12, width: CW - 12, color: [31, 48, 64], after: 4 }); break;
      case "p": para(inlineRuns(b.text), 10.5, { after: 6 }); break;
      case "ul": case "ol":
        b.items.forEach((it, n) => {
          const marker = b.t === "ul" ? "•" : `${n + 1}.`;
          const lines = layout(inlineRuns(it), 10.5, CW - 18);
          ensure(14.7); font({}, 10.5); ink(); pdf.text(marker, ML + 4, y + 10.5);
          drawLines(lines, ML + 18, 10.5, 14.7); y += 2;
        });
        y += 4; break;
      case "table": {
        const cols = Math.max(...b.rows.map(r => r.length)); const cw = CW / cols; const size = 8.5, lh = size * 1.35, pad = 4;
        const drawRow = (row: string[], header: boolean) => {
          const cells = Array.from({ length: cols }, (_, ci) => layout(header ? [{ text: plain(row[ci] ?? ""), bold: true }] : inlineRuns(row[ci] ?? ""), size, cw - pad * 2));
          const h = Math.max(...cells.map(c => c.length)) * lh + pad * 2;
          if (y + h > H - MB) { pdf.addPage(); y = MT; if (!header) drawRow(b.rows[0], true); }  // repeat header row
          cells.forEach((lines, ci) => {
            const x = ML + ci * cw;
            if (header) { pdf.setFillColor(233, 235, 245); pdf.rect(x, y, cw, h, "F"); }
            pdf.setDrawColor(201, 194, 173); pdf.setLineWidth(0.5); pdf.rect(x, y, cw, h, "S");
            let cy = y + pad;
            for (const line of lines) { let cx = x + pad; for (const r of line) { font(r, size); ink(); pdf.text(r.text, cx, cy + size); cx += pdf.getTextWidth(r.text); } cy += lh; }
          });
          y += h;
        };
        y += 4; b.rows.forEach((r, ri) => drawRow(r, ri === 0)); y += 10; break;
      }
    }
  }

  // Running header/footer on every page.
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    font({}, 8); pdf.setTextColor(122, 115, 96);
    pdf.text(glyph(`${m.projectName} • ${m.artifactLabel}`), ML, 36);
    const right = [m.status, m.version ? `v${m.version}` : ""].filter(Boolean).join(" · ");
    pdf.text(right, W - MR, 36, { align: "right" });
    pdf.setDrawColor(214, 204, 175); pdf.setLineWidth(0.5); pdf.line(ML, H - 44, W - MR, H - 44);
    pdf.text(glyph(`The BA Portal • ${m.projectName} • ${m.artifactLabel}`), ML, H - 30);
    pdf.text(`Page ${p} of ${pages}`, W - MR, H - 30, { align: "right" });
  }
  pdf.setProperties({ title: `${m.projectName} — ${m.artifactLabel}`, subject: m.artifactLabel, creator: "The BA Portal" });
  return pdf.output("blob");
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
