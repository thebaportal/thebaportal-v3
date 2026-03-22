import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Reads the Supabase session from cookies and verifies it with the Supabase
 * auth server. Uses getAll() so chunked JWT cookies (sb-token.0, sb-token.1…)
 * are reassembled correctly — required for @supabase/ssr v0.5+.
 *
 * Returns the User object if authenticated, null otherwise.
 */
export async function getCareerUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
