import { redirect } from "next/navigation";

import { BRAND } from "@/config/brand";
import { Landing } from "@/components/sections/landing";

/**
 * Root route. The base ships portal-only (`BRAND.showLanding: false`), so
 * visitors are redirected to the login before any landing markup is sent.
 * Flip the flag in `src/config/brand.ts` to serve the marketing landing
 * here instead — no code change needed.
 *
 * The landing still shows up under `/` in the build's route table, but a
 * server-side redirect answers with a 307 and no page payload, so nothing
 * of it reaches the browser while the flag is off.
 */
export default function Home() {
  if (!BRAND.showLanding) redirect("/login");

  return <Landing />;
}
