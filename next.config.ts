import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Keep the dev badge clear of the mobile bottom nav.
  devIndicators: { position: "top-right" },
  partialPrefetching: true,
  // OCR and PDF parsing load workers and data files from disk; run them with plain Node require.
  serverExternalPackages: ["tesseract.js", "pdfjs-dist", "@tesseract.js-data/eng", "@tesseract.js-data/tur"],
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
