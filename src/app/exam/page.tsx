// src/app/exam/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ExamClient from "./ExamClient";

export const metadata = { title: "Exam Prep — TheBAPortal" };

export default async function ExamPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("subscription_tier")
    .eq("id", user.id).single();

  return <ExamClient tier={profile?.subscription_tier ?? "free"} />;
}
