/**
 * Active adapter registry.
 *
 * To add a new ATS source:
 *   1. Build src/lib/ats/adapters/{name}.ts implementing JobAdapter
 *   2. Import and instantiate it here, filtered to its platform companies
 *   3. Add it to the ADAPTERS array
 *
 * The refresh pipeline calls every adapter in this list automatically.
 */

import type { JobAdapter } from "../types";
import { COMPANIES } from "../companies";
import { GreenhouseAdapter } from "./greenhouse";
import { LeverAdapter } from "./lever";

const greenhouse = COMPANIES.filter(c => c.platform === "greenhouse");
const lever      = COMPANIES.filter(c => c.platform === "lever");

export const ADAPTERS: JobAdapter[] = [
  new GreenhouseAdapter(greenhouse),
  new LeverAdapter(lever),

  // Future adapters — uncomment when ready:
  // new WorkdayAdapter(COMPANIES.filter(c => c.platform === "workday")),
  // new AshbyAdapter(COMPANIES.filter(c => c.platform === "ashby")),
  // new SmartRecruitersAdapter(COMPANIES.filter(c => c.platform === "smartrecruiters")),
  // new IcimsAdapter(COMPANIES.filter(c => c.platform === "icims")),
  // new CustomAdapter(COMPANIES.filter(c => c.platform === "custom")),
];
