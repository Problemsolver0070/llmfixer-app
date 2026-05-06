import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

const useSupportRequestsMock = vi.fn();
const createMock = vi.fn();

vi.mock('@/hooks/useSupportRequests', () => ({
  useSupportRequests: () => useSupportRequestsMock(),
  useSupportRequestActions: () => ({ create: createMock }),
}));

import Support from './Support';
import type { SupportRequest } from '@/hooks/useSupportRequests';

function row(overrides: Partial<SupportRequest> = {}): SupportRequest {
  return {
    id: 'r1',
    user_id: 'u1',
    kind: 'bug',
    subject: 'Login broken',
    body: 'Pressing the button does nothing.',
    status: 'open',
    decided_by: null,
    decided_at: null,
    decision_notes: null,
    granted_hours: null,
    created_at: '2026-05-06T10:00:00Z',
    updated_at: '2026-05-06T10:00:00Z',
    ...overrides,
  };
}

function renderWith(stateOverrides: Record<string, unknown> = {}) {
  const refresh = vi.fn().mockResolvedValue(undefined);
  const prepend = vi.fn();
  useSupportRequestsMock.mockReturnValue({
    data: [],
    loading: false,
    error: null,
    refresh,
    prepend,
    ...stateOverrides,
  });
  return { refresh, prepend };
}

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  createMock.mockReset();
  useSupportRequestsMock.mockReset();
});

describe('Support page', () => {
  it('renders the form (kind radios, subject, body, submit)', () => {
    renderWith();
    render(<Support />);
    expect(screen.getByRole('heading', { level: 1, name: /support/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /bug/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /suggestion/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /demo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/details/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit request/i })).toBeInTheDocument();
  });

  it('disables submit when subject or body is empty (validation)', async () => {
    renderWith();
    render(<Support />);
    const submit = screen.getByRole('button', { name: /submit request/i });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/subject/i), 'Hello');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/details/i), 'Some details here.');
    expect(submit).not.toBeDisabled();
  });

  it('shows an empty-state copy when there are no past requests', () => {
    renderWith();
    render(<Support />);
    expect(screen.getByText(/no requests yet\. submit one above\./i)).toBeInTheDocument();
  });

  it('submits the form and calls create() with the trimmed payload, prepends, and toasts success', async () => {
    const created = row({ id: 'just-made', kind: 'suggestion', subject: 'Add darker mode' });
    createMock.mockResolvedValueOnce(created);
    const { prepend } = renderWith();
    render(<Support />);

    await userEvent.click(screen.getByRole('radio', { name: /suggestion/i }));
    await userEvent.type(screen.getByLabelText(/subject/i), '  Add darker mode  ');
    await userEvent.type(screen.getByLabelText(/details/i), '  Some pages still bright.  ');
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith({
      kind: 'suggestion',
      subject: 'Add darker mode',
      body: 'Some pages still bright.',
    });
    expect(prepend).toHaveBeenCalledWith(created);
    expect(toastSuccess).toHaveBeenCalled();
    expect((screen.getByLabelText(/subject/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/details/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('surfaces a 409 conflict as an error toast and does not clear the form', async () => {
    const conflict = Object.assign(new Error('open exists'), {
      type: 'conflict_open_request_exists',
      status: 409,
    });
    createMock.mockRejectedValueOnce(conflict);
    const { refresh } = renderWith();
    render(<Support />);

    await userEvent.type(screen.getByLabelText(/subject/i), 'Login broken');
    await userEvent.type(screen.getByLabelText(/details/i), 'Pressing the button does nothing.');
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/already have an open bug request/i);
    expect(refresh).toHaveBeenCalled();
    // Form is preserved on conflict so the user can edit and retry.
    expect((screen.getByLabelText(/subject/i) as HTMLInputElement).value).toBe('Login broken');
  });

  it('surfaces a 429 as the rate-limit toast', async () => {
    const limited = Object.assign(new Error('slow down'), {
      type: 'rate_limited',
      status: 429,
    });
    createMock.mockRejectedValueOnce(limited);
    renderWith();
    render(<Support />);

    await userEvent.type(screen.getByLabelText(/subject/i), 'Idea X');
    await userEvent.type(screen.getByLabelText(/details/i), 'It would be cool if Y.');
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/too many requests/i);
  });

  it('disables submit and shows an inline hint when an open same-kind request already exists', () => {
    renderWith({ data: [row({ kind: 'bug', status: 'open' })] });
    render(<Support />);
    // Bug is the default selected kind, so the same-kind-open guard fires.
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
    expect(
      screen.getByText(/already have an open bug request/i),
    ).toBeInTheDocument();
  });

  it('renders the past-requests list with kind + status badges and subject', () => {
    renderWith({
      data: [
        row({ id: 'a', kind: 'bug', status: 'open', subject: 'Login broken' }),
        row({ id: 'b', kind: 'demo', status: 'approved', subject: 'Trying things out', granted_hours: 24, decided_at: '2026-05-05T08:00:00Z' }),
      ],
    });
    render(<Support />);
    expect(screen.getByText('Login broken')).toBeInTheDocument();
    expect(screen.getByText('Trying things out')).toBeInTheDocument();
    expect(screen.getAllByText(/^bug$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^demo$/i).length).toBeGreaterThan(0);
    // Status badges
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('expands a row on click and shows the full body and decision notes', async () => {
    renderWith({
      data: [
        row({
          id: 'a',
          kind: 'demo',
          status: 'approved',
          subject: 'Demo please',
          body: 'Line one\nLine two',
          granted_hours: 12,
          decided_at: '2026-05-05T08:00:00Z',
          decision_notes: 'Approved with 12 hours of comp.',
        }),
      ],
    });
    render(<Support />);
    const trigger = screen.getByRole('button', { name: /demo please/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    act(() => {
      fireEvent.click(trigger);
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/line one/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved with 12 hours of comp\./)).toBeInTheDocument();
    expect(screen.getByText(/12h granted/i)).toBeInTheDocument();
  });
});
