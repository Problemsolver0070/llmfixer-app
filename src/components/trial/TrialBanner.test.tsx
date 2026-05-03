import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockUserMe = vi.fn();
vi.mock('@/hooks/useUserMe', () => ({
  useUserMe: () => mockUserMe(),
}));

const mockSubscription = vi.fn();
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockSubscription(),
}));

const mockPlans = vi.fn();
vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => mockPlans(),
}));

const mockAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => mockAccount(),
}));

import { TrialBanner } from './TrialBanner';

interface UserMeShape {
  id: string;
  email: string;
  full_name: string | null;
  referral_code: string | null;
  referred_by_user_id: string | null;
  demo_expires_at: string | null;
  trial_expires_at: string | null;
  first_paid_charge_at: string | null;
  referral_credit_seconds_accumulated: number;
  is_eligible_to_refer: boolean;
  has_active_subscription: boolean;
  in_demo_window: boolean;
  in_trial_window: boolean;
}

function userMePayload(overrides: Partial<UserMeShape> = {}): UserMeShape {
  return {
    id: 'u1',
    email: 'a@b.c',
    full_name: 'Ada',
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

function setUserMe({
  data,
  hasActiveSubscription = false,
  inDemoWindow = false,
  inTrialWindow = false,
  refresh = vi.fn(),
}: {
  data: UserMeShape | null;
  hasActiveSubscription?: boolean;
  inDemoWindow?: boolean;
  inTrialWindow?: boolean;
  refresh?: () => void;
}) {
  mockUserMe.mockReturnValue({
    data,
    loading: false,
    error: null,
    isEligibleToRefer: false,
    hasActiveSubscription,
    inDemoWindow,
    inTrialWindow,
    hasAccess: hasActiveSubscription || inDemoWindow || inTrialWindow,
    refresh,
  });
  return refresh;
}

function renderBanner() {
  return render(
    <MemoryRouter>
      <TrialBanner />
    </MemoryRouter>,
  );
}

describe('TrialBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T12:00:00Z'));
    mockUserMe.mockReset();
    mockSubscription.mockReset();
    mockPlans.mockReset();
    mockAccount.mockReset();
    mockSubscription.mockReturnValue({
      subscription: null,
      loading: false,
      activate: vi.fn(),
      cancel: vi.fn(),
      redeem: vi.fn(),
      changePlan: vi.fn(),
    });
    mockPlans.mockReturnValue({ plans: [], loading: false, error: null, refresh: vi.fn() });
    mockAccount.mockReturnValue({
      data: {
        user: {
          id: 'u1',
          email: 'a@b.c',
          role: 'user',
          status: 'trial',
          trial_ends_at: null,
          paypal_sub_id: null,
          cancels_at: null,
          comp_until: null,
          plan_id: null,
          seat_count: 1,
          workspace_admin_id: null,
        },
        requests_this_week: 0,
        active_key_count: 0,
      },
      loading: false,
      error: null,
      hasActiveSubscription: false,
      refresh: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing for paid users with an active subscription', () => {
    setUserMe({ data: userMePayload({ has_active_subscription: true }), hasActiveSubscription: true });
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is no user data (signed out / pre-fetch)', () => {
    setUserMe({ data: null });
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the demo-window message with hours remaining and the upgrade CTA', () => {
    const demoExpires = new Date('2026-05-03T23:00:00Z').toISOString(); // 11h
    setUserMe({
      data: userMePayload({ in_demo_window: true, demo_expires_at: demoExpires }),
      inDemoWindow: true,
    });
    renderBanner();
    expect(screen.getByRole('status', { name: /referral demo countdown/i })).toBeInTheDocument();
    expect(screen.getByText(/Demo ends in/i)).toBeInTheDocument();
    expect(screen.getByText(/11 hours/)).toBeInTheDocument();
    expect(screen.getByText(/start your 24-hour trial/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /add payment method/i });
    expect(cta).toHaveAttribute('href', '/app/billing/upgrade');
  });

  it('renders the trial-window message with hours remaining and a renewal date', () => {
    const trialExpires = new Date('2026-05-04T08:00:00Z').toISOString(); // 20h
    setUserMe({
      data: userMePayload({ in_trial_window: true, trial_expires_at: trialExpires }),
      inTrialWindow: true,
    });
    renderBanner();
    expect(screen.getByRole('status', { name: /trial countdown/i })).toBeInTheDocument();
    expect(screen.getByText(/Trial ends in/i)).toBeInTheDocument();
    expect(screen.getByText(/20 hours/)).toBeInTheDocument();
    // Renewal date is the trial-expires date when no PayPal sub is known.
    expect(screen.getByText(/will be charged on May 4, 2026 unless you cancel\./i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /add payment method/i })).not.toBeInTheDocument();
  });

  it('includes the dollar amount in the trial message when the plan price is known', () => {
    const trialExpires = new Date('2026-05-04T08:00:00Z').toISOString();
    setUserMe({
      data: userMePayload({ in_trial_window: true, trial_expires_at: trialExpires }),
      inTrialWindow: true,
    });
    mockSubscription.mockReturnValue({
      subscription: {
        paypal_sub_id: 'I-1',
        status: 'ACTIVE',
        next_billing_time: '2026-05-04T08:00:00Z',
        plan_id: 'solo-weekly',
      },
      loading: false,
      activate: vi.fn(),
      cancel: vi.fn(),
      redeem: vi.fn(),
      changePlan: vi.fn(),
    });
    mockPlans.mockReturnValue({
      plans: [
        {
          sku: 'solo-weekly',
          tier: 'solo',
          cadence: 'weekly',
          paypal_plan_id: 'P-WEEKLY',
          base_price_cents: 1999,
          per_seat_price_cents: null,
          included_seats: 1,
          display_price: '$19.99',
          discount_pct: 0,
          trial_days: 1,
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockAccount.mockReturnValue({
      data: {
        user: {
          id: 'u1',
          email: 'a@b.c',
          role: 'user',
          status: 'trial',
          trial_ends_at: null,
          paypal_sub_id: 'I-1',
          cancels_at: null,
          comp_until: null,
          plan_id: 'solo-weekly',
          seat_count: 1,
          workspace_admin_id: null,
        },
        requests_this_week: 0,
        active_key_count: 0,
      },
      loading: false,
      error: null,
      hasActiveSubscription: false,
      refresh: vi.fn(),
    });
    renderBanner();
    expect(
      screen.getByText(/will be charged \$19\.99 on May 4, 2026 unless you cancel\./i),
    ).toBeInTheDocument();
  });

  it('renders the add-payment-method message when there is no demo, trial, or subscription', () => {
    setUserMe({ data: userMePayload() });
    renderBanner();
    expect(screen.getByText(/Access paused/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a payment method to continue\./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add payment method/i })).toHaveAttribute(
      'href',
      '/app/billing/upgrade',
    );
  });

  it('updates the countdown across a 1-minute tick and refetches when the deadline passes', () => {
    const refresh = vi.fn();
    // Demo expires in 90 seconds (1 minute remaining after rounding-up).
    const demoExpires = new Date('2026-05-03T12:01:30Z').toISOString();
    setUserMe({
      data: userMePayload({ in_demo_window: true, demo_expires_at: demoExpires }),
      inDemoWindow: true,
      refresh,
    });
    renderBanner();
    expect(screen.getByText(/2 minutes/)).toBeInTheDocument();

    // Tick once: now 30 seconds remain (1 minute after rounding).
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText(/1 minute/)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();

    // Tick again: deadline crossed, refetch.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
