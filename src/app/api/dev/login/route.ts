import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }

  const email = process.env.DEV_USER_EMAIL;
  const password = process.env.DEV_USER_PASSWORD;

  if (!email || !password || password === "your_password_here") {
    return new NextResponse(
      "Set DEV_USER_EMAIL and DEV_USER_PASSWORD in .env.local first.",
      { status: 500 }
    );
  }

  const redirectTo = request.nextUrl.searchParams.get("to") ?? "/dashboard";
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return new NextResponse(`Dev login failed: ${error.message}`, { status: 401 });
  }

  return response;
}
