import { NextResponse, type NextRequest } from "next/server";

// TEMPORARY debug endpoint — reveals what host info the SSR runtime receives,
// so we can build OAuth redirects from the correct public host. Remove after.
export async function GET(request: NextRequest) {
  return NextResponse.json({
    "request.url": request.url,
    "request.nextUrl.href": request.nextUrl.href,
    "request.nextUrl.origin": request.nextUrl.origin,
    "request.nextUrl.host": request.nextUrl.host,
    "header.host": request.headers.get("host"),
    "header.x-forwarded-host": request.headers.get("x-forwarded-host"),
    "header.x-forwarded-proto": request.headers.get("x-forwarded-proto"),
  });
}
