import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { RequireAuth, RequireAdmin } from '@/lib/auth';
import { AppShell } from '@/components/shell/AppShell';
import Login from '@/pages/public/Login';
import SignUp from '@/pages/public/SignUp';
import Forgot from '@/pages/public/Forgot';
import Reset from '@/pages/public/Reset';
import VerifyEmail from '@/pages/public/VerifyEmail';
import Dashboard from '@/pages/app/Dashboard';

const placeholder = (label: string) => () => (
  <div style={{ padding: 24 }}>
    <p>{label}</p>
  </div>
);

export const routes: RouteObject[] = [
  { path: '/', Component: placeholder('Landing') },
  { path: '/login', Component: Login },
  { path: '/signup', Component: SignUp },
  { path: '/forgot', Component: Forgot },
  { path: '/reset', Component: Reset },
  { path: '/verify-email', Component: VerifyEmail },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppShell><Outlet /></AppShell>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', Component: Dashboard },
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

function AdminOutlet() { return <Outlet />; }
