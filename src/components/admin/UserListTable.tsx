import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { formatDuration, secondsUntil } from '@/lib/duration';
import type { AdminUserRow } from '@/hooks/useAdminUsers';

interface Props {
  rows: AdminUserRow[];
  loading: boolean;
  error: Error | null;
  onRowClick: (row: AdminUserRow) => void;
}

/**
 * Presentational table for the admin user list. The status column derives
 * its label from the row's `status` string, falling back to a neutral grey
 * badge for any value the UI hasn't seen before. Sorting and pagination are
 * owned by the parent.
 *
 * TODO(future): Add client-side column sort (email, plan, requests, last
 * active). For v1 the rows arrive pre-sorted by `created_at DESC` from the
 * backend, which is fine because the page is the primary triage surface.
 */
export function UserListTable({ rows, loading, error, onRowClick }: Props) {
  if (loading) {
    return <p style={paragraph}>Loading...</p>;
  }
  if (error) {
    return (
      <p style={{ ...paragraph, color: 'var(--color-danger)' }}>
        {error.message}
      </p>
    );
  }
  if (rows.length === 0) {
    return <p style={paragraph}>No users match these filters.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {[
              'Email',
              'Status',
              'Plan',
              'Comp / trial ends',
              'Requests / wk',
              'Last active',
              'Created',
            ].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <UserRow key={row.id} row={row} onClick={() => onRowClick(row)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface UserRowProps {
  row: AdminUserRow;
  onClick: () => void;
}

function UserRow({ row, onClick }: UserRowProps) {
  const [hovering, setHovering] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(row.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures (test envs, denied permissions)
    }
  }

  function onKey(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={`Open ${row.email}`}
      onClick={onClick}
      onKeyDown={onKey}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        cursor: 'pointer',
        background: hovering ? 'var(--color-bg-elev)' : 'transparent',
      }}
    >
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
            {row.email}
          </span>
          {hovering && (
            <button
              type="button"
              onClick={onCopy}
              aria-label={`Copy ${row.email}`}
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--color-link)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {copied ? 'copied' : 'copy'}
            </button>
          )}
        </div>
      </td>
      <td style={td}>
        <StatusBadge status={row.status} />
      </td>
      <td style={td}>{renderPlan(row)}</td>
      <td style={td}>{renderDeadline(row)}</td>
      <td style={td}>{row.requests_this_week ?? 0}</td>
      <td style={td}>{renderRelative(row.last_active_at)}</td>
      <td style={td}>{renderCreated(row.created_at)}</td>
    </tr>
  );
}

function renderPlan(row: AdminUserRow): string {
  if (!row.plan_id) return 'none';
  const sku = row.plan_id;
  if (sku.startsWith('workspace-')) {
    const seats = row.seat_count ?? 1;
    const short = sku.replace(/^workspace-/, 'ws-');
    return `${short} (${seats} seats)`;
  }
  if (sku.startsWith('solo-')) {
    return sku.replace(/^solo-/, 's-');
  }
  return sku;
}

function renderDeadline(row: AdminUserRow): string {
  // comp_until takes precedence over trial_ends_at: a comped user may have a
  // long-stale trial deadline that is no longer the meaningful clock.
  const target = row.comp_until ?? row.trial_ends_at;
  if (!target) return '';
  const secs = secondsUntil(target);
  if (secs === 0) return 'expired';
  return formatDuration(secs);
}

function renderRelative(iso: string | null): string {
  if (!iso) return 'never';
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) {
    const m = Math.floor(secs / 60);
    return `${m}m ago`;
  }
  if (secs < 86400) {
    const h = Math.floor(secs / 3600);
    return `${h}h ago`;
  }
  const d = Math.floor(secs / 86400);
  return `${d}d ago`;
}

function renderCreated(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '';
  }
}

interface BadgeTone {
  color: string;
  bg: string;
}

function StatusBadge({ status }: { status: string }) {
  const tone = toneFor(status);
  const label = status.replace(/_/g, ' ');
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: tone.color,
        background: tone.bg,
        padding: '2px 8px',
        borderRadius: 2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function toneFor(status: string): BadgeTone {
  switch (status) {
    case 'trial':
      return { color: 'var(--color-link)', bg: 'rgba(122, 168, 232, 0.12)' };
    case 'active':
      return { color: 'var(--color-success)', bg: 'rgba(107, 184, 146, 0.12)' };
    case 'comped':
      return {
        color: 'var(--color-accent-copper-bright)',
        bg: 'rgba(224, 149, 75, 0.12)',
      };
    case 'trial_expired':
    case 'expired':
      return {
        color: 'var(--color-text-dim)',
        bg: 'rgba(144, 153, 176, 0.12)',
      };
    case 'cancelled':
      return { color: 'var(--color-danger)', bg: 'rgba(226, 107, 107, 0.12)' };
    default:
      return {
        color: 'var(--color-text-dim)',
        bg: 'rgba(144, 153, 176, 0.12)',
      };
  }
}

const th: CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  padding: '14px 18px',
  borderBottom: '1px solid var(--color-border)',
};
const td: CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
  verticalAlign: 'top',
};
const paragraph: CSSProperties = {
  padding: 22,
  color: 'var(--color-text-dim)',
  margin: 0,
};
