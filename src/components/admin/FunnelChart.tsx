import type { CSSProperties } from 'react';
import { formatNumber, formatPct } from '@/lib/format';

export interface FunnelStage {
  /** Human label, e.g. "Signups (30d)". */
  label: string;
  /** Raw count for the stage. */
  count: number;
  /**
   * Conversion percentage from the previous stage. Optional; the first stage
   * has no previous, so callers omit it. The component will compute one if
   * `referenceCount` is provided instead.
   */
  conversion_pct?: number;
}

interface Props {
  /** Ordered top-of-funnel to bottom. Three stages is typical, more is fine. */
  stages: FunnelStage[];
}

/**
 * Three-bar horizontal funnel. Each bar is sized as a percentage of the
 * largest count (the first stage), so the visual maps directly to drop-off.
 *
 * The component intentionally uses inline `<div style={{ width }}>` bars
 * instead of a chart library: the page only ever has three stages and a
 * full chart dependency is overkill.
 */
export function FunnelChart({ stages }: Props) {
  const top = stages[0]?.count ?? 0;
  return (
    <div
      role="list"
      aria-label="Conversion funnel"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {stages.map((stage, idx) => {
        const prev = idx === 0 ? null : stages[idx - 1];
        const conversion =
          stage.conversion_pct ?? (prev && prev.count > 0
            ? (stage.count / prev.count) * 100
            : null);
        const widthPct =
          top > 0 ? Math.max(2, Math.min(100, (stage.count / top) * 100)) : 0;
        return (
          <div key={stage.label} role="listitem" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={headerRow}>
              <span style={labelStyle}>{stage.label}</span>
              <span style={metaStyle}>
                <span style={countStyle}>{formatNumber(stage.count)}</span>
                {conversion !== null && idx > 0 && (
                  <span style={conversionStyle}>{formatPct(conversion)}</span>
                )}
              </span>
            </div>
            <div style={barTrack}>
              <div
                aria-hidden="true"
                style={{
                  ...barFill,
                  width: `${widthPct}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const headerRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.04em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
};

const metaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 10,
  fontVariantNumeric: 'tabular-nums',
};

const countStyle: CSSProperties = {
  fontSize: 16,
  color: 'var(--color-text)',
};

const conversionStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--color-link)',
};

const barTrack: CSSProperties = {
  height: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  borderRadius: 4,
  overflow: 'hidden',
};

const barFill: CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, var(--color-accent-copper) 0%, var(--color-accent-copper-bright) 100%)',
  transition: 'width 200ms ease-out',
};
