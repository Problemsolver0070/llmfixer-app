import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAdminUsers } from '@/hooks/useAdminUsers';

export default function Users() {
  const { results, loading, search } = useAdminUsers();
  const [q, setQ] = useState('');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search(q);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Search users"
              placeholder="Search by email"
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
            />
          </div>
          <div style={{ width: 120 }}>
            <Button type="submit" loading={loading} loadingLabel="...">Search</Button>
          </div>
        </form>
      </Card>

      <Card style={{ padding: 0 }}>
        {results.length === 0 ? (
          <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>No results.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Email', 'Role', 'Status', 'Trial ends', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      color: 'var(--color-text-dim)',
                      textTransform: 'uppercase',
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((u) => (
                <tr key={u.id}>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{u.status}</td>
                  <td style={td}>
                    {u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString() : ''}
                  </td>
                  <td style={td}>
                    <Link
                      to={`/app/admin/users/${u.id}`}
                      style={{ color: 'var(--color-link)', fontSize: 12 }}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

const td: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
};
