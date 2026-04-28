import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useSupportThreads', () => ({
  useSupportThreads: () => ({
    threads: [], loading: false, error: null,
    create: vi.fn(), rename: vi.fn(), archive: vi.fn(), remove: vi.fn(), refetch: vi.fn(),
  }),
}));

const useKeysMock = vi.fn();
vi.mock('@/hooks/useKeys', () => ({ useKeys: () => useKeysMock() }));

import { Setup } from './Setup';

describe('Setup page', () => {
  it('renders both reference and support panes', () => {
    useKeysMock.mockReturnValue({
      keys: [{ id: 'k1', label: 'prod', key_prefix: 'opto_alpha', status: 'active' }],
      loading: false, error: null,
      create: vi.fn(), revoke: vi.fn(), refresh: vi.fn(),
    });
    render(<MemoryRouter><Setup /></MemoryRouter>);
    expect(screen.getByText(/proxy Anthropic models via Microsoft AI Foundry/i)).toBeInTheDocument();
    expect(screen.getByText(/ask anything about the fixer/i)).toBeInTheDocument();
  });
});
