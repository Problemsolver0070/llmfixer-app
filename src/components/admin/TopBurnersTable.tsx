import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { formatNumber } from '@/lib/format';
import type { TopBurner } from '@/hooks/useAdminMetrics';

interface Props {
  rows: TopBurner[];
  /** Cap the displayed rows. Defaults to 10. */
  limit?: number;
}

/**
 * Top output-token burners for the trailing 7 days. Sorted DESC by
 * `output_tokens_this_week`. Email links to the user's admin detail page.
 */
export function TopBurnersTable({ rows, limit = 10 }: Props) {
  const sorted = [...rows]
    .sort((a, b) => b.output_tokens_this_week - a.output_tokens_this_week)
    .slice(0, limit);

  if (sorted.length === 0) {
    return (
      <p style={emptyStyle}>No usage in the last 7 days.</p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Email</th>
            <th style={{ ...th, textAlign: 'right' }}>Output tokens (7d)</th>
            <th style={{ ...th, textAlign: 'right' }}>Requests (7d)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.user_id}>
              <td style={td}>
                <Link
                  to={`/app/admin/users/${row.user_id}`}
                  style={{
                    color: 'var(--color-link)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {row.email}
                </Link>
              </td>
              <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {formatNumber(row.output_tokens_this_week)}
              </td>
              <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {formatNumber(row.requests_this_week)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
const emptyStyle: CSSProperties = {
  padding: 22,
  color: 'var(--color-text-dim)',
  margin: 0,
  fontSize: 13,
};
