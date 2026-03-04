export type SubscriptionTier = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "inactive";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  industry: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tier_required: SubscriptionTier;
  category: string;
  estimated_minutes: number;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  scenario_id: string;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}