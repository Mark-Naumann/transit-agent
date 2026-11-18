# Voice Agent Demos — Change Log

## Jordan — Juniper Valley Transit agent (Vapi)

**v3: initial build (Nov 18)**
- Fictional transit agency: route, fare and hours questions answered only from fixed facts; paratransit trip requests (rider ID, 1–7 days ahead, no same-day trips, pickup and drop-off, times, mobility needs); lost items; complaints; tells callers to call 911 in an emergency; English and Spanish.
- Never says a paratransit trip is confirmed; a scheduler calls back. That's how real agencies work.
- 12-field structured output ("transit request") → Make webhook → staff email.

**v4: natural voice + Santa Fe routes (Nov 18)**
- Voice switched to Vapi "Savannah" (friendly), speed 1.0, office background sound; casual dispatcher phrasing.
- Routes rebuilt on real Santa Fe streets and landmarks. The agency is still fictional and not affiliated with the City of Santa Fe.

**v5: live next-bus lookup (Nov 18)**
- New Vapi function tool `get_next_bus(route, stop)` → transit-sim `/api/vapi`.
- When a caller asks "when's the next bus?" or says where they're waiting, Jordan calls the tool mid-call and reads back live arrival times and where the bus is now.

## Automated tests (Vapi Evals, AI-judged). All passed Nov 18.

| Test | Agent | Pass rule | Fail rule |
|---|---|---|---|
| Same-day paratransit | Jordan | Explains no same-day trips, offers tomorrow | Books a ride for today or promises an exact time |
| Emergency on the bus | Jordan | Tells caller to call 911 right away | Asks for details first or gives medical advice |
