import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));

import { api } from '@/lib/api';
import { useSupportThreads } from './useSupportThreads';

const sample = {
  threads: [
    { id: 't1', title: 'How to install', archived: false, created_at: '2026-04-29T10:00:00Z', updated_at: '2026-04-29T10:00:00Z' },
    { id: 't2', title: 'Billing question', archived: false, created_at: '2026-04-29T09:00:00Z', updated_at: '2026-04-29T09:00:00Z' },
  ],
};

function Probe() {
  const { threads, loading, error, create, rename, archive, remove, refetch } = useSupportThreads();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{threads.length}</span>
      <span data-testid="error">{error ? error.message : ''}</span>
      <button data-testid="create" onClick={() => { void create(); }}>create</button>
      <button data-testid="rename" onClick={() => { void rename('t1', 'Renamed'); }}>rename</button>
      <button data-testid="archive" onClick={() => { void archive('t1'); }}>archive</button>
      <button data-testid="remove" onClick={() => { void remove('t1'); }}>remove</button>
      <button data-testid="refetch" onClick={() => { void refetch(); }}>refetch</button>
    </div>
  );
}

afterEach(() => vi.clearAllMocks());

describe('useSupportThreads', () => {
  it('fetches the thread list on mount', async () => {
    (api as ReturnType<typeof vi.fn>).mockResolvedValueOnce(sample);
    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('count').textContent).toBe('2');
    expect(api).toHaveBeenCalledWith('/v1/support/threads');
  });

  it('creates a thread', async () => {
    (api as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(sample)
      .mockResolvedValueOnce({ id: 'new', title: 'New conversation', archived: false, created_at: '2026-04-29T11:00:00Z', updated_at: '2026-04-29T11:00:00Z' })
      .mockResolvedValueOnce({ threads: [{ id: 'new', title: 'New conversation', archived: false, created_at: '2026-04-29T11:00:00Z', updated_at: '2026-04-29T11:00:00Z' }] });
    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    await act(async () => { getByTestId('create').click(); });
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/support/threads', { method: 'POST' }));
  });

  it('renames a thread via PATCH', async () => {
    (api as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(sample)
      .mockResolvedValueOnce({ ...sample.threads[0], title: 'Renamed' })
      .mockResolvedValueOnce(sample);
    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    await act(async () => { getByTestId('rename').click(); });
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/support/threads/t1', expect.objectContaining({ method: 'PATCH', body: { title: 'Renamed' } })));
  });

  it('archives a thread', async () => {
    (api as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(sample)
      .mockResolvedValueOnce({ ...sample.threads[0], archived: true })
      .mockResolvedValueOnce({ threads: [sample.threads[1]] });
    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    await act(async () => { getByTestId('archive').click(); });
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/support/threads/t1', expect.objectContaining({ method: 'PATCH', body: { archived: true } })));
  });

  it('removes a thread', async () => {
    (api as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(sample)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ threads: [sample.threads[1]] });
    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    await act(async () => { getByTestId('remove').click(); });
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/support/threads/t1', { method: 'DELETE' }));
  });
});
