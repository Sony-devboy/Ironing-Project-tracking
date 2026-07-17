import type { NextConfig } from "next";

// When GITHUB_PAGES=true the app is built as a fully static site for GitHub
// Pages (no API routes, no middleware, no image optimization server).
// NEXT_PUBLIC_BASE_PATH is the repo name path, e.g. "/iron-project-tracking",
// because GitHub Pages serves project sites from a subdirectory.
const isPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isPagesBuild
    ? {
        output: "export" as const,
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
