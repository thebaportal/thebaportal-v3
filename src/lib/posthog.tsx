"use client";

/**
 * PostHog provider + thin analytics hook.
 *
 * All event names live here so they never drift between call sites.
 * Usage:
 *   const { track } = useAnalytics();
 *   track("resume_section_opened", { job_id: "...", job_title: "..." });
 */

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

// ── Boot ──────────────────────────────────────────────────────────────────────

export default posthog;

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host:          process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults:          "2026-01-30",
    capture_pageview:  false,
    capture_pageleave: true,
    persistence:       "localStorage",
  });
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  );
}

// ── Event catalogue ───────────────────────────────────────────────────────────

export type TrackEvent =
  | { name: "job_clicked";             props: { job_id: string; job_title: string; source: "card" | "list" } }
  | { name: "win_this_role_clicked";   props: { job_id: string; job_title: string } }
  | { name: "apply_clicked";           props: { job_id: string; job_title: string } }
  | { name: "resume_section_opened";   props: { job_id: string; job_title: string } }
  | { name: "resume_submitted";        props: { job_id: string; job_title: string; resume_length: number } }
  | { name: "paywall_shown";           props: { job_id: string; job_title: string; location: "resume_transform" } }
  | { name: "upgrade_clicked";         props: { job_id: string; job_title: string; is_logged_in: boolean } }
  | { name: "page_viewed";             props: { path: string } };

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const ph = usePostHog();

  function track<E extends TrackEvent>(name: E["name"], props: Extract<E, { name: typeof name }>["props"]) {
    ph?.capture(name, props);
  }

  return { track };
}

// ── Page-view tracker (drop into client layout) ───────────────────────────────

export function PageViewTracker() {
  const ph = usePostHog();

  useEffect(() => {
    ph?.capture("page_viewed", { path: window.location.pathname });
  }, [ph]);

  return null;
}
