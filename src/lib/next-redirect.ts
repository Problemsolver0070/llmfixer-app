// Validates and resolves a `next=<url>` query param for post-auth
// redirects. The chat worker at chat.thefixer.in 302s unauthenticated
// users to /login?next=<chat-url>; we send them back there after login.
// Also reused for the admin step-up `?return=` param so every redirect
// sink in the app shares one validator.
//
// Allowed shapes:
//   1. A path under /app/ on the same origin (e.g. /app/dashboard).
//   2. An absolute URL whose hostname is thefixer.in or a subdomain
//      (e.g. https://chat.thefixer.in/).
// Anything else falls back to /app/dashboard so a poisoned query param
// cannot redirect users to an attacker-controlled host after login.

const FALLBACK = '/app/dashboard';

// Reject ASCII control chars and backslashes anywhere in the candidate
// before any other parsing. Browsers normalise backslashes to slashes
// when navigating, which can turn `/app/\\evil.com` into a cross-origin
// destination. Control chars (CR/LF/NUL/etc.) are also redirect-smuggle
// vectors when reflected into headers downstream.
function hasUnsafeChars(raw: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x1f\x7f\\]/.test(raw);
}

function isAllowedHost(hostname: string): boolean {
  return hostname === 'thefixer.in' || hostname.endsWith('.thefixer.in');
}

export function resolveNextDestination(raw: string | null | undefined): string {
  if (!raw) return FALLBACK;
  if (hasUnsafeChars(raw)) return FALLBACK;
  // Same-origin app path. Reject `//foo.com/path` (protocol-relative URL),
  // which the browser would treat as cross-origin. Also reject anything
  // that decodes to a path-segment containing `//` after a percent-decode
  // attempt, e.g. `/app/%2F%2Fevil.com`.
  if (raw.startsWith('/app/') && !raw.startsWith('//')) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return FALLBACK;
    }
    if (decoded.includes('//') || hasUnsafeChars(decoded)) return FALLBACK;
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
