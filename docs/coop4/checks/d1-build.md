# coop4 D1 - devices per slot (jammer state and wire) - build report

Branch `feature/coop4-d1` off `08267f27` (N0). Builder: Opus. Files: `src/game/ctDevices.ts`, `tests/ctDevicesSlots.test.ts` (new).

## Commits
- `c9867b7f` step 1: `SecWire.j: string[]`, `ch: number[]`, `cd: number[]` (pushed alone for N1). `apply()` reads a missing entry as `''`.
- `f215083b` steps 2-8 and the test.

## Step 1 call-site breaks
`npx tsc --noEmit` after the type change flagged only `src/game/ctDevices.ts` itself (fixed in the same commit). No other
file breaks: `protocol.ts` `secWire` builds 2-tuples, which are assignable to the arrays. N1 still has to parse 1..`MAX_PLAYERS`
entries there (PLAN section 1); that is a behaviour change, not a compile break. `courseMode.ts` is untouched and compiles.

## Built
- State: `jam`, `jamId`, `want`, `wantAt` and the laser cooldowns `cool` are `PLAYER_SLOTS`-long arrays, allocated once (`perSlot`).
- `CtHooks.slot?: () => number`: a client's own slot. Default 1. Read on each use by the HUD line and the gun light (`me()`). The host is always 0.
- `onRemoteJam(tgt, eye?, slot = 1)`: finds the ref whose `TeamFields.slot` matches (else its list index) without allocating. A slot outside 1..3 is dropped. `courseMode.ts:321` keeps its 2 args; `sectorMode.ts:1344` still passes 2 (SM / N1 pass the slot).
- `fixedUpdate`: every ref is stepped on its slot (duplicate or out-of-range slots are skipped). A slot without a ref (empty, or held: left out of `playerRefs`) idles: its jam ends and its cooldown runs down. Laser touches also run per slot on that slot's cooldown.
- `wire()`: `max(2, highest slot in use + 1)` entries. In use means a ref on the slot at the last step, or a jam or cooldown still running. Key order and rounding are unchanged.
- `apply()`: takes the received length (capped at `PLAYER_SLOTS`) and idles the slots the message did not carry. `frame()` runs the received entries. `debug()` `jam / left / cool` follow the wire length (2 for the course, so the `e2e-ctcourse` readers of `jam[0..1]` / `cool[0..1]` are unchanged).
- Hot paths: no new per-frame allocation. `wire()` / `debug()` allocate per call, as before.

## Not changed (out of D1's steps)
Pass zones, the hallway rule (`hallRun` sized zones x 2) and the scanners still use `n = min(2, refs.length)`. These are Marlow Yard stations. If Sector Ops ever uses pass zones with 3-4 players, that is a follow-up (SM).

## Marlow Yard (A27)
The test `(A27) Marlow Yard ...` runs a scripted 2-player course jam: both jam, the host lets go, the client hits the 5 s cap, a moving client, both on one device, and a laser trip. It needs `onRemoteJam` with 2 args, refs without slots and a client with no `slot` hook. It records the host's `JSON.stringify(wire())`, the host's debug `jam / left / cool`, and the client mirror's after `apply` + `frame` (21 samples). The expected values were recorded on master's `ctDevices.ts` (`08267f27`, identical to origin/master's) in a scratch swap. The recording was not committed; the swap was restored. Result: byte-identical, and every wire has exactly 2 entries. To re-record on master: `D1_RECORD=<file> npx vitest run tests/ctDevicesSlots.test.ts -t A27`.

## Checks
- `npx tsc --noEmit`: clean (step 1 and final).
- `npx eslint src/game/ctDevices.ts tests/ctDevicesSlots.test.ts`: clean.
- vitest `--maxWorkers=2` under an `sr-slot` lock: `ctDevicesSlots`, `jammer`, `jammerFixes`, `ctcourse`, `ctcourseGreybox`, `ctcourseLight`, `flagLamp`, `laserAlarm`, `laserPanels`, `marlowN6Scanners`, `marlowPassAny`, `securityCamera`, `securityCameraE8`, `trainingCamera`: 14 files, 233 passed, 1 skipped (pre-existing), 0 failed.
- Not run (per brief): e2e, build, GPU. Still due on the laptop queue: `e2e-ctcourse` (unchanged expectations), and `e2e-sectorops` part 7 once N1 and E2E land.

## For N1
- `protocol.ts` `secWire`: accept `j / ch / cd` arrays of length 1..`MAX_PLAYERS`.
- `coopHost.ts:707`: pass the sender's slot, as `this.g.mode?.onRemoteJam?.(r.id, msg.tgt, msg.e)` with the slot threaded through `GameMode.onRemoteJam` (`gameMode.ts:91`). Then `sectorMode.ts:1344` (SM) forwards it: `this.ct?.onRemoteJam(tgt, eye, slot)`.
- `coopClient.ts:173`: build the client `CtDevices` with `slot: () => <local slot>`.
- Refs: `playerRefs()` / `playerRefsInto()` should carry `TeamFields.slot` (N1's `TeamRef`s). Until then `CtDevices` uses the list index.
