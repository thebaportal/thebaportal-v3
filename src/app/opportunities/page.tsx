import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OpportunitiesClient from "./OpportunitiesClient";

export const metadata = { title: "Opportunities — TheBAPortal" };

export default async function OpportunitiesPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_tier")
    .eq("id", user.id)
    .single();

  return <OpportunitiesClient profile={profile} user={{ email: user.email || "" }} />;
}
