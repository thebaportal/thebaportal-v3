import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PortfolioView, { DEFAULT_PREFS } from "../PortfolioView";
import PrintButton from "../PrintButton";
import type { PortfolioAttempt } from "../PortfolioView";
import type { UserBadge, UserProgress } from "@/lib/progress";

// ── Handle helpers ─────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function nameFromHandle(handle: string): string {
  return handle.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const displayName = nameFromHandle(params.handle);
  return {
    title: `${displayName} — BA Portfolio`,
    description: `Verified business analyst practice portfolio for ${displayName} on TheBAPortal.`,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function PublicPortfolioPage({ params }: { params: { handle: string } }) {
  // Service role client — bypasses RLS for server-side public reads only
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const handle = params.handle;
  const possibleName = nameFromHandle(handle);

  // Find profile by name (ilike match, first created wins on collision)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .ilike("full_name", possibleName)
    .order("created_at", { ascending: true })
    .limit(1);

  const profile = profiles?.[0];
  if (!profile) notFound();

  const userId = profile.id;

  const [attemptsRes, badgesRes, progressRes] = await Promise.all([
    supabase
      .from("challenge_attempts")
      .select("id, challenge_id, challenge_title, challenge_type, industry, difficulty_mode, total_score, score_problem_framing, score_root_cause, score_evidence_use, score_recommendation, completed_at, submission_text")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false }),
    supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", userId),
    supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .single(),
  ]);

  const attempts: PortfolioAttempt[] = attemptsRes.data || [];
  const badges: UserBadge[] = badgesRes.data || [];
  const progress: UserProgress = progressRes.data || {
    challenges_completed: 0, current_streak: 0, longest_streak: 0,
    avg_score: 0, total_hours: 0, ba_level: "Associate", last_active_date: null,
  };

  const joinedYear = new Date(profile.created_at).getFullYear().toString();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://thebaportal.com";
  const portfolioUrl = `${appUrl}/portfolio/${handle}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portfolioUrl)}`;

  return (
    <div>
      {/* Action bar — hidden on print */}
      <div id="portfolio-noprint" style={{
        background: "#0f172a", borderBottom: "1px solid #1e293b",
        padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>
          <strong style={{ color: "rgba(255,255,255,0.8)" }}>TheBAPortal</strong> — Verified BA Portfolio
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "#0a66c2", color: "white", borderRadius: "6px",
            padding: "7px 14px", fontSize: "12px", fontWeight: "600",
            textDecoration: "none", fontFamily: "system-ui",
          }}>
            Share on LinkedIn
          </a>
          <PrintButton />
        </div>
      </div>

      <PortfolioView
        fullName={profile.full_name || possibleName}
        baLevel={progress.ba_level}
        joinedYear={joinedYear}
        attempts={attempts}
        badges={badges}
        progress={progress}
        prefs={DEFAULT_PREFS}
        isPublic={true}
      />
    </div>
  );
}
