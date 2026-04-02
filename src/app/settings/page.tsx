export const dynamic = "force-dynamic";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("full_name, subscription_tier")
    .eq("id", user.id)
    .single();

  if (profileError) console.error("[settings] profile read error:", profileError.message, profileError.code, profileError.details);

  const isPro = profile?.subscription_tier === "pro";

  console.log("[settings] user:", user.id, "subscription_tier:", profile?.subscription_tier, "isPro:", isPro);

  return (
    <SettingsClient
      userId={user.id}
      email={user.email ?? ""}
      fullName={profile?.full_name ?? ""}
      isPro={isPro}
    />
  );
}