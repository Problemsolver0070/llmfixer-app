import {
  type CSSProperties,
  type FormEvent,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  type Agent,
  type UpdateAgentInput,
  useUpdateAdminAgent,
} from '@/hooks/useAdminAgents';

interface Props {
  agent: Agent;
  /**
   * Called with the server's updated agent payload after a successful PATCH,
   * so the parent (Agents page) can replace the cached row + clear stale
   * editor state.
   */
  onSaved?: (next: Agent) => void;
}

interface FormState {
  instructions: string;
  description: string;
  conversationStarters: string[];
  temperature: number;
  reason: string;
}

interface ChangedField {
  key: 'instructions' | 'description' | 'conversation_starters' | 'temperature';
  label: string;
  oldValue: string;
  newValue: string;
}

const TEMP_MIN = 0;
const TEMP_MAX = 2;
const TEMP_STEP = 0.1;

function fromAgent(agent: Agent): FormState {
  return {
    instructions: agent.instructions ?? '',
    description: agent.description ?? '',
    conversationStarters: [...(agent.conversation_starters ?? [])],
    temperature: agent.model_parameters?.temperature ?? 0.7,
    reason: '',
  };
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Detect which fields changed between the loaded agent and current form
 * state, and return both a render-friendly list (for the diff modal) and a
 * minimal PATCH body (only changed fields plus reason).
 */
function computeDiff(
  agent: Agent,
  form: FormState,
): { fields: ChangedField[]; patch: UpdateAgentInput } {
  const fields: ChangedField[] = [];
  const patch: UpdateAgentInput = { reason: form.reason.trim() };

  if (form.instructions !== (agent.instructions ?? '')) {
    fields.push({
      key: 'instructions',
      label: 'System prompt',
      oldValue: agent.instructions ?? '',
      newValue: form.instructions,
    });
    patch.instructions = form.instructions;
  }

  const trimmedDescription = form.description.trim();
  const originalDescription = (agent.description ?? '').trim();
  if (trimmedDescription !== originalDescription) {
    fields.push({
      key: 'description',
      label: 'Description',
      oldValue: agent.description ?? '',
      newValue: form.description,
    });
    patch.description = trimmedDescription === '' ? null : form.description;
  }

  const cleanedStarters = form.conversationStarters
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const originalStarters = agent.conversation_starters ?? [];
  if (!arraysEqual(cleanedStarters, originalStarters)) {
    fields.push({
      key: 'conversation_starters',
      label: 'Conversation starters',
      oldValue: originalStarters.join('\n'),
      newValue: cleanedStarters.join('\n'),
    });
    patch.conversation_starters = cleanedStarters;
  }

  const originalTemp = agent.model_parameters?.temperature ?? 0.7;
  if (Math.abs(form.temperature - originalTemp) > 1e-9) {
    fields.push({
      key: 'temperature',
      label: 'Temperature',
      oldValue: originalTemp.toFixed(1),
      newValue: form.temperature.toFixed(1),
    });
    patch.model_parameters_temperature = form.temperature;
  }

  return { fields, patch };
}

export function AgentEditor({ agent, onSaved }: Props) {
  const { update, loading } = useUpdateAdminAgent();
  const [form, setForm] = useState<FormState>(() => fromAgent(agent));
  const [showDiff, setShowDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent (Agents page) keys this component on `agent.id`, so a
  // selection change unmounts and remounts the editor with a fresh state.
  // No effect needed to reset; the initial-state lambda handles it.

  const diff = useMemo(() => computeDiff(agent, form), [agent, form]);
  const hasChanges = diff.fields.length > 0;

  function onAddStarter() {
    setForm((f) => ({
      ...f,
      conversationStarters: [...f.conversationStarters, ''],
    }));
  }

  function onRemoveStarter(idx: number) {
    setForm((f) => ({
      ...f,
      conversationStarters: f.conversationStarters.filter((_, i) => i !== idx),
    }));
  }

  function onMoveStarter(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const next = [...f.conversationStarters];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return f;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...f, conversationStarters: next };
    });
  }

  function onChangeStarter(idx: number, value: string) {
    setForm((f) => ({
      ...f,
      conversationStarters: f.conversationStarters.map((s, i) =>
        i === idx ? value : s,
      ),
    }));
  }

  function onReset() {
    setForm(fromAgent(agent));
    setError(null);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!form.reason.trim()) {
      setError('Reason is required (powers the audit log).');
      return;
    }
    if (!hasChanges) {
      setError('No changes to save.');
      return;
    }
    setShowDiff(true);
  }

  async function onConfirm() {
    setError(null);
    try {
      const next = await update(agent.id, diff.patch);
      setShowDiff(false);
      toast.success(`Updated ${agent.name}`);
      onSaved?.(next);
    } catch (e) {
      setError((e as Error).message);
      setShowDiff(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <header style={headerStyle}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 400, margin: 0 }}>
            {agent.name}
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 11,
              letterSpacing: '0.04em',
              color: 'var(--color-text-dim)',
            }}
          >
            <code>{agent.id}</code>
            <span style={{ margin: '0 8px' }}>|</span>
            {agent.provider} / {agent.model}
          </p>
        </div>
      </header>

      <Input
        label="Description"
        value={form.description}
        onChange={(e) => {
          const value = e.currentTarget.value;
          setForm((f) => ({ ...f, description: value }));
        }}
      />

      <div style={{ marginBottom: 14 }}>
        <label htmlFor={`agent-instructions-${agent.id}`} style={labelStyle}>
          System prompt (instructions)
        </label>
        <textarea
          id={`agent-instructions-${agent.id}`}
          value={form.instructions}
          onChange={(e) => {
            const value = e.target.value;
            setForm((f) => ({ ...f, instructions: value }));
          }}
          rows={20}
          spellCheck={false}
          style={textareaStyle}
        />
        <p style={hintStyle}>
          {form.instructions.length} chars. Resize from the bottom-right corner.
        </p>
      </div>

      <div style={{ marginBottom: 14 }}>
        <span style={labelStyle}>Conversation starters</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {form.conversationStarters.length === 0 && (
            <p style={hintStyle}>None. Add one with the button below.</p>
          )}
          {form.conversationStarters.map((s, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 6, alignItems: 'center' }}
            >
              <input
                aria-label={`Conversation starter ${i + 1}`}
                value={s}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  onChangeStarter(i, value);
                }}
                style={textInputStyle}
              />
              <button
                type="button"
                aria-label={`Move starter ${i + 1} up`}
                onClick={() => onMoveStarter(i, -1)}
                disabled={i === 0}
                style={iconBtn(i === 0)}
              >
                up
              </button>
              <button
                type="button"
                aria-label={`Move starter ${i + 1} down`}
                onClick={() => onMoveStarter(i, 1)}
                disabled={i === form.conversationStarters.length - 1}
                style={iconBtn(i === form.conversationStarters.length - 1)}
              >
                dn
              </button>
              <button
                type="button"
                aria-label={`Remove starter ${i + 1}`}
                onClick={() => onRemoveStarter(i)}
                style={iconBtn(false)}
              >
                x
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddStarter}
          style={{
            marginTop: 10,
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-link)',
            cursor: 'pointer',
            fontSize: 11,
            letterSpacing: '0.04em',
            padding: '6px 12px',
          }}
        >
          + add starter
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor={`agent-temp-${agent.id}`} style={labelStyle}>
          Temperature ({form.temperature.toFixed(1)})
        </label>
        <input
          id={`agent-temp-${agent.id}`}
          type="range"
          min={TEMP_MIN}
          max={TEMP_MAX}
          step={TEMP_STEP}
          value={form.temperature}
          onChange={(e) => {
            const value = Number.parseFloat(e.currentTarget.value);
            setForm((f) => ({ ...f, temperature: value }));
          }}
          style={{ width: '100%' }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'var(--color-text-dim)',
            marginTop: 4,
          }}
        >
          <span>0.0 (deterministic)</span>
          <span>2.0 (chaotic)</span>
        </div>
      </div>

      <Input
        label="Reason (required, audit log)"
        value={form.reason}
        onChange={(e) => {
          const value = e.currentTarget.value;
          setForm((f) => ({ ...f, reason: value }));
        }}
        required
      />

      {error && (
        <p
          role="alert"
          style={{
            color: 'var(--color-danger)',
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          type="submit"
          loading={loading}
          loadingLabel="Saving..."
          disabled={!hasChanges}
        >
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={onReset}>
          Reset
        </Button>
      </div>

      {hasChanges && (
        <p style={{ ...hintStyle, marginTop: 8 }}>
          {diff.fields.length} field{diff.fields.length === 1 ? '' : 's'} pending.
        </p>
      )}

      <Modal
        open={showDiff}
        onClose={() => setShowDiff(false)}
        title={`Confirm changes to ${agent.name}`}
      >
        <DiffPreview fields={diff.fields} reason={form.reason} />
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            marginTop: 16,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowDiff(false)}
            style={{ width: 'auto' }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            loading={loading}
            loadingLabel="Saving..."
            style={{ width: 'auto' }}
          >
            Confirm save
          </Button>
        </div>
      </Modal>
    </form>
  );
}

function DiffPreview({
  fields,
  reason,
}: {
  fields: ChangedField[];
  reason: string;
}) {
  return (
    <div data-testid="diff-preview">
      <p
        style={{
          fontSize: 12,
          color: 'var(--color-text-dim)',
          margin: '0 0 14px',
        }}
      >
        Reason: <em>{reason || '(none)'}</em>
      </p>
      <div
        style={{
          maxHeight: 360,
          overflowY: 'auto',
          paddingRight: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {fields.map((f) => (
          <FieldDiff key={f.key} field={f} />
        ))}
      </div>
    </div>
  );
}

interface DiffLine {
  kind: 'eq' | 'del' | 'ins';
  value: string;
}

/**
 * Line-level diff using the longest-common-subsequence DP. Plenty for the
 * short-to-medium prompts we're editing (~200-400 lines); not optimal for
 * megabyte payloads, but agents will never get that big.
 *
 * Keeping this in-component (not a shared util) because there's exactly one
 * caller and the shape of `DiffLine` is intimately tied to how we render.
 */
function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) lcs[i][j] = lcs[i + 1][j + 1] + 1;
      else lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ kind: 'eq', value: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: 'del', value: a[i] });
      i++;
    } else {
      out.push({ kind: 'ins', value: b[j] });
      j++;
    }
  }
  while (i < m) {
    out.push({ kind: 'del', value: a[i] });
    i++;
  }
  while (j < n) {
    out.push({ kind: 'ins', value: b[j] });
    j++;
  }
  return out;
}

function FieldDiff({ field }: { field: ChangedField }) {
  const lines = useMemo(
    () => lineDiff(field.oldValue, field.newValue),
    [field.oldValue, field.newValue],
  );
  const isMultiline = field.oldValue.includes('\n') || field.newValue.includes('\n');

  if (!isMultiline) {
    return (
      <div>
        <p style={diffHeaderStyle}>{field.label}</p>
        <div style={diffBoxStyle}>
          <span
            style={{
              textDecoration: 'line-through',
              color: 'var(--color-danger)',
              display: 'block',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 12,
            }}
          >
            {field.oldValue || '(empty)'}
          </span>
          <span
            style={{
              fontWeight: 600,
              color: 'var(--color-success)',
              display: 'block',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 12,
            }}
          >
            {field.newValue || '(empty)'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={diffHeaderStyle}>{field.label}</p>
      <div style={diffBoxStyle}>
        {lines.map((line, idx) => (
          <div
            key={idx}
            data-diff-kind={line.kind}
            style={{
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              padding: '1px 6px',
              background:
                line.kind === 'del'
                  ? 'rgba(226, 107, 107, 0.12)'
                  : line.kind === 'ins'
                    ? 'rgba(107, 184, 146, 0.12)'
                    : 'transparent',
              color:
                line.kind === 'del'
                  ? 'var(--color-danger)'
                  : line.kind === 'ins'
                    ? 'var(--color-success)'
                    : 'var(--color-text-dim)',
              textDecoration: line.kind === 'del' ? 'line-through' : 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 14,
                color: 'var(--color-text-dim)',
              }}
            >
              {line.kind === 'del' ? '-' : line.kind === 'ins' ? '+' : ' '}
            </span>
            {line.value || ' '}
          </div>
        ))}
      </div>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-dim)',
  margin: '6px 0 0',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: 18,
};

const textareaStyle: CSSProperties = {
  width: '100%',
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '12px 14px',
  fontSize: 12,
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  lineHeight: 1.5,
  resize: 'vertical',
  minHeight: 380,
};

const textInputStyle: CSSProperties = {
  flex: 1,
  background: 'var(--color-bg-elev)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  padding: '8px 12px',
  fontSize: 13,
};

const diffHeaderStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-text-dim)',
  margin: '0 0 6px',
};

const diffBoxStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  padding: 8,
  maxHeight: 240,
  overflowY: 'auto',
};

const iconBtn = (disabled: boolean): CSSProperties => ({
  fontSize: 10,
  padding: '4px 8px',
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: disabled ? 'var(--color-text-dim)' : 'var(--color-link)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  letterSpacing: '0.04em',
});
