import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => fromMock(t),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  },
}));
const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { useKeys } from './useKeys';

function chain(rows: unknown[]) {
  return {
    select: () => ({
      order: () => Promise.resolve({ data: rows, error: null }),
    }),
  };
}

describe('useKeys', () => {
  beforeEach(() => {
    fromMock.mockReset();
    apiCall.mockReset();
  });

  it('lists keys via supabase select', async () => {
    fromMock.mockReturnValue(chain([{ id: 'k1', label: 'prod', key_prefix: 'opto_aaa', status: 'active', created_at: '2026-01-01', last_used_at: null, revoked_at: null }]));
    const { result } = renderHook(() => useKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.keys[0].label).toBe('prod');
  });

  it('create posts to /v1/keys and returns the cleartext key', async () => {
    fromMock.mockReturnValue(chain([]));
    apiCall.mockResolvedValue({ id: 'k2', key_prefix: 'opto_bbb', key: 'opto_bbb_full_secret' });
    const { result } = renderHook(() => useKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let returned: unknown;
    await act(async () => { returned = await result.current.create('staging'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/keys', { method: 'POST', body: { label: 'staging' } });
    expect((returned as { key: string }).key).toBe('opto_bbb_full_secret');
  });

  it('revoke posts to /v1/keys/:id with DELETE', async () => {
    fromMock.mockReturnValue(chain([]));
    apiCall.mockResolvedValue({ id: 'k1', status: 'revoked' });
    const { result } = renderHook(() => useKeys());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.revoke('k1'); });
    expect(apiCall).toHaveBeenCalledWith('/v1/keys/k1', { method: 'DELETE' });
  });
});
