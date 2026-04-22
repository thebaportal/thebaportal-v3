import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPracticeQuestions, getMockQuestions } from "@/lib/examService";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { mode, area = "all", count = 10, difficulty = "mixed" } = body;

  try {
    const questions = mode === "mock"
      ? await getMockQuestions()
      : await getPracticeQuestions(area, Number(count), difficulty);

    return NextResponse.json(questions);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
