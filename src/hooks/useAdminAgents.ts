import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Agent record returned by the LibreChat-proxy admin endpoints.
 *
 * The seven agents are owned in LibreChat's mongo store; the backend at
 * `/v1/admin/agents` is a thin proxy that enforces admin + MFA, persists an
 * audit log entry, then forwards to the upstream Agents API. Field shape is
 * the LibreChat shape, so be conservative when adding new fields here: keep
 * the unknown bits in `[key: string]: unknown` rather than typing them.
 */
export interface AgentModelParameters {
  temperature?: number | null;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  model: string;
  provider: string;
  instructions: string;
  conversation_starters: string[];
  model_parameters: AgentModelParameters;
}

export interface AgentListResponse {
  items: Agent[];
}

export interface UpdateAgentInput {
  instructions?: string;
  description?: string | null;
  conversation_starters?: string[];
  model_parameters_temperature?: number | null;
  reason: string;
}

/**
 * Fetch the full list of agents from `GET /v1/admin/agents`. Always 7 in v1.
 *
 * The hook re-fetches on mount only; call `refresh()` after a successful
 * PATCH if you want the cached list to pick up the new values.
 */
export function useAdminAgents(): {
  agents: Agent[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<AgentListResponse>('/v1/admin/agents');
      setAgents(res.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
  }, [fetchOnce]);

  return { agents, loading, error, refresh: fetchOnce };
}

/**
 * Fetch a single agent's full config from `GET /v1/admin/agents/:id`.
 *
 * The list endpoint already returns the full shape, but the editor uses this
 * hook to re-pull after a PATCH so what's rendered is exactly what LibreChat
 * persisted (including any fields the backend normalised).
 */
export function useAdminAgent(id: string | null): {
  agent: Agent | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!id) {
      setAgent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<Agent>(`/v1/admin/agents/${encodeURIComponent(id)}`);
      setAgent(res);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
  }, [fetchOnce]);

  return { agent, loading, error, refresh: fetchOnce };
}

/**
 * PATCH `/v1/admin/agents/:id` with a partial update + reason for audit log.
 *
 * Caller is expected to compute the diff and only include the fields that
 * actually changed; the backend does not no-op on unchanged fields.
 */
export function useUpdateAdminAgent(): {
  update: (id: string, input: UpdateAgentInput) => Promise<Agent>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (id: string, input: UpdateAgentInput) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<Agent>(
          `/v1/admin/agents/${encodeURIComponent(id)}`,
          {
            method: 'PATCH',
            body: input,
          },
        );
        return res;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { update, loading, error };
}
