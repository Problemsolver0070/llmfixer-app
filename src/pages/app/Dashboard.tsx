import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useAccount } from '@/hooks/useAccount';
import { formatDateTime, hoursUntil } from '@/lib/format';

export default function Dashboard() {
  const { data, loading } = useAccount();
  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;

  const u = data.user;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.01em', margin: 0 }}>
        Dashboard
      </h1>
      {u.status === 'trial' && !u.paypal_sub_id ? (
        <div className="trial-banner">
          <div>
            <div className="trial-banner-title">Start your subscription</div>
            <div className="trial-banner-sub">
              You are on a free trial. Pick a plan to keep your access after the trial ends.
            </div>
          </div>
          <Link to="/pricing" className="trial-banner-cta">See plans →</Link>
        </div>
      ) : null}
      <Card>
        <AccountStateCard user={u} />
      </Card>
      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          This week
        </p>
        <p style={{ fontSize: 32, margin: '8px 0 0', fontWeight: 300 }}>{data.requests_this_week}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          requests
        </p>
      </Card>
      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Quick actions
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/app/setup">Set up your first integration</Link>
          <Link to="/app/keys">Manage keys</Link>
          <Link to="/app/setup">Documentation</Link>
        </div>
      </Card>
    </div>
  );
}

function AccountStateCard({ user }: { user: { status: string; trial_ends_at: string | null; cancels_at: string | null } }) {
  if (user.status === 'trial' && user.trial_ends_at) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Trial active
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Ends {formatDateTime(user.trial_ends_at)}, {hoursUntil(user.trial_ends_at)} hours remaining
        </p>
        <Link to="/app/billing" style={{ color: 'var(--color-accent-bright)' }}>
          Subscribe
        </Link>
      </div>
    );
  }
  if (user.status === 'trial_expired' || user.status === 'expired') {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-danger)', textTransform: 'uppercase', margin: 0 }}>
          Paused
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Your trial ended. Subscribe to keep using your keys.
        </p>
        <Link to="/app/billing" style={{ color: 'var(--color-accent-bright)' }}>
          Subscribe
        </Link>
      </div>
    );
  }
  if (user.status === 'active' && user.cancels_at) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Cancelling
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Subscription ends {formatDateTime(user.cancels_at)}. After that your keys stop working.
        </p>
      </div>
    );
  }
  if (user.status === 'active') {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-success)', textTransform: 'uppercase', margin: 0 }}>
          Active
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          $19.99 / week. Manage on PayPal for invoices.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
        Status
      </p>
      <p style={{ fontSize: 16, margin: '8px 0' }}>{user.status}</p>
    </div>
  );
}
