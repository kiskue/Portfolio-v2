import type { NextConfig } from 'next';

/**
 * Kept deliberately small (PLAN.md, Architecture → Config).
 * Not enabled on purpose: cacheComponents, partialPrefetching, ensureStatic (it requires
 * cacheComponents in 16.4) and the React Compiler. Every route's static output is asserted
 * by `npm run check:static` instead.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Framing protection only. A script CSP would block the inline display pre-paint script.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90],
  },
  // `next dev` writes AGENTS.md when it detects an AI coding agent; keep the repo free of it.
  agentRules: false,
  // The dev route indicator sits on the rail's accessibility button (bottom-left) and intercepts
  // its clicks; errors still surface in the dev overlay without it.
  devIndicators: false,
  experimental: {
    // Off explicitly (create-next-app 16.4 turns it on). Telemetry itself has no config key:
    // it is controlled by NEXT_TELEMETRY_DISABLED=1 or `next telemetry disable`.
    agentFeedback: false,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
