"use client";

import { useState, useEffect, useMemo } from "react";
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// A project card is a destination, not a status readout — name, a one-line
// sense of what it's about, when it last moved, and a way in. Everything
// else (methodology, status, artifact counts) lives inside the project
// itself once you open it.
function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        minHeight: 168, padding: "22px 24px",
        background: "var(--lc-surface)",
        border: `1px solid ${hovered ? "var(--lc-teal-border)" : "var(--lc-border)"}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: hovered ? "var(--lc-shadow-md)" : "none",
        cursor: "pointer",
        transition: "border-color .15s ease, box-shadow .15s ease",
      }}
    >
      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700,
        color: "var(--lc-text-1)", letterSpacing: "-0.01em", margin: 0,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {project.name}
      </h2>

      <p style={{
        fontSize: 13, color: "var(--lc-text-3)", lineHeight: 1.55, margin: 0,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as never,
        overflow: "hidden", flex: 1,
      }}>
        {project.problem_statement || "No description yet."}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11.5, color: "var(--lc-text-4)" }}>
          Updated {fmtDate(project.updated_at)}
        </span>
        <span style={{
          display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700,
          color: "var(--teal)", flexShrink: 0,
        }}>
          Open <span style={{ transition: "transform .15s ease", transform: hovered ? "translateX(2px)" : "none", display: "inline-block" }}>→</span>
        </span>
      </div>
    </div>
  );
}

export default function ProjectsClient({ user, profile, projects }: Props) {
  const router = useRouter();
  const [upgradeBanner, setUpgradeBanner] = useState(false);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) || (p.problem_statement ?? "").toLowerCase().includes(q)
    );
  }, [projects, query]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--lc-bg)" }}>
      <AppSidebar activeHref="/projects" profile={profile} user={user} />

      <main className="app-shell-main" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 32px" }}>

          {upgradeBanner && (
            <div style={{ marginBottom: 24, padding: "14px 20px", background: "var(--lc-green-bg)", border: "1px solid var(--lc-green-border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--lc-green)" }}>You are now on Pro. All tools are unlocked.</span>
              <button onClick={() => setUpgradeBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lc-text-5)", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Header */}
          <div className="projects-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.03em", margin: 0, flexShrink: 0 }}>
              My Projects
            </h1>

            {projects.length > 0 && (
              <div className="projects-header-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lc-text-4)" strokeWidth="2.5" strokeLinecap="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Search projects"
                    style={{
                      width: 220, boxSizing: "border-box", height: 38, padding: "0 14px 0 34px",
                      borderRadius: 9, border: "1px solid var(--lc-border)", background: "var(--lc-faint)",
                      color: "var(--lc-text-1)", fontSize: 13.5, fontFamily: "var(--font-body)", outline: "none",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--lc-teal-bg)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "var(--lc-border)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
                <button
                  onClick={() => router.push("/projects/new")}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "var(--teal)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 700, color: "#f5f1e7", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", transition: "opacity .15s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New project
                </button>
              </div>
            )}
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

          {/* Project cards */}
          {projects.length > 0 && (
            filtered.length > 0 ? (
              <div className="projects-grid">
                {filtered.map(project => (
                  <ProjectCard key={project.id} project={project} onOpen={() => router.push(`/projects/${project.id}`)} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "48px 32px", color: "var(--lc-text-4)", fontSize: 14 }}>
                No projects match &ldquo;{query}&rdquo;.
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
