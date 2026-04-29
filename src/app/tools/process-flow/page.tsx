import { createClient } from "@/lib/supabase/server";
import ProcessFlowClient from "./ProcessFlowClient";

export default async function ProcessFlowPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = user
    ? (await supabase.from("profiles").select("subscription_tier, full_name").eq("id", user.id).single()).data
    : null;

  return <ProcessFlowClient profile={profile} user={user ? { email: user.email! } : null} />;
}
