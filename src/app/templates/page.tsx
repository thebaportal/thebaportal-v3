import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateStudioClient from "./TemplateStudioClient";

export const metadata = { title: "Template Studio — TheBAPortal" };

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_tier")
    .eq("id", user.id)
    .single();

  return <TemplateStudioClient profile={profile} user={{ email: user.email || "" }} />;
}
