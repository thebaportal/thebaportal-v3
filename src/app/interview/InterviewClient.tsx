"use client";

import { useRouter } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";

interface Props {
  profile: { subscription_tier: string; full_name: string | null } | null;
  user: { email: string };
}

const FEATURES = [
  {
    label: "Adaptive questioning",
    desc: "Alex follows up on what you actually say, not a script.",
  },
  {
    label: "JD-tailored questions",
    desc: "Paste a job description and Alex weights questions toward that role.",
  },
  {
    label: "Honest feedback",
    desc: "Scored on structure, specificity, BA thinking, and follow-up handling.",
  },
  {
    label: "Better Answer",
    desc: "See a rewrite of your weakest answer so you know exactly what good looks like.",
  },
];

export default function InterviewClient({ profile, user }: Props) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <AppSidebar activeHref="/interview" profile={profile} user={user} />

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "72px 32px" }}>

          {/* Eyebrow */}
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
            color: "var(--teal)", fontFamily: "monospace", marginBottom: 16,
          }}>
            Interview Lab
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800,
            letterSpacing: "-0.03em", color: "var(--text-1)",
            lineHeight: 1.08, margin: "0 0 20px",
          }}>
            Practice getting the job.
          </h1>

          <p style={{
            fontSize: 17, color: "var(--text-2)", lineHeight: 1.65,
            maxWidth: 560, margin: "0 0 48px",
          }}>
            Simulation Lab helps you do the work. Interview Lab helps you talk about it. Six adaptive questions from Alex Rivera, with real feedback on how you performed.
          </p>

          {/* Feature grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
            marginBottom: 52,
            maxWidth: 720,
          }}>
            {FEATURES.map(f => (
              <div key={f.label} style={{
                padding: "20px 22px",
                borderRadius: 14,
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.55 }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => router.push("/interview/session")}
              style={{
                padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: "var(--teal)", color: "#041a13", border: "none", cursor: "pointer",
                boxShadow: "0 0 24px rgba(31,191,159,0.25)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#25d4b0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--teal)"; }}
            >
              Start Interview
            </button>
            <span style={{ fontSize: 13, color: "var(--text-4)", fontFamily: "monospace" }}>
              6 questions · ~15 min · no audio required
            </span>
          </div>

          {/* Alex card */}
          <div style={{
            marginTop: 64,
            display: "flex", alignItems: "flex-start", gap: 20,
            padding: "24px 28px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border)",
            maxWidth: 540,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: "var(--teal-soft)", border: "1px solid var(--teal-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: "var(--teal)",
            }}>
              AR
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>
                Alex Rivera
              </div>
              <div style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600, marginBottom: 8, fontFamily: "monospace" }}>
                Senior Hiring Manager · Interview Mode
              </div>
              <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6, margin: 0 }}>
                Direct. Probing. Realistic. Alex is not here to make you feel good — Alex is here to see if you actually know your craft.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
