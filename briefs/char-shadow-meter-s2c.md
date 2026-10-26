status: claimed Night Shift | Cloud Builder 3 2026-10-26T01:36Z
# char-shadow-meter s2c (cloud): a co-op client's partners in the character contract (J16, slice S2c)

Lead: Night Shift | Sector Ops Build. Job char-shadow-meter (FOLDED-PLAN J16; G352). Source of truth on the base:
`docs/char-shadow-meter/PLAN.md` row S2c, `BRIEF.md` (Goal, A3, A7). Why: A2 check finding 1. With `charShadowLight` on,
`fillChars` takes players from `playerRefsInto`, whose remotes come from `remotePlayers`. Only the host sets that
(coopHost.ts:209). A client keeps `NO_REMOTES` (gameState.ts:297, :475) and holds its partners as `RemoteAvatar`s
(coopClient.ts:76). So a client's meter and round shadows ignore its partners. Opus builds. Must-fix before switch-on.

- Base: `origin/feature/char-shadow-meter-a2` @ effa5958f85587f173fe39cdf90815f1f75f8407 (docs only since 9d7f254bf).
  New branch: `feature/char-shadow-meter-s2c`. Create it from that commit and push it. Never push to any other branch.
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/char-shadow-meter-s2c`.
- Hard rules: `src/net` is reached only through a dynamic import behind `flags.coop`. gameState.ts and
  charOccluderFill.ts never import `src/net`, so coopClient fills a hook that gameState exposes. Hot paths allocate
  nothing: indexed loops, kept typed arrays, no closures or literals per call, and `hyp2`, never `Math.hypot`.
  **No `arr.length = 0` then `push`.** Measured on Node: 150 B per call, because V8 drops the backing store. With the
  flag off, the code runs exactly as today, bit for bit. No wire change: `src/net/protocol.ts` is not touched.
  Never read a mesh, a rig pose, presets or the governor.

## Files (only these)
- `src/game/charOccluderFill.ts`: `MateLike` and `slotInto` (~+35).
- `src/game/gameState.ts`: the hook, `fillChars`, one guard in `updateLight` (~+12 / -16).
- `src/net/charMates.ts`: new, `CharMates` (~+60).
- `src/net/coopClient.ts`: owns `CharMates`, sets the hook (~+20).
- `src/net/remoteAvatar.ts`: one getter (+3).
- `tests/charOccluderFill.test.ts` (~+40) and `tests/charMates.test.ts` (new, ~+150).
- `docs/systems/lighting.md`: remove one sentence.
- `changes/feature-char-shadow-meter-s2c.md`: new fragment, `kind: minor`, one Light line: "with `?charlight=1` a
  co-op client's meter and round shadows now count its partners' shadows".
- `docs/char-shadow-meter/checks/s2c-build.md`: the build report.

Everything else is out of scope, in particular remotePlayer.ts, coopHost.ts, partnerTarget.ts, protocol.ts and
lightField.ts.

## Build
1. **charOccluderFill.ts: one slot's math, shared by host and client.**
   - `export interface MateLike { readonly feet: V3; readonly crouched: boolean; readonly height?: number; readonly
     peekX?: number; readonly peekZ?: number; readonly head?: V3 | null }`, with `V3 = { readonly x; y; z: number }`.
     This is structural: a host's `PlayerRef` (`RemotePlayer.ref`) fits it. Do not import `PlayerRef`; the file's
     isolation rule is in its header and in tests/charOccluders.test.ts:302-321.
   - `export function slotInto(pin: Float64Array, s: number, r: MateLike): void`. Move gameState.ts:1783-1798 (the
     loop body: feet, then `posedHeadSample` when `r.head`, else `lightSampleHeight(r.height ?? STANDARD_BODY,
     r.crouched ? 1 : 0)` and the peek) here. Keep the same expressions in the same order. Scratch for
     `posedHeadSample` is a module constant `{ ox, oz, h }`. Imports: `posedHeadSample` from
     `../player/wallController`; `lightSampleHeight` and `STANDARD_BODY` from `./bodyHeight`. Both are Babylon-free.
2. **gameState.ts: the hook.**
   - Next to `remotePlayers` (:475), add
     `charMatesInto: (pin: Float64Array, from: number, max: number) => number = NO_MATES;`
     with a module-level `const NO_MATES = (): number => 0;` beside `NO_REMOTES`. Doc comment: "(char-shadow-meter S2c)
     Co-op client: writes its partners' slot inputs (`slotInto`) into `pin` slots from..max-1 and returns how many.
     Set by `CoopClient` with the flag on. Solo and host: none. Read only by `fillChars`."
   - New `fillChars` (:1774), after `if (!occ) return;` and `const refs = this.playerRefsInto(this.charRefs);`:
     `nr = min(refs.length, FILL.players)`, then `localSampleInto(0)`, then `for (s = 1; s < nr; s++) slotInto(L, s,
     refs[s]!)`, then `const n = nr + this.charMatesInto(L, nr, FILL.players)`, then `this.charN = n`, then
     `fillPlayers` and `fillVictims` with `n` as today.
   - `updateLight` :1712 (lead's check note): the meter loop writes `charRefs[s].light`. A client's partner slots sit
     past `charRefs`. Change the line to `} else if (s < this.charRefs.length) this.charRefs[s]!.light = v;`. A
     partner's light on a client is not stored; the host's sample drives guards, as today.
   - Leave alone: the flag-off branch (:1720-1734), `localSampleInto`, `headSample` (still used at :1731) and
     `playerRefsInto`.
3. **remoteAvatar.ts.** After `get dead()` (:247), add `/** (char-shadow-meter S2c) A state has been shown: \`pos\`
   is real. */ get shown(): boolean { return this.placed; }`. `placed` is set at :333-334 and never reset.
   Before that, `pos` is (0, 0, 0).
4. **charMates.ts (new, Babylon-free; imports `PF` from ./protocol, `playerBody` and the empty builders from
   ../player/playerVolumes, and `slotInto` / `MateLike` from ../game/charOccluderFill).**
   - `export interface MateSource { readonly pos: V3; readonly flags: number; readonly dead: boolean; readonly shown:
     boolean; readonly rig: { readonly height: number }; bodyIn(out: PlayerBodyIn): PlayerBodyIn }`. `RemoteAvatar`
     fits it.
   - `class CharMates`. Each entry is `{ src, ref: { feet, crouched, height, peekX: 0, peekZ: 0, head }, headV, bin:
     emptyPlayerBodyIn(), bout: emptyPlayerBodyOut() }`.
   - `set(order: readonly MateSource[])` is not hot. It rebuilds the entry list, reusing an entry when its source is
     the same object.
   - `into(pin, from, max): number` runs every sim step. It is an indexed loop over entries; `s` starts at `from`.
     Skip `!src.shown`. Stop at `s === max`. Refresh as the host's `RemotePlayer` builds its ref (remotePlayer.ts:78,
     :142, :216):
     - feet = `pos`;
     - `crouched = (flags & PF.crouch) !== 0`;
     - `height = rig.height` (the operator's fixed standing height, the host's source; not a pose);
     - `const b = playerBody(src.bodyIn(bin), bout)`, the same call as partnerTarget.ts:61;
     - `head = bin.wall && !src.dead ? headV.set-from(b.head) : null`;
     - `slotInto(pin, s, ref)`; `s++`.

     Return `s - from`.
   - Do not reuse `PartnerTarget`. It exists only in course mode (coopClient.ts:390) and runs per frame.
   - Peek is always 0 on the client. Off a wall the host's is 0 too. On a wall a live partner's posed head replaces
     it. Only a dead partner still on a wall differs (host: eased edge offset). Log that as a limit in the report.
5. **coopClient.ts.**
   - Add the field `private readonly mates = new CharMates();` and a kept `private readonly mateOrder: RemoteAvatar[]
     = [];`.
   - `relistMates()` returns at once unless `this.g.charOccluders`. Otherwise it fills `mateOrder` from
     `this.s.players.values()`, self skipped, `this.avatars.get(id)` when present, and calls `mates.set(mateOrder)`.
   - Call `relistMates()` at the end of `avatar()`'s create branch (:382-395), at the end of `dropAvatar` (:429-446)
     and in the `lobby` handler (:181) beside `recolour()`.
   - In the constructor, only when `g.charOccluders`: `const prev = g.charMatesInto; g.charMatesInto = (p, f, m) =>
     this.mates.into(p, f, m); this.offs.push(() => (g.charMatesInto = prev));`. This is one closure, made once.
     coopClient imports gameState only as a type (:2). Keep it that way.
   - **Slot order rule:** slot 0 is the local player. Slots 1.. are the other players in `s.players` order (the host's
     lobby order), self skipped, unshown ones skipped. The host fills its slots the same way: `remoteRefs` in lobby
     order (coopHost.ts:210, :394). After a rejoin the host re-appends (:507), so the two orders can differ. Slot order
     changes only machine-local owner keys and the picture's tie-break, never a sample, so that is accepted. Say so in
     the report.
6. **Docs.**
   - lighting.md Co-op bullet (:286-291): delete the sentence from "Known limit until slice S2c" to "counts them." Add
     in its place: "A client fills its partners from its own sim view of them (`net/charMates.ts`), in the host's
     player order." Change nothing else.
   - Fragment and report as listed above.

## Tests
1. **tests/charOccluderFill.test.ts, new `describe('slotInto (S2c)')`.**
   - (a) For 200 random refs, half with `head`, `slotInto(pin, s, r)` gives the 6 doubles of A2's inline formula,
     restated in the test, `Object.is` each. Use both branches, with `height` absent and present, and crouched true and
     false.
   - (b) The bytes-per-call case gets `slotInto` x3 inside the measured loop, under `HEAP_NUMBER`.
2. **tests/charMates.test.ts (new).** Stub `MateSource` objects with fixed fields. `bodyIn` copies a prebuilt
   `PlayerBodyIn` field by field, with no allocation.
   - (a) **One partner fills slot 1.** One shown source at (3, 0, 4), standing, `rig.height` 1.68. `into(pin, 1, 4)`
     returns 1. `fillPlayers(occ, pin, 2, keys)`, then `capOf(occ, 1)` equals the test's `rt(3, 0, 4,
     lightSampleHeight(1.68, 0))`, and `keys[1] === occKey(OCC_KIND.player, 1)`. With the crouch flag the height is
     `lightSampleHeight(1.68, 1)`. On a wall (`bin.wall` true) the slot equals `posedHeadSample` of `playerBody(...)
     .head`. Dead on a wall, the head is null.
   - (b) **Skips and caps.** An unshown source returns 0 and writes nothing to `pin`. Three sources with `from` 2 and
     `max` 4 write 2. `set` twice with the same source keeps the same `ref` object.
   - (c) **Flag off unchanged.** This is source-level, like charOccluders.test.ts:302-321. In gameState.ts,
     `charMatesInto(` appears only in its declaration and in `fillChars`, after `if (!occ) return;`. The flag-off
     branch of `updateLight` has no `charMates` or `slotInto`. gameState.ts and charOccluderFill.ts have no static
     `from '../net/` or `from '../../net/` import. In coopClient.ts the `g.charMatesInto =` assignment sits inside
     `if (g.charOccluders`.
   - (d) **No allocation per call.** `into(pin, 1, 4)` with 3 shown sources, one on a wall, reads under `HEAP_NUMBER`
     (`bytesPerCall`, as charOccluderFill.test.ts:192-229). A vector-per-call control reads 32 B or more. Print the
     bytes-per-call line.
   - (e) **Two machines agree.** Host: a real `RemotePlayer` on the NullEngine and Havok harness of
     tests/remoteKneelTense.test.ts (stub registry, avatar `{ rig: { height: 1.68 }, dispose() {} }`). Feed it 90
     states at 60 Hz through the real `pstate` parse. Its slot is `slotInto(pinH, 1, rp.ref)`. Client: a
     `CharMates` with a source at the state's feet and flags, `rig.height` 1.68, shown, alive, whose `bodyIn` copies
     `rp.bodyIn` (the same sim view). Its slot is `into(pinC, 1, 4)`. Run three cases: standing, crouched still, and
     on a wall (`mv.m = 'wall'`). In each, all 6 pin doubles and all 7 capsule floats after `fillPlayers` differ by
     1e-6 or less, and the head is null or non-null alike. A7's ~0.3 s snapshot lag is e2e territory (S4), not
     tested here.
3. **Run.**
   - `npm run typecheck:fast`.
   - `npx vitest run tests/charOccluderFill.test.ts tests/charMates.test.ts tests/charOccluders.test.ts
     tests/coopPerception.test.ts tests/remoteKneelTense.test.ts --maxWorkers=2`.
   - Report counts and every bytes-per-call line.
   - No e2e, no GPU, no `npm run check`.

## Pending PC run (the lead, laptop queue; list these in the report)
- `affected-e2e`, `e2e-coop` and `e2e-netmove` on the branch head, flag off and with `?charlight=1`.
- S4's e2e-coop partner probe ("partner's shadow on the client: client meter = host's sample within 0.02") is S4's
  work, not this slice's. Name it as the check that closes S2c.

## Done
- Every step above is committed path-limited (never `git add -A`) and pushed to `feature/char-shadow-meter-s2c`.
- tsc is clean, and the vitest files above are green.
- `docs/char-shadow-meter/checks/s2c-build.md` holds: files with +/- lines, tests with counts, bytes-per-call
  lines, deviations, limits (dead partner on a wall: peek; slot order after a rejoin) and pending PC runs.
- Side note for the lead, out of scope: `playerRefsInto` (gameState.ts:1083) uses `out.length = 0` + `push`.
- A short report goes at the end of this brief, then `status: done feature/char-shadow-meter-s2c <sha>`.
- A question this brief cannot settle: `status: blocked <reason>`.
