import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

import { AppShell } from './AppShell';

function shell(role: 'user' | 'admin' = 'user', path = '/app/dashboard') {
  useAccount.mockReturnValue({
    data: {
      user: { id: 'u', email: 'a@b.c', role, status: 'trial', trial_ends_at: null,
              paypal_sub_id: null, cancels_at: null, comp_until: null },
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, error: null, refresh: async () => {},
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/*" element={<AppShell><p data-testid="page-body">page body</p></AppShell>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('renders the standard tab list', () => {
    shell();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /setup/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /models/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /keys/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /billing/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows the Admin tab when role is admin', () => {
    shell('admin');
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
  });

  it('marks the current tab with data-active', () => {
    shell('user', '/app/keys');
    expect(screen.getByRole('link', { name: /keys/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('data-active', 'false');
  });

  it('renders the children inside the page body', () => {
    shell();
    expect(screen.getByTestId('page-body')).toBeInTheDocument();
  });
});
