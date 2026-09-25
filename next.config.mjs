// Dev-only workaround: some local machines can't verify Supabase's SSL cert chain
// (corporate proxy / antivirus root CA interception). Never disable this in production.
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
    // This machine runs critically low on free RAM (observed as low as
    // 0.6GB free of 8.5GB total) — Next's page-generation jest-worker child
    // processes then get OOM-killed mid-compile, surfacing as "Jest worker
    // encountered N child process exceptions, exceeding retry limit".
    // Forcing a single worker (no thread pool) trades some compile speed
    // for not spawning parallel processes that compete for the little RAM
    // that's free. Does not affect production build output or runtime.
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;