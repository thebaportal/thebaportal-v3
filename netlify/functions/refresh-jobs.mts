import type { Config } from "@netlify/functions";

export default async function handler() {
  const siteUrl    = process.env.URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET ?? "";

  const res = await fetch(`${siteUrl}/api/jobs/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.json().catch(() => ({}));
  console.log("[refresh-jobs] status:", res.status, "body:", JSON.stringify(body));
}

export const config: Config = {
  schedule: "0 */2 * * *",
};
