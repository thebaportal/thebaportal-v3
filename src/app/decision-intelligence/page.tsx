import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DecisionIntelligenceClient from "./DecisionIntelligenceClient";

export const metadata = { title: "Decision Intelligence — TheBAPortal" };

export default async function DecisionIntelligencePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_tier")
    .eq("id", user.id)
    .single();

  return <DecisionIntelligenceClient profile={profile} user={{ email: user.email || "" }} />;
}
