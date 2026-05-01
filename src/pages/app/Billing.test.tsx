import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Billing from './Billing';
import { useAccount } from '@/hooks/useAccount';
import { useSubscription } from '@/hooks/useSubscription';

vi.mock('@/hooks/useAccount', () => ({ useAccount: vi.fn() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn(), signOut: vi.fn() } } }));
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.body = body;
    }
  },
  api: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

const SUB_DEFAULT = { subscription: null, loading: false, activate: vi.fn(), cancel: vi.fn(), changePlan: vi.fn(), redeem: vi.fn() };

describe('Billing', () => {
  it('renders See-plans CTA pointing at /pricing for trial users without a subscription', () => {
    vi.mocked(useAccount).mockReturnValue({
      data: { user: { id: 'u', email: 'a', status: 'trial', paypal_sub_id: null, plan_id: null, seat_count: 1, cancels_at: null }, requests_this_week: 0, active_key_count: 0 },
      loading: false, refresh: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useSubscription).mockReturnValue(SUB_DEFAULT as any);
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /see plans/i })).toHaveAttribute('href', '/pricing');
    expect(screen.queryByText(/subscribe with paypal/i)).not.toBeInTheDocument();
  });

  it('renders current SKU and Change-plan link for active subscribers', () => {
    vi.mocked(useAccount).mockReturnValue({
      data: { user: { id: 'u', email: 'a', status: 'active', paypal_sub_id: 'SUB-1', plan_id: 'solo-weekly', seat_count: 1, cancels_at: null }, requests_this_week: 0, active_key_count: 0 },
      loading: false, refresh: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useSubscription).mockReturnValue({ ...SUB_DEFAULT, subscription: { paypal_sub_id: 'SUB-1', status: 'ACTIVE', next_billing_time: null, plan_id: 'P-LIVE' } } as any);
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(screen.getByText('solo-weekly')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /change plan/i })).toHaveAttribute('href', '/app/billing/upgrade');
  });
});
