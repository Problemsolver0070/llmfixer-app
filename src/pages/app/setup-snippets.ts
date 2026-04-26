export const tabs = [
  { id: 'openai', label: 'OpenAI SDK' },
  { id: 'anthropic', label: 'Anthropic SDK' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'curl', label: 'curl' },
] as const;

export type TabId = typeof tabs[number]['id'];

export function snippet(tab: TabId, key: string): string {
  switch (tab) {
    case 'openai':
      return `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: '${key}',
  baseURL: 'https://api.thefixer.in/v1',
});

const r = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'hello' }],
});
console.log(r.choices[0].message.content);`;
    case 'anthropic':
      return `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: '${key}',
  baseURL: 'https://api.thefixer.in',  // proxies anthropic.com
});

const r = await client.messages.create({
  model: 'claude-3-5-sonnet-latest',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'hello' }],
});
console.log(r.content);`;
    case 'cursor':
      return `In Cursor settings:

OpenAI Base URL: https://api.thefixer.in/v1
OpenAI API Key:  ${key}

That's it.`;
    case 'claude-code':
      return `Set in your environment:

ANTHROPIC_API_URL=https://api.thefixer.in
ANTHROPIC_API_KEY=${key}

Then run \`claude\` as usual.`;
    case 'curl':
      return `curl https://api.thefixer.in/v1/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{ "role": "user", "content": "hello" }]
  }'`;
  }
}
