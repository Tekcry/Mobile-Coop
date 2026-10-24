# section-rating - PLAN

Defaults A1-A8 from BRIEF.md apply until Michael answers. Each slice owns its files; no two slices share a file, so
slices with met dependencies run in parallel. Every slice: implementer, fresh checker, at most 1 fix round (Opus).
Agents run single vitest files and tsc, never a full `npm run check`.

## Stat events (where each is emitted today)
| Stat | Emitted today | Gap |
|---|---|---|
| Detected (guard) | `src/game/playstyle.ts:12` `StealthRating.detections++`; read as a delta at `src/game/modes/courseMode.ts:476-477` | Sector Ops reads it only at the op end (`sectorMode.ts:496`): needs a per-section delta |
| Detected (camera) | `src/game/modes/sectorMode.ts:453` `camAlarms++` | Per-section counter |
| Alarm raised | `src/game/stealthSystems.ts:510` `events.emit('alarm')`; course counts it at `courseMode.ts:202` | Sector Ops: count per section. guard-ai alarm stages must raise the same `alarm` event per stage (interface) |
| Kill / knock-out | `src/game/gameState.ts:649` -> `mode.onEnemyKilled(e, h)`; course counts at `courseMode.ts:760` (`e.ko` -> knockouts) | Sector Ops counts only op totals (`g.stats`): needs per-section, per-player |
| Body found | `src/game/stealthSystems.ts:144` `events.emit('bodyFound')`; course at `courseMode.ts:203` | Sector Ops: count per section. guard-ai camera-sees-body reports must emit the same `bodyFound` (interface) |
| Takedown done | `src/game/takedownController.ts:648` `events.emit('takedown', {phase:'done', lethal, kind})` | No player id on the event; on the host the partner's knock-out arrives as `onEnemyKilled` with `h.attackerId` |
| Synced takedown | None (G52: the dual takedown is not built) | New: a pure detector in S1 from knock-outs / takedowns by two different players within 1.5 s (A6). CT Core's dual move, if built, reports one synced takedown directly |

Host authority: only the host counts stats and rates (as the course does today). The client gets the result.

## Maps
- Sector Ops (the research campus, `src/game/sectors.ts` data, sector-redesign's sections): a section is rated when
  its connector unloads it (`sectorMode.ts:400`); the reward is granted when the next section loads
  (`sectorMode.ts:403`). The last section's rating shows on the op end.
- Marlow Yard (training course, `courseMode.ts`): only bays / sets with guards are rated (A5); drill bays stay unrated
  (D31). The finale keeps Ghost / Silent / Loud (`courseRating.ts`) beside the four marks.

## Save shape
No profile change, no `SAVE_VERSION` bump. A new kv key `rating:sections` in the existing `kv` store (the
`course:fallow` pattern, C9): `{ v: 1, maps: { [mapId]: { [sectionId]: { marks: 0-15 bitmask, synced: number } } } }`.
Best per section (most marks, then most synced), sanitised on read, written by the host only.

## Wire
One `PROTOCOL_VERSION` bump (31 -> next free number at merge).
- Sector state (packed in `sectors.ts:605`): add `rt`, the last section's rating `{ sec, marks, synced, grant }`
  (numbers only). Live per-section counters are not sent.
- Course message (`protocol.ts:521-548`, the `stat` parser): add `synced` (clamped 0-1e4).
- Validators clamp every new field; an old client is refused by the version check.

## Slices

### S1 - pure rating rules (Sonnet, strict brief) - size S - no dependencies
Owns: `src/game/rating/sectionRating.ts` (new), `tests/sectionRating.test.ts` (new).
- `SectionStats { detections, camAlarms, alarms, kills, knockouts, bodiesMade, bodiesFound, synced }`,
  `newSectionStats()`, `resetSectionStats(s)` (in place, no allocation).
- `rateSection(s, rules)` -> marks bitmask: UNDETECTED, NO_KILLS, NO_ALARMS, BODIES_HIDDEN; `rules` holds the A2-A4 flags.
- `rewardsFor(marks, synced, ctx { coop, preset, gadgetsAtStart, syringesAtStart })` -> `Grant { gadget, syringe,
  medkit, alarmStep }` from one data table (A1, A7 solo column). Caps: gadgets never above the starting count,
  syringes at most +2 over the preset.
- `SyncedDetector`: `onTakedown(player, t)` returns true on a synced pair (two different players within
  `SYNC_WINDOW` = 1.5 s, each takedown used once) plus a direct `addSynced()` for a future dual move; fixed slots.
- `RATING_LABEL` strings for the card. Babylon-free.
Tests: each mark on and off, A2-A4 flags, reward caps, solo column, detector window edges and re-use.

### S2 - Sector Ops host stats, rating and grants (Opus) - size M - needs S1
Owns: `src/game/modes/sectorMode.ts`, `src/game/sectors.ts`, `src/game/gadgetSystem.ts`.
- Per-section `SectionStats` on the host: detection delta (playstyle), `camAlarms`, `alarm` and `bodyFound` events,
  `onEnemyKilled` (kills / knock-outs; synced via the detector with `h.attackerId`).
- Rate at connector unload; grant at the next load: `GadgetSystem.topUp(id, n, cap)` (new, small), syringes in the run
  state, medkit in solo. `alarmStep`: until guard-ai's stage API is on master, Bodies hidden gives +1 gadget charge
  instead (the lead logs this as A9 in BRIEF when it applies).
- Restart (A8): resets the section's counters, keeps the grant already given, never re-rates.
- Packs `rt` in the sector wire state (`sectors.ts:605`); `sectorResult` gains each section's marks.
- Calls S5's `updateRatingRecord(mapId, sectionId, marks, synced)` (signature fixed here).
- Test hook `window.__sectionRating` (current stats, last rating, last grant).
Tests: logic stays in S1 where possible; e2e in S7.

### S3 - wire (Opus) - size S - needs S1 (types only)
Owns: `src/net/protocol.ts`, `src/net/validate.ts`, `src/net/coopHost.ts`, the client file that applies sector /
course state (lead confirms the name before the brief), `tests/ratingWire.test.ts` (new).
- Bump `PROTOCOL_VERSION`; parse and clamp `rt` and the course `synced` stat; the client exposes the last rating to
  the HUD. `src/net` stays behind dynamic `import()`.
Tests: round trip, clamping, junk dropped, version refusal.

### S4 - rating card and op-end lines (Sonnet, strict brief) - size S - needs S1
Owns: `src/ui/hud/ratingCard.ts` (new), `src/ui/screens/resultsScreen.ts`, the card's CSS (a new file beside the card).
- At each section end: four marks (tick / cross), synced count, the grant ("+1 jammer charge", "+1 syringe"), shown
  4 s, needs no input. Op end / course end: one line per section.
- Reads only S1's types and a `RatingView` passed in by the mode (host) or the client apply (S3). No graphics reads.
Tests: DOM checks in S7; a small Vitest if the text builder is pure.

### S5 - best rating record and select pips (Sonnet, strict brief) - size S - needs S1
Owns: `src/save/ratingRecord.ts` (new), `tests/ratingRecord.test.ts` (new), the op / course select screen file (lead
confirms; likely `src/ui/screens/missionsScreen.ts`).
- kv key `rating:sections` (shape above): sanitise, best-of compare, `loadRatingRecord`, `updateRatingRecord`.
- Select screen: per section, the best marks as four small pips.
Tests: sanitise junk, best-of, a literal stored record round trip (fake-indexeddb).

### S6 - Marlow Yard rated sets (Opus) - size M - needs S1, S2 (`topUp`)
Owns: `src/game/modes/courseMode.ts`, `src/game/course/courseState.ts`, `src/game/course/courseRating.ts`, the course
data file that gets the per-bay `rated` flag (lead confirms under `src/game/course/`).
- `BayStats` gains `synced`; bays with `rated: true` are rated at their airlock; grants as in Sector Ops (2 players).
- Finale tier unchanged; marks shown beside it.
Tests: a new `tests/courseMarks.test.ts` for rated and unrated bays.

### S7 - e2e (Sonnet, strict brief) - size S - needs S2, S3, S4
Owns: `scripts/e2e-section-rating.mjs` (new); the lead adds its line to the e2e suite list at the merge.
- Solo Sector Ops via `?autostart`: clear section 1 clean through test hooks -> card shows 4 ticks and the grant;
  force a kill -> No kills crossed. Co-op (two browsers): a synced pair -> synced 1 on both screens, +1 syringe.
- Also run `scripts/e2e-sectorops.mjs`, `scripts/e2e-course.mjs` and the co-op suite (quick run per step; the full
  `npm run e2e` at the end).

## Order and parallelism
1. S1 alone (short).
2. S2, S3, S4, S5 in parallel (disjoint files).
3. S6 (after S2) and S7 (after S2-S4) in parallel.
4. One checker per batch (Opus for S2 / S3 / S6, Sonnet for S1 / S4 / S5 / S7), then one PR to master.

## Interfaces from other jobs (not built here)
- guard-ai: every alarm stage raises the existing `alarm` event; found bodies (by guards and cameras) emit `bodyFound`;
  a stage API for `alarmStep` (skip one stage next section). S2 has a fallback until it lands.
- sector-redesign: the between-section weapons crate is not a rating reward; section ids stay stable in `sectors.ts`.
- CT Core: suppressor ammo (the No kills reward switches from medkit to suppressor rounds once it exists); a dual
  takedown move reports through `SyncedDetector.addSynced()`.

## Docs at the end
`docs/systems/modes-and-progression.md` (rating section), `docs/systems/coop.md` (wire fields), `TESTING.md` checklist
lines, `changes/feature-section-rating.md` fragment, STATE.md.
