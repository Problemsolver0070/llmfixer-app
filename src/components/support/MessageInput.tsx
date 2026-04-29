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
      className="message-input"
    >
      {props.attachments.length > 0 && (
        <div className="message-input-attachments">
          {props.attachments.map((f) => (
            <AttachmentPreview
              key={`${f.name}-${f.lastModified}`}
              file={f}
              onRemove={() => props.onRemoveAttachment(f)}
            />
          ))}
        </div>
      )}
      <div className="message-input-row">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach files"
          className="message-input-attach"
        >
          [ + ATTACH ]
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/markdown"
          onChange={(e) => handlePickedFiles(e.target.files)}
          className="message-input-file"
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
          className="message-input-textarea"
        />
        {props.streaming ? (
          <button
            type="button"
            onClick={props.onStop}
            className="message-input-button message-input-button-stop"
          >
            [ STOP ]
          </button>
        ) : (
          <button
            type="button"
            onClick={commitSend}
            disabled={sendDisabled}
            className="message-input-button message-input-button-send"
          >
            [ SEND ]
          </button>
        )}
      </div>
    </div>
  );
}
