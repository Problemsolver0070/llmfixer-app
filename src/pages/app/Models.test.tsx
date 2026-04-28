import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useModels', () => ({ useModels: vi.fn() }));

import { useModels } from '@/hooks/useModels';
import { Models } from './Models';

describe('Models page', () => {
  it('renders skeletons when loading', () => {
    (useModels as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, loading: true, error: null });
    const { container } = render(<Models />);
    expect(container.querySelectorAll('[data-testid="skeleton-card"]').length).toBeGreaterThan(0);
  });

  it('renders an error message when loading fails', () => {
    (useModels as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      loading: false,
      error: new Error('boom'),
    });
    render(<Models />);
    expect(screen.getByText(/couldn't load the catalog/i)).toBeInTheDocument();
  });

  it('renders both sections when data is ready', () => {
    (useModels as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        available: [
          {
            id: 'claude-opus-4-7-1',
            display_name: 'Claude Opus 4.7',
            provider: 'anthropic',
            description: 'a',
          },
        ],
        coming_soon: [
          { provider: 'openai', display_name: 'OpenAI', description: 'b' },
        ],
      },
      loading: false,
      error: null,
    });
    render(<Models />);
    expect(screen.getByRole('heading', { name: /available now/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Claude Opus 4.7' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'OpenAI' })).toBeInTheDocument();
  });
});
