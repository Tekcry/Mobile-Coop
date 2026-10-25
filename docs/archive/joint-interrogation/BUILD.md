# Joint interrogation - slice 1 build report

Branch `feature/joint-interrogation` off master 6b44efb8. Built from `PLAN.md` section 4, steps 1-8, with its tests and docs.

## Files and lines (against the plan commit 7b3fff27)
- NEW `src/game/jointInterrogation.ts` (Babylon-free): `JOINT { window: 6, reach: 3 }`, `JOINT_KIND 'joint'`,
  `JOINT_BLUFF_LABEL 'Bluff'`, `JOINT_BLUFF_FEED`, `JointIntel`, `Bluff`, `jointOf`, `hasJoint`, `bluffLive`,
  `jointBluffer` (new, see deviations), `jointLines`, `checkJoint`.
- `src/game/intel.ts:8, :20-21`: `GuardIntel.joint?: JointIntel` (import type).
- `src/game/intelReveal.ts:7, :22-40`: `revealJoint(g, at, j)`: feed + lantern subtitle per line, flag to
  `mode.onIntelCode`, `intel` event (the co-op host relays it as `feed`). Returns true when it showed lines.
- `src/game/gameState.ts:45` import; `:230-235` NetAttachment `jointBluff?(v)`, `jointLive?(v)`; `:1387-1389` the BLUFF
  row (`o.plan.kind === 'assist' && hasJoint(o.e)`, before the TD row); `:1448-1449` `ctxRun` JOINT_KIND -> `net.jointBluff`.
- `src/game/takedownController.ts:18-19` imports; `:478-480` the host / solo holder's read end:
  `!g.puppet && lines && g.net?.jointLive?.(e)` -> `revealJoint(g, e.pos, jointOf(info))`.
- `src/net/coopHost.ts:51-52` imports; `:147-158` `bluffs` (public readonly, for the e2e), `jointEid`, the bound
  `bluffDist`; `:351-352` `joints`; `:850-855` the `kind === 'bluff'` branch in `onTakedown` (after `assist`, before the
  seize path); `:905-947` `onBluff`, `jointBluff`, `jointLive`, `jointFor`; `:1607-1610` the client holder's read end.
- `src/net/coopClient.ts:624-629` `jointBluff(v)` -> `td { ph: 'start', lethal: false, kind: 'bluff' }`.
- `src/world/maps/ctcourseSets/a8Strongroom.ts:51` import type `GuardIntel`; `:83-96` `A8_JOINT_FLAG`, the officer's
  `joint` lines and flag; `:599-600` the `a8-split` radio teach.
- Tests: NEW `tests/jointInterrogation.test.ts` (12); `tests/ctcourse.test.ts:17, :166-170` the joint-lines loop;
  `tests/ctcourse/a8Strongroom.test.ts:1292-1294` the radio list now includes the `a8-split` teach.
- e2e: `scripts/e2e-coop.mjs:985-1041`, step "joint interrogation: host bluffs, client reads".
- Docs: `docs/systems/coop.md` (protocol history, the client-takedowns paragraph, the intel read-end note),
  `docs/systems/takedowns.md` (after the team takedown bullet), `TESTING.md` (one line), `COOP-INVENTORY.md:94`,
  `docs/marlow-final/SPEC.md:1255`, `changes/feature-joint-interrogation.md` (kind minor, declares the wire change).

## Night-two number
`patrolPeriod({ points: A8_N2_ROUTE, waits: A8_N2_WAITS }, grunt walkSpeed 0.9 x PACE.patrol 1.1)` = 39.8 s, rounded to
forty; the grille stop is `A8_N2_WAITS[2]` = 5 s. The plan's line stands as written; a unit test pins both numbers.

## Plan risks (section 5)
- Wire: `onTakedown` returns on `kind === 'bluff'` right after the `assist` branch, before `seized` is read or set; only
  `ph: 'start'` acts. protocol.ts and `PROTOCOL_VERSION` are untouched; the fragment declares the wire-semantics change,
  and `merge-train.mjs` sees the `src/net` diff and bumps once.
- Double reveal: the two read-end paths are exclusive by who holds the guard (the client path runs only for a `seized`
  entry; the host path only when `!g.puppet`, i.e. the host's own grab). `jointBluffer` skips the holder's own entry, and
  `jointFor` deletes the bluff it uses, so even a second call for the same read finds nothing.
- `holderOf` while the host interrogates: `takedown.hostage` is `active.grab.hold ? e : null`; the interrogation runs
  inside the hold (`holdTalk`), so it stays non-null.
- Single player: no `src/net` import added to game code; the row needs `plan.kind === 'assist'`, which only
  `net.partnerHolds` makes; `jointLive` is reached only through `g.net`.
- Stale puppet info (A1): the client may list BLUFF on a spent guard; the host's `hasJoint` denies it (A6, nothing shown).
- Allocation: `contextMenuStep` adds one field read (`hasJoint`) and one `m.add`; the seized loop adds nothing per step
  (the read-end block runs once per read). `jointBluffer` iterates the map only at a read end; `hyp2` throughout.
- Shared files (coopHost.ts, gameState.ts, a8Strongroom.ts): rebase before the PR (lead).

## Deviations
- `jointLines` caps at `GUARD_INFO_LINE_MAX` (90), not `INTEL.lineMax` (60): the A8 joint lines are 79 characters and 60
  would cut both mid-word. They are spoken lines (radio length), like the guard's own.
- `jointLive(v)` spends the bluff when it returns true (`bluffs.delete`, `joints++`), so the host-holder path counts like
  the client path. A4's undo (a label from `jointLive`) would need a pure query split out first.
- New pure `jointBluffer(bluffs, eid, holder, now, dist)` holds the loop `jointFor` runs (skip the holder, drop stale
  entries, first live match), so "own hold" and expiry are unit-tested without the host. `jointFor` returns boolean as
  planned.
- Both read-end paths also require the guard's solo lines to be present (`lines` / `info.lines.length > 0`): A1's one
  chance; a guard with no lines has no INTERROGATE row anyway.
- `A8_OFFICER_INFO` is typed `GuardIntel` (from `game/intel`, type-only), and a new export `A8_JOINT_FLAG = 'a8-joint'`.
- The A8 radio test's exact list (`tests/ctcourse/a8Strongroom.test.ts:1292`) was updated for the new teach line.
- e2e: the host page is moved beside the hostage inside the new step (the team takedown step keeps its own move); both
  pages press A through `input.state.set('e2e', 'interact', ...)`, the real context-menu path (hold opens the list, the
  release runs the highlighted row), not `grabMenu.sel`. The denial check picks a guard the client has a puppet for and
  gives him joint info on the host, so the holder rule is what denies.

## Checks (desktop)
- `npx tsc --noEmit -p .`: clean. `npx eslint` on the changed files: clean.
- vitest (single files, `--maxWorkers=2`): jointInterrogation 12, ctcourse 28, ctcourse/a8Strongroom 83, guardInfo 2,
  intel 16, intelPartB 2, grabMenu 3, net 75, contextMenu 10, coopWalkFixes 15, changesFragments 1, hangDownTakedown 7,
  grabMenuNav 2, doorMenu 3, strikePops 7, animN4dKill 11, guardHeadParity 165, protocolConst 3: all pass.
- `node --check scripts/e2e-coop.mjs`: OK. No e2e, build or `npm run check` here: the lead queues the laptop
  `e2e-coop e2e-takedown e2e-ctcourse:4`.
