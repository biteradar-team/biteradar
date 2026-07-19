import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
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
