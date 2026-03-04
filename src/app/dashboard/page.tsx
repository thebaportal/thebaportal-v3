import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id);

  const completedCount = progress?.filter(p => p.status === "completed").length ?? 0;

  return (
    <DashboardClient
      user={user}
      profile={profile}
      completedCount={completedCount}
    />
  );
}