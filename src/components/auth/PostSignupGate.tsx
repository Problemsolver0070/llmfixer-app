import { useEffect, useState } from 'react';

const CHAT_URL = 'https://chat.thefixer.in';

// Small delay before the cross-origin nav so the cross-subdomain JWT cookie
// (set by the auth state listener in App.tsx) has time to land before the
// chat worker starts validating it.
const REDIRECT_DELAY_MS = 200;

/**
 * Post-signup landing gate.
 *
 * Mounted at `/app/post-signup`, this is the destination that the email
 * confirmation link routes to. After the Supabase session has been set
 * (handled automatically by the SDK because `detectSessionInUrl` is true),
 * we redirect the caller into the chat product at `chat.thefixer.in`.
 *
 * The chat worker authenticates against the cross-subdomain `sb-access-token`
 * cookie set by the listener in `App.tsx`. We delay the redirect by 200ms
 * to give that cookie time to be written before the cross-origin navigation.
 *
 * Edge case: if the user is already authenticated when they hit this route
 * (e.g. by clicking the confirmation link a second time, or navigating here
 * by hand), we still redirect to the chat. We never bounce back to the
 * dashboard from here; manual navigation to `/app/dashboard` still works
 * for users who want it.
 */
export function PostSignupGate() {
  const [redirectTarget] = useState<string>(CHAT_URL);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.location.href = redirectTarget;
    }, REDIRECT_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [redirectTarget]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="post-signup-redirect"
      data-redirect-target={redirectTarget}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        letterSpacing: '0.08em',
        color: 'var(--color-text-dim)',
      }}
    >
      Taking you to The Fixer...
    </div>
  );
}

export default PostSignupGate;
