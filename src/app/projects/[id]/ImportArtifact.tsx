"use client";

import { useMemo, useState } from "react";
import { extractItemIds } from "@/lib/projects/attention";

interface ExistingArtifact { id: string; type: string; status: string; content: string; reasoning_context?: Record<string, unknown> | null; source_artifact_ids?: string[] | null; }

interface Props {
  projectId: string;
  targetType: string;
  targetLabel: string;
  existingArtifacts: ExistingArtifact[];
  onClose: () => void;
  onImported: (artifact: ExistingArtifact & { title?: string; version: number; created_at: string }) => void;
}

// The one and only entry point for "bring existing work into the project".
// Paste/manual text only — no file upload, no new artifact table. A plain
// POST to the existing artifacts route with origin/import_mode noted in
// reasoning_context is the entire backend footprint; everything below is
// just deciding what content and provenance to send.
export default function ImportArtifact({ projectId, targetType, targetLabel, existingArtifacts, onClose, onImported }: Props) {
  const currentApproved = existingArtifacts.find(a => a.type === targetType && a.status === "approved");

  const [text, setText] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [asApproved, setAsApproved] = useState(true);
  const [mode, setMode] = useState<"replace" | "add">(currentApproved ? "add" : "replace");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const conflictIds = useMemo(() => {
    if (mode !== "add" || !currentApproved || !text.trim()) return [];
    const existingIds = new Set(extractItemIds(currentApproved.content));
    return extractItemIds(text).filter(id => existingIds.has(id));
  }, [mode, currentApproved, text]);

  const canSubmit = text.trim().length > 0 && conflictIds.length === 0 && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const isAdd = mode === "add" && currentApproved;
      const content = isAdd
        ? `${currentApproved!.content}\n\n## Externally sourced additions (${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })})\n\n${text.trim()}`
        : text.trim();

      const reasoning_context: Record<string, unknown> = {
        origin: isAdd ? "mixed" : "imported",
        imported_at: new Date().toISOString(),
        ...(sourceNote.trim() ? { source_note: sourceNote.trim() } : {}),
        ...(isAdd ? { import_mode: "add" } : {}),
      };

      const res = await fetch(`/api/projects/${projectId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: targetType,
          title: targetLabel,
          content,
          reasoning_context,
          status: asApproved ? "approved" : "draft",
          source_artifact_ids: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError("Could not save. Please try again."); setSaving(false); return; }
      onImported(data.artifact);
    } catch {
      setError("Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.4)", padding: 20 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 620, maxHeight: "85vh", overflowY: "auto", background: "var(--lc-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--lc-border)", padding: "24px 26px" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--lc-text-1)", marginBottom: 4 }}>
          Add existing {targetLabel.toLowerCase()}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--lc-text-3)", lineHeight: 1.6, marginBottom: 16 }}>
          Paste what already exists for this project. It becomes a normal, connected artifact — IDs like FR-014 are picked up automatically.
        </p>

        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste or type the content here…"
          style={{ width: "100%", minHeight: 200, boxSizing: "border-box", background: "var(--lc-faint)", border: "1px solid var(--lc-border)", borderRadius: 10, padding: "12px 14px", fontSize: 13, lineHeight: 1.6, color: "var(--lc-text-1)", fontFamily: "inherit", resize: "vertical", marginBottom: 12 }} />

        <input value={sourceNote} onChange={e => setSourceNote(e.target.value)} placeholder="Optional note — where this came from"
          style={{ width: "100%", boxSizing: "border-box", background: "var(--lc-faint)", border: "1px solid var(--lc-border)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "var(--lc-text-1)", fontFamily: "inherit", marginBottom: 16 }} />

        <div style={{ display: "flex", gap: 8, marginBottom: currentApproved ? 12 : 16 }}>
          <button onClick={() => setAsApproved(true)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${asApproved ? "var(--lc-green-border)" : "var(--lc-border)"}`, background: asApproved ? "var(--lc-green-bg)" : "none", color: asApproved ? "var(--lc-green)" : "var(--lc-text-3)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Approved
          </button>
          <button onClick={() => setAsApproved(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${!asApproved ? "rgba(52,64,125,.3)" : "var(--lc-border)"}`, background: !asApproved ? "var(--lc-teal-bg)" : "none", color: !asApproved ? "var(--teal)" : "var(--lc-text-3)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Draft
          </button>
        </div>

        {currentApproved && asApproved && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--lc-text-4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
              An approved {targetLabel.toLowerCase()} artifact already exists
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setMode("add")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${mode === "add" ? "rgba(52,64,125,.3)" : "var(--lc-border)"}`, background: mode === "add" ? "var(--lc-teal-bg)" : "none", color: mode === "add" ? "var(--teal)" : "var(--lc-text-3)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                Add to current baseline
              </button>
              <button onClick={() => setMode("replace")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${mode === "replace" ? "rgba(168,63,50,.3)" : "var(--lc-border)"}`, background: mode === "replace" ? "var(--lc-red-bg)" : "none", color: mode === "replace" ? "var(--lc-red)" : "var(--lc-text-3)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                Replace current baseline
              </button>
            </div>
          </div>
        )}

        {conflictIds.length > 0 && (
          <div style={{ padding: "10px 13px", background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)", borderRadius: 9, fontSize: 12.5, color: "var(--lc-red)", lineHeight: 1.6, marginBottom: 16 }}>
            <strong>{conflictIds.join(", ")}</strong> already {conflictIds.length === 1 ? "exists" : "exist"} in the current baseline. Edit the pasted text to remove or renumber {conflictIds.length === 1 ? "it" : "them"} before adding, or choose Replace instead.
          </div>
        )}
        {error && <div style={{ fontSize: 12.5, color: "var(--lc-red)", marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--lc-border)", background: "none", color: "var(--lc-text-3)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={!canSubmit} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--teal)", color: "#f5f1e7", fontSize: 12.5, fontWeight: 700, cursor: canSubmit ? "pointer" : "default", opacity: canSubmit ? 1 : .5 }}>
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
