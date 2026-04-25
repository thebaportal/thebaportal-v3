import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProcessFlowClient from "./ProcessFlowClient";

export default async function ProcessFlowPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name")
    .eq("id", user.id)
    .single();

  return <ProcessFlowClient profile={profile} user={{ email: user.email! }} />;
}
