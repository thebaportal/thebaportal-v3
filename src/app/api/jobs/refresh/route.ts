export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runRefresh } from "@/lib/refreshJobs";

function isAuthorized(req: NextRequest): boolean {
  const CRON_SECRET = process.env.CRON_SECRET;
  const auth        = req.headers.get("authorization");

  // Vercel Cron Jobs send Authorization: Bearer {CRON_SECRET} automatically
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) return true;

  // Vercel also sends x-vercel-cron: 1 — accept as secondary signal
  if (req.headers.get("x-vercel-cron") === "1") return true;

  return false;
}

// POST — manual trigger (existing behavior, kept for backward compat)
export async function POST(req: NextRequest) {
  console.log("[/api/jobs/refresh] POST received");
  if (!isAuthorized(req)) {
    console.error("[/api/jobs/refresh] Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runRefresh();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// GET — Vercel Cron Jobs use GET by default
export async function GET(req: NextRequest) {
  console.log("[/api/jobs/refresh] GET (cron) received");
  if (!isAuthorized(req)) {
    console.error("[/api/jobs/refresh] Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runRefresh();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
