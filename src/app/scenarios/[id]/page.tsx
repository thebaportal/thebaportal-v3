export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { challenges } from "@/data/challenges";
import ChallengeClient from "./ChallengeClient";

const INDUSTRY_KEYWORDS: Record<string, string> = {
  "Banking/Finance": "bank",
  "Healthcare": "health",
  "Energy/Oil & Gas": "energy",
  "Retail": "retail",
  "Government": "government",
  "Insurance": "insurance",
  "Telecommunications": "telecom",
  "Manufacturing": "manufactur",
};

type ValidMode = "normal" | "hard" | "expert";

export default async function ChallengePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { mode?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenge = challenges.find(c => c.id === params.id);
  if (!challenge) redirect("/scenarios");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const isPro =
    profile?.subscription_tier === "pro" ||
    profile?.subscription_tier === "enterprise";

  if (challenge.tier === "pro" && !isPro) redirect("/pricing");

  const validModes: ValidMode[] = ["normal", "hard", "expert"];
  const rawMode = searchParams.mode ?? "normal";
  const mode: ValidMode = validModes.includes(rawMode as ValidMode)
    ? (rawMode as ValidMode)
    : "normal";

  // Fetch related jobs — prefer industry match + win_insights present
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const keyword = INDUSTRY_KEYWORDS[challenge.industry] ?? null;
  let relatedJobs: { id: string; title: string; company: string | null; location: string | null }[] = [];

  if (keyword) {
    const { data } = await admin
      .from("job_listings")
      .select("id, title, company, location")
      .not("win_insights", "is", null)
      .or(`title.ilike.%${keyword}%,company.ilike.%${keyword}%`)
      .order("quality_score", { ascending: false })
      .limit(3);
    relatedJobs = data ?? [];
  }

  if (relatedJobs.length < 2) {
    const { data } = await admin
      .from("job_listings")
      .select("id, title, company, location")
      .not("win_insights", "is", null)
      .order("quality_score", { ascending: false })
      .limit(3);
    relatedJobs = data ?? [];
  }

  // Fetch active draft + prior attempt count for this user + challenge
  const [draftResult, attemptCountResult] = await Promise.all([
    admin
      .from("challenge_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("challenge_id", params.id)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("challenge_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("challenge_id", params.id)
      .neq("status", "draft"),
  ]);

  const isFirstAttempt = (attemptCountResult.count ?? 0) === 0;

  return (
    <ChallengeClient
      challenge={challenge}
      mode={mode}
      isPro={isPro}
      relatedJobs={relatedJobs}
      initialDraft={draftResult.data ?? null}
      isFirstAttempt={isFirstAttempt}
    />
  );
}