import { getSecurityHeaders } from "./src/lib/security/headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/:path*",
      headers: getSecurityHeaders(process.env.NODE_ENV === "production")
        .map(({ key, value }) => ({ key, value }))
    }];
  }
};

export default nextConfig;
