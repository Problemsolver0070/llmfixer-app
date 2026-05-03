import {
  type CSSProperties,
  type FormEvent,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CapOverrideCard } from '@/components/admin/CapOverrideCard';
import { CancelSubModal } from '@/components/admin/CancelSubModal';
import { ChangePlanModal } from '@/components/admin/ChangePlanModal';
import { ClearPlanModal } from '@/components/admin/ClearPlanModal';
import { DeleteUserModal } from '@/components/admin/DeleteUserModal';
import { RefundChargeModal } from '@/components/admin/RefundChargeModal';
import { StateOverrideCard } from '@/components/admin/StateOverrideCard';
import { UserAuditHistory } from '@/components/admin/UserAuditHistory';
import {
  useAdminUser,
  useAdminUserMutations,
  type AdminUserDetail,
} from '@/hooks/useAdminUser';

type Tab = 'overview' | 'billing' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'billing', label: 'Billing' },
  { id: 'history', label: 'History' },
];

/**
 * Admin UserDetail page (R6/R7).
 *
 * Route: `/app/admin/users/:userId`. Three tabs:
 *  - Overview: read-only summary + StateOverrideCard + CapOverrideCard +
 *    classic comp/extend-trial/lock/delete row.
 *  - Billing: change-plan, clear-plan, cancel-sub, refund modals.
 *  - History: audit log filtered to this user.
 */
export default function UserDetail() {
  const { userId = '' } = useParams<{ userId: string }>();
  const { user, loading, error, refresh } = useAdminUser(userId);
  const [tab, setTab] = useState<Tab>('overview');
  const [auditTick, setAuditTick] = useState<number>(0);

  function notifyMutated(message: string) {
    toast.success(message);
    void refresh();
    setAuditTick((t) => t + 1);
  }

  if (loading && !user) {
    return (
      <Card>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }}>
          Loading user...
        </p>
      </Card>
    );
  }

  if (error || !user) {
    return (
      <Card>
        <p
          role="alert"
          style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}
        >
          {error?.message ?? 'User not found.'}
        </p>
        <Link
          to="/app/admin/users"
          style={{
            display: 'inline-block',
            marginTop: 8,
            color: 'var(--color-link)',
            fontSize: 12,
          }}
        >
          Back to users
        </Link>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <UserHeader user={user} />

      <div role="tablist" style={tabBarStyle}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              style={{
                ...tabStyle,
                color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
                borderBottom: active
                  ? '2px solid var(--color-link)'
                  : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <OverviewTab user={user} onMutated={notifyMutated} />
      )}
      {tab === 'billing' && (
        <BillingTab user={user} onMutated={notifyMutated} />
      )}
      {tab === 'history' && (
        <UserAuditHistory userId={user.id} refreshTick={auditTick} />
      )}
    </div>
  );
}

function UserHeader({ user }: { user: AdminUserDetail }) {
  const [copied, setCopied] = useState(false);
  async function copyId() {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore in test envs
    }
  }
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 300, margin: 0 }}>
            {user.email}
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 11,
              letterSpacing: '0.04em',
              color: 'var(--color-text-dim)',
            }}
          >
            <code>{user.id}</code>
            <button
              type="button"
              onClick={copyId}
              aria-label="Copy user id"
              style={copyBtnStyle}
            >
              {copied ? 'copied' : 'copy'}
            </button>
            <span style={{ margin: '0 8px' }}>|</span>
            Joined {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
        <Link to="/app/admin/users" style={{ color: 'var(--color-link)', fontSize: 12 }}>
          Back to users
        </Link>
      </div>
    </Card>
  );
}

interface TabProps {
  user: AdminUserDetail;
  onMutated: (message: string) => void;
}

function OverviewTab({ user, onMutated }: TabProps) {
  const mutations = useAdminUserMutations(user.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SummaryCard user={user} />
      <StateOverrideCard
        user={user}
        onSubmit={mutations.stateOverride}
        onSaved={() => onMutated('State updated')}
      />
      <CapOverrideCard
        user={user}
        onSubmit={mutations.capOverride}
        onSaved={() => onMutated('Caps updated')}
      />
      <QuickActionsCard
        user={user}
        onComp={async (days, reason) => {
          await mutations.comp(days, reason);
          onMutated('Comp added');
        }}
        onExtend={async (days, reason) => {
          await mutations.extendTrial(days, reason);
          onMutated('Trial extended');
        }}
        onLock={async (reason) => {
          await mutations.lock(reason);
          onMutated('User locked');
        }}
        onDelete={async (reason) => {
          await mutations.deleteUser(reason);
          onMutated('User deleted');
        }}
      />
    </div>
  );
}

function SummaryCard({ user }: { user: AdminUserDetail }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Status', value: user.status },
    { label: 'Plan id', value: user.plan_id ?? '(none)' },
    { label: 'Seat count', value: String(user.seat_count) },
    {
      label: 'Comp until',
      value: user.comp_until
        ? new Date(user.comp_until).toLocaleString()
        : '(none)',
    },
    {
      label: 'Trial ends at',
      value: user.trial_ends_at
        ? new Date(user.trial_ends_at).toLocaleString()
        : '(none)',
    },
    {
      label: 'Output tokens this week',
      value: user.output_tokens_this_week.toLocaleString(),
    },
    {
      label: 'Requests this week',
      value: user.requests_this_week.toLocaleString(),
    },
    {
      label: 'Output token override per week',
      value:
        user.output_token_override_per_week !== null
          ? user.output_token_override_per_week.toLocaleString()
          : '(plan default)',
    },
    {
      label: 'Requests override per week',
      value:
        user.requests_override_per_week !== null
          ? user.requests_override_per_week.toLocaleString()
          : '(plan default)',
    },
  ];
  return (
    <Card>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 400 }}>
        Summary
      </h3>
      <dl style={dlStyle}>
        {rows.map((r) => (
          <div key={r.label} style={dlRowStyle}>
            <dt style={dtStyle}>{r.label}</dt>
            <dd style={ddStyle}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

interface QuickActionsProps {
  user: AdminUserDetail;
  onComp: (days: number, reason: string) => Promise<void>;
  onExtend: (days: number, reason: string) => Promise<void>;
  onLock: (reason: string) => Promise<void>;
  onDelete: (reason: string) => Promise<void>;
}

function QuickActionsCard({
  user,
  onComp,
  onExtend,
  onLock,
  onDelete,
}: QuickActionsProps) {
  const [days, setDays] = useState<string>('14');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'comp' | 'extend' | 'lock' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);

  function validate(): { ok: true; days: number; reason: string } | { ok: false; msg: string } {
    if (!reason.trim())
      return { ok: false, msg: 'Reason is required (powers the audit log).' };
    const n = Number.parseInt(days, 10);
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, msg: 'Days must be a positive integer.' };
    }
    return { ok: true, days: n, reason: reason.trim() };
  }

  async function fire(
    kind: 'comp' | 'extend' | 'lock',
    fn: () => Promise<void>,
  ) {
    setError(null);
    setBusy(kind);
    try {
      await fn();
      setReason('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleComp(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (!v.ok) return setError(v.msg);
    await fire('comp', () => onComp(v.days, v.reason));
  }

  async function handleExtend(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (!v.ok) return setError(v.msg);
    await fire('extend', () => onExtend(v.days, v.reason));
  }

  async function handleLock() {
    setError(null);
    if (!reason.trim()) {
      setError('Reason is required (powers the audit log).');
      return;
    }
    await fire('lock', () => onLock(reason.trim()));
  }

  return (
    <Card>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 400 }}>
        Quick actions
      </h3>
      <form onSubmit={handleComp} noValidate>
        <Input
          label="Days (for comp / extend)"
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(e.currentTarget.value)}
        />
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="quick-reason" style={labelStyle}>
            Reason (required, audit log)
          </label>
          <textarea
            id="quick-reason"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            rows={2}
            style={textareaStyle}
            required
          />
        </div>

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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            type="submit"
            variant="ghost"
            loading={busy === 'comp'}
            loadingLabel="..."
            disabled={!reason.trim()}
            style={{ width: 'auto' }}
          >
            Comp days
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleExtend}
            loading={busy === 'extend'}
            loadingLabel="..."
            disabled={!reason.trim()}
            style={{ width: 'auto' }}
          >
            Extend trial
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleLock}
            loading={busy === 'lock'}
            loadingLabel="..."
            disabled={!reason.trim()}
            style={{ width: 'auto' }}
          >
            Lock account
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setDeleteOpen(true)}
            style={{ width: 'auto' }}
          >
            Delete user
          </Button>
        </div>
      </form>

      <DeleteUserModal
        open={deleteOpen}
        user={user}
        onClose={() => setDeleteOpen(false)}
        onSubmit={onDelete}
      />
    </Card>
  );
}

function BillingTab({ user, onMutated }: TabProps) {
  const mutations = useAdminUserMutations(user.id);
  const [changeOpen, setChangeOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 400 }}>
          Billing snapshot
        </h3>
        <dl style={dlStyle}>
          <div style={dlRowStyle}>
            <dt style={dtStyle}>Plan id</dt>
            <dd style={ddStyle}>{user.plan_id ?? '(none)'}</dd>
          </div>
          <div style={dlRowStyle}>
            <dt style={dtStyle}>Seat count</dt>
            <dd style={ddStyle}>{user.seat_count}</dd>
          </div>
          <div style={dlRowStyle}>
            <dt style={dtStyle}>PayPal subscription id</dt>
            <dd style={ddStyle}>{user.paypal_sub_id ?? '(none)'}</dd>
          </div>
          <div style={dlRowStyle}>
            <dt style={dtStyle}>PayPal subscription status</dt>
            <dd style={ddStyle}>{user.paypal_sub_status ?? '(none)'}</dd>
          </div>
          <div style={dlRowStyle}>
            <dt style={dtStyle}>Cancels at</dt>
            <dd style={ddStyle}>
              {user.cancels_at
                ? new Date(user.cancels_at).toLocaleString()
                : '(not scheduled)'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 400 }}>
          Billing actions
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setChangeOpen(true)}
            style={{ width: 'auto' }}
          >
            Change plan
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setClearOpen(true)}
            style={{ width: 'auto' }}
          >
            Clear plan
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setCancelOpen(true)}
            style={{ width: 'auto' }}
            disabled={!user.paypal_sub_id}
          >
            Cancel subscription
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setRefundOpen(true)}
            style={{ width: 'auto' }}
          >
            Refund a charge
          </Button>
        </div>
      </Card>

      <ChangePlanModal
        open={changeOpen}
        user={user}
        onClose={() => setChangeOpen(false)}
        onSubmit={mutations.changePlan}
        onSaved={() => onMutated('Plan changed')}
      />
      <ClearPlanModal
        open={clearOpen}
        user={user}
        onClose={() => setClearOpen(false)}
        onSubmit={mutations.clearPlan}
        onSaved={() => onMutated('Plan cleared')}
      />
      <CancelSubModal
        open={cancelOpen}
        user={user}
        onClose={() => setCancelOpen(false)}
        onSubmit={mutations.cancelSub}
        onSaved={() => onMutated('Subscription cancelled')}
      />
      <RefundChargeModal
        open={refundOpen}
        user={user}
        onClose={() => setRefundOpen(false)}
        onSubmit={mutations.refund}
        onSaved={() => onMutated('Refund issued')}
      />
    </div>
  );
}

const tabBarStyle: CSSProperties = {
  display: 'flex',
  gap: 16,
  borderBottom: '1px solid var(--color-border)',
};

const tabStyle: CSSProperties = {
  background: 'transparent',
  border: 0,
  padding: '8px 0',
  fontSize: 13,
  cursor: 'pointer',
  marginBottom: -1,
};

const dlStyle: CSSProperties = {
  margin: 0,
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 6,
};

const dlRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '220px 1fr',
  gap: 12,
  padding: '6px 0',
  borderBottom: '1px solid var(--color-border)',
};

const dtStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.08em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
};

const ddStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: 'var(--color-text)',
  wordBreak: 'break-word',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const textareaStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  resize: 'vertical',
};

const copyBtnStyle: CSSProperties = {
  marginLeft: 8,
  background: 'transparent',
  border: 0,
  color: 'var(--color-link)',
  cursor: 'pointer',
  fontSize: 11,
  letterSpacing: '0.04em',
  padding: 0,
};
