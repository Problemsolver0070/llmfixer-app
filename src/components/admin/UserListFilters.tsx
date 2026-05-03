import { type ChangeEvent } from 'react';

export type StatusFilter =
  | 'all'
  | 'trial'
  | 'trial_expired'
  | 'active'
  | 'comped'
  | 'cancelled';

export type PlanFilter = 'all' | 'none' | 'solo' | 'workspace';

export type SubscriptionFilter = 'all' | 'only-active' | 'only-inactive';

interface Props {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (next: StatusFilter) => void;
  plan: PlanFilter;
  onPlanChange: (next: PlanFilter) => void;
  subscription: SubscriptionFilter;
  onSubscriptionChange: (next: SubscriptionFilter) => void;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'all' },
  { value: 'trial', label: 'trial' },
  { value: 'trial_expired', label: 'trial expired' },
  { value: 'active', label: 'active' },
  { value: 'comped', label: 'comped' },
  { value: 'cancelled', label: 'cancelled' },
];

const PLAN_OPTIONS: { value: PlanFilter; label: string }[] = [
  { value: 'all', label: 'all' },
  { value: 'none', label: 'none' },
  { value: 'solo', label: 'solo' },
  { value: 'workspace', label: 'workspace' },
];

const SUB_OPTIONS: { value: SubscriptionFilter; label: string }[] = [
  { value: 'all', label: 'all' },
  { value: 'only-active', label: 'only active' },
  { value: 'only-inactive', label: 'only inactive' },
];

export function UserListFilters(props: Props) {
  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    props.onSearchInputChange(e.currentTarget.value);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '18px 22px',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div>
        <label
          htmlFor="user-search"
          style={{
            display: 'block',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Search by email
        </label>
        <input
          id="user-search"
          type="search"
          value={props.searchInput}
          onChange={onSearchChange}
          placeholder="Search by email"
          style={{
            width: '100%',
            background: 'var(--color-bg-elev)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            padding: '10px 12px',
            fontSize: 13,
          }}
        />
      </div>

      <FilterRow
        legend="Status"
        groupName="status"
        options={STATUS_OPTIONS}
        value={props.status}
        onChange={(v) => props.onStatusChange(v as StatusFilter)}
      />
      <FilterRow
        legend="Plan"
        groupName="plan"
        options={PLAN_OPTIONS}
        value={props.plan}
        onChange={(v) => props.onPlanChange(v as PlanFilter)}
      />
      <FilterRow
        legend="Subscription"
        groupName="subscription"
        options={SUB_OPTIONS}
        value={props.subscription}
        onChange={(v) => props.onSubscriptionChange(v as SubscriptionFilter)}
      />
    </div>
  );
}

interface FilterRowProps<T extends string> {
  legend: string;
  groupName: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}

function FilterRow<T extends string>(p: FilterRowProps<T>) {
  return (
    <fieldset
      style={{
        border: 0,
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <legend
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--color-text-dim)',
          textTransform: 'uppercase',
          marginRight: 6,
          padding: 0,
        }}
      >
        {p.legend}
      </legend>
      {p.options.map((opt) => {
        const active = p.value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${p.groupName}: ${opt.label}`}
            onClick={() => p.onChange(opt.value)}
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
              textTransform: 'capitalize',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </fieldset>
  );
}
