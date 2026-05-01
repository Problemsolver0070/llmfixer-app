import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import WorkspaceAccept from './WorkspaceAccept';
import { api, ApiError } from '@/lib/api';
import { useAccount } from '@/hooks/useAccount';

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
vi.mock('@/hooks/useAccount', () => ({ useAccount: vi.fn() }));

function renderAt(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/app/workspace/accept?token=${token}`]}>
      <Routes>
        <Route path="/app/workspace/accept" element={<WorkspaceAccept />} />
        <Route path="/app/workspace" element={<div>workspace home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const SIGNED_IN = {
  data: {
    user: {
      id: 'u1',
      email: 'ben@acme.io',
      role: 'user' as const,
      status: 'trial',
      trial_ends_at: null,
      paypal_sub_id: null,
      cancels_at: null,
      comp_until: null,
      plan_id: null,
      seat_count: 1,
    },
    requests_this_week: 0,
    active_key_count: 0,
  },
  loading: false,
  error: null,
  refresh: vi.fn(),
};

describe('WorkspaceAccept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders auth gate when not signed in', () => {
    vi.mocked(useAccount).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderAt('TOKEN-X');
    expect(screen.getByText('Sign up')).toBeInTheDocument();
    expect(screen.getByText(/bound to that email/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/signup?invite=TOKEN-X',
    );
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?invite=TOKEN-X',
    );
  });

  it('renders clean card when signed-in user has no subscription', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAccount).mockReturnValue(SIGNED_IN as any);
    vi.mocked(api).mockResolvedValueOnce({
      branch: 'clean',
      inviter_email: 'amir@acme.io',
      workspace_plan_id: 'workspace-monthly',
      refund_amount_cents: null,
      leaving_workspace_admin_email: null,
    });
    renderAt('TOKEN-X');
    await waitFor(() => expect(screen.getByText(/Join amir@acme.io/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Join workspace/ })).toBeInTheDocument();
  });

  it('renders solo card with refund amount when caller has Solo sub', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAccount).mockReturnValue(SIGNED_IN as any);
    vi.mocked(api).mockResolvedValueOnce({
      branch: 'solo_cancel',
      inviter_email: 'amir@acme.io',
      workspace_plan_id: 'workspace-monthly',
      refund_amount_cents: 1143,
      leaving_workspace_admin_email: null,
    });
    renderAt('TOKEN-X');
    await waitFor(() => expect(screen.getByText(/\$11\.43/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Cancel Solo and join/ })).toBeInTheDocument();
  });

  it('renders leave-other card with old admin email when caller is in another workspace', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAccount).mockReturnValue(SIGNED_IN as any);
    vi.mocked(api).mockResolvedValueOnce({
      branch: 'leave_other_workspace',
      inviter_email: 'amir@acme.io',
      workspace_plan_id: 'workspace-monthly',
      refund_amount_cents: null,
      leaving_workspace_admin_email: 'foocorp-admin@foocorp.io',
    });
    renderAt('TOKEN-X');
    await waitFor(() =>
      expect(screen.getAllByText(/foocorp-admin@foocorp.io/).length).toBeGreaterThan(0),
    );
    expect(
      screen.getByRole('button', { name: /Leave foocorp-admin@foocorp\.io and join/ }),
    ).toBeInTheDocument();
  });

  it('renders admin-of-own card when caller already runs a workspace', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAccount).mockReturnValue(SIGNED_IN as any);
    vi.mocked(api).mockResolvedValueOnce({
      branch: 'reject_admin_of_own',
      inviter_email: 'amir@acme.io',
      workspace_plan_id: 'workspace-monthly',
      refund_amount_cents: null,
      leaving_workspace_admin_email: null,
    });
    renderAt('TOKEN-X');
    await waitFor(() =>
      expect(screen.getByText(/can't join this workspace/i)).toBeInTheDocument(),
    );
  });

  it('renders expired error on 410', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAccount).mockReturnValue(SIGNED_IN as any);
    vi.mocked(api).mockRejectedValueOnce(new ApiError(410, null, 'expired'));
    renderAt('TOKEN-X');
    await waitFor(() =>
      expect(screen.getByText(/this invite has expired/i)).toBeInTheDocument(),
    );
  });

  it('renders unrecognized error on 404', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAccount).mockReturnValue(SIGNED_IN as any);
    vi.mocked(api).mockRejectedValueOnce(new ApiError(404, null, 'not found'));
    renderAt('TOKEN-X');
    await waitFor(() =>
      expect(screen.getByText(/Link not recognized/i)).toBeInTheDocument(),
    );
  });

  it('posts accept then navigates to /app/workspace on confirm', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAccount).mockReturnValue(SIGNED_IN as any);
    vi.mocked(api).mockResolvedValueOnce({
      branch: 'clean',
      inviter_email: 'amir@acme.io',
      workspace_plan_id: 'workspace-monthly',
      refund_amount_cents: null,
      leaving_workspace_admin_email: null,
    });
    vi.mocked(api).mockResolvedValueOnce(undefined);
    renderAt('TOKEN-X');
    const confirm = await screen.findByRole('button', { name: /Join workspace/ });
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.getByText(/workspace home/i)).toBeInTheDocument());
    expect(api).toHaveBeenLastCalledWith('/v1/workspace/accept-invite', {
      method: 'POST',
      body: { token: 'TOKEN-X' },
    });
  });
});
