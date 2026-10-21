import type { NextRequest } from "next/server";

/**
 * Resolves the origin the BROWSER used for this request. On AWS Amplify's SSR
 * compute the Next server sits behind a reverse proxy and sees
 * `Host: localhost:3000`, so both `request.url` and `request.nextUrl` carry
 * the internal host — any absolute redirect built from them sends the browser
 * to https://localhost:3000 in production while working fine in local dev.
 *
 * Resolution order:
 *   1. `x-forwarded-host` + `x-forwarded-proto` (what the proxy saw), unless
 *      the forwarded host is itself localhost (some proxies echo the internal
 *      host there too);
 *   2. `NEXT_PUBLIC_SITE_URL` (baked at build time via amplify.yml);
 *   3. `request.nextUrl.origin` — correct in local dev, where there is no
 *      proxy and neither of the above is set.
 */
export function resolvePublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  if (forwardedHost && !isLocalhost(forwardedHost)) {
    const forwardedProto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) return siteUrl.replace(/\/+$/, "");

  return request.nextUrl.origin;
}

/** Absolute URL on the public origin — use for every redirect response. */
export function publicUrl(request: NextRequest, pathname: string): URL {
  return new URL(pathname, resolvePublicOrigin(request));
}

function isLocalhost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}
