import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  it('disables Send when content is empty and no attachments', () => {
    const onSend = vi.fn();
    render(
      <MessageInput
        onSend={onSend}
        streaming={false}
        onStop={vi.fn()}
        attachments={[]}
        onAttach={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('enables Send when text is present', async () => {
    const onSend = vi.fn();
    render(
      <MessageInput
        onSend={onSend}
        streaming={false}
        onStop={vi.fn()}
        attachments={[]}
        onAttach={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByRole('textbox'), 'hi');
    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled();
  });

  it('shows Stop button while streaming', () => {
    render(
      <MessageInput
        onSend={vi.fn()}
        streaming={true}
        onStop={vi.fn()}
        attachments={[]}
        onAttach={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('fires onSend with text and clears the textarea', async () => {
    const onSend = vi.fn();
    render(
      <MessageInput
        onSend={onSend}
        streaming={false}
        onStop={vi.fn()}
        attachments={[]}
        onAttach={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );
    const ta = screen.getByRole('textbox');
    await userEvent.type(ta, 'hi');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith('hi');
    expect((ta as HTMLTextAreaElement).value).toBe('');
  });

  it('Enter sends, Shift+Enter inserts newline', async () => {
    const onSend = vi.fn();
    render(
      <MessageInput
        onSend={onSend}
        streaming={false}
        onStop={vi.fn()}
        attachments={[]}
        onAttach={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );
    const ta = screen.getByRole('textbox');
    await userEvent.type(ta, 'hi');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onSend).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalled();
  });
});
