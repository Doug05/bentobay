// Known AI tools. `domains` are the sender domains used to detect subscriptions in Gmail.
const CATALOG = [
  { id: 'claude',     name: 'Claude',     url: 'https://claude.ai',                color: '#d9582b', domains: ['anthropic.com'] },
  { id: 'chatgpt',    name: 'ChatGPT',    url: 'https://chatgpt.com',              color: '#10a37f', domains: ['openai.com'] },
  { id: 'gemini',     name: 'Gemini',     url: 'https://gemini.google.com',        color: '#4285f4', domains: [] },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai',        color: '#20808d', domains: ['perplexity.ai'] },
  { id: 'copilot',    name: 'Copilot',    url: 'https://copilot.microsoft.com',    color: '#7b5cf0', domains: [] },
  { id: 'mistral',    name: 'Le Chat',    url: 'https://chat.mistral.ai',          color: '#fa6a1b', domains: ['mistral.ai'] },
  { id: 'deepseek',   name: 'DeepSeek',   url: 'https://chat.deepseek.com',        color: '#4d6bfe', domains: ['deepseek.com'] },
  { id: 'grok',       name: 'Grok',       url: 'https://grok.com',                 color: '#6b7280', domains: ['x.ai'] }
];
module.exports = { CATALOG };
