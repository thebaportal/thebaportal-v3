import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PitchReadyClient from "./PitchReadyClient";

export const metadata = { title: "PitchReady — Practice Speaking" };

export default async function PitchReadyPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("subscription_tier, full_name")
    .eq("id", user.id).single();

  return (
    <PitchReadyClient
      tier={profile?.subscription_tier ?? "free"}
      userName={profile?.full_name ?? ""}
    />
  );
}
