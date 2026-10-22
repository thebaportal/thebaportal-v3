import { NextResponse } from "next/server";

/** 403 for a Pro-only capability (see src/lib/entitlements.ts for who is Pro). */
export function upgradeRequired(feature: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: "upgrade_required", feature, message, ...extra }, { status: 403 });
}
