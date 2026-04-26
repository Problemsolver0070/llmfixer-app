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
});
