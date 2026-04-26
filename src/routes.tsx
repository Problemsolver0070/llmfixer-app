import { Navigate, type RouteObject } from 'react-router-dom';
import { RequireAuth, RequireAdmin } from '@/lib/auth';
import Login from '@/pages/public/Login';

const placeholder = (label: string) => () => (
  <div style={{ padding: 24 }}>
    <p>{label}</p>
  </div>
);

export const routes: RouteObject[] = [
  { path: '/', Component: placeholder('Landing') },
  { path: '/login', Component: Login },
  { path: '/signup', Component: placeholder('Sign up') },
  { path: '/forgot', Component: placeholder('Forgot password') },
  { path: '/reset', Component: placeholder('Reset password') },
  { path: '/verify-email', Component: placeholder('Verify email') },
  {
    path: '/app',
    element: <RequireAuth><AppOutlet /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', Component: placeholder('Dashboard') },
      { path: 'setup', Component: placeholder('Setup') },
      { path: 'keys', Component: placeholder('Keys') },
      { path: 'billing', Component: placeholder('Billing') },
      { path: 'account', Component: placeholder('Account') },
      {
        path: 'admin',
        element: <RequireAdmin><AdminOutlet /></RequireAdmin>,
        children: [
          { index: true, element: <Navigate to="/app/admin/promos" replace /> },
          { path: 'promos', Component: placeholder('Admin promos') },
          { path: 'users', Component: placeholder('Admin users') },
          { path: 'metrics', Component: placeholder('Admin metrics') },
        ],
      },
    ],
  },
  { path: '*', Component: placeholder('Not found') },
];

import { Outlet } from 'react-router-dom';
function AppOutlet() { return <Outlet />; }
function AdminOutlet() { return <Outlet />; }
