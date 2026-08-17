import type { NextConfig } from "next";

// Deployed backend origin, e.g. "https://provaluer-api.onrender.com".
// Falls back to the local Go server for development.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
