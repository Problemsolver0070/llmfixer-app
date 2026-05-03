import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { MintCompCodeForm } from '@/components/admin/MintCompCodeForm';
import { CompCodesList } from '@/components/admin/CompCodesList';

type Tab = 'paid' | 'discount';

export default function Codes() {
  const [tab, setTab] = useState<Tab>('paid');
  const [refreshTick, setRefreshTick] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        role="tablist"
        aria-label="Code type"
        style={{
          display: 'flex',
          gap: 18,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {(
          [
            { key: 'paid', label: 'Paid usage' },
            { key: 'discount', label: 'Discount' },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                fontSize: 13,
                padding: '8px 0',
                marginBottom: -1,
                background: 'transparent',
                border: 0,
                color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
                borderBottom: active
                  ? '2px solid var(--color-link)'
                  : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'paid' ? (
        <>
          <Card>
            <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 16px' }}>
              Mint paid-usage code
            </h2>
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-dim)',
                margin: '0 0 16px',
              }}
            >
              Comp codes grant the redeemer a Solo plan for the duration baked
              into the code. The user is treated as a paying customer until
              <code style={{ margin: '0 4px' }}>comp_until</code> elapses.
              Workspace SKUs are out of scope for v1.
            </p>
            <MintCompCodeForm onMinted={() => setRefreshTick((n) => n + 1)} />
          </Card>

          <CompCodesList refreshTick={refreshTick} />
        </>
      ) : (
        <Card>
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-dim)',
              margin: 0,
            }}
          >
            Discount codes (post-charge credit ledger) ship in R5. Coming soon.
          </p>
        </Card>
      )}
    </div>
  );
}
