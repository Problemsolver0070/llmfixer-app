function required(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * F43: resolve a VITE_* var that has a production fallback.
 * In dev (`import.meta.env.DEV`) we throw if the var is unset so a
 * misconfigured local environment fails fast instead of silently
 * pointing at production. In production the fallback is fine because
 * the build pipeline always injects the var from GitHub Actions; if it
 * doesn't, that's a deploy bug and the fallback is the safest landing
 * spot. We log a warning so it's visible in the browser console.
 */
function withFallback(name: string, fallback: string): string {
  const value = import.meta.env[name];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (import.meta.env.DEV) {
    throw new Error(
      `${name} must be set in .env.local (see .env.example). Refusing to fall back to "${fallback}" in dev.`,
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    `[env] ${name} unset, falling back to ${fallback}. CI is expected to inject this; check the deploy.`,
  );
  return fallback;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  apiBase: withFallback('VITE_API_BASE', 'https://api.thefixer.in'),
  paypalClientId: required('VITE_PAYPAL_CLIENT_ID'),
};
