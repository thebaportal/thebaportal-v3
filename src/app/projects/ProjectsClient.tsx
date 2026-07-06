"use client";

import { useRouter } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";

interface Artifact { id: string; type: string; status: string; }
interface Organization { id: string; name: string; country?: string; industry?: string; }
interface Project {
  id: string;
  name: string;
  problem_statement?: string;
  methodology?: string;
  status: string;
  created_at: string;
  updated_at: string;
  organizations?: { name: string };
  artifacts?: Artifact[];
}

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  projects: Project[];
  organizations: Organization[];
}

const METHODOLOGY_LABEL: Record<string, string> = {
  agile: "Agile",
  waterfall: "Waterfall",
  hybrid: "Hybrid",
  safe: "SAFe",
  babok: "BABOK",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active:    { bg: "rgba(31,191,159,.1)",  text: "#1fbf9f", border: "rgba(31,191,159,.2)" },
  completed: { bg: "rgba(99,102,241,.1)",  text: "#818cf8", border: "rgba(99,102,241,.2)" },
  on_hold:   { bg: "rgba(251,146,60,.1)",  text: "#fb923c", border: "rgba(251,146,60,.2)" },
  archived:  { bg: "rgba(80,80,104,.1)",   text: "#505068", border: "rgba(80,80,104,.2)" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProjectsClient({ user, profile, projects, organizations }: Props) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/projects" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 32px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.03em", marginBottom: 6 }}>
                My Projects
              </h1>
              <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.6 }}>
                {projects.length > 0
                  ? `${projects.length} project${projects.length !== 1 ? "s" : ""} across ${organizations.length} organisation${organizations.length !== 1 ? "s" : ""}`
                  : "Your work lives here. Create your first project to get started."}
              </p>
            </div>
            <button
              onClick={() => router.push("/projects/new")}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "var(--teal)", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#041a13", cursor: "pointer", flexShrink: 0, transition: "opacity .15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New project
            </button>
          </div>

          {/* Empty state */}
          {projects.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 32px", background: "var(--bg-1)", border: "1px dashed rgba(255,255,255,.08)", borderRadius: "var(--radius-lg)" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(31,191,159,.08)", border: "1px solid rgba(31,191,159,.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1fbf9f" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--t1)", marginBottom: 8 }}>
                Start your first project
              </h2>
              <p style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1.65, maxWidth: 400, margin: "0 auto 28px" }}>
                Describe your problem once. Every tool you use — Requirements, User Stories, Process Analysis — will know the context automatically.
              </p>
              <button
                onClick={() => router.push("/projects/new")}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 24px", background: "var(--teal)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#041a13", cursor: "pointer" }}
              >
                Create project
              </button>
            </div>
          )}

          {/* Projects grid */}
          {projects.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {projects.map(project => {
                const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.active;
                const artifactCount = project.artifacts?.length ?? 0;
                const approvedCount = project.artifacts?.filter(a => a.status === "approved").length ?? 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px 28px", cursor: "pointer", transition: "border-color .2s, background .2s, transform .15s", position: "relative" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(31,191,159,.2)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-2)"; (e.currentTarget as HTMLDivElement).style.transform = "translateX(3px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-1)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.01em", margin: 0 }}>
                            {project.name}
                          </h2>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, textTransform: "uppercase", letterSpacing: ".06em" }}>
                            {project.status.replace("_", " ")}
                          </span>
                          {project.methodology && (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--t3)", padding: "2px 7px", borderRadius: 5, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                              {METHODOLOGY_LABEL[project.methodology] ?? project.methodology}
                            </span>
                          )}
                        </div>

                        {project.organizations?.name && (
                          <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            {project.organizations.name}
                          </div>
                        )}

                        {project.problem_statement && (
                          <p style={{ fontSize: 13.5, color: "var(--t2)", lineHeight: 1.6, margin: "0 0 12px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as never }}>
                            {project.problem_statement}
                          </p>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--t3)" }}>
                          {artifactCount > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              {artifactCount} artifact{artifactCount !== 1 ? "s" : ""}
                              {approvedCount > 0 && <span style={{ color: "#1fbf9f" }}> · {approvedCount} approved</span>}
                            </span>
                          )}
                          <span>Updated {fmtDate(project.updated_at)}</span>
                        </div>
                      </div>

                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 4 }}><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
