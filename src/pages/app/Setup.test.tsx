import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useKeysMock = vi.fn();
vi.mock('@/hooks/useKeys', () => ({ useKeys: () => useKeysMock() }));

import Setup from './Setup';

function shell(keysList: unknown[]) {
  useKeysMock.mockReturnValue({
    keys: keysList, loading: false, error: null,
    create: vi.fn(), revoke: vi.fn(), refresh: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/app/setup']}>
      <Routes>
        <Route path="/app/setup" element={<Setup />} />
        <Route path="/app/keys" element={<p>keys page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Setup page', () => {
  it('routes to keys when user has none', () => {
    shell([]);
    expect(screen.getByText(/generate your first key/i)).toBeInTheDocument();
  });

  it('renders the OpenAI snippet by default with the key inlined', () => {
    shell([{ id: 'k1', label: 'prod', key_prefix: 'opto_alpha', status: 'active' }]);
    expect(screen.getByRole('tab', { name: /openai/i })).toBeInTheDocument();
    expect(screen.getByText(/opto_alpha/)).toBeInTheDocument();
  });

  it('switches to the Anthropic tab', async () => {
    shell([{ id: 'k1', label: 'prod', key_prefix: 'opto_beta', status: 'active' }]);
    await userEvent.click(screen.getByRole('tab', { name: /anthropic/i }));
    expect(screen.getByText(/anthropic\.com/i)).toBeInTheDocument();
  });
});
