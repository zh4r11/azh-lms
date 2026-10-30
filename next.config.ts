import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page sits behind a login and shows live school data, so there is no static shell
  // worth prerendering. Plain dynamic rendering keeps the auth checks simple.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
