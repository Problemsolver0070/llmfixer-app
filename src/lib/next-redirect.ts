// Validates and resolves a `next=<url>` query param for post-auth
// redirects. The chat worker at chat.thefixer.in 302s unauthenticated
// users to /login?next=<chat-url>; we send them back there after login.
//
// Allowed shapes:
//   1. A path under /app/ on the same origin (e.g. /app/dashboard).
//   2. An absolute URL whose hostname is thefixer.in or a subdomain
//      (e.g. https://chat.thefixer.in/).
// Anything else falls back to /app/dashboard so a poisoned query param
// cannot redirect users to an attacker-controlled host after login.

const FALLBACK = '/app/dashboard';

function isAllowedHost(hostname: string): boolean {
  return hostname === 'thefixer.in' || hostname.endsWith('.thefixer.in');
}

export function resolveNextDestination(raw: string | null | undefined): string {
  if (!raw) return FALLBACK;
  // Same-origin app path. Reject `//foo.com/path` (protocol-relative URL),
  // which the browser would treat as cross-origin.
  if (raw.startsWith('/app/') && !raw.startsWith('//')) {
    return raw;
  }
  try {
    const url = new URL(raw);
    if ((url.protocol === 'https:' || url.protocol === 'http:') && isAllowedHost(url.hostname)) {
      return url.toString();
    }
  } catch {
    // not a parseable URL, fall through
  }
  return FALLBACK;
}
