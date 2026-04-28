import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

import { toast } from 'sonner';
import { ModelCard } from './ModelCard';

const sample = {
  id: 'claude-opus-4-7-1',
  display_name: 'Claude Opus 4.7',
  provider: 'anthropic',
  description: 'top-tier reasoning',
};

describe('ModelCard', () => {
  it('renders display name, provider badge, model id, and description', () => {
    render(<ModelCard entry={sample} />);
    expect(screen.getByRole('heading', { name: 'Claude Opus 4.7' })).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('claude-opus-4-7-1')).toBeInTheDocument();
    expect(screen.getByText('top-tier reasoning')).toBeInTheDocument();
  });

  it('copies the model id to the clipboard and shows a toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      render(<ModelCard entry={sample} />);
      await userEvent.click(screen.getByRole('button', { name: /copy.*claude-opus-4-7-1/i }));
      expect(writeText).toHaveBeenCalledWith('claude-opus-4-7-1');
      expect(toast.success).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
