import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && user) {
      // If an explicit next param was provided (e.g. from a magic link), honour it
      if (next && next !== "/dashboard") {
        return NextResponse.redirect(`${origin}${next}`);
      }
      // Otherwise route based on simulation history
      const { count } = await supabase
        .from("challenge_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");

      const dest = (count ?? 0) > 0 ? "/dashboard?confirmed=true" : "/scenarios";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  // Something went wrong — send to login with error
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}