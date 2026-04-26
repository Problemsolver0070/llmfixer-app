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
      }}
      deferLoading
    >
      {children}
    </PayPalScriptProvider>
  );
}
