import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));

import { __resetModelsCacheForTests, useModels } from './useModels';

const sampleCatalog = {
  available: [
    {
      id: 'claude-opus-4-7-1',
      display_name: 'Claude Opus 4.7',
      provider: 'anthropic',
      description: 'top-tier',
    },
  ],
  coming_soon: [
    { provider: 'openai', display_name: 'OpenAI', description: 'GPT family' },
  ],
};

function Probe() {
  const { data, loading, error } = useModels();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ? error.message : ''}</span>
      <span data-testid="ids">{(data?.available ?? []).map((m) => m.id).join(',')}</span>
    </div>
  );
}

afterEach(() => {
  apiCall.mockReset();
  __resetModelsCacheForTests();
});

describe('useModels', () => {
  it('fetches the catalog and surfaces it', async () => {
    apiCall.mockResolvedValueOnce(sampleCatalog);
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('loading').textContent).toBe('true');
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('ids').textContent).toBe('claude-opus-4-7-1');
    expect(apiCall).toHaveBeenCalledTimes(1);
    expect(apiCall).toHaveBeenCalledWith('/v1/models/catalog');
  });

  it('surfaces an error if the fetch rejects', async () => {
    apiCall.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('error').textContent).toBe('boom');
  });

  it('serves the cached catalog on second mount without refetching', async () => {
    apiCall.mockResolvedValueOnce(sampleCatalog);
    const first = render(<Probe />);
    await waitFor(() => expect(first.getByTestId('loading').textContent).toBe('false'));
    first.unmount();

    const second = render(<Probe />);
    expect(second.getByTestId('loading').textContent).toBe('false');
    expect(second.getByTestId('ids').textContent).toBe('claude-opus-4-7-1');
    expect(apiCall).toHaveBeenCalledTimes(1);
  });
});
