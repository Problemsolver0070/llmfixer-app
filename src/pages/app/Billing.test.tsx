import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Billing from './Billing';
import { useAccount } from '@/hooks/useAccount';
import { useSubscription } from '@/hooks/useSubscription';
import { useWorkspace } from '@/hooks/useWorkspace';

vi.mock('@/hooks/useAccount', () => ({ useAccount: vi.fn() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: vi.fn() }));
vi.mock('@/hooks/useWorkspace', () => ({ useWorkspace: vi.fn() }));
vi.mock('@/hooks/useUserMe', () => ({
  useUserMe: () => ({
    data: null,
    loading: false,
    error: null,
    isEligibleToRefer: false,
    hasActiveSubscription: false,
    hasAccess: false,
    refresh: vi.fn(),
  }),
}));
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
const WORKSPACE_EMPTY = {
  workspace: null,
  loading: false,
  error: null,
  refresh: vi.fn(),
  invite: vi.fn(),
  refundInvite: vi.fn(),
  removeSeat: vi.fn(),
  leave: vi.fn(),
};

describe('Billing', () => {
  it('renders See-plans CTA for expired users without a subscription', () => {
    vi.mocked(useAccount).mockReturnValue({
      data: { user: { id: 'u', email: 'a', status: 'expired', paypal_sub_id: null, plan_id: null, seat_count: 1, cancels_at: null }, requests_this_week: 0, active_key_count: 0 },
      loading: false, refresh: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useSubscription).mockReturnValue(SUB_DEFAULT as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useWorkspace).mockReturnValue(WORKSPACE_EMPTY as any);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useWorkspace).mockReturnValue(WORKSPACE_EMPTY as any);
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(screen.getByText('solo-weekly')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /change plan/i })).toHaveAttribute('href', '/app/billing/upgrade');
  });

  it('opens CascadeCancelDialog when admin with members clicks Cancel subscription', async () => {
    const cancelMock = vi.fn();
    vi.mocked(useAccount).mockReturnValue({
      data: { user: { id: 'admin-1', email: 'amir@acme.io', status: 'active', paypal_sub_id: 'SUB-1', plan_id: 'workspace-monthly', seat_count: 5, cancels_at: null }, requests_this_week: 0, active_key_count: 0 },
      loading: false, refresh: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useSubscription).mockReturnValue({ ...SUB_DEFAULT, cancel: cancelMock } as any);
    vi.mocked(useWorkspace).mockReturnValue({
      ...WORKSPACE_EMPTY,
      workspace: {
        admin_email: 'amir@acme.io',
        plan_id: 'workspace-monthly',
        seat_count: 5,
        renews_at: '2026-05-28T00:00:00Z',
        extra_seat_price_display: '$9.99 / week prorated',
        viewer_role: 'admin',
        members: [
          { user_id: 'admin-1', email: 'amir@acme.io', is_admin: true, is_you: true, output_tokens_this_week: 0, last_active_at: null },
          { user_id: 'm1', email: 'jess@acme.io', is_admin: false, is_you: false, output_tokens_this_week: 0, last_active_at: null },
          { user_id: 'm2', email: 'sam@acme.io', is_admin: false, is_you: false, output_tokens_this_week: 0, last_active_at: null },
          { user_id: 'm3', email: 'kira@acme.io', is_admin: false, is_you: false, output_tokens_this_week: 0, last_active_at: null },
        ],
        pending_invites: [],
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    render(<MemoryRouter><Billing /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Cancel subscription/i }));
    expect(screen.getByText(/End workspace access for 3 members\?/)).toBeInTheDocument();
    expect(screen.getByText('jess@acme.io')).toBeInTheDocument();
    expect(screen.getByText('sam@acme.io')).toBeInTheDocument();
    expect(screen.getByText('kira@acme.io')).toBeInTheDocument();
    const dialogButtons = screen.getAllByRole('button', { name: /Cancel subscription/i });
    fireEvent.click(dialogButtons[dialogButtons.length - 1]);
    await waitFor(() => expect(cancelMock).toHaveBeenCalled());
  });

  it('opens the original confirm modal (not cascade) for solo admins with no members', () => {
    vi.mocked(useAccount).mockReturnValue({
      data: { user: { id: 'u', email: 'a', status: 'active', paypal_sub_id: 'SUB-1', plan_id: 'solo-weekly', seat_count: 1, cancels_at: null }, requests_this_week: 0, active_key_count: 0 },
      loading: false, refresh: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useSubscription).mockReturnValue({ ...SUB_DEFAULT } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useWorkspace).mockReturnValue(WORKSPACE_EMPTY as any);
    render(<MemoryRouter><Billing /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Cancel subscription/i }));
    expect(screen.getByText(/keys keep working/i)).toBeInTheDocument();
    expect(screen.queryByText(/End workspace access/)).not.toBeInTheDocument();
  });
});
