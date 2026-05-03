import type { CSSProperties, ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

export type StatAccent = 'default' | 'copper' | 'success' | 'danger' | 'link';

interface Props {
  /** Uppercase label rendered above the value. */
  label: string;
  /** Primary value. Pre-formatted (currency, percent, count) by the caller. */
  value: ReactNode;
  /** Optional secondary line rendered under the value. */
  subtext?: ReactNode;
  /**
   * Accent color for the value text. Defaults to plain text.
   * Used to set tone for revenue (copper), churn (danger), engagement (link).
   */
  accent?: StatAccent;
}

/**
 * Reusable stat card for the admin metrics dashboard. Renders a label,
 * a large primary value, and an optional subtext line.
 */
export function StatCard({ label, value, subtext, accent = 'default' }: Props) {
  return (
    <Card style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle(accent)}>{value}</p>
      {subtext !== undefined && <p style={subtextStyle}>{subtext}</p>}
    </Card>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  margin: 0,
};

function valueStyle(accent: StatAccent): CSSProperties {
  return {
    fontSize: 32,
    fontWeight: 300,
    margin: 0,
    color: colorForAccent(accent),
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  };
}

const subtextStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-dim)',
  margin: 0,
};

function colorForAccent(accent: StatAccent): string {
  switch (accent) {
    case 'copper':
      return 'var(--color-accent-copper-bright)';
    case 'success':
      return 'var(--color-success)';
    case 'danger':
      return 'var(--color-danger)';
    case 'link':
      return 'var(--color-link)';
    default:
      return 'var(--color-text)';
  }
}
