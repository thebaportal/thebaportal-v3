import { createClient } from "@/lib/supabase/client";

/**
 * Returns the correct post-auth destination.
 * - No completed simulations → /scenarios (first-time onboarding)
 * - At least 1 completed simulation → /dashboard
 */
export async function getPostAuthRedirect(): Promise<string> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "/scenarios";

    const { count } = await supabase
      .from("challenge_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed");

    return (count ?? 0) > 0 ? "/dashboard" : "/scenarios";
  } catch {
    return "/scenarios";
  }
}
