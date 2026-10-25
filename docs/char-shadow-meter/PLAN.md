# Character shadows in the light meter: PLAN
Owner: Sector Ops Build. Status: plan, waits for its Opus plan checker (RULES Intake 4). Brief: `BRIEF.md`; today's
code: `research/current.md`. Gate (FOLDED-PLAN J16): Opus plan, two Opus checkers per PR. Depends on J10 for the GPU
numbers and the walk only (A12).

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
```

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

| Slice | What | Files (claims) | Lines | Model | Checks |
| --- | --- | --- | --- | --- | --- |
| S1 | Contract, capsule formula (TS + GLSL from one source), field term (lamps, moon, flashlights with the holder rule), flag | new src/world/charOccluders.ts (~260); src/world/lightField.ts (~+90); src/world/bakedLamps.ts (GLSL import, ~25); src/world/charShadowSet.ts (`minLevel` from `CHAR_LIGHT`, 2); src/core/flags.ts (+5); new tests/charOccluders.test.ts (~320); tests/lightField.test.ts (~+140) | ~840 | Opus | tsc fast; vitest charOccluders, lightField, charShadowSet, lampFalloff |
| S2 | Meter wiring and the picture feed: fill the contract at 10 Hz from the sim (local player from the controller and `lightSampleHeight`, remotes from MoveState, guards from `takedownVictims()` on host and client: the interim fill); `bodyLevel` with the contract and owner for the local player and every remote; `BakedLamps.capsules` from the contract when the flag is on | new src/game/charOccluderFill.ts (~150, pure); src/game/gameState.ts (~+70 at :618, :907-914, :1659-1701); new tests/charOccluderFill.test.ts (~180); docs/systems/lighting.md (~+25, parity section) | ~430 | Opus | tsc fast; vitest charOccluderFill, lightField, coopPerception; affected-e2e plus requested e2e-coop + e2e-netmove (src/game gate) |
| S3 | Cast-shadow cues for Guard AI | new src/world/shadowCues.ts (~230); src/game/gameState.ts (~+25, the fill after the meter, host and solo); new tests/shadowCues.test.ts (~250) | ~500 | Opus | tsc fast; vitest shadowCues, charOccluders |
| S4 | Checks: e2e-darkness character-shadow card (a parked guard between a lamp and the grey card; screen luma inside the shadow vs the field with the contract, at char shadows Off, Low and Epic); e2e-stealth-ai (flag on: a guard parked in a lamp's path drops the meter under its shadow by the field's amount, and a watching guard fills slower than with the meter pinned to the unshadowed value); e2e-coop probe (host's and client's light for the client within 0.02 with a parked guard); testing-tools.md lines | scripts/e2e-darkness.mjs (~+180); scripts/e2e-stealth-ai.mjs (~+120); scripts/e2e-coop.mjs (~+80); docs/systems/testing-tools.md (~+10) | ~390 | Sonnet from a strict Opus brief | node --check; laptop queue: `--suites "e2e-darkness,e2e-stealth-ai,e2e-coop"` (GPU, E2E_GPU=1, 4189 for the GPU list) |
| S5 | Wording: settings help text, lighting.md one wording, the L16 fix (lighting.md:225 "0 lamps" -> 1 on Low / Medium), the bible / VISION wording note to the orchestrator | src/ui/screens/settingsScreen.ts:340 (1 string); docs/systems/lighting.md (~10) | ~20 | Haiku | tsc fast |

PRs (each under ~1.5k changed lines, each its own two Opus checkers):
- **PR A (Sector Ops first, shared files)** = S1 + S2, ~1.27k. Lands the contract and gameState.ts:1660-1701 so Guard AI
  and Player branch from it.
- **PR B** = S3 + S4 + S5, ~0.91k. S4's GPU numbers are final only after J10 (section 5); until then S4 asserts parity
  as a ratio (screen luma ratio vs field ratio inside / outside the shadow), not absolute levels.
- Parallel: S1 and S3 share only `CAPSULE` / `CharOccluders` types; S3 starts once S1's interface commit is pushed (its
  own worktree `feature/char-shadow-meter-s3`). S4's brief is written while S2 builds. S5 rides PR B.

No maps, no save paths, no wire change (no protocol line touched). Flag: `charShadowLight` (owner Sector Ops; switch-on
date: Michael's walk after J10's re-bake, ROADMAP and PR bodies). With the flag off every path is today's: the field
gets no contract, `rtCapsules` feeds the picture, `shadowCues` is null.

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
- e2e (S4): `e2e-darkness` card (GPU, the picture against the meter: the V9 card rig, at Off, Low and Epic so both the
  round and the outline paths are read); `e2e-stealth-ai` (meter and the guards' fill rate); `e2e-coop` (host and
  client agree). All on the laptop queue with `E2E_GPU=1`; `lightSuites` already picks the light suites for
  src/world light files (scripts/e2e-affected.mjs:118), the lead requests the co-op group for src/game.
- Perf: the build report of PR A logs the meter tick's cost on campus S5 with 4 players (A11, 0.1 ms p95), from the
  debug timing on the laptop run.

## 5. After J10 (light-realism) re-measures
J10 changes lamp intensities and the lux calibration (`LAMP_LEVEL_GAIN`, map intensities). Re-run or re-pick:
- the e2e-darkness card spots (they are chosen by field level) and the new character-shadow card's lamp and spot;
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

**Orchestrator**: the bible P1 / L11 and VISION wording (BRIEF "Wording"), A6 for Michael's next look, the walk card
line once PR B is on master: "stand in a guard's shadow under a lamp: the meter drops; do it at Low and Epic, same
drop".

## 7. Risks
- The picture feed swap (A3) changes the look for every map with the flag on: the look video for the walk card shows
  partner and body round shadows on Low and Epic.
- 64 capsules: campus 32 guards + 4 players + dogs + bodies can pass it late in a run; the fill keeps the nearest to
  any player first and logs a full contract in the debug overlay. Raising `OCC.max` is one constant.
- A client without guard positions (a puppet not yet in a snapshot) shows no shadow from that guard for its first
  frames: A7's tolerance covers it.
