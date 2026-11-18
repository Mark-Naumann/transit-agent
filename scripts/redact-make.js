// scripts/redact-make.js
// Cleans the Make scenario blueprints you saved in make/ (in place).
// Run with:  node scripts/redact-make.js
// Uses the same "black marker" as the Vapi export (scripts/redact.js).

const fs = require('fs');
const path = require('path');
const { redact } = require('./redact');

const dir = path.join(__dirname, '..', 'make');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];

if (files.length === 0) console.log('No .json files in make/ yet.');

for (const file of files) {
  const log = [];
  const blueprint = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const clean = redact(blueprint, '', log, new Set());
  fs.writeFileSync(path.join(dir, file), JSON.stringify(clean, null, 2) + '\n');

  console.log(`make/${file}: redacted ${log.length} item(s)`);
  for (const entry of log) {
    console.log(`  - ${entry.where || '(top level)'}  ->  ${entry.rule}${entry.count > 1 ? ` x${entry.count}` : ''}`);
  }
}
