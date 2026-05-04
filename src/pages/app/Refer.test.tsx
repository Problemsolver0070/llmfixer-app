import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/useReferrals', () => ({
  useReferrals: vi.fn(),
}));

const useAccountMock = vi.fn(() => ({
  data: { user: { status: 'active' } },
  loading: false,
  error: null,
  hasActiveSubscription: true,
  refresh: vi.fn(),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => useAccountMock(),
}));

import { useReferrals } from '@/hooks/useReferrals';
import Refer from './Refer';

const useReferralsMock = vi.mocked(useReferrals);

type ReferralRow = {
  id: string;
  referee_email_masked: string;
  status: 'pending' | 'claimed' | 'expired';
  created_at: string;
  claimed_at: string | null;
  expires_at: string | null;
  credit_seconds_granted: number;
};

function makeReturn(
  data: ReturnType<typeof useReferrals>['data'],
  overrides: Partial<ReturnType<typeof useReferrals>> = {},
): ReturnType<typeof useReferrals> {
  return {
    data,
    loading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function eligible(overrides: Record<string, unknown> = {}) {
  return {
    referral_code: '7CAC6F37',
    referral_link: 'https://thefixer.in/?ref=7CAC6F37',
    is_eligible_to_refer: true,
    pending_count: 0,
    pending_slots_remaining: 5,
    accumulated_credit_seconds: 0,
    lifetime_cap_remaining_seconds: 2_592_000,
    referrals: [] as ReferralRow[],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Refer />
    </MemoryRouter>,
  );
}

describe('Refer page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows ineligible placeholder when is_eligible_to_refer=false', () => {
    useReferralsMock.mockReturnValue(
      makeReturn(
        eligible({
          is_eligible_to_refer: false,
          referral_code: null,
          referral_link: null,
        }),
      ),
    );
    renderPage();
    expect(
      screen.getByText(/make your first paid charge to unlock/i),
    ).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /add payment method/i });
    expect(cta).toHaveAttribute('href', '/app/billing/upgrade');
    expect(screen.queryByText(/bring a friend/i)).not.toBeInTheDocument();
  });

  it('shows the hero, copy-pills, and empty table for an eligible user with no referrals', () => {
    useReferralsMock.mockReturnValue(makeReturn(eligible()));
    renderPage();
    expect(screen.getByText(/bring a friend to the fixer\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/your next bill moves 24 hours/i),
    ).toBeInTheDocument();
    expect(screen.getByText('7CAC6F37')).toBeInTheDocument();
    expect(
      screen.getByText('https://thefixer.in/?ref=7CAC6F37'),
    ).toBeInTheDocument();
    expect(screen.getByText(/no referrals yet/i)).toBeInTheDocument();
    expect(screen.getByText('Pending').closest('.refer-stat')).toBeInTheDocument();
    expect(screen.getByText('0 / 5')).toBeInTheDocument();
  });

  it('renders all three status badges and sorts pending->claimed->expired', () => {
    useReferralsMock.mockReturnValue(
      makeReturn(
        eligible({
          pending_count: 1,
          pending_slots_remaining: 4,
          accumulated_credit_seconds: 86400,
          lifetime_cap_remaining_seconds: 2_592_000 - 86400,
          referrals: [
            {
              id: 'r-claimed',
              referee_email_masked: 'cl***@x.com',
              status: 'claimed',
              created_at: '2026-04-25T00:00:00Z',
              claimed_at: '2026-04-26T00:00:00Z',
              expires_at: null,
              credit_seconds_granted: 86400,
            },
            {
              id: 'r-expired',
              referee_email_masked: 'ex***@x.com',
              status: 'expired',
              created_at: '2026-04-20T00:00:00Z',
              claimed_at: null,
              expires_at: '2026-04-27T00:00:00Z',
              credit_seconds_granted: 0,
            },
            {
              id: 'r-pending',
              referee_email_masked: 'pe***@x.com',
              status: 'pending',
              created_at: '2026-05-01T00:00:00Z',
              claimed_at: null,
              expires_at: '2026-05-08T00:00:00Z',
              credit_seconds_granted: 0,
            },
          ] as ReferralRow[],
        }),
      ),
    );
    renderPage();

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    // first row is the header, then pending, claimed, expired in that order.
    expect(rows).toHaveLength(4);
    expect(within(rows[1]).getByText('Pending')).toBeInTheDocument();
    expect(within(rows[1]).getByText('pe***@x.com')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Claimed')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Expired')).toBeInTheDocument();

    // Each badge carries data-status for the visual variant.
    expect(within(rows[1]).getByText('Pending')).toHaveAttribute(
      'data-status',
      'pending',
    );
    expect(within(rows[2]).getByText('Claimed')).toHaveAttribute(
      'data-status',
      'claimed',
    );
    expect(within(rows[3]).getByText('Expired')).toHaveAttribute(
      'data-status',
      'expired',
    );

    // Credit column shows formatted duration only when granted > 0.
    expect(within(rows[2]).getByText('1 day')).toBeInTheDocument();
    expect(within(rows[1]).getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('Copy code button calls navigator.clipboard.writeText with the code', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    useReferralsMock.mockReturnValue(makeReturn(eligible()));
    renderPage();
    const btn = screen.getByRole('button', { name: /copy referral code/i });
    fireEvent.click(btn);
    expect(writeText).toHaveBeenCalledWith('7CAC6F37');
  });

  it('renders "Slots open: 0" when pending_count hits the cap of 5', () => {
    useReferralsMock.mockReturnValue(
      makeReturn(
        eligible({
          pending_count: 5,
          pending_slots_remaining: 0,
          referrals: Array.from({ length: 5 }, (_, i) => ({
            id: `p${i}`,
            referee_email_masked: `p${i}***@x.com`,
            status: 'pending' as const,
            created_at: `2026-05-0${i + 1}T00:00:00Z`,
            claimed_at: null,
            expires_at: `2026-05-0${i + 8}T00:00:00Z`,
            credit_seconds_granted: 0,
          })),
        }),
      ),
    );
    renderPage();
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    const slots = screen.getByText('Slots open').closest('.refer-stat');
    expect(slots).not.toBeNull();
    expect(within(slots as HTMLElement).getByText('0')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    useReferralsMock.mockReturnValue(
      makeReturn(null, { loading: true }),
    );
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an error state', () => {
    useReferralsMock.mockReturnValue(
      makeReturn(null, { error: new Error('boom') }),
    );
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not load/i);
  });

  it('share buttons open prefilled Twitter, LinkedIn, mailto intents', () => {
    useReferralsMock.mockReturnValue(makeReturn(eligible()));
    renderPage();
    const twitter = screen.getByRole('link', { name: /twitter/i });
    expect(twitter.getAttribute('href')).toContain(
      'https://twitter.com/intent/tweet?text=',
    );
    expect(twitter.getAttribute('href')).toContain('7CAC6F37');
    const linkedin = screen.getByRole('link', { name: /linkedin/i });
    expect(linkedin.getAttribute('href')).toContain(
      'https://www.linkedin.com/sharing/share-offsite/?url=',
    );
    const email = screen.getByRole('link', { name: /^email$/i });
    expect(email.getAttribute('href')?.startsWith('mailto:')).toBe(true);
  });
});
