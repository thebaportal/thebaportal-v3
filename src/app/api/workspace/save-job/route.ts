import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { job_id } = await request.json();
  if (!job_id) return NextResponse.json({ error: "missing job_id" }, { status: 400 });

  const { error } = await admin()
    .from("saved_jobs")
    .upsert({ user_id: user.id, job_id }, { onConflict: "user_id,job_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { job_id } = await request.json();
  if (!job_id) return NextResponse.json({ error: "missing job_id" }, { status: 400 });

  const { error } = await admin()
    .from("saved_jobs")
    .delete()
    .eq("user_id", user.id)
    .eq("job_id", job_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: false });
}
