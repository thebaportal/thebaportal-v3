export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runFantasticRefresh } from "@/lib/fantasticRefresh";

function isAuthorized(req: NextRequest): boolean {
  const CRON_SECRET = process.env.CRON_SECRET;
  const auth        = req.headers.get("authorization");
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) return true;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runFantasticRefresh();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runFantasticRefresh();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
