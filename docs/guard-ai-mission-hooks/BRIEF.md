# guard-ai-mission-hooks: brief
Owner: Night Shift | Guard AI Build. Status: current (plan stage).

Lead: Night Shift | Guard AI Build. Started: 2026-10-25 ~19:00. Base: master 2148ec969.
Job: FOLDED-PLAN J26 (prototype support), the Guard AI half: conformance rows D6, D7, D8 (`docs/conformance-guard-ai/
parts/D-response.md`); D9 is a coordination item for the HUD owner. Planner: Opus.

## Michael said
- 2026-10-23 ~01:30, chat (G299): "if they are within range they should hear it, depending on whether they are near
  something noisey"
- 2026-10-24 ~22:45, chat (G292): "All campaign missions are strictly coop and cannot be completed solo, must have
  forced coop traversal to proceed"
- 2026-10-25 ~18:05, Tallow Wharf map sign-off: "approve as drawn, id rather physically walk the map once built and
  confirm changes"

## Michael picked
- 2026-10-24 ~22:12 Q: first prototypes -> picked: "first prototypes: Three Grey Coats + Two-Key Ledger (campaign, 2p)
  and Split Shift + Code Relay (Sector Ops, 4p)" (as quoted on the #372 sign-off pages).
- 2026-10-25 ~18:05 (ROADMAP "Decided", "Mission sign-off pages"; #372 `docs/missions/prototypes/*/SIGNOFF.md`):
  - Two-Key Ledger, Q "Approve Two-Key Ledger as specced?" -> picked: "Hears and reacts (Recommended)" (recorded as
    option 1: the bell sends the porter, a Guard AI reaction; the rejected option was "Approve, but script the porter's
    walk (no Guard AI reaction; he always walks in 60 s after the door opens)").
  - Split Shift, Q "Approve Split Shift as specced?" -> picked: "Approve as drawn" (option 1).
  - Code Relay, Q "Approve Code Relay as specced?" -> picked: "Approve, code re-askable (Recommended)" (option 1: 2
    rules; a release that runs out can be asked for again, G334).
  - Tallow hold (Q1) -> picked: "Build now, walk later (Recommended)".

## Goal
The three signed-off twists run on Guard AI, not on scripts: the strongroom bell sends the Tallow Wharf porter to the
passage (Two-Key Ledger), the S2 power cut sends the facilities officer to the plant room by way of reception, where
he collects the reception officer (Split Shift), and the cage release calls the mobile supervisor to the cage front
(Code Relay). Each guard walks with his eyes and ears on, can be avoided or knocked out, and a section restart puts the
order back exactly when the mission state says the step is still done. Alongside: a guard alarm can stay in its own
area (D6), and loud places mask hearing, with power-linked sources (D8). Everything ships dark.

## Limits
- Out of scope: the mission engine (`src/game/mission/**`, the event raise, restarts, rule tracking: Campaign Build);
  map data (posts, noisy sources, area stage actions, guard placement: Sector Ops for `campusOps`, Campaign Build for
  `tallowWharf`, Marlow Yard for `ctcourse`); the HUD sound meter marker (D9: the HUD owner); `src/game/modes/**`,
  `src/game/sectors.ts`, `src/game/gameEvents.ts`; any wire or save change.
- Guard AI owns only `src/ai/**` hooks (plus its flags in `src/core/flags.ts` and its tests and e2e scenarios).
- Rules that hold: hard rules (CLAUDE.md: hot paths allocate nothing, gameplay never reads graphics, unfinished work
  dark), VISION rule 8 / bible P5 (fixed, explainable; G143), G299 (hearing, secure posts never leave), G125 (shared
  alert tier: see A9), G334 (no countdown), G350 (helmets by stage), G355 (walk cap limits switch-on only).
- Areas touched and their unwalked count (cap 3): Guard AI: 5, AT CAP. Every behaviour here is built dark behind its
  flag; switch-on comes with Michael's prototype walk (G355).

## Answers (M) and assumptions (A)
- M1 2026-10-25 ~18:05: the four prototype picks above (sign-off; no further Michael answer during the job yet).
- A1: A mission event's `guardTag` matches a guard of the live section whose `zone` tag equals it, or whose mission id
  `<sectionId>:<k>` (Campaign Build's `sectorGuardId`) equals it. No new slot tag. Undo: change `matchesTag` in
  `src/ai/missionOrders.ts`.
- A2: `postId` / `via` resolve first to a mission post (`MissionPost {id, x, z, y?, yaw?, circuit?}`, listed on the
  MissionDef by Campaign Build), then to a room id of the map (`layout.rooms`: the room's centre on its storey, the
  nearest walkable cell). Unresolved: the order is dropped, a dev warning once, and the pure check
  `checkMissionOrders` reports it in Campaign Build's mission tests. Undo: drop the room fallback.
- A3: The order kind is `'reset'` when the post carries a `circuit` (the guard walks there and works that board),
  else `'walk'`. `em.missionOrder(tag, kind, postId, via?)` stays explicit for tests and direct callers. Undo: add a
  `kind` field to the event (Campaign Build).
- A4: "Hears and reacts" = the bell is a Guard AI order to the tagged guard, gated by his state, not by a timer: dead,
  knocked out, held, passive, alerted or on a secure post, he does not come; on a board task, he takes it once free. No
  hearing-range gate (the bell rings in his own lodge). Undo: gate the order by `hearing.ts` tier at the post's point.
- A5: A walk order is calm: patrol pace, perception live, torch by the investigating rule; a glimpse stops him to look
  (suspicious) and he walks on; anything more drops the order and his normal AI runs. At the post he looks round
  `ORDER.lookT` (8 s), then rejoins his route. Undo: numbers in `ORDER` (`missionOrders.ts`).
- A6: Events with the same `name` and `via` form one group (Split Shift's two events, one per guard). A member already
  at `via` waits there; the group leaves `via` when all members are there or after `ORDER.joinWait` (20 s); the others
  follow the first `ORDER.followGap` (1.5 m) behind. On a reset, the first works the board and the others stand by and
  look round. A member who drops out (sent to his own board, knocked out) leaves the group. Undo: one event per walk.
- A7: A guard on a secure post (`post.secure`, G299 "should not leave their post") never takes an order;
  `checkMissionOrders` flags such a tag. Undo: allow it in `orderable`.
- A8: Restart: Guard AI drops every standing order when the section's guards are cleared (load or restart). Campaign
  Build re-raises, on the next tick after a restart, the events of steps still done (a per-team restart in Sector
  Ops). A replayed order walks again from the guard's spawn (the world restarted whole). Undo: place him at the post
  on a replay (`missionOrder(..., replay)`).
- A9 (loosens G125, back to the lead as a question, built dark): per-area stages nest under the shared site stage, as
  the signed-off BEATs draw them (Split Shift / Code Relay "Alarm escalation per area"): a panel raises the site stage
  as today; a guard's radio command call raises his area's stage only; site stage 2 when both areas reach 1 (Campaign
  Build). A guard reads max(site, his area) for gear and calm rules. Default until answered: flag `areaAlarms` off =
  today's one shared stage. Undo: leave the flag off, or drop slice S3.
- A10: A guard's area is the area box (and height band) holding his spawn point, fixed for the section; a
  reinforcement's is that of its entry point; no box = site only. Undo: `areaOf` in `src/ai/areaAlarms.ts`.
- A11: A noisy source may name a power `group`: it is live while that circuit is on (`on: 'off'` inverts it: a source
  that starts when the power goes). Read from the switch state (`AiContext.breakerOff`), a gameplay state, polled per
  AI tick, not per listener. Undo: drop the field; sources are always on.
- A12: Code keeps the field name `noisy`; the bible's `MapLayout.noiseZones` (5.2 S2) is a doc fix for the
  orchestrator. Undo: rename in code (data owners' files too).
- A13: Three Grey Coats' `mindersArrive` event rides the same hook at no extra cost; "He moves" (the spook) stays the
  engine's despawn / respawn. Co-op: orders run on the host (guard simulation); clients see the walk through the
  existing guard sync; no wire change, no `PROTOCOL_VERSION` touch.
- A14: Flags `missionOrders`, `areaAlarms`, `noiseZones`, default off, owner Night Shift | Guard AI Build; switch-on at
  Michael's prototype walk (date set by the orchestrator when the prototypes are walk-ready). `noiseZones` off also
  ignores map `noisy` data, so data owners can add sources early. Undo: the flag defaults.

## Questions for Michael (one click each, asked by day)
- Q1 (A9): Per-area alarm stages under the shared stage, as the Split Shift / Code Relay beats draw them? Options:
  "Yes, per area under the shared stage (Recommended)" / "No, one shared stage (G125 as written)". Blocks: switch-on of
  `areaAlarms` only (S3 builds dark). Default until answered: the flag stays off.

## Sign-off needed
No (no map, layout or look; the prototype pages are signed off).
