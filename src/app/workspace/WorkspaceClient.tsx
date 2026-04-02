"use client";

import { useState } from "react";
import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";

interface TransformOutput {
  preview: { original: string; rewritten: string; whyItFails: string }[];
  full: string[];
}

interface Resume {
  id: string;
  created_at: string;
  transformed_output: unknown;
  job_listings: { title: string; company: string | null } | null;
}

interface SavedJob {
  id: string;
  job_id: string;
  created_at: string;
  job_listings: { id: string; title: string; company: string | null; location: string | null; work_type: string | null; level: string | null } | null;
}

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  resumes: Resume[];
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default function WorkspaceClient({ user, profile, resumes, savedJobs }: Props) {
  const isPro = profile?.subscription_tier === "pro";
  const firstName = profile?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <AppSidebar activeHref="/workspace" profile={profile} user={user} />

      <main className="flex-1 overflow-y-auto">
        <header style={{ padding: "28px 36px 0" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 4 }}>
            {firstName ? `${firstName}'s Workspace` : "My Workspace"}
          </h1>
          <p style={{ fontSize: 14, color: "var(--t3)" }}>Your resume work, saved jobs, and plan status.</p>
        </header>

        <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 40 }}>

          {/* Recent Resume Work */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>Recent Resume Work</h2>
              {resumes.length > 0 && (
                <Link href="/workspace/resumes" style={{ fontSize: 13, color: "var(--teal)", textDecoration: "none", fontWeight: 500 }}>
                  View all
                </Link>
              )}
            </div>

            {resumes.length === 0 ? (
              <EmptyState
                message="No resume transformations yet."
                cta="Browse jobs"
                href="/opportunities"
                sub="Transform your first resume from a job to get started."
              />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {resumes.map(r => <ResumeCard key={r.id} resume={r} />)}
              </div>
            )}
          </section>

          {/* Saved Jobs */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>Saved Jobs</h2>
              {savedJobs.length > 0 && (
                <Link href="/workspace/jobs" style={{ fontSize: 13, color: "var(--teal)", textDecoration: "none", fontWeight: 500 }}>
                  View all
                </Link>
              )}
            </div>

            {savedJobs.length === 0 ? (
              <EmptyState
                message="No saved jobs yet."
                cta="Browse jobs"
                href="/opportunities"
                sub="Bookmark jobs from the opportunities page to track them here."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {savedJobs.map(j => (
                  <SavedJobRow key={j.id} item={j} />
                ))}
              </div>
            )}
          </section>

          {/* Plan */}
          <section>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--t1)", marginBottom: 16 }}>Your Plan</h2>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--bg-1)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 6, background: isPro ? "rgba(31,191,159,.1)" : "rgba(255,255,255,.05)", border: isPro ? "1px solid rgba(31,191,159,.2)" : "1px solid var(--border)", fontSize: 12, fontWeight: 700, color: isPro ? "var(--teal)" : "var(--t3)", fontFamily: "var(--font-mono)" }}>
                {isPro ? "⚡ Pro Member" : "Free Plan"}
              </div>
              <Link href="/settings" style={{ fontSize: 13, color: "var(--t3)", textDecoration: "none" }}>
                Manage in Settings
              </Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

function ResumeCard({ resume }: { resume: Resume }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const output = resume.transformed_output as unknown as TransformOutput;
  const previewBullet = output?.preview?.[0]?.rewritten ?? "";
  const fullBullets = output?.full ?? [];
  const job = resume.job_listings;

  function handleCopy() {
    const text = fullBullets.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 2 }}>
          {job?.title ?? "Unknown role"}
        </div>
        <div style={{ fontSize: 13, color: "var(--t3)" }}>{job?.company ?? ""}</div>
      </div>

      {previewBullet && (
        <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.55, margin: 0, borderLeft: "2px solid rgba(31,191,159,.3)", paddingLeft: 10 }}>
          {previewBullet.slice(0, 120)}{previewBullet.length > 120 ? "…" : ""}
        </p>
      )}

      {expanded && fullBullets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fullBullets.map((b, i) => (
            <p key={i} style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.55, margin: 0, borderLeft: "2px solid rgba(31,191,159,.3)", paddingLeft: 10 }}>
              {b}
            </p>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
        {timeAgo(resume.created_at)}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", color: "var(--teal)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}
        >
          {expanded ? "Collapse" : "View full resume"}
        </button>
        {fullBullets.length > 0 && (
          <button
            onClick={handleCopy}
            style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", color: copied ? "var(--teal)" : "var(--t3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

function SavedJobRow({ item }: { item: SavedJob }) {
  const job = item.job_listings;
  if (!job) return null;
  const meta = [job.location, WORK_TYPE_LABELS[job.work_type ?? ""] ?? job.work_type, LEVEL_LABELS[job.level ?? ""] ?? job.level].filter(Boolean).join(" · ");

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {job.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--t3)" }}>
          {job.company}{meta ? ` · ${meta}` : ""}
        </div>
      </div>
      <Link
        href={`/jobs/${job.id}`}
        style={{ flexShrink: 0, padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(31,191,159,.3)", background: "transparent", color: "var(--teal)", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        View role
      </Link>
    </div>
  );
}

function EmptyState({ message, sub, cta, href }: { message: string; sub: string; cta: string; href: string }) {
  return (
    <div style={{ padding: "32px 24px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>{message}</div>
      <div style={{ fontSize: 13, color: "var(--t3)", marginBottom: 16 }}>{sub}</div>
      <Link href={href} style={{ display: "inline-block", padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--teal)", color: "#041a13", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
        {cta}
      </Link>
    </div>
  );
}
