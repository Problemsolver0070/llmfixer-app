import {
  useStartRazorpaySubscription,
  mapRazorpayErrorMessage,
} from '@/hooks/useStartRazorpaySubscription';

interface RazorpayCheckoutButtonProps {
  planSku: string;
  seatCount: number;
  onError?: (msg: string) => void;
}

const WORKSPACE_COMING_SOON =
  'Razorpay workspace tiers coming soon, please use crypto payment for workspace plans.';
const SHORT_URL_MISSING =
  'Razorpay is having trouble. Try again, or pick another method.';

/**
 * "If you are from India, pay with Razorpay" button.
 *
 * Hits `POST /v1/billing/razorpay/subscription` via the
 * `useStartRazorpaySubscription` hook, then redirects the browser to
 * the returned `short_url` (Razorpay-hosted checkout). Workspace SKUs
 * short-circuit to a friendly inline coming-soon error before any
 * network call so the user is told to use crypto for workspace plans.
 *
 * v1 scope: only the `short_url` redirect path is wired. If the
 * upstream omits `short_url` we surface a 502-style error rather
 * than fall back to Razorpay's `Checkout.js` (that secondary path
 * is a post-v1 follow-up).
 */
export function RazorpayCheckoutButton({
  planSku,
  seatCount,
  onError,
}: RazorpayCheckoutButtonProps) {
  const { mutate, loading } = useStartRazorpaySubscription();
  const isWorkspace = planSku.startsWith('workspace-');

  async function handleClick(): Promise<void> {
    if (isWorkspace) {
      onError?.(WORKSPACE_COMING_SOON);
      return;
    }
    try {
      const out = await mutate(planSku, seatCount);
      if (!out.short_url) {
        onError?.(SHORT_URL_MISSING);
        return;
      }
      window.location.assign(out.short_url);
    } catch (caught) {
      onError?.(mapRazorpayErrorMessage(caught));
    }
  }

  return (
    <button
      type="button"
      data-testid="pay-with-razorpay-button"
      onClick={() => { void handleClick(); }}
      disabled={loading}
      style={{
        background: 'transparent',
        border: '1px solid var(--rule-medium)',
        color: 'var(--color-text)',
        padding: '10px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        letterSpacing: '0.06em',
        cursor: loading ? 'progress' : 'pointer',
        opacity: loading ? 0.7 : 1,
        textAlign: 'center',
      }}
    >
      {loading
        ? 'Opening Razorpay checkout...'
        : 'If you are from India, pay with Razorpay'}
    </button>
  );
}
