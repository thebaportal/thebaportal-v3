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

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  resumes: Resume[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function ResumeCard({ resume }: { resume: Resume }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const output = resume.transformed_output as unknown as TransformOutput;
  const previewBullet = output?.preview?.[0]?.rewritten ?? "";
  const fullBullets = output?.full ?? [];
  const job = resume.job_listings;

  function handleCopy() {
    navigator.clipboard.writeText(fullBullets.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>
            {job?.title ?? "Unknown role"}
          </div>
          <div style={{ fontSize: 13, color: "var(--t3)" }}>{job?.company ?? ""}</div>
        </div>
        <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
          {timeAgo(resume.created_at)}
        </div>
      </div>

      {previewBullet && !expanded && (
        <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6, margin: "0 0 16px", borderLeft: "2px solid rgba(31,191,159,.3)", paddingLeft: 12 }}>
          {previewBullet.slice(0, 160)}{previewBullet.length > 160 ? "…" : ""}
        </p>
      )}

      {expanded && fullBullets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {fullBullets.map((b, i) => (
            <p key={i} style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6, margin: 0, borderLeft: "2px solid rgba(31,191,159,.3)", paddingLeft: 12 }}>
              {b}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(31,191,159,.3)", background: "transparent", color: "var(--teal)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}
        >
          {expanded ? "Collapse" : "View full resume"}
        </button>
        {fullBullets.length > 0 && (
          <button
            onClick={handleCopy}
            style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", color: copied ? "var(--teal)" : "var(--t3)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", transition: "color .2s" }}
          >
            {copied ? "Copied" : "Copy all"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ResumesClient({ user, profile, resumes }: Props) {
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
            Resume History
          </h1>
        </header>

        <div style={{ padding: "24px 36px", display: "flex", flexDirection: "column", gap: 16 }}>
          {resumes.length === 0 ? (
            <div style={{ padding: "48px 24px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>No resume transformations yet.</div>
              <div style={{ fontSize: 13, color: "var(--t3)", marginBottom: 16 }}>Transform your first resume from a job to get started.</div>
              <Link href="/opportunities" style={{ display: "inline-block", padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--teal)", color: "#041a13", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                Browse jobs
              </Link>
            </div>
          ) : (
            resumes.map(r => <ResumeCard key={r.id} resume={r} />)
          )}
        </div>
      </main>
    </div>
  );
}
