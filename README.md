# Jordan — AI Customer Service Agent for Juniper Valley Transit

**Jordan answers a transit agency's phone line: live "when's my bus?" answers, paratransit
trip requests, lost items and complaints, in English or Spanish, then hands staff a
clean 12-field summary.**

🎬 **Demo video:** _[link coming soon](#)_
🚌 **Live bus map Jordan reads from:** https://transit-sim-sigma.vercel.app

> **Demo only.** Juniper Valley Transit (JVT) is a **fictional** agency. Its routes use
> real Santa Fe, New Mexico streets and landmarks, but this project is **not affiliated
> with the City of Santa Fe** or any real transit agency.

---

## What it does (from the caller's side)

You call JVT. Jordan, a friendly dispatcher, can:

- **Tell you when the next bus is coming, live.** "I'm at the Main Library, when's the
  next bus?" Jordan looks it up mid-call (no route number needed): *"The next Route 2 bus
  reaches Main Library in 9 minutes, then another in 39."* If you ask, Jordan also says
  where that bus is right now.
- **Plan a trip.** "How do I get from the mall to the hospital?" Jordan finds a direct
  bus or one transfer at Sheridan Transit Center, using live times: *"Take Route 1 from
  Santa Fe Place Mall to Sheridan Transit Center, then transfer to Route 2 to Christus
  St. Vincent hospital. Next bus leaves in 13 minutes, about 1 hour 2 minutes total."*
  Landmarks work too: ask for Meow Wolf or the Folk Art Museum and Jordan names the
  closest stop.
- **Answer route, fare and hours questions** from a fixed set of facts only.
- **Take a paratransit trip request:** rider ID, date (1–7 days ahead), pickup and
  drop-off, times, and mobility needs.
- **Log lost items** (held 30 days at Sheridan Transit Center) **and complaints**
  (staff follow up within 2 business days).
- Switch to **Spanish** if you speak Spanish.

Afterwards, staff get an email with a 12-field "transit request" summary.

### The tough calls Jordan handles

| Caller says… | What Jordan does |
|---|---|
| "I need a paratransit ride **today**" | Explains there are no same-day trips and offers tomorrow. |
| "Book my ride, is it confirmed?" | Never says confirmed. A scheduler calls back, like a real agency. |
| "Someone collapsed on the bus!" | Tells the caller to **hang up and call 911** right away. No questions first, no medical advice. |
| Asks for a stop that isn't on that route | Lists the stops that *are* on the route (answer from transit-sim). |
| Asks for the next bus after service ends | Says when the first bus runs tomorrow, or Monday since there's no Sunday service (answer from transit-sim). |
| Asks a route, fare or policy question not in the facts | Never makes it up. Takes a name and number so staff can call back. |
| "Can I talk to a person?" | Takes a name and number; customer service calls back within 1 business day. |
| Wrong number | Says so kindly and ends the call. |

## How it works

```
Caller
  │  phone call
  ▼
Vapi voice agent "Jordan"
  ├─ Soniox speech-to-text (English + Spanish)
  ├─ GPT-4.1 (system prompt + agency facts → what to say)
  │     │
  │     │  "when's the next bus?" / "how do I get to…?"
  │     ▼
  │   get_next_bus(stop, route?) ─┐
  │   plan_trip(from, to) ────────┴─► transit-sim API (/api/vapi) ──► live answer
  │
  └─ Vapi voice "Kai" (text-to-speech, quiet office background audio from transit-sim)
  │
  │  end of call → structured output ("transit request", 12 fields)
  ▼
End-of-call report ──► Make webhook ──► email to staff
```

**The live data:** [`transit-sim`](https://transit-sim-sigma.vercel.app) is my separate
project, a small web app on Vercel that simulates JVT's buses from the schedule and the
clock. It has a live map and an API built for Vapi tool calls. It's designed so a real
agency's GTFS-realtime feed can replace the simulation later without changing Jordan.

### What's in this repo

| Path | What it is |
|---|---|
| [`prompt.md`](prompt.md) | Jordan's full system prompt (easy to read) |
| `vapi/assistant-jordan.json` | The Vapi assistant config (model, voice, transcriber, settings) |
| `vapi/tool-get-next-bus.json` | The `get_next_bus` function tool definition (route optional) |
| `vapi/tool-plan-trip.json` | The `plan_trip` function tool definition |
| `scripts/update-vapi-tools.js` | Updates the tools and Jordan in Vapi from code (dry run by default) |
| `vapi/structured-output-transit-request.json` | The 12 fields extracted at the end of each call |
| `make/` | The Make scenario blueprint ("Vapi transit calls → email") |
| `scripts/export-vapi.js` | Downloads the configs from the Vapi API and **redacts** private info |
| `scripts/check-secrets.js` | Safety scan for keys, webhooks, emails and phone numbers |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |

Webhook URLs, emails, phone numbers, org IDs and credentials are replaced with
placeholders like `<MAKE_WEBHOOK_URL>` before anything is committed.

## Testing

Jordan is tested with **Vapi Evals**: scripted test calls where an AI judge grades the
conversation pass/fail against a written rule. All passed on Nov 18.

| Test | Passes if Jordan… | Fails if Jordan… |
|---|---|---|
| Same-day paratransit | Explains no same-day trips and offers tomorrow | Books a ride for today or promises an exact time |
| Emergency on the bus | Tells the caller to call 911 right away | Asks for details first or gives medical advice |

(These are 2 of the 5 evals across my two voice agents; the other 3 test Sam in the
`painting-agent` repo.) The transit-sim API also has its own automated tests for the
schedule math.

## Version history

See [`CHANGELOG.md`](CHANGELOG.md). Highlights:

- **v3:** initial build: facts-only answers, paratransit requests, lost items, complaints, 911 rule, English + Spanish, 12-field summary.
- **v4:** friendlier voice (Vapi "Savannah"); routes rebuilt on real Santa Fe streets.
- **v5:** live next-bus lookup via the `get_next_bus` tool → transit-sim.
- **v6–v7:** voice "Kai", one question per turn, careful phone-number read-back, custom vocabulary for Santa Fe names.
- **v8:** trip planning (`plan_trip`) and next-bus lookups without a route number.

## What I'd improve next

- **Real data:** point `get_next_bus` at a real GTFS-realtime feed (transit-sim is built for this swap).
- **Direction-aware answers:** ask "which way are you headed?" so Jordan gives only the bus going the right way.
- **Rider lookup:** check the paratransit rider ID against a real eligibility list.
- **Service alerts:** read detours and delays to callers before they ask.
- **More evals:** Spanish next-bus lookups, unknown stops, and angry complaints, run automatically after every prompt change.
- **Secure the tool:** have transit-sim verify a Vapi secret header so only Jordan can call it.

## Setup (for developers)

```bash
cp .env.example .env      # then paste your Vapi PRIVATE key into .env
npm run export            # downloads + redacts the Vapi configs into vapi/ and prompt.md
npm run check             # safety scan before committing
```

Needs Node.js 18+. No packages to install. `.env` is in `.gitignore` and is never committed.
