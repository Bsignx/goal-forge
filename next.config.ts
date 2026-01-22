import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import path from "path";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {},
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default withPWA(nextConfig);
