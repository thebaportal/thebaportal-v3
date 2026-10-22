// Pro entitlements — the ONLY place the server decides what a user's plan allows.
// Source of truth: profiles.subscription_tier, kept in sync by the Stripe webhook.
// Never read a tier, plan or "pro" flag from a request; every Pro-gated route
// calls getEntitlements() with the authenticated user's id.

import type { SupabaseClient } from "@supabase/supabase-js";

export const FREE_DECISION_LAB_ANALYSES = 5;   // successful full analyses per UTC calendar month
const PRO_TIERS = ["pro", "enterprise"];

/** Pure: does this stored tier carry Pro capabilities? */
export function isProTier(tier: unknown): boolean {
  return typeof tier === "string" && PRO_TIERS.includes(tier);
}

export interface Entitlements { pro: boolean; tier: string }

/** The signed-in user's entitlements, read with the service-role client. Throws if the profile can't be read. */
export async function getEntitlements(db: SupabaseClient, userId: string): Promise<Entitlements> {
  const { data, error } = await db.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle();
  if (error) throw new Error(`entitlements: profile read failed: ${error.message}`);
  const tier = typeof data?.subscription_tier === "string" ? data.subscription_tier : "free";
  return { pro: isProTier(tier), tier };
}

/**
 * Testing grandfathering: may a Free user create a new Testing version in THIS project?
 * Only inside an eligible lineage — one that currently has an Approved version or a
 * working Draft. Archived-only history does not count, and another project's Testing
 * never does. Determined from the database, never from the request.
 */
export async function hasEligibleTestingLineage(db: SupabaseClient, userId: string, projectId: string): Promise<boolean> {
  const { data, error } = await db.from("artifacts").select("id").eq("project_id", projectId).eq("user_id", userId)
    .eq("type", "test_case").in("status", ["approved", "draft", "in_review"]).limit(1);
  if (error) throw new Error(`entitlements: testing lineage read failed: ${error.message}`);
  return (data ?? []).length > 0;
}
