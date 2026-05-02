// Mirrors the Supabase access token to a cookie scoped to .thefixer.in so
// subdomain workers (chat.thefixer.in) can read it via the standard cookie
// header. The Supabase JS client otherwise persists sessions in
// localStorage, which is origin-scoped and unreachable from subdomains.
//
// Trade-offs: the cookie cannot be HttpOnly (the SDK manages it from JS),
// so XSS would expose it; we mitigate with Secure, SameSite=Lax, and a
// short Max-Age (matches the default Supabase access-token TTL of ~1h).
// SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED all re-set the
// cookie via the auth state callback in App.tsx; SIGNED_OUT clears it.

const COOKIE_NAME = 'sb-access-token';
const COOKIE_DOMAIN = '.thefixer.in';

export function setAuthCookie(accessToken: string): void {
  if (typeof document === 'undefined') return;
  // 1 hour, matches default Supabase access-token TTL. The SDK refreshes
  // before expiry and re-fires TOKEN_REFRESHED, which re-sets the cookie.
  const maxAge = 60 * 60;
  document.cookie = [
    `${COOKIE_NAME}=${accessToken}`,
    `Domain=${COOKIE_DOMAIN}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = [
    `${COOKIE_NAME}=`,
    `Domain=${COOKIE_DOMAIN}`,
    'Path=/',
    'Max-Age=0',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}
