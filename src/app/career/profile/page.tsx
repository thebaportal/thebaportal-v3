export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import CareerProfileClient from "./CareerProfileClient";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function CareerProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const db = admin();
  const [profileRes, resumesRes] = await Promise.all([
    db.from("profiles").select("full_name, subscription_tier").eq("id", user.id).single(),
    db.from("user_resumes")
      .select("id, name, file_name, is_default, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <CareerProfileClient
      user={{ email: user.email ?? "" }}
      profile={profileRes.data ?? null}
      initialResumes={resumesRes.data ?? []}
    />
  );
}
