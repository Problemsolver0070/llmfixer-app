import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CreateKeyForm } from './CreateKeyForm';

describe('CreateKeyForm', () => {
  it('submits the label and shows the cleartext key once', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'k1', key_prefix: 'opto_a', key: 'opto_a_full_secret' });
    render(<CreateKeyForm onCreate={create} onDone={() => {}} />);
    await userEvent.type(screen.getByLabelText(/label/i), 'production');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(create).toHaveBeenCalledWith('production');
    expect(await screen.findByText('opto_a_full_secret')).toBeInTheDocument();
    expect(screen.getByText(/save it now/i)).toBeInTheDocument();
  });

  it('Done button calls onDone after the key has been shown', async () => {
    const onDone = vi.fn();
    const create = vi.fn().mockResolvedValue({ id: 'k1', key_prefix: 'opto_a', key: 'opto_a_full' });
    render(<CreateKeyForm onCreate={create} onDone={onDone} />);
    await userEvent.type(screen.getByLabelText(/label/i), 'p');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    await screen.findByText('opto_a_full');
    await userEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onDone).toHaveBeenCalled();
  });

  it('Copy button writes the full key to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const create = vi.fn().mockResolvedValue({ id: 'k1', key_prefix: 'opto_a', key: 'opto_a_full_secret' });
      render(<CreateKeyForm onCreate={create} onDone={() => {}} />);
      await userEvent.type(screen.getByLabelText(/label/i), 'production');
      await userEvent.click(screen.getByRole('button', { name: /create/i }));
      await screen.findByText('opto_a_full_secret');
      await userEvent.click(screen.getByRole('button', { name: /^copy$/i }));
      expect(writeText).toHaveBeenCalledWith('opto_a_full_secret');
      expect(await screen.findByRole('button', { name: /copied/i })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('shows a manual-copy hint when the clipboard write rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const create = vi.fn().mockResolvedValue({ id: 'k1', key_prefix: 'opto_a', key: 'opto_a_full_secret' });
      render(<CreateKeyForm onCreate={create} onDone={() => {}} />);
      await userEvent.type(screen.getByLabelText(/label/i), 'production');
      await userEvent.click(screen.getByRole('button', { name: /create/i }));
      await screen.findByText('opto_a_full_secret');
      await userEvent.click(screen.getByRole('button', { name: /^copy$/i }));
      expect(writeText).toHaveBeenCalledWith('opto_a_full_secret');
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Could not copy. Select the key and copy manually.');
      expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /copied/i })).not.toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
