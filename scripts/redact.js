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

// Redact one piece of text. `log` collects what was found and where.
function redactText(text, where, log, orgIds) {
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
  replace(PHONE, '<PHONE_NUMBER>', 'phone number');
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
function redact(value, where, log, orgIds, insideHeaders = false) {
  if (Array.isArray(value)) {
    return value.map((item, i) => redact(item, `${where}[${i}]`, log, orgIds, insideHeaders));
  }

  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, child] of Object.entries(value)) {
      const path = where ? `${where}.${key}` : key;

      if (key === 'orgId') {
        clean[key] = '<ORG_ID>';
        log.push({ where: path, rule: 'org ID' });
      } else if (child !== null && child !== '' && (insideHeaders || SECRET_FIELD.test(key))) {
        clean[key] = '<REDACTED>';
        log.push({ where: path, rule: insideHeaders ? 'request header' : 'key/credential field' });
      } else {
        // "headers" objects can carry auth tokens, so hide every value inside.
        clean[key] = redact(child, path, log, orgIds, key.toLowerCase().endsWith('headers'));
      }
    }
    return clean;
  }

  if (typeof value === 'string') return redactText(value, where, log, orgIds);
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

module.exports = { redact, findOrgIds, MAKE_WEBHOOK, EMAIL, PHONE };
