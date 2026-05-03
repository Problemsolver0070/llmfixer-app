import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import {
  UserListFilters,
  type StatusFilter,
  type PlanFilter,
  type SubscriptionFilter,
} from '@/components/admin/UserListFilters';
import { UserListTable } from '@/components/admin/UserListTable';
import { useAdminUsers, type AdminUserRow } from '@/hooks/useAdminUsers';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const ACTIVE_SUB_STATUSES = new Set(['ACTIVE', 'APPROVED', 'APPROVAL_PENDING']);

export default function Users() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [plan, setPlan] = useState<PlanFilter>('all');
  const [subscription, setSubscription] = useState<SubscriptionFilter>('all');
  const [offset, setOffset] = useState(0);

  // Debounce the search input. Empty input maps back to the unfiltered list.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQ((prev) => {
        const next = searchInput.trim();
        if (prev !== next) setOffset(0);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // Reset pagination whenever a client-side filter chip changes, so the
  // "Showing N-M of Total" caption always reflects the visible page.
  function selectStatus(next: StatusFilter) {
    if (next !== status) setOffset(0);
    setStatus(next);
  }
  function selectPlan(next: PlanFilter) {
    if (next !== plan) setOffset(0);
    setPlan(next);
  }
  function selectSubscription(next: SubscriptionFilter) {
    if (next !== subscription) setOffset(0);
    setSubscription(next);
  }

  const { rows, total, loading, error } = useAdminUsers({
    q: debouncedQ.length > 0 ? debouncedQ : null,
    limit: PAGE_SIZE,
    offset,
  });

  // TODO(backend): server-side filtering for status / plan / paypal_sub_status
  // would let pagination match the filtered count. For now we filter the
  // current page client-side; the displayed total is the unfiltered total
  // returned by the backend, and the visible-range caption uses the
  // post-filter row count for clarity.
  const visibleRows = useMemo(
    () => filterRows(rows, status, plan, subscription),
    [rows, status, plan, subscription],
  );

  function onRowClick(row: AdminUserRow) {
    navigate(`/app/admin/users/${row.id}`);
  }

  const start = total === 0 ? 0 : offset + 1;
  const end = offset + visibleRows.length;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <Card style={{ padding: 0 }}>
      <UserListFilters
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        status={status}
        onStatusChange={selectStatus}
        plan={plan}
        onPlanChange={selectPlan}
        subscription={subscription}
        onSubscriptionChange={selectSubscription}
      />

      <UserListTable
        rows={visibleRows}
        loading={loading}
        error={error}
        onRowClick={onRowClick}
      />

      <div style={paginationBar}>
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
          {total === 0
            ? 'Showing 0 of 0'
            : `Showing ${start}-${end} of ${total}`}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            disabled={!canPrev}
            style={paginationBtn(!canPrev)}
          >
            prev
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            disabled={!canNext}
            style={paginationBtn(!canNext)}
          >
            next
          </button>
        </div>
      </div>
    </Card>
  );
}

// -- client-side filters -----------------------------------------------------

function filterRows(
  rows: AdminUserRow[],
  status: StatusFilter,
  plan: PlanFilter,
  subscription: SubscriptionFilter,
): AdminUserRow[] {
  return rows.filter((row) => {
    if (status !== 'all' && row.status !== status) return false;

    if (plan === 'none' && row.plan_id) return false;
    if (plan === 'solo' && !row.plan_id?.startsWith('solo-')) return false;
    if (plan === 'workspace' && !row.plan_id?.startsWith('workspace-')) {
      return false;
    }

    if (subscription === 'only-active' && !isActiveSub(row)) return false;
    if (subscription === 'only-inactive' && isActiveSub(row)) return false;

    return true;
  });
}

function isActiveSub(row: AdminUserRow): boolean {
  if (!row.paypal_sub_status) return false;
  return ACTIVE_SUB_STATUSES.has(row.paypal_sub_status.toUpperCase());
}

// -- styles ------------------------------------------------------------------

const paginationBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 22px',
  borderTop: '1px solid var(--color-border)',
};

function paginationBtn(disabled: boolean): CSSProperties {
  return {
    fontSize: 11,
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: disabled ? 'var(--color-text-dim)' : 'var(--color-link)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
