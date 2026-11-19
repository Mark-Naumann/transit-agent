// scripts/redact.js
// -----------------------------------------------------------------------------
// The "black marker": removes private information from a config before it is
// saved to the repo. It never prints the secret itself, only WHERE it was found.
//
// What gets redacted:
//   1. Make webhook URLs (hook.us2.make.com links)      -> <MAKE_WEBHOOK_URL>
//   2. Email addresses                                     -> <EMAIL>
//   3. Vapi org ID (field "orgId", and its value anywhere) -> <ORG_ID>
//   4. Phone numbers                                       -> <PHONE_NUMBER>
//      ...but the number a Transfer Call tool dials        -> <TRANSFER_PHONE>
//      (matched by its digits, so the same number written two ways still matches)
//   5. Fields that hold keys, secrets, tokens, passwords
//      or credentials, and every request header value     -> <REDACTED>
// -----------------------------------------------------------------------------

// Field names that hold secrets. Checked case-insensitively.
// (Careful wording so harmless fields like "maxTokens" or "keyterms" are kept.)
const SECRET_FIELD =
  /(api_?key|api_?secret|secret|password|private_?key|access_?key|access_?token|refresh_?token|auth_?token|credential|gcpkey|openaikey|subscriptionkey|^token$|^key$|^publickey$)/i;

// Patterns found inside text.
const MAKE_WEBHOOK = /https?:\/\/hook\.[a-z0-9-]+\.make\.com\/[^\s"'<>)\]]*/gi;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// US-style phone numbers, with or without dashes, dots, spaces, ( ) or a +1 prefix
const PHONE = /(?<![\w-])(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w-])/g;

// Just the last 10 digits of a phone number (drops "+1", spaces, dashes and brackets)
const last10Digits = (text) => String(text).replace(/\D/g, '').slice(-10);

// Redact one piece of text. `log` collects what was found and where.
function redactText(text, where, log, orgIds, transferDigits) {
  let out = text;
  const replace = (pattern, label, rule) => {
    const matches = out.match(pattern);
    if (matches) {
      log.push({ where, rule, count: matches.length });
      out = out.replace(pattern, label);
    }
  };
  replace(MAKE_WEBHOOK, '<MAKE_WEBHOOK_URL>', 'Make webhook URL');
  replace(EMAIL, '<EMAIL>', 'email address');
  // Phone numbers: the transfer tool's number gets its own label.
  out = out.replace(PHONE, (match) => {
    const isTransfer = transferDigits.has(last10Digits(match));
    log.push({ where, rule: isTransfer ? 'transfer phone number' : 'phone number' });
    return isTransfer ? '<TRANSFER_PHONE>' : '<PHONE_NUMBER>';
  });
  for (const id of orgIds) {
    if (id && out.includes(id)) {
      log.push({ where, rule: 'org ID (inside text)', count: out.split(id).length - 1 });
      out = out.split(id).join('<ORG_ID>');
    }
  }
  return out;
}

// Walk through every field of an object (and objects inside it).
//   value  - the thing to clean
//   where  - a readable path like "model.messages[0].content", used in the log
//   log    - list that collects every redaction
//   orgIds - org ID values to hunt for inside text
//   transferDigits - the transfer tool's number(s), as 10 digits (see findTransferNumbers)
function redact(value, where, log, orgIds, insideHeaders = false, transferDigits = new Set()) {
  if (Array.isArray(value)) {
    return value.map((item, i) => redact(item, `${where}[${i}]`, log, orgIds, insideHeaders, transferDigits));
  }

  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, child] of Object.entries(value)) {
      const path = where ? `${where}.${key}` : key;

      if (key === 'orgId') {
        clean[key] = '<ORG_ID>';
        log.push({ where: path, rule: 'org ID' });
      } else if (typeof child !== 'boolean' && typeof child !== 'number' && child !== null && child !== '' && (insideHeaders || SECRET_FIELD.test(key))) {
        // (true/false and numbers are settings, not secrets, so they are kept)
        clean[key] = '<REDACTED>';
        log.push({ where: path, rule: insideHeaders ? 'request header' : 'key/credential field' });
      } else {
        // "headers" objects can carry auth tokens, so hide every value inside.
        clean[key] = redact(child, path, log, orgIds, key.toLowerCase().endsWith('headers'), transferDigits);
      }
    }
    return clean;
  }

  if (typeof value === 'string') return redactText(value, where, log, orgIds, transferDigits);
  return value; // numbers, true/false, null are safe
}

// Find every orgId value in an object, so we can also remove it from text.
function findOrgIds(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => findOrgIds(v, found));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'orgId' && typeof child === 'string') found.add(child);
      else findOrgIds(child, found);
    }
  }
  return found;
}

// Find the phone number(s) a Transfer Call tool dials (its "destinations"),
// as 10 digits, so they can be labeled <TRANSFER_PHONE> wherever they appear.
function findTransferNumbers(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => findTransferNumbers(v, found));
  else if (value && typeof value === 'object') {
    if (value.type === 'transferCall' && Array.isArray(value.destinations)) {
      for (const destination of value.destinations) {
        if (typeof destination.number === 'string') found.add(last10Digits(destination.number));
      }
    }
    Object.values(value).forEach((child) => findTransferNumbers(child, found));
  }
  return found;
}

module.exports = { redact, findOrgIds, findTransferNumbers, MAKE_WEBHOOK, EMAIL, PHONE };
