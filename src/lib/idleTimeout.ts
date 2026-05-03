import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_PATH_PREFIX = '/app/admin';
const TICK_MS = 30 * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;

interface IdleSignals {
  lastActivity: number;
  expired: boolean;
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`);
}

/**
 * Tracks user activity and signs the admin out after `timeoutMs` of idleness
 * while they're on /app/admin/*. Activity is reset by mouse/keyboard/touch
 * events and by manual `markActivity()` calls (e.g. from `api.ts` after a
 * successful API request, if the host wires it up).
 *
 * The hook is safe to mount unconditionally; it no-ops while the user is not
 * on an admin path. It uses a single requestAnimationFrame-free interval,
 * not per-event timers, so it's cheap.
 */
export function useAdminIdleTimeout(timeoutMs: number = ADMIN_IDLE_TIMEOUT_MS): void {
  const signalsRef = useRef<IdleSignals | null>(null);

  useEffect(() => {
    if (!signalsRef.current) {
      signalsRef.current = { lastActivity: Date.now(), expired: false };
    }
    const signals = signalsRef.current;
    signals.lastActivity = Date.now();
    signals.expired = false;

    function bump() {
      signals.lastActivity = Date.now();
    }

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, bump, { passive: true });
    }

    const interval = window.setInterval(() => {
      if (signals.expired) return;
      if (typeof window === 'undefined') return;
      if (!isAdminPath(window.location.pathname)) {
        // Reset the clock so leaving and returning to /app/admin doesn't
        // immediately expire.
        signals.lastActivity = Date.now();
        return;
      }
      const idle = Date.now() - signals.lastActivity;
      if (idle >= timeoutMs) {
        signals.expired = true;
        void (async () => {
          try {
            await supabase.auth.signOut();
          } finally {
            const here = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.assign(`/login?expired=1&return=${here}`);
          }
        })();
      }
    }, TICK_MS);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, bump);
      }
      window.clearInterval(interval);
    };
  }, [timeoutMs]);
}
