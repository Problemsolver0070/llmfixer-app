import { useRef, useState } from 'react';
import { AttachmentPreview } from './AttachmentPreview';

type Props = {
  onSend: (content: string) => void;
  streaming: boolean;
  onStop: () => void;
  attachments: File[];
  onAttach: (file: File) => void;
  onRemoveAttachment: (file: File) => void;
};

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
]);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

export function MessageInput(props: Props) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function commitSend() {
    const t = text.trim();
    if (!t && props.attachments.length === 0) return;
    if (props.streaming) return;
    props.onSend(t);
    setText('');
  }

  function handlePickedFiles(files: FileList | null) {
    if (!files) return;
    let added = 0;
    for (const f of Array.from(files)) {
      if (props.attachments.length + added >= MAX_ATTACHMENTS) break;
      if (!ALLOWED_MIME.has(f.type)) {
        window.alert(`Unsupported file type: ${f.type || 'unknown'}`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        window.alert(`File too large: ${f.name} (max 10MB)`);
        continue;
      }
      props.onAttach(f);
      added += 1;
    }
  }

  const sendDisabled = !text.trim() && props.attachments.length === 0;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        handlePickedFiles(e.dataTransfer.files);
      }}
      style={{
        borderTop: '1px solid var(--color-border)',
        padding: 10,
        background: 'var(--color-bg-rail)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {props.attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {props.attachments.map((f) => (
            <AttachmentPreview
              key={`${f.name}-${f.lastModified}`}
              file={f}
              onRemove={() => props.onRemoveAttachment(f)}
            />
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach files"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '6px 10px',
            cursor: 'pointer',
            color: 'var(--color-text)',
            fontSize: 13,
          }}
        >
          Attach
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/markdown"
          onChange={(e) => handlePickedFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitSend();
            }
          }}
          placeholder="Ask anything about The Fixer"
          rows={1}
          style={{
            flex: 1,
            minHeight: 36,
            maxHeight: 200,
            resize: 'vertical',
            padding: '8px 10px',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />
        {props.streaming ? (
          <button
            type="button"
            onClick={props.onStop}
            style={{
              padding: '8px 14px',
              background: 'var(--color-danger)',
              color: 'var(--color-bg)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={commitSend}
            disabled={sendDisabled}
            style={{
              padding: '8px 14px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              border: 'none',
              borderRadius: 6,
              cursor: sendDisabled ? 'not-allowed' : 'pointer',
              fontSize: 13,
              opacity: sendDisabled ? 0.5 : 1,
            }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
