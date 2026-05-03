import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserMe } from '@/hooks/useUserMe';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlans } from '@/hooks/usePlans';
import { useAccount } from '@/hooks/useAccount';
import { formatDuration, minutesUntil } from '@/lib/duration';

/**
 * TrialBanner (Round 5, T5.3).
 *
 * Renders inline at the top of every authenticated page (mounted inside
 * AppShell, immediately under the nav). Decides what to show by reading
 * `useUserMe`:
 *
 * - Active subscription: render nothing.
 * - In demo window (12-hour referral demo): warn that the demo is ending
 *   and prompt the caller to add a payment method.
 * - In trial window (24-hour paid trial): warn that a charge is imminent
 *   and surface the renewal date and amount when known.
 * - Otherwise: prompt the caller to add a payment method. The TrialGate
 *   handles the protected-route case; this branch is what surfaces on
 *   /app/billing where the gate does not apply.
 *
 * The countdown re-renders every minute via a setInterval tick. When the
 * tick crosses zero we call `useUserMe.refresh()` once so the new user
 * state (trial expired, demo expired, subscription active) replaces the
 * banner without a full page refresh.
 *
 * The visual is the existing `.trial-banner` token from globals.css
 * (copper-tinted border, mono body, Fraunces italic title). We chose
 * "calm not alarming" per the Round 5 spec: no exclamation points, no
 * red, no shake/blink animations.
 */
export function TrialBanner() {
  const { data, hasActiveSubscription, inDemoWindow, inTrialWindow, refresh } = useUserMe();
  const { subscription } = useSubscription();
  const { plans } = usePlans();
  const { data: account } = useAccount();

  // Tick the countdown every minute. We do not need precise (sub-minute)
  // resolution because the copy reads "in X hours" or "in X minutes" only.
  const [, setTick] = useState(0);

  // Decide the relevant deadline up-front so the effect dependency stays
  // primitive (string | null) and we do not re-run the timer on every
  // unrelated user-me refresh.
  const deadline = pickDeadline(data, hasActiveSubscription, inDemoWindow, inTrialWindow);

  useEffect(() => {
    if (!deadline) return;
    let cancelled = false;
    const id = setInterval(() => {
      if (cancelled) return;
      const remaining = minutesUntil(deadline);
      setTick((n) => n + 1);
      if (remaining <= 0) {
        // Deadline crossed: refetch /v1/users/me so the next render sees
        // the new flags (in_*_window flips false; has_active_subscription
        // may have flipped true if the trial converted).
        void refresh();
      }
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [deadline, refresh]);

  if (hasActiveSubscription) return null;
  if (!data) return null; // signed out or pre-fetch; nothing useful to show

  if (inDemoWindow && data.demo_expires_at) {
    return (
      <BannerFrame
        title="Demo ends in"
        valueText={formatDuration(minutesUntil(data.demo_expires_at) * 60)}
        body="Add a payment method to start your 24-hour trial."
        cta={{ label: 'Add payment method', to: '/app/billing/upgrade' }}
        ariaLabel="Referral demo countdown"
      />
    );
  }

  if (inTrialWindow && data.trial_expires_at) {
    const renewalDate = formatRenewalDate(
      subscription?.next_billing_time ?? data.trial_expires_at,
    );
    const amount = resolvePlanAmount(account?.user.plan_id ?? null, plans);
    const body = amount
      ? `You will be charged ${amount} on ${renewalDate} unless you cancel.`
      : `You will be charged on ${renewalDate} unless you cancel.`;
    return (
      <BannerFrame
        title="Trial ends in"
        valueText={formatDuration(minutesUntil(data.trial_expires_at) * 60)}
        body={body}
        ariaLabel="Trial countdown"
      />
    );
  }

  // No demo, no trial, no subscription. The TrialGate already covers the
  // protected routes; this branch is informative on /app/billing where the
  // gate is intentionally not mounted.
  return (
    <BannerFrame
      title="Access paused"
      body="Add a payment method to continue."
      cta={{ label: 'Add payment method', to: '/app/billing/upgrade' }}
      ariaLabel="Add payment method"
    />
  );
}

interface BannerFrameProps {
  title: string;
  valueText?: string;
  body: string;
  cta?: { label: string; to: string };
  ariaLabel: string;
}

function BannerFrame({ title, valueText, body, cta, ariaLabel }: BannerFrameProps) {
  return (
    <div className="trial-banner" role="status" aria-label={ariaLabel}>
      <div className="trial-banner-icon" aria-hidden="true">
        {hourglassGlyph}
      </div>
      <div className="trial-banner-copy">
        <div className="trial-banner-title">
          {title}
          {valueText ? <span className="trial-banner-value"> {valueText}</span> : null}
        </div>
        <div className="trial-banner-sub">{body}</div>
      </div>
      {cta ? (
        <Link to={cta.to} className="trial-banner-cta">
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

const hourglassGlyph = '⧗'; // BLACK HOURGLASS

interface UserMeForDeadline {
  demo_expires_at: string | null;
  trial_expires_at: string | null;
}

function pickDeadline(
  data: UserMeForDeadline | null,
  hasActiveSubscription: boolean,
  inDemoWindow: boolean,
  inTrialWindow: boolean,
): string | null {
  if (!data || hasActiveSubscription) return null;
  if (inDemoWindow && data.demo_expires_at) return data.demo_expires_at;
  if (inTrialWindow && data.trial_expires_at) return data.trial_expires_at;
  return null;
}

function formatRenewalDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'your renewal date';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface MinimalPlan {
  sku: string;
  base_price_cents: number;
  display_price?: string;
}

function resolvePlanAmount(planId: string | null, plans: MinimalPlan[]): string | null {
  if (!planId) return null;
  const match = plans.find((p) => p.sku === planId);
  if (!match) return null;
  if (match.display_price) return match.display_price;
  // Fallback when display_price is absent: integer dollars where exact,
  // two decimals otherwise.
  const cents = match.base_price_cents;
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) return `$${dollars}`;
  return `$${dollars.toFixed(2)}`;
}

export default TrialBanner;
