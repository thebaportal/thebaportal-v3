"use client";

import { useEffect, useState } from "react";
import { sourceTransitions, type ImpactItem, type ImpactSummary, type ImpactReview, type ImpactChange } from "@/lib/projects/impact";

// Possible impacts (Slice 1) — awareness, not edits. Lists current work whose
// recorded source version has since been superseded by a newly Approved version.
// The Business Analyst decides: open the work, revise it, or mark the impact
// reviewed with no change needed. Nothing here changes any work by itself.

interface Props {
  projectId: string;
  impacts: ImpactSummary;
  onClose: () => void;
  onOpenVersion: (artifactId: string) => void;
  /** Revise from the work's current Approved version; resolves to an error message, or null on success. */
  onRevise: (approvedId: string) => Promise<string | null>;
  onReviewed: (reviews: ImpactReview[]) => void;
}

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--lc-text-4)", letterSpacing: ".1em", textTransform: "uppercase" };
const btn: React.CSSProperties = { padding: "7px 12px", borderRadius: 8, border: "1px solid var(--lc-border)", background: "var(--lc-surface)", color: "var(--lc-text-2)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const primary: React.CSSProperties = { ...btn, background: "var(--teal)", borderColor: "var(--teal)", color: "#f5f1e7" };

function stateLine(item: ImpactItem) {
  return [item.approved ? `Approved v${item.approved.version}` : null, item.draft ? `Draft v${item.draft.version} (working)` : null].filter(Boolean).join(" · ");
}

/** Changes that share one source transition are one line, listing which versions of this work recorded it. */
function transitionGroups(item: ImpactItem) {
  const groups = new Map<string, ImpactChange[]>();
  for (const c of item.changes) {
    const k = `${c.source.label}|${c.used.id}|${c.current.id}`;
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  return [...groups.values()];
}

function ItemIds({ c }: { c: ImpactChange }) {
  const r = c.requirementItems;
  if (c.source.type !== "requirements") return null;
  if (!r) return <div className="ip-ids">Item comparison unavailable — neither version has stable requirement IDs.</div>;
  const parts = [r.changed.length ? `changed ${r.changed.join(", ")}` : null, r.added.length ? `added ${r.added.join(", ")}` : null, r.removed.length ? `removed ${r.removed.join(", ")}` : null].filter(Boolean);
  return (
    <div className="ip-ids">
      {parts.length ? <>Requirement IDs: {parts.join(" · ")}</> : <>No requirement IDs changed; other content in the document did.</>}
      {c.referencedChanged.length > 0 && <div style={{ marginTop: 2 }}>This work references <strong>{c.referencedChanged.join(", ")}</strong>.</div>}
    </div>
  );
}

function ImpactCard({ item, projectId, onOpenVersion, onRevise, onReviewed }: { item: ImpactItem } & Omit<Props, "impacts" | "onClose">) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const transitions = sourceTransitions(item);
  const n = transitions.length;

  async function markReviewed() {
    setBusy(true); setError("");
    const changes = item.changes.map(c => ({ artifact_id: c.affected.id, superseded_source_id: c.used.id, new_source_id: c.current.id }));
    try {
      const res = await fetch(`/api/projects/${projectId}/impacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_reviewed", item_key: item.key, changes }) });
      const data = await res.json().catch(() => null);
      if (res.ok) { onReviewed(data.reviews); return; }
      setError(res.status === 409 ? "This impact has changed since it was shown. Reload the page to review it again." : "Couldn't save the review. Please try again.");
    } catch { setError("Couldn't save the review. Please try again."); }
    setBusy(false); setConfirming(false);
  }

  async function revise() {
    if (!item.approved) return;
    setBusy(true); setError("");
    const err = await onRevise(item.approved.id);
    if (err) { setError(err); setBusy(false); }
  }

  return (
    <div className="ip-card" data-impact-key={item.key}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "4px 12px", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 700, color: "var(--lc-text-1)" }}>{item.label}</span>
        <span style={{ fontSize: 12, color: "var(--lc-text-3)" }}>{stateLine(item)}</span>
      </div>
      {transitionGroups(item).map(group => {
        const c = group[0];
        const recordedBy = group.map(g => `${g.affected.status === "approved" ? "Approved" : "Draft"} v${g.affected.version}`).join(" and ");
        return (
          <div key={`${c.used.id}-${c.current.id}`} className="ip-change">
            <div>Built on <strong>{c.source.label} v{c.used.version}</strong> → {c.source.label} v{c.current.version} is now approved</div>
            <div style={{ fontSize: 12, color: "var(--lc-text-4)" }}>Recorded by {recordedBy}</div>
            <ItemIds c={c} />
          </div>
        );
      })}
      {confirming ? (
        <div className="ip-confirm" role="group" aria-label="Confirm review">
          <div style={{ fontWeight: 600, color: "var(--lc-text-1)" }}>
            {n === 1 ? `Mark the impact for ${item.label} as reviewed — no change needed?` : `Mark all ${n} impacts for ${item.label} as reviewed — no change needed?`}
          </div>
          <ul style={{ margin: "6px 0 6px", paddingLeft: 18 }}>{transitions.map(t => <li key={t}>{t}</li>)}</ul>
          <div style={{ fontSize: 12, color: "var(--lc-text-3)", marginBottom: 8 }}>This stays recorded for {n === 1 ? "this source version" : "these source versions"}. A later approved version of a source will raise a new impact.</div>
          <div className="ip-actions">
            <button style={primary} disabled={busy} onClick={markReviewed}>{busy ? "Saving…" : "Confirm"}</button>
            <button style={btn} disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="ip-actions">
          {item.draft && <button style={btn} onClick={() => onOpenVersion(item.draft!.id)}>Open Draft v{item.draft.version}</button>}
          {item.approved && <button style={btn} onClick={() => onOpenVersion(item.approved!.id)}>Open Approved v{item.approved.version}</button>}
          {item.approved && !item.draft && <button style={btn} disabled={busy} onClick={revise}>{busy ? "Revising…" : "Revise → new Draft"}</button>}
          <button style={btn} onClick={() => setConfirming(true)}>Mark reviewed — no change needed</button>
        </div>
      )}
      {error && <div role="alert" style={{ marginTop: 8, fontSize: 12.5, color: "var(--lc-red)" }}>{error}</div>}
    </div>
  );
}

export default function ImpactPanel(props: Props) {
  const { impacts, onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const n = impacts.items.length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
      <div role="dialog" aria-modal="true" aria-label="Possible impacts" style={{
        position: "relative", width: "min(560px, 100vw)", height: "100%", background: "var(--lc-bg)",
        borderLeft: "1px solid var(--lc-border)", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "-12px 0 32px rgba(0,0,0,.12)",
      }}>
        <header style={{ padding: "18px 22px", borderBottom: "1px solid var(--lc-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "var(--lc-surface)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--lc-text-1)" }}>Possible impacts</span>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--lc-border)", background: "none", color: "var(--lc-text-3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 28px" }}>
          {n > 0 ? (
            <>
              <p style={{ fontSize: 13, color: "var(--lc-text-2)", lineHeight: 1.6, margin: "0 0 14px" }}>
                {n} project item{n === 1 ? " was" : "s were"} built on an approved version that has since been replaced. Nothing has been changed — review each one and decide whether it needs revising.
              </p>
              {impacts.items.map(item => <ImpactCard key={item.key} item={item} {...props} />)}
            </>
          ) : impacts.connectedCount > 0 ? (
            <p style={{ fontSize: 13, color: "var(--lc-text-2)", margin: "0 0 14px" }}>No possible impacts among connected work.</p>
          ) : null}
          {impacts.unavailable.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ ...mono, marginBottom: 6 }}>Connection information unavailable</div>
              <p style={{ fontSize: 12.5, color: "var(--lc-text-3)", lineHeight: 1.6, margin: "0 0 6px" }}>
                {impacts.unavailable.length === 1 ? "This work item has" : `These ${impacts.unavailable.length} work items have`} no recorded source connections, so changes elsewhere can&apos;t be checked for {impacts.unavailable.length === 1 ? "it" : "them"}:
              </p>
              <div style={{ fontSize: 12.5, color: "var(--lc-text-2)" }}>
                {impacts.unavailable.map(u => `${u.label}${u.imported ? " (imported)" : ""}`).join(" · ")}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .ip-card { background: var(--lc-surface); border: 1px solid var(--lc-border); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 12px; }
        .ip-change { margin-top: 10px; font-size: 13px; color: var(--lc-text-2); line-height: 1.55; }
        .ip-ids { margin-top: 3px; font-size: 12.5px; color: var(--lc-text-3); overflow-wrap: anywhere; }
        .ip-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .ip-confirm { margin-top: 12px; padding: 12px 14px; border: 1px solid var(--lc-border); border-radius: 9px; background: var(--lc-bg); font-size: 13px; color: var(--lc-text-2); }
        .ip-confirm .ip-actions { margin-top: 0; }
      `}</style>
    </div>
  );
}
