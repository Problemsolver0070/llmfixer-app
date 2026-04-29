import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentPreview } from './AttachmentPreview';

describe('AttachmentPreview', () => {
  it('renders an image thumbnail with object URL', () => {
    const file = new File([new Uint8Array([1, 2])], 'screenshot.png', { type: 'image/png' });
    render(<AttachmentPreview file={file} onRemove={vi.fn()} />);
    expect(screen.getByAltText('screenshot.png')).toBeInTheDocument();
  });

  it('renders a file icon for PDF', () => {
    const file = new File([new Uint8Array([1, 2])], 'report.pdf', { type: 'application/pdf' });
    render(<AttachmentPreview file={file} onRemove={vi.fn()} />);
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    // PDF label appears in both the icon badge and the size label.
    const pdfMatches = screen.getAllByText(/PDF/i);
    expect(pdfMatches.length).toBeGreaterThan(0);
  });

  it('fires onRemove when remove button clicked', async () => {
    const file = new File([new Uint8Array([1, 2])], 'a.txt', { type: 'text/plain' });
    const onRemove = vi.fn();
    render(<AttachmentPreview file={file} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: /remove a.txt/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
