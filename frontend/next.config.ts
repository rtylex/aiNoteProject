import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Enable standalone output for better deployment compatibility
  output: 'standalone',
};

export default nextConfig;
