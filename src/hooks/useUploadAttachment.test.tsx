import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { api } from '@/lib/api';
import { useUploadAttachment } from './useUploadAttachment';

afterEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
});

describe('useUploadAttachment', () => {
  it('mints a presigned URL and PUTs the file', async () => {
    (api as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      upload_url: 'https://storage.example/upload?token=abc',
      storage_path: 'u1/t1/xyz-screenshot.png',
      headers: { 'Content-Type': 'image/png' },
    });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

    const file = new File([new Uint8Array([1, 2, 3])], 'screenshot.png', { type: 'image/png' });
    const { result } = renderHook(() => useUploadAttachment());
    let ref: unknown;
    await act(async () => { ref = await result.current.upload({ threadId: 't1', file }); });

    expect(api).toHaveBeenCalledWith('/v1/support/attachments/upload-url', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ name: 'screenshot.png', type: 'image/png', size: 3, thread_id: 't1' }),
    }));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example/upload?token=abc',
      expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'image/png' } }),
    );
    expect(ref).toMatchObject({ name: 'screenshot.png', type: 'image/png', size: 3, storage_path: 'u1/t1/xyz-screenshot.png' });
  });

  it('rejects files larger than 10MB before any network call', async () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'huge.bin', { type: 'image/png' });
    const { result } = renderHook(() => useUploadAttachment());
    await act(async () => {
      await expect(result.current.upload({ threadId: 't1', file: big })).rejects.toThrow(/too large|10MB/i);
    });
    expect(api).not.toHaveBeenCalled();
  });
});
