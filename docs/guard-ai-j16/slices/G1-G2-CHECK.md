# guard-ai-j16 G1 + G2: check
Owner: Guard AI Build. Status: current.

Checker: Opus 5.5 (fresh), 2026-10-27. Head checked: af4146d7c (G1 e3a9273d2, G2 87a43fc36), diff `ef5889a44..af4146d7c`.

## Verdict: PASS
No FIX items. Both modules match the BRIEF (A1-A9) and PLAN (G1, G2, section 1), are pure, allocate nothing per call,
and their tests test real behaviour. The shape and import notes below are polish, not blockers.

Read: origin/master CLAUDE.md and docs/INDEX.md module map; BRIEF, PLAN (G1, G2, sections 1-2), PLAN-CHECK, the
builder's G1-G2-REPORT; the diff in full; `src/world/charOccluders.ts`, `src/world/shadowCues.ts`,
`src/game/charOccluderFill.ts`, `src/ai/dogHead.ts`, `src/ai/bodyLie.ts`, `src/ai/hitboxes.ts`, `hitVolumes`
(proportions.ts:128), `stepMeter` / `seenAt` (perception.ts:199-215), `Enemy.updateAwareness` (enemy.ts:2876-2880),
`Enemy.simHead` (enemy.ts:807), `src/world/charShadows.ts` header, `eslint.config.js`.

## G1 (src/ai/guardOccluders.ts)
- Contract: `put` (:110) writes `cap` / `owner` exactly as `CharOccluders.add` (charOccluders.ts:60); the byte-for-byte
  test (guardOccluders.test.ts:192) proves it. ok.
- A9 shapes: guard a = feet + `FILL.footLift`, b = `simHead`, r = `guardOccR` = `hitVolumes(proportions(build, 1.75 x
  scale)).bodyR`, the same call as the hit capsule (hitboxes.ts:39-40, built with `def.scale, def.build`,
  enemy.ts:774). Dog: rump `DOG_BODY / 2` behind the feet to the head's x / z, level at `DOG_BODY_Y`, r 0.15. Body:
  pelvis (`lie`, already `lieLift` up) along `headYaw` by `headReach`, r `lieLift`, underside on the floor. ok.
- A7 owner keys: `occKey(kind, num)` for all three; the order test (:147) shows keys survive a reorder. Nothing on
  master reads `occKey(OCC_KIND.guard, index)` except `fillVictims` itself, so switching to `num` breaks no reader. ok.
- Cull and overflow match `fillVictims` (charOccluderFill.ts:125-147): horizontal `hyp2 <= FILL.reach` from any of
  `n` pin slots at stride `FILL_IN`, culled before the full check, so overflow counts only near characters (-1);
  `OCC_FAR` (-2) for a far one. List order and the `alive` skip are the caller's (G3), as the report says. ok.
- Hot path: only ints and object refs cross a call (`nearQ` returns a boolean, `put` an int); the capsule goes through
  the module `S`. ok.

### The two flagged shape choices (light parity)
Numbers (1.75 m average guard, computed from the real functions): head centre 1.609, head radius 0.115 (top 1.75),
`bodyR` 0.211; dog head centre 0.80 above the feet; body `headReach` 0.835, `lieLift` 0.132, hip 0.915.
- Parity holds by construction: the meter, `ShadowCues` and the picture's capsule shadows all read the same contract.
  The only picture that can differ is the near-lamp silhouette maps (`charShadows.ts`, up to 4 lamps, real meshes),
  and that gap exists for every character today (players included); it is a capsule-vs-mesh fit question, not a
  second lighting system.
- Dog, level capsule at `DOG_BODY_Y` (spans 0.37-0.67 m): acceptable. It misses the head's rise (centre 0.80, top
  about 0.9), so a dog's capsule shadow is shorter than its silhouette near a lamp. The cue never reads a dog's
  footprint (`ShadowCues` is players only); the only effect is a player standing in a dog's shadow, a rare and small
  meter difference. It is far better than today's interim (an upright `def.height` capsule for a dog).
- Body, pelvis to head: acceptable. It skips the legs (about 0.9 m of a 0.12-0.15 m high lying limb) and overshoots
  the head top by r (0.13 m). A lying body barely shadows a player's chest sample; the cue never reads bodies; the
  body's own light reads skip its key. No visible or gameplay mismatch worth a block.
- Guard: the capsule top is 1.82 m (head centre + `bodyR`), 7 cm over the head top (the interim was 1.77). From a
  lamp 3 m up and 2 m off, the shadow tip lands about 0.28 m (10 %) farther than the silhouette's. Small; polish 1.

## G2 (src/ai/shadowNotice.ts)
- Gates against PLAN section 1 and A1-A3: footprint `speed >= 0.3` (whole footprint skipped, :102), contrast
  `>= 0.40` (:105), horizontal distance from the feet `1 <= d <= 10` (:109), `|angle| <= PERCEPTION.focusHalf`
  (27.5 deg, :112); nearest qualifying point, ties keep the first; slot bounds and `count` respected; the source id
  (lamp or moon -1) never read. The angle is (dx, dz) turned by -yaw, equal to `wrapAngle(atan2(dx, dz) - yaw)`
  (verified on 2000 random cases in the test). Output x, y, z, contrast, speed, distance, angle (A11); `out` untouched
  on a miss. ok.
- `SHADOW_NOTICE` numbers equal section 1 (`enabled` true, 0.40, 0.3, 1, 10, `focusHalf`, 0.35, 0.2); each carries
  its reason in the doc comment (:19-40), including the 0.366 break point. ok.
- Pure function of (cues, slot, `NOTICE_IN`, out): no state kept, ints in and out, no allocation. Inputs through the
  module `NOTICE_IN` instead of the PLAN's `gx, gz, yaw` arguments: the PLAN's own "inputs through a module scratch",
  and it keeps doubles off the call. ok.
- Reaction numbers (meter, slack) are exported for G3; gates A4-A6 are correctly left to G3's `shadowLook`.
- Plan check item 4: the PLAN sentence is right. `sinceSeen` resets only on `seenAt` (rate > `leak`,
  enemy.ts:2877-2878, perception.ts:199), which is the model the drain test's `drainT` uses, so the brute-forced
  sub-leak patterns are faithful. ok.

## Import graph (src/ai -> src/game/charOccluderFill)
- No rule is broken. CLAUDE.md bars only static `src/net` imports from single player; `eslint.config.js` has no
  import-boundary rule; docs/INDEX.md's module map states responsibilities, not a layering. `src/ai` already imports
  `src/game` in many places (enemy.ts:3-19: closeQuarters, health, damage, tactics, takedown; lockedDoors.ts,
  animTierView.ts).
- No bundle gains anything: `charOccluderFill` is already imported by `gameState.ts:131` (solo and host) and by
  `src/net/charMates.ts:13` (client); it imports no `src/net`. Its chain (`wallController` -> `speedTune` ->
  `anim/tune`) is Babylon-free and already loaded by the game. No cycle back into `src/ai`.
- Cost: unit tests of a pure AI module load the tune registry at import. Not worth moving now; polish 3.

## Tests
- guardOccluders.test.ts (11) and shadowNotice.test.ts (15) assert behaviour, not just shape: real `guardHead`,
  `dogHead`, `lieAt` inputs; a crouch lowers the top by more than 0.3 m; reorder keeps keys; boundary values on every
  gate on both sides; a nearer failing point never hides a farther passing one; a real `ShadowCues` fill (walking
  noticed, still not, turned away not); the drain arithmetic through the real `stepMeter`.
- Allocation tests are sound for this repo's method (`tests/helpers/allocPerCall.ts`: gc'd young-space reads, no
  in-round GC, a recompile with the inlining budget lifted). Inputs are precomputed, results go to `sink`, and each has
  a control that reads well above the bar (vector 96 B, object 32 B). Readings this run: all writers 0.0 B per
  iteration (36 capsules, one culled), `putGuard` / `putDog` / `putBody` 0.0, two `noticeInto` 0.0 (429 of 2000
  found, so both verdict paths run). As everywhere in this repo, the lifted inlining budget hides boxing at a call V8
  would not inline in a real caller; the modules avoid double arguments and returns, so that case does not arise.

## Polish list (builder or G3; none blocks)
1. Guard top (guardOccluders.ts:135-137): `b.y = simHead.y - (occR - headR)` would put the capsule top at the head
   top (1.75, not 1.82) and match the silhouette's shadow length; needs `headR` cached beside `occR`. Change A9's wording
   with it.
2. Dog and body fit (:151-156, :171-176): a dog `b.y` at the head centre less about 0.1 (head and neck in the
   capsule), and a body capsule from the feet end to the head top (a = pelvis - (hip - r) back, b = pelvis +
   (headReach - r) along `headYaw`) would match their silhouettes. Both are A9 changes; take them at the walk if a
   dog or body shadow looks short.
3. `FILL` / `FILL_IN` import (guardOccluders.ts:24): if the interim fill is ever retired, restate `footLift`,
   `reach` and the pin stride here (as `FILL.players` restates `MAX_PLAYERS`) with a test pinning them equal, or move
   them to the contract with Sector Ops' agreement.
4. `occKey` keeps 16 bits of `Enemy.num` (a module counter that never resets, enemy.ts:248, :407): two characters
   collide after 65,536 spawns in one page session. Note it in the G3 brief; reset or wrap-check if a long sandbox
   session can get there.
5. The comment at guardOccluders.ts:75 cites `hitboxes.ts` without its folder; it is `src/ai/hitboxes.ts`.
6. The purity tests pin the exact import list (guardOccluders.test.ts:277, shadowNotice.test.ts:399-403): any new
   harmless import fails them. Fine as a tripwire; expect to edit them in G3 if a module gains an import.

## Commands and results
- `git rev-parse --abbrev-ref HEAD`: feature/guard-ai-j16 (head af4146d7c).
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/guardOccluders.test.ts tests/shadowNotice.test.ts tests/shadowCues.test.ts
  tests/charOccluders.test.ts tests/charOccluderFill.test.ts`: 5 files, 64 tests, all pass (2.05 s).
- Same two new files with `--silent=false`: the allocation readings above.
- A throwaway vitest (deleted, not committed) read the guard, dog and body dimensions quoted above from
  `hitVolumes`, `guardHead`, `headReach`, `lieLift`.
- Not run (as instructed): npm run dev, e2e, full npm run check.
