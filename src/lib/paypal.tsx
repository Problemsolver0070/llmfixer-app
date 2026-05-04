import type { ReactNode } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { env } from './env';
import { usePayPalClientToken } from '@/hooks/usePayPalClientToken';

export function AppPayPalProvider({ children }: { children: ReactNode }) {
  const { clientToken, error } = usePayPalClientToken();

  // Remount the provider when the client token arrives so the SDK
  // initializes with the token and Card Fields can render.
  const key = clientToken ?? 'no-client-token';

  return (
    <PayPalScriptProvider
      key={key}
      options={{
        clientId: env.paypalClientId,
        intent: 'subscription',
        vault: true,
        components: 'card-fields',
        ...(clientToken ? { dataClientToken: clientToken } : {}),
      }}
      deferLoading
    >
      {error ? (
        <div style={{ padding: 16 }}>
          <p style={{
            color: 'var(--color-danger)',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
          }}>
            Could not load payment form. Please reload the page.
          </p>
          {children}
        </div>
      ) : children}
    </PayPalScriptProvider>
  );
}
