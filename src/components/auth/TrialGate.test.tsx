import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

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
  setUnauthorizedHandler: vi.fn(),
}));

import { TrialGate } from './TrialGate';
import { ApiError } from '@/lib/api';

function renderGate(child: React.ReactNode = <p>Inside</p>) {
  return render(
    <MemoryRouter>
      <TrialGate>{child}</TrialGate>
    </MemoryRouter>,
  );
}

describe('TrialGate', () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it('renders a spinner while loading', () => {
    mockUserMe.mockReturnValue({
      loading: true,
      error: null,
      hasAccess: false,
      refresh: vi.fn(),
    });
    renderGate();
    expect(screen.getByRole('status')).toHaveTextContent(/checking access/i);
    expect(screen.queryByText('Inside')).not.toBeInTheDocument();
  });

  it('renders children when hasAccess=true', () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: null,
      hasAccess: true,
      refresh: vi.fn(),
    });
    renderGate();
    expect(screen.getByText('Inside')).toBeInTheDocument();
    expect(screen.queryByText(/add a payment method/i)).not.toBeInTheDocument();
  });

  it('renders the wall when hasAccess=false', () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: null,
      hasAccess: false,
      refresh: vi.fn(),
    });
    renderGate();
    expect(
      screen.getByRole('heading', { name: /add a payment method to start your 24-hour trial/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Inside')).not.toBeInTheDocument();
  });

  it('CTA links to /app/billing/upgrade', () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: null,
      hasAccess: false,
      refresh: vi.fn(),
    });
    renderGate();
    const cta = screen.getByRole('link', { name: /add payment method/i });
    expect(cta).toHaveAttribute('href', '/app/billing/upgrade');
  });

  it('shows a soft error variant when useUserMe surfaces an error', () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: new Error('5xx'),
      hasAccess: false,
      refresh: vi.fn(),
    });
    renderGate();
    expect(
      screen.getByText(/we could not confirm your access/i),
    ).toBeInTheDocument();
  });

  it('referral modal opens, claims a code, and triggers refresh on success', async () => {
    const refresh = vi.fn();
    mockUserMe.mockReturnValue({
      loading: false,
      error: null,
      hasAccess: false,
      refresh,
    });
    apiCall.mockResolvedValueOnce({ ok: true });
    renderGate();

    fireEvent.click(screen.getByRole('button', { name: /click here to apply/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const input = screen.getByLabelText('Referral code');
    fireEvent.change(input, { target: { value: '  ABCD1234  ' } });
    fireEvent.click(screen.getByRole('button', { name: /apply code/i }));

    await waitFor(() =>
      expect(apiCall).toHaveBeenCalledWith('/v1/referrals/claim', {
        method: 'POST',
        body: { code: 'ABCD1234' },
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('referral modal surfaces backend error message when claim fails', async () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: null,
      hasAccess: false,
      refresh: vi.fn(),
    });
    apiCall.mockRejectedValueOnce(
      new ApiError(400, { error: { message: 'cap reached' } }),
    );
    renderGate();
    fireEvent.click(screen.getByRole('button', { name: /click here to apply/i }));
    fireEvent.change(screen.getByLabelText('Referral code'), {
      target: { value: 'CODE' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply code/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/cap reached/i),
    );
  });

  it('referral modal closes on cancel', () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: null,
      hasAccess: false,
      refresh: vi.fn(),
    });
    renderGate();
    fireEvent.click(screen.getByRole('button', { name: /click here to apply/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
