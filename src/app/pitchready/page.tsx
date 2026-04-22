export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import PitchReadyClient from "./PitchReadyClient";

export const metadata = { title: "PitchReady — BA Communication Practice" };

export default async function PitchReadyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles").select("subscription_tier, full_name")
    .eq("id", user.id).single();

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: sessionsData } = await admin
    .from("pitch_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <PitchReadyClient
      tier={profile?.subscription_tier ?? "free"}
      userName={profile?.full_name ?? ""}
      initialSessions={sessionsData ?? []}
      profile={profile ?? null}
      user={{ email: user.email ?? "" }}
    />
  );
}
