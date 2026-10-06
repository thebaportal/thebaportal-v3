"use client";

import { useEffect, useState } from "react";
import { parseContextBlocks } from "@/lib/projects/contextText";

interface ContextNote {
  id: string;
  source_label: string;
  source_preview: string;
  status: string;
  created_at: string;
}

interface Props {
  projectId: string;
  overview?: string;
  onClose: () => void;
  // Lets the workspace hand a new note to every workstream without a reload.
  onNoteAdded?: (note: { id: string; source_label: string; source_text: string; created_at: string }) => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Source/type label a BA Intelligence-analyzed session already carries
// ("Stakeholder Input" etc.) reads fine as-is; a plain logged note is
// labelled by what it actually is, not dressed up as something analyzed.
function sourceTypeLabel(note: ContextNote): string {
  if (note.status === "noted") return note.source_label || "Project note";
  return note.source_label || "Stakeholder input";
}

export default function ProjectContextDrawer({ projectId, overview, onClose, onNoteAdded }: Props) {
  const [notes, setNotes] = useState<ContextNote[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ba-intelligence/sessions?project_id=${projectId}`)
      .then(res => res.json())
      .then(data => { if (!cancelled) setNotes(data.sessions ?? []); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    // Escape while typing a note only leaves the textarea, so an unsaved
    // draft is never lost to a stray keypress; a second Escape closes.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (e.target instanceof HTMLTextAreaElement) { e.target.blur(); return; }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/context-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? "Could not save. Please try again."); return; }
      const note = data.note as { id: string; source_label: string; source_text: string; status: string; created_at: string };
      setNotes(prev => [
        { id: note.id, source_label: note.source_label, source_preview: note.source_text.length > 160 ? `${note.source_text.slice(0, 160)}...` : note.source_text, status: note.status, created_at: note.created_at },
        ...(prev ?? []),
      ]);
      setDraft("");
      onNoteAdded?.({ id: note.id, source_label: note.source_label, source_text: note.source_text, created_at: note.created_at });
    } catch {
      setSaveError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
      <div style={{
        position: "relative", width: "min(480px, 100vw)", height: "100%", background: "var(--lc-bg)",
        borderLeft: "1px solid var(--lc-border)", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "-12px 0 32px rgba(0,0,0,.12)",
      }}>
        <header style={{ padding: "18px 22px", borderBottom: "1px solid var(--lc-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "var(--lc-surface)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--lc-text-1)" }}>Project Context</span>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--lc-border)", background: "none", color: "var(--lc-text-3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {/* Project overview — the original context entered at creation */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--lc-text-4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
              Project overview
            </div>
            {overview ? (
              <div>
                {parseContextBlocks(overview).map((block, i) => block.type === "list" ? (
                  <ul key={i} style={{ margin: "0 0 10px", paddingLeft: 18, listStyle: "disc" }}>
                    {block.items.map((item, j) => <li key={j} style={{ fontSize: 13, color: "var(--lc-text-2)", lineHeight: 1.65, marginBottom: 4 }}>{item}</li>)}
                  </ul>
                ) : (
                  <p key={i} style={{ fontSize: 13, color: "var(--lc-text-2)", lineHeight: 1.65, margin: "0 0 10px" }}>{block.text}</p>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--lc-text-4)", lineHeight: 1.6, margin: 0 }}>No project context was entered when this project was created.</p>
            )}
          </div>

          {/* Add context — plain source material, not automatically trusted findings */}
          <div style={{ marginBottom: 24, padding: "14px 16px", background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--lc-text-4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
              Add context
            </div>
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Add meeting notes, background, constraints, clarifications, or anything else the project should know."
              rows={4}
              style={{ width: "100%", boxSizing: "border-box", background: "var(--lc-faint)", border: "1px solid var(--lc-border)", borderRadius: 9, padding: "10px 12px", fontSize: 13, lineHeight: 1.55, color: "var(--lc-text-1)", fontFamily: "inherit", resize: "none", marginBottom: 10 }} />
            {saveError && <div style={{ fontSize: 12, color: "var(--lc-red)", marginBottom: 8 }}>{saveError}</div>}
            <button onClick={handleSave} disabled={!draft.trim() || saving}
              style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--teal)", color: "#f5f1e7", fontSize: 12.5, fontWeight: 700, cursor: draft.trim() && !saving ? "pointer" : "default", opacity: draft.trim() && !saving ? 1 : .5 }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {/* Context & notes — chronological, never auto-promoted to validated
              knowledge; BA Intelligence findings extracted from a session
              still require explicit accept/reject, unaffected by this view. */}
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--lc-text-4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>
              Context &amp; notes
            </div>
            {notes === null && !loadError && (
              <div style={{ fontSize: 12.5, color: "var(--lc-text-4)" }}>Loading…</div>
            )}
            {loadError && (
              <div style={{ fontSize: 12.5, color: "var(--lc-text-4)" }}>Could not load context history.</div>
            )}
            {notes && notes.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--lc-text-4)", lineHeight: 1.6 }}>Nothing added yet. Notes, meeting input, and stakeholder material you add to the project will appear here in order.</div>
            )}
            {notes && notes.map(note => (
              <div key={note.id} style={{ padding: "11px 13px", borderRadius: 9, border: "1px solid var(--lc-border)", background: "var(--lc-surface)", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--teal)" }}>{sourceTypeLabel(note)}</span>
                  <span style={{ fontSize: 10.5, color: "var(--lc-text-4)", flexShrink: 0 }}>{fmtDate(note.created_at)}</span>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--lc-text-2)", lineHeight: 1.55, margin: 0 }}>{note.source_preview}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
