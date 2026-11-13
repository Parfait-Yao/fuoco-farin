/** Cloudflare R2 public host (r2.dev or custom domain), read from .env.local. */
const r2Host = (() => {
  try {
    return process.env.NEXT_PUBLIC_R2_PUBLIC_URL ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a verification build run beside `next dev` without sharing `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      ...(r2Host ? [{ protocol: 'https', hostname: r2Host }] : []),
    ],
  },
  modularizeImports: {
    '@mui/icons-material': { transform: '@mui/icons-material/{{member}}' },
  },
  experimental: {
    // Runs src/instrumentation.ts at server start (node-cron jobs when ENABLE_CRON=true).
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@prisma/client', 'node-cron', 'nodemailer'],
    // Compile only the components actually imported from these barrel packages
    // (large speed-up for `next dev`, smaller bundles in production).
    optimizePackageImports: ['@mui/material', '@mui/x-data-grid', 'framer-motion', 'recharts', 'react-hook-form', 'zod'],
  },
};

export default nextConfig;
