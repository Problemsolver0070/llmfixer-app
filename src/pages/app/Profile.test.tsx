import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserMe = vi.fn();
vi.mock('@/hooks/useUserMe', () => ({
  useUserMe: () => mockUserMe(),
}));

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({
  api: (...a: unknown[]) => apiCall(...a),
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.body = body;
    }
  },
}));

import Profile from './Profile';
import { ApiError } from '@/lib/api';

function userMeData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'a@b.c',
    full_name: 'Ada Lovelace',
    referral_code: null,
    referred_by_user_id: null,
    demo_expires_at: null,
    trial_expires_at: null,
    first_paid_charge_at: null,
    referral_credit_seconds_accumulated: 0,
    is_eligible_to_refer: false,
    has_active_subscription: false,
    in_demo_window: false,
    in_trial_window: false,
    ...overrides,
  };
}

function makeUserMeReturn(data: ReturnType<typeof userMeData> | null, refresh = vi.fn()) {
  return {
    data,
    loading: false,
    error: null,
    isEligibleToRefer: false,
    hasActiveSubscription: false,
    inDemoWindow: false,
    inTrialWindow: false,
    hasAccess: false,
    refresh,
  };
}

describe('Profile page', () => {
  beforeEach(() => {
    apiCall.mockReset();
    mockUserMe.mockReset();
  });

  it('renders the heading, sub-text, and current name', () => {
    mockUserMe.mockReturnValue(makeUserMeReturn(userMeData()));
    render(<Profile />);
    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
    expect(
      screen.getByText(/how the fixer addresses you in chats and in emails\./i),
    ).toBeInTheDocument();
    const input = screen.getByLabelText(/your name/i) as HTMLInputElement;
    expect(input.value).toBe('Ada Lovelace');
  });

  it('renders an empty input when full_name is null', () => {
    mockUserMe.mockReturnValue(makeUserMeReturn(userMeData({ full_name: null })));
    render(<Profile />);
    const input = screen.getByLabelText(/your name/i) as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('shows a loading state when the hook has no data yet', () => {
    mockUserMe.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      isEligibleToRefer: false,
      hasActiveSubscription: false,
      inDemoWindow: false,
      inTrialWindow: false,
      hasAccess: false,
      refresh: vi.fn(),
    });
    render(<Profile />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('PATCHes /v1/users/me with the trimmed name and refreshes', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    mockUserMe.mockReturnValue(makeUserMeReturn(userMeData(), refresh));
    apiCall.mockResolvedValueOnce({});
    render(<Profile />);

    const input = screen.getByLabelText(/your name/i);
    await userEvent.clear(input);
    await userEvent.type(input, '  Grace Hopper  ');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(apiCall).toHaveBeenCalledWith('/v1/users/me', {
        method: 'PATCH',
        body: { full_name: 'Grace Hopper' },
      }),
    );
    expect(refresh).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/saved\./i),
    );
  });

  it('blocks submit and shows a validation error when the name is empty after trim', async () => {
    mockUserMe.mockReturnValue(makeUserMeReturn(userMeData({ full_name: 'Ada' })));
    render(<Profile />);

    const input = screen.getByLabelText(/your name/i);
    await userEvent.clear(input);
    await userEvent.type(input, '     ');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(apiCall).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your name/i);
  });

  it('surfaces the backend error message on API failure', async () => {
    mockUserMe.mockReturnValue(makeUserMeReturn(userMeData()));
    apiCall.mockRejectedValueOnce(
      new ApiError(400, { error: { message: 'name too funky' } }),
    );
    render(<Profile />);

    const input = screen.getByLabelText(/your name/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'Grace');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/name too funky/i),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('clears the success message when the user edits the name again', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    mockUserMe.mockReturnValue(makeUserMeReturn(userMeData(), refresh));
    apiCall.mockResolvedValueOnce({});
    render(<Profile />);

    const input = screen.getByLabelText(/your name/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'Grace');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/saved\./i),
    );

    // Editing the field clears the success notice immediately so the user
    // is not misled into thinking the new edit was already saved.
    await userEvent.type(input, 'X');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
