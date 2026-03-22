import { getCareerUser } from "@/lib/career-auth";

export async function GET() {
  const user = await getCareerUser();

  if (!user) {
    return Response.json(
      { ok: false, status: "UNAUTHENTICATED", message: "getUser() returned null — session cookie not read" },
      { status: 401 }
    );
  }

  return Response.json(
    { ok: true, status: "AUTHENTICATED", userId: user.id, email: user.email },
    { status: 200 }
  );
}
