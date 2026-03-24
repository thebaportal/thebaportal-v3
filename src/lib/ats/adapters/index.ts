/**
 * Adapter factory — routes employer sources to the correct ATS adapter
 * based on the `platform` field from the employer_sources registry.
 *
 * To add a new ATS platform:
 *   1. Create src/lib/ats/adapters/{platform}.ts implementing JobAdapter
 *   2. Import it here and add a case to buildAdapters()
 *   3. Insert employer records into employer_sources with the new platform value
 *   No other changes needed.
 */

import type { JobAdapter } from "../types";
import type { EmployerSource } from "../registry";
import { GreenhouseAdapter }     from "./greenhouse";
import { LeverAdapter }          from "./lever";
import { WorkdayAdapter }        from "./workday";
import { SmartRecruitersAdapter } from "./smartrecruiters";

/**
 * Build the active adapter set from a list of employer sources.
 * Sources are grouped by platform — one adapter instance per platform,
 * each receiving only the sources that belong to it.
 */
export function buildAdapters(sources: EmployerSource[]): JobAdapter[] {
  // Group sources by platform
  const byPlatform = new Map<string, EmployerSource[]>();
  for (const source of sources) {
    const group = byPlatform.get(source.platform) ?? [];
    group.push(source);
    byPlatform.set(source.platform, group);
  }

  const adapters: JobAdapter[] = [];

  const greenhouse = byPlatform.get("greenhouse");
  if (greenhouse?.length) {
    adapters.push(new GreenhouseAdapter(greenhouse));
    console.log(`[adapters] Greenhouse: ${greenhouse.length} sources`);
  }

  const lever = byPlatform.get("lever");
  if (lever?.length) {
    adapters.push(new LeverAdapter(lever));
    console.log(`[adapters] Lever: ${lever.length} sources`);
  }

  const workday = byPlatform.get("workday");
  if (workday?.length) {
    adapters.push(new WorkdayAdapter(workday));
    console.log(`[adapters] Workday: ${workday.length} sources`);
  }

  const smartrecruiters = byPlatform.get("smartrecruiters");
  if (smartrecruiters?.length) {
    adapters.push(new SmartRecruitersAdapter(smartrecruiters));
    console.log(`[adapters] SmartRecruiters: ${smartrecruiters.length} sources`);
  }

  // Future platforms — add cases here as adapters are built:
  // const icims = byPlatform.get("icims");
  // const bamboohr = byPlatform.get("bamboohr");
  // const jobvite  = byPlatform.get("jobvite");

  const unhandled = [...byPlatform.keys()].filter(
    p => !["greenhouse", "lever", "workday", "smartrecruiters"].includes(p)
  );
  if (unhandled.length > 0) {
    console.warn(`[adapters] No adapter for platforms: ${unhandled.join(", ")} — skipped`);
  }

  console.log(`[adapters] ${adapters.length} adapter(s) initialized`);
  return adapters;
}
