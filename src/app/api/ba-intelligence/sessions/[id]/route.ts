import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Reopen a single session with every finding's current review state — this is
// what makes "return later and continue review" possible.
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const db = admin();

  const { data: session, error: sessionError } = await db
    .from("ba_intel_sessions")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: findings, error: findingsError } = await db
    .from("ba_intel_findings")
    .select("*")
    .eq("session_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (findingsError) {
    console.error("[ba-intelligence/sessions/id] findings fetch failed:", findingsError);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ session, findings: findings ?? [] });
}
