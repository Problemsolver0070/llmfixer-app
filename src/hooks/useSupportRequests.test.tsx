import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.body = body;
    }
  }
  return { api: (...a: unknown[]) => apiCall(...a), ApiError };
});

import {
  useSupportRequests,
  useSupportRequestActions,
  parseSupportRequestError,
} from './useSupportRequests';
import { ApiError } from '@/lib/api';

import type { SupportRequest } from './useSupportRequests';

function row(overrides: Partial<SupportRequest> = {}): SupportRequest {
  return {
    id: 'r1',
    user_id: 'u1',
    kind: 'bug',
    subject: 'Login button broken',
    body: 'It does nothing on click.',
    status: 'open',
    decided_by: null,
    decided_at: null,
    decision_notes: null,
    granted_hours: null,
    created_at: '2026-05-06T10:00:00Z',
    updated_at: '2026-05-06T10:00:00Z',
    ...overrides,
  };
}

describe('useSupportRequests', () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it('fetches /v1/support/requests on mount with limit + offset', async () => {
    apiCall.mockResolvedValue([row()]);
    const { result } = renderHook(() => useSupportRequests({ limit: 25, offset: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiCall).toHaveBeenCalledTimes(1);
    const [path, opts] = apiCall.mock.calls[0];
    expect(path).toBe('/v1/support/requests?limit=25&offset=0');
    expect((opts as { signal: AbortSignal }).signal).toBeInstanceOf(AbortSignal);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe('r1');
  });

  it('accepts both bare-array and { rows } envelope shapes', async () => {
    apiCall.mockResolvedValue({ rows: [row({ id: 'r2' })] });
    const { result } = renderHook(() => useSupportRequests());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0].id).toBe('r2');
  });

  it('aborts the in-flight request on unmount', async () => {
    let captured: AbortSignal | null = null;
    apiCall.mockImplementation((_path: string, opts: { signal: AbortSignal }) => {
      captured = opts.signal;
      // Return a forever-pending promise so the fetch is still in flight at unmount.
      return new Promise(() => {});
    });
    const { unmount } = renderHook(() => useSupportRequests());
    // Wait one tick for the effect to fire fetchOnce.
    await waitFor(() => expect(apiCall).toHaveBeenCalled());
    expect(captured).not.toBeNull();
    expect(captured!.aborted).toBe(false);
    unmount();
    expect(captured!.aborted).toBe(true);
  });

  it('exposes API errors via the error state', async () => {
    apiCall.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useSupportRequests());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toEqual([]);
  });

  it('prepend() optimistically inserts a new row at the head', async () => {
    apiCall.mockResolvedValue([row({ id: 'old' })]);
    const { result } = renderHook(() => useSupportRequests());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.prepend(row({ id: 'new', kind: 'demo' }));
    });
    expect(result.current.data.map((r) => r.id)).toEqual(['new', 'old']);
  });
});

describe('useSupportRequestActions.create', () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it('POSTs the payload and returns the created row', async () => {
    apiCall.mockResolvedValueOnce(row({ id: 'created', kind: 'suggestion' }));
    const { result } = renderHook(() => useSupportRequestActions());
    const out = await result.current.create({
      kind: 'suggestion',
      subject: 'Add dark mode toggle',
      body: 'Some surfaces are still dim by default.',
    });
    expect(apiCall).toHaveBeenCalledWith('/v1/support/requests', {
      method: 'POST',
      body: {
        kind: 'suggestion',
        subject: 'Add dark mode toggle',
        body: 'Some surfaces are still dim by default.',
      },
    });
    expect(out.id).toBe('created');
  });

  it('maps a 409 to the conflict_open_request_exists error type', async () => {
    apiCall.mockRejectedValueOnce(new ApiError(409, { detail: 'open exists' }));
    const { result } = renderHook(() => useSupportRequestActions());
    await expect(
      result.current.create({ kind: 'bug', subject: 's', body: 'b' }),
    ).rejects.toMatchObject({ type: 'conflict_open_request_exists', status: 409 });
  });

  it('maps a 429 to the rate_limited error type', async () => {
    apiCall.mockRejectedValueOnce(new ApiError(429, { detail: 'slow down' }));
    const { result } = renderHook(() => useSupportRequestActions());
    await expect(
      result.current.create({ kind: 'demo', subject: 's', body: 'b' }),
    ).rejects.toMatchObject({ type: 'rate_limited', status: 429 });
  });
});

describe('parseSupportRequestError', () => {
  it('returns conflict on ApiError 409', () => {
    expect(parseSupportRequestError(new ApiError(409, null)).type).toBe(
      'conflict_open_request_exists',
    );
  });
  it('returns rate_limited on ApiError 429', () => {
    expect(parseSupportRequestError(new ApiError(429, null)).type).toBe(
      'rate_limited',
    );
  });
  it('returns unknown on a plain Error', () => {
    expect(parseSupportRequestError(new Error('boom'))).toMatchObject({
      type: 'unknown',
      status: null,
    });
  });
});
