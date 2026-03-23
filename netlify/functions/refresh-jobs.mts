import type { Config } from "@netlify/functions";

export default async function handler() {
  console.log("[refresh-jobs scheduled] firing at", new Date().toISOString());

  const siteUrl    = process.env.URL ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";

  if (!siteUrl) {
    console.error("[refresh-jobs scheduled] process.env.URL is not set — cannot call refresh endpoint");
    return;
  }
  if (!cronSecret) {
    console.error("[refresh-jobs scheduled] process.env.CRON_SECRET is not set");
    return;
  }

  const target = `${siteUrl}/api/jobs/refresh`;
  console.log("[refresh-jobs scheduled] calling", target);

  try {
    const res  = await fetch(target, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });
    const body = await res.json().catch(() => ({}));
    console.log("[refresh-jobs scheduled] response status:", res.status);
    console.log("[refresh-jobs scheduled] response body:", JSON.stringify(body));
  } catch (err) {
    console.error("[refresh-jobs scheduled] fetch threw:", err);
  }
}

export const config: Config = {
  schedule: "0 */2 * * *",
};
