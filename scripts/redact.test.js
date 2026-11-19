// scripts/redact.test.js
// Tests for the "black marker" in redact.js.   Run with:  npm test
//
// All phone numbers here are fictional (555-01xx is reserved for fiction) and are
// built when the test runs, so no phone-number-shaped text is stored in the repo.

const test = require('node:test');
const assert = require('node:assert');
const { redact, findOrgIds, findTransferNumbers } = require('./redact');

const area = '505';
const TRANSFER_E164 = `+1${area}555` + '0199'; // how Vapi stores it: +1XXXXXXXXXX
const TRANSFER_DASHED = `${area}-555-` + '0199'; // the same number, written another way
const OTHER_NUMBER = `${area}-555-` + '0142'; // a different number

// A fake Transfer Call tool and assistant, shaped like the real Vapi ones.
const transferTool = {
  id: 'tool-1',
  orgId: 'org-fake-123',
  type: 'transferCall',
  function: { name: 'transfer_to_person' },
  destinations: [{ type: 'number', number: TRANSFER_E164, message: 'Connecting you now.' }],
};
const assistant = {
  orgId: 'org-fake-123',
  model: { messages: [{ role: 'system', content: `Staff line is ${TRANSFER_DASHED}. Example caller: ${OTHER_NUMBER}.` }] },
};

// Redact the way export-vapi.js does: collect from ALL items, then redact each.
function exportBoth() {
  const orgIds = new Set();
  const transferDigits = new Set();
  for (const item of [transferTool, assistant]) {
    findOrgIds(item, orgIds);
    findTransferNumbers(item, transferDigits);
  }
  const log = [];
  return {
    tool: redact(transferTool, '', log, orgIds, false, transferDigits),
    assistant: redact(assistant, '', log, orgIds, false, transferDigits),
    log,
  };
}

test('the transfer tool number becomes <TRANSFER_PHONE>', () => {
  const { tool } = exportBoth();
  assert.strictEqual(tool.destinations[0].number, '<TRANSFER_PHONE>');
});

test('the same number written another way (in the prompt) is also <TRANSFER_PHONE>', () => {
  const { assistant: clean } = exportBoth();
  assert.match(clean.model.messages[0].content, /Staff line is <TRANSFER_PHONE>\./);
});

test('other phone numbers are still <PHONE_NUMBER>', () => {
  const { assistant: clean } = exportBoth();
  assert.match(clean.model.messages[0].content, /Example caller: <PHONE_NUMBER>\./);
});

test('the real digits appear nowhere in the output, and the log never shows them', () => {
  const { tool, assistant: clean, log } = exportBoth();
  const everything = JSON.stringify([tool, clean, log]);
  assert.ok(!everything.includes(`${area}555` + '0199'));
  assert.ok(!everything.includes(TRANSFER_DASHED));
  assert.ok(log.some((entry) => entry.rule === 'transfer phone number'));
});

test('without a transfer tool, phone numbers are labeled <PHONE_NUMBER> as before', () => {
  const clean = redact({ text: `Call ${TRANSFER_DASHED}` }, '', [], new Set());
  assert.strictEqual(clean.text, 'Call <PHONE_NUMBER>');
});

test('org IDs and Make webhooks are still hidden', () => {
  const { tool } = exportBoth();
  assert.strictEqual(tool.orgId, '<ORG_ID>');
  const fakeWebhook = ['https:', '', 'hook.us2.make.com', 'abc123'].join('/'); // built at run time
  const clean = redact({ server: { url: fakeWebhook } }, '', [], new Set());
  assert.strictEqual(clean.server.url, '<MAKE_WEBHOOK_URL>');
});
