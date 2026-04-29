import { useEffect, useState } from 'react';

type Props = {
  file: File;
  onRemove: () => void;
};

export function AttachmentPreview({ file, onRemove }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const u = URL.createObjectURL(file);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preview URL must be derived from the prop and revoked on cleanup
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(null);
    return undefined;
  }, [file]);

  const isImage = file.type.startsWith('image/');
  const sizeKb = Math.max(1, Math.round(file.size / 1024));
  const typeLabel =
    file.type === 'application/pdf'
      ? 'PDF'
      : file.type === 'text/plain'
        ? 'TXT'
        : file.type === 'text/markdown'
          ? 'MD'
          : isImage
            ? 'IMG'
            : 'FILE';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: 6,
        background: 'var(--color-bg-rail)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        fontSize: 12,
      }}
    >
      {isImage && url ? (
        <img
          src={url}
          alt={file.name}
          style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }}
        />
      ) : (
        <span
          style={{
            width: 32,
            height: 32,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            fontSize: 10,
            color: 'var(--color-text-dim)',
          }}
        >
          {typeLabel}
        </span>
      )}
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {file.name}
        </span>
        <span style={{ color: 'var(--color-text-dim)', fontSize: 10 }}>
          {typeLabel}, {sizeKb} KB
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-dim)',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        ×
      </button>
    </div>
  );
}
