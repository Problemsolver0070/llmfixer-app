import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DISPATCH_ACTION,
  PayPalCardFieldsProvider,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  PayPalNameField,
  SCRIPT_LOADING_STATE,
  usePayPalCardFields,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';
import { CadenceToggle, type Cadence } from '@/components/pricing/CadenceToggle';
import { PlanPicker } from '@/components/pricing/PlanPicker';
import { CascadeCancelDialog } from '@/components/workspace/CascadeCancelDialog';
import { DiscountCodeField } from '@/components/billing/DiscountCodeField';
import {
  isKnownDiscountErrorCode,
  type DiscountCodeErrorCode,
} from '@/components/billing/discountCodeErrors';
import { usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useAccount } from '@/hooks/useAccount';
import { useWorkspace } from '@/hooks/useWorkspace';
import { api, ApiError } from '@/lib/api';

function paypalQuantityForSku(sku: string, seatCount: number): number {
  if (sku.startsWith('solo-')) return 1;
  return 1 + Math.max(0, seatCount - 4);
}

function CardFieldsForm({ submitting }: { submitting: boolean }) {
  const { cardFieldsForm } = usePayPalCardFields();
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PayPalNameField
        style={{
          input: {
            color: '#E6EAF2',
            'font-family': "'JetBrains Mono', monospace",
            'font-size': '13px',
            padding: '10px 12px',
          },
          '.invalid': { color: '#E26B6B' },
        }}
      />
      <PayPalNumberField
        style={{
          input: {
            color: '#E6EAF2',
            'font-family': "'JetBrains Mono', monospace",
            'font-size': '13px',
            padding: '10px 12px',
          },
          '.invalid': { color: '#E26B6B' },
        }}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <PayPalExpiryField
          style={{
            input: {
              color: '#E6EAF2',
              'font-family': "'JetBrains Mono', monospace",
              'font-size': '13px',
              padding: '10px 12px',
            },
            '.invalid': { color: '#E26B6B' },
          }}
        />
        <PayPalCVVField
          style={{
            input: {
              color: '#E6EAF2',
              'font-family': "'JetBrains Mono', monospace",
              'font-size': '13px',
              padding: '10px 12px',
            },
            '.invalid': { color: '#E26B6B' },
          }}
        />
      </div>
      <button
        type="button"
        disabled={submitting}
        onClick={async () => {
          setSubmitError(null);
          try {
            await cardFieldsForm?.submit();
          } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'card_fields_submit_failed');
          }
        }}
        style={{
          background: 'var(--color-accent-copper)',
          color: 'var(--color-bg)',
          border: 0,
          padding: '12px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Subscribing...' : 'Pay and start trial'}
      </button>
      {submitError && (
        <p style={{ color: 'var(--color-danger)', fontSize: 12 }}>{submitError}</p>
      )}
      <p style={{ color: 'var(--color-text-dim)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        Card details stay on PayPal's hosted form. We never see your card number.
      </p>
    </div>
  );
}

export default function BillingUpgrade() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { plans, loading: plansLoading } = usePlans();
  const { data: account, refresh: refreshAccount } = useAccount();
  const { changePlan, activateWithCard } = useSubscription();
  const { workspace } = useWorkspace();
  const [{ isInitial }, paypalDispatch] = usePayPalScriptReducer();

  // The app-level PayPalScriptProvider runs with deferLoading=true so the
  // SDK script is not pulled on every authenticated page. Wake it up the
  // moment the upgrade page mounts; without this, PayPalCardFieldsProvider
  // sits on its hands waiting for isResolved and renders no iframes, so
  // the page shows nothing where the card form should be.
  useEffect(() => {
    if (isInitial) {
      paypalDispatch({
        type: DISPATCH_ACTION.LOADING_STATUS,
        value: SCRIPT_LOADING_STATE.PENDING,
      });
    }
  }, [isInitial, paypalDispatch]);

  const initialSku = params.get('plan') ?? account?.user.plan_id ?? 'solo-weekly';
  const initialCadence = (initialSku.split('-')[1] ?? 'weekly') as Cadence;

  const [sku, setSku] = useState<string>(initialSku);
  const [cadence, setCadence] = useState<Cadence>(initialCadence);
  const [seatCount, setSeatCount] = useState<number>(account?.user.seat_count ?? 1);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discountErrorCode, setDiscountErrorCode] =
    useState<DiscountCodeErrorCode | null>(null);

  function extractDiscountErrorCode(err: unknown): DiscountCodeErrorCode | null {
    if (!(err instanceof ApiError)) return null;
    const body = err.body;
    if (body && typeof body === 'object') {
      const detail = (body as { detail?: unknown }).detail;
      if (detail && typeof detail === 'object') {
        const code = (detail as { error_code?: unknown }).error_code;
        if (isKnownDiscountErrorCode(code)) return code;
      }
    }
    return null;
  }

  if (plansLoading) return <p style={{ color: 'var(--color-text-dim)' }}>Loading plans...</p>;

  const hasSubscription = Boolean(account?.user.paypal_sub_id);
  const currentSku = account?.user.plan_id ?? null;
  const selectedPlan = plans.find((p) => p.sku === sku);
  const tier = sku.startsWith('solo-') ? 'solo' : 'workspace';
  const seats = tier === 'solo' ? 1 : Math.max(seatCount, 4);
  const memberOnlyCount = (workspace?.members ?? []).filter((m) => !m.is_admin).length;
  const isWorkspaceAdminTier =
    workspace?.viewer_role === 'admin' && (workspace?.plan_id ?? '').startsWith('workspace-');
  const downgradingToSolo = sku.startsWith('solo-') && (currentSku ?? '').startsWith('workspace-');
  const cascadeNeeded = isWorkspaceAdminTier && memberOnlyCount > 0 && downgradingToSolo;

  async function commitChangePlan(): Promise<void> {
    setSubmitting('changing');
    try {
      await changePlan(sku, seats);
      setSubmitting('done');
    } catch (e) {
      setSubmitting(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function onConfirm(): void {
    if (cascadeNeeded) {
      setCascadeOpen(true);
    } else {
      void commitChangePlan();
    }
  }

  const headerTitle = hasSubscription ? 'Change plan' : 'Pick a plan';
  const headerSub = hasSubscription
    ? 'Pick a different tier or cadence. Pro-rated by PayPal automatically.'
    : 'Start with a 24-hour free trial. Cancel anytime before the trial ends and you will not be charged.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: '-0.01em' }}>
          {headerTitle}
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: '8px 0 0' }}>{headerSub}</p>
      </header>

      <CadenceToggle cadence={cadence} onChange={(c) => { setCadence(c); }} />

      <PlanPicker
        plans={plans}
        currentSku={sku}
        cadence={cadence}
        seatCount={seatCount}
        onPickPlan={setSku}
        onSeatCountChange={setSeatCount}
      />

      {hasSubscription ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting === 'changing'}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-accent-copper)',
              color: 'var(--color-accent-copper-bright)',
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {submitting === 'changing' ? 'Changing...' : (sku === currentSku ? 'No change' : 'Confirm change')}
          </button>
          <Link to="/app/billing" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em' }}>Cancel</Link>
        </div>
      ) : selectedPlan ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', margin: 0 }}>
            Subscribing to <strong style={{ color: 'var(--color-text)' }}>{selectedPlan.display_price}</strong>
            {tier === 'workspace' ? <> with <strong style={{ color: 'var(--color-text)' }}>{seats} seats</strong> ({paypalQuantityForSku(sku, seats)}x PayPal qty)</> : null}
          </p>
          <DiscountCodeField
            value={discountCode}
            onChange={(next) => {
              setDiscountCode(next);
              if (discountErrorCode) setDiscountErrorCode(null);
            }}
            errorCode={discountErrorCode}
            disabled={submitting === 'subscribing'}
          />
          <PayPalCardFieldsProvider
            createVaultSetupToken={async () => {
              const r = await api<{ setup_token: string }>('/v1/billing/paypal/setup-token', { method: 'POST' });
              return r.setup_token;
            }}
            onApprove={async (data) => {
              setSubmitting('subscribing');
              setDiscountErrorCode(null);
              try {
                const trimmed = discountCode.trim();
                await activateWithCard(sku, seats, data.orderID, trimmed || null);
                await refreshAccount();
                navigate('/app/billing');
              } catch (e) {
                const discountErr = extractDiscountErrorCode(e);
                if (discountErr) {
                  setDiscountErrorCode(discountErr);
                  setSubmitting(null);
                  return;
                }
                setSubmitting(`error: ${e instanceof Error ? e.message : String(e)}`);
              }
            }}
            onError={(err) => {
              const msg = err && typeof err === 'object' && 'message' in err
                ? String(err.message)
                : 'paypal_card_fields_error';
              setSubmitting(`error: ${msg}`);
            }}
          >
            <CardFieldsForm submitting={submitting === 'subscribing'} />
          </PayPalCardFieldsProvider>
          <Link to="/app/billing" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em' }}>Cancel</Link>
        </div>
      ) : (
        <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>Plan {sku} not found in catalog.</p>
      )}

      {submitting === 'done' ? (
        <p style={{ color: 'var(--color-success)', fontSize: 13 }}>Plan updated. Your next charge will reflect the change.</p>
      ) : null}
      {submitting?.startsWith('error') ? (
        <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{submitting}</p>
      ) : null}

      {cascadeOpen && workspace ? (
        <CascadeCancelDialog
          members={workspace.members.filter((m) => !m.is_admin).map((m) => ({ email: m.email }))}
          accessLossDate="immediately"
          action="downgrade"
          onCancel={() => setCascadeOpen(false)}
          onConfirm={async () => {
            setCascadeOpen(false);
            await commitChangePlan();
          }}
        />
      ) : null}
    </div>
  );
}
