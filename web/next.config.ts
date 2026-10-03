import type { NextConfig } from "next";

// Static export: all data fetching happens client-side against the Worker API,
// so the build output (./out) can be served directly by Cloudflare Pages.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: false,
};

export default nextConfig;
