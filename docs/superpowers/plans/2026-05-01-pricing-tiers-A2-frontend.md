# Pricing Tiers A.2 (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the user-facing pricing surfaces that consume the backend foundation built in Plan A.1: a public `/pricing` page, an in-app `/app/billing/upgrade` flow, a dashboard subscribe banner so newly-signed-up users have a clear path to subscribe, and minor surface updates on `/` and `/app/billing` so the existing UI stops sending PayPal subscriptions against the legacy plan.

**Architecture:** Three new public components (`TierCard`, `CadenceToggle`, `EnterpriseContactForm`) plus one in-app component (`PlanPicker`) compose two new pages (`/pricing`, `/pricing/enterprise`) and one new in-app page (`/app/billing/upgrade`). A new `usePlans` hook fetches `GET /v1/billing/plans` from the backend (already live since A.1) with a module-level cache. The existing `useSubscription` hook gains a `changePlan(plan_id, seat_count)` method that POSTs to `/v1/billing/subscriptions/change-plan` (also already live). PayPal Subscribe buttons get the `plan_id` dynamically from the catalog instead of from the now-stale `VITE_PAYPAL_PLAN_ID` env var.

**Tech Stack:** React 19 + Vite + TypeScript, react-router-dom, `@paypal/react-paypal-js`, vitest, JetBrains Mono + Fraunces (already imported in `src/styles/globals.css`).

**Spec:** [`llmfixer-api/docs/superpowers/specs/2026-05-01-pricing-tiers-design.md`](../../../../llmfixer-api/docs/superpowers/specs/2026-05-01-pricing-tiers-design.md), sections 3.5 and 7 phases 5-6.

**Predecessor:** Plan A.1 (backend foundation) shipped in `llmfixer-api` PR #1, deployed 2026-05-01.

**Successor (out of scope here):** Plan A.2.b covers `/app/workspace` + 4 backend workspace endpoints (`POST /v1/workspace/invite|accept-invite`, `DELETE /v1/workspace/seats/{user_id}`, `GET /v1/workspace`) + Resend invite emails. Solo and Workspace tiers are subscribable via `/pricing` after this plan ships, but a Workspace admin has no in-app seat-management UI until A.2.b. Acceptable temporary state because a Workspace admin can ask members to sign up via the same Solo flow and then run a database update to point them at the admin's `workspace_admin_id` (operator-driven).

---

## Design notes (locked 2026-05-01)

The design direction was approved as **"restraint as luxury"**: one Fraunces italic moment in the hero, mono everywhere else, copper accent (#C97B3A) used sparingly, generous whitespace, no shadows or border-radius beyond hairlines. Reference mockup at `.superpowers/brainstorm/428614-1777594878/content/pricing-design-v2.html`. The visual language matches the existing Setup page; do not introduce new typography or color tokens.

Specifically:
- **Hero**: Fraunces italic at `clamp(40px, 5.6vw, 64px)` with `font-variation-settings: 'opsz' 96`. One sentence. Sub-line is dim mono.
- **Tier name**: 12px mono uppercase, letter-spacing 0.18em, color `--color-text-dim`.
- **Tier price**: 32px mono medium-weight, color `--color-text`. NOT italic Fraunces (was tried and rejected as "too fancy").
- **Cadence toggle**: 4 horizontal text tabs separated by 36px gaps, copper underline on active, subtle "save N%" label (dim → copper when active).
- **CTAs**: text + arrow, no border. Copper underline on hover.
- **Footnote**: single dim mono sentence, no italic, no Fraunces.
- **Background**: pure `--color-bg` (#1B2030). No gradients. No grain. No scanlines. No background patterns.
- **Animations**: instant cadence-swap (no typewriter, no stuttered retype). No entry animations on the page (the original spec had staggered reveals; we're rejecting that).

The reference mockup is the source of truth for spacing, type sizes, and class names. Reuse `.section-label`, `.tick`, `.rule`, `.code-id`, `.display-serif`, `.small-caps-mono` utility classes from `src/styles/globals.css` where they fit; add new `.pricing-*` and `.tier-*` classes only where the existing utilities do not cover the case.

---

## File structure

### New files (create in this plan)

**Hooks:**
- `src/hooks/usePlans.ts` - fetches `GET /v1/billing/plans` (public, no auth), module-level cache, returns `{ plans, loading, error, refresh }`.
- `src/hooks/usePlans.test.tsx` - tests fetch + cache behavior.

**Components (public pricing):**
- `src/components/pricing/CadenceToggle.tsx` - controlled component, takes `cadence` and `onChange`, renders 4 tabs.
- `src/components/pricing/CadenceToggle.test.tsx`
- `src/components/pricing/TierCard.tsx` - pure presentation; takes tier name, price, period, tagline, features, optional extra-seat info, CTA props.
- `src/components/pricing/TierCard.test.tsx`
- `src/components/pricing/EnterpriseContactForm.tsx` - small form with mailto: action.
- `src/components/pricing/EnterpriseContactForm.test.tsx`

**Components (in-app upgrade):**
- `src/components/pricing/PlanPicker.tsx` - compact in-app variant of TierCard for the upgrade flow.
- `src/components/pricing/PlanPicker.test.tsx`

**Pages:**
- `src/pages/public/Pricing.tsx` - public pricing page composing TierCard + CadenceToggle + usePlans + auth-aware CTA.
- `src/pages/public/Pricing.test.tsx`
- `src/pages/public/PricingEnterprise.tsx` - page wrapping EnterpriseContactForm.
- `src/pages/public/PricingEnterprise.test.tsx`
- `src/pages/app/BillingUpgrade.tsx` - in-app upgrade flow using PlanPicker + useSubscription.changePlan.
- `src/pages/app/BillingUpgrade.test.tsx`

**Styles:**
- Additions to `src/styles/globals.css` - pricing-page classes (`.pricing-hero`, `.pricing-tier`, `.cadence-toggle`, etc.). No new tokens.

### Modified files

- `src/routes.tsx` - add `/pricing`, `/pricing/enterprise`, and `/app/billing/upgrade` routes.
- `src/pages/public/Landing.tsx` - change "Start 48-hour trial" CTA from `/signup` to `/pricing`.
- `src/pages/app/Dashboard.tsx` - add a trial banner for users whose `status='trial'` and no `paypal_sub_id`, with a CTA to `/pricing`.
- `src/pages/app/Billing.tsx` - show current SKU + period + "Change plan" button → `/app/billing/upgrade`. The legacy direct PayPal Subscribe block is removed; new signups now land on `/pricing` from the dashboard banner instead.
- `src/hooks/useSubscription.ts` - add `changePlan(plan_id: string, seat_count: number)` method that POSTs `/v1/billing/subscriptions/change-plan`. Modify `activate(paypal_sub_id)` to also accept `(paypal_sub_id, plan_id, seat_count)` and forward those (defaults to `solo-weekly`/1 for backwards compat with any callers we missed).
- `src/lib/env.ts` - `paypalPlanId` becomes optional (no longer `required(...)`); kept for backwards compat with any code path we missed but the new flow does not read it.

---

## Phase 2.1: Public pricing page + dashboard subscribe path

Goal: anyone hitting `thefixer.in/pricing` sees the canonical pricing page; signed-in users on the dashboard see a banner that takes them there if they have not subscribed yet.

### Task 1: Pricing page CSS classes in globals.css

**Files:**
- Modify: `src/styles/globals.css` (append at end)

- [ ] **Step 1: Append pricing classes**

```css

/* Pricing page (Plan A.2). Restraint-as-luxury direction:
   one Fraunces italic moment in the hero, mono everywhere else,
   copper used sparingly, no shadows or border-radius. */
.pricing-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 96px 40px 80px;
}
.pricing-hero {
  max-width: 720px;
  margin-bottom: 96px;
}
.pricing-hero-title {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 400;
  font-variation-settings: 'opsz' 96;
  font-size: clamp(40px, 5.6vw, 64px);
  letter-spacing: -0.015em;
  line-height: 1.08;
  margin: 0 0 20px;
  color: var(--color-text);
}
.pricing-hero-sub {
  font-size: 14px;
  color: var(--color-text-dim);
  margin: 0;
  max-width: 56ch;
  line-height: 1.7;
}

.cadence-toggle {
  display: flex;
  gap: 36px;
  margin-bottom: 64px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--rule-fine);
}
.cadence-tab {
  background: transparent;
  border: 0;
  padding: 0 0 4px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--color-text-dim);
  border-bottom: 1px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.cadence-tab:hover { color: var(--color-text); }
.cadence-tab[data-active='true'] {
  color: var(--color-text);
  border-bottom-color: var(--color-accent-copper);
}
.cadence-tab .save {
  font-size: 11px;
  color: var(--color-text-dim);
  margin-left: 6px;
}
.cadence-tab[data-active='true'] .save { color: var(--color-accent-copper); }

.pricing-tiers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 56px;
  row-gap: 48px;
}
.pricing-tier {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.pricing-tier-head {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pricing-tier-name {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  margin: 0;
}
.pricing-tier-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.pricing-tier-price {
  font-family: var(--font-mono);
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--color-text);
  line-height: 1;
}
.pricing-tier-period {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-dim);
}
.pricing-tier-tagline {
  font-size: 13px;
  color: var(--color-text-dim);
  margin: 0;
  max-width: 32ch;
  line-height: 1.65;
}
.pricing-tier-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.pricing-tier-features li {
  font-size: 12.5px;
  color: var(--color-text);
  line-height: 1.6;
}
.pricing-tier-extra {
  font-size: 12px;
  color: var(--color-text-dim);
  padding-top: 10px;
  border-top: 1px solid var(--rule-fine);
  margin-top: 8px;
}
.pricing-tier-extra .copper { color: var(--color-text); }
.pricing-tier-cta {
  margin-top: auto;
  background: transparent;
  border: 0;
  padding: 0 0 2px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--color-accent-copper-bright);
  text-align: left;
  align-self: flex-start;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s ease;
}
.pricing-tier-cta:hover { border-bottom-color: var(--color-accent-copper); }
.pricing-tier-cta-quiet { color: var(--color-text); }
.pricing-tier-cta-quiet:hover { border-bottom-color: var(--color-text-dim); }

.pricing-footnote {
  margin-top: 96px;
  padding-top: 28px;
  border-top: 1px solid var(--rule-fine);
  font-size: 12.5px;
  color: var(--color-text-dim);
  line-height: 1.7;
}
.pricing-footnote a {
  color: var(--color-text);
  border-bottom: 1px solid var(--rule-medium);
}
.pricing-footnote a:hover { border-bottom-color: var(--color-accent-copper); }

@media (max-width: 900px) {
  .pricing-tiers { grid-template-columns: 1fr; row-gap: 56px; }
  .pricing-page { padding: 64px 28px 48px; }
  .pricing-hero { margin-bottom: 64px; }
  .cadence-toggle { margin-bottom: 48px; gap: 24px; flex-wrap: wrap; }
}

/* Dashboard trial banner for unsubscribed users. */
.trial-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid var(--color-accent-copper-dim);
  margin-bottom: 24px;
  font-family: var(--font-mono);
  font-size: 13px;
}
.trial-banner-title {
  color: var(--color-text);
  font-style: italic;
  font-family: var(--font-display);
  font-size: 18px;
}
.trial-banner-sub {
  color: var(--color-text-dim);
  font-size: 12.5px;
  margin-top: 2px;
}
.trial-banner-cta {
  background: transparent;
  border: 0;
  padding: 0 0 2px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--color-accent-copper-bright);
  border-bottom: 1px solid transparent;
}
.trial-banner-cta:hover { border-bottom-color: var(--color-accent-copper); }
```

- [ ] **Step 2: Run lint to confirm no breaking changes**

```bash
npm run lint
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "style(pricing): add globals.css classes for /pricing + dashboard trial banner"
```

---

### Task 2: usePlans hook

**Files:**
- Create: `src/hooks/usePlans.ts`
- Test: `src/hooks/usePlans.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/usePlans.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlans, _resetPlansCache } from './usePlans';

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}));

import { api } from '@/lib/api';

const FAKE_PLANS = {
  plans: [
    { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', paypal_plan_id: 'P-A',
      base_price_cents: 1999, per_seat_price_cents: null, included_seats: 1,
      display_price: '$19.99 / week', discount_pct: 0, trial_days: 2 },
    { sku: 'workspace-weekly', tier: 'workspace', cadence: 'weekly', paypal_plan_id: 'P-B',
      base_price_cents: 3999, per_seat_price_cents: 999, included_seats: 4,
      display_price: '$39.99 / week + $9.99 / extra seat', discount_pct: 0, trial_days: 2 },
  ],
};

beforeEach(() => {
  _resetPlansCache();
  vi.mocked(api).mockReset();
});

describe('usePlans', () => {
  it('fetches and exposes plans', async () => {
    vi.mocked(api).mockResolvedValueOnce(FAKE_PLANS);
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plans).toHaveLength(2);
    expect(result.current.plans[0].sku).toBe('solo-weekly');
    expect(api).toHaveBeenCalledWith('/v1/billing/plans', { auth: false });
  });

  it('caches across hook instances', async () => {
    vi.mocked(api).mockResolvedValueOnce(FAKE_PLANS);
    const { result: r1 } = renderHook(() => usePlans());
    await waitFor(() => expect(r1.current.loading).toBe(false));
    const { result: r2 } = renderHook(() => usePlans());
    await waitFor(() => expect(r2.current.loading).toBe(false));
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('exposes error on fetch failure', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.plans).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

```bash
npx vitest run src/hooks/usePlans.test.tsx
```
Expected: FAIL with "Cannot find module './usePlans'".

- [ ] **Step 3: Implement the hook**

Create `src/hooks/usePlans.ts`:

```ts
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface Plan {
  sku: string;
  tier: 'solo' | 'workspace';
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  paypal_plan_id: string;
  base_price_cents: number;
  per_seat_price_cents: number | null;
  included_seats: number;
  display_price: string;
  discount_pct: number;
  trial_days: number;
}

interface PlansResponse { plans: Plan[]; }

let cache: Plan[] | null = null;
let inflight: Promise<Plan[]> | null = null;

export function _resetPlansCache(): void {
  cache = null;
  inflight = null;
}

async function fetchPlans(): Promise<Plan[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const out = await api<PlansResponse>('/v1/billing/plans', { auth: false });
    cache = out.plans;
    inflight = null;
    return cache;
  })();
  return inflight;
}

export function usePlans(): {
  plans: Plan[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const [plans, setPlans] = useState<Plan[]>(cache ?? []);
  const [loading, setLoading] = useState<boolean>(cache === null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    if (cache) {
      setPlans(cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPlans()
      .then((p) => {
        if (!alive) return;
        setPlans(p);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setPlans([]);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function refresh(): void {
    _resetPlansCache();
    setLoading(true);
    fetchPlans()
      .then(setPlans)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  }

  return { plans, loading, error, refresh };
}
```

Note: this assumes `api()` accepts `{ auth: false }` to skip the JWT attach step on public endpoints. Confirm by reading `src/lib/api.ts`; if the existing signature does not support this, the simplest fix is to extend `api()` to accept an optional `auth?: boolean` flag (default true). If you need to extend it, do so as a one-line addition in `src/lib/api.ts` in this same task and add `import { api as apiBase } from '@/lib/api'` if a name clash exists.

- [ ] **Step 4: Run, verify it passes**

```bash
npx vitest run src/hooks/usePlans.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePlans.ts src/hooks/usePlans.test.tsx src/lib/api.ts
git commit -m "feat(pricing): usePlans hook fetches /v1/billing/plans with module-level cache"
```

---

### Task 3: CadenceToggle component

**Files:**
- Create: `src/components/pricing/CadenceToggle.tsx`
- Test: `src/components/pricing/CadenceToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/pricing/CadenceToggle.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CadenceToggle } from './CadenceToggle';

describe('CadenceToggle', () => {
  it('renders all 4 cadence tabs', () => {
    render(<CadenceToggle cadence="weekly" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /weekly/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /monthly/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /quarterly/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /annual/i })).toBeInTheDocument();
  });

  it('marks the active cadence', () => {
    render(<CadenceToggle cadence="monthly" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /monthly/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /weekly/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onChange when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<CadenceToggle cadence="weekly" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /annual/i }));
    expect(onChange).toHaveBeenCalledWith('annual');
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npx vitest run src/components/pricing/CadenceToggle.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/pricing/CadenceToggle.tsx`:

```tsx
import type { Plan } from '@/hooks/usePlans';

export type Cadence = Plan['cadence'];

const CADENCES: { id: Cadence; label: string; save?: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly', save: 'save 9%' },
  { id: 'quarterly', label: 'Quarterly', save: 'save 16%' },
  { id: 'annual', label: 'Annual', save: 'save 28%' },
];

export function CadenceToggle({
  cadence, onChange,
}: {
  cadence: Cadence;
  onChange: (next: Cadence) => void;
}) {
  return (
    <div className="cadence-toggle" role="tablist" aria-label="Billing cadence">
      {CADENCES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={c.id === cadence}
          data-active={c.id === cadence}
          className="cadence-tab"
          onClick={() => onChange(c.id)}
        >
          {c.label}
          {c.save ? <span className="save">{c.save}</span> : null}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run, pass**

```bash
npx vitest run src/components/pricing/CadenceToggle.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/pricing/CadenceToggle.tsx src/components/pricing/CadenceToggle.test.tsx
git commit -m "feat(pricing): CadenceToggle component with 4 cadences"
```

---

### Task 4: TierCard component

**Files:**
- Create: `src/components/pricing/TierCard.tsx`
- Test: `src/components/pricing/TierCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/pricing/TierCard.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TierCard } from './TierCard';

const PROPS = {
  name: 'Solo',
  price: '$19.99',
  period: '/ week',
  tagline: 'A single drop-in key for one developer.',
  features: ['No artificial caps.', 'All live models.'],
  ctaLabel: 'Start trial',
  onCtaClick: vi.fn(),
};

describe('TierCard', () => {
  it('renders name, price, period, tagline, and all features', () => {
    render(<TierCard {...PROPS} />);
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('/ week')).toBeInTheDocument();
    expect(screen.getByText(/single drop-in key/i)).toBeInTheDocument();
    expect(screen.getByText('No artificial caps.')).toBeInTheDocument();
    expect(screen.getByText('All live models.')).toBeInTheDocument();
  });

  it('fires onCtaClick when the CTA is clicked', () => {
    const onCtaClick = vi.fn();
    render(<TierCard {...PROPS} onCtaClick={onCtaClick} />);
    fireEvent.click(screen.getByRole('button', { name: /start trial/i }));
    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });

  it('shows the extra-seat line only when extraSeat is provided', () => {
    const { rerender } = render(<TierCard {...PROPS} />);
    expect(screen.queryByTestId('extra-seat')).not.toBeInTheDocument();
    rerender(<TierCard {...PROPS} extraSeat={{ price: '$9.99', period: ' / seat / week', minSeats: 4 }} />);
    expect(screen.getByTestId('extra-seat')).toHaveTextContent('$9.99');
    expect(screen.getByTestId('extra-seat')).toHaveTextContent('beyond 4 seats');
  });

  it('renders a quiet CTA when ctaQuiet is true', () => {
    render(<TierCard {...PROPS} ctaQuiet />);
    expect(screen.getByRole('button', { name: /start trial/i })).toHaveClass('pricing-tier-cta-quiet');
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npx vitest run src/components/pricing/TierCard.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/pricing/TierCard.tsx`:

```tsx
export interface TierCardProps {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  features: string[];
  extraSeat?: { price: string; period: string; minSeats: number };
  ctaLabel: string;
  onCtaClick: () => void;
  ctaQuiet?: boolean;
}

export function TierCard({
  name, price, period, tagline, features,
  extraSeat, ctaLabel, onCtaClick, ctaQuiet,
}: TierCardProps) {
  return (
    <article className="pricing-tier" data-tier={name.toLowerCase()}>
      <div className="pricing-tier-head">
        <h2 className="pricing-tier-name">{name}</h2>
        <div className="pricing-tier-price-row">
          <span className="pricing-tier-price">{price}</span>
          {period ? <span className="pricing-tier-period">{period}</span> : null}
        </div>
        <p className="pricing-tier-tagline">{tagline}</p>
      </div>

      <ul className="pricing-tier-features">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>

      {extraSeat ? (
        <div className="pricing-tier-extra" data-testid="extra-seat">
          <span className="copper">{extraSeat.price}</span>
          <span>{extraSeat.period}</span> beyond {extraSeat.minSeats} seats.
        </div>
      ) : null}

      <button
        type="button"
        className={`pricing-tier-cta${ctaQuiet ? ' pricing-tier-cta-quiet' : ''}`}
        onClick={onCtaClick}
      >
        {ctaLabel} →
      </button>
    </article>
  );
}
```

- [ ] **Step 4: Run, pass**

```bash
npx vitest run src/components/pricing/TierCard.test.tsx
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/pricing/TierCard.tsx src/components/pricing/TierCard.test.tsx
git commit -m "feat(pricing): TierCard component (presentational)"
```

---

### Task 5: Pricing page + route + Landing CTA update

**Files:**
- Create: `src/pages/public/Pricing.tsx`
- Create: `src/pages/public/Pricing.test.tsx`
- Modify: `src/routes.tsx`
- Modify: `src/pages/public/Landing.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/public/Pricing.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pricing from './Pricing';

vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: [
      { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', paypal_plan_id: 'P-SW',
        base_price_cents: 1999, per_seat_price_cents: null, included_seats: 1,
        display_price: '$19.99 / week', discount_pct: 0, trial_days: 2 },
      { sku: 'solo-monthly', tier: 'solo', cadence: 'monthly', paypal_plan_id: 'P-SM',
        base_price_cents: 7900, per_seat_price_cents: null, included_seats: 1,
        display_price: '$79 / month', discount_pct: 9, trial_days: 2 },
      { sku: 'workspace-weekly', tier: 'workspace', cadence: 'weekly', paypal_plan_id: 'P-WW',
        base_price_cents: 3999, per_seat_price_cents: 999, included_seats: 4,
        display_price: '$39.99 / week + $9.99 / extra seat', discount_pct: 0, trial_days: 2 },
      { sku: 'workspace-monthly', tier: 'workspace', cadence: 'monthly', paypal_plan_id: 'P-WM',
        base_price_cents: 15900, per_seat_price_cents: 3900, included_seats: 4,
        display_price: '$159 / month + $39 / extra seat', discount_pct: 9, trial_days: 2 },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: null, emailVerified: false }),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('Pricing page', () => {
  it('renders Solo, Workspace, and Enterprise tiers', () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('shows weekly prices by default', () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$39.99')).toBeInTheDocument();
  });

  it('switches prices when monthly cadence is selected', () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: /monthly/i }));
    expect(screen.getByText('$79')).toBeInTheDocument();
    expect(screen.getByText('$159')).toBeInTheDocument();
  });

  it('Enterprise CTA leads to /pricing/enterprise', async () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    const enterpriseCta = screen.getByRole('button', { name: /contact sales/i });
    expect(enterpriseCta).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npx vitest run src/pages/public/Pricing.test.tsx
```

- [ ] **Step 3: Implement Pricing.tsx**

Create `src/pages/public/Pricing.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand } from '@/components/shell/Brand';
import { CadenceToggle, type Cadence } from '@/components/pricing/CadenceToggle';
import { TierCard } from '@/components/pricing/TierCard';
import { usePlans, type Plan } from '@/hooks/usePlans';
import { useSession } from '@/hooks/useSession';

const SOLO_TAGLINE = 'A single drop-in key for one developer who already knows what heavy use looks like.';
const WORKSPACE_TAGLINE = 'Four seats, pooled context, shared key vault. The mark of a team that ships together.';
const ENTERPRISE_TAGLINE = 'Procurement, compliance, dedicated capacity. We come to you.';

const SOLO_FEATURES = [
  'No artificial caps on requests or output tokens.',
  'All live models: Sonnet 4.6, Opus 4.6, Opus 4.7.',
  'Context-on-Demand orchestration on by default.',
  'Drop-in for claude-code, Anthropic SDK, OpenCode.',
  'In-app support chat, Opus-powered.',
];
const WORKSPACE_FEATURES = [
  'Everything in Solo, per seat.',
  'Pooled context across the team.',
  'Shared key vault, per-seat usage view.',
  'Admin role for billing and seat management.',
  'Seat invites by email.',
];
const ENTERPRISE_FEATURES = [
  'Everything in Workspace.',
  'SSO and SAML.',
  'Uptime SLA with credits.',
  'Dedicated rate-limit pool.',
  'DPA, audit-log export, custom retention.',
  'Annual ACH or NET-30, MSA negotiation.',
  'Named technical contact.',
];

function pickPlan(plans: Plan[], tier: 'solo' | 'workspace', cadence: Cadence): Plan | undefined {
  return plans.find((p) => p.tier === tier && p.cadence === cadence);
}

function priceParts(plan: Plan | undefined): { price: string; period: string } {
  if (!plan) return { price: '-', period: '' };
  const display = plan.display_price;
  // Display string is like "$19.99 / week" or "$39.99 / week + $9.99 / extra seat".
  // Cut at the first " /" to get the headline price; keep "/ week" etc. as period.
  const splitPoint = display.indexOf(' / ');
  if (splitPoint === -1) return { price: display, period: '' };
  const headline = display.slice(0, splitPoint);
  // The period is "/ week", "/ month", "/ quarter", "/ year".
  const periodEnd = display.indexOf(' + ', splitPoint);
  const periodSlice = periodEnd === -1
    ? display.slice(splitPoint + 1)
    : display.slice(splitPoint + 1, periodEnd);
  return { price: headline, period: periodSlice };
}

function extraSeatParts(plan: Plan | undefined): { price: string; period: string; minSeats: number } | undefined {
  if (!plan || plan.tier !== 'workspace' || plan.per_seat_price_cents == null) return undefined;
  // Parse "+ $9.99 / extra seat" tail of display_price.
  const cents = plan.per_seat_price_cents;
  const price = `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  const periodMap: Record<Cadence, string> = {
    weekly: ' / seat / week',
    monthly: ' / seat / month',
    quarterly: ' / seat / quarter',
    annual: ' / seat / year',
  };
  return { price, period: periodMap[plan.cadence], minSeats: plan.included_seats };
}

export default function Pricing() {
  const navigate = useNavigate();
  const { session, emailVerified } = useSession();
  const signedIn = Boolean(session && emailVerified);
  const { plans } = usePlans();
  const [cadence, setCadence] = useState<Cadence>('weekly');

  const solo = useMemo(() => pickPlan(plans, 'solo', cadence), [plans, cadence]);
  const workspace = useMemo(() => pickPlan(plans, 'workspace', cadence), [plans, cadence]);
  const soloParts = priceParts(solo);
  const workspaceParts = priceParts(workspace);

  function startTrial(tier: 'solo' | 'workspace'): void {
    const sku = tier === 'solo' ? `solo-${cadence}` : `workspace-${cadence}`;
    if (signedIn) {
      navigate(`/app/billing/upgrade?plan=${sku}`);
    } else {
      navigate(`/signup?plan=${sku}`);
    }
  }

  function contactSales(): void {
    navigate('/pricing/enterprise');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--rule-fine)',
        background: 'var(--color-bg-rail)',
      }}>
        <Brand />
        <nav style={{ display: 'flex', gap: 28 }}>
          <a href="/pricing" style={{ color: 'var(--color-text)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Pricing</a>
          {signedIn ? (
            <a href="/app/dashboard" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Dashboard</a>
          ) : (
            <a href="/login" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Sign in</a>
          )}
        </nav>
      </header>

      <main className="pricing-page">
        <section className="pricing-hero">
          <h1 className="pricing-hero-title">Built for heavy LLM use.</h1>
          <p className="pricing-hero-sub">
            No artificial caps. Pooled context. One drop-in key for every model. Forty-eight-hour free trial, no upfront charge.
          </p>
        </section>

        <CadenceToggle cadence={cadence} onChange={setCadence} />

        <section className="pricing-tiers">
          <TierCard
            name="Solo"
            price={soloParts.price}
            period={soloParts.period}
            tagline={SOLO_TAGLINE}
            features={SOLO_FEATURES}
            ctaLabel="Start 48-hour trial"
            onCtaClick={() => startTrial('solo')}
          />
          <TierCard
            name="Workspace"
            price={workspaceParts.price}
            period={workspaceParts.period}
            tagline={WORKSPACE_TAGLINE}
            features={WORKSPACE_FEATURES}
            extraSeat={extraSeatParts(workspace)}
            ctaLabel="Start 48-hour trial"
            onCtaClick={() => startTrial('workspace')}
          />
          <TierCard
            name="Enterprise"
            price="Custom"
            tagline={ENTERPRISE_TAGLINE}
            features={ENTERPRISE_FEATURES}
            ctaLabel="Contact sales"
            onCtaClick={contactSales}
            ctaQuiet
          />
        </section>

        <section className="pricing-footnote">
          Hit a usage limit? <a href="mailto:venu-kumar@thefixer.in?subject=Limit%20on%20api.thefixer.in">Tell us</a> and we will resolve it or refund you in full. 24-hour refund window from any charge. Prices in USD, billed via PayPal.
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Modify `src/routes.tsx`**

Add the `/pricing` and `/pricing/enterprise` routes (the latter pre-points at the page from Task 6, which lands next):

```tsx
import Pricing from '@/pages/public/Pricing';
import PricingEnterprise from '@/pages/public/PricingEnterprise';

// inside the routes array:
{ path: '/pricing', element: <Pricing /> },
{ path: '/pricing/enterprise', element: <PricingEnterprise /> },
```

If `PricingEnterprise` does not yet exist when this task lands, temporarily stub it as `function PricingEnterprise() { return <div>coming</div>; }` inline; Task 6 replaces the stub.

- [ ] **Step 5: Modify Landing CTA**

In `src/pages/public/Landing.tsx`, change the "Start 48-hour trial" link from `/signup` to `/pricing`. Find the `Link to="/signup"` whose text is "Start 48-hour trial" and update its `to` prop.

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/pages/public/Pricing.test.tsx
npx vitest run src/pages/public/Landing.test.tsx
```
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/public/Pricing.tsx src/pages/public/Pricing.test.tsx src/routes.tsx src/pages/public/Landing.tsx
git commit -m "feat(pricing): /pricing page + Landing CTA update"
```

---

### Task 6: PricingEnterprise page + EnterpriseContactForm

**Files:**
- Create: `src/components/pricing/EnterpriseContactForm.tsx`
- Create: `src/components/pricing/EnterpriseContactForm.test.tsx`
- Create: `src/pages/public/PricingEnterprise.tsx`
- Create: `src/pages/public/PricingEnterprise.test.tsx`

- [ ] **Step 1: Write failing test for the form**

Create `src/components/pricing/EnterpriseContactForm.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EnterpriseContactForm } from './EnterpriseContactForm';

describe('EnterpriseContactForm', () => {
  it('builds a mailto: href with the form contents', () => {
    render(<EnterpriseContactForm />);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByPlaceholderText(/team size/i), { target: { value: '14' } });
    fireEvent.change(screen.getByPlaceholderText(/anything we should know/i), { target: { value: 'SOC2 needed.' } });
    const link = screen.getByRole('link', { name: /send/i });
    expect(link.getAttribute('href')).toContain('mailto:venu-kumar@thefixer.in');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('Ada');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('14');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('SOC2 needed.');
  });
});
```

- [ ] **Step 2: Run, fail**

```bash
npx vitest run src/components/pricing/EnterpriseContactForm.test.tsx
```

- [ ] **Step 3: Implement EnterpriseContactForm**

```tsx
import { useState } from 'react';

export function EnterpriseContactForm() {
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [body, setBody] = useState('');
  const subject = encodeURIComponent('Enterprise inquiry - thefixer.in');
  const text = encodeURIComponent(
    `Name: ${name}\nTeam size: ${size}\n\n${body}\n`,
  );
  const href = `mailto:venu-kumar@thefixer.in?subject=${subject}&body=${text}`;

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 540 }}
      onSubmit={(e) => e.preventDefault()}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
        Your name
        <input
          placeholder="your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--rule-medium)', padding: '8px 0', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 14, textTransform: 'none', letterSpacing: 'normal' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
        Team size
        <input
          placeholder="team size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--rule-medium)', padding: '8px 0', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 14, textTransform: 'none', letterSpacing: 'normal' }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>
        Notes
        <textarea
          placeholder="anything we should know"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--rule-medium)', padding: '8px 0', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 14, resize: 'vertical', textTransform: 'none', letterSpacing: 'normal' }}
        />
      </label>
      <a
        href={href}
        style={{ alignSelf: 'flex-start', color: 'var(--color-accent-copper-bright)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none', borderBottom: '1px solid transparent', paddingBottom: 2 }}
      >
        Send →
      </a>
    </form>
  );
}
```

- [ ] **Step 4: Implement PricingEnterprise.tsx**

```tsx
import { Brand } from '@/components/shell/Brand';
import { EnterpriseContactForm } from '@/components/pricing/EnterpriseContactForm';

export default function PricingEnterprise() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--rule-fine)',
        background: 'var(--color-bg-rail)',
      }}>
        <Brand />
        <nav style={{ display: 'flex', gap: 28 }}>
          <a href="/pricing" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Pricing</a>
          <a href="/login" style={{ color: 'var(--color-text-dim)', fontSize: 12, letterSpacing: '0.06em', textDecoration: 'none' }}>Sign in</a>
        </nav>
      </header>

      <main className="pricing-page">
        <section className="pricing-hero">
          <h1 className="pricing-hero-title">Enterprise inquiry.</h1>
          <p className="pricing-hero-sub">
            Tell us about your team and the constraints you are working with. We will respond within one business day.
          </p>
        </section>
        <EnterpriseContactForm />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Add PricingEnterprise.test.tsx (smoke render)**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PricingEnterprise from './PricingEnterprise';

describe('PricingEnterprise page', () => {
  it('renders the hero and the contact form', () => {
    render(<PricingEnterprise />);
    expect(screen.getByText(/Enterprise inquiry/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run, pass**

```bash
npx vitest run src/components/pricing/EnterpriseContactForm.test.tsx src/pages/public/PricingEnterprise.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/pricing/EnterpriseContactForm.tsx src/components/pricing/EnterpriseContactForm.test.tsx src/pages/public/PricingEnterprise.tsx src/pages/public/PricingEnterprise.test.tsx
git commit -m "feat(pricing): /pricing/enterprise page + EnterpriseContactForm"
```

---

### Task 7: Dashboard trial banner

**Files:**
- Modify: `src/pages/app/Dashboard.tsx`
- Modify: `src/pages/app/Dashboard.test.tsx`

- [ ] **Step 1: Extend the existing Dashboard test**

Add to `src/pages/app/Dashboard.test.tsx`:

```tsx
it('shows the trial banner with subscribe CTA when user is on trial without a subscription', () => {
  vi.mocked(useAccount).mockReturnValue({
    data: {
      user: { id: 'u', email: 'a@b.c', status: 'trial', paypal_sub_id: null,
              plan_id: null, seat_count: 1 } as any,
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, refresh: vi.fn(),
  } as any);
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  const cta = screen.getByRole('link', { name: /see plans/i });
  expect(cta).toHaveAttribute('href', '/pricing');
});

it('does not show the trial banner once the user has a subscription', () => {
  vi.mocked(useAccount).mockReturnValue({
    data: {
      user: { id: 'u', email: 'a@b.c', status: 'active', paypal_sub_id: 'SUB-1',
              plan_id: 'solo-weekly', seat_count: 1 } as any,
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, refresh: vi.fn(),
  } as any);
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: /see plans/i })).not.toBeInTheDocument();
});
```

(Adjust the existing mocks to match the existing test file's pattern. If `useAccount` is not yet mocked in the file, mock it module-level via `vi.mock('@/hooks/useAccount', ...)`.)

- [ ] **Step 2: Run, fail**

```bash
npx vitest run src/pages/app/Dashboard.test.tsx
```

- [ ] **Step 3: Add the banner to `src/pages/app/Dashboard.tsx`**

At the top of the Dashboard component's returned JSX (just inside the outer wrapper, before any existing content), add:

```tsx
{u.status === 'trial' && !u.paypal_sub_id ? (
  <div className="trial-banner">
    <div>
      <div className="trial-banner-title">Start your subscription</div>
      <div className="trial-banner-sub">
        You are on a free trial. Pick a plan to keep your access after the trial ends.
      </div>
    </div>
    <Link to="/pricing" className="trial-banner-cta">See plans →</Link>
  </div>
) : null}
```

(Import `Link` from `react-router-dom` if not already imported. Reference `u` is the existing user object the Dashboard already pulls from `useAccount`. If it is named differently, adapt.)

- [ ] **Step 4: Run, pass**

```bash
npx vitest run src/pages/app/Dashboard.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/Dashboard.tsx src/pages/app/Dashboard.test.tsx
git commit -m "feat(pricing): dashboard trial banner with CTA to /pricing"
```

---

## Phase 2.2: In-app upgrade flow

Goal: existing customers can switch tiers or seat counts in-app without leaving the dashboard.

### Task 8: Extend useSubscription with changePlan

**Files:**
- Modify: `src/hooks/useSubscription.ts`
- Modify: `src/hooks/useSubscription.test.tsx`

- [ ] **Step 1: Write failing test**

Append to `src/hooks/useSubscription.test.tsx`:

```tsx
it('changePlan POSTs /v1/billing/subscriptions/change-plan with plan_id and seat_count', async () => {
  vi.mocked(api).mockResolvedValueOnce({}); // mock for change-plan
  vi.mocked(api).mockResolvedValueOnce({}); // mock for refresh side-effect
  const { result } = renderHook(() => useSubscription());
  await act(async () => {
    await result.current.changePlan('workspace-monthly', 4);
  });
  expect(api).toHaveBeenCalledWith('/v1/billing/subscriptions/change-plan', {
    method: 'POST',
    body: { plan_id: 'workspace-monthly', seat_count: 4 },
  });
});
```

(Ensure `act` is imported from `@testing-library/react`.)

- [ ] **Step 2: Run, fail**

- [ ] **Step 3: Implement**

In `src/hooks/useSubscription.ts`, add inside the hook:

```ts
const changePlan = useCallback(
  async (planId: string, seatCount: number) => {
    await api('/v1/billing/subscriptions/change-plan', {
      method: 'POST',
      body: { plan_id: planId, seat_count: seatCount },
    });
    await refresh();
    await fetchSubscription();
  },
  [refresh, fetchSubscription],
);
```

And include `changePlan` in the returned object:

```ts
return { subscription, loading, activate, cancel, redeem, changePlan };
```

Also extend `activate` to accept plan_id and seat_count (with backwards-compat defaults):

```ts
const activate = useCallback(
  async (paypalSubId: string, planId = 'solo-weekly', seatCount = 1) => {
    await api('/v1/billing/subscriptions/activate', {
      method: 'POST',
      body: { paypal_sub_id: paypalSubId, plan_id: planId, seat_count: seatCount },
    });
    await refresh();
    await fetchSubscription();
  },
  [refresh, fetchSubscription],
);
```

- [ ] **Step 4: Run, pass**

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSubscription.ts src/hooks/useSubscription.test.tsx
git commit -m "feat(pricing): useSubscription gains changePlan; activate forwards plan_id+seat_count"
```

---

### Task 9: PlanPicker component + BillingUpgrade page

**Files:**
- Create: `src/components/pricing/PlanPicker.tsx`
- Create: `src/components/pricing/PlanPicker.test.tsx`
- Create: `src/pages/app/BillingUpgrade.tsx`
- Create: `src/pages/app/BillingUpgrade.test.tsx`
- Modify: `src/routes.tsx` (add `/app/billing/upgrade` under the auth guard)

- [ ] **Step 1: PlanPicker test**

Create `src/components/pricing/PlanPicker.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanPicker } from './PlanPicker';

const PLANS = [
  { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', display_price: '$19.99 / week', included_seats: 1, paypal_plan_id: 'P-SW', base_price_cents: 1999, per_seat_price_cents: null, discount_pct: 0, trial_days: 2 },
  { sku: 'workspace-weekly', tier: 'workspace', cadence: 'weekly', display_price: '$39.99 / week + $9.99 / extra seat', included_seats: 4, paypal_plan_id: 'P-WW', base_price_cents: 3999, per_seat_price_cents: 999, discount_pct: 0, trial_days: 2 },
];

describe('PlanPicker', () => {
  it('renders one row per plan and marks the current SKU', () => {
    render(<PlanPicker plans={PLANS as any} currentSku="solo-weekly" cadence="weekly" seatCount={1} onPickPlan={() => {}} onSeatCountChange={() => {}} />);
    expect(screen.getByText(/solo-weekly/)).toBeInTheDocument();
    expect(screen.getByTestId('plan-row-solo-weekly')).toHaveAttribute('data-current', 'true');
    expect(screen.getByTestId('plan-row-workspace-weekly')).toHaveAttribute('data-current', 'false');
  });

  it('fires onPickPlan with the SKU', () => {
    const onPickPlan = vi.fn();
    render(<PlanPicker plans={PLANS as any} currentSku="solo-weekly" cadence="weekly" seatCount={1} onPickPlan={onPickPlan} onSeatCountChange={() => {}} />);
    fireEvent.click(screen.getByTestId('plan-row-workspace-weekly'));
    expect(onPickPlan).toHaveBeenCalledWith('workspace-weekly');
  });
});
```

- [ ] **Step 2: Run, fail**

- [ ] **Step 3: Implement PlanPicker**

```tsx
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
            <span>{p.display_price}</span>
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
```

- [ ] **Step 4: BillingUpgrade test + page**

Create `src/pages/app/BillingUpgrade.tsx`:

```tsx
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CadenceToggle, type Cadence } from '@/components/pricing/CadenceToggle';
import { PlanPicker } from '@/components/pricing/PlanPicker';
import { usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useAccount } from '@/hooks/useAccount';

export default function BillingUpgrade() {
  const [params] = useSearchParams();
  const { plans, loading: plansLoading } = usePlans();
  const { data: account } = useAccount();
  const { changePlan } = useSubscription();

  const initialSku = params.get('plan') ?? account?.user.plan_id ?? 'solo-weekly';
  const initialCadence = (initialSku.split('-')[1] ?? 'weekly') as Cadence;

  const [sku, setSku] = useState<string>(initialSku);
  const [cadence, setCadence] = useState<Cadence>(initialCadence);
  const [seatCount, setSeatCount] = useState<number>(account?.user.seat_count ?? 1);
  const [submitting, setSubmitting] = useState<string | null>(null);

  if (plansLoading) return <p style={{ color: 'var(--color-text-dim)' }}>Loading plans...</p>;

  const currentSku = account?.user.plan_id ?? null;

  async function onConfirm(): Promise<void> {
    setSubmitting('changing');
    try {
      const tier = sku.startsWith('solo-') ? 'solo' : 'workspace';
      const seats = tier === 'solo' ? 1 : Math.max(seatCount, 4);
      await changePlan(sku, seats);
      setSubmitting('done');
    } catch (e) {
      setSubmitting(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: '-0.01em' }}>
          Change plan
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: '8px 0 0' }}>
          Pick a different tier or cadence. Pro-rated by PayPal automatically.
        </p>
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

      {submitting === 'done' ? (
        <p style={{ color: 'var(--color-success)', fontSize: 13 }}>Plan updated. Your next charge will reflect the change.</p>
      ) : null}
      {submitting?.startsWith('error') ? (
        <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{submitting}</p>
      ) : null}
    </div>
  );
}
```

Create `src/pages/app/BillingUpgrade.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillingUpgrade from './BillingUpgrade';

vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: [
      { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', paypal_plan_id: 'P-SW',
        base_price_cents: 1999, per_seat_price_cents: null, included_seats: 1,
        display_price: '$19.99 / week', discount_pct: 0, trial_days: 2 },
      { sku: 'solo-monthly', tier: 'solo', cadence: 'monthly', paypal_plan_id: 'P-SM',
        base_price_cents: 7900, per_seat_price_cents: null, included_seats: 1,
        display_price: '$79 / month', discount_pct: 9, trial_days: 2 },
    ],
    loading: false, error: null, refresh: vi.fn(),
  }),
}));
const changePlan = vi.fn(async () => {});
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, loading: false, changePlan, activate: vi.fn(), cancel: vi.fn(), redeem: vi.fn() }),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ data: { user: { id: 'u', email: 'a', status: 'active', plan_id: 'solo-weekly', seat_count: 1, paypal_sub_id: 'SUB-1' }, requests_this_week: 0, active_key_count: 0 }, loading: false, refresh: vi.fn() }),
}));

describe('BillingUpgrade', () => {
  it('confirms the change-plan call when user picks a different SKU and clicks confirm', async () => {
    render(<MemoryRouter><BillingUpgrade /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: /monthly/i }));
    fireEvent.click(screen.getByTestId('plan-row-solo-monthly'));
    fireEvent.click(screen.getByRole('button', { name: /confirm change/i }));
    await waitFor(() => expect(changePlan).toHaveBeenCalledWith('solo-monthly', 1));
  });
});
```

- [ ] **Step 5: Add the route**

In `src/routes.tsx` under the `/app/*` section guarded by `RequireAuth`:

```tsx
{ path: 'billing/upgrade', element: <BillingUpgrade /> },
```

(Import `BillingUpgrade` at the top.)

- [ ] **Step 6: Run, pass**

```bash
npx vitest run src/components/pricing/PlanPicker.test.tsx src/pages/app/BillingUpgrade.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/pricing/PlanPicker.tsx src/components/pricing/PlanPicker.test.tsx src/pages/app/BillingUpgrade.tsx src/pages/app/BillingUpgrade.test.tsx src/routes.tsx
git commit -m "feat(pricing): /app/billing/upgrade in-app picker + change-plan integration"
```

---

### Task 10: Update Billing.tsx to show current SKU + redirect new subs

**Files:**
- Modify: `src/pages/app/Billing.tsx`
- Modify: `src/pages/app/Billing.test.tsx`

- [ ] **Step 1: Update Billing.test.tsx**

Replace any existing test cases that exercise the inline `PayPalButtons` Subscribe block with these two cases (and delete the old `<PayPalButtons />` assertion). Add `Link` and `MemoryRouter` if not already imported:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Billing from './Billing';
import { useAccount } from '@/hooks/useAccount';
import { useSubscription } from '@/hooks/useSubscription';

vi.mock('@/hooks/useAccount', () => ({ useAccount: vi.fn() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: vi.fn() }));

const SUB_DEFAULT = { subscription: null, loading: false, activate: vi.fn(), cancel: vi.fn(), changePlan: vi.fn(), redeem: vi.fn() };

describe('Billing', () => {
  it('renders See-plans CTA pointing at /pricing for trial users without a subscription', () => {
    vi.mocked(useAccount).mockReturnValue({
      data: { user: { id: 'u', email: 'a', status: 'trial', paypal_sub_id: null, plan_id: null, seat_count: 1, cancels_at: null }, requests_this_week: 0, active_key_count: 0 },
      loading: false, refresh: vi.fn(),
    } as any);
    vi.mocked(useSubscription).mockReturnValue(SUB_DEFAULT as any);
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /see plans/i })).toHaveAttribute('href', '/pricing');
    expect(screen.queryByText(/subscribe with paypal/i)).not.toBeInTheDocument();
  });

  it('renders current SKU and Change-plan link for active subscribers', () => {
    vi.mocked(useAccount).mockReturnValue({
      data: { user: { id: 'u', email: 'a', status: 'active', paypal_sub_id: 'SUB-1', plan_id: 'solo-weekly', seat_count: 1, cancels_at: null }, requests_this_week: 0, active_key_count: 0 },
      loading: false, refresh: vi.fn(),
    } as any);
    vi.mocked(useSubscription).mockReturnValue({ ...SUB_DEFAULT, subscription: { paypal_sub_id: 'SUB-1', status: 'ACTIVE', next_billing_time: null, plan_id: 'P-LIVE' } } as any);
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(screen.getByText('solo-weekly')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /change plan/i })).toHaveAttribute('href', '/app/billing/upgrade');
  });
});
```

- [ ] **Step 2: Modify Billing.tsx**

Replace the existing inline `PayPalButtons` Subscribe block (the JSX inside `{showSubscribe && ( ... )}`) with two `<Card>` sections, one for unsubscribed users and one for active subscribers. The full `Billing.tsx` becomes:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RedeemPromoForm } from '@/components/forms/RedeemPromoForm';
import { useAccount } from '@/hooks/useAccount';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDateTime } from '@/lib/format';

export default function Billing() {
  const { data, loading } = useAccount();
  const { subscription, cancel, redeem } = useSubscription();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;
  const u = data.user;
  const showSubscribe = ['trial', 'trial_expired', 'cancelled', 'expired'].includes(u.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Billing</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          Pricing and plan management.
        </p>
      </header>

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Current plan
        </p>
        <p style={{ fontSize: 16, margin: '8px 0' }}>
          Status: <strong>{u.status}</strong>
          {subscription?.next_billing_time && (
            <>, next charge {formatDateTime(subscription.next_billing_time)}</>
          )}
        </p>
        {u.cancels_at && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>
            Subscription ends {formatDateTime(u.cancels_at)}.
          </p>
        )}
      </Card>

      {showSubscribe ? (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Subscribe
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '0 0 12px' }}>
            Pick a plan to keep your access after the trial ends.
          </p>
          <Link to="/pricing" className="trial-banner-cta">See plans &rarr;</Link>
        </Card>
      ) : null}

      {u.status === 'active' && u.plan_id ? (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Plan
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-text)', margin: '0 0 12px' }}>
            <span className="code-id" style={{ color: 'var(--color-accent-copper-bright)' }}>{u.plan_id}</span>
            {' '}with {u.seat_count} seat{u.seat_count === 1 ? '' : 's'}.
          </p>
          <Link to="/app/billing/upgrade" className="trial-banner-cta">Change plan &rarr;</Link>
        </Card>
      ) : null}

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Promo code
        </p>
        <RedeemPromoForm onRedeem={redeem} />
      </Card>

      {u.status === 'active' && !u.cancels_at && (
        <Card>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Cancel
          </p>
          <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
            Cancel subscription
          </Button>
        </Card>
      )}

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel subscription?">
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 18 }}>
          Your keys keep working until the end of the current billing period. You will not be charged again.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep subscription</Button>
          <Button
            variant="danger"
            onClick={async () => { await cancel(); setConfirmCancel(false); }}
          >
            Confirm cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```

(The `PayPalButtons` import + the `env` import + `activate` from `useSubscription` are all removed because the inline subscribe flow no longer lives here.)

- [ ] **Step 3: Run tests, pass**

```bash
npx vitest run src/pages/app/Billing.test.tsx
```

- [ ] **Step 4: Run full suite + lint + build**

```bash
npm test
npm run lint
npm run build
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/Billing.tsx src/pages/app/Billing.test.tsx
git commit -m "feat(billing): show current SKU + Change-plan link; remove direct PayPal subscribe"
```

---

## Plan A.2 self-review checklist

Run after all tasks complete:

- [ ] All 4 routes registered in `src/routes.tsx`: `/pricing`, `/pricing/enterprise`, `/app/billing/upgrade`, plus existing routes preserved.
- [ ] Public users hit `/pricing` (linked from Landing) and can subscribe via PayPal Subscribe (the inline subscribe flow is part of `/app/billing/upgrade`; logged-out users go through `/signup` first).
- [ ] Logged-in users see the dashboard banner CTA → `/pricing` → `/app/billing/upgrade?plan=X`.
- [ ] `/app/billing` shows current SKU + Change-plan link, no longer shows direct PayPal Subscribe.
- [ ] `npm test` passes (the new `usePlans.test`, `CadenceToggle.test`, `TierCard.test`, `Pricing.test`, `EnterpriseContactForm.test`, `PricingEnterprise.test`, `Dashboard.test`, `useSubscription.test`, `PlanPicker.test`, `BillingUpgrade.test`, `Billing.test` all green).
- [ ] `npm run lint` passes.
- [ ] `npm run build` produces `dist/` with no type errors.
- [ ] Em-dash scan (`grep -rnP '[\x{2013}\x{2014}]' src/components/pricing src/pages/public/Pricing.tsx src/pages/public/PricingEnterprise.tsx src/pages/app/BillingUpgrade.tsx`): empty.
- [ ] PROGRESS.md note logging the deploy.

## What ships in Plan A.2.b (out of scope here)

Not built in this plan; tracked for next session:
- `/app/workspace` page with seat list + invite form + leave-team UI.
- Backend: `POST /v1/workspace/invite`, `POST /v1/workspace/accept-invite`, `DELETE /v1/workspace/seats/{user_id}`, `GET /v1/workspace`. New table `workspace_invites (token, admin_user_id, email, expires_at, accepted_at)`.
- Resend email template for invites; accept-invite landing page that links the new user's row to the admin via `workspace_admin_id`.
- Workspace tier subscribers in this plan can subscribe and be billed correctly; they just have no in-app way to invite teammates until A.2.b ships. The temporary workaround is operator-driven: the admin emails their teammate the signup link, the teammate signs up, and the admin opens a support ticket asking to be linked. We document this in the Workspace tier's tagline on `/pricing` ("Seat invites by email. (Coming soon.)") OR omit "Seat invites by email" from the feature list until A.2.b ships - your call at execution time.
