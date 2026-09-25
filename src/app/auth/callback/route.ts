import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Every email-OTP flow (magic link, invite, signup confirmation, email
// change) redirects here with token_hash + type once the "Magic Link"
// (and any other) email template is updated to Supabase's documented SSR
// confirmation format. Kept as a local literal union rather than importing
// EmailOtpType from @supabase/supabase-js, whose public export surface
// doesn't reliably re-export auth-js's internal types across versions.
const VALID_OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
type OtpType = typeof VALID_OTP_TYPES[number];
function isOtpType(value: string | null): value is OtpType {
  return !!value && (VALID_OTP_TYPES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");
  const dest = next && next.startsWith("/") ? next : "/projects";

  const supabase = await createClient();

  // PKCE / OAuth-style code exchange — unchanged. Nothing currently issues
  // a link with ?code=, but this stays as-is so we never regress a flow
  // that might rely on it (e.g. if OAuth is added later).
  if (code) {
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && user) return NextResponse.redirect(`${origin}${dest}`);
  }

  // Magic link / email OTP — Supabase's documented server-side confirmation
  // flow for apps using cookie-based sessions (@supabase/ssr). The email
  // template must send token_hash + type, NOT {{ .ConfirmationURL }} — that
  // legacy variable points at Supabase's own /auth/v1/verify endpoint, which
  // redirects back with the session encoded in a URL hash fragment. A hash
  // fragment is never sent to the server (browsers don't transmit it in the
  // request), so this route previously had no way to see it at all — code
  // was always null, verifyOtp was never attempted, and every magic link
  // silently fell through to the login screen with no explanation.
  if (token_hash && isOtpType(type)) {
    const { data: { user }, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error && user) return NextResponse.redirect(`${origin}${dest}`);
  }

  // Never silently drop the user back on the plain password form — send a
  // specific, visible reason the login page can display.
  return NextResponse.redirect(`${origin}/auth/login?error=link_invalid`);
}
