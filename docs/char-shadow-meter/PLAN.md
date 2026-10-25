# Character shadows in the light meter: PLAN
Owner: Sector Ops Build. Status: plan, revised for plan check 1 (FIX, 6 items); waits for a fresh Opus plan checker. Brief: `BRIEF.md`; today's
code: `research/current.md`. Gate (FOLDED-PLAN J16): Opus plan, two Opus checkers per PR. Depends on J10 for the GPU
numbers and the walk only (A12).

## 0. Claims
Every file S1-S5 change (section 3 names the slice that owns each). Settlement with other jobs: section 3a.

```claims
files:
  - src/world/charOccluders.ts
  - src/world/shadowCues.ts
  - src/world/lightField.ts
  - src/world/bakedLamps.ts
  - src/world/charShadowSet.ts
  - src/core/flags.ts
  - src/game/charOccluderFill.ts
  - src/game/gameState.ts
  - src/ui/screens/settingsScreen.ts
  - tests/charOccluders.test.ts
  - tests/lightField.test.ts
  - tests/charOccluderFill.test.ts
  - tests/shadowCues.test.ts
  - tests/charShadowSet.test.ts
  - scripts/e2e-parity.mjs
  - scripts/e2e-stealth-ai.mjs
  - scripts/e2e-coop.mjs
  - docs/systems/lighting.md
  - docs/systems/testing-tools.md
  - docs/char-shadow-meter/**
maps: none
protocol: none
save: none
```

## 1. The model
For a sample point p (a player's chest or head, a body, a guard's aim point) and an owner key `skip` (the sampled
character, or -1):

    level(p) = ambient + bounce + moonLight x moonVis(p) x T_moon(p)
             + sum over the column's lamps i of L_i(p) x T_i(p)          (T_i = 1 when L_i(p) < CHAR_LIGHT.minLevel)
             + sum over flashlights j of D_j(p) x T_j(p)                 (after the static Occluder test, as today)
    T_s(p)   = product over capsules c != skip, not holding s (A5), whose box meets the p-to-s segment, of
               capsuleTransmit(p, s, c)

- `capsuleTransmit` is the GLSL `lampCapsule` (src/world/bakedLamps.ts:1312-1332) ported line for line: own surface
  (within `CAPSULE.self` 1.6 r) -> 1; soft edge `pen = r * 0.35 + behind * 0.12`;
  `mix(0.15, 1, smoothstep(r - pen, r + pen, dist))`. The GLSL string moves next to the TS (`LAMP_CAPSULE_GLSL` in
  charOccluders.ts, built from the same `CAPSULE` constants, as `LAMP_MATH_GLSL` is) and bakedLamps imports it: one
  formula, two languages, a test comparing them on random cases.
- The moon's source point is p + `moon.dir` x 60 m (src/world/lightBake.ts:126); its `L` is `moonLight x moonVis(p)`.
- `CHAR_LIGHT.minLevel` 0.04 is defined in charOccluders.ts and `CHAR_SHADOW.minLevel` (src/world/charShadowSet.ts,
  the picture's slot reach) is set from it: the picture follows the gameplay constant, never the reverse (gameplay
  imports nothing from charShadowSet.ts).
- Broad phase per source: a capsule is tested only when its box, grown by r + 0.35 r + 0.12 x the segment length (the
  widest soft edge), meets the segment's box. Exact: a brute-force test over random scenes must give the same bytes.
- Never read: `CHAR_SHADOW_PRESET`, `LampSlotPicker`, `charShadowSpec`, `src/core/quality`, the governor, any rig or
  mesh. A source-grep test in the style of tests/visionIsolation.test.ts:53 enforces it for charOccluders.ts,
  shadowCues.ts, charOccluderFill.ts and lightField.ts.

Parity on every preset (what the picture does with the same capsules):

| Preset | Picture under a character | Meter |
| --- | --- | --- |
| Off (char shadows off) | round shadow from every lamp (16 capsules, 4 per lamp) | same formula, every set lamp |
| Low / Medium | real outline from the 1 nearest lamp, round from the rest; both floor 0.15 | same; the outline lamp reads the capsule |
| High / Ultra / Epic | real outline from 2 / 3 / 4 nearest, round from the rest | same |
| Shadows Off (moon) | no moon character shadow (cascades off) | moon counted (A6) |
| `?gfx=min` debug path | no baked lamps, no round shadows (as today for every lamp shape) | unchanged rule; not a player preset |

Known picture limits (picture only, logged in lighting.md): 16 capsules in all (contract order: local player,
partner(s), guards and bodies nearest the local player), 4 per lamp; outline edges differ from the capsule by the
limbs and weapons.

## 2. Interfaces (exact; slice briefs copy them)

```ts
// src/world/charOccluders.ts (pure, Babylon-free, no allocation after construction)
export const OCC = { max: 64, stride: 8 } as const;            // per capsule: ax ay az bx by bz r kind
export const OCC_KIND = { player: 1, guard: 2, dog: 3, body: 4 } as const;
export const CAPSULE = { floor: 0.15, self: 1.6, penR: 0.35, penBehind: 0.12, holder: 0.6 } as const;
export const CHAR_LIGHT = { minLevel: 0.04, maxLamps: Infinity, moonFar: 60 } as const;
export function occKey(kind: number, index: number): number;    // kind << 16 | index
export class CharOccluders {
  readonly cap: Float32Array;     // OCC.max * OCC.stride
  readonly owner: Int32Array;     // occKey per capsule
  n: number; version: number;
  clear(): void;
  add(kind: number, index: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): number; // slot or -1 when full
  /** Product of capsuleTransmit over the capsules between (px,py,pz) and the source (sx,sy,sz), `skip` excluded; into `t`. */
  transmitInto(sx: number, sy: number, sz: number, px: number, py: number, pz: number, skip: number): void;
  t: number;
}
export function capsuleTransmit(px, py, pz, lx, ly, lz, ax, ay, az, bx, by, bz, r): number;
export const LAMP_CAPSULE_GLSL: string;

// src/world/lightField.ts (added optional arguments; absent = today's bytes)
totalAt(x, y, z, occluded?: Occluder, chars?: CharOccluders | null, skip?: number): number;
bodyLevel(x, feetY, z, height, occluded?, hx?, hz?, chars?: CharOccluders | null, skip?: number): number;
/** The gameplay set at a point (section 1), strongest first: registry light ids (-1 the moon) into `ids`, their terms
 *  (no character term) into `lv`; returns the count (<= max). For ShadowCues (S3); no allocation. */
sourcesInto(x, y, z, ids: Int32Array, lv: Float32Array, max: number, occluded?: Occluder): number;
/** One set member's term at a point (no character term); 0 where it does not reach (wall, door, visibility). */
sourceAt(id: number, x, y, z, occluded?: Occluder): number;
```
S1's first commit (the interface commit) lands these signatures, `OCC`, `CAPSULE`, `CHAR_LIGHT`, the `CharOccluders`
class shape and the flag, with stub bodies; S3 builds against it and never edits lightField.ts or charOccluders.ts.

```ts
// src/world/shadowCues.ts (pure; the Guard AI "faint cue" input; host and solo only)
export const CUE = { players: 4, sources: 3, points: 3, minLevel: 0.08, maxLen: 6, floorLift: 0.05 } as const;
export class ShadowCues {
  /** Player ids in slot order (the host's `playerRefsInto` order); `slotOf(id)` is a linear scan, no allocation. */
  slotOf(id: string): number;
  readonly count: Int8Array;      // [slot] footprints in use (0..CUE.sources)
  readonly pts: Float32Array;     // [slot][source][point] x, y, z, contrast (stride 4); contrast 0 = no shadow there
  readonly speed: Float32Array;   // [slot][source] m/s of the footprint's far point since the last fill
  readonly source: Int32Array;    // [slot][source] registry light id, -1 the moon
  version: number;                // bumped each 10 Hz fill
}
```

- A footprint: the source's horizontal direction away from the player's feet; length = the capsule top projected to the
  feet plane, clamped to `CUE.maxLen` (the moon: by its elevation); points at 0.35, 0.65 and 1.0 of it, lifted
  `floorLift`. Contrast at a point q = `L_s(q) x (1 - CAPSULE.floor) / max(level(q), 0.02)`, 0 where the source does
  not reach q (a wall, a closed door, its visibility). Sources = the 3 strongest set members at the chest giving at
  least `CUE.minLevel`.
- Guard AI reads `GameState.shadowCues` (readonly, null when the flag is off or on a client) through their own
  `AiContext` wiring; they test points against a guard's cone and line of sight and decide the cue (suspicion only, per
  Q14's option text). Nothing in shadowCues.ts knows about guards.

## 3. Slices

Each file has one owning slice. Branch `feature/char-shadow-meter` (the job branch) unless the row says otherwise.

| Slice | What | Files (owned) | Lines | Model | Branch, order | Checks |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Contract, capsule formula (TS + GLSL from one source), field term (lamps, moon, flashlights with the holder rule), `sourcesInto` / `sourceAt`, flag | new src/world/charOccluders.ts (~260); src/world/lightField.ts (~+120); src/world/bakedLamps.ts (GLSL import, ~25); src/world/charShadowSet.ts (`minLevel` from `CHAR_LIGHT`, 2); src/core/flags.ts (+5); new tests/charOccluders.test.ts (~320); tests/lightField.test.ts (~+160) | ~890 | Opus | job branch, first; pushes the interface commit (section 2) before the bodies | tsc fast; vitest charOccluders, lightField, charShadowSet, lampFalloff |
| S2 | Meter wiring and the picture feed: fill the contract at 10 Hz from the sim (local player from the controller and `lightSampleHeight`, remotes from MoveState, guards from `takedownVictims()` on host and client: the interim fill); `bodyLevel` with the contract and owner for the local player and every remote; `BakedLamps.capsules` from the contract when the flag is on; every lighting.md line of this job (parity section, the one P1 / L11 wording, marked "with `charShadowLight` on") | new src/game/charOccluderFill.ts (~150, pure); src/game/gameState.ts (~+70 at :618, :907-914, :1659-1701); new tests/charOccluderFill.test.ts (~180); docs/systems/lighting.md (~+35, the character-shadow section :222-249 after J1 #433) | ~440 | Opus | job branch, after S1 | tsc fast; vitest charOccluderFill, lightField, coopPerception; affected-e2e plus requested e2e-coop + e2e-netmove (src/game gate) |
| S3 | Cast-shadow cues for Guard AI, pure class only | new src/world/shadowCues.ts (~230); new tests/shadowCues.test.ts (~250) | ~480 | Opus | `feature/char-shadow-meter-s3` (own worktree), from S1's interface commit; runs beside the rest of S1 and S2 | tsc fast; vitest shadowCues, charOccluders |
| S3b | The cue fill in GameState: build `ShadowCues` with the flag on (host and solo), fill it at 10 Hz right after the meter, `GameState.shadowCues` readonly (null otherwise) | src/game/gameState.ts (~+25, after :1701) | ~25 | Opus (S3's builder) | job branch, after S2 is pushed and the lead has merged the S3 branch into the job branch | tsc fast; vitest shadowCues, charOccluderFill; affected-e2e plus e2e-coop + e2e-netmove |
| S4 | Checks: the character-shadow card in `e2e-parity` part 4 (Warehouse; a parked guard between a lamp and the grey card; screen luma inside the shadow vs the field with the contract, at char shadows Off, Low and Epic; its own `charlight=1` page per preset); e2e-stealth-ai (flag on: a guard parked in a lamp's path drops the meter under its shadow by the field's amount, and a watching guard fills slower than with the meter pinned to the unshadowed value); e2e-coop probe (host's and client's light for the client within 0.02 with a parked guard); testing-tools.md lines | scripts/e2e-parity.mjs (~+180; imports `scripts/parity-lib.mjs`, never edits it); scripts/e2e-stealth-ai.mjs (~+120); scripts/e2e-coop.mjs (~+80); docs/systems/testing-tools.md (~+10, the e2e-parity entry) | ~390 | Sonnet from a strict Opus brief | job branch, after S3b and after J11's PR B (C1 + C2) is on master (section 3a) | node --check; laptop queue: `--suites "e2e-parity,e2e-stealth-ai,e2e-coop"` (E2E_GPU=1) |
| S5 | Settings help: two strings, chosen by the flag; the bible / VISION wording note to the orchestrator (STATE) | src/world/charShadowSet.ts (`CHAR_SHADOW_HELP`, ~+12); src/ui/screens/settingsScreen.ts:340 (1 line); tests/charShadowSet.test.ts (~+20) | ~35 | Haiku | job branch, after S4 | tsc fast; vitest charShadowSet |

Parallel: only S3 runs beside other slices (S1 after its interface commit, then S2). S3 owns two new files that no
other slice names; S1, S2, S3b, S4 and S5 run one after another on the job branch. The L16 fix (lighting.md:225 "0
lamps") is already in J1 #433 (`feature/sector-ops-docs`), so no slice repeats it; S2's lighting.md lines and S5's
string build on #433's text and start after #433 is on master (if it is not, the slice waits; it is a docs PR).

Done looks like:
- **S1**: vitest charOccluders, lightField, charShadowSet, lampFalloff green; every existing lightField test passes
  unchanged (no contract = today's values exactly); a capsule between one lamp and the chest scales only that lamp's
  share, to the formula's value (0.15 inside the umbra); TS formula = GLSL reference port on 10k cases within 1e-6;
  broad phase = brute force bytes; `allocPerCall` 0 for `totalAt` / `bodyLevel` / `sourcesInto` / `sourceAt` with a
  contract; the source-grep isolation test passes; `flags.charShadowLight` is false without `?charlight=1`.
- **S2**: vitest charOccluderFill (local, remote, guard capsules; crouch lowers the top; dead guards absent; two
  "machines" with the same inputs give the same bytes) green. Flag off: `rtCapsules` still feeds `BakedLamps`,
  `updateLight` passes no contract, and affected-e2e + e2e-coop + e2e-netmove are green on the laptop. Flag on
  (`?charlight=1&debug=1`, warehouse): standing in a parked guard's shadow under a lamp, `g.lightLevel` equals
  `field.bodyLevel(..., contract, owner)` within 0.001 and is lower than the same call without the contract; the
  meter tick is <= 0.1 ms p95 on campus S5 with 4 players (A11), logged in the build report.
- **S3**: vitest shadowCues green: an overhead lamp gives a footprint under the feet, a side lamp one pointing away
  from it with the projected length; a wall cuts the far points to contrast 0; the moon footprint follows its
  elevation; speed from two fills; the 3 strongest sources picked; contrast 0 in darkness; `allocPerCall` 0 for a
  fill; shadowCues.ts imports nothing from src/game, src/ai or graphics (isolation grep).
- **S3b**: flag off, `GameState.shadowCues` is null in solo, host and client (an e2e-coop read of
  `__game.shadowCues`); flag on, solo or host standing under a lamp: `version` rises ~10 a second and `count[slot]` > 0;
  a client stays null. affected-e2e + e2e-coop + e2e-netmove green.
- **S4**: three laptop runs on the PR head, all green: the `e2e-parity` part 4 card prints a `CHARSHADOW` row where
  the field level inside the shadow (with the contract) is lower than outside, and the three inside reads (char
  shadows Off, Low, Epic) agree within 0.03 luma (start value, set from the proofs); before J10 the band check is
  report only and the pass rule is the luma ratio inside / outside within 0.1 of the field ratio mapped through the
  card's band (section 5); part 4 stays <= 150 s; e2e-stealth-ai: meter under the shadow = field with contract within
  0.02, and the watching guard's fill is slower than with the meter pinned to the unshadowed value; e2e-coop: host's
  and client's light for the client within 0.02 with a parked guard. Every other card and scenario reads as before
  (the new blocks open their own `charlight=1` pages).
- **S5**: vitest charShadowSet: `CHAR_SHADOW_HELP.off` is byte for byte the master string after #433;
  `CHAR_SHADOW_HELP.on` says "the nearest lamp on Low and Medium" because `CHAR_SHADOW_PRESET.low.lamps` and
  `.medium.lamps` are 1, "more lamps from High" because `.high.lamps` > 1 (the test reads the table, so a preset change
  fails it), and only the `on` string mentions the meter darkening. Flag off, Settings shows the off string.

PRs (each under ~1.5k changed lines, each its own two Opus checkers):
- **PR A (Sector Ops first, shared files)** = S1 + S2, ~1.33k. Lands the contract and gameState.ts:1660-1701 so Guard
  AI and Player branch from it.
- **PR B** = S3 + S3b + S4 + S5, ~0.93k. S4's GPU numbers are final only after J10 (section 5).

No maps, no save paths, no wire change (no protocol line touched). Flag line: see BRIEF A9 (`charShadowLight`, owner
Sector Ops Build; walk areas Lighting and Sector Ops, Guard AI for the cue; switched on by Michael's yes on the walk
card of the first release with J10's re-bake, PR B and Guard AI's cue PR on master). With the flag off every path is
today's: the field gets no contract, `rtCapsules` feeds the picture, `shadowCues` is null, Settings shows today's text.

## 3a. Overlaps with other jobs (claims-check 2026-10-25, plus PLANs without a claims block)
`node scripts/claims-check.mjs --plan docs/char-shadow-meter/PLAN.md --name feature/char-shadow-meter`: 14 overlaps
(coop-kit, guard-rules, hud-guidance and its -a1 / -a3 slices, map-ready, player-batch-j19, route-runs-2,
test-runner-j20 and its s3b / s4 / s5 / s6a / s6c slices). light-parity, light-realism and coop4 have no claims block
yet, so they were read by hand; sector-batch (J18) has no PLAN yet.

Same lead (Sector Ops Build), ordered here:

| Job | Shared | Their lines | Order |
| --- | --- | --- | --- |
| light-realism J10 | lighting.md | L5's new "Lux" section; no lightField.ts change (its PLAN :55) | J10's L1 re-bake first for S4's numbers and the walk (FOLDED-PLAN J16 "depends J10"); PR A / PR B code may land dark before it (A12). No shared lines. |
| light-parity J11 | gameState.ts; lightField.ts (F1 only); e2e-darkness / e2e-parity; lighting.md; testing-tools.md | N1 `GameOptions` :148, create :926, :968-975; N2 failed-lamp lines in lighting.md; C1 moves the grey cards to new `e2e-parity.mjs`, e2e-darkness keeps NV and thermal; C2 testing-tools.md; F1 maybe the moon term in `levelInto` (:278-281) | gameState: no shared lines, either order. S4 after J11 PR B (C1 + C2) is on master; S4 adds its card to `e2e-parity.mjs` part 4 and never touches e2e-darkness. F1: PR A first (F1 waits for T1's GPU triage); F1 rebases onto S1's moon factor. |
| map-ready | gameState.ts, bakedLamps.ts, flags.ts, lighting.md, testing-tools.md | stats wiring and the hold in `GameState.create`; `BakedLamps` landing counter and `tilesPending`; one `mapReady` flag line; S6 / S7 docs | No shared lines. Whichever merges second rebases; flags.ts: one line each, ours under the light flags. |
| J1 #433 sector-ops-docs | settingsScreen.ts:339-340, lighting.md:225-233 | the char-shadow help and the preset line | #433 first; S2 and S5 build on its text. |
| sector-batch J18 | lightField.ts (door light at 15%, `DOOR_SHUT`), lighting.md (likely) | not planned | PR A first; J18's planner claims against this block and rebases its door lines onto S1. |

Other leads, for the orchestrator:

| Branch (lead) | Shared | Verdict |
| --- | --- | --- |
| guard-rules (Guard AI) | flags.ts; scripts/e2e-stealth-ai.mjs | Rebase, no shared lines: F0 adds its own flag lines; S8 adds rule scenarios, S4 adds one shadow scenario block. |
| player-batch-j19 (Player) | gameState.ts; flags.ts; e2e-coop.mjs | Rebase, no shared lines (theirs :1431-1502, :1853-2078, :1990-1996; ours :618, :907-914, :1659-1701 and after). |
| coop-kit (Player) | gameState.ts; flags.ts | Rebase, no shared lines (theirs :1407, :2600-2602, :3137-3157). |
| hud-guidance (+ -a1, -a3) | gameState.ts; e2e-coop.mjs | Rebase, no shared lines (theirs :1255-1263, :3619; e2e-coop :224-225, :1848-1850). |
| coop4 | gameState.ts; flags.ts; e2e-coop.mjs | Rebase, no shared lines (theirs :502-503, :527-528, :676, :771, :1008-1016; e2e-coop lobby block). Named dependency, not a conflict: N1 puts `playerRefsInto` in slot order; S2's remote fill and ShadowCues key players by id, so either order works. |
| test-runner-j20 (+ slices) | testing-tools.md | Rebase, no shared lines (theirs "The runner", "Laptop queue"; ours the e2e-parity entry). J20 S7 makes e2e-darkness the train parity check until J11's e2e-parity replaces it; S4 never edits e2e-darkness. |
| route-runs-2 | testing-tools.md | Rebase, no shared lines (theirs a new "Route-runs" section). |

## 4. Tests (what each proves)
- tests/charOccluders.test.ts: TS formula equals a reference port of the GLSL on 10k random cases (1e-6) and the GLSL
  string contains the `CAPSULE` numbers; floor 0.15 inside the umbra; own surface and owner skip; holder rule; product
  over two capsules; broad phase equals brute force on random scenes; `add` past `OCC.max` returns -1; allocation-free
  under a loop (`tests/helpers/allocPerCall.ts`); no import of quality, governor, charShadowSet's picker or Babylon.
- tests/lightField.test.ts: a capsule between a lamp and the chest scales that lamp's share by the formula, no other
  lamp's; a lamp under 0.04 is untouched; the moon term with a capsule along `moon.dir`; a flashlight held inside a
  capsule is not shadowed by its holder; no contract gives today's values exactly (the existing tests unchanged);
  allocation-free with a contract.
- tests/charOccluderFill.test.ts: local / remote / guard capsules from sim inputs (crouch lowers the top, a wall peek
  leans the head end, dead guards absent); owner keys stable across fills; the same inputs on two "machines" give the
  same bytes (co-op parity by construction).
- tests/shadowCues.test.ts: footprint direction and length for an overhead and a side lamp; a wall cuts the far points'
  contrast to 0; the moon footprint by elevation; speed from two fills; the 3 strongest sources picked; zero
  contrast in darkness; allocation-free.
- tests/lightField.test.ts also: `sourcesInto` lists the same members the contract term walks, strongest first, and
  `sourceAt` of each sums (with ambient and bounce) to `totalAt` with no contract.
- tests/charShadowSet.test.ts (S5): the two help strings against `CHAR_SHADOW_PRESET` (section 3, S5 done).
- e2e (S4): the character-shadow card in `e2e-parity` part 4 (GPU, the picture against the meter: the V9 card rig,
  `parity-lib.mjs` helpers and flicker pin, at char shadows Off, Low and Epic so both the round and the outline paths
  are read); `e2e-stealth-ai` (meter and the guards' fill rate); `e2e-coop` (host and client agree). All on the laptop
  queue with `E2E_GPU=1`; once J11's C2 is on master, light files pick `e2e-parity` as affected (J11 PLAN section 5),
  the lead requests the co-op group for src/game. The card goes in `e2e-parity.mjs`, not `e2e-darkness.mjs`: J11's C1
  moves every grey card there and leaves e2e-darkness with night vision and thermal; J20's S7 runs e2e-darkness on
  trains only until e2e-parity replaces it. If part 4 passes 150 s with the card, the lead (also J11's lead) moves the
  card to its own part 5 and claims `scripts/run-e2e.mjs` for that one line.
- Perf: the build report of PR A logs the meter tick's cost on campus S5 with 4 players (A11, 0.1 ms p95), from the
  debug timing on the laptop run.

## 5. After J10 (light-realism) re-measures
J10 changes lamp intensities and the lux calibration (`LAMP_LEVEL_GAIN`, map intensities). Re-run or re-pick:
- the character-shadow card's lamp and spot in `e2e-parity` part 4 (chosen by field level; J10's L3-W re-lights the
  Warehouse), and its band check switched from report only to pass / fail;
- `CHAR_LIGHT.minLevel` / `CHAR_SHADOW.minLevel` (0.04) and `CUE.minLevel` (0.08) against the calibrated levels (both
  are levels, so a gain change moves which lamps count);
- the A11 cost on campus S5 (more lit lamps per column after re-lighting dark pockets);
- the e2e-stealth-ai shadow scenario's spot (it needs a lamp strong enough that its shadow crosses `LIGHT.shadow` 0.28).
Unit tests compute their expectations from the field and need no change.

## 6. Hand-off
**Guard AI** (after PR A merges; their PR on the same flag, two Opus checkers):
1. `EnemyManager.fillOccluders(occ: CharOccluders)`: guards from the sim (crouch height, hit capsule radius
   src/ai/hitboxes.ts, head from guardHead), dogs lying along their body, bodies from `Body.lie` (src/ai/bodyLie.ts),
   a carried body at its carrier; gameState's interim guard loop (S2, `charOccluderFill.ts` `fillVictims`) is replaced
   by that call on the host; the client's puppets and bodies are theirs to fill (keep `fillVictims` for puppets if no
   better sim source exists).
2. Bodies' light (src/ai/enemyManager.ts:3674) and `fieldLight` (src/ai/enemy.ts:237-239) pass the contract and the
   body's / target's owner key.
3. The faint cue from `GameState.shadowCues` (section 2), host only, suspicion only; tests in tests/perception.test.ts
   and coopPerception.test.ts. Nothing reads graphics state; the cue uses no mesh or shadow map.
4. docs/systems/ai.md:44-45.

**Player** (after PR A; same flag): `fillOperator(occ, index, body: PlayerBodyOut)` from `playerBody`
(src/player/playerVolumes.ts:538) for the local player and remotes (MoveState), replacing S2's upright capsule:
feet-to-head joint axis, crouch, wall, peek and traversal poses, radius from the proportions. One capsule (A2).

**Orchestrator**: the bible P1 / L11 and VISION wording (BRIEF "Wording"), A6 for Michael's next look, section 3a's
other-lead verdicts, and the switch-on walk item (BRIEF A9) on the first release card that has J10's re-bake, PR B and
Guard AI's cue PR on master: "with `?charlight=1`, stand in a guard's shadow under a lamp: the meter drops; do it at
Low and Epic, same drop; a guard facing your shadow grows suspicious" (Lighting and Sector Ops areas; the last clause
is Guard AI's).

## 7. Risks
- The picture feed swap (A3) changes the look for every map with the flag on: the look video for the walk card shows
  partner and body round shadows on Low and Epic.
- 64 capsules: campus 32 guards + 4 players + dogs + bodies can pass it late in a run; the fill keeps the nearest to
  any player first and logs a full contract in the debug overlay. Raising `OCC.max` is one constant.
- A client without guard positions (a puppet not yet in a snapshot) shows no shadow from that guard for its first
  frames: A7's tolerance covers it.
