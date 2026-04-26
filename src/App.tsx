import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { setUnauthorizedHandler } from '@/lib/api';
import { AppPayPalProvider } from '@/lib/paypal';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export default function App() {
  useEffect(() => {
    setUnauthorizedHandler(() => window.location.assign('/login?reason=expired'));
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <AppPayPalProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{ style: { background: 'var(--color-bg-elev)', color: 'var(--color-text)' } }}
      />
    </AppPayPalProvider>
  );
}
