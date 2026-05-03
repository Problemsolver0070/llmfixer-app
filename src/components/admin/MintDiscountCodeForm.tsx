import { type FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePlans, type Plan } from '@/hooks/usePlans';
import {
  useMintDiscountCode,
  useMintDiscountCodeBatch,
  type DiscountCode,
  type MintDiscountBatchResult,
} from '@/hooks/useDiscountCodes';

const MAX_BATCH_COUNT = 1000;
const MIN_DISCOUNT = 1;
const MAX_DISCOUNT = 100;

type Mode = 'single' | 'batch';

interface MintedSingle {
  kind: 'single';
  code: DiscountCode;
}

interface MintedBatch {
  kind: 'batch';
  batch: MintDiscountBatchResult;
}

type MintResult = MintedSingle | MintedBatch;

interface Props {
  /**
   * Called after a successful mint so the parent (Codes page) can refresh
   * the list. Receives the same payload that's displayed inline.
   */
  onMinted?: (result: MintResult) => void;
}

function formatPlanLabel(p: Plan): string {
  const tier = p.tier === 'solo' ? 'Solo' : 'Workspace';
  const cad = p.cadence.charAt(0).toUpperCase() + p.cadence.slice(1);
  const cadShort =
    p.cadence === 'weekly'
      ? '/wk'
      : p.cadence === 'monthly'
        ? '/mo'
        : p.cadence === 'quarterly'
          ? '/qtr'
          : '/yr';
  const dollars = (p.base_price_cents / 100).toFixed(2);
  return `${tier} ${cad} $${dollars}${cadShort}`;
}

export function MintDiscountCodeForm({ onMinted }: Props) {
  const { plans, loading: plansLoading } = usePlans();
  const { mint, loading: mintLoading } = useMintDiscountCode();
  const { mintBatch, loading: batchLoading } = useMintDiscountCodeBatch();

  const sortedPlans = useMemo(() => {
    const order = ['solo', 'workspace'];
    const cadOrder = ['weekly', 'monthly', 'quarterly', 'annual'];
    return [...plans].sort((a, b) => {
      const ta = order.indexOf(a.tier);
      const tb = order.indexOf(b.tier);
      if (ta !== tb) return ta - tb;
      return cadOrder.indexOf(a.cadence) - cadOrder.indexOf(b.cadence);
    });
  }, [plans]);

  const [mode, setMode] = useState<Mode>('single');
  const [discountPct, setDiscountPct] = useState<string>('10');
  const [maxUses, setMaxUses] = useState<string>('1');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [batchCount, setBatchCount] = useState<string>('10');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);

  function changeMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setResult(null);
  }

  function toggleSku(sku: string) {
    setAppliesTo((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku],
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const parsedPct = Number.parseInt(discountPct, 10);
    if (!Number.isFinite(parsedPct) || parsedPct < MIN_DISCOUNT) {
      setError(`Discount must be at least ${MIN_DISCOUNT}%.`);
      return;
    }
    if (parsedPct > MAX_DISCOUNT) {
      setError(`Discount cannot exceed ${MAX_DISCOUNT}%.`);
      return;
    }
    const parsedMax = Number.parseInt(maxUses, 10);
    if (!Number.isFinite(parsedMax) || parsedMax < 1) {
      setError('Max uses must be at least 1.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required (powers the audit log).');
      return;
    }

    const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : null;
    const trimmedNotes = notes.trim() || null;

    try {
      if (mode === 'single') {
        const res = await mint({
          discount_pct: parsedPct,
          max_uses: parsedMax,
          expires_at: expiresAtIso,
          applies_to_plan_skus: appliesTo,
          notes: trimmedNotes,
          reason: reason.trim(),
        });
        const minted: MintedSingle = { kind: 'single', code: res };
        setResult(minted);
        onMinted?.(minted);
      } else {
        const parsedCount = Number.parseInt(batchCount, 10);
        if (!Number.isFinite(parsedCount) || parsedCount < 1) {
          setError('Count must be at least 1.');
          return;
        }
        if (parsedCount > MAX_BATCH_COUNT) {
          setError(`Count cannot exceed ${MAX_BATCH_COUNT}.`);
          return;
        }
        const res = await mintBatch({
          count: parsedCount,
          discount_pct: parsedPct,
          max_uses: parsedMax,
          expires_at: expiresAtIso,
          applies_to_plan_skus: appliesTo,
          notes: trimmedNotes,
          reason: reason.trim(),
        });
        const minted: MintedBatch = { kind: 'batch', batch: res };
        setResult(minted);
        onMinted?.(minted);
      }
      setNotes('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const submitting = mintLoading || batchLoading;

  return (
    <form onSubmit={onSubmit} noValidate>
      <ModeToggle mode={mode} onChange={changeMode} />

      <Input
        label={`Discount % (${MIN_DISCOUNT} to ${MAX_DISCOUNT})`}
        type="number"
        value={discountPct}
        onChange={(e) => setDiscountPct(e.currentTarget.value)}
        min={MIN_DISCOUNT}
        max={MAX_DISCOUNT}
        required
      />
      <Input
        label="Max uses"
        type="number"
        value={maxUses}
        onChange={(e) => setMaxUses(e.currentTarget.value)}
        min={1}
        required
      />
      <Input
        label="Expires at (blank = never)"
        type="datetime-local"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.currentTarget.value)}
      />

      <div style={{ marginBottom: 14 }}>
        <span style={labelStyle} id="applies-to-label">
          Applies to plans (blank = every plan)
        </span>
        {plansLoading && (
          <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: 0 }}>
            Loading plans...
          </p>
        )}
        {!plansLoading && (
          <div
            role="group"
            aria-labelledby="applies-to-label"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {sortedPlans.map((p) => {
              const active = appliesTo.includes(p.sku);
              return (
                <button
                  key={p.sku}
                  type="button"
                  onClick={() => toggleSku(p.sku)}
                  aria-pressed={active}
                  data-testid={`applies-to-${p.sku}`}
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
                  }}
                >
                  {formatPlanLabel(p)}
                </button>
              );
            })}
          </div>
        )}
        <p
          style={{
            fontSize: 11,
            color: 'var(--color-text-dim)',
            marginTop: 6,
          }}
        >
          {appliesTo.length === 0
            ? 'Applies to all plans.'
            : `Restricted to ${appliesTo.length} plan${appliesTo.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      {mode === 'batch' && (
        <Input
          label={`Count (max ${MAX_BATCH_COUNT})`}
          type="number"
          value={batchCount}
          onChange={(e) => setBatchCount(e.currentTarget.value)}
          min={1}
          max={MAX_BATCH_COUNT}
          required
        />
      )}

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="discount-notes" style={labelStyle}>
          Notes (optional)
        </label>
        <textarea
          id="discount-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{
            ...selectStyle,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>
      <Input
        label="Reason (required, audit log)"
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
        required
      />

      {error && (
        <p
          role="alert"
          style={{
            color: 'var(--color-danger)',
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        loading={submitting}
        loadingLabel={mode === 'single' ? 'Minting...' : 'Minting batch...'}
      >
        {mode === 'single' ? 'Mint code' : 'Mint batch'}
      </Button>

      {result && <MintResultPanel result={result} />}
    </form>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Mint mode"
      style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
      }}
    >
      {(['single', 'batch'] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            style={{
              fontSize: 12,
              letterSpacing: '0.04em',
              padding: '8px 14px',
              background: active ? 'var(--color-bg-elev)' : 'transparent',
              border: `1px solid ${active ? 'var(--color-accent-bright)' : 'var(--color-border)'}`,
              color: active
                ? 'var(--color-accent-bright)'
                : 'var(--color-text-dim)',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}

function MintResultPanel({ result }: { result: MintResult }) {
  if (result.kind === 'single') {
    return (
      <div
        style={{
          marginTop: 18,
          padding: 14,
          border: '1px solid var(--color-success)',
          borderRadius: 4,
        }}
      >
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
          }}
        >
          Discount code minted ({result.code.discount_pct}% off)
        </p>
        <CodeWithCopy code={result.code.code} />
      </div>
    );
  }
  return (
    <div
      style={{
        marginTop: 18,
        padding: 14,
        border: '1px solid var(--color-success)',
        borderRadius: 4,
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-dim)',
        }}
      >
        Batch minted ({result.batch.count})
      </p>
      <p
        style={{
          margin: '0 0 12px',
          fontSize: 12,
          color: 'var(--color-text-dim)',
        }}
      >
        Batch id: <code>{result.batch.batch_id}</code>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {result.batch.codes.map((c) => (
          <CodeWithCopy key={c.id} code={c.code} />
        ))}
      </div>
      <CopyAllButton codes={result.batch.codes.map((r) => r.code)} />
    </div>
  );
}

function CodeWithCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in test envs; no-op.
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <code
        style={{
          fontSize: 13,
          background: 'var(--color-bg-elev)',
          padding: '4px 8px',
          borderRadius: 3,
          letterSpacing: '0.08em',
        }}
      >
        {code}
      </code>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${code}`}
        style={{
          background: 'transparent',
          border: 0,
          color: 'var(--color-link)',
          cursor: 'pointer',
          fontSize: 11,
          letterSpacing: '0.04em',
        }}
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  );
}

function CopyAllButton({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  async function onCopyAll() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <button
      type="button"
      onClick={onCopyAll}
      style={{
        marginTop: 10,
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-link)',
        cursor: 'pointer',
        fontSize: 11,
        letterSpacing: '0.04em',
        padding: '6px 10px',
      }}
    >
      {copied ? 'all copied' : 'copy all'}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '10px 12px',
  fontSize: 13,
};
