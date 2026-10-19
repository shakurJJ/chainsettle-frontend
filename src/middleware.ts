import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LEGACY_TOKEN_COOKIE, TOKEN_KEY } from '@/lib/auth/storage-keys';

const PUBLIC_PATHS = ['/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for JWT token in cookie or Authorization header
  // The legacy cookie is still accepted until the client-side migration
  // (migrateLegacyStorageKeys) has renamed it on the user's first visit.
  const token =
    request.cookies.get(TOKEN_KEY)?.value ?? request.cookies.get(LEGACY_TOKEN_COOKIE)?.value;

  if (!token && !pathname.startsWith('/auth')) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|public).*)'],
};
