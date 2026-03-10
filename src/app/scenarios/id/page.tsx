import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { challenges } from "@/data/challenges";
import ChallengeClient from "./ChallengeClient";

export default async function ChallengePage({ params }: { params: { id: string } }) {
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

  const isPro = profile?.subscription_tier === "pro";
  if (challenge.tier === "pro" && !isPro) redirect("/pricing");

  return <ChallengeClient challenge={challenge} userId={user.id} />;
}