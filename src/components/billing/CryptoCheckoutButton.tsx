import {
  useStartNowpaymentsCheckout,
  mapNowpaymentsErrorMessage,
} from '@/hooks/useStartNowpaymentsCheckout';

interface CryptoCheckoutButtonProps {
  planSku: string;
  seatCount: number;
  onError?: (msg: string) => void;
}

/**
 * "Pay with crypto" button for the new NOWPayments flow.
 *
 * Hits `POST /v1/billing/nowpayments/checkout` via
 * `useStartNowpaymentsCheckout`, then redirects the browser to the
 * returned `invoice_url`. The user pays in any of NOWPayments' 300+
 * supported coins (or buys crypto via Mercuryo) on the upstream
 * checkout page; the IPN handler activates the subscription server
 * side once payment finishes.
 *
 * Errors from the POST surface as a sanitized user-facing string via
 * `onError` (caller decides whether to render a toast or an inline
 * banner). Sanitization happens in the hook's `mapNowpaymentsErrorMessage`
 * helper so the button never echoes a raw stack trace.
 */
export function CryptoCheckoutButton({
  planSku,
  seatCount,
  onError,
}: CryptoCheckoutButtonProps) {
  const { mutate, loading } = useStartNowpaymentsCheckout();

  async function handleClick(): Promise<void> {
    try {
      const out = await mutate(planSku, seatCount);
      if (!out.invoice_url) {
        onError?.(
          'Crypto payment service is having trouble. Try again, or pick another method.',
        );
        return;
      }
      window.location.assign(out.invoice_url);
    } catch (caught) {
      onError?.(mapNowpaymentsErrorMessage(caught));
    }
  }

  return (
    <button
      type="button"
      data-testid="pay-with-crypto-button"
      onClick={() => { void handleClick(); }}
      disabled={loading}
      style={{
        background: 'transparent',
        border: '1px solid var(--color-accent-copper)',
        color: 'var(--color-accent-copper-bright)',
        padding: '10px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: loading ? 'progress' : 'pointer',
        opacity: loading ? 0.7 : 1,
        textAlign: 'center',
      }}
    >
      {loading ? 'Opening crypto checkout...' : 'Pay with crypto'}
    </button>
  );
}
