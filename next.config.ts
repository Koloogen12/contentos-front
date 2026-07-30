import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin file tracing to this app's folder; an unrelated lockfile higher up
  // confuses Next's auto-detected workspace root.
  outputFileTracingRoot: path.join(__dirname),
  // Required for the production Docker build (compose.prod.yml). The
  // standalone server bundles only the deps we actually use into
  // .next/standalone, which is what the runner stage of Dockerfile copies.
  output: "standalone",
  // Банк тезисов жил на /knowledge, пока разбор мысли занимал /ideas. По
  // прототипу это один экран — «Идеи», — поэтому банк переехал туда, а
  // разбор стал панелью внутри него. Редирект держит старые закладки и
  // ссылки из глобального поиска живыми.
  async redirects() {
    return [{ source: "/knowledge", destination: "/ideas", permanent: false }];
  },
};

export default nextConfig;
