import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const useKeysMock = vi.fn();
vi.mock('@/hooks/useKeys', () => ({ useKeys: () => useKeysMock() }));

import { SetupReference } from './SetupReference';

describe('SetupReference', () => {
  it('renders the API reference content', () => {
    useKeysMock.mockReturnValue({
      keys: [{ id: 'k1', label: 'prod', key_prefix: 'opto_alpha', status: 'active' }],
      loading: false, error: null,
      create: vi.fn(), revoke: vi.fn(), refresh: vi.fn(),
    });
    render(<MemoryRouter><SetupReference /></MemoryRouter>);
    expect(screen.getByText(/proxy Anthropic models via Microsoft AI Foundry/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see full catalog/i })).toBeInTheDocument();
  });
});
