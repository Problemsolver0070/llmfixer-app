import { Card } from '@/components/ui/Card';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 32, fontWeight: 300, margin: '8px 0 0' }}>{value}</p>
    </Card>
  );
}

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function Metrics() {
  const { data, loading, error } = useAdminMetrics();
  if (error) {
    return (
      <p role="alert" style={{ color: 'var(--color-danger)' }}>
        Couldn&apos;t load metrics
      </p>
    );
  }
  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      <MetricCard label="Total users" value={data.total_users} />
      <MetricCard label="Verified" value={data.verified_users} />
      <MetricCard label="Active subs" value={data.active_subs} />
      <MetricCard label="MRR" value={formatUsd(data.mrr_cents)} />
      <MetricCard label="Signups (7d)" value={data.signups_7d} />
      <MetricCard label="Cancellations (7d)" value={data.cancellations_7d} />
    </div>
  );
}
