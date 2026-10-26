# char-shadow-meter S2c build report (cloud)
Owner: Night Shift | Sector Ops Build. Status: current.

Built by Night Shift | Cloud Builder 1 (Opus), 2026-10-26, from the cloud-queue brief `briefs/char-shadow-meter-s2c.md`
(PLAN row S2c; BRIEF Goal, A3, A7). Branch `feature/char-shadow-meter-s2c` from effa5958. Resumed: a first builder,
lost at an account swap, pushed f685e337 (steps 1-2) and 17e6c76c (steps 3-5). Both were checked line by line against
every step and kept; one small change (step 5 below). Tests, docs, fragment and this report are new. Unit tests only
(Node, `--maxWorkers=2`); every e2e is a pending PC run.

## Files (effa5958..head, + / -)
- `src/game/charOccluderFill.ts` +45 / -0: `MateLike`, `slotInto` (module scratch `HEAD`).
- `src/game/gameState.ts` +14 / -24: `NO_MATES`, the `charMatesInto` hook, `fillChars` through `slotInto` and the hook,
  the `updateLight` guard.
- `src/net/charMates.ts` +110 / -0 (new): `MateSource`, `CharMates` (`set`, `into`, test getters `size`, `refOf`).
- `src/net/coopClient.ts` +34 / -1: `mates`, `mateOrder`, `relistMates`, the hook (flag on), three relist calls.
- `src/net/remoteAvatar.ts` +5 / -0: `get shown()`.
- `tests/charOccluderFill.test.ts` +60 / -4; `tests/charMates.test.ts` +380 / -0 (new).
- `docs/systems/lighting.md` +2 / -4; `changes/feature-char-shadow-meter-s2c.md` +3 (new); this report (new).

## Per step
1. f685e337 `slotInto`: gameState's loop body moved as is (feet; `posedHeadSample` when `r.head`, else
   `lightSampleHeight(r.height ?? STANDARD_BODY, r.crouched ? 1 : 0)` and the peek), same expressions in the same
   order; scratch `{ ox, oz, h }` is a module constant. Imports `wallController` and `bodyHeight` only (Babylon-free; the
   isolation grep in tests/charOccluders.test.ts passes).
2. f685e337 gameState: `NO_MATES` beside `NO_REMOTES`, `charMatesInto` beside `remotePlayers` with the brief's doc
   comment; `fillChars` is `nr`, `localSampleInto(0)`, `slotInto` for 1..nr-1, `n = nr + charMatesInto(L, nr,
   FILL.players)`, `charN = n`, then the two fills; `updateLight` writes `charRefs[s].light` only for
   `s < charRefs.length`. The flag-off branch, `localSampleInto`, `headSample` and `playerRefsInto` are untouched.
3. 17e6c76c `RemoteAvatar.shown` (returns `placed`) after `get dead()`.
4. 17e6c76c `CharMates` as the brief: entries `{ src, ref, headV, bin, bout }`; `set` keeps an entry whose source is the
   same object; `into` is an indexed loop from `from`, skips `!shown`, stops at `max`, refreshes feet (`pos`), crouch
   (flag), `rig.height`, `playerBody(src.bodyIn(bin), bout)` and the head (on a wall and alive), then `slotInto`.
5. 17e6c76c `CoopClient`: the two fields, `relistMates` (returns unless `g.charOccluders`; `s.players` order, self
   skipped, avatars present), called at the end of `avatar()`'s create branch, of `dropAvatar` and in the `lobby`
   handler beside `recolour()`; the hook set once in the constructor inside `if (g.charOccluders)`, restored through
   `offs`. gameState stays a type import. Changed here (e0dc03c3): `relistMates` wrote `mateOrder` with `length = 0`
   then `push`; it now writes by index and truncates (not hot, but the brief's rule says never).
6. Docs: the lighting.md Co-op sentence replaced as the brief words it; the fragment's one Light line.

## Tests
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/charOccluderFill.test.ts tests/charMates.test.ts tests/charOccluders.test.ts
  tests/coopPerception.test.ts tests/remoteKneelTense.test.ts --maxWorkers=2`: 5 files, 49 passed (charOccluderFill 10,
  charMates 11, charOccluders 11, coopPerception 12, remoteKneelTense 5).
- New: `slotInto (S2c)` (200 random refs, every branch and case at least 50 times, `Object.is` on all 6 doubles against
  A2's restated formula; the head wins over the peek; the 0.3 floor); the allocation case now runs `slotInto` x3 in its
  loop. charMates (a) slot 1 = `rtCapsule` at `lightSampleHeight(1.68, 0 | 1)`, owner `occKey(player, 1)`, on a wall
  `posedHeadSample` of `playerBody(...).head`, dead on a wall no head; (b) unshown writes nothing, from 2 / max 4 writes
  2, an unshown one in between is skipped, `set` keeps the ref; (c) the source checks; (d) no allocation; (e) host and
  client agree at every one of 90 states for standing, crouched still and on a wall (all 6 pin doubles and 7 capsule
  floats within 1e-6, the head set alike, the same owner keys).

## Bytes per call (tests/helpers/allocPerCall.ts)
- charOccluderFill: `slotInto x3 + fillPlayers(4) + fillVictims(32)` 0.0, `pictureInto(16)` 0.0, control with a vector
  96.0 (36 capsules).
- charMates: `CharMates.into` (3 partners, 1 on a wall) 0.0, control with a vector 96.0.
- charOccluders (unchanged): transmitQ 0.0, transmitInto 0.0, capsuleTransmit 0.0, control 224.0.

## Deviations
- `CharMates.refOf(i)` (and `size`) are test getters beyond the brief: the tests read an entry's ref (kept by `set`,
  head null when dead).
- Test order matters for the allocation readings, by V8 design: `slotInto` is a property-load site, and a site that has
  seen many ref shapes (the 200-ref case) boxes every double it reads (measured: 48 B per call with the three mixed
  refs, 96 B after a forced megamorphic site, 0 B with one shape). A machine's slots see one shape (a client's
  `CharMates` refs; the host's `RemotePlayer.ref`), so the allocation case uses three refs of one shape, the 200-ref
  case runs last in its file, and charMates (e), which brings the host's shape, runs after (d). Both files say why.
- (e) runs without cover segments, so the host's peek is 0 there (as off a wall); the wall head comes from the
  MoveState. The client's source takes the parsed state's feet and flags each step and copies `rp.bodyIn`.

## Limits (logged, accepted by the brief)
- Peek on a client is always 0. Off a wall the host's is 0 too; on a wall a live partner's posed head replaces it.
  Only a dead partner still on a wall differs: the host keeps its eased edge offset, the client samples upright.
- Slot order: the client follows `s.players` (the host's lobby order), self skipped, unshown skipped. After a rejoin the
  host re-appends that client's `RemotePlayer` (coopHost.ts:507), so the host's and a client's slot orders can differ.
  Slot order changes only machine-local owner keys and the picture's tie-break, never a sample.
- A partner's light on a client is not stored (`updateLight` guard); the host's sample drives the guards, as before.
- A7's ~0.3 s snapshot lag is e2e territory (S4).

## Side notes for the lead (out of scope)
- `playerRefsInto` (gameState.ts:1083) uses `out.length = 0` + `push`.
- `RemotePlayer.accept` adds `ref.cover` / `ref.coverT` in an order that depends on the first state's branch (wall or
  not), so two remotes on a host can hold two ref shapes at `slotInto`'s loads (polymorphic). A2's inline loop had the
  same loads, so S2c changes nothing here; a fixed key order in the `ref` literal would keep the site monomorphic.

## Pending PC runs (laptop queue)
- `affected-e2e`, `e2e-coop` and `e2e-netmove` on the branch head, flag off and with `?charlight=1`.
- The check that closes S2c is S4's e2e-coop partner probe: "partner's shadow on the client: client meter = host's
  sample within 0.02" (S4's work, not this slice's).
