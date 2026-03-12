import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScenariosClient from "./ScenariosClient";

export default async function ScenariosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name")
    .eq("id", user.id)
    .single();

  return <ScenariosClient profile={profile} user={{ email: user.email! }} />;
}