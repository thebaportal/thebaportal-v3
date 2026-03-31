import { createServerClient } from "@supabase/ssr";
import { createClient }       from "@supabase/supabase-js";
import { cookies }            from "next/headers";
import { notFound }           from "next/navigation";
import Link                   from "next/link";
import type { Metadata }      from "next";
import WinThisRole            from "@/components/WinThisRole";
import { generateWinInsights } from "@/lib/jobInsights";
import type { JobListing, WinInsights } from "@/lib/jobInsights";
import type { AIWinInsights } from "@/lib/generateWinInsightsAI";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Params { params: { id: string } }

// ── Dynamic SEO metadata ──────────────────────────────────────────────────────

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await db
    .from("job_listings")
    .select("title, company, location")
    .eq("id", params.id)
    .single();

  if (!data) return { title: "Job Not Found — TheBAPortal" };

  const title = `${data.title}${data.company ? ` at ${data.company}` : ""} — TheBAPortal`;
  const description = [
    data.title,
    data.company ? `at ${data.company}` : null,
    data.location ? `in ${data.location}` : "in Canada",
    "— Get Alex Rivera's coaching breakdown before you apply.",
  ].filter(Boolean).join(" ");

  return { title, description };
}

// ── Page ─────────────────────────────────────────────────────────────────────

const C = {
  bg:         "#09090b",
  surface:    "#111117",
  border:     "#1e293b",
  teal:       "#1fbf9f",
  tealSoft:   "rgba(31,191,159,0.10)",
  tealBorder: "rgba(31,191,159,0.25)",
  text1:      "#f8fafc",
  text3:      "#94a3b8",
  text4:      "#475569",
};

export default async function JobPage({ params }: Params) {
  // Auth check (optional — no redirect)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the job
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: job } = await db
    .from("job_listings")
    .select("id, title, company, location, description, apply_url, url, posted_at, work_type, level, quality_score, prep_links, source_type, source_name, verified_apply_url, apply_url_status, win_insights")
    .eq("id", params.id)
    .single();

  if (!job) notFound();

  // Check subscription
  let isPro = false;
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    isPro = profile?.subscription_tier === "pro";
  }

  // Fetch latest saved transform for this user + job
  type SavedTransform = { preview: { original: string; rewritten: string; whyItFails: string }[]; full: string[] };
  let savedTransform: SavedTransform | null = null;
  if (user) {
    const { data: saved } = await admin
      .from("resume_transformations")
      .select("transformed_output")
      .eq("user_id", user.id)
      .eq("job_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (saved?.transformed_output) {
      savedTransform = saved.transformed_output as SavedTransform;
    }
  }

  // Build insights: prefer AI cache, fall back to rule engine
  const ruleInsights = generateWinInsights(job as JobListing);
  const aiCache = job.win_insights as AIWinInsights | null;

  const winInsights: WinInsights = aiCache ? {
    gapRows:     aiCache.gaps.map(g => ({ says: g.jobSays, tests: g.actuallyTests })),
    failReasons: aiCache.failures,
    winSteps:    ruleInsights.winSteps,
    close:       aiCache.close,
  } : ruleInsights;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter','Open Sans',sans-serif", WebkitFontSmoothing: "antialiased", color: C.text1 }}>

      {/* Nav */}
      <nav style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 24px", background: "rgba(9,9,11,0.92)", borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 16, fontWeight: 800, color: C.text1, letterSpacing: "-0.01em" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: C.tealSoft, border: `1px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.teal, fontFamily: "monospace" }}>BA</div>
            The<span style={{ color: C.teal }}>BA</span>Portal
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user ? (
              <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: C.teal, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login"  style={{ fontSize: 13, color: C.text3, textDecoration: "none" }}>Sign in</Link>
                <Link href="/signup" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: C.teal, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Win This Role content */}
      <div style={{ paddingTop: 58 }}>
        <WinThisRole
          job={job as JobListing}
          insights={winInsights}
          isLoggedIn={!!user}
          isPro={isPro}
          savedTransform={savedTransform}
        />
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px", textAlign: "center", background: C.surface }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
          {[["Home", "/"], ["Jobs", "/opportunities"], ["Pricing", "/pricing"], ["FAQ", "/faq"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([l, h]) => (
            <Link key={l} href={h!} style={{ fontSize: "12px", color: C.text4, textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>

    </div>
  );
}
