import { type FormEvent, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  useCompCodesList,
  type CompCode,
  type CompCodesListFilters,
} from '@/hooks/useCompCodes';

const PAGE_SIZE = 50;

type StatusFilter = 'active' | 'exhausted' | 'expired' | 'all';

interface Props {
  /**
   * Allow the parent (Codes page) to bump a `refreshTick` to force a re-fetch
   * after a successful mint. Re-creates the filters object reference, which
   * is what `useCompCodesList` keys on.
   */
  refreshTick?: number;
}

export function CompCodesList({ refreshTick = 0 }: Props) {
  const [status, setStatus] = useState<StatusFilter>('active');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filters: CompCodesListFilters = {
    status,
    batch_id: batchId,
    search,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    // Hidden derived value via JSON-key ordering on filters; the hook deps are
    // primitives so refreshTick is wired in via a manual call below.
  };

  const { rows, total, loading, error, refresh } = useCompCodesList(filters);

  // External refresh trigger from parent.
  const [lastTick, setLastTick] = useState(refreshTick);
  if (refreshTick !== lastTick) {
    setLastTick(refreshTick);
    void refresh();
  }

  function onSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput.trim().toUpperCase());
  }

  function clearBatch() {
    setBatchId(null);
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card style={{ padding: 0 }}>
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['active', 'exhausted', 'expired', 'all'] as const).map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPage(0);
                }}
                aria-pressed={active}
                style={{
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  padding: '6px 12px',
                  background: active ? 'var(--color-bg-elev)' : 'transparent',
                  border: `1px solid ${active ? 'var(--color-accent-bright)' : 'var(--color-border)'}`,
                  color: active
                    ? 'var(--color-accent-bright)'
                    : 'var(--color-text-dim)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            );
          })}
          {batchId && (
            <span
              style={{
                fontSize: 11,
                padding: '6px 10px',
                border: '1px solid var(--color-link)',
                color: 'var(--color-link)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              batch: <code>{batchId.slice(0, 8)}...</code>
              <button
                type="button"
                onClick={clearBatch}
                aria-label="Clear batch filter"
                style={{
                  background: 'transparent',
                  border: 0,
                  color: 'var(--color-link)',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                x
              </button>
            </span>
          )}
        </div>
        <form
          onSubmit={onSearchSubmit}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) =>
              setSearchInput(e.currentTarget.value.toUpperCase())
            }
            placeholder="Search by code prefix"
            style={{
              flex: 1,
              background: 'var(--color-bg-elev)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              padding: '8px 12px',
              fontSize: 13,
            }}
          />
          <button
            type="submit"
            style={{
              fontSize: 12,
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-link)',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>Loading...</p>
      ) : error ? (
        <p style={{ padding: 22, color: 'var(--color-danger)' }}>
          {error.message}
        </p>
      ) : rows.length === 0 ? (
        <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>
          No codes match these filters.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                'Code',
                'Plan',
                'Duration',
                'Used',
                'Expires',
                'Status',
                'Bound',
                'Notes',
              ].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <CodeRow
                key={c.id}
                code={c}
                onPickBatch={(b) => {
                  setBatchId(b);
                  setPage(0);
                }}
              />
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
          {total} total. Page {page + 1} of {totalPages}.
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
  );
}

function CodeRow({
  code,
  onPickBatch,
}: {
  code: CompCode;
  onPickBatch: (batchId: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  const days = Math.round(code.granted_seconds / 86400);
  const status = code.status ?? deriveStatus(code);

  return (
    <tr>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ letterSpacing: '0.06em' }}>{code.code}</code>
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${code.code}`}
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
        </div>
      </td>
      <td style={td}>{code.granted_plan_id}</td>
      <td style={td}>{days} days</td>
      <td style={td}>
        {code.used_count} / {code.max_uses}
      </td>
      <td style={td}>
        {code.expires_at
          ? new Date(code.expires_at).toLocaleDateString()
          : 'never'}
      </td>
      <td style={td}>
        <StatusBadge status={status} />
      </td>
      <td style={td}>
        {code.bound_user_email ?? (code.bound_user_id ? 'bound' : '')}
      </td>
      <td style={td} title={code.notes ?? undefined}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12 }}>{truncate(code.notes ?? '', 28)}</span>
          {code.batch_id && (
            <button
              type="button"
              onClick={() => onPickBatch(code.batch_id as string)}
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--color-link)',
                cursor: 'pointer',
                fontSize: 10,
                padding: 0,
                textAlign: 'left',
              }}
            >
              filter batch
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: 'active' | 'exhausted' | 'expired' }) {
  const map: Record<typeof status, { color: string; bg: string }> = {
    active: { color: 'var(--color-success)', bg: 'rgba(107, 184, 146, 0.12)' },
    exhausted: {
      color: 'var(--color-text-dim)',
      bg: 'rgba(144, 153, 176, 0.12)',
    },
    expired: { color: 'var(--color-danger)', bg: 'rgba(226, 107, 107, 0.12)' },
  };
  const tone = map[status];
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
      }}
    >
      {status}
    </span>
  );
}

function deriveStatus(code: CompCode): 'active' | 'exhausted' | 'expired' {
  if (code.expires_at && new Date(code.expires_at).getTime() < Date.now()) {
    return 'expired';
  }
  if (code.used_count >= code.max_uses) return 'exhausted';
  return 'active';
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 3) + '...';
}

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
