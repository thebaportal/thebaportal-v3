import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { challenges } from "@/data/challenges";
import ChallengeClient from "./ChallengeClient";

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

  return <ChallengeClient challenge={challenge} mode={mode} />;
}