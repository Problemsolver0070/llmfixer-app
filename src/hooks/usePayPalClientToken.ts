import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface UsePayPalClientTokenResult {
  clientToken: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Fetches a PayPal `client_token` from the backend so the JS SDK can
 * initialize Card Fields. Critical: only fires when a Supabase session
 * exists. Without this guard the hook would 401 on every public page
 * load (landing, login, signup, pricing) because `AppPayPalProvider`
 * wraps the whole app, and `api()`'s 401 handler signs the visitor
 * out and redirects them to `/login?reason=expired`. Result: the
 * public site is unreachable.
 *
 * `loading` starts false: callers should treat "no token, not loading,
 * no error" as "user is signed out, no fetch needed". Auth-state
 * changes (sign-in / sign-out) refresh the token if still mounted.
 */
export function usePayPalClientToken(): UsePayPalClientTokenResult {
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchToken(): Promise<void> {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) {
          setClientToken(null);
          setError(null);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      try {
        const r = await api<{ client_token: string }>('/v1/billing/paypal/client-token');
        if (!cancelled) {
          setClientToken(r.client_token);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchToken();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (!cancelled) {
          setClientToken(null);
          setError(null);
          setLoading(false);
        }
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        void fetchToken();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { clientToken, loading, error };
}
