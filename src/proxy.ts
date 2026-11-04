import { NextRequest, NextResponse } from "next/server";

function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    difference |=
      (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("Admin access is not configured.", { status: 503 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const encodedCredentials = authorization.match(/^Basic\s+(.+)$/i)?.[1];
  if (!encodedCredentials) {
    return unauthorized();
  }

  let credentials: string;
  try {
    const binary = atob(encodedCredentials);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    credentials = new TextDecoder().decode(bytes);
  } catch {
    return unauthorized();
  }

  const separator = credentials.indexOf(":");
  const username = credentials.slice(0, separator);
  const submittedPassword = credentials.slice(separator + 1);
  if (
    separator < 0 ||
    !constantTimeEqual(username, "admin") ||
    !constantTimeEqual(submittedPassword, password)
  ) {
    return unauthorized();
  }

  return NextResponse.next();
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ROYAL FLOWERS admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
