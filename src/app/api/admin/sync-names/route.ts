import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// One-time route: backfills full_name into profiles from auth metadata
// Call: POST /api/admin/sync-names with header x-admin-secret: <service role key>
export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get all auth users
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return Response.json({ error: listError.message }, { status: 500 });

  const results: { id: string; email: string; name: string; status: string }[] = [];

  for (const user of users) {
    const fullName = (user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    if (!fullName) {
      results.push({ id: user.id, email: user.email || "", name: "", status: "skipped — no name in metadata" });
      continue;
    }

    const { error } = await admin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id)
      .is("full_name", null);

    results.push({
      id: user.id,
      email: user.email || "",
      name: fullName,
      status: error ? `error: ${error.message}` : "updated",
    });
  }

  return Response.json({ success: true, results });
}
