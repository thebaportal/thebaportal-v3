import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScenariosClient from "./ScenariosClient";

interface PageProps {
  searchParams: { practicing?: string; company?: string; types?: string; confirmed?: string };
}

export default async function ScenariosPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [profileResult, countResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_tier, full_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("challenge_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed"),
  ]);

  const profile = profileResult.data;
  const isFirstTime = (countResult.count ?? 0) === 0;

  const practiceContext = searchParams.practicing
    ? {
        title:   searchParams.practicing,
        company: searchParams.company ?? "",
        types:   (searchParams.types ?? "").split(",").filter(Boolean),
      }
    : null;

  return (
    <ScenariosClient
      profile={profile}
      user={{ email: user.email! }}
      practiceContext={practiceContext}
      isFirstTime={isFirstTime}
      confirmed={searchParams.confirmed === "true"}
    />
  );
}
