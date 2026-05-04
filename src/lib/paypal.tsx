import type { ReactNode } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { env } from './env';

export function AppPayPalProvider({ children }: { children: ReactNode }) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: env.paypalClientId,
        intent: 'subscription',
        vault: true,
        // Force the SDK to load card-eligibility code so the
        // <PayPalButtons fundingSource="card"> guest-checkout button on
        // /app/billing/upgrade actually renders. Without this, the SDK
        // often only renders the PayPal-branded button and the buyer is
        // pushed into PayPal account creation, which is exactly what we
        // are trying to avoid.
        enableFunding: 'card',
      }}
      deferLoading
    >
      {children}
    </PayPalScriptProvider>
  );
}
