"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";

interface UserResume {
  id: string;
  name: string;
  file_name: string | null;
  is_default: boolean;
  created_at: string;
}

interface Props {
  user: { email: string };
  profile: { full_name: string | null; subscription_tier: string | null } | null;
  initialResumes: UserResume[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CareerProfileClient({ user, profile, initialResumes }: Props) {
  const [resumes, setResumes] = useState<UserResume[]>(initialResumes);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file?: File) {
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      else if (pastedText.trim()) form.append("text", pastedText.trim());
      else { setUploadError("Please upload a file or paste your resume text."); setUploading(false); return; }
      form.append("name", resumeName.trim() || (file?.name.replace(/\.[^.]+$/, "") ?? "My Resume"));

      const res = await fetch("/api/career/profile/resumes", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || "Something went wrong."); return; }
      setResumes(prev => [data.resume, ...prev]);
      setPastedText("");
      setResumeName("");
      setPasteMode(false);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  async function handleSetDefault(id: string) {
    const res = await fetch(`/api/career/profile/resumes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    if (res.ok) {
      setResumes(prev => prev.map(r => ({ ...r, is_default: r.id === id })));
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    const res = await fetch(`/api/career/profile/resumes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    if (res.ok) {
      setResumes(prev => prev.map(r => r.id === id ? { ...r, name: editingName.trim() } : r));
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/career/profile/resumes/${id}`, { method: "DELETE" });
      setResumes(prev => {
        const remaining = prev.filter(r => r.id !== id);
        const wasDefault = prev.find(r => r.id === id)?.is_default;
        if (wasDefault && remaining.length > 0) remaining[0].is_default = true;
        return remaining;
      });
    } finally {
      setDeletingId(null);
    }
  }

  const defaultResume = resumes.find(r => r.is_default);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--lc-bg)" }}>
      <AppSidebar activeHref="/workspace" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <Link href="/workspace" style={{ fontSize: 13, color: "var(--lc-text-3)", textDecoration: "none", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              ← Workspace
            </Link>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--lc-text-1)", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
              Career Profile
            </h1>
            <p style={{ fontSize: 14, color: "var(--lc-text-3)", margin: 0, lineHeight: 1.6 }}>
              We remember everything you have done, even when your current resume does not.
              Upload every version you have ever had — we find the experience you stopped showing.
            </p>
          </div>

          {/* Default resume callout */}
          {defaultResume && (
            <div style={{ background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--lc-teal)", fontWeight: 600 }}>Default resume</span>
              <span style={{ fontSize: 13, color: "var(--lc-text-2)" }}>{defaultResume.name}</span>
              <span style={{ fontSize: 12, color: "var(--lc-text-4)", marginLeft: "auto" }}>Used for job matching</span>
            </div>
          )}

          {/* Upload section */}
          <div style={{ background: "var(--lc-surface)", border: "1px solid var(--lc-border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--lc-text-2)", marginBottom: 16, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
              Add a resume
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--lc-text-3)", marginBottom: 6 }}>
                Label (optional)
              </label>
              <input
                type="text"
                placeholder='e.g. "BA Resume", "Procurement Resume", "2019 Version"'
                value={resumeName}
                onChange={e => setResumeName(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--lc-border)", fontSize: 14, color: "var(--lc-text-1)", background: "#f8fafc", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            {!pasteMode ? (
              <div>
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, border: `2px dashed var(--lc-border)`, borderRadius: 10, padding: "28px 20px",
                  textAlign: "center", cursor: uploading ? "wait" : "pointer",
                  background: "var(--lc-faint)", transition: "all 0.15s",
                }}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
                  />
                  {uploading ? (
                    <span style={{ fontSize: 14, color: "var(--lc-text-3)" }}>Saving your resume…</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 22, opacity: 0.4 }}>↑</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--lc-text-2)" }}>Click to upload</span>
                      <span style={{ fontSize: 12, color: "var(--lc-text-4)" }}>Word (.docx), PDF, or plain text</span>
                    </>
                  )}
                </label>
                <button
                  onClick={() => setPasteMode(true)}
                  style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "var(--lc-teal)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                >
                  Paste text instead
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  rows={8}
                  placeholder="Paste your resume text here…"
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--lc-border)", fontSize: 13, color: "var(--lc-text-1)", background: "#f8fafc", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => handleUpload()}
                    disabled={uploading || pastedText.trim().length < 50}
                    style={{ padding: "10px 20px", borderRadius: 8, background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", color: "var(--lc-teal)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: pastedText.trim().length < 50 ? 0.5 : 1 }}
                  >
                    {uploading ? "Saving…" : "Save resume"}
                  </button>
                  <button
                    onClick={() => { setPasteMode(false); setPastedText(""); }}
                    style={{ padding: "10px 16px", borderRadius: 8, background: "transparent", border: "1px solid var(--lc-border)", color: "var(--lc-text-3)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {uploadError && (
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--lc-red)", margin: "10px 0 0" }}>{uploadError}</p>
            )}
          </div>

          {/* Resume list */}
          {resumes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--lc-text-4)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                {resumes.length} resume{resumes.length !== 1 ? "s" : ""} stored
              </div>

              {resumes.map(r => (
                <div key={r.id} style={{ background: "var(--lc-surface)", border: `1px solid ${r.is_default ? "var(--lc-teal-border)" : "var(--lc-border)"}`, borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingId === r.id ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          autoFocus
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleRename(r.id); if (e.key === "Escape") setEditingId(null); }}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--lc-teal-border)", fontSize: 14, fontFamily: "inherit", color: "var(--lc-text-1)", background: "var(--lc-teal-bg)" }}
                        />
                        <button onClick={() => handleRename(r.id)} style={{ fontSize: 12, color: "var(--lc-teal)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ fontSize: 12, color: "var(--lc-text-4)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--lc-text-1)" }}>{r.name}</span>
                        {r.is_default && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lc-teal)", background: "var(--lc-teal-bg)", border: "1px solid var(--lc-teal-border)", borderRadius: 4, padding: "2px 7px", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>DEFAULT</span>
                        )}
                        <span style={{ fontSize: 12, color: "var(--lc-text-4)" }}>{timeAgo(r.created_at)}</span>
                      </div>
                    )}
                    {r.file_name && editingId !== r.id && (
                      <div style={{ fontSize: 12, color: "var(--lc-text-4)", marginTop: 2 }}>{r.file_name}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {!r.is_default && (
                      <button
                        onClick={() => handleSetDefault(r.id)}
                        style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--lc-border)", background: "transparent", color: "var(--lc-text-3)", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingId(r.id); setEditingName(r.name); }}
                      style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--lc-border)", background: "transparent", color: "var(--lc-text-3)", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "var(--lc-red)", cursor: "pointer", fontFamily: "inherit", opacity: deletingId === r.id ? 0.5 : 1 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resumes.length === 0 && !uploading && (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--lc-text-4)", fontSize: 14 }}>
              Upload your first resume above. Every version you add helps us find experience you are not currently showing.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
