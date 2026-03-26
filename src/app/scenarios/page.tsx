import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScenariosClient from "./ScenariosClient";

interface PageProps {
  searchParams: { practicing?: string; company?: string; types?: string };
}

export default async function ScenariosPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name")
    .eq("id", user.id)
    .single();

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
    />
  );
}
