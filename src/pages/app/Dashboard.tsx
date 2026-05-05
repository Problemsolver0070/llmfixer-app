import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { TheFixerAiCard } from '@/components/dashboard/TheFixerAiCard';
import { useAccount } from '@/hooks/useAccount';
import { formatDateTime } from '@/lib/format';

export default function Dashboard() {
  const { data, loading, hasActiveSubscription } = useAccount();
  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;

  const u = data.user;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.01em', margin: 0 }}>
        Dashboard
      </h1>
      <TheFixerAiCard />
      <Card>
        <AccountStateCard
          hasActiveSubscription={hasActiveSubscription}
          compUntil={u.comp_until}
          cancelsAt={u.cancels_at}
          paypalSubId={u.paypal_sub_id}
        />
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

function AccountStateCard({
  hasActiveSubscription,
  compUntil,
  cancelsAt,
  paypalSubId,
}: {
  hasActiveSubscription: boolean;
  compUntil: string | null;
  cancelsAt: string | null;
  paypalSubId: string | null;
}) {
  if (!hasActiveSubscription) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          No active subscription
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Subscribe to The Fixer to start using your keys.
        </p>
        <Link to="/app/billing/upgrade" style={{ color: 'var(--color-accent-bright)' }}>
          Subscribe
        </Link>
      </div>
    );
  }

  if (cancelsAt) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Cancelling
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Subscription ends {formatDateTime(cancelsAt)}. After that your keys stop working.
        </p>
      </div>
    );
  }

  // Active: show comp_until date for comp users, generic active for PayPal subscribers.
  if (!paypalSubId && compUntil) {
    return (
      <div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-success)', textTransform: 'uppercase', margin: 0 }}>
          Active
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Paid through {formatDateTime(compUntil)}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-success)', textTransform: 'uppercase', margin: 0 }}>
        Active
      </p>
      <p style={{ fontSize: 16, margin: '8px 0' }}>
        Manage on PayPal for invoices.
      </p>
    </div>
  );
}
