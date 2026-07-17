import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wraps the config so next-intl can find our per-request setup.
// We pass the path explicitly because the blueprint keeps i18n under `src/`
// (the plugin's default guess is `./i18n/request.ts` at the project root).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
