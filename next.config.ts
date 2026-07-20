import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

/*
  next/image refuses to optimise a remote host that isn't allowlisted, and all
  our photos live in Supabase Storage. Derived from the env var rather than
  hardcoded so it follows the project across environments; the guard keeps a
  build from crashing on `new URL(undefined)` when the var is missing.

  The pathname is scoped to the public bucket prefix — an open `/**` would let
  anyone use our optimiser as a proxy for arbitrary paths on that host.
*/
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },

  // Server Actions default to a 1 MB request body, which rejects real photos
  // (2–8 MB) before our upload code runs — the "server error" on upload. Raise
  // it to cover MAX_BYTES (15 MB) in src/services/photos.ts, with headroom.
  experimental: {serverActions: {bodySizeLimit: '20mb'}},

  // Baseline security response headers (defense-in-depth). No CSP yet: the admin
  // map-picker loads MapTiler tiles/styles cross-origin, so a strict policy needs
  // its own allowlist — deferred until that's worked out.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {key: 'X-Frame-Options', value: 'DENY'},
          {key: 'X-Content-Type-Options', value: 'nosniff'},
          {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
        ],
      },
    ];
  },
};

// Wraps the config so next-intl can find our per-request setup.
// We pass the path explicitly because the blueprint keeps i18n under `src/`
// (the plugin's default guess is `./i18n/request.ts` at the project root).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
