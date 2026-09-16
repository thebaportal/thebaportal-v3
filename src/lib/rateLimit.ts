// In-memory sliding-window limiter. Resets on cold start / per server instance —
// deliberately simple, not a distributed quota system. Good enough to stop one
// user hammering an AI route; not a substitute for real usage metering.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

// Best-effort client IP for rate-limiting anonymous requests. Falls back to a
// shared "unknown" bucket when no forwarding header is present (e.g. local dev).
export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
