import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AWS Amplify's Next.js SSR runtime does not forward console-defined
  // environment variables to the server compute — only NEXT_PUBLIC_* vars,
  // which Next.js inlines at build time, survive. SUPABASE_SERVICE_ROLE_KEY is
  // a server-only secret read at runtime inside server actions (see
  // src/lib/supabase/admin.ts), so without this mapping it is undefined on
  // Amplify and "Crear cliente" fails. Mapping it here inlines the build-time
  // value into the server bundle. It stays server-side: admin.ts is never
  // imported by a Client Component, so the secret never reaches the browser.
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

export default nextConfig;
