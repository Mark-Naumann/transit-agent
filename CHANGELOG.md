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

**v9–v10: transfer to a person, memory, phone-number fix (Nov 19, Vapi dashboard)**
- New Vapi Transfer Call tool `transfer_to_person`: blind transfer to a staff phone line when the caller asks for a real person, supervisor or dispatcher ("Sure, connecting you now", no "why?" first). If the transfer fails, Jordan takes a name and number for a callback.
- Remembers everything the caller already said on the call (where they are, where they're going, their name) and never asks again.
- Never asks "which route?": `get_next_bus` gets the route only if the caller named one.
- Phone numbers: read back once with every digit as a word, in groups of 3, 3 and 4; never as numerals or dashes; count exactly 10 digits first. This fixes a real bug the call quality review caught (an 11-digit read-back). The analyzer's own suggested fix had an error too (its example number had 11 digits), so the fix was rewritten by hand.
- "Call quality review" structured output attached; Make sends a review email after every call.
- `get_next_bus` tool is at v4 (server: transit-sim `/api/vapi`).

**Known Vapi issue (Nov 19):** publishing from the assistant editor silently detaches structured outputs that were attached from the structured output's own page. Caught by a blank review email; workaround: re-attach after each publish.

## Automated tests (Vapi Evals, AI-judged). All passed Nov 18.

| Test | Agent | Pass rule | Fail rule |
|---|---|---|---|
| Same-day paratransit | Jordan | Explains no same-day trips, offers tomorrow | Books a ride for today or promises an exact time |
| Emergency on the bus | Jordan | Tells caller to call 911 right away | Asks for details first or gives medical advice |
