import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

import { AppShell } from './AppShell';

type ShellOpts = {
  role?: 'user' | 'admin';
  path?: string;
  plan_id?: string | null;
  workspace_admin_id?: string | null;
  hasActiveSubscription?: boolean;
};

function shell(opts: ShellOpts = {}) {
  const {
    role = 'user',
    path = '/app/dashboard',
    plan_id = null,
    workspace_admin_id = null,
    hasActiveSubscription = false,
  } = opts;
  useAccount.mockReturnValue({
    data: {
      user: { id: 'u', email: 'a@b.c', role, status: 'trial', trial_ends_at: null,
              paypal_sub_id: null, cancels_at: null, comp_until: null,
              plan_id, seat_count: 1, workspace_admin_id },
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, error: null, hasActiveSubscription, refresh: async () => {},
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
    expect(screen.getByRole('link', { name: /^refer$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /workspace/i })).not.toBeInTheDocument();
  });

  it('places the Refer tab between Billing and Account', () => {
    shell();
    const links = screen.getAllByRole('link').map((a) => a.textContent);
    const billingIdx = links.indexOf('Billing');
    const referIdx = links.indexOf('Refer');
    const accountIdx = links.indexOf('Account');
    expect(billingIdx).toBeGreaterThanOrEqual(0);
    expect(referIdx).toBe(billingIdx + 1);
    expect(accountIdx).toBe(referIdx + 1);
  });

  it('shows the Admin tab when role is admin', () => {
    shell({ role: 'admin' });
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
  });

  it('marks the current tab with data-active', () => {
    shell({ path: '/app/keys' });
    expect(screen.getByRole('link', { name: /keys/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('data-active', 'false');
  });

  it('renders the children inside the page body', () => {
    shell();
    expect(screen.getByTestId('page-body')).toBeInTheDocument();
  });

  it('defaults the main width variant to narrow', () => {
    const { container } = shell();
    const main = container.querySelector('main.app-shell-main');
    expect(main).toHaveAttribute('data-width', 'narrow');
  });

  it('honors an explicit width prop on the shell', () => {
    useAccount.mockReturnValue({
      data: {
        user: { id: 'u', email: 'a@b.c', role: 'user', status: 'trial', trial_ends_at: null,
                paypal_sub_id: null, cancels_at: null, comp_until: null,
                plan_id: null, seat_count: 1, workspace_admin_id: null },
        requests_this_week: 0, active_key_count: 0,
      },
      loading: false, error: null, hasActiveSubscription: false, refresh: async () => {},
    });
    const { container } = render(
      <MemoryRouter initialEntries={['/app/setup']}>
        <Routes>
          <Route path="/app/*" element={<AppShell width="full"><p>page body</p></AppShell>} />
        </Routes>
      </MemoryRouter>,
    );
    const main = container.querySelector('main.app-shell-main');
    expect(main).toHaveAttribute('data-width', 'full');
  });

  it('shows the Workspace tab for a workspace admin (plan starts with workspace-)', () => {
    shell({ plan_id: 'workspace-monthly', workspace_admin_id: null });
    expect(screen.getByRole('link', { name: /workspace/i })).toBeInTheDocument();
  });

  it('shows the Workspace tab for a workspace member (workspace_admin_id set)', () => {
    shell({ plan_id: null, workspace_admin_id: 'admin-uuid' });
    expect(screen.getByRole('link', { name: /workspace/i })).toBeInTheDocument();
  });

  it('hides the Workspace tab for a Solo subscriber', () => {
    shell({ plan_id: 'solo-monthly', workspace_admin_id: null });
    expect(screen.queryByRole('link', { name: /workspace/i })).not.toBeInTheDocument();
  });

  it('hides the Workspace tab for a free-trial user (no plan_id, no workspace)', () => {
    shell({ plan_id: null, workspace_admin_id: null });
    expect(screen.queryByRole('link', { name: /workspace/i })).not.toBeInTheDocument();
  });

  it('places the Workspace tab between Keys and Billing', () => {
    shell({ plan_id: 'workspace-quarterly', workspace_admin_id: null });
    const links = screen.getAllByRole('link').map((a) => a.textContent);
    const keysIdx = links.indexOf('Keys');
    const workspaceIdx = links.indexOf('Workspace');
    const billingIdx = links.indexOf('Billing');
    expect(keysIdx).toBeGreaterThanOrEqual(0);
    expect(workspaceIdx).toBe(keysIdx + 1);
    expect(billingIdx).toBe(workspaceIdx + 1);
  });

  it('includes ChatNavLink for paid users (hasActiveSubscription=true)', () => {
    shell({ hasActiveSubscription: true });
    const link = screen.getByRole('link', { name: /the fixer ai/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://chat.thefixer.in');
  });

  it('hides ChatNavLink for unpaid users (hasActiveSubscription=false)', () => {
    shell({ hasActiveSubscription: false });
    expect(screen.queryByRole('link', { name: /^the fixer ai$/i })).not.toBeInTheDocument();
  });

  it('places ChatNavLink after Account and before Admin', () => {
    shell({ role: 'admin', hasActiveSubscription: true });
    const links = screen.getAllByRole('link').map((a) => a.textContent);
    const accountIdx = links.indexOf('Account');
    const chatIdx = links.indexOf('The Fixer ai');
    const adminIdx = links.indexOf('Admin');
    expect(accountIdx).toBeGreaterThanOrEqual(0);
    expect(chatIdx).toBe(accountIdx + 1);
    expect(adminIdx).toBe(chatIdx + 1);
  });
});
