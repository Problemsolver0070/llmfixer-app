import { useEffect, useRef, useState } from 'react';

/**
 * Renders a PayPal Hosted Button. The button id is created in the
 * PayPal merchant dashboard ("Manage Hosted Buttons"); the merchant
 * configures the price, currency, and post-payment behaviour there.
 *
 * Why this is its own component, not a feature of @paypal/react-paypal-js:
 * Hosted Buttons need a different SDK build than the rest of the app
 * (`components=hosted-buttons` instead of `components=card-fields,buttons`)
 * and a different `client-id` than the one the rest of the app uses.
 * Loading both SDK builds on the same page is unsupported by PayPal.
 *
 * Strategy: inject the hosted-buttons SDK script tag once, then call
 * `paypal.HostedButtons({hostedButtonId}).render(containerSelector)`.
 * On unmount we clear the container so the next mount has a clean slate.
 *
 * Limitations to be aware of when wiring this in:
 *  - The buyer pays PayPal, but our backend has no idea WHO paid
 *    (Hosted Buttons are decoupled from our user system). After
 *    the buyer completes payment, their `users.paypal_sub_id` is
 *    NOT stamped and `status` does not flip to `active`. Phase 2
 *    of this rollout will add a webhook handler that links the
 *    payment back to the user via email; until then comp access
 *    is granted manually.
 *  - The hosted-buttons SDK uses a different `client-id` than the
 *    rest of the app. This is fine as long as both client ids
 *    belong to the same PayPal merchant account.
 */
const HOSTED_SDK_SRC =
  'https://www.paypal.com/sdk/js?client-id=BAAWEbsOVstUeHbW_SVzoFwAEHHC69KJnI6fOlCfqDE9mhaHLrpiXcU7iZSL8lcMnoa8csHWe8yT5W3wBw&components=hosted-buttons&disable-funding=venmo&currency=USD';

interface PaypalHostedButtonsApi {
  HostedButtons?: (opts: { hostedButtonId: string }) => {
    render: (selector: string | HTMLElement) => Promise<void> | void;
  };
}

function ensureHostedSdk(): Promise<void> {
  const existing = document.querySelector(
    `script[src="${HOSTED_SDK_SRC}"]`,
  ) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === 'true') return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('hosted_sdk_load_failed')),
        { once: true },
      );
    });
  }
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = HOSTED_SDK_SRC;
    tag.async = true;
    tag.addEventListener('load', () => {
      tag.dataset.loaded = 'true';
      resolve();
    });
    tag.addEventListener('error', () => reject(new Error('hosted_sdk_load_failed')));
    document.head.appendChild(tag);
  });
}

export function HostedPaypalButton({
  hostedButtonId,
}: {
  hostedButtonId: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    void (async () => {
      try {
        await ensureHostedSdk();
        if (cancelled || !node) return;
        const api = (window as unknown as { paypal?: PaypalHostedButtonsApi }).paypal;
        if (!api?.HostedButtons) {
          setError('hosted_buttons_api_missing');
          return;
        }
        const instance = api.HostedButtons({ hostedButtonId });
        const renderRet = instance.render(node);
        if (renderRet && typeof renderRet.then === 'function') {
          await renderRet;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'unknown_error');
      }
    })();
    return () => {
      cancelled = true;
      if (node) node.innerHTML = '';
    };
  }, [hostedButtonId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        ref={containerRef}
        id={`paypal-container-${hostedButtonId}`}
        data-testid="paypal-hosted-button-container"
      />
      {error ? (
        <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>
          Could not load the payment button. Reload the page or try again
          shortly.
        </p>
      ) : null}
    </div>
  );
}
