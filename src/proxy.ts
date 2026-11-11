import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'files_session';

/**
 * Visitors without a session go to sign in. Only a first gate: every page checks the session
 * (src/lib/auth.ts). The /api routes authenticate themselves (app tokens, upload permits).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/') || pathname === '/login') return NextResponse.next();
  if (!request.cookies.get(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
