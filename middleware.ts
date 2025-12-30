import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for API, auth callback, static files, etc.
  matcher: [
    '/',
    '/(ko|en)/:path*',
    '/((?!api|auth|_next|_vercel|.*\\..*).*)'
  ]
};
