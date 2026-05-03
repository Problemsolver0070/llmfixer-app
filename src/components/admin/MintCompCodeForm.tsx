import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { usePlans, type Plan } from '@/hooks/usePlans';
import {
  useMintCompCode,
  useMintCompCodeBatch,
  type CompCode,
  type MintBatchResult,
} from '@/hooks/useCompCodes';

const SECONDS_PER_DAY = 86400;
const MAX_DAYS = 90;
const MAX_BATCH_COUNT = 1000;

type Mode = 'single' | 'batch';

interface UserSearchHit {
  id: string;
  email: string;
}

interface AdminUserListResponse {
  items: UserSearchHit[];
  total: number;
}

interface MintedSingle {
  kind: 'single';
  code: CompCode;
}

interface MintedBatch {
  kind: 'batch';
  batch: MintBatchResult;
}

type MintResult = MintedSingle | MintedBatch;

interface Props {
  /**
   * Called after a successful mint so parent (Codes page) can refresh the
   * list. Receives the same payload that's displayed inline.
   */
  onMinted?: (result: MintResult) => void;
}

function formatPlanLabel(p: Plan): string {
  const tier = p.tier === 'solo' ? 'Solo' : 'Workspace';
  const cad = p.cadence.charAt(0).toUpperCase() + p.cadence.slice(1);
  const dollars = (p.base_price_cents / 100).toFixed(2);
  const cadShort =
    p.cadence === 'weekly'
      ? '/wk'
      : p.cadence === 'monthly'
        ? '/mo'
        : p.cadence === 'quarterly'
          ? '/qtr'
          : '/yr';
  return `${tier} ${cad} $${dollars}${cadShort}`;
}

export function MintCompCodeForm({ onMinted }: Props) {
  const { plans, loading: plansLoading } = usePlans();
  const { mint, loading: mintLoading } = useMintCompCode();
  const { mintBatch, loading: batchLoading } = useMintCompCodeBatch();

  const soloPlans = useMemo(
    () => plans.filter((p) => p.tier === 'solo'),
    [plans],
  );

  const [mode, setMode] = useState<Mode>('single');
  const [planId, setPlanId] = useState<string>('');
  const [days, setDays] = useState<string>('7');
  const [maxUses, setMaxUses] = useState<string>('1');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [batchCount, setBatchCount] = useState<string>('10');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);

  // Bound user (single only): autocomplete by email via /v1/admin/users.
  const [boundEmail, setBoundEmail] = useState<string>('');
  const [boundUserId, setBoundUserId] = useState<string | null>(null);
  const [boundResults, setBoundResults] = useState<UserSearchHit[]>([]);
  const [searchingBound, setSearchingBound] = useState(false);
  const searchTimer = useRef<number | null>(null);

  // Default-select first solo plan once plans arrive.
  useEffect(() => {
    if (planId === '' && soloPlans.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlanId(soloPlans[0].sku);
    }
  }, [planId, soloPlans]);

  function clearBound() {
    setBoundEmail('');
    setBoundUserId(null);
    setBoundResults([]);
  }

  function onBoundEmailChange(value: string) {
    setBoundEmail(value);
    setBoundUserId(null);
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setBoundResults([]);
      return;
    }
    searchTimer.current = window.setTimeout(async () => {
      setSearchingBound(true);
      try {
        const out = await api<AdminUserListResponse>(
          `/v1/admin/users?q=${encodeURIComponent(value.trim())}&limit=5&offset=0`,
        );
        setBoundResults(out.items ?? []);
      } catch {
        setBoundResults([]);
      } finally {
        setSearchingBound(false);
      }
    }, 300);
  }

  function pickBound(hit: UserSearchHit) {
    setBoundEmail(hit.email);
    setBoundUserId(hit.id);
    setBoundResults([]);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!planId) {
      setError('Pick a plan.');
      return;
    }
    const parsedDays = Number.parseInt(days, 10);
    if (!Number.isFinite(parsedDays) || parsedDays < 1) {
      setError('Days must be at least 1.');
      return;
    }
    if (parsedDays > MAX_DAYS) {
      setError(`Days cannot exceed ${MAX_DAYS}.`);
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

    const grantedSeconds = parsedDays * SECONDS_PER_DAY;
    const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : null;
    const trimmedNotes = notes.trim() || null;

    try {
      if (mode === 'single') {
        const res = await mint({
          granted_plan_id: planId,
          granted_seconds: grantedSeconds,
          max_uses: parsedMax,
          expires_at: expiresAtIso,
          bound_user_id: boundUserId,
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
          granted_plan_id: planId,
          granted_seconds: grantedSeconds,
          max_uses: parsedMax,
          expires_at: expiresAtIso,
          notes: trimmedNotes,
          reason: reason.trim(),
        });
        const minted: MintedBatch = { kind: 'batch', batch: res };
        setResult(minted);
        onMinted?.(minted);
      }
      // Reset volatile fields; keep plan + days + reason scaffold.
      setNotes('');
      clearBound();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const submitting = mintLoading || batchLoading;

  return (
    <form onSubmit={onSubmit} noValidate>
      <ModeToggle mode={mode} onChange={setMode} />

      <div style={{ marginBottom: 14 }}>
        <label
          htmlFor="comp-plan"
          style={labelStyle}
        >
          Plan (Solo only in v1)
        </label>
        <select
          id="comp-plan"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          disabled={plansLoading}
          style={selectStyle}
        >
          {plansLoading && <option value="">Loading plans...</option>}
          {!plansLoading && soloPlans.length === 0 && (
            <option value="">No solo plans available</option>
          )}
          {soloPlans.map((p) => (
            <option key={p.sku} value={p.sku}>
              {formatPlanLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <Input
        label={`Duration (days, max ${MAX_DAYS})`}
        type="number"
        value={days}
        onChange={(e) => setDays(e.currentTarget.value)}
        min={1}
        max={MAX_DAYS}
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

      {mode === 'single' && (
        <div style={{ marginBottom: 14, position: 'relative' }}>
          <Input
            label="Bound to user (optional, email)"
            value={boundEmail}
            onChange={(e) => onBoundEmailChange(e.currentTarget.value)}
            placeholder="leave blank for anyone"
            autoComplete="off"
          />
          {boundResults.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: 60,
                left: 0,
                right: 0,
                background: 'var(--color-bg-elev)',
                border: '1px solid var(--color-border)',
                listStyle: 'none',
                margin: 0,
                padding: 0,
                zIndex: 5,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {boundResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pickBound(r)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 0,
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {r.email}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchingBound && (
            <p
              style={{
                fontSize: 11,
                color: 'var(--color-text-dim)',
                marginTop: 4,
              }}
            >
              Searching...
            </p>
          )}
          {boundUserId && !searchingBound && (
            <p
              style={{
                fontSize: 11,
                color: 'var(--color-success)',
                marginTop: 4,
              }}
            >
              Will be bound to {boundEmail}.
              <button
                type="button"
                onClick={clearBound}
                style={{
                  marginLeft: 8,
                  background: 'transparent',
                  border: 0,
                  color: 'var(--color-link)',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                clear
              </button>
            </p>
          )}
        </div>
      )}

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
        <label htmlFor="comp-notes" style={labelStyle}>
          Notes (optional)
        </label>
        <textarea
          id="comp-notes"
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
          Code minted
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
        {result.batch.rows.map((c) => (
          <CodeWithCopy key={c.id} code={c.code} />
        ))}
      </div>
      <CopyAllButton codes={result.batch.rows.map((r) => r.code)} />
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
