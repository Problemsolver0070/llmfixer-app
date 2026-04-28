import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComingSoonCard } from './ComingSoonCard';

const sample = {
  provider: 'openai',
  display_name: 'OpenAI',
  description: 'GPT family models from OpenAI.',
};

describe('ComingSoonCard', () => {
  it('renders display name, provider badge, description, and the coming-soon pill', () => {
    render(<ComingSoonCard teaser={sample} />);
    expect(screen.getByRole('heading', { name: 'OpenAI' })).toBeInTheDocument();
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('GPT family models from OpenAI.')).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('renders no copy button (no interactive elements)', () => {
    render(<ComingSoonCard teaser={sample} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
