// scripts/update-vapi-tools.js
// -----------------------------------------------------------------------------
// Updates Jordan's tools in Vapi to match transit-sim's API (config as code):
//   1. get_next_bus: "route" becomes optional (only "stop" is required)
//   2. plan_trip(from, to): a new tool (created once; reused if it exists)
//   3. Jordan: gets the plan_trip tool, and one prompt sentence is updated
//
// Run:   npm run update-tools            (dry run: only SHOWS the changes)
//        npm run update-tools -- --apply (really makes the changes)
// Needs: VAPI_API_KEY in .env (private key)
//
// Endpoints (Vapi API reference, docs.vapi.ai/api-reference):
//   GET/PATCH https://api.vapi.ai/tool/{id}     POST https://api.vapi.ai/tool
//   GET       https://api.vapi.ai/tool          (list, to avoid duplicates)
//   GET/PATCH https://api.vapi.ai/assistant/{id}
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const API = 'https://api.vapi.ai';
const ASSISTANT_ID = '8c2b8d1a-60a0-44f8-998b-e65877dd0111'; // Jordan
const NEXT_BUS_TOOL_ID = '789054e2-14ea-409d-bcf4-cbd18b4cdd51'; // get_next_bus
const APPLY = process.argv.includes('--apply');

// The one prompt sentence we change, and what it becomes.
const OLD_SENTENCE =
  'use the get_next_bus tool with the route and stop, then tell them what it returns.';
const NEW_SENTENCE =
  'use the get_next_bus tool with the stop (add the route only if the caller named one), ' +
  'then tell them what it returns. When someone asks how to get from one place to another, ' +
  'use the plan_trip tool with where they are starting (from) and where they are going (to), ' +
  'then tell them what it returns.';

// The new tool's definition (what the AI model sees).
const PLAN_TRIP_FUNCTION = {
  name: 'plan_trip',
  description:
    'Plan a Juniper Valley Transit bus trip between two stops or landmarks, using live times. ' +
    'Finds a direct bus or one transfer at Sheridan Transit Center, and says when the next bus ' +
    'leaves and how long the trip takes. Use when a caller asks how to get from one place to another.',
  parameters: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Where the caller is starting: a stop or landmark, e.g. "Santa Fe Place Mall", "the library", "Meow Wolf"' },
      to: { type: 'string', description: 'Where the caller wants to go: a stop or landmark, e.g. "Christus St. Vincent hospital", "the Plaza"' },
    },
    required: ['from', 'to'],
  },
};

// ---- small helpers -----------------------------------------------------------

function loadApiKey() {
  const envFile = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const match = line.match(/^\s*VAPI_API_KEY\s*=\s*(.+?)\s*$/);
      if (match) return match[1].replace(/^["']|["']$/g, '');
    }
  }
  return process.env.VAPI_API_KEY;
}

// Call the Vapi API. The key is sent in a header and never printed.
async function vapi(method, urlPath, body) {
  const response = await fetch(`${API}${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${loadApiKey()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${urlPath} -> HTTP ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// ---- the three changes -------------------------------------------------------

async function main() {
  if (!loadApiKey()) throw new Error('No VAPI_API_KEY found. Copy .env.example to .env and add your private key.');
  console.log(APPLY ? 'APPLYING changes to Vapi.\n' : 'DRY RUN: nothing will be changed (add --apply to make the changes).\n');

  // 1. get_next_bus: only "stop" is required.
  const nextBus = await vapi('GET', `/tool/${NEXT_BUS_TOOL_ID}`);
  const fn = nextBus.function;
  console.log(`1. get_next_bus required parameters: ${JSON.stringify(fn.parameters.required)} -> ["stop"]`);
  const updatedFunction = {
    ...fn,
    description: fn.description.replace('at a stop on a Juniper Valley Transit route', 'at a Juniper Valley Transit stop'),
    parameters: {
      ...fn.parameters,
      required: ['stop'],
      properties: {
        ...fn.parameters.properties,
        route: {
          ...fn.parameters.properties.route,
          description: `${fn.parameters.properties.route.description}. Optional: leave it out if the caller didn't say, and every route at that stop is checked.`,
        },
      },
    },
  };
  if (APPLY) await vapi('PATCH', `/tool/${NEXT_BUS_TOOL_ID}`, { type: 'function', function: updatedFunction });

  // 2. plan_trip: create it, unless a tool with that name already exists.
  const allTools = await vapi('GET', '/tool?limit=1000');
  let planTrip = allTools.find((t) => t.function && t.function.name === 'plan_trip');
  if (planTrip) {
    console.log(`2. plan_trip already exists (${planTrip.id}); reusing it.`);
  } else {
    console.log(`2. create plan_trip(from, to) -> ${nextBus.server.url}`);
    if (APPLY) {
      planTrip = await vapi('POST', '/tool', {
        type: 'function',
        function: PLAN_TRIP_FUNCTION,
        messages: nextBus.messages, // same "while the tool runs" behavior as get_next_bus
        server: { url: nextBus.server.url, timeoutSeconds: nextBus.server.timeoutSeconds },
      });
      console.log(`   created plan_trip: ${planTrip.id}`);
    }
  }

  // 3. Jordan: add the tool and update one prompt sentence.
  const assistant = await vapi('GET', `/assistant/${ASSISTANT_ID}`);
  const model = assistant.model;
  const system = model.messages.find((m) => m.role === 'system');
  if (!system.content.includes(OLD_SENTENCE) && !system.content.includes(NEW_SENTENCE)) {
    throw new Error('The prompt sentence to update was not found (was the prompt edited?). Nothing changed for Jordan.');
  }
  const toolIds = [...new Set([...(model.toolIds || []), planTrip ? planTrip.id : '<new plan_trip id>'])];
  console.log(`3. Jordan toolIds: ${(model.toolIds || []).length} -> ${toolIds.length}`);
  console.log(`   prompt: "...${OLD_SENTENCE}"\n        -> "...${NEW_SENTENCE}"`);
  if (APPLY) {
    const messages = model.messages.map((m) =>
      m.role === 'system' ? { ...m, content: m.content.replace(OLD_SENTENCE, NEW_SENTENCE) } : m
    );
    // Send the whole model back with only these two things changed.
    await vapi('PATCH', `/assistant/${ASSISTANT_ID}`, { model: { ...model, messages, toolIds } });
  }

  console.log(APPLY ? '\nDone. Run "npm run export" to save the new configs to vapi/.' : '\nDry run complete.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
