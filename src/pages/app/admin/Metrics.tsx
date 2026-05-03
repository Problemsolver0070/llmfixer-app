import type { CSSProperties } from 'react';
import { Card } from '@/components/ui/Card';
import { FunnelChart } from '@/components/admin/FunnelChart';
import { StatCard } from '@/components/admin/StatCard';
import { TopBurnersTable } from '@/components/admin/TopBurnersTable';
import { useAdminMetrics, type MetricsData } from '@/hooks/useAdminMetrics';
import {
  formatCents,
  formatDateTime,
  formatNumber,
  formatPct,
} from '@/lib/format';

/**
 * Admin metrics dashboard.
 *
 * Layout:
 *   1. Four stat cards (MRR, active subs, churn, engagement).
 *   2. Conversion funnel (signups, trial-started, first-paid).
 *   3. Top 10 token burners over the trailing week.
 *
 * Polling is owned by `useAdminMetrics` (60s tick). The user can also force
 * a refresh via the header button.
 */
export default function Metrics() {
  const { data, loading, error, refresh } = useAdminMetrics();

  if (error && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p role="alert" style={{ color: 'var(--color-danger)' }}>
          Couldn&apos;t load metrics. {error.message}
        </p>
        <button type="button" onClick={() => void refresh()} style={refreshBtn}>
          retry
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;
  }

  // We are guaranteed `data` is set here because of the loading guard above.
  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Header data={data} onRefresh={() => void refresh()} loading={loading} />
      <StatGrid data={data} />
      <SectionCard title="Conversion (last 30 days)">
        <FunnelChart
          stages={[
            { label: 'Signups (30d)', count: data.funnel.signups_30d },
            { label: 'Trial started (30d)', count: data.funnel.trial_started_30d },
            { label: 'First paid charge (30d)', count: data.funnel.first_paid_charge_30d },
          ]}
        />
      </SectionCard>
      <SectionCard title="Top burners (this week)" padded={false}>
        <TopBurnersTable rows={data.top_burners} limit={10} />
      </SectionCard>
      <Footer computedAt={data.computed_at} />
    </div>
  );
}

interface HeaderProps {
  data: MetricsData;
  onRefresh: () => void;
  loading: boolean;
}

function Header({ data, onRefresh, loading }: HeaderProps) {
  return (
    <div style={headerStyle}>
      <span style={headerMeta}>
        Computed {formatDateTime(data.computed_at)}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh metrics"
        style={{ ...refreshBtn, opacity: loading ? 0.6 : 1 }}
      >
        {loading ? 'refreshing...' : 'refresh'}
      </button>
    </div>
  );
}

function StatGrid({ data }: { data: MetricsData }) {
  const { revenue, engagement } = data;
  return (
    <div style={statGridStyle}>
      <StatCard
        label="MRR"
        value={formatCents(revenue.mrr_cents)}
        subtext={`ARR: ${formatCents(revenue.arr_cents)}`}
        accent="copper"
      />
      <StatCard
        label="Active subscriptions"
        value={formatNumber(revenue.active_subs)}
        subtext={`${formatNumber(revenue.trial_users)} trial / ${formatNumber(revenue.comped_users)} comped`}
      />
      <StatCard
        label="Churn (30d)"
        value={formatPct(revenue.churn_30d_pct)}
        subtext={revenue.churn_30d_pct > 5 ? 'over target' : 'within target'}
        accent={revenue.churn_30d_pct > 5 ? 'danger' : 'success'}
      />
      <StatCard
        label="DAU / WAU / MAU"
        value={
          <span>
            {formatNumber(engagement.dau)}
            <span style={engagementSep}> / </span>
            {formatNumber(engagement.wau)}
            <span style={engagementSep}> / </span>
            {formatNumber(engagement.mau)}
          </span>
        }
        subtext={
          <Sparkline values={[engagement.dau, engagement.wau, engagement.mau]} />
        }
        accent="link"
      />
    </div>
  );
}

interface SectionCardProps {
  title: string;
  padded?: boolean;
  children: React.ReactNode;
}

function SectionCard({ title, padded = true, children }: SectionCardProps) {
  return (
    <Card style={{ padding: 0 }}>
      <div style={sectionHeader}>{title}</div>
      <div style={padded ? { padding: 22 } : undefined}>{children}</div>
    </Card>
  );
}

function Footer({ computedAt }: { computedAt: string }) {
  return (
    <p style={footerStyle}>
      Computed at {formatDateTime(computedAt)}, refreshes every 60s.
    </p>
  );
}

interface SparklineProps {
  values: number[];
}

/**
 * Tiny inline sparkline. Pure SVG, no library. Values map to a 60x16
 * area. Used only for the engagement card; not a general primitive.
 */
function Sparkline({ values }: SparklineProps) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const width = 60;
  const height = 16;
  const step = values.length === 1 ? 0 : width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      role="img"
      aria-label="Engagement sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ verticalAlign: 'middle' }}
    >
      <polyline
        fill="none"
        stroke="var(--color-link)"
        strokeWidth={1.4}
        points={points}
      />
    </svg>
  );
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const headerMeta: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-dim)',
};

const refreshBtn: CSSProperties = {
  fontSize: 11,
  padding: '6px 14px',
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-link)',
  cursor: 'pointer',
};

const statGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
};

const sectionHeader: CSSProperties = {
  padding: '14px 22px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 11,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
};

const footerStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-dim)',
  margin: 0,
};

const engagementSep: CSSProperties = {
  color: 'var(--color-text-dim)',
};
