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

const METHODOLOGIES = [
  { id: "agile",     label: "Agile / Scrum",   desc: "User Stories, Sprints, Acceptance Criteria" },
  { id: "waterfall", label: "Waterfall",        desc: "FRD, Numbered Requirements, Sign-off" },
  { id: "hybrid",    label: "Hybrid",           desc: "User Stories + FRD Summary" },
  { id: "safe",      label: "SAFe",             desc: "Epics, Features, Stories Hierarchy" },
  { id: "babok",     label: "Structured Analysis", desc: "Business, Stakeholder, Solution Requirements" },
];

// User Stories is the one workstream whose fit genuinely changes with
// methodology (see WORKSTREAMS in ProjectWorkspaceClient — methodologies
// list). Everything else applies to all five. Keep this panel honest: it
// only claims what the product actually does differently.
const USER_STORIES_NATURAL_FIT = ["agile", "safe", "hybrid"];

const WORKSTREAM_NAMES = ["Problem Analysis", "Stakeholder Analysis", "Requirements", "User Stories", "Process Analysis", "Business Case", "Testing"];

const INDUSTRIES = ["Banking & Finance", "Healthcare", "Energy & Utilities", "Insurance", "Government & Public Sector", "Technology", "Retail & E-commerce", "Telecommunications", "Manufacturing", "Education", "Other"];

const COUNTRIES = ["Nigeria", "United Kingdom", "United States", "Canada", "South Africa", "Ghana", "Kenya", "Australia", "UAE", "India", "Other"];

export default function NewProjectClient({ user, profile, organizations }: Props) {
  const router = useRouter();
  const hasOrg = organizations.length > 0;

  const [orgMode, setOrgMode]       = useState<"existing" | "new">(hasOrg ? "existing" : "new");
  const [orgId, setOrgId]           = useState(organizations[0]?.id ?? "");
  const [orgName, setOrgName]       = useState("");
  const [name, setName]             = useState("");
  const [problemStatement, setProblem] = useState("");
  const [methodology, setMethodology]  = useState(organizations[0]?.default_methodology ?? "agile");
  const [industry, setIndustry]     = useState(organizations[0]?.industry ?? "");
  const [country, setCountry]       = useState(organizations[0]?.country ?? "");
  const [context, setContext]       = useState("");
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
          problem_statement: problemStatement.trim() || undefined,
          methodology,
          industry: industry || undefined,
          country: country || undefined,
          relevant_context: context.trim() || undefined,
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
    width: "100%", background: "var(--lc-faint)", border: "1px solid var(--lc-border)", borderRadius: 10,
    padding: "11px 14px", fontSize: 14, color: "var(--lc-text-1)", outline: "none", fontFamily: "var(--font-body)",
    transition: "border-color .15s",
  };

  const labelStyle = {
    display: "block" as const, fontSize: 12.5, fontWeight: 600, color: "var(--lc-text-2)",
    marginBottom: 6, letterSpacing: ".01em",
  };

  const focusOn  = (e: React.FocusEvent<HTMLElement>) => { (e.target as HTMLElement).style.borderColor = "var(--teal)"; };
  const focusOff = (e: React.FocusEvent<HTMLElement>) => { (e.target as HTMLElement).style.borderColor = "var(--lc-border)"; };

  const selectedMethodology = METHODOLOGIES.find(m => m.id === methodology);
  const userStoriesFits = USER_STORIES_NATURAL_FIT.includes(methodology);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--lc-bg)" }}>
      <AppSidebar activeHref="/projects" profile={profile} user={user} />

      <main className="app-shell-main" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 32px 80px" }}>

          {/* Back */}
          <button onClick={() => router.push("/projects")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--lc-text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 32, transition: "color .15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--lc-text-2)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--lc-text-3)"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to projects
          </button>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.03em", marginBottom: 6 }}>
            New project
          </h1>
          <p style={{ fontSize: 14, color: "var(--lc-text-3)", lineHeight: 1.6, marginBottom: 32 }}>
            Describe your problem once. Every tool you run in this project will know the context automatically.
          </p>

          <div className="np-grid" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 28, alignItems: "start" }}>

            {/* ── Primary form ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Organisation */}
              <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius)", padding: "20px 22px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--lc-text-3)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>
                  Organisation
                </div>

                {hasOrg && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {(["existing", "new"] as const).map(mode => (
                      <button key={mode} onClick={() => setOrgMode(mode)}
                        style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${orgMode === mode ? "var(--lc-teal-border)" : "var(--lc-border)"}`, background: orgMode === mode ? "var(--lc-teal-bg)" : "none", color: orgMode === mode ? "var(--teal)" : "var(--lc-text-3)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}
                      >
                        {mode === "existing" ? "Use existing" : "Create new"}
                      </button>
                    ))}
                  </div>
                )}

                {orgMode === "existing" && hasOrg ? (
                  <select value={orgId} onChange={e => {
                    setOrgId(e.target.value);
                    const org = organizations.find(o => o.id === e.target.value);
                    if (org) {
                      if (org.default_methodology) setMethodology(org.default_methodology);
                      if (org.industry) setIndustry(org.industry);
                      if (org.country) setCountry(org.country);
                    }
                  }}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <label style={labelStyle}>Organisation / Client Name</label>
                    <input value={orgName} onChange={e => setOrgName(e.target.value)}
                      placeholder="e.g. Retail client, Healthcare provider"
                      style={inputStyle}
                      onFocus={focusOn}
                      onBlur={focusOff}
                    />
                  </div>
                )}
              </div>

              {/* Project name */}
              <div>
                <label style={labelStyle}>Project name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Customer onboarding redesign"
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              {/* Problem statement */}
              <div>
                <label style={labelStyle}>Problem statement</label>
                <textarea value={problemStatement} onChange={e => setProblem(e.target.value)}
                  placeholder="Describe the business problem in plain language. This becomes the anchor for every artifact you create in this project."
                  rows={4}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.65 }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                <div style={{ fontSize: 12, color: "var(--lc-text-4)", marginTop: 5 }}>
                  The more specific you are here, the better every tool performs.
                </div>
              </div>

              {/* Methodology */}
              <div>
                <label style={labelStyle}>Methodology</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {METHODOLOGIES.map(m => (
                    <label key={m.id}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: methodology === m.id ? "var(--lc-teal-bg)" : "var(--lc-faint)", border: `1px solid ${methodology === m.id ? "var(--lc-teal-border)" : "var(--lc-border)"}`, borderRadius: 10, cursor: "pointer", transition: "all .15s" }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${methodology === m.id ? "var(--teal)" : "var(--lc-text-4)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "border-color .15s" }}>
                        {methodology === m.id && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--teal)" }} />}
                      </div>
                      <input type="radio" name="methodology" value={m.id} checked={methodology === m.id} onChange={() => setMethodology(m.id)} style={{ display: "none" }} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--lc-text-1)", marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 12, color: "var(--lc-text-3)" }}>{m.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Industry + Country */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Industry</label>
                  <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Primary country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Additional context */}
              <div>
                <label style={labelStyle}>Additional context <span style={{ fontWeight: 400, color: "var(--lc-text-4)" }}>(optional)</span></label>
                <textarea value={context} onChange={e => setContext(e.target.value)}
                  placeholder="Any other context the tools should know — stakeholder constraints, existing systems, regulatory context, previous decisions."
                  rows={3}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.65 }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              {error && (
                <div style={{ padding: "11px 14px", background: "var(--lc-red-bg)", border: "1px solid var(--lc-red-border)", borderRadius: 10, fontSize: 13.5, color: "var(--lc-red)" }}>
                  {error}
                </div>
              )}

              <button onClick={handleCreate} disabled={saving}
                style={{ padding: "13px 28px", background: saving ? "var(--teal-dim)" : "var(--teal)", border: "none", borderRadius: 10, fontSize: 14.5, fontWeight: 700, color: "#f5f1e7", cursor: saving ? "not-allowed" : "pointer", transition: "opacity .15s", alignSelf: "flex-start" }}
              >
                {saving ? "Creating project..." : "Create project"}
              </button>
            </div>

            {/* ── Secondary panel — methodology-aware setup guidance. Updates
                live with the selection on the left; never generic filler. ── */}
            <div className="np-companion" style={{ background: "var(--lc-faint)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius)", padding: "20px 22px", position: "sticky", top: 0 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--teal)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 10 }}>
                {selectedMethodology?.label ?? "Methodology"} selected
              </div>
              <p style={{ fontSize: 13, color: "var(--lc-text-2)", lineHeight: 1.6, margin: "0 0 14px" }}>
                {userStoriesFits
                  ? "User Stories fits naturally here — it'll be suggested right after Requirements."
                  : "User Stories is tagged “Agile only” under this methodology — still available if you need it, just not the natural next step. Requirements, Business Case, and Testing apply the same way regardless of methodology."}
              </p>

              <div style={{ height: 1, background: "var(--lc-border)", margin: "14px 0" }} />

              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--lc-text-3)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 10 }}>
                This project's workstreams
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {WORKSTREAM_NAMES.map(w => (
                  <span key={w} style={{ fontSize: 11.5, color: "var(--lc-text-3)", background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: 6, padding: "3px 8px" }}>{w}</span>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "var(--lc-text-4)", lineHeight: 1.6, margin: "12px 0 0" }}>
                All seven share this project&apos;s context automatically — nothing gets re-explained tool to tool.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
