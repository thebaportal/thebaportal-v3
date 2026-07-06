export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import NewProjectClient from "./NewProjectClient";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function NewProjectPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const db = admin();
  const [profileRes, orgsRes] = await Promise.all([
    db.from("profiles").select("full_name, subscription_tier").eq("id", user.id).single(),
    db.from("organizations").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);

  return (
    <NewProjectClient
      user={{ email: user.email ?? "" }}
      profile={profileRes.data ?? null}
      organizations={(orgsRes.data ?? []) as Parameters<typeof NewProjectClient>[0]["organizations"]}
    />
  );
}
