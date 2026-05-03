import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { Brand } from './Brand';

describe('Brand', () => {
  it('renders the brand name', () => {
    render(
      <MemoryRouter>
        <Brand />
      </MemoryRouter>,
    );
    expect(screen.getByText('The Fixer')).toBeInTheDocument();
  });

  it('shows a gold dot before the wordmark', () => {
    render(
      <MemoryRouter>
        <Brand />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('brand-dot')).toBeInTheDocument();
  });

  it('wraps the wordmark in a link to the dashboard', () => {
    render(
      <MemoryRouter>
        <Brand />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/app/dashboard');
  });
});
