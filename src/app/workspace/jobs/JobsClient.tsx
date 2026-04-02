"use client";

import { useState } from "react";
import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";

interface SavedJob {
  id: string;
  job_id: string;
  created_at: string;
  job_listings: { id: string; title: string; company: string | null; location: string | null; work_type: string | null; level: string | null } | null;
}

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  savedJobs: SavedJob[];
}

const LEVEL_LABELS: Record<string, string> = {
  junior: "Junior",
  intermediate: "Intermediate",
  senior: "Senior",
  lead: "Lead / Principal",
};
const WORK_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  on_site: "On-site",
};

export default function JobsClient({ user, profile, savedJobs }: Props) {
  const [jobs, setJobs] = useState(savedJobs);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleUnsave(jobId: string) {
    setRemoving(jobId);
    try {
      await fetch("/api/workspace/save-job", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      setJobs(prev => prev.filter(j => j.job_id !== jobId));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <AppSidebar activeHref="/workspace" profile={profile} user={user} />

      <main className="flex-1 overflow-y-auto">
        <header style={{ padding: "28px 36px 0", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Link href="/workspace" style={{ fontSize: 13, color: "var(--t3)", textDecoration: "none", fontWeight: 500 }}>
            ← Workspace
          </Link>
          <span style={{ color: "var(--border)" }}>·</span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em" }}>
            Saved Jobs
          </h1>
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--t3)", fontFamily: "var(--font-mono)" }}>{jobs.length} saved</span>
        </header>

        <div style={{ padding: "24px 36px", display: "flex", flexDirection: "column", gap: 8 }}>
          {jobs.length === 0 ? (
            <div style={{ padding: "48px 24px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>No saved jobs yet.</div>
              <div style={{ fontSize: 13, color: "var(--t3)", marginBottom: 16 }}>Bookmark jobs from the opportunities page to track them here.</div>
              <Link href="/opportunities" style={{ display: "inline-block", padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--teal)", color: "#041a13", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Browse jobs
              </Link>
            </div>
          ) : (
            jobs.map(j => {
              const job = j.job_listings;
              if (!job) return null;
              const meta = [
                job.location,
                WORK_TYPE_LABELS[job.work_type ?? ""] ?? job.work_type,
                LEVEL_LABELS[job.level ?? ""] ?? job.level,
              ].filter(Boolean).join(" · ");

              return (
                <div key={j.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--t1)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {job.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--t3)" }}>
                      {job.company}{meta ? ` · ${meta}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Link
                      href={`/jobs/${job.id}`}
                      style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(31,191,159,.3)", background: "transparent", color: "var(--teal)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                    >
                      View role
                    </Link>
                    <button
                      onClick={() => handleUnsave(j.job_id)}
                      disabled={removing === j.job_id}
                      style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", color: "var(--t3)", fontSize: 13, cursor: removing === j.job_id ? "wait" : "pointer", fontFamily: "var(--font-body)", opacity: removing === j.job_id ? 0.5 : 1 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
