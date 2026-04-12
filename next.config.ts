import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // essentia-wasm.umd.js has a Node.js `require('fs')` branch that the browser
  // never executes. Stub it out so the build succeeds; the UMD browser path
  // takes over at runtime inside the Web Worker.
  turbopack: {
    resolveAlias: {
      fs:     { browser: './app/lib/empty.ts' },
      path:   { browser: './app/lib/empty.ts' },
      crypto: { browser: './app/lib/empty.ts' },
    },
  },
  // Fallback for builds run with --webpack flag
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
