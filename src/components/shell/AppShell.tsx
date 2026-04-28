import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Brand } from './Brand';
import { UserMenu } from './UserMenu';
import { useAccount } from '@/hooks/useAccount';

const TABS = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/setup', label: 'Setup' },
  { to: '/app/models', label: 'Models' },
  { to: '/app/keys', label: 'Keys' },
  { to: '/app/billing', label: 'Billing' },
  { to: '/app/account', label: 'Account' },
];

function Tab({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(to + '/');
  return (
    <NavLink
      to={to}
      data-active={active ? 'true' : 'false'}
      style={{
        fontSize: 13,
        padding: '6px 0',
        color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
        borderBottom: active ? '1px solid var(--color-accent)' : '1px solid transparent',
      }}
    >
      {label}
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useAccount();
  const isAdmin = data?.user.role === 'admin';
  const tabs = isAdmin ? [...TABS, { to: '/app/admin', label: 'Admin' }] : TABS;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 32px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-rail)',
        }}
      >
        <Brand />
        <nav style={{ display: 'flex', gap: 24 }}>
          {tabs.map((t) => (
            <Tab key={t.to} to={t.to} label={t.label} />
          ))}
        </nav>
        {data && <UserMenu email={data.user.email} />}
      </header>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px' }}>{children}</main>
    </div>
  );
}
