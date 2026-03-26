export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyWorkdayUrls } from "@/lib/verifyWorkdayUrls";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

// GET — called by Vercel Cron at 7am (one hour after the 6am refresh)
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await verifyWorkdayUrls();
  return NextResponse.json(result);
}

// POST — manual trigger
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await verifyWorkdayUrls();
  return NextResponse.json(result);
}
