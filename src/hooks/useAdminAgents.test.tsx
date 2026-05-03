import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import {
  useAdminAgents,
  useAdminAgent,
  useUpdateAdminAgent,
} from './useAdminAgents';

beforeEach(() => {
  apiMock.mockReset();
});

const sampleAgent = {
  id: 'agent-installer',
  name: 'Installer',
  description: 'Help with installing the proxy.',
  model: 'claude-opus-4-7-1',
  provider: 'anthropic',
  instructions: 'You are the installer agent.',
  conversation_starters: ['Help me install', 'Where do I start?'],
  model_parameters: { temperature: 0.7 },
};

describe('useAdminAgents', () => {
  it('fetches /v1/admin/agents on mount and exposes items', async () => {
    apiMock.mockResolvedValueOnce({ items: [sampleAgent] });
    const { result } = renderHook(() => useAdminAgents());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMock).toHaveBeenCalledWith('/v1/admin/agents');
    expect(result.current.agents).toHaveLength(1);
    expect(result.current.agents[0].id).toBe('agent-installer');
    expect(result.current.error).toBeNull();
  });

  it('surfaces error and clears agents on failure', async () => {
    apiMock.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAdminAgents());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.agents).toEqual([]);
    expect(result.current.error?.message).toBe('boom');
  });

  it('refresh re-fetches the list', async () => {
    apiMock.mockResolvedValueOnce({ items: [] });
    const { result } = renderHook(() => useAdminAgents());
    await waitFor(() => expect(result.current.loading).toBe(false));
    apiMock.mockResolvedValueOnce({ items: [sampleAgent] });
    await act(async () => {
      await result.current.refresh();
    });
    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(result.current.agents).toHaveLength(1);
  });
});

describe('useAdminAgent', () => {
  it('fetches /v1/admin/agents/:id when id is provided', async () => {
    apiMock.mockResolvedValueOnce(sampleAgent);
    const { result } = renderHook(() => useAdminAgent('agent-installer'));
    await waitFor(() => expect(result.current.agent).not.toBeNull());
    expect(apiMock).toHaveBeenCalledWith('/v1/admin/agents/agent-installer');
    expect(result.current.agent?.name).toBe('Installer');
  });

  it('does not fetch when id is null', async () => {
    const { result } = renderHook(() => useAdminAgent(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMock).not.toHaveBeenCalled();
    expect(result.current.agent).toBeNull();
  });
});

describe('useUpdateAdminAgent', () => {
  it('PATCHes /v1/admin/agents/:id with partial body and reason', async () => {
    apiMock.mockResolvedValueOnce({
      ...sampleAgent,
      instructions: 'New prompt',
    });
    const { result } = renderHook(() => useUpdateAdminAgent());
    await act(async () => {
      const updated = await result.current.update('agent-installer', {
        instructions: 'New prompt',
        reason: 'tweak tone',
      });
      expect(updated.instructions).toBe('New prompt');
    });
    expect(apiMock).toHaveBeenCalledWith('/v1/admin/agents/agent-installer', {
      method: 'PATCH',
      body: { instructions: 'New prompt', reason: 'tweak tone' },
    });
  });

  it('exposes error when the API call fails', async () => {
    apiMock.mockRejectedValueOnce(new Error('forbidden'));
    const { result } = renderHook(() => useUpdateAdminAgent());
    await act(async () => {
      await expect(
        result.current.update('a1', { reason: 'x' }),
      ).rejects.toThrow('forbidden');
    });
    expect(result.current.error?.message).toBe('forbidden');
  });
});
