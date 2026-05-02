import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { setUnauthorizedHandler } from '@/lib/api';
import { AppPayPalProvider } from '@/lib/paypal';
import { setAuthCookie, clearAuthCookie } from '@/lib/auth-cookie';
import { supabase } from '@/lib/supabase';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export default function App() {
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Clear the cross-subdomain cookie on session expiry so the chat
      // worker stops accepting the stale token before the user re-auths.
      clearAuthCookie();
      window.location.assign('/login?reason=expired');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    // Mirror the Supabase access token to a cookie scoped to .thefixer.in
    // on app mount and on every subsequent session change. The chat worker
    // at chat.thefixer.in reads this cookie to validate the JWT.
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) {
        setAuthCookie(session.access_token);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearAuthCookie();
        return;
      }
      if (session?.access_token) {
        // SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED.
        setAuthCookie(session.access_token);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AppPayPalProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{ style: { background: 'var(--color-bg-elev)', color: 'var(--color-text)' } }}
      />
    </AppPayPalProvider>
  );
}
