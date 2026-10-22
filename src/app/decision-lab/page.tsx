export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getEntitlements, FREE_DECISION_LAB_ANALYSES } from "@/lib/entitlements";
import DecisionLabClient from "./DecisionLabClient";

export default async function DecisionLabPage({ searchParams }: { searchParams: { project?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Plan and this month's Free allowance, for display only — every gate is enforced on the server.
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { pro } = await getEntitlements(db, user.id).catch(() => ({ pro: false }));
  const quota = pro ? null : (await db.rpc("decision_lab_quota", { p_user_id: user.id, p_limit: FREE_DECISION_LAB_ANALYSES })).data ?? null;

  // The URL project param is only a selection hint — DecisionLabClient validates it
  // against the caller's own already-ownership-scoped /api/projects list before
  // trusting it, so an invalid or another user's id simply never gets selected.
  return <DecisionLabClient user={{ email: user.email ?? "" }} initialProjectId={searchParams.project ?? null} isPro={pro} initialQuota={quota} />;
}
