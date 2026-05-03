import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PricingEnterprise from './PricingEnterprise';

describe('PricingEnterprise page', () => {
  it('renders the hero and the contact form', () => {
    render(
      <MemoryRouter>
        <PricingEnterprise />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Enterprise inquiry/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
  });
});
