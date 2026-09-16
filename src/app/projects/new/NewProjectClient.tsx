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
  { id: "babok",     label: "BABOK-aligned",    desc: "Business, Stakeholder, Solution Requirements" },
];

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

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--lc-bg)" }}>
      <AppSidebar activeHref="/projects" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 32px 80px" }}>

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
          <p style={{ fontSize: 14, color: "var(--lc-text-3)", lineHeight: 1.6, marginBottom: 36 }}>
            Describe your problem once. Every tool you run in this project will know the context automatically.
          </p>

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
                      style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${orgMode === mode ? "rgba(31,191,159,.3)" : "var(--lc-border)"}`, background: orgMode === mode ? "rgba(31,191,159,.08)" : "none", color: orgMode === mode ? "var(--teal)" : "var(--lc-text-3)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}
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
                    placeholder="e.g. First Bank Nigeria, Suncor Energy, ACME Corp"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(31,191,159,.4)"}
                    onBlur={e => e.target.style.borderColor = "var(--lc-border)"}
                  />
                </div>
              )}
            </div>

            {/* Project name */}
            <div>
              <label style={labelStyle}>Project name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Customer Onboarding Transformation, CEMS Obsolescence Review"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(31,191,159,.4)"}
                onBlur={e => e.target.style.borderColor = "var(--lc-border)"}
              />
            </div>

            {/* Problem statement */}
            <div>
              <label style={labelStyle}>Problem statement</label>
              <textarea value={problemStatement} onChange={e => setProblem(e.target.value)}
                placeholder="Describe the business problem in plain language. This becomes the anchor for every artifact you create in this project."
                rows={4}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.65 }}
                onFocus={e => e.target.style.borderColor = "rgba(31,191,159,.4)"}
                onBlur={e => e.target.style.borderColor = "var(--lc-border)"}
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
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: methodology === m.id ? "rgba(31,191,159,.06)" : "var(--lc-faint)", border: `1px solid ${methodology === m.id ? "rgba(31,191,159,.25)" : "var(--lc-border)"}`, borderRadius: 10, cursor: "pointer", transition: "all .15s" }}
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
                  onFocus={e => e.target.style.borderColor = "rgba(31,191,159,.4)"}
                  onBlur={e => e.target.style.borderColor = "var(--lc-border)"}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Primary country</label>
                <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={e => e.target.style.borderColor = "rgba(31,191,159,.4)"}
                  onBlur={e => e.target.style.borderColor = "var(--lc-border)"}
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
                onFocus={e => e.target.style.borderColor = "rgba(31,191,159,.4)"}
                onBlur={e => e.target.style.borderColor = "var(--lc-border)"}
              />
            </div>

            {error && (
              <div style={{ padding: "11px 14px", background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 10, fontSize: 13.5, color: "#f87171" }}>
                {error}
              </div>
            )}

            <button onClick={handleCreate} disabled={saving}
              style={{ padding: "13px 28px", background: saving ? "rgba(31,191,159,.4)" : "var(--teal)", border: "none", borderRadius: 10, fontSize: 14.5, fontWeight: 700, color: "#041a13", cursor: saving ? "not-allowed" : "pointer", transition: "opacity .15s", alignSelf: "flex-start" }}
            >
              {saving ? "Creating project..." : "Create project"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
