// src/app/learning/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LearningClient from "./LearningClient";

export const metadata = { title: "Learning Academy — TheBAPortal" };

export default async function LearningPage() {
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

  const { data: completions } = await supabase
    .from("lesson_completions").select("lesson_id").eq("user_id", user.id);

  const completedLessons = (completions || []).map((r: { lesson_id: string }) => r.lesson_id);

  return <LearningClient profile={profile} completedLessons={completedLessons} />;
}