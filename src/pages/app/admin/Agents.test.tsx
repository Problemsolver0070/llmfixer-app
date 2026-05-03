import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Agents from './Agents';

function makeAgent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'agent-installer',
    name: 'Installer',
    description: 'Help installing.',
    model: 'claude-opus-4-7-1',
    provider: 'anthropic',
    instructions: 'You are the installer.',
    conversation_starters: ['Help me'],
    model_parameters: { temperature: 0.7 },
    ...overrides,
  };
}

const sevenAgents = Array.from({ length: 7 }, (_, i) =>
  makeAgent({
    id: `agent-${i}`,
    name: `Agent ${i}`,
    description: `Agent number ${i}`,
    instructions: `You are agent ${i}.`,
  }),
);

beforeEach(() => {
  apiMock.mockReset();
});

describe('Agents admin page', () => {
  it('renders 7 agents in the left rail', async () => {
    apiMock.mockResolvedValueOnce({ items: sevenAgents });
    render(<Agents />);
    await waitFor(() =>
      expect(screen.getByText('Agents (7)')).toBeInTheDocument(),
    );
    for (let i = 0; i < 7; i++) {
      // Each row is a button (left rail). The selected agent's name also
      // appears in the editor header, so name-by-name we search for the
      // button specifically.
      expect(
        screen.getByRole('button', { name: new RegExp(`Agent ${i}`) }),
      ).toBeInTheDocument();
    }
  });

  it('selecting an agent loads its editor with current values', async () => {
    apiMock.mockResolvedValueOnce({ items: sevenAgents });
    render(<Agents />);
    // First agent auto-selects once the list lands.
    await waitFor(() =>
      expect(screen.getByLabelText(/system prompt/i)).toHaveValue(
        'You are agent 0.',
      ),
    );
    // Switch to a different agent.
    const agent3Btn = screen.getByRole('button', { name: /Agent 3/i });
    await userEvent.click(agent3Btn);
    await waitFor(() =>
      expect(screen.getByLabelText(/system prompt/i)).toHaveValue(
        'You are agent 3.',
      ),
    );
  });

  it('surfaces backend list error with retry', async () => {
    apiMock.mockRejectedValueOnce(new Error('admin gate failed'));
    render(<Agents />);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/admin gate failed/i),
    );
    expect(screen.getByText(/retry/i)).toBeInTheDocument();
  });
});
