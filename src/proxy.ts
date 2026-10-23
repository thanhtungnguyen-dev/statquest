import { NextResponse, type NextRequest } from "next/server";

// Show the approved landing at /, without changing src/app/page.tsx.
// The real study app is available at /app.
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/welcome";
  return NextResponse.rewrite(url);
}

// Only rewrite the homepage, never assets, /app, or other routes.
export const config = { matcher: ["/"] };
