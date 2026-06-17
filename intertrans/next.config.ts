import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker production build için minimal output
  // (Next.js 16 — output: 'standalone' modu hâlâ destekleniyor)
  output: "standalone",
};

export default nextConfig;
