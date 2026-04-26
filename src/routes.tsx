import { createBrowserRouter, Navigate } from 'react-router-dom';

const placeholder = (label: string) => () => (
  <div style={{ padding: 24 }}>
    <p>{label}</p>
  </div>
);

export const router = createBrowserRouter([
  { path: '/', Component: placeholder('Landing') },
  { path: '/login', Component: placeholder('Login') },
  { path: '/signup', Component: placeholder('Sign up') },
  { path: '/forgot', Component: placeholder('Forgot password') },
  { path: '/reset', Component: placeholder('Reset password') },
  { path: '/verify-email', Component: placeholder('Verify email') },
  {
    path: '/app',
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', Component: placeholder('Dashboard') },
      { path: 'setup', Component: placeholder('Setup') },
      { path: 'keys', Component: placeholder('Keys') },
      { path: 'billing', Component: placeholder('Billing') },
      { path: 'account', Component: placeholder('Account') },
      {
        path: 'admin',
        children: [
          { index: true, Component: placeholder('Admin promos') },
          { path: 'promos', Component: placeholder('Admin promos') },
          { path: 'users', Component: placeholder('Admin users') },
          { path: 'metrics', Component: placeholder('Admin metrics') },
        ],
      },
    ],
  },
  { path: '*', Component: placeholder('Not found') },
]);
