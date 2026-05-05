import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TheFixerAiCard } from './TheFixerAiCard';

describe('TheFixerAiCard', () => {
  it('renders the CTA for any signed-in user', () => {
    render(<TheFixerAiCard />);
    expect(screen.getByText(/the fixer ai/i)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://chat.thefixer.in');
  });
});
