"use client";

import { useEffect, useRef, useState } from "react";
import { buildPdf, copyArtifact, exportFilename, printArtifact, saveBlob, type ExportMeta } from "@/lib/exportDoc";

// Copy + Export ▾ — the single export toolbar for an artifact. Every format is
// produced from the exact content and metadata passed in (the saved version
// being viewed); nothing is regenerated.
interface Props {
  content: string;
  meta: ExportMeta;
  artifactType?: string;
  projectId?: string;
  xlsx?: boolean;   // Requirements / User Stories / Testing also export to Excel
  placement?: "down" | "up";  // "up" when the toolbar sits at the bottom of the screen
}

const btn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, background: "var(--lc-surface)", border: "1px solid var(--lc-border)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--lc-text-2)", fontFamily: "inherit" };

export default function ExportMenu({ content, meta, artifactType, projectId, xlsx, placement = "down" }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function copy() {
    const ok = await copyArtifact(content, meta);
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied(null), 2000);
  }

  async function serverExport(format: "docx" | "xlsx") {
    const filename = exportFilename(meta, format);
    const res = await fetch("/api/workspace/export", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, title: meta.artifactLabel, format, filename, meta, ...(artifactType ? { type: artifactType } : {}), ...(projectId ? { projectId } : {}) }),
    });
    if (!res.ok) throw new Error(String(res.status));
    saveBlob(await res.blob(), filename);
  }

  async function run(kind: "docx" | "pdf" | "print" | "xlsx") {
    setOpen(false); setError("");
    if (kind === "print") { printArtifact(content, meta); return; }
    setBusy(kind);
    try {
      if (kind === "pdf") saveBlob(await buildPdf(content, meta), exportFilename(meta, "pdf"));
      else await serverExport(kind);
    } catch { setError("Export failed — please try again."); }
    finally { setBusy(null); }
  }

  const items: { id: "docx" | "pdf" | "print" | "xlsx"; label: string }[] = [
    { id: "docx", label: "Word (.docx)" },
    { id: "pdf", label: "PDF" },
    { id: "print", label: "Print" },
    ...(xlsx ? [{ id: "xlsx" as const, label: "Excel (.xlsx)" }] : []),
  ];

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
      {error && <span role="alert" style={{ fontSize: 11.5, color: "var(--lc-red)" }}>{error}</span>}
      <button onClick={copy} style={btn} title="Copy the whole artifact with formatting">
        {copied === "ok"
          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--lc-green)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
        {copied === "ok" ? "Copied" : copied === "fail" ? "Copy failed" : "Copy"}
      </button>
      <button onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open} disabled={!!busy} style={{ ...btn, opacity: busy ? .6 : 1 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        {busy ? "Exporting…" : "Export"}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", ...(placement === "up" ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }), right: 0, zIndex: 80, minWidth: 170, background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: 10, boxShadow: "var(--lc-shadow-md)", padding: 5 }}>
          {items.map(it => (
            <button key={it.id} role="menuitem" onClick={() => run(it.id)}
              style={{ width: "100%", display: "block", textAlign: "left", padding: "8px 10px", borderRadius: 7, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--lc-text-1)", fontFamily: "inherit" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--lc-bg)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
