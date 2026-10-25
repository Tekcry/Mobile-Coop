# guard-ai-mission-hooks: brief
Owner: Night Shift | Guard AI Build. Status: current (plan fix round after PLAN-CHECK 76da6d00a).

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
    walk (no Guard AI reaction; he always walks in 60 s after the door opens)"). The page lists option 1 as "Approve as
    specced (no kills, the bell sends the porter, the coal chute exit)"; ROADMAP's recorded label is quoted above.
  - Split Shift, Q "Approve Split Shift as specced?" -> picked: "Approve as drawn" (option 1).
  - Code Relay, Q "Approve Code Relay as specced?" -> picked: "Approve, code re-askable (Recommended)" (option 1: 2
    rules; a release that runs out can be asked for again, G334).
  - Tallow hold (Q1) -> picked: "Build now, walk later (Recommended)".

## Goal
The three signed-off twists run on Guard AI, not on scripts: the strongroom bell rings in the gate lodge and the porter,
hearing it, walks to the passage (Two-Key Ledger); the S2 power cut sends the facilities officer to the plant room by
way of reception, where he collects the reception officer (Split Shift); the cage release calls the mobile supervisor
to the cage front (Code Relay). Each guard walks with his eyes and ears on, can be avoided or knocked out, and a section
restart puts the order back exactly when the mission state says the step is still done. The mission's own lamps and
radio lines follow what the guard did. Alongside: a guard alarm can stay in its own area (D6), and loud places mask
hearing, with power-linked sources (D8). Everything ships dark.

## Limits
- Out of scope: the mission engine (`src/game/mission/**`, the event raise, restarts, rule tracking, the mission's
  lamps and lines: Campaign Build); map data (posts, noisy sources, area stage actions, guard placement: Sector Ops for
  `campusOps`, Campaign Build for `tallowWharf`, Marlow Yard for `ctcourse`); the HUD sound meter marker (D9: the HUD
  owner); `src/game/modes/**`, `src/game/sectors.ts`, `src/game/gameEvents.ts`; any wire or save change.
- Guard AI owns only `src/ai/**` hooks (plus its flags in `src/core/flags.ts` and its tests and e2e scenarios).
- Order with J15 (guard-rules, same lead): this job builds after J15's PRs (PLAN "Order with J15").
- Rules that hold: hard rules (CLAUDE.md: hot paths allocate nothing, gameplay never reads graphics, unfinished work
  dark), VISION rule 8 / bible P5 (fixed, explainable; G143), G299 (hearing, secure posts never leave), G125 (shared
  alert tier: see A9), G334 (no countdown), G350 (helmets by stage), G355 (walk cap limits switch-on only).
- Areas touched and their unwalked count (cap 3): Guard AI: 5, AT CAP. Every behaviour here is built dark behind its
  flag; switch-on comes with Michael's prototype walk (G355).

## Answers (M) and assumptions (A)
- M1 2026-10-25 ~18:05: the four prototype picks above (sign-off; no further Michael answer during the job yet).
- L1 2026-10-25 (lead, fix round): decisions 1-10 on PLAN-CHECK (hearing gate, breaker take-over, one offer rule, J15
  order, A9 wording, C2 data, order phase, Code Relay walk item, S1 split, code facts); written into A4-A9 and the PLAN.
- A1: A mission event's `guardTag` matches a guard of the live section whose `zone` tag equals it, or whose mission id
  `<sectionId>:<k>` (Campaign Build's `sectorGuardId`; k = guard number - 1) equals it. No new slot tag. Undo: change
  `matchesTag` in `src/ai/missionOrders.ts`.
- A2: `postId` / `via` resolve first to a mission post (`MissionPost`, listed on the MissionDef by Campaign Build),
  then to a room id of the map (`layout.rooms`: the room's centre on its storey, the nearest walkable cell). A reset
  post's walk ends at the board's own switch (`BreakerHost.switchOf`), not at the post point. Unresolved: the order is
  dropped (phase `dropped`), a dev warning once, and `checkMissionOrders` reports it in Campaign Build's mission tests.
  Undo: drop the room fallback.
- A3: The order kind is `'reset'` when the post carries `circuits` (every circuit of that board; Split Shift 55 + 56),
  else `'walk'`. `em.missionOrder(tag, kind, postId, via?)` stays explicit for tests and direct callers. Undo: add a
  `kind` field to the event (Campaign Build).
- A4 (lead decision, "Hears and reacts"): a post may carry a `bell` (a point and a reach): the order is a sound at the
  bell, judged for each tagged guard through the normal hearing model (`EnemyManager.tierOf`: walls, ambient masking);
  heard at `ORDER.bellTier` (tier 1) or above = offered; not heard = dropped for him. State gate (the one offer rule,
  A6): dead, knocked out, held, passive, alerted or busy (an incident, breaker walk, lure, search or another order in
  hand) = he does not come, and the bell does not stand for later. Every other guard in the bell's reach reacts as to
  any device sound he is not sent to: he turns to look (`ALERT.hearLook`), no incident, no board report (G143).
  `checkMissionOrders` fails a bell the tagged guard would not hear at his post through one wall (`WALL_FACTOR`) plus
  the section's masking. Undo: drop the `bell` field (the order then goes by state alone).
- A5: A walk order is calm: patrol pace, perception live, torch by the investigating rule; a glimpse stops him to look
  (suspicious) and he walks on; anything more drops the order and his normal AI runs. At the post he looks round
  `ORDER.lookT` (8 s), then rejoins his route. Undo: numbers in `ORDER` (`missionOrders.ts`).
- A6 (lead decision, one offer rule): an order is offered ONCE, at its event, to the tagged guards eligible at that
  moment (A4's state gate; a secure post, A7, is never eligible). A tagged slot not placed yet at the event (a replay's
  pending spawn) is offered it once when placed in the same section load; a woken guard never. An ineligible guard
  never picks it up later: the order is dropped for him and recorded (`orderPhase`). Groups: events with the same
  `name` and `via` form one group (Split Shift's two). A member already at `via` waits there; the group leaves `via`
  when all members are there or after `ORDER.joinWait` (20 s); the others follow the first `ORDER.followGap` (1.5 m)
  behind. A member who becomes ineligible on the way (knocked out, alerted, sent by the board to a breaker fault in his
  own room) leaves the group the same way, dropped. Split Shift: #1 on his own board when the cut comes is busy, so he
  never joins; #7 waits `joinWait` and goes alone. Undo: one event per walk.
- A7: A guard on a high-security post (`PostDef.highSecurity`, getter `Enemy.secure`; J15 S7 lookouts are copied as
  high-security, so they count) never takes an order; `checkMissionOrders` flags such a tag (also a `lookout` post).
  Undo: allow it in `orderable`.
- A8: Restart: Guard AI drops every order when the section's guards are cleared (load or restart). Campaign Build
  re-raises, after a restart, the events of steps still done (a per-team restart in Sector Ops). A replayed order walks
  again from the guard's spawn (the world restarted whole). Undo: place him at the post on a replay.
- A9 (assumed and logged (G358), accepted by the lead 2026-10-25; loosens G125's shared tier): per-area stages nest
  under the shared site stage, as the signed-off BEATs draw them (Split Shift / Code Relay "Alarm escalation per
  area"): a panel raises the site stage as today; a guard's radio command call raises his area's stage only; site
  stage 2 when both areas reach 1 (Campaign Build). A guard reads max(site, his area) for gear and calm rules. The
  question goes to Michael on the prototype walk card (Q1). Undo: leave flag `areaAlarms` off (today's one shared
  stage), or drop slice S3.
- A10: A guard's area is the area box (and height band) holding his spawn point, fixed for the section; a
  reinforcement's is that of its entry point; no box = site only. Undo: `areaOf` in `src/ai/areaAlarms.ts`.
- A11: A noisy source may name a power `group`: it is live while that circuit is on (`on: 'off'` inverts it: a source
  that starts when the power goes). Read from the switch state (`BreakerHost.isOff`), a gameplay state, refreshed once
  per AI tick, not per listener; no breaker system = live. Undo: drop the field; sources are always on.
- A12: Code keeps the field name `noisy`; the bible's `MapLayout.noiseZones` (5.2 S2) is a doc fix for the
  orchestrator. Undo: rename in code (data owners' files too).
- A13: Three Grey Coats' `mindersArrive` event rides the same hook at no extra cost; "He moves" (the spook) stays the
  engine's despawn / respawn. Co-op: orders run on the host (guard simulation); clients see the walk through the
  existing guard sync; no wire change, no `PROTOCOL_VERSION` touch.
- A14: Flags `missionOrders`, `areaAlarms`, `noiseZones`, default off, owner Night Shift | Guard AI Build; switch-on at
  Michael's prototype walk (date set by the orchestrator when the prototypes are walk-ready; `areaAlarms` by his click
  on Q1 there). `noiseZones` off also ignores map `noisy` data, so data owners can add sources early. Undo: defaults.
- A15: Code Relay "code re-askable": one walk per raise. If the engine takes the release step back and raises it again,
  the supervisor walks again (a fresh release is a fresh site-log entry); a lapsed code that does not undo the step
  sends nobody. Undo: an order name already done this section load is ignored.

## Questions for Michael (on the prototype walk card, by the orchestrator)
- Q1 (A9): Per-area alarm stages under the shared stage, as the Split Shift / Code Relay beats draw them? Options:
  "Yes, per area under the shared stage (Recommended)" / "No, one shared stage (G125 as written)". Blocks: switch-on of
  `areaAlarms` only (S3 builds dark). Default until answered: the flag stays off.

## Sign-off needed
No (no map, layout or look; the prototype pages are signed off).
