"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";

interface Organization { id: string; name: string; country?: string; industry?: string; default_methodology?: string; }

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  organizations: Organization[];
}

// "none" (Not specified) persists as methodology: null, same as never
// choosing anything — see handleCreate. Structured Analysis (babok) is a
// BABOK lens on the existing tools, not a delivery approach, so it isn't
// offered here.
const DELIVERY_APPROACHES = [
  { id: "agile",     label: "Agile / Scrum" },
  { id: "waterfall", label: "Waterfall" },
  { id: "hybrid",    label: "Hybrid" },
  { id: "safe",      label: "SAFe" },
  { id: "none",      label: "Not specified" },
];

export default function NewProjectClient({ user, profile, organizations }: Props) {
  const router = useRouter();
  const hasOrg = organizations.length > 0;

  const [orgMode, setOrgMode]       = useState<"existing" | "new">(hasOrg ? "existing" : "new");
  const [orgId, setOrgId]           = useState(organizations[0]?.id ?? "");
  const [orgName, setOrgName]       = useState("");
  const [name, setName]             = useState("");
  const [context, setContext]       = useState("");
  // Always null on load, full stop — never pre-applied from an org's saved
  // default. An earlier version did that, and a stale default_methodology
  // (e.g. "agile", written before the API stopped defaulting to it) showed
  // up as a false preselection. Nothing may be selected until the BA
  // actively picks something.
  const [methodology, setMethodology] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Project name is required"); return; }
    if (orgMode === "new" && !orgName.trim()) { setError("Organisation name is required"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          problem_statement: context.trim() || undefined,
          methodology: (methodology && methodology !== "none") ? methodology : undefined,
          ...(orgMode === "existing" ? { org_id: orgId } : { org_name: orgName.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create project"); setSaving(false); return; }
      router.push(`/projects/${data.project.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%", height: 44, boxSizing: "border-box" as const, background: "var(--lc-faint)", border: "1px solid var(--lc-border)", borderRadius: 10,
    padding: "0 14px", fontSize: 14, color: "var(--lc-text-1)", outline: "none", fontFamily: "var(--font-body)",
    transition: "border-color .15s",
  };

  const labelStyle = {
    display: "block" as const, fontSize: 13, fontWeight: 600, color: "var(--lc-text-2)",
    marginBottom: 5, letterSpacing: ".01em",
  };

  const focusOn  = (e: React.FocusEvent<HTMLElement>) => { (e.target as HTMLElement).style.borderColor = "var(--teal)"; };
  const focusOff = (e: React.FocusEvent<HTMLElement>) => { (e.target as HTMLElement).style.borderColor = "var(--lc-border)"; };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--lc-bg)" }}>
      <AppSidebar activeHref="/projects" profile={profile} user={user} />

      <main className="app-shell-main" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 40px 32px" }}>

          <button onClick={() => router.push("/projects")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--lc-text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 14, transition: "color .15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--lc-text-2)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--lc-text-3)"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to projects
          </button>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.03em", marginBottom: 4 }}>
            New project
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--lc-text-3)", lineHeight: 1.5, marginBottom: 16 }}>
            Set up the project with what you know today. You can add more context as the work develops.
          </p>

          {/* One substantial form surface across the canvas width */}
          <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--lc-shadow-md)", padding: "22px 32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Project name — full width */}
              <div>
                <label style={labelStyle}>Project name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Customer onboarding redesign"
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              {/* Organisation + Delivery approach — one row on desktop */}
              <div className="np-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <label style={labelStyle}>Organisation</label>
                  {hasOrg && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      {(["existing", "new"] as const).map(mode => (
                        <button key={mode} onClick={() => setOrgMode(mode)}
                          style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${orgMode === mode ? "var(--lc-teal-border)" : "var(--lc-border)"}`, background: orgMode === mode ? "var(--lc-teal-bg)" : "none", color: orgMode === mode ? "var(--teal)" : "var(--lc-text-3)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}
                        >
                          {mode === "existing" ? "Use existing" : "Create new"}
                        </button>
                      ))}
                    </div>
                  )}
                  {orgMode === "existing" && hasOrg ? (
                    <select value={orgId} onChange={e => setOrgId(e.target.value)}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={orgName} onChange={e => setOrgName(e.target.value)}
                      placeholder="e.g. Retail client, Healthcare provider"
                      style={inputStyle}
                      onFocus={focusOn}
                      onBlur={focusOff}
                    />
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Delivery approach <span style={{ fontWeight: 400, color: "var(--lc-text-4)" }}>(optional)</span></label>
                  <select value={methodology ?? ""} onChange={e => setMethodology(e.target.value || null)}
                    style={{ ...inputStyle, cursor: "pointer", color: methodology ? "var(--lc-text-1)" : "var(--lc-text-4)" }}
                  >
                    <option value="" disabled hidden>Select if known</option>
                    {DELIVERY_APPROACHES.map(m => (
                      <option key={m.id} value={m.id} style={{ color: "var(--lc-text-1)" }}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Project context — full width, compact (2-3 visible lines) */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 3 }}>Project context</label>
                <p style={{ fontSize: 12, color: "var(--lc-text-4)", lineHeight: 1.4, margin: "0 0 6px" }}>
                  What is this initiative about? Include anything already known or already completed.
                </p>
                <textarea value={context} onChange={e => setContext(e.target.value)}
                  placeholder="e.g. Redesign the customer onboarding experience to improve activation and reduce drop-off. Some research has already been completed."
                  rows={3}
                  style={{ ...inputStyle, height: "auto", padding: "10px 14px", resize: "none", lineHeight: 1.5 }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              {error && (
                <div style={{ padding: "11px 14px", background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)", borderRadius: 10, fontSize: 13.5, color: "var(--lc-red)" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCreate} disabled={saving}
                  style={{ padding: "12px 26px", background: saving ? "var(--teal-dim)" : "var(--teal)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#f5f1e7", cursor: saving ? "not-allowed" : "pointer", transition: "opacity .15s" }}
                >
                  {saving ? "Creating project..." : "Create project"}
                </button>
                <button onClick={() => router.push("/projects")} disabled={saving}
                  style={{ padding: "12px 20px", background: "none", border: "1px solid var(--lc-border)", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "var(--lc-text-3)", cursor: saving ? "not-allowed" : "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
