import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAccountMock = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccountMock() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({}), updateUser: vi.fn() } },
}));
vi.mock('@/lib/api', () => ({ api: vi.fn() }));

import Account from './Account';

function setup() {
  useAccountMock.mockReturnValue({
    data: {
      user: { id: 'u', email: 'a@b.c', role: 'user', status: 'active',
              trial_ends_at: null, paypal_sub_id: null, cancels_at: null, comp_until: null },
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, error: null, refresh: async () => {},
  });
  return render(<MemoryRouter><Account /></MemoryRouter>);
}

describe('Account page', () => {
  it('shows the email, change buttons, and danger zone toggle', async () => {
    setup();
    expect(screen.getByText('a@b.c')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/type/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /show danger zone/i }));
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });
});
