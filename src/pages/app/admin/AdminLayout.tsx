import { Outlet, NavLink, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/app/admin/promos', label: 'Promos' },
  { to: '/app/admin/users', label: 'Users' },
  { to: '/app/admin/metrics', label: 'Metrics' },
];

export function AdminLayout() {
  const loc = useLocation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Admin</h1>
        <nav style={{ display: 'flex', gap: 16, marginTop: 12, borderBottom: '1px solid var(--color-border)' }}>
          {tabs.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            return (
              <NavLink
                key={t.to}
                to={t.to}
                data-active={active ? 'true' : 'false'}
                style={{
                  fontSize: 13,
                  padding: '8px 0',
                  marginBottom: -1,
                  color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
                  borderBottom: active ? '2px solid var(--color-link)' : '2px solid transparent',
                }}
              >
                {t.label}
              </NavLink>
            );
          })}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
