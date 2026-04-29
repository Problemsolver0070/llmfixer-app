import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock `@/lib/env` first so the transitive `@/lib/supabase` import in
// useStreamMessage.ts does not blow up when CI runs `npm test` without
// VITE_SUPABASE_URL et al. (env.ts throws at module load on missing vars
// by design; only the test mocks bypass it.)
vi.mock('@/lib/env', () => ({
  env: {
    supabaseUrl: 'http://localhost',
    supabaseAnonKey: 'test',
    apiBase: 'http://localhost',
    paypalClientId: 'test',
    paypalPlanId: 'P-test',
  },
}));
vi.mock('@/lib/api', () => ({ api: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-jwt' } } })),
    },
  },
}));
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { api } from '@/lib/api';
import { useStreamMessage } from './useStreamMessage';

function makeSseStream(events: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const e of events) {
        controller.enqueue(enc.encode(`data: ${e}\n\n`));
      }
      controller.close();
    },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
});

describe('useStreamMessage', () => {
  it('parses started/delta/complete events and accumulates text', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: makeSseStream([
        JSON.stringify({ type: 'started', message_id: 'a1' }),
        JSON.stringify({ type: 'delta', text: 'Hello' }),
        JSON.stringify({ type: 'delta', text: ' there' }),
        JSON.stringify({ type: 'complete', message_id: 'a1', total_text: 'Hello there' }),
      ]),
    });
    const { result } = renderHook(() => useStreamMessage('t1'));
    await act(async () => {
      await result.current.send('hi', []);
    });
    await waitFor(() => expect(result.current.streamingMessage?.status).toBe('complete'));
    expect(result.current.streamingMessage?.text).toBe('Hello there');
    expect(result.current.streamingMessage?.id).toBe('a1');
  });

  it('marks the message cancelled when receiving the cancelled event', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: makeSseStream([
        JSON.stringify({ type: 'started', message_id: 'a1' }),
        JSON.stringify({ type: 'delta', text: 'Hello' }),
        JSON.stringify({ type: 'cancelled', message_id: 'a1', partial_text: 'Hello' }),
      ]),
    });
    const { result } = renderHook(() => useStreamMessage('t1'));
    await act(async () => {
      await result.current.send('hi', []);
    });
    await waitFor(() => expect(result.current.streamingMessage?.status).toBe('cancelled'));
    expect(result.current.streamingMessage?.text).toBe('Hello');
  });

  it('marks error on error event and surfaces error_type', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: makeSseStream([
        JSON.stringify({ type: 'started', message_id: 'a1' }),
        JSON.stringify({ type: 'error', error_type: 'upstream_error', message: 'boom' }),
      ]),
    });
    const { result } = renderHook(() => useStreamMessage('t1'));
    await act(async () => {
      await result.current.send('hi', []);
    });
    await waitFor(() => expect(result.current.streamingMessage?.status).toBe('error'));
    expect(result.current.streamingMessage?.errorType).toBe('upstream_error');
  });

  it('cancel calls the cancel API with the assistant message id from the started event', async () => {
    // Stream emits `started` and finishes; status becomes complete with id 'a1'.
    // Then we trigger cancel(), which should still POST the cancel route with
    // the assistant_message_id from the started event (the implementation
    // tracks the id in a ref so it survives state-flushing across send calls).
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: makeSseStream([
        JSON.stringify({ type: 'started', message_id: 'a1' }),
        JSON.stringify({ type: 'delta', text: 'hi' }),
      ]),
    });
    (api as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ cancelled: true });

    const { result } = renderHook(() => useStreamMessage('t1'));
    await act(async () => {
      await result.current.send('hi', []);
    });
    expect(result.current.streamingMessage?.id).toBe('a1');

    await act(async () => {
      result.current.cancel();
    });
    expect(api).toHaveBeenCalledWith(
      '/v1/support/threads/t1/messages/cancel',
      expect.objectContaining({ method: 'POST', body: { message_id: 'a1' } }),
    );
    expect(result.current.streamingMessage?.status).toBe('cancelled');
  });
});
