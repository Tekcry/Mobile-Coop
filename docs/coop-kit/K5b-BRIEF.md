# coop-kit K5b brief: Plank Bridge, lay and cross
Owner: Night Shift | Player Build. Status: current (job doc; the slice brief, copied from the lead's scratch brief).


Read first: `git show origin/master:docs/systems/agent-preamble.md` and `git show origin/master:CLAUDE.md` (hard rules).

- Worktree C:/NightShift/Mobile-Coop-coop-kit-k5b, branch feature/coop-kit-k5b, cut on feature/coop-kit-k5a 9e3ae6df6
  (PR #601, itself on K0 #599). Guard before every write: `git -C C:/NightShift/Mobile-Coop-coop-kit-k5b branch
  --show-current` prints feature/coop-kit-k5b, else stop. Push: `git push -u origin feature/coop-kit-k5b`. node_modules
  is a junction to C:/NightShift/Mobile-Coop-menu/node_modules: never npm install / ci.
- Spec: docs/coop-kit/PLAN.md on origin/feature/coop-kit, "Design per move" -> "Plank Bridge" (the lay, the laid board,
  done, guards) and "Slices" -> K5b; "The Marlow API". BRIEF A12 / A17 / M3 (the bands stay move constants, "Not yet")
  and M4 (Tallow Wharf C4's plank stands: Campaign is a second user of the same API). K5a as built:
  C:/NightShift/scratch/ctcore/k5a-REPORT.md and k5a-CHECK.md (polish 5: no request `s` on `TeamRequest`).
- Map inputs: Marlow geo Q1 (C:/NightShift/scratch/marlow/geo-report.md): A2 pit x 66.0-69.0 (gap 3.0 m, both edges
  y 0); the far barrier's panel at the board slot z 12.7-13.7 stands 0.25-1.1 m over the landing (x 68.85-69.04); a
  laid 3.9 m board slides under it and bears 0.45 m each side; the crosser vaults the panel off the board's end; L2
  wall face x 69.75. Marlow's draft PR #612 places `addKitSpot(b.anchors, { id: 'a2-plank', kind: 'plankBridge', x:
  62.85, y: 0, z: 13.455, yaw: PI / 2, w: 3.9 })` (the stack; `h` default 0.16) and its `CourseMode.onKitDone` credits
  the live station when `spot` is its id. Match that spot; no map file edit.
- Prototype mode (Michael ~16:05 / ~16:20, BRIEF M3): starting values (G10), no tuning or polish passes, ONE closest e2e
  set, build toward a playable piece.

## Goal
Two players carrying a board (K5a) lay it over a gap from the near edge and walk across it; the host tells the mode on
each crossing (`onKitDone`); guards notice a laid board as a held-open shutter; a laid board can be lifted again;
`plankBridge` joins `KIT_BUILT` (on in /preview/, off live), so Marlow station 5 `a2-plank` uses the real move.

## Out of scope
Animation (KA5: placeholders stay), balance on the board, a guard nav link over it, map / set files (Marlow's), any
`src/net` or wire change (see K5b-1 / K5b-2), a third player's page laying the board (K5b-7), the client's station-retry
signal (K5b-6), tuning.

## Files and exact behaviour (est. ~850 lines incl. tests and docs; stay under ~1,000)
1. `src/game/kit/plankBridge.ts` (the move; header updated with the design below).
   - Constants (starting values, `PLANK`): `layTime` 1.6 s, `edgeReach` 1.0 m (the front carrier's feet to the near
     edge), `gapMin` 1.0, `gapMax` 3.3 m, `level` 0.3 m, `probeUp` 0.2 m (the far-floor probes start this over the near
     floor: under A2's panel bottom 0.25), `slideClear` 0.1 m (the board's slide line over the floor), `probeStep`
     0.05 m, `layEvery` 0.2 s (the search's rate while carrying), `layCone` 35 deg, `lookOff` 0.6 m.
   - Pure lay search `planLay(ray, px, py, pz, ux, uz, len, out)`: `ray(ax..bz)` = hit distance along the segment (its
     length when clear). From the front carrier's feet along the carry axis: down probes every `probeStep` find the near
     floor (within -`level`..+`probeUp`) until it ends: the near edge `e`, at most `edgeReach` ahead (no floor under the
     feet or no edge in reach: 'noEdge', silent). Past it, low down probes (from `probeUp` over the near floor) find the
     first floor not lower than `level` under it: the far edge `f` (none by `gapMax`: 'wide'; `f - e` under `gapMin`:
     'narrow'). The board is centred on the gap: bearing `(span - gap) / 2` each side (`span` the board's horizontal
     length, 3D length `len`), near end on the near floor, far end on the far floor; a down probe at the far end must
     find that floor ('noBearing'). A slide ray along the board's line `slideClear` over it from the near edge to the far
     end must be clear (A2: under the panel); a hit is 'level' when a high probe just past it finds a floor over
     `probeUp` (a raised far side), else 'blocked' (the barrier outside the slot). Writes the near end, the far end, the
     gap. No allocation (preallocated out, the run's two `Vector3`s through `g.ballistics.hitDistance`, `G.STATIC`; as
     `pullUp.ts` imports `Vector3` and `G`).
   - Carrying (both pages): every `layEvery` the page runs `planLay` from its own body (axis partner -> self) and, if no
     edge, from the partner's seen body (axis self -> partner). A plan -> prompt "Co-op: lay the board over the gap (plank
     bridge)" (else the K5a carry prompt). Co-op while carrying: a fresh search; ok -> `h.kitRequest('plankBridge',
     partner, idx, 2 + yawTurns, farFloorY, farX, farZ)` (`yawTurns` the axis yaw / 2 PI in [0, 1), 1e-5 steps; K5b-2),
     "Laying the board..." until the start or `askWait`; not ok -> a polite refusal (`h.refused`): 'noEdge' "Bring the
     board to the edge of a gap to lay it", 'wide' "The board does not reach across here", 'narrow' "The gap is too
     narrow for the board", 'level' "The far side is not level with this one", 'blocked' "Something is in the way of the
     board", 'noBearing' "There is nothing to rest the far end on".
   - `PLANK_MOVE.claimsPoint` true: a lay claims the far end (`TeamRequest.land`), a lift does not (K5b-1). Host rule
     (`checkPlank`): with `land` -> the lay rule: the device `carried`; one side `brace`, the other `boost`, both
     `PLANK_SUB` with `s` = index + 1 ('notOffering'); same floor +-`up` ('far'); the front carrier = the one nearer the
     far end, `|land.y - front.y|` <= `level` ('noTarget'); front -> far end within [(len + gapMin) / 2 - 0.3,
     (len + gapMax) / 2 + edgeReach + hostSlack] and within `layCone` of the carry axis rear -> front ('far'). The host
     bounds the claim, no host rays (the throw's pattern, K5b-5). Without `land`: K5a's lift rule, now also from a
     `laid` board.
   - `begin` with `s.s` >= 2 and `s.l`: the lay. On every page that gets the start, the device is laid from the start
     alone: far end `l`, axis yaw `(s.s - 2) * 2 PI`, near end `len` back along it (3D length `len`), near floor = the
     front carrier's feet as seen on that page rounded to 1 cm; `phase` 'laid', the drawn ends slide from where they were
     to the laid ends over `layTime` (`slide` 0..1). A carrying player of that board goes `plankLay` / `plankLayA`
     (held still, facing the gap, hands busy) for `layTime`, then free; side `a` then sends 'drop' (frees the host's
     pair). `ended` during a lay is ignored. A page not carrying (it dropped meanwhile) lays the device all the same.
     Wire `s` while laying: index + 1.
   - Laid (`slide` 1): `laid` true, `opens` + 1 (the guards' count), the collider on (world piece). `plankIdle` and
     `checkPlank` allow a lift from a laid board (either end); the lift clears `laid`.
   - Done (`tick`, host; `kitDone` is a no-op on a client): per laid board, each player (own body: controller pos,
     grounded; mates: pos, mode 'ground') is marked when on the board's middle (along the board within `gapMin` / 2 of its
     middle, across within width / 2 + 0.3, feet within 0.3 of its top); a marked player grounded off the board, past the
     middle by `gapMin` / 2 toward the far end and no lower than `level` under the far floor, crossed: `kitDone(g,
     'plankBridge', spot id, crosser, layer)` (crosser undefined for the host's own player; layer the other of the pair
     that laid it, else its b; undefined when it is the host's own). Back toward the near end, or falling `level` + 0.7
     under the board: unmarked. Marks are four preallocated id slots plus one for the own body.
   - Guards: `plankNoticedBy(d, ex, ey, ez, yaw)` (laid, within `SHUTTER_NOTICE.range` of the board's middle, the same
     storey within 1.5 m, facing within `SHUTTER_NOTICE.cos`; within 0.5 m any facing), `plankNoticePoint` (middle,
     board top + 0.2) and `plankLookPoint(d, ex, ez, out)` (the guard's nearer end, `lookOff` further out along the axis:
     he comes to his own side's end).
   - Reset hook (K5b-6): `reset(h, run)`: a running plank move ends, every board home (`resetPlank` also clears `laid`,
     `slide`, marks, `noticed` -1, the lay). K5a's `checkpointRestart` listener goes (checkpoint resets call `resetKit`
     on both pages first). Client heal: a board not on its stack goes home when a mate offers at its index within reach
     of a home end and not of its current ends (the host's station retry reset it).
2. `src/game/kit/registry.ts`: `KitMove.reset?(h, run)` (doc: section restart / station retry, both pages through
   `TeamController.resetKit`). `src/game/teamController.ts` `resetKit`: after the shutters, every registered move's
   `reset`. (+~8 lines in K0's files; K1 can use the same hook.)
3. `src/world/plankBridge.ts`: a laid board (`d.laid`) gets a static Havok box (width x thick x len) at its pose (yaw,
   pitch), membership `G.STATIC`, collide mask all but `G.STATIC` (the shutter curtain's); removed when it is not laid;
   disposed with the piece. Not a nav link (PLAN).
4. `src/game/stealthSystems.ts`: `noticeLaidPlanks(dt)` beside `noticeOpenShutters`, its own clock (`DOOR_NOTICE_EVERY`)
   and its pattern: a calm alive guard who `plankNoticedBy` a laid board with a clear `MASK.SIGHT` line to
   `plankNoticePoint` hears it at `plankLookPoint` (`SHUTTER_NOTICE.range` + 2), once per lay (`noticed` = `opens`).
   Called in `fixedUpdate` after the shutters; `resetForRestart` zeroes its clock. Host / solo only (as the shutters').
5. `src/core/flags.ts`: `plankBridge` into `KIT_BUILT` (its doc line).
6. `tests/kit/plankBridge.test.ts`: K5a's stubs gain `hitDistance` (clear: unchanged K5a runs) and a toast log; the K5a
   restart test uses `resetKit`. New (an analytic box world: near floor, pit, far floor, optional A2 panel / barrier):
   `planLay` on a 3.0 m gap (ends at -0.45 / 3.45, gap 3.0), A2's panel slot (ok) and beside it (blocked), 3.5 m
   (wide), far side +0.5 (level), no edge in reach; the host's lay rule (ok, level off, too far, off the cone, not
   carrying, a lift from a laid board); two pages carry to the edge, see the lay prompt, lay (the same ends on both pages,
   wire s, the slide, `laid` / `opens`), both walk across (`onKitDone` on the host page only, twice, crosser and layer),
   the 3.5 m and +0.5 m refusals on press (toasts, no request), lifted again from a laid board and carried on; reset puts
   a laid board home; the client heal; the notice (pure helper + a `StealthSystems` rig as tests/shutterNotice.test.ts:
   once per lay, facing, range, sight line); `?kitmoves=0` no lay prompt.
7. Docs: the move file header; `docs/systems/coop.md` kit table K5b row; `changes/feature-coop-kit-k5b.md` (kind: minor);
   a copy of this brief at `docs/coop-kit/K5b-BRIEF.md`; a short K5b line in `docs/coop-kit/STATE.md`.

## Assumed and logged (each with its undo)
- K5b-1 Lay vs lift on the host: the lay claims a point (`claimsPoint`, `TeamRequest.land`), a lift does not. Undo: add
  `TeamRequest.s` (teamMoves.ts) and pass `s: ss` in `coopHost.ts` (src/net: two Opus checkers, co-op group).
- K5b-2 The board's yaw rides the start's `s` (2 + yaw turns, s in [2, 3)); both pages lay from `l` + `s` alone (plus
  the front carrier's floor, cm). Undo: a wire field for the near end (protocol: co-op group).
- K5b-3 PLAN "both within 1.0 m of a near edge" read as the front carrier (an end-to-end carry: the rear one is a board
  back). Undo: a constant.
- K5b-4 The far-floor probes start 0.2 m over the near floor (under A2's panel, Marlow Q1), so a far side up to +0.2 m is
  found (down to -0.3 m); +0.2..+0.3 is refused as not level. Undo: `probeUp`.
- K5b-5 The host bounds the claim (distance, cone, level), it does not re-ray. Undo: a host ray hook in `checkPlank`.
- K5b-6 Station retry: Marlow's host `resetKit` reaches planks through the new reset hook; a client page has no retry
  signal (Marlow: "the client's own reset is Player's"), so it heals when a mate offers at the stack. Follow-up (Marlow
  or a K0 fix): the client calls `g.team.resetKit()` on a station retry.
- K5b-7 A third player's page (3-4 players) draws the pair's board put down where they held it, no collider; the done
  call needs the host in the pair. Marlow station 5 and Tallow C4 are two-player pieces. Follow-up: a kit start
  observer (src/net) for 3-4 players.

## Checks
- Every sub-step: `npm run typecheck:fast`; `npx vitest run tests/kit/plankBridge.test.ts tests/kit/kitApi.test.ts
  tests/kit tests/shutterNotice.test.ts tests/previewFlags.test.ts tests/teamMoves.test.ts`; `npx eslint <changed .ts>`.
  Never npm run check, e2e or a dev server.
- Gate (lead): ONE e2e set `e2e-netmove`, requested by the lead (`request.mjs --suites e2e-netmove`). No `src/net` edit
  is planned: one Opus checker (PLAN); if the build needs one (K5b-1's undo), two fresh Opus checkers and the co-op group.
- Commit and push each sub-step (path-limited `git add <files>`, never -A), "coop-kit K5b: ...", ending
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Progress in C:/NightShift/scratch/ctcore/k5b-PROGRESS.md
  and the STATE line.

## Done looks like
Headless: the pair lays the board over a 3.0 m gap and both walk across; 3.5 m and a far edge 0.5 m higher are refused
politely; the host's `onKitDone('plankBridge', spot, ...)` fires on each crossing (host page only); the laid board reads
`laid` / `opens` and a guard who sees it reacts as to an open shutter; lifted again it carries on; a reset puts it home;
`?kitmoves=0` offers nothing. Marlow gets the id, the spot fields and the done call (text in the report); Campaign
(Tallow C4) gets the same lines. Marlow station 5 `a2-plank` uses the real move when the id `plankBridge` is on.

## Report
C:/NightShift/scratch/ctcore/k5b-REPORT.md: head sha, built per item (file:line), files and line counts, tests, deviations,
doubts, the Marlow and Campaign lines. No PR.
