/**
 * Canonical base URL for the app.
 *
 * Production → https://thebaportal.com  (set NEXT_PUBLIC_APP_URL in Vercel)
 * Development → http://localhost:3000   (set NEXT_PUBLIC_APP_URL in .env.local)
 *
 * Use this everywhere a full URL is needed:
 *   auth redirects, magic links, password resets, Stripe callbacks, share links.
 *
 * Works on both server and client (NEXT_PUBLIC_ prefix makes it available to both).
 */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://thebaportal.com";
}
