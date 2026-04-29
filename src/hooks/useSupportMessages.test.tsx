import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));

import { api } from '@/lib/api';
import { useSupportMessages } from './useSupportMessages';

const page1 = {
  messages: [
    { id: 'm2', thread_id: 't1', role: 'assistant', content: 'hi back', attachments: [], truncated: false, created_at: '2026-04-29T12:00:01Z' },
    { id: 'm1', thread_id: 't1', role: 'user', content: 'hi', attachments: [], truncated: false, created_at: '2026-04-29T12:00:00Z' },
  ],
  next_cursor: null,
};

function Probe({ threadId }: { threadId: string | null }) {
  const { messages, loading, append } = useSupportMessages(threadId);
  return (
    <div>
      <span data-testid="count">{messages.length}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button data-testid="append" onClick={() => append({
        id: 'm3', thread_id: 't1', role: 'user', content: 'follow-up', attachments: [], truncated: false, created_at: '2026-04-29T12:00:02Z',
      })}>append</button>
    </div>
  );
}

afterEach(() => vi.clearAllMocks());

describe('useSupportMessages', () => {
  it('fetches and returns messages oldest-first', async () => {
    (api as ReturnType<typeof vi.fn>).mockResolvedValueOnce(page1);
    const { getByTestId } = render(<Probe threadId="t1" />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('count').textContent).toBe('2');
    expect(api).toHaveBeenCalledWith('/v1/support/threads/t1/messages');
  });

  it('supports appending a new message locally', async () => {
    (api as ReturnType<typeof vi.fn>).mockResolvedValueOnce(page1);
    const { getByTestId } = render(<Probe threadId="t1" />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    await act(async () => { getByTestId('append').click(); });
    expect(getByTestId('count').textContent).toBe('3');
  });

  it('does not fetch when threadId is null', async () => {
    render(<Probe threadId={null} />);
    expect(api).not.toHaveBeenCalled();
  });
});
