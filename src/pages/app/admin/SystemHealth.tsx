import { Card } from '@/components/ui/Card';
import {
  useAdminSystemCrons,
  useAdminSystemEmails,
  useAdminSystemErrorRate,
  useAdminSystemWebhooks,
  type CronStatusItem,
  type EmailLogItem,
  type EmailStatus,
  type WebhookItem,
} from '@/hooks/useAdminSystem';

export default function SystemHealth() {
  const errorRate = useAdminSystemErrorRate();
  const crons = useAdminSystemCrons();
  const webhooks = useAdminSystemWebhooks();
  const emails = useAdminSystemEmails();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ErrorRateCard
        loading={errorRate.loading}
        error={errorRate.error}
        data={errorRate.data}
      />

      <SectionCard
        title="Cron status (last 24h)"
        loading={crons.loading}
        error={crons.error}
        empty={!crons.data || crons.data.items.length === 0}
        emptyMessage="No cron data."
      >
        <table style={tableStyle}>
          <thead>
            <tr>
              {['Name', 'Last run', 'Status', '24h', 'Last log'].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crons.data?.items.map((item) => (
              <CronRow key={item.name} item={item} />
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard
        title="Recent webhooks"
        loading={webhooks.loading}
        error={webhooks.error}
        empty={!webhooks.data || webhooks.data.items.length === 0}
        emptyMessage="No webhook events captured."
      >
        <table style={tableStyle}>
          <thead>
            <tr>
              {['When', 'Event', 'Action', 'Target user', 'Summary'].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {webhooks.data?.items.map((item) => (
              <WebhookRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard
        title="Recent emails"
        loading={emails.loading}
        error={emails.error}
        empty={!emails.data || emails.data.items.length === 0}
        emptyMessage="No email attempts captured."
      >
        <table style={tableStyle}>
          <thead>
            <tr>
              {['When', 'To', 'Subject', 'Status', 'Detail'].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emails.data?.items.map((item) => (
              <EmailRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top stat: error rate
// ---------------------------------------------------------------------------

function ErrorRateCard({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error: Error | null;
  data: import('@/hooks/useAdminSystem').ErrorRateResponse | null;
}) {
  const tone = data && data.error_rate_pct >= 5 ? 'var(--color-danger)' : 'var(--color-text)';
  return (
    <Card>
      <p style={subtleHeader}>Error rate (last 24h)</p>
      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>
      ) : error ? (
        <p role="alert" style={{ color: 'var(--color-danger)' }}>
          {error.message || 'Could not load error rate'}
        </p>
      ) : data ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 18,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 36, fontWeight: 300, color: tone }}>
            {data.error_rate_pct.toFixed(1)}%
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
            {data.error_count_24h} errors / {data.total_actions_24h} total
            audit actions over the last {data.window_hours}h
          </span>
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Cron row
// ---------------------------------------------------------------------------

function CronRow({ item }: { item: CronStatusItem }) {
  return (
    <tr>
      <td style={td}>
        <code style={mono}>{item.name}</code>
      </td>
      <td style={td}>
        <span style={mono}>{formatDateTime(item.last_run_at)}</span>
      </td>
      <td style={td}>
        <StatusBadge status={item.last_status} />
      </td>
      <td style={td}>
        <span style={{ color: 'var(--color-text)' }}>
          {item.success_count_24h} ok
        </span>
        {item.failed_count_24h > 0 && (
          <>
            <span style={{ color: 'var(--color-text-dim)' }}> / </span>
            <span style={{ color: 'var(--color-danger)' }}>
              {item.failed_count_24h} failed
            </span>
          </>
        )}
      </td>
      <td style={td}>
        <span style={{ fontSize: 12 }}>{item.last_log_line}</span>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: CronStatusItem['last_status'] }) {
  let label = '-';
  let color = 'var(--color-text-dim)';
  if (status === 'success') {
    label = 'success';
    color = 'var(--color-success, #6bb892)';
  } else if (status === 'failed') {
    label = 'failed';
    color = 'var(--color-danger)';
  } else if (status === 'running') {
    label = 'running';
    color = 'var(--color-link)';
  }
  return (
    <span
      style={{
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '2px 8px',
        border: `1px solid ${color}`,
        color,
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Webhook row
// ---------------------------------------------------------------------------

function WebhookRow({ item }: { item: WebhookItem }) {
  return (
    <tr>
      <td style={td}>
        <span style={mono}>{formatDateTime(item.created_at)}</span>
      </td>
      <td style={td}>
        <span style={{ fontSize: 12 }}>{item.event_type ?? '-'}</span>
      </td>
      <td style={td}>
        <code style={mono}>{item.action}</code>
      </td>
      <td style={td}>
        <span style={mono}>{item.target_user_id ?? '-'}</span>
      </td>
      <td style={td}>
        <span style={{ fontSize: 12 }}>{item.summary ?? ''}</span>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Email row
// ---------------------------------------------------------------------------

function EmailRow({ item }: { item: EmailLogItem }) {
  return (
    <tr>
      <td style={td}>
        <span style={mono}>{formatDateTime(item.sent_at)}</span>
      </td>
      <td style={td}>
        <span style={{ fontSize: 12 }}>{item.to_email}</span>
      </td>
      <td style={td}>
        <span style={{ fontSize: 12 }}>{item.subject}</span>
      </td>
      <td style={td}>
        <EmailStatusBadge status={item.status} />
      </td>
      <td style={td}>
        <span
          style={{
            fontSize: 11,
            color:
              item.status === 'failed'
                ? 'var(--color-danger)'
                : 'var(--color-text-dim)',
          }}
        >
          {item.error_message ?? item.resend_id ?? ''}
        </span>
      </td>
    </tr>
  );
}

function EmailStatusBadge({ status }: { status: EmailStatus }) {
  const color =
    status === 'sent'
      ? 'var(--color-success, #6bb892)'
      : status === 'failed'
        ? 'var(--color-danger)'
        : 'var(--color-text-dim)';
  return (
    <span
      style={{
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '2px 8px',
        border: `1px solid ${color}`,
        color,
      }}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section card scaffold
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  loading,
  error,
  empty,
  emptyMessage,
  children,
}: {
  title: string;
  loading: boolean;
  error: Error | null;
  empty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={{ padding: 0 }}>
      <div
        style={{
          padding: '14px 22px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 style={subtleHeader}>{title}</h2>
      </div>
      {loading ? (
        <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>Loading...</p>
      ) : error ? (
        <p role="alert" style={{ padding: 22, color: 'var(--color-danger)' }}>
          {error.message || 'Could not load.'}
        </p>
      ) : empty ? (
        <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Style tokens (kept inline so the page stays a single file).
// ---------------------------------------------------------------------------

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

const subtleHeader: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-text-dim)',
  margin: 0,
  fontWeight: 400,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  padding: '14px 18px',
  borderBottom: '1px solid var(--color-border)',
};

const td: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
  verticalAlign: 'top',
};

const mono: React.CSSProperties = {
  fontSize: 12,
  fontFamily: 'var(--font-mono, monospace)',
};
