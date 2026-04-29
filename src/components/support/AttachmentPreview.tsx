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
    <div className="attachment-chip">
      <div className="attachment-chip-thumb">
        {isImage && url ? (
          <img
            src={url}
            alt={file.name}
            className="attachment-chip-img"
          />
        ) : (
          <span className="attachment-chip-typebox">{typeLabel}</span>
        )}
        <span
          className="attachment-chip-corner-label"
          aria-hidden="true"
        >
          {typeLabel}
        </span>
      </div>
      <span className="attachment-chip-meta">
        <span className="attachment-chip-name">{file.name}</span>
        <span className="attachment-chip-detail">
          {typeLabel}, {sizeKb} KB
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="attachment-chip-remove"
      >
        ×
      </button>
    </div>
  );
}
