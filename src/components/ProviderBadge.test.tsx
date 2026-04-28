import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProviderBadge } from './ProviderBadge';

describe('ProviderBadge', () => {
  it('renders Anthropic label for the anthropic slug', () => {
    render(<ProviderBadge provider="anthropic" />);
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
  });

  it('renders OpenAI label for the openai slug', () => {
    render(<ProviderBadge provider="openai" />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('renders Google Gemini label for the gemini slug', () => {
    render(<ProviderBadge provider="gemini" />);
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
  });

  it('renders xAI Grok label for the xai slug', () => {
    render(<ProviderBadge provider="xai" />);
    expect(screen.getByText('xAI Grok')).toBeInTheDocument();
  });

  it('falls back to the raw slug for an unknown provider', () => {
    render(<ProviderBadge provider="acme-llm" />);
    expect(screen.getByText('acme-llm')).toBeInTheDocument();
  });
});
