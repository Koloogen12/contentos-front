import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin file tracing to this app's folder; an unrelated lockfile higher up
  // confuses Next's auto-detected workspace root.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
