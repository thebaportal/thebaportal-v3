"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PortfolioView from "./PortfolioView";
import type { PortfolioAttempt, PortfolioPrefs } from "./PortfolioView";
import type { UserBadge, UserProgress } from "@/lib/progress";

const PREFS_KEY = "portfolio_prefs";

interface Props {
  fullName: string;
  handle: string;
  portfolioUrl: string;
  joinedYear: string;
  attempts: PortfolioAttempt[];
  badges: UserBadge[];
  progress: UserProgress;
}

export default function PortfolioClient({ fullName, handle, portfolioUrl, joinedYear, attempts, badges, progress }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [prefs, setPrefs] = useState<PortfolioPrefs>({
    showSubmissions: true,
    showBadges: true,
    showModules: true,
    hiddenChallenges: [],
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const updatePrefs = useCallback((next: Partial<PortfolioPrefs>) => {
    setPrefs(prev => {
      const updated = { ...prev, ...next };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const toggleChallenge = useCallback((id: string) => {
    setPrefs(prev => {
      const hidden = prev.hiddenChallenges.includes(id)
        ? prev.hiddenChallenges.filter(x => x !== id)
        : [...prev.hiddenChallenges, id];
      const updated = { ...prev, hiddenChallenges: hidden };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(portfolioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`;

  const S = {
    page: { minHeight: "100vh", background: "#0a0d14", fontFamily: "Inter, system-ui, sans-serif" } as React.CSSProperties,
    topBar: { background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
    backBtn: { background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" } as React.CSSProperties,
    controlPanel: { background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 32px" } as React.CSSProperties,
    urlRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" as const },
    urlBox: { background: "#0a0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "JetBrains Mono, monospace", flex: 1, minWidth: "200px" } as React.CSSProperties,
    btnTeal: { background: "rgba(8,145,178,0.15)", border: "1px solid rgba(8,145,178,0.3)", borderRadius: "8px", padding: "10px 18px", color: "#22d3ee", fontSize: "13px", fontWeight: "600", cursor: "pointer" } as React.CSSProperties,
    btnLinkedIn: { background: "#0a66c2", border: "none", borderRadius: "8px", padding: "10px 18px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer" } as React.CSSProperties,
    btnPrint: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 18px", color: "rgba(255,255,255,0.6)", fontSize: "13px", cursor: "pointer" } as React.CSSProperties,
    controlsRow: { display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" as const },
    controlLabel: { fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em", marginBottom: "6px", display: "block" } as React.CSSProperties,
    toggleGroup: { display: "flex", gap: "8px", flexWrap: "wrap" as const },
    toggle: (on: boolean): React.CSSProperties => ({
      padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
      background: on ? "rgba(8,145,178,0.15)" : "rgba(255,255,255,0.04)",
      border: on ? "1px solid rgba(8,145,178,0.4)" : "1px solid rgba(255,255,255,0.08)",
      color: on ? "#22d3ee" : "rgba(255,255,255,0.4)",
    }),
    previewHeader: { padding: "16px 32px", display: "flex", alignItems: "center", gap: "12px" } as React.CSSProperties,
    previewLabel: { fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: "JetBrains Mono, monospace" } as React.CSSProperties,
    previewFrame: { margin: "0 24px 24px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" } as React.CSSProperties,
  };

  const hasNoContent = attempts.length === 0 && badges.length === 0;

  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={S.topBar}>
        <button onClick={() => router.push("/dashboard")} style={S.backBtn}>
          ← Dashboard
        </button>
        <span style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>My Portfolio</span>
        <a href={portfolioUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
          View public page ↗
        </a>
      </div>

      {/* Control panel */}
      <div style={S.controlPanel}>
        {/* URL row */}
        <div style={S.urlRow}>
          <div style={S.urlBox}>{portfolioUrl}</div>
          <button onClick={copyLink} style={{
            ...S.btnTeal,
            background: copied ? "rgba(16,185,129,0.15)" : undefined,
            border: copied ? "1px solid rgba(16,185,129,0.3)" : undefined,
            color: copied ? "#6ee7b7" : undefined,
          }}>
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.btnLinkedIn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Share on LinkedIn
          </a>
          <button onClick={() => window.print()} style={S.btnPrint}>
            Export PDF
          </button>
        </div>

        {/* Visibility controls */}
        <div style={S.controlsRow}>
          <div>
            <span style={S.controlLabel}>Sections</span>
            <div style={S.toggleGroup}>
              <button style={S.toggle(prefs.showSubmissions)} onClick={() => updatePrefs({ showSubmissions: !prefs.showSubmissions })}>
                Case Studies
              </button>
              <button style={S.toggle(prefs.showBadges)} onClick={() => updatePrefs({ showBadges: !prefs.showBadges })}>
                Badges
              </button>
              <button style={S.toggle(prefs.showModules)} onClick={() => updatePrefs({ showModules: !prefs.showModules })}>
                Module Completions
              </button>
            </div>
          </div>

          {attempts.length > 0 && (
            <div>
              <span style={S.controlLabel}>Hide Challenges</span>
              <div style={S.toggleGroup}>
                {attempts.map(a => {
                  const hidden = prefs.hiddenChallenges.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => toggleChallenge(a.id)}
                      style={{
                        padding: "6px 12px", borderRadius: "6px", fontSize: "11px", cursor: "pointer",
                        background: hidden ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                        border: hidden ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)",
                        color: hidden ? "#f87171" : "rgba(255,255,255,0.4)",
                        textDecoration: hidden ? "line-through" : "none",
                      }}>
                      {a.challenge_title.length > 28 ? `${a.challenge_title.slice(0, 28)}…` : a.challenge_title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {hasNoContent && (
        <div style={{ padding: "64px 32px", textAlign: "center", maxWidth: "480px", margin: "0 auto" }}>
          <p style={{ fontSize: "18px", fontWeight: "700", color: "rgba(255,255,255,0.75)", marginBottom: "10px", lineHeight: 1.4 }}>
            Your first case study is one challenge away.
          </p>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.35)", marginBottom: "28px", lineHeight: 1.6 }}>
            Complete a BA scenario and it appears here automatically — structured, scored, and ready to share with any recruiter.
          </p>
          <button onClick={() => router.push("/scenarios")}
            style={{ background: "rgba(8,145,178,0.15)", border: "1px solid rgba(8,145,178,0.3)", borderRadius: "8px", padding: "12px 28px", color: "#22d3ee", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
            Start your first challenge
          </button>
        </div>
      )}

      {/* Preview */}
      {!hasNoContent && (
        <>
          <div style={S.previewHeader}>
            <span style={S.previewLabel}>Portfolio Preview — what visitors see at {portfolioUrl}</span>
          </div>
          <div style={S.previewFrame}>
            <PortfolioView
              fullName={fullName}
              baLevel={progress.ba_level}
              joinedYear={joinedYear}
              attempts={attempts}
              badges={badges}
              progress={progress}
              prefs={prefs}
              isPublic={false}
            />
          </div>
        </>
      )}
    </div>
  );
}
