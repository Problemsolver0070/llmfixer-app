import type { Plan } from '@/hooks/usePlans';
import type { Cadence } from './CadenceToggle';

export function PlanPicker({
  plans, currentSku, cadence, seatCount, onPickPlan, onSeatCountChange,
}: {
  plans: Plan[];
  currentSku: string | null;
  cadence: Cadence;
  seatCount: number;
  onPickPlan: (sku: string) => void;
  onSeatCountChange: (n: number) => void;
}) {
  const filtered = plans.filter((p) => p.cadence === cadence);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {filtered.map((p) => {
        const isCurrent = p.sku === currentSku;
        return (
          <button
            key={p.sku}
            type="button"
            data-testid={`plan-row-${p.sku}`}
            data-current={isCurrent}
            onClick={() => onPickPlan(p.sku)}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 16,
              padding: '14px 16px',
              border: `1px solid ${isCurrent ? 'var(--color-accent-copper)' : 'var(--rule-medium)'}`,
              background: 'transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-text)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span>
              <span style={{ color: 'var(--color-accent-copper-bright)' }}>{p.sku}</span>
              <span style={{ color: 'var(--color-text-dim)', marginLeft: 12 }}>{p.tier}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span>{p.display_price}</span>
              {p.intro_promo_active && p.original_display_price ? (
                <>
                  <span
                    data-testid={`plan-row-${p.sku}-strikethrough`}
                    style={{
                      color: 'var(--color-text-dim)',
                      textDecoration: 'line-through',
                      fontSize: 11,
                    }}
                  >
                    {p.original_display_price}
                  </span>
                  <span
                    data-testid={`plan-row-${p.sku}-promo-badge`}
                    style={{
                      color: 'var(--color-accent-copper-bright)',
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      border: '1px solid var(--color-accent-copper)',
                      padding: '2px 6px',
                    }}
                  >
                    50% off
                  </span>
                </>
              ) : null}
            </span>
          </button>
        );
      })}

      {filtered.some((p) => p.tier === 'workspace' && p.sku === currentSku) ? (
        <label style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
          Seat count
          <input
            type="number"
            min={4}
            max={50}
            value={seatCount}
            onChange={(e) => onSeatCountChange(Number(e.target.value))}
            style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--rule-medium)', padding: '6px 0', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 14, width: 80 }}
          />
        </label>
      ) : null}
    </div>
  );
}
