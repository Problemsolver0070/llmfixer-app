import { useState } from 'react';
import { api } from '@/lib/api';

export type AttachmentRef = {
  name: string;
  type: string;
  size: number;
  storage_path: string;
};

const MAX_BYTES = 10 * 1024 * 1024;

export function useUploadAttachment() {
  const [uploading, setUploading] = useState(false);

  async function upload(args: { threadId: string; file: File }): Promise<AttachmentRef> {
    if (args.file.size > MAX_BYTES) {
      throw new Error('Attachment too large: max 10MB per file');
    }
    setUploading(true);
    try {
      const presigned = await api<{ upload_url: string; storage_path: string; headers: Record<string, string> }>(
        '/v1/support/attachments/upload-url',
        {
          method: 'POST',
          body: { name: args.file.name, type: args.file.type, size: args.file.size, thread_id: args.threadId },
        },
      );
      const res = await fetch(presigned.upload_url, {
        method: 'PUT',
        headers: presigned.headers,
        body: args.file,
      });
      if (!res.ok) {
        throw new Error(`Storage upload failed: ${res.status}`);
      }
      return {
        name: args.file.name,
        type: args.file.type,
        size: args.file.size,
        storage_path: presigned.storage_path,
      };
    } finally {
      setUploading(false);
    }
  }

  return { uploading, upload };
}
