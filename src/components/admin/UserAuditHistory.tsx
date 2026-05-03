import { type CSSProperties, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  useAdminAuditLog,
  type AuditLogRow,
} from '@/hooks/useAdminAuditLog';

interface Props {
  userId: string;
  /**
   * Bumping this from the parent causes a re-fetch. Use after a successful
   * mutation so the new audit row shows up without leaving the page.
   */
  refreshTick?: number;
}

const PAGE_SIZE = 50;

/**
 * Audit history table for the UserDetail History tab.
 *
 * Calls `GET /v1/admin/audit-log?target_type=user&target_id={userId}&limit=50`
 * and renders one row per audit entry. Each row is expandable: clicking the
 * row toggles a JSON payload showing `before` / `after` + reason.
 */
export function UserAuditHistory({ userId, refreshTick = 0 }: Props) {
  const { rows, total, loading, error, refresh } = useAdminAuditLog({
    target_type: 'user',
    target_id: userId,
    limit: PAGE_SIZE,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Bump the tick to force a refresh from parent.
  const [lastTick, setLastTick] = useState<number>(refreshTick);
  if (refreshTick !== lastTick) {
    setLastTick(refreshTick);
    void refresh();
  }

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) {
    return (
      <Card>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }}>
          Loading audit log...
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p
          role="alert"
          style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}
        >
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          style={retryBtnStyle}
        >
          retry
        </button>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }}>
          No audit entries for this user yet.
        </p>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0 }}>
      <header
        style={{
          padding: '14px 22px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
          }}
        >
          Audit history ({total} entr{total === 1 ? 'y' : 'ies'})
        </p>
        <button type="button" onClick={() => void refresh()} style={refreshBtnStyle}>
          refresh
        </button>
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['When', 'Action', 'Actor', 'Reason'].map((h) => (
              <th key={h} style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <AuditRow
              key={row.id}
              row={row}
              expanded={expanded[row.id] === true}
              onToggle={() => toggle(row.id)}
            />
          ))}
        </tbody>
      </table>
    </Card>
  );
}

interface RowProps {
  row: AuditLogRow;
  expanded: boolean;
  onToggle: () => void;
}

function AuditRow({ row, expanded, onToggle }: RowProps) {
  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={onToggle}>
        <td style={tdStyle}>
          <time dateTime={row.created_at}>
            {new Date(row.created_at).toLocaleString()}
          </time>
        </td>
        <td style={tdStyle}>
          <code style={codeStyle}>{row.action}</code>
        </td>
        <td style={tdStyle}>{row.actor_email ?? 'system'}</td>
        <td style={{ ...tdStyle, color: 'var(--color-text-dim)' }}>
          {row.reason ?? ''}
        </td>
      </tr>
      {expanded && (
        <tr data-testid={`audit-row-${row.id}-expanded`}>
          <td colSpan={4} style={expandedStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <p style={diffHeaderStyle}>Before</p>
                <pre style={preStyle}>{prettyJson(row.before)}</pre>
              </div>
              <div>
                <p style={diffHeaderStyle}>After</p>
                <pre style={preStyle}>{prettyJson(row.after)}</pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function prettyJson(value: unknown): string {
  if (value === null || value === undefined) return '(none)';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  padding: '14px 18px',
  borderBottom: '1px solid var(--color-border)',
};

const tdStyle: CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
  verticalAlign: 'top',
};

const codeStyle: CSSProperties = {
  fontSize: 12,
  background: 'var(--color-bg)',
  padding: '2px 6px',
  borderRadius: 3,
};

const expandedStyle: CSSProperties = {
  padding: 16,
  background: 'var(--color-bg)',
  borderBottom: '1px solid var(--color-border)',
};

const diffHeaderStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  margin: '0 0 6px',
};

const preStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  color: 'var(--color-text)',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  padding: 10,
  maxHeight: 240,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const refreshBtnStyle: CSSProperties = {
  background: 'transparent',
  border: 0,
  color: 'var(--color-link)',
  cursor: 'pointer',
  fontSize: 11,
  padding: 0,
  letterSpacing: '0.04em',
};

const retryBtnStyle: CSSProperties = {
  marginTop: 8,
  background: 'transparent',
  border: 0,
  color: 'var(--color-link)',
  cursor: 'pointer',
  fontSize: 11,
  padding: 0,
};
