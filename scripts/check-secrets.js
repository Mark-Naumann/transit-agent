// scripts/check-secrets.js
// Safety scan before pushing: searches every file in the project for anything
// that looks like a key, token, webhook URL, email or phone number.
// Run with:  npm run check
// It skips .env (secrets are allowed there, because .env is never committed).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['.git', 'node_modules', '.env']);

const CHECKS = [
  { name: 'Make webhook URL', pattern: /https?:\/\/hook\.[a-z0-9-]+\.make\.com\/[^\s"'<>)\]]+/gi },
  { name: 'Any webhook-like URL', pattern: /https?:\/\/[^\s"'<>)]*(webhook|hooks?\.)[^\s"'<>)]*/gi },
  { name: 'Email address', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { name: 'Phone number', pattern: /(?<![\w-])(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w-])/g },
  { name: 'Bearer token', pattern: /Bearer\s+[A-Za-z0-9._-]{16,}/g },
  { name: 'Key-like value', pattern: /\b(sk|pk|key|tok)[-_][A-Za-z0-9]{16,}\b/g },
  { name: 'Secret field with a value', pattern: /"(api_?key|secret|password|token|credential\w*)"\s*:\s*"(?!<)[^"]+"/gi },
  { name: 'Long random string (possible key)', pattern: /\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]{32,}\b/g },
];

// List every file in the project (except skipped folders/files).
function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

let findings = 0;
for (const file of listFiles(ROOT)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const check of CHECKS) {
      for (const match of line.match(check.pattern) || []) {
        findings++;
        // Show only the start of the match, so a real secret isn't fully printed.
        const preview = match.length > 12 ? match.slice(0, 12) + '…' : match;
        console.log(`${path.relative(ROOT, file)}:${i + 1}  ${check.name}: ${preview}`);
      }
    }
  });
}

console.log(findings === 0 ? 'No secrets found.' : `\n${findings} possible issue(s) - please review.`);
process.exitCode = findings === 0 ? 0 : 1;
