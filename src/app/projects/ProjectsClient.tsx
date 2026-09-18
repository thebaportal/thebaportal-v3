"use client";

import { useState, useEffect } from "react";
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
  babok: "Structured Analysis",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active:    { bg: "rgba(46,122,78,.09)",  text: "#2e7a4e", border: "rgba(46,122,78,.22)" },
  completed: { bg: "rgba(82,101,138,.09)", text: "#52658a", border: "rgba(82,101,138,.22)" },
  on_hold:   { bg: "rgba(181,116,31,.09)", text: "#b5741f", border: "rgba(181,116,31,.22)" },
  archived:  { bg: "rgba(122,115,96,.1)",  text: "#7a7360", border: "rgba(122,115,96,.2)" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProjectsClient({ user, profile, projects, organizations }: Props) {
  const router = useRouter();
  const [upgradeBanner, setUpgradeBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") !== "success" || !params.get("session_id")) return;
    fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: params.get("session_id") }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUpgradeBanner(true);
          window.history.replaceState({}, "", "/projects");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--lc-bg)" }}>
      <AppSidebar activeHref="/projects" profile={profile} user={user} />

      <main className="app-shell-main" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 32px" }}>

          {upgradeBanner && (
            <div style={{ marginBottom: 24, padding: "14px 20px", background: "var(--lc-green-bg)", border: "1px solid var(--lc-green-border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--lc-green)" }}>You are now on Pro. All tools are unlocked.</span>
              <button onClick={() => setUpgradeBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lc-text-5)", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.03em", marginBottom: 6 }}>
                My Projects
              </h1>
              <p style={{ fontSize: 14, color: "var(--lc-text-3)", lineHeight: 1.6 }}>
                {projects.length > 0
                  ? `${projects.length} project${projects.length !== 1 ? "s" : ""} across ${organizations.length} organisation${organizations.length !== 1 ? "s" : ""}`
                  : "Your work lives here. Create your first project to get started."}
              </p>
            </div>
            <button
              onClick={() => router.push("/projects/new")}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "var(--teal)", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#f5f1e7", cursor: "pointer", flexShrink: 0, transition: "opacity .15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New project
            </button>
          </div>

          {/* Empty state */}
          {projects.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 32px", background: "var(--lc-surface)", border: "1px dashed var(--lc-border)", borderRadius: "var(--radius-lg)" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--lc-teal)" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--lc-text-1)", marginBottom: 8 }}>
                Start your first project
              </h2>
              <p style={{ fontSize: 14, color: "var(--lc-text-3)", lineHeight: 1.65, maxWidth: 400, margin: "0 auto 28px" }}>
                Describe your problem once. Every tool you use — Requirements, User Stories, Process Analysis — will know the context automatically.
              </p>
              <button
                onClick={() => router.push("/projects/new")}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 24px", background: "var(--teal)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#f5f1e7", cursor: "pointer" }}
              >
                Create project
              </button>
            </div>
          )}

          {/* Projects list — compact rows, not a card gallery */}
          {projects.length > 0 && (
            <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
              {projects.map((project, i) => {
                const sc = STATUS_COLORS[project.status] ?? STATUS_COLORS.active;
                const artifactCount = project.artifacts?.length ?? 0;
                const approvedCount = project.artifacts?.filter(a => a.status === "approved").length ?? 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", cursor: "pointer", borderTop: i === 0 ? "none" : "1px solid var(--lc-border-soft)", transition: "background .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--lc-faint)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 3, flexWrap: "wrap" }}>
                        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--lc-text-1)", letterSpacing: "-0.01em", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {project.name}
                        </h2>
                        {project.methodology && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--lc-text-4)" }}>
                            {METHODOLOGY_LABEL[project.methodology] ?? project.methodology}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--lc-text-3)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {project.organizations?.name && <span>{project.organizations.name}</span>}
                        {artifactCount > 0 && (
                          <>
                            <span style={{ color: "var(--lc-text-5)" }}>·</span>
                            <span>{artifactCount} artifact{artifactCount !== 1 ? "s" : ""}{approvedCount > 0 && <span style={{ color: "var(--lc-green)" }}> · {approvedCount} approved</span>}</span>
                          </>
                        )}
                        <span style={{ color: "var(--lc-text-5)" }}>·</span>
                        <span>Updated {fmtDate(project.updated_at)}</span>
                      </div>
                    </div>

                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, textTransform: "uppercase", letterSpacing: ".06em", flexShrink: 0 }}>
                      {project.status.replace("_", " ")}
                    </span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lc-text-4)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
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
