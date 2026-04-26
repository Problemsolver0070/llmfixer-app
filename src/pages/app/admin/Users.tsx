import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAdminUsers, type AdminUserRow } from '@/hooks/useAdminUsers';

export default function Users() {
  const { results, loading, search, comp, extendTrial, lock } = useAdminUsers();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

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
                    <button
                      onClick={() => setSelected(u)}
                      style={{ background: 'transparent', border: 0, color: 'var(--color-link)', cursor: 'pointer', fontSize: 12 }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.email ?? ''}>
        {selected && (
          <ManageUser
            user={selected}
            onComp={(d) => comp(selected.id, d)}
            onExtend={(d) => extendTrial(selected.id, d)}
            onLock={() => lock(selected.id)}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function ManageUser(props: {
  user: AdminUserRow;
  onComp: (days: number) => Promise<void>;
  onExtend: (days: number) => Promise<void>;
  onLock: () => Promise<void>;
  onClose: () => void;
}) {
  const [days, setDays] = useState('14');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
        Status: <strong>{props.user.status}</strong>{' '}
        Role: <strong>{props.user.role}</strong>
      </div>
      <Input
        label="Days"
        type="number"
        value={days}
        onChange={(e) => setDays(e.currentTarget.value)}
      />
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="ghost" onClick={() => props.onExtend(Number.parseInt(days, 10)).then(props.onClose)}>
          Extend trial
        </Button>
        <Button variant="ghost" onClick={() => props.onComp(Number.parseInt(days, 10)).then(props.onClose)}>
          Comp
        </Button>
        <Button variant="danger" onClick={() => props.onLock().then(props.onClose)}>
          Lock account
        </Button>
      </div>
      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, color: 'var(--color-link)' }}
      >
        Open in Supabase Studio for raw edits
      </a>
    </div>
  );
}

const td: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
};
