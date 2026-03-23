import { NextRequest, NextResponse } from "next/server";
import { runRefresh } from "@/lib/refreshJobs";

export async function POST(req: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const auth        = req.headers.get("authorization");

  console.log("[/api/jobs/refresh] POST received");
  console.log("[/api/jobs/refresh] CRON_SECRET:", CRON_SECRET ? "SET" : "MISSING");
  console.log("[/api/jobs/refresh] Auth header:", auth ? "present" : "missing");

  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    console.error("[/api/jobs/refresh] Unauthorized — check CRON_SECRET env var");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRefresh();
  const status = result.ok ? 200 : 500;
  console.log("[/api/jobs/refresh] Result:", JSON.stringify(result));
  return NextResponse.json(result, { status });
}
