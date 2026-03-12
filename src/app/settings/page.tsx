import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_pro")
    .eq("id", user.id)
    .single();

  return (
    <SettingsClient
      userId={user.id}
      email={user.email ?? ""}
      fullName={profile?.full_name ?? ""}
      isPro={profile?.is_pro ?? false}
    />
  );
}