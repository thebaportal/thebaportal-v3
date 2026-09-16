export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import BAIntelligenceClient from "./BAIntelligenceClient";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function BAIntelligencePage({ searchParams }: { searchParams: { project?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const db = admin();
  const [profileRes, projectsRes] = await Promise.all([
    db.from("profiles").select("full_name, subscription_tier").eq("id", user.id).single(),
    db.from("projects").select("id, name").eq("user_id", user.id).order("updated_at", { ascending: false }),
  ]);

  // The URL project param is only a selection hint — BAIntelligenceClient validates
  // it against initialProjects (already scoped to this user above) before trusting
  // it, so an invalid or another user's id simply never gets selected.
  return (
    <BAIntelligenceClient
      user={{ email: user.email ?? "" }}
      profile={profileRes.data ?? null}
      initialProjects={projectsRes.data ?? []}
      initialProjectId={searchParams.project ?? null}
    />
  );
}
