import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { AgentEditor } from '@/components/admin/AgentEditor';
import { useAdminAgents, type Agent } from '@/hooks/useAdminAgents';

export default function Agents() {
  const { agents, loading, error, refresh } = useAdminAgents();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default-select the first agent once the list loads. Keep the id-based
  // selection (not the object) so a refresh that returns the same id but a
  // new object reference still resolves to the new payload below.
  useEffect(() => {
    if (selectedId === null && agents.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(agents[0].id);
    }
  }, [agents, selectedId]);

  const selected = agents.find((a) => a.id === selectedId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 8px' }}>
          Agent prompts
        </h2>
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-text-dim)',
            margin: 0,
          }}
        >
          The seven LibreChat agents that power the in-app support and Setup
          chat. Edits proxy through the backend, which writes an audit log
          entry before forwarding to LibreChat. The reason field is required.
        </p>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 320px) 1fr',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <AgentList
          agents={agents}
          loading={loading}
          error={error}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRetry={() => void refresh()}
        />
        <Card>
          {!selected && !loading && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-dim)',
                margin: 0,
              }}
            >
              Pick an agent from the list to edit its prompt.
            </p>
          )}
          {!selected && loading && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-dim)',
                margin: 0,
              }}
            >
              Loading...
            </p>
          )}
          {selected && (
            <AgentEditor
              key={selected.id}
              agent={selected}
              onSaved={() => void refresh()}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
  error: Error | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

function AgentList({
  agents,
  loading,
  error,
  selectedId,
  onSelect,
  onRetry,
}: AgentListProps) {
  return (
    <Card style={{ padding: 0 }}>
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--color-text-dim)',
            textTransform: 'uppercase',
          }}
        >
          Agents ({agents.length})
        </p>
      </header>

      {loading && (
        <p style={{ padding: 16, color: 'var(--color-text-dim)' }}>Loading...</p>
      )}
      {error && (
        <div style={{ padding: 16 }}>
          <p
            role="alert"
            style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}
          >
            {error.message}
          </p>
          <button
            type="button"
            onClick={onRetry}
            style={{
              marginTop: 8,
              background: 'transparent',
              border: 0,
              color: 'var(--color-link)',
              cursor: 'pointer',
              fontSize: 11,
              padding: 0,
            }}
          >
            retry
          </button>
        </div>
      )}
      {!loading && !error && agents.length === 0 && (
        <p style={{ padding: 16, color: 'var(--color-text-dim)' }}>No agents.</p>
      )}

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          maxHeight: 540,
          overflowY: 'auto',
        }}
      >
        {agents.map((a) => {
          const active = a.id === selectedId;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                aria-pressed={active}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: active ? 'var(--color-bg)' : 'transparent',
                  borderLeft: active
                    ? '2px solid var(--color-link)'
                    : '2px solid transparent',
                  border: 0,
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  color: 'var(--color-text)',
                }}
              >
                <span style={{ fontSize: 13 }}>{a.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: 'var(--color-text-dim)',
                  }}
                >
                  {a.provider} / {a.model}
                </span>
                {a.description && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-dim)',
                      lineHeight: 1.4,
                    }}
                  >
                    {a.description.length > 80
                      ? `${a.description.slice(0, 77)}...`
                      : a.description}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 10,
                    color: active
                      ? 'var(--color-link)'
                      : 'var(--color-text-dim)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: 2,
                  }}
                >
                  {active ? 'editing' : 'edit'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
