import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownMessage } from './MarkdownMessage';

describe('MarkdownMessage', () => {
  it('renders fenced code blocks', () => {
    const { container } = render(<MarkdownMessage>{'```bash\necho hi\n```'}</MarkdownMessage>);
    const code = container.querySelector('pre > code');
    expect(code).not.toBeNull();
    // rehype-highlight wraps tokens in spans; verify the rendered text content
    // matches even when split across nodes.
    expect(code?.textContent).toContain('echo hi');
    expect(code?.className).toContain('language-bash');
  });

  it('renders lists', () => {
    render(<MarkdownMessage>{'- one\n- two\n- three'}</MarkdownMessage>);
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
  });

  it('renders inline code', () => {
    render(<MarkdownMessage>{'Use `opto_abc...` as your bearer.'}</MarkdownMessage>);
    expect(screen.getByText('opto_abc...')).toBeInTheDocument();
  });
});
