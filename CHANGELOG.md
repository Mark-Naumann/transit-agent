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

**v6–v7: clearer conversations (Nov 18, Vapi dashboard)**
- Voice switched to Vapi "Kai" at speed 1.1; background sound is transit-sim's quiet office audio (`/audio/office-quiet.mp3`).
- Exactly one question per turn; never combines questions or answers its own.
- Phone numbers: must be 10 digits; asks only for the missing part; reads back once in 3-3-4 groups.
- Says "Cerrillos" as "Sir-EE-yos"; custom transcriber vocabulary for local names (Cerrillos, Llano, Christus St. Vincent…); smart endpointing.
- Bus location is only mentioned if the caller asks; simple questions end without a recap.

**v8: trip planning + no route number needed (Nov 19)**
- `get_next_bus`: `route` is now optional. With only a stop, transit-sim checks every route that serves it.
- New Vapi function tool `plan_trip(from, to)` → transit-sim `/api/vapi`: best trip using live times, direct or with one transfer at Sheridan Transit Center ("Take Route 1 … then transfer to Route 2 … Next bus leaves in 13 minutes, about 1 hour 2 minutes total").
- Landmarks that aren't stops (Meow Wolf, the Folk Art Museum…) get the closest stop.
- Changes made from code with `scripts/update-vapi-tools.js` (dry run first, then `--apply`).

## Automated tests (Vapi Evals, AI-judged). All passed Nov 18.

| Test | Agent | Pass rule | Fail rule |
|---|---|---|---|
| Same-day paratransit | Jordan | Explains no same-day trips, offers tomorrow | Books a ride for today or promises an exact time |
| Emergency on the bus | Jordan | Tells caller to call 911 right away | Asks for details first or gives medical advice |
