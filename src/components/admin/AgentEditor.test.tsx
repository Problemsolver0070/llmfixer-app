import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() },
}));

import { AgentEditor } from './AgentEditor';

const baseAgent = {
  id: 'agent-installer',
  name: 'Installer',
  description: 'Help installing.',
  model: 'claude-opus-4-7-1',
  provider: 'anthropic',
  instructions: 'You are the installer.\nLine two.',
  conversation_starters: ['Help me install'],
  model_parameters: { temperature: 0.7 },
};

beforeEach(() => {
  apiMock.mockReset();
  toastSuccess.mockReset();
});

describe('AgentEditor', () => {
  it('hydrates with current values', () => {
    render(<AgentEditor agent={baseAgent} />);
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      'Help installing.',
    );
    expect(screen.getByLabelText(/system prompt/i)).toHaveValue(
      'You are the installer.\nLine two.',
    );
    expect(screen.getByDisplayValue('Help me install')).toBeInTheDocument();
  });

  it('rejects save when reason is missing', async () => {
    render(<AgentEditor agent={baseAgent} />);
    const ta = screen.getByLabelText(/system prompt/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'changed');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /reason is required/i,
    );
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('shows the diff modal on save and PATCHes only changed fields after confirm', async () => {
    apiMock.mockResolvedValueOnce({
      ...baseAgent,
      instructions: 'New prompt body',
    });
    const onSaved = vi.fn();
    render(<AgentEditor agent={baseAgent} onSaved={onSaved} />);

    const ta = screen.getByLabelText(/system prompt/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'New prompt body');
    await userEvent.type(screen.getByLabelText(/reason/i), 'tone tweak');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    // Diff modal renders.
    expect(await screen.findByTestId('diff-preview')).toBeInTheDocument();
    expect(screen.getByText(/Reason:/i)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /confirm save/i }),
    );

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    expect(apiMock).toHaveBeenCalledWith('/v1/admin/agents/agent-installer', {
      method: 'PATCH',
      body: { instructions: 'New prompt body', reason: 'tone tweak' },
    });
    expect(toastSuccess).toHaveBeenCalledWith('Updated Installer');
    expect(onSaved).toHaveBeenCalled();
  });

  it('cancel in the diff modal does not fire PATCH', async () => {
    render(<AgentEditor agent={baseAgent} />);
    const ta = screen.getByLabelText(/system prompt/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'changed');
    await userEvent.type(screen.getByLabelText(/reason/i), 'why');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByTestId('diff-preview')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(apiMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('diff-preview')).not.toBeInTheDocument();
  });

  it('reset reverts unsaved changes', async () => {
    render(<AgentEditor agent={baseAgent} />);
    const ta = screen.getByLabelText(/system prompt/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'temporary');
    expect(ta).toHaveValue('temporary');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(ta).toHaveValue('You are the installer.\nLine two.');
  });

  it('disables save when there are no pending changes', () => {
    render(<AgentEditor agent={baseAgent} />);
    const save = screen.getByRole('button', { name: /^save$/i });
    expect(save).toBeDisabled();
  });

  it('surfaces backend error inline', async () => {
    apiMock.mockRejectedValueOnce(new Error('forbidden'));
    render(<AgentEditor agent={baseAgent} />);
    const ta = screen.getByLabelText(/system prompt/i);
    await userEvent.clear(ta);
    await userEvent.type(ta, 'New body');
    await userEvent.type(screen.getByLabelText(/reason/i), 'r');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByTestId('diff-preview')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /confirm save/i }),
    );

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent(/forbidden/i);
  });

  it('lets the operator add and remove conversation starters', async () => {
    render(<AgentEditor agent={baseAgent} />);
    expect(screen.getAllByRole('textbox', { name: /Conversation starter/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /add starter/i }));
    expect(screen.getAllByRole('textbox', { name: /Conversation starter/ })).toHaveLength(2);
    const removeBtn = screen.getAllByRole('button', { name: /Remove starter 2/i })[0];
    await userEvent.click(removeBtn);
    expect(screen.getAllByRole('textbox', { name: /Conversation starter/ })).toHaveLength(1);
  });
});
