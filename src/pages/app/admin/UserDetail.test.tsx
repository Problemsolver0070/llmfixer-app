import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiCall(...args) }));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: [
      {
        sku: 'SOLO_WEEKLY',
        tier: 'solo',
        cadence: 'weekly',
        paypal_plan_id: 'P-1',
        base_price_cents: 999,
        per_seat_price_cents: null,
        included_seats: 1,
        display_price: '$9.99/wk',
        discount_pct: 0,
        trial_days: 2,
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

import UserDetail from './UserDetail';

const baseUser = {
  id: 'u-1',
  email: 'a@b.c',
  full_name: null,
  role: 'user',
  status: 'active',
  plan_id: 'SOLO_WEEKLY',
  seat_count: 1,
  paypal_sub_id: 'I-99',
  paypal_sub_status: 'ACTIVE',
  comp_until: null,
  trial_ends_at: null,
  cancels_at: null,
  output_tokens_this_week: 100,
  requests_this_week: 5,
  output_token_override_per_week: null,
  requests_override_per_week: null,
  created_at: '2026-01-01T00:00:00Z',
  last_active_at: null,
};

function renderAt(path = '/app/admin/users/u-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/admin/users/:userId" element={<UserDetail />} />
        <Route path="/app/admin/users" element={<div>USERS LIST</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => apiCall.mockReset());

describe('UserDetail', () => {
  it('shows loading then renders user header + summary', async () => {
    apiCall.mockResolvedValue(baseUser);
    renderAt();
    await waitFor(() => expect(screen.getByText('a@b.c')).toBeInTheDocument());
    expect(screen.getByText(/u-1/)).toBeInTheDocument();
    expect(screen.getByText('SOLO_WEEKLY')).toBeInTheDocument();
  });

  it('switches to the Billing tab and renders billing snapshot', async () => {
    apiCall.mockResolvedValue(baseUser);
    renderAt();
    await waitFor(() => expect(screen.getByText('a@b.c')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('tab', { name: /billing/i }));
    expect(screen.getByText(/billing snapshot/i)).toBeInTheDocument();
    expect(screen.getByText('I-99')).toBeInTheDocument();
  });

  it('switches to the History tab and reads the audit log', async () => {
    apiCall.mockImplementation((path: unknown) => {
      if (typeof path === 'string' && path.startsWith('/v1/admin/audit-log')) {
        return Promise.resolve({ rows: [], total: 0 });
      }
      return Promise.resolve(baseUser);
    });
    renderAt();
    await waitFor(() => expect(screen.getByText('a@b.c')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('tab', { name: /history/i }));
    await waitFor(() =>
      expect(screen.getByText(/no audit entries/i)).toBeInTheDocument(),
    );
    const auditCall = apiCall.mock.calls.find(
      ([path]: unknown[]) =>
        typeof path === 'string' && path.startsWith('/v1/admin/audit-log'),
    );
    expect(auditCall).toBeDefined();
    expect(auditCall?.[0]).toContain('target_id=u-1');
  });

  it('renders an error state when the user fetch fails', async () => {
    apiCall.mockRejectedValueOnce(new Error('forbidden'));
    renderAt();
    expect(await screen.findByRole('alert')).toHaveTextContent(/forbidden/i);
  });
});
