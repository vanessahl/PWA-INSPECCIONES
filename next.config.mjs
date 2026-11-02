import { getSecurityHeaders } from "./src/lib/security/headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/:path*",
      headers: getSecurityHeaders(true).map(({ key, value }) => ({ key, value }))
    }];
  }
};

export default nextConfig;

