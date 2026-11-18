// scripts/export-vapi.js
// -----------------------------------------------------------------------------
// "Config as code": downloads my Vapi agent setup and saves it as JSON files,
// so the agent's configuration is versioned on GitHub like normal code.
//
// Run with:  npm run export
// Needs:     a .env file containing VAPI_API_KEY=<your Vapi PRIVATE key>
//
// Endpoints (from the Vapi API reference, docs.vapi.ai/api-reference):
//   GET https://api.vapi.ai/assistant/{id}
//   GET https://api.vapi.ai/tool/{id}
//   GET https://api.vapi.ai/structured-output/{id}
//   Auth header:  Authorization: Bearer <private API key>
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { redact, findOrgIds } = require('./redact');

// ---- What to export for THIS project ---------------------------------------
const ITEMS = [
  { type: 'assistant', id: '8c2b8d1a-60a0-44f8-998b-e65877dd0111', file: 'assistant-jordan.json' },
  { type: 'tool', id: '789054e2-14ea-409d-bcf4-cbd18b4cdd51', file: 'tool-get-next-bus.json' },
  { type: 'structured-output', id: '983e4d25-722a-4748-9cc5-258fc82fe16c', file: 'structured-output-transit-request.json' },
];
// ----------------------------------------------------------------------------

const ROOT = path.join(__dirname, '..');
const API = 'https://api.vapi.ai';

// Read VAPI_API_KEY from the .env file (tiny reader, no extra packages needed).
function loadApiKey() {
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const match = line.match(/^\s*VAPI_API_KEY\s*=\s*(.+?)\s*$/);
      if (match) return match[1].replace(/^["']|["']$/g, '');
    }
  }
  return process.env.VAPI_API_KEY;
}

// Download one item from Vapi.
async function fetchFromVapi(type, id, apiKey) {
  const response = await fetch(`${API}/${type}/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` }, // the key is sent, never printed
  });
  if (!response.ok) {
    throw new Error(`Vapi returned HTTP ${response.status} for ${type} ${id}`);
  }
  return response.json();
}

// Pull the system prompt out of an assistant (it lives in model.messages).
function getSystemPrompt(assistant) {
  const messages = (assistant.model && assistant.model.messages) || [];
  const system = messages.find((m) => m.role === 'system');
  return system ? system.content : null;
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('No VAPI_API_KEY found. Copy .env.example to .env and add your private key.');
    process.exit(1);
  }

  fs.mkdirSync(path.join(ROOT, 'vapi'), { recursive: true });
  const log = [];

  for (const item of ITEMS) {
    const raw = await fetchFromVapi(item.type, item.id, apiKey);
    const orgIds = findOrgIds(raw);
    const clean = redact(raw, "", log, orgIds);
    log.forEach((entry) => (entry.file = entry.file || `vapi/${item.file}`));

    fs.writeFileSync(path.join(ROOT, 'vapi', item.file), JSON.stringify(clean, null, 2) + '\n');
    console.log(`Saved vapi/${item.file}  (${item.type} "${clean.name || (clean.function && clean.function.name) || item.id}")`);

    // Save the assistant's system prompt on its own, so it's easy to read on GitHub.
    if (item.type === 'assistant') {
      const prompt = getSystemPrompt(clean);
      if (prompt) {
        const title = `# System prompt: ${clean.name || 'assistant'}\n\n` +
          '_Exported from Vapi by `scripts/export-vapi.js` (private details redacted)._\n\n';
        fs.writeFileSync(path.join(ROOT, 'prompt.md'), title + prompt.trim() + '\n');
        console.log('Saved prompt.md');
      }
    }
  }

  // Show everything that was redacted (locations only, never the values).
  console.log(`\nRedacted ${log.length} item(s):`);
  for (const entry of log) {
    const count = entry.count > 1 ? ` x${entry.count}` : '';
    console.log(`  - ${entry.file}  ${entry.where || '(top level)'}  ->  ${entry.rule}${count}`);
  }
}

main().catch((err) => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
