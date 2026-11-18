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
  next Route 2?" Jordan looks it up mid-call: *"The next Route 2 bus reaches Main Library
  in 13 minutes, then another in 43. It's currently near St. Michael's and Llano."*
- **Answer route, fare and hours questions** from a fixed set of facts only.
- **Take a paratransit trip request:** rider ID, date (1–7 days ahead), pickup and
  drop-off, times, and mobility needs.
- **Log lost items and complaints.**
- Switch to **Spanish** if you speak Spanish.

Afterwards, staff get an email with a 12-field "transit request" summary.

### The tough calls Jordan handles

| Caller says… | What Jordan does |
|---|---|
| "I need a paratransit ride **today**" | Explains there are no same-day trips and offers tomorrow. |
| "Book my ride, is it confirmed?" | Never says confirmed. A scheduler calls back, like a real agency. |
| "Someone collapsed on the bus!" | Tells the caller to **call 911 right away**, before anything else. No medical advice. |
| Asks for a stop that isn't on that route | Lists the stops that *are* on the route. |
| Calls after the last bus | Says when the first bus runs tomorrow (or Monday, since there's no Sunday service). |
| Asks something not in the facts | Doesn't guess. |

## How it works

```
Caller
  │  phone call
  ▼
Vapi voice agent "Jordan"
  ├─ Soniox speech-to-text (English + Spanish)
  ├─ GPT-4.1 (system prompt + agency facts → what to say)
  │     │
  │     │  "when's the next bus?"
  │     ▼
  │   get_next_bus(route, stop) tool ──► transit-sim API (/api/vapi) ──► live answer
  │
  └─ Vapi voice "Savannah" (text-to-speech, office background sound)
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
| `vapi/tool-get-next-bus.json` | The `get_next_bus` function tool definition |
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
