import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useKeysMock = vi.fn();
vi.mock('@/hooks/useKeys', () => ({ useKeys: () => useKeysMock() }));

import Keys from './Keys';

function setup(overrides: Record<string, unknown> = {}) {
  const create = vi.fn().mockResolvedValue({ id: 'n', key: 'opto_full', key_prefix: 'opto_a' });
  const revoke = vi.fn().mockResolvedValue(undefined);
  useKeysMock.mockReturnValue({
    keys: [
      { id: 'k1', label: 'prod', key_prefix: 'opto_aaa', status: 'active',
        created_at: '2026-01-01T00:00:00Z', last_used_at: null, revoked_at: null },
    ],
    loading: false, error: null, create, revoke, refresh: async () => {},
    ...overrides,
  });
  return { create, revoke, ...render(<MemoryRouter><Keys /></MemoryRouter>) };
}

describe('Keys page', () => {
  it('renders the table with key rows', () => {
    setup();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('opto_aaa...')).toBeInTheDocument();
  });

  it('opens create modal and calls create', async () => {
    const { create } = setup();
    await userEvent.click(screen.getByRole('button', { name: /create key/i }));
    await userEvent.type(screen.getByLabelText(/label/i), 'staging');
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /^create$|create key/i }));
    await waitFor(() => expect(create).toHaveBeenCalledWith('staging'));
  });

  it('confirms before revoking', async () => {
    const { revoke } = setup();
    await userEvent.click(screen.getByRole('button', { name: /revoke/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm revoke/i }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('k1'));
  });

  it('shows the empty state when no keys exist', () => {
    setup({ keys: [] });
    expect(screen.getByText(/no keys yet/i)).toBeInTheDocument();
  });
});
