import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '@/hooks/useAccount';
import { useReferrals, type ReferralRow } from '@/hooks/useReferrals';
import { formatDuration } from '@/lib/duration';

const STATUS_ORDER: Record<ReferralRow['status'], number> = {
  pending: 0,
  claimed: 1,
  expired: 2,
};

const STATUS_LABEL: Record<ReferralRow['status'], string> = {
  pending: 'Pending',
  claimed: 'Claimed',
  expired: 'Expired',
};

function sortReferrals(rows: ReferralRow[]): ReferralRow[] {
  return [...rows].sort((a, b) => {
    const orderDelta = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (orderDelta !== 0) return orderDelta;
    // created_at desc within the same status bucket.
    return b.created_at.localeCompare(a.created_at);
  });
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: ReferralRow['status'] }): ReactNode {
  return (
    <span className="refer-status" data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function CopyPill({
  label,
  value,
  monoSize,
  ariaLabel,
}: {
  label: string;
  value: string;
  monoSize: 'lg' | 'sm';
  ariaLabel: string;
}): ReactNode {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard refusal is rare on https origins; we silently swallow.
    }
  }, [value]);
  return (
    <div className="refer-pill" data-size={monoSize}>
      <div className="refer-pill-label">{label}</div>
      <div className="refer-pill-row">
        <span className="refer-pill-value" data-size={monoSize}>{value}</span>
        <button
          type="button"
          className="refer-pill-copy"
          onClick={() => {
            void onCopy();
          }}
          aria-label={ariaLabel}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function ShareButtons({ link, code }: { link: string; code: string }): ReactNode {
  const tweetText = `I'm using The Fixer to keep frontier LLMs from forgetting. First paid plan with my code (${code}) bumps your next bill by 24 hours.`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${tweetText} ${link}`,
  )}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    link,
  )}`;
  const mailSubject = 'The Fixer';
  const mailBody = `I've been using The Fixer (LLM optimization layer). Sign up with my link and your first paid bill moves 24 hours: ${link}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
  return (
    <div className="refer-share">
      <a
        className="refer-share-btn"
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Twitter
      </a>
      <a
        className="refer-share-btn"
        href={linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        LinkedIn
      </a>
      <a className="refer-share-btn" href={mailUrl}>
        Email
      </a>
    </div>
  );
}

function ReferralsTable({ rows }: { rows: ReferralRow[] }): ReactNode {
  if (rows.length === 0) {
    return (
      <p className="refer-empty">
        No referrals yet. Share your code or link to start.
      </p>
    );
  }
  const sorted = sortReferrals(rows);
  return (
    <table className="refer-table">
      <thead>
        <tr>
          <th>Referee</th>
          <th>Status</th>
          <th>Joined</th>
          <th>Expires / Claimed</th>
          <th>Credit</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => {
          const dateRight =
            r.status === 'claimed'
              ? formatShortDate(r.claimed_at)
              : formatShortDate(r.expires_at);
          return (
            <tr key={r.id}>
              <td className="refer-row-email">{r.referee_email_masked}</td>
              <td><StatusBadge status={r.status} /></td>
              <td>{formatShortDate(r.created_at)}</td>
              <td>{dateRight}</td>
              <td>
                {r.credit_seconds_granted > 0
                  ? formatDuration(r.credit_seconds_granted)
                  : '-'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function Refer(): ReactNode {
  const { data, loading, error } = useReferrals();
  const { data: account } = useAccount();
  const isComped = account?.user.status === 'comped';

  const sortedRows = useMemo(
    () => (data ? sortReferrals(data.referrals) : []),
    [data],
  );

  if (loading) {
    return <div className="refer-loading">Loading...</div>;
  }
  if (error) {
    return (
      <div className="refer-error" role="alert">
        Could not load your referrals. {error.message}
      </div>
    );
  }
  if (!data) return null;

  if (!data.is_eligible_to_refer || !data.referral_code || !data.referral_link) {
    if (isComped) {
      return (
        <div className="refer-page">
          <div className="refer-locked">
            <p className="refer-locked-eyebrow">Referrals</p>
            <h1 className="refer-locked-title">Unlock with a paid charge.</h1>
            <p className="refer-locked-body">
              Comp access does not count toward referral eligibility. Subscribe
              to a paid plan when your comp is up and your referral code
              unlocks the moment your first charge clears.
            </p>
            <Link to="/app/billing" className="refer-locked-cta">
              Manage billing
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="refer-page">
        <div className="refer-locked">
          <p className="refer-locked-eyebrow">Referrals</p>
          <h1 className="refer-locked-title">Locked until your first paid charge.</h1>
          <p className="refer-locked-body">
            Make your first paid charge to unlock your referral code. After that,
            every friend who buys a plan moves your next bill 24 hours.
          </p>
          <Link to="/app/billing/upgrade" className="refer-locked-cta">
            Add payment method
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="refer-page">
      <header className="refer-hero">
        <p className="refer-hero-eyebrow">Referrals</p>
        <h1 className="refer-hero-title">Bring a friend to The Fixer.</h1>
        <p className="refer-hero-sub">
          When they buy a plan, your next bill moves 24 hours.
        </p>
      </header>

      <section className="refer-pills">
        <CopyPill
          label="Code"
          value={data.referral_code}
          monoSize="lg"
          ariaLabel="Copy referral code"
        />
        <CopyPill
          label="Link"
          value={data.referral_link}
          monoSize="sm"
          ariaLabel="Copy referral link"
        />
      </section>

      <ShareButtons link={data.referral_link} code={data.referral_code} />

      <section className="refer-stats">
        <div className="refer-stat">
          <div className="refer-stat-label">Pending</div>
          <div className="refer-stat-value">{data.pending_count} / 5</div>
        </div>
        <div className="refer-stat">
          <div className="refer-stat-label">Slots open</div>
          <div className="refer-stat-value">{data.pending_slots_remaining}</div>
        </div>
        <div className="refer-stat">
          <div className="refer-stat-label">Credit earned</div>
          <div className="refer-stat-value">
            {formatDuration(data.accumulated_credit_seconds)}
          </div>
        </div>
        <div className="refer-stat">
          <div className="refer-stat-label">Cap remaining</div>
          <div className="refer-stat-value">
            {formatDuration(data.lifetime_cap_remaining_seconds)}
          </div>
        </div>
      </section>

      <section className="refer-section">
        <div className="refer-section-label">
          Referrals ({sortedRows.length})
        </div>
        <ReferralsTable rows={data.referrals} />
      </section>
    </div>
  );
}
