import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
const onAuthStateChange = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        onAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

describe('useSession', () => {
  beforeEach(() => {
    getSession.mockReset();
    onAuthStateChange.mockReset();
  });

  it('starts in loading and resolves to a session', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 't',
          user: { id: 'u1', email: 'a@b.c', email_confirmed_at: '2026-01-01' },
        },
      },
    });
    const { useSession } = await import('./useSession');
    const { result } = renderHook(() => useSession());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session?.user.id).toBe('u1');
    expect(result.current.user?.email).toBe('a@b.c');
    expect(result.current.emailVerified).toBe(true);
  });

  it('reflects subsequent auth state changes', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { useSession } = await import('./useSession');
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();

    act(() => {
      const cb = onAuthStateChange.mock.calls[0][0];
      cb('SIGNED_IN', {
        access_token: 't2',
        user: { id: 'u2', email: 'c@d.e', email_confirmed_at: null },
      });
    });
    expect(result.current.session?.user.id).toBe('u2');
    expect(result.current.emailVerified).toBe(false);
  });
});
