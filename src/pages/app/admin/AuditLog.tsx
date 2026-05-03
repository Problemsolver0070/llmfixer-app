import { type FormEvent, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  useAdminAuditLog,
  type AuditLogRow,
  type AuditLogFilters,
} from '@/hooks/useAdminAuditLog';

const PAGE_SIZE = 50;

const TARGET_TYPES = [
  '',
  'user',
  'code',
  'subscription',
  'workspace',
  'agent',
  'discount_credit',
] as const;

interface FilterFormState {
  targetType: string;
  targetId: string;
  action: string;
  adminUserId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const EMPTY_FORM: FilterFormState = {
  targetType: '',
  targetId: '',
  action: '',
  adminUserId: '',
  dateFrom: '',
  dateTo: '',
  search: '',
};

export default function AuditLog() {
  const [form, setForm] = useState<FilterFormState>(EMPTY_FORM);
  const [applied, setApplied] = useState<FilterFormState>(EMPTY_FORM);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);

  // Debounce only the free-text search box; everything else applies on submit.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setApplied((prev) => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput };
      });
      setPage(0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const filters: AuditLogFilters = {
    target_type: applied.targetType || undefined,
    target_id: applied.targetId || undefined,
    action: applied.action || undefined,
    admin_user_id: applied.adminUserId || undefined,
    date_from: applied.dateFrom ? toIsoStart(applied.dateFrom) : undefined,
    date_to: applied.dateTo ? toIsoEnd(applied.dateTo) : undefined,
    search: applied.search || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { rows, total, loading, error } = useAdminAuditLog(filters);

  function onApply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApplied({ ...form, search: searchInput });
    setPage(0);
  }

  function onReset() {
    setForm(EMPTY_FORM);
    setSearchInput('');
    setApplied(EMPTY_FORM);
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 280px) 1fr',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <Card>
        <h2
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
            margin: '0 0 14px',
            fontWeight: 400,
          }}
        >
          Filters
        </h2>
        <form
          onSubmit={onApply}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <Field label="Target type">
            <select
              value={form.targetType}
              onChange={(e) =>
                setForm({ ...form, targetType: e.currentTarget.value })
              }
              style={inputStyle}
            >
              {TARGET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t || '(any)'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target id">
            <input
              type="text"
              value={form.targetId}
              onChange={(e) =>
                setForm({ ...form, targetId: e.currentTarget.value })
              }
              placeholder="uuid or code id"
              style={inputStyle}
            />
          </Field>
          <Field label="Action (prefix ok)">
            <input
              type="text"
              value={form.action}
              onChange={(e) =>
                setForm({ ...form, action: e.currentTarget.value })
              }
              placeholder="user.* or user.comp"
              style={inputStyle}
            />
          </Field>
          <Field
            label="Admin user id"
            hint="Free-text uuid for v1. TODO: autocomplete from /v1/admin/users"
          >
            <input
              type="text"
              value={form.adminUserId}
              onChange={(e) =>
                setForm({ ...form, adminUserId: e.currentTarget.value })
              }
              placeholder="actor uuid"
              style={inputStyle}
            />
          </Field>
          <Field label="Date from">
            <input
              type="date"
              value={form.dateFrom}
              onChange={(e) =>
                setForm({ ...form, dateFrom: e.currentTarget.value })
              }
              style={inputStyle}
            />
          </Field>
          <Field label="Date to">
            <input
              type="date"
              value={form.dateTo}
              onChange={(e) =>
                setForm({ ...form, dateTo: e.currentTarget.value })
              }
              style={inputStyle}
            />
          </Field>
          <Field label="Search reason">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.currentTarget.value)}
              placeholder="free text on metadata.reason"
              style={inputStyle}
            />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="submit" style={primaryBtn}>
              Apply filters
            </button>
            <button type="button" onClick={onReset} style={ghostBtn}>
              Reset
            </button>
          </div>
        </form>
      </Card>

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
          <h2
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-dim)',
              margin: 0,
              fontWeight: 400,
            }}
          >
            Audit log
          </h2>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {total === 0
              ? 'No results.'
              : `Showing ${rangeStart} to ${rangeEnd} of ${total}.`}
          </span>
        </div>

        {loading ? (
          <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>Loading...</p>
        ) : error ? (
          <p style={{ padding: 22, color: 'var(--color-danger)' }}>
            {error.message}
          </p>
        ) : rows.length === 0 ? (
          <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>
            No audit log entries match these filters.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['When', 'Action', 'Actor', 'Target', 'Reason', ''].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <AuditRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 22px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            Page {page + 1} of {totalPages}.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={paginationBtn(page === 0)}
            >
              prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= total}
              style={paginationBtn((page + 1) * PAGE_SIZE >= total)}
            >
              next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AuditRow({ row }: { row: AuditLogRow }) {
  const [expanded, setExpanded] = useState(false);
  const meta = row.metadata ?? {};
  const target =
    meta.target_type || meta.target_id
      ? `${meta.target_type ?? '?'}/${meta.target_id ?? '?'}`
      : row.target_user_id
        ? `user/${row.target_user_id}`
        : '-';
  const actor = row.actor_id ?? 'system';
  const reason = typeof meta.reason === 'string' ? meta.reason : '';
  const hasBefore = meta.before !== undefined && meta.before !== null;
  const hasAfter = meta.after !== undefined && meta.after !== null;
  const hasDetail = hasBefore || hasAfter;

  return (
    <>
      <tr>
        <td style={td}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)' }}>
            {formatDateTime(row.created_at)}
          </span>
        </td>
        <td style={td}>
          <code
            style={{
              fontSize: 11,
              padding: '2px 6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-accent-bright, var(--color-link))',
              letterSpacing: '0.04em',
            }}
          >
            {row.action}
          </code>
        </td>
        <td style={td}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)' }}>
            {actor}
          </span>
        </td>
        <td style={td}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)' }}>
            {target}
          </span>
        </td>
        <td style={td}>
          <span title={reason} style={{ fontSize: 12 }}>
            {truncate(reason, 60)}
          </span>
        </td>
        <td style={{ ...td, textAlign: 'right' }}>
          {hasDetail ? (
            <button
              type="button"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--color-link)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {expanded ? 'collapse' : 'expand'}
            </button>
          ) : null}
        </td>
      </tr>
      {expanded && hasDetail && (
        <tr>
          <td colSpan={6} style={{ ...td, background: 'var(--color-bg)' }}>
            <DiffPanel
              before={hasBefore ? meta.before : undefined}
              after={hasAfter ? meta.after : undefined}
              ipAddress={typeof meta.ip_address === 'string' ? meta.ip_address : null}
              userAgent={typeof meta.user_agent === 'string' ? meta.user_agent : null}
              paypalEventId={row.paypal_event_id}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function DiffPanel({
  before,
  after,
  ipAddress,
  userAgent,
  paypalEventId,
}: {
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  paypalEventId: string | null;
}) {
  const both = before !== undefined && after !== undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: both ? '1fr 1fr' : '1fr',
          gap: 12,
        }}
      >
        {before !== undefined && (
          <JsonBlock
            title="Before"
            value={before}
            tone="var(--color-danger, #e26b6b)"
          />
        )}
        {after !== undefined && (
          <JsonBlock
            title="After"
            value={after}
            tone="var(--color-success, #6bb892)"
          />
        )}
      </div>
      {(ipAddress || userAgent || paypalEventId) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            fontSize: 11,
            color: 'var(--color-text-dim)',
          }}
        >
          {ipAddress && <span>ip: <code>{ipAddress}</code></span>}
          {userAgent && (
            <span>
              user-agent: <code>{truncate(userAgent, 80)}</code>
            </span>
          )}
          {paypalEventId && (
            <span>
              paypal_event_id: <code>{paypalEventId}</code>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function JsonBlock({
  title,
  value,
  tone,
}: {
  title: string;
  value: unknown;
  tone: string;
}) {
  let body: string;
  try {
    body = JSON.stringify(value, null, 2);
  } catch {
    body = String(value);
  }
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          padding: '6px 10px',
          color: tone,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-elev)',
        }}
      >
        {title}
      </div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          fontSize: 11,
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--color-text)',
          overflow: 'auto',
          maxHeight: 320,
          whiteSpace: 'pre',
        }}
      >
        {body}
      </pre>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-dim)',
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 3) + '...';
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function toIsoStart(date: string): string {
  // input type=date gives "YYYY-MM-DD"; treat as start-of-day UTC.
  return `${date}T00:00:00Z`;
}

function toIsoEnd(date: string): string {
  return `${date}T23:59:59Z`;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '6px 10px',
  fontSize: 12,
  width: '100%',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.04em',
  padding: '8px 14px',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-accent-bright, var(--color-link))',
  color: 'var(--color-accent-bright, var(--color-link))',
  cursor: 'pointer',
  flex: 1,
};

const ghostBtn: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.04em',
  padding: '8px 14px',
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-dim)',
  cursor: 'pointer',
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

const paginationBtn = (disabled: boolean): React.CSSProperties => ({
  fontSize: 11,
  padding: '6px 12px',
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: disabled ? 'var(--color-text-dim)' : 'var(--color-link)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
});
