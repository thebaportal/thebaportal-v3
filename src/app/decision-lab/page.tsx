export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DecisionLabClient from "./DecisionLabClient";

export default async function DecisionLabPage({ searchParams }: { searchParams: { project?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // The URL project param is only a selection hint — DecisionLabClient validates it
  // against the caller's own already-ownership-scoped /api/projects list before
  // trusting it, so an invalid or another user's id simply never gets selected.
  return <DecisionLabClient user={{ email: user.email ?? "" }} initialProjectId={searchParams.project ?? null} />;
}
