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
      const dest = next && next.startsWith("/") ? next : "/projects";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  // Something went wrong — send to login with error
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}