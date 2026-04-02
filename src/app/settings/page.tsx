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

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, subscription_tier, subscription_status, subscription_current_period_end, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const isPro = profile?.subscription_tier === "pro";

  return (
    <SettingsClient
      userId={user.id}
      email={user.email ?? ""}
      fullName={profile?.full_name ?? ""}
      isPro={isPro}
      subscriptionStatus={profile?.subscription_status ?? null}
      periodEnd={profile?.subscription_current_period_end ?? null}
      hasPortal={!!profile?.stripe_customer_id}
    />
  );
}