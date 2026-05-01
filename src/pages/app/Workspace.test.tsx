import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

import { useWorkspace } from '@/hooks/useWorkspace';
import Workspace from './Workspace';

const useWorkspaceMock = vi.mocked(useWorkspace);

function makeReturn(workspace: ReturnType<typeof useWorkspace>['workspace']) {
  return {
    workspace,
    loading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    invite: vi.fn().mockResolvedValue(undefined),
    refundInvite: vi.fn().mockResolvedValue(undefined),
    removeSeat: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Workspace page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders admin view with invite form', () => {
    useWorkspaceMock.mockReturnValue(
      makeReturn({
        viewer_role: 'admin',
        admin_email: 'a@x',
        plan_id: 'workspace-monthly',
        seat_count: 4,
        renews_at: '2026-05-28',
        extra_seat_price_display: '$9.99',
        members: [
          {
            user_id: '1',
            email: 'a@x',
            is_admin: true,
            is_you: true,
            output_tokens_this_week: 0,
            last_active_at: null,
          },
        ],
        pending_invites: [],
      }),
    );
    render(<Workspace />);
    expect(screen.getByPlaceholderText(/teammate@example.com/)).toBeInTheDocument();
    expect(screen.queryByText(/Leave workspace/i)).not.toBeInTheDocument();
  });

  it('renders member view with leave button and redacted columns', () => {
    useWorkspaceMock.mockReturnValue(
      makeReturn({
        viewer_role: 'member',
        admin_email: 'a@x',
        plan_id: 'workspace-monthly',
        seat_count: 4,
        renews_at: '2026-05-28',
        extra_seat_price_display: '$9.99',
        members: [
          {
            user_id: '2',
            email: 'me@x',
            is_admin: false,
            is_you: true,
            output_tokens_this_week: 1_400_000,
            last_active_at: '2026-05-01',
          },
          {
            user_id: '3',
            email: 'other@x',
            is_admin: false,
            is_you: false,
            output_tokens_this_week: 'private',
            last_active_at: 'private',
          },
        ],
        pending_invites: [],
      }),
    );
    render(<Workspace />);
    expect(screen.getByText(/Leave workspace/i)).toBeInTheDocument();
    expect(screen.getAllByText(/private/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when admin has no members', () => {
    useWorkspaceMock.mockReturnValue(
      makeReturn({
        viewer_role: 'admin',
        admin_email: 'a@x',
        plan_id: 'workspace-monthly',
        seat_count: 4,
        renews_at: '2026-05-28',
        extra_seat_price_display: '$9.99',
        members: [
          {
            user_id: '1',
            email: 'a@x',
            is_admin: true,
            is_you: true,
            output_tokens_this_week: 0,
            last_active_at: null,
          },
        ],
        pending_invites: [],
      }),
    );
    render(<Workspace />);
    expect(screen.getByText(/4 seats/)).toBeInTheDocument();
    expect(screen.getByText(/free for your team/)).toBeInTheDocument();
  });

  it('renders pending invites table when admin has pending', () => {
    useWorkspaceMock.mockReturnValue(
      makeReturn({
        viewer_role: 'admin',
        admin_email: 'a@x',
        plan_id: 'workspace-monthly',
        seat_count: 5,
        renews_at: '2026-05-28',
        extra_seat_price_display: '$9.99',
        members: [
          {
            user_id: '1',
            email: 'a@x',
            is_admin: true,
            is_you: true,
            output_tokens_this_week: 0,
            last_active_at: null,
          },
        ],
        pending_invites: [
          {
            token: 't1',
            email: 'b@x',
            sent_at: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
            expires_at: '2026-05-08',
            refund_deadline: '2026-05-28',
            refundable: true,
          },
        ],
      }),
    );
    render(<Workspace />);
    expect(screen.getByText(/Pending invites \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('b@x')).toBeInTheDocument();
    expect(screen.getByText(/Refund seat/)).toBeInTheDocument();
  });
});
