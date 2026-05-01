import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EnterpriseContactForm } from './EnterpriseContactForm';

describe('EnterpriseContactForm', () => {
  it('builds a mailto: href with the form contents', () => {
    render(<EnterpriseContactForm />);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByPlaceholderText(/team size/i), { target: { value: '14' } });
    fireEvent.change(screen.getByPlaceholderText(/anything we should know/i), { target: { value: 'SOC2 needed.' } });
    const link = screen.getByRole('link', { name: /send/i });
    expect(link.getAttribute('href')).toContain('mailto:venu-kumar@thefixer.in');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('Ada');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('14');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('SOC2 needed.');
  });
});
