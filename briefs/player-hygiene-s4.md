status: open

# Brief: player-hygiene S4 - The open selection wheel stops rebuilding its ring every step (Player Build)

Lead: Night Shift | Player Build, 2026-10-25. Sonnet builder, strict brief: do exactly this, nothing more. Job J6
player-hygiene, slice S4 (BRIEF row H4, the ring half, plus two comment fixes). Unit tests only.

## Read first
- Plan: `git show origin/feature/player-hygiene:docs/player-hygiene/PLAN.md` ("How it works today" H4, "Design" H4,
  "Slices" S4). `tests/helpers/allocPerCall.ts` (`bytesPerCall`, `HEAP_NUMBER` = 16, `sink`).
- `tests/selectionWheel.test.ts` (fixtures to copy the style of).

## Base and branch
- Base `origin/feature/player-hygiene` at `2d4b290b82ce7286379e4098af4b274e476c798e`. New branch
  `feature/player-hygiene-s4`; push there only. No master merge, no rebase, no other branch. `npm ci` once.
- The three source files are byte-identical on 2d4b290b and origin/master d6a04cee (`git diff 2d4b290b8 origin/master
  -- src/game/gadgetSystem.ts src/game/selectionWheel.ts src/ui/hud/gadgetWheel.ts` is empty): the line numbers hold.

## Files (only these)
- `src/game/gadgetSystem.ts`
- `src/game/selectionWheel.ts`
- `src/ui/hud/gadgetWheel.ts` (one comment line only)
- `tests/wheelRingAlloc.test.ts` (new)
- `tests/fixtures/player-hygiene-s4.json` (new, written by the test)
- `changes/feature-player-hygiene-s4.md` (new fragment, `changes/README.md`)
Nothing else. Do not change `buildWheel`'s behaviour or signature, `WheelSeg` / `WheelGun` / `WheelGadget`, the HUD
logic, `src/game/gameState.ts`, or any e2e script.

## What is there now (2d4b290b)
- `src/game/gadgetSystem.ts:7` imports `buildWheel, SelectionWheel, type WheelGadget, type WheelGun, type WheelPick,
  type WheelSeg`; `:6` imports `GADGET_IDS, GADGETS`.
- `:71` class comment: "the wheel (hold to open: time slows, the stick / mouse picks a slot, release selects; ..." -
  wrong since G181 (no time slow).
- `:81-82` `/** The ring while the wheel is open (rebuilt each step: counts and ammo move). */ ring: WheelSeg[] = [];`
- `:183-196` the open wheel's step: `this.refreshRing()` at `:186` every fixed step, then `sel.place` / `settle` /
  `update` with `this.ring.length`, `sel.cycle(this.ring)`.
- `:235-246` `refreshRing()`: builds `guns: WheelGun[]` (one literal per slot: `{ index: i, name: s.def.name, loaded:
  s.mag, reserve: s.reserve }`), `kit: WheelGadget[]` (`for (const id of GADGET_IDS)`, `{ id, name: GADGETS[id].name,
  count: w.gadgets.counts[id] }`), then `this.ring = buildWheel(guns, kit)`.
- `:248-254` `openWheel()` calls `refreshRing()`; `:257-262` `closeWheel` reads `sel.pick(this.ring)`.
- `src/game/selectionWheel.ts:49-54` `buildWheel`: `[{ kind: 'vision' }]`, then `{ kind: 'gun', ...g }` per gun, then
  `{ kind: 'gadget', ...g }` per gadget.
- Consumers read the ring by contents, never by identity: `src/game/gameState.ts:3288` (`wv.ring = gs.ring`), the HUD
  `src/ui/hud/gadgetWheel.ts:153-196` `changed()` (compares kind, name / id, loaded / reserve / count per slot),
  `scripts/e2e-gadgets.mjs:100`. `:75` comment: "the ring array is rebuilt every step, so compare contents".
- The constructor `gadgetSystem.ts:125-130` only reads `g.weapons` (sets `onThrow`, `onPlace`) and `g.grenades`
  (`onDetonate`): a fake game with those two works in node.

## Build
Commit 1 (parity record, no src change): the test below with its fixture recorded on the unchanged code
(`PH_S4_WRITE=1 npx vitest run tests/wheelRingAlloc.test.ts`), then a plain run passes. Commit 2: the change below. The
test file and fixture do not change between the two commits.

1. `src/game/selectionWheel.ts`, after `buildWheel`, two exported helpers (no allocation):
   ```ts
   /** (player-hygiene S4) Refresh the gun at ring slot `at` in place: false when that slot is not this gun (index and
    *  name), so the caller rebuilds. */
   export function setWheelGun(ring: WheelSeg[], at: number, index: number, name: string, loaded: number, reserve: number): boolean {
     const s = ring[at];
     if (!s || s.kind !== 'gun' || s.index !== index || s.name !== name) return false;
     s.loaded = loaded;
     s.reserve = reserve;
     return true;
   }
   /** (player-hygiene S4) The same for a gadget slot (id and name; the count changes in place). */
   export function setWheelGadget(ring: WheelSeg[], at: number, id: GadgetId, name: string, count: number): boolean {
     const s = ring[at];
     if (!s || s.kind !== 'gadget' || s.id !== id || s.name !== name) return false;
     s.count = count;
     return true;
   }
   ```
2. `src/game/gadgetSystem.ts` `refreshRing()` becomes (import the two helpers beside `buildWheel`):
   ```ts
   /** The ring from the live loadout: vision, the guns (loaded / reserve), the kit's gadgets (counts). (player-hygiene
    *  S4) Updated in place every step; rebuilt (allocating) only when its shape changes: the slot count, a gun's index
    *  or name, or a gadget slot. */
   private refreshRing(): void {
     const w = this.g.weapons;
     const ring = this.ring;
     const nGun = w.slots.length;
     let ok = ring.length === 1 + nGun + GADGET_IDS.length && ring[0]?.kind === 'vision';
     for (let i = 0; ok && i < nGun; i++) {
       const s = w.slots[i]!;
       ok = setWheelGun(ring, 1 + i, i, s.def.name, s.mag, s.reserve);
     }
     for (let k = 0; ok && k < GADGET_IDS.length; k++) {
       const id = GADGET_IDS[k]!;
       ok = setWheelGadget(ring, 1 + nGun + k, id, GADGETS[id].name, w.gadgets.counts[id]);
     }
     if (!ok) this.ring = this.buildRing();
   }

   /** The ring built fresh (today's code: on open with a new shape, or after a gun is added or removed). */
   private buildRing(): WheelSeg[] {
     const w = this.g.weapons;
     const guns: WheelGun[] = [];
     for (let i = 0; i < w.slots.length; i++) {
       const s = w.slots[i]!;
       guns.push({ index: i, name: s.def.name, loaded: s.mag, reserve: s.reserve });
     }
     const kit: WheelGadget[] = [];
     for (const id of GADGET_IDS) kit.push({ id, name: GADGETS[id].name, count: w.gadgets.counts[id] });
     return buildWheel(guns, kit);
   }
   ```
   (A slot left half-updated before a mismatch does not matter: the ring is then replaced.)
3. Comments: `gadgetSystem.ts:71` -> "the wheel (hold to open over the live game, no time slow (G181); the stick /
   mouse picks a slot, release selects; ..." (keep the rest of the sentence). `:81` -> `/** The ring while the wheel
   is open (updated in place each step: counts and ammo move; rebuilt only when its shape changes, player-hygiene
   S4). */`. `src/ui/hud/gadgetWheel.ts:75` -> `// each slot's identity (kind and gun name / gadget id): the ring is
   updated in place and rebuilt when its shape changes, so compare contents`. No other line in `gadgetWheel.ts`.

## Test `tests/wheelRingAlloc.test.ts` (new)
- Header comment: what it proves (the in-place ring equals `buildWheel` of the same loadout; no allocation on the open
  wheel's step when nothing changes shape), the fixture, `PH_S4_WRITE=1` rewrites it (only on the pre-refactor code).
- `import * as SW from '../src/game/selectionWheel'`; `const REFACTORED = typeof (SW as unknown as Record<string, unknown>).setWheelGun === 'function';`
- A fake game: `const slots = [{ def: { name: 'Pistol' }, mag: 11, reserve: 20 }, { def: { name: 'Rifle' }, mag: 30,
  reserve: 90 }]`, `counts = { frag: 2, gas: 1, flash: 2, noise: 3, stickyCam: 1, mine: 0, emp: 0 }`,
  `g = { weapons: { slots, gadgets: { counts }, onThrow: null, onPlace: null }, grenades: { onDetonate: null } }`;
  `const gs = new GadgetSystem(g as unknown as GameState)`; `const refresh = () => (gs as unknown as { refreshRing():
  void }).refreshRing();`.
- Sequence (one `refresh()` after each change; record `JSON.parse(JSON.stringify(gs.ring))` per step under a name):
  `open` (initial), `shot` (Pistol mag 10), `reload` (Rifle mag 30 -> 5, reserve 90 -> 65), `gadgetUsed` (frag 1),
  `gadgetZero` (gas 0), `gunAdded` (push `{ def: { name: 'Shotgun' }, mag: 6, reserve: 24 }`), `gunRemoved` (splice
  index 1: Rifle out, Shotgun now index 1), `gunRenamed` (slot 0 becomes `{ def: { name: 'SMG' }, mag: 25, reserve:
  75 }`), `noGuns` (slots emptied), `back` (Pistol 11 / 20 again).
- Test 1 (both commits): every recorded step equals the fixture (`toEqual`), and equals `buildWheel` called fresh on
  the same loadout (build the `guns` / `kit` arrays in the test exactly as `buildRing` above). Fixture shape `{ steps:
  { name: WheelSeg[] } }`, written in `afterAll` when `PH_S4_WRITE`.
- Test 2 (assert only when `REFACTORED`): the ring array is the same object (`toBe`) across `open` -> `shot` -> `reload`
  -> `gadgetUsed` -> `gadgetZero`, and its slot objects too (`ring[1]` before and after `shot`); a new array after
  `gunAdded`, `gunRemoved`, `gunRenamed`, `noGuns`.
- Test 3: `bytesPerCall((n) => { for (let k = 0; k < n; k++) { refresh(); gs.sel.update(gs.ring.length); } },
  HEAP_NUMBER, { n: 1000, warm: 20000 })` with the loadout unchanged (two guns); `gs.sel.begin('night')` first. Log
  the reading with `console.info`; assert `<= HEAP_NUMBER` only when `REFACTORED`. A second reading where the loop also
  sets `slots[0].mag = k & 7` before `refresh()` (ammo moving, no shape change): same gate.
- Test 4 (both commits): a pick still reads the live ring: with the cursor on the Pistol slot (`gs.sel.place(...)`
  toward segment 1, `gs.sel.update(gs.ring.length)`), `gs.sel.pick(gs.ring)` is `{ kind: 'gun', index: 0 }`.

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server; every command with a timeout)
`npm run typecheck`;
`npx eslint src/game/gadgetSystem.ts src/game/selectionWheel.ts src/ui/hud/gadgetWheel.ts tests/wheelRingAlloc.test.ts`;
`npx vitest run tests/wheelRingAlloc.test.ts tests/selectionWheel.test.ts tests/changesFragments.test.ts`.

## Rules
- Behaviour identical: the ring's contents every step equal what `buildWheel` gives today; the HUD draws ammo changes
  live as now (it compares contents).
- Hot path (CLAUDE.md): nothing allocated on the open wheel's step when the shape is unchanged; `buildRing` may
  allocate (shape change, open with a new shape). Strict TS, `import type` for type-only imports.
- No wire change, no `PROTOCOL_VERSION`, no flag (G355).
- If `GadgetSystem` cannot be built in node with the fake above (an import that needs a browser), STOP: `status:
  blocked <the import and error>`; do not move code between files.

## Done when
- Commit 1 (test + fixture, unchanged src) then commit 2 (the change); test and fixture identical in both.
- All four tests pass on commit 2 with the `REFACTORED` gates active; both readings `<= HEAP_NUMBER`.
- tsc and eslint clean, the vitest files above pass; `git diff --stat 2d4b290b8` lists only the six files above, and
  `git diff 2d4b290b8 -- src/ui/hud/gadgetWheel.ts` is the one comment line.
- `changes/feature-player-hygiene-s4.md`: line 1 `# Selection wheel ring updated in place`, line 2 `kind: patch`, one
  `- ` bullet (no behaviour change: the open wheel updates its slots in place instead of rebuilding them every step;
  a stale "time slows" comment corrected).
- Commits with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `origin feature/player-hygiene-s4`.
  Then append `## Report` here (what changed with file:line, test names and counts, readings before / after,
  deviations) and set line 1 to `status: done feature/player-hygiene-s4 <sha>`; commit, push `cloud-queue`.
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.
