# S5 / S5b module step - posts and guard-ai map data (pure modules only)

Job guard-ai, branch `feature/guard-ai`, 2026-10-23. Spec: BRIEF goal 7, A10, A12; PLAN S5 / S5b, "Data shapes";
tactics-design sections 6 and 11; STATE "Open" (Course Ready K1-K4, Menu Notes). No existing file edited; wiring is
the next step.

## Files
- `src/ai/posts.ts` (new)
- `src/ai/guardAiData.ts` (new)
- `tests/posts.test.ts` (new, 12 tests)
- `tests/guardAiData.test.ts` (new, 15 tests)

## API
### posts.ts
- `PostDef { leash: number; highSecurity?: boolean; guards?: string }`.
- `POST` table: `minLeash 0.5`, `lureLook 5` s (A12: >= 5), `lureSweep 0.6` rad (A12: <= +-0.6), `lureSweepPeriod 3` s,
  `returnFace 0.8` s (holds the post yaw after the walk back), `lureWalkMax 12` s (a blocked walk looks from where he
  got to), `arrive 0.3` m (suggested `atTarget` radius).
- `clampToLeash(px, pz, postX, postZ, leash, out: P2): P2` - point inside stays, outside goes to the edge, leash <= 0
  returns the post. Writes into `out`, no allocation.
- `lurePoint(lureX, lureZ, postX, postZ, leash, out)` - the leash point nearest the lure (edge when outside).
- `inLeash(x, z, postX, postZ, leash)` - inside the circle plus `POST.arrive`.
- `mayLeave(post | null | undefined, kind: IncidentKind)` - no post / normal post: true; `highSecurity`: always false.
- `PostLure` (class, no allocation per step): `start(lureX, lureZ, postX, postZ, postYaw, leash)`, `cancel()`,
  `active`, `step(dt, atTarget, out: PostLureOut): LurePhase`. Phases `LURE` idle 0 / walk 1 / look 2 / back 3 / face 4
  / done 5. `out = { x, z, yaw, moving, phase }`: walk -> target the look point, yaw = lure bearing (hint while moving);
  look -> stand, yaw = bearing + 0.6 x sin(2 pi t / 3) for 5 s; back -> target the post, moving; face -> post yaw
  0.8 s; done / idle -> post, post yaw. `atTarget` = "at the target the previous step gave"; it is ignored on the
  first step after `start` (no target given yet). A lure inside the circle: he walks onto it and looks along
  post -> lure. Yaw convention as `Enemy`: atan2(dx, dz), 0 = +Z.

### guardAiData.ts
- Types: `GuardZone { id, section, rects: RoomRect[] }`, `ReinforceEntry { section, at, y?, route?, yaw? }`,
  `GuardSquadDef { id, section, officer? }`, `GuardAiLayout { zones?, noisy?, entries?, squads? }`,
  `BehaviourProfile = 'standard' | 'aggressive'`, `GuardSlot` (= `Pick<SquadSlot, x | z | y | route | free>` +
  `post? profile? key? squad?`: today's `SquadSlot` and the wired one both satisfy it), `PlanBounds`.
- Re-exports `type NoisySource` (still defined in `hearing.ts`) and `type PostDef`.
- Constants: `SECTION_SQUAD_BASE 100`, `DEFAULT_SQUAD_BASE 50` (hand-set squads 0..49, default clusters 50+),
  `MAX_GUARD_KEYS 32`, `SQUAD_CLUSTER_M 12`, `SQUAD_STOREY_M 2.5`, `NOISY_LIMITS` db 0..30, radius 1..20.
- `squadId(section, squad)` = section x 100 + squad.
- `defaultSquads(slots, out, radius = 12): number` - for ONE section's slots: single-linkage clusters of posts within
  12 m (chained; never across storeys when both `y` are set). Writes `out[i]` = cluster index (0, 1, ... numbered by
  each cluster's first slot, stable) or -1 for a slot with a hand-set `squad`. Caller joins slot i to
  `squadId(section, DEFAULT_SQUAD_BASE + out[i])`, or `squadId(section, slot.squad)` when `out[i]` is -1. Returns the
  cluster count. Load time only (one scratch array).
- `sectionAt(layout, x, z, fallback = 0)` - the first zone containing the point, else 0.
- `validatePosts(slots, label = 'slot'): string[]` - leash finite and >= 0, exactly 0 or >= 0.5; a posted guard's
  route stays inside his leash (+0.3); a high-security post is not `free`; `profile` known.
- `validateGuardAi(layout, slots, { bounds?, sections?, section? }): string[]` - zones (unique ids, section integer >= 0,
  rects present, min < max), noisy (db 0..30, radius 1..20, unique ids, inside bounds, known section), entries (known
  section, inside bounds with route points), squads (known section, unique id per section), keys (`slot.key` or index
  in its section: integer 0..31, unique per section), hand-set squads 0..49, plus `validatePosts`. Known sections:
  `sections` (0..n-1) if given, else the zones' sections, else {0}. `section` puts every slot in one section (Sector
  Ops: validate one `SectorDef`'s guards with `{ sections: sectors.length, section: i }`).

## Judgement calls (undo noted)
- "highSecurity needs a post" read as: a high-security guard must stand his post - not `free`, no route point outside
  the leash (normal posts get the route check too). Undo: drop the checks in `validatePosts`.
- Default squads use a separate number range (50+) so they never collide with Course Ready's hand-set `squad` numbers.
- A slot outside every zone on a zoned map is section 0 (no error).
- `GuardSquadDef.officer` is free text, not validated (SquadSlot has no id yet).

## Tests (all pass)
`npx vitest run tests/posts.test.ts tests/guardAiData.test.ts`: 27 passed. `npx tsc --noEmit -p tsconfig.json`: exit 0.
`npx eslint` on the four files: clean.
- posts: clamp inside / outside / diagonal / leash 0; lurePoint inside and on the edge; mayLeave over every
  `IncidentKind` (none, normal, leash 0, high security); A12 table; K4-like keyholder (leash 3, high security, noise
  8 m away behind-left, walker at 1.2 m/s, 60 Hz): phases walk -> look -> back -> face -> done, reaches the edge
  within 0.3 m, never past 3 m, looks >= 5 s within 0.6 rad of the lure bearing (and does sweep > 0.3), back on the
  post facing his yaw; lure inside the circle; leash 0 (turns on the spot); `atTarget` semantics; blocked walk times
  out to look; cancel.
- guardAiData: squadId; defaultSquads chains, separates, skips hand-set squads, storeys, custom radius, empty; a good
  layout passes; each error: leash 0.3 / -1 / NaN, high-security free, high-security route out, normal route out,
  unknown profile, noisy db / radius both ends / duplicate / bounds / section, entry bounds / route bounds / section,
  squad section / duplicate, zone duplicate / negative / no rects / min >= max / unknown section, key 32, duplicate
  key per section (and the same index in two sections is fine), non-integer key, squad 50; Sector one-section option;
  sectionAt.

## Wiring left (next step; files other than these four)
- `src/world/rooms.ts`: `SquadSlot` gains `post?: PostDef` and `profile?: BehaviourProfile` (and `key?: number`,
  design 11) - `import type` from `../ai/posts` / `../ai/guardAiData`.
- `src/world/mapDef.ts`: `MapLayout.guardAi?: GuardAiLayout`.
- `src/game/sectors.ts`: `SectorDef.noisy?: NoisySource[]` and `entries?: ReinforceEntry[]` (only those two lines plus
  the type import, as agreed with Course Ready; the section is the SectorDef's index).
- `src/ai/enemyManager.ts`: `EnemyManager.placeSlot(e, slot, section)` for map modes to call after `spawn`, reading
  `squad` (join `squadId(section, squad)`, else the `defaultSquads` cluster), `handler` (dog heels on that guard),
  `zone` (return point after a search; secure-zone guards answer first inside their leash), `role` (alarm runner,
  radio-check caller, light checker preference), `pair` (S10), `post` (leash, `mayLeave` in the incident board's
  investigator / search / alarm-runner choice, `PostLure` on a distraction for a high-security post) and `profile`.
  `sectorMode` calls `em.placeSlot(e, slot, sectionIndex)`; Course / Marlow map code passes `sectionAt(guardAi, x, z)`.
- Map teams: call `validateGuardAi` / `validatePosts` in their map tests (Course Ready: per section with
  `{ sections, section }`; Menu Notes: `MapLayout.guardAi` with the map bounds).

## Not done
- No behaviour change in game yet (no existing file touched); no e2e, no `npm run check` (per the step brief).
