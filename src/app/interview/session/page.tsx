export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SessionClient from "./SessionClient";

export default async function SessionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name")
    .eq("id", user.id)
    .single();

  return <SessionClient profile={profile} user={{ email: user.email! }} />;
}
