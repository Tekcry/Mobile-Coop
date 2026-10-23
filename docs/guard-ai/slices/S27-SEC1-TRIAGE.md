# S27 triage: e2e-sectorops part 1, "raised by the panel, not the radio"

Run: laptop set `s27-e2e` on 0ae92fd4 (6/7 suites pass), log
`C:/NightShift/scratch/laptop-queue/runs/20261023T115816-night-shift-guard-ai-0ae92fd4-f23b/4192.log` (~line 225).
Scenario: `scripts/e2e-sectorops.mjs` "a guard raises the live section's alarm panel, again after a restart"
(`panelAlarm`, ~:224-283). Runner e6 was assigned to section 2's panel and the stage rose, but `alarmBy` was `'radio'`.

## Verdict: test staging, not a regression

- History: the assert passed in all 17 earlier laptop runs of `e2e-sectorops:1` (sector-redesign, marlow, trains 32-37,
  guard-ai S23 / LR16-4). None of them contains S24 (7fe4f6a2); no S24 / S25 / S26 run ran this suite. So the new
  radio path comes from S24 + S27, not from the panel code. Only one failing run exists (no rerun).
- `alarmBy = 'radio'` is set only by `radioAlarm` (`src/ai/enemyManager.ts:2266`), from a `command` call, which is
  owed only after a contact call gets through (`sink.completed` -> `contactThrough`, `enemyManager.ts:353-366`). The
  scenario cuts the runner's own contact call at once (S6 stack-tip fix), so another contact got through.
- The runner's path is unchanged by S27: the panel branch is first in `decide` (`src/ai/enemy.ts:2649-2665`) and returns
  before `roleStep`, `tactics` and the `inCover` reorder. The carry change (A164) reads stage 0 here.
- What changed around it:
  - S24 (A149, `enemy.ts:1260-1266` `takeSighting`): a guard in combat with no intruder (`hunt` -1: the runner's shout
    joined him, or the runner was forced alerted with no sighting) who then sees the player calls the contact again,
    naming him. Before S24 a guard already in combat never made a new call on a later sighting.
  - S27 (A161, `enemy.ts:2572-2590` `roleStep`): a role guard out of sight in the open no longer stands still for the
    group; after `SQUAD.openWait` 3 s he walks to today's cover pick. A squadmate the shout joined now moves, can come
    into view of the player standing at the connector checkpoint, and his S24 call (2.5 s) plus the command call (4 s)
    lands inside the runner's panel run.
- Both behaviours are what their slices specify (a guard who sees the intruder calls it in; open waiters take cover).
  This scenario is about the panel path only (the S6 comment says so); the panel-vs-radio race has its own assert in
  `e2e-stealth-ai` 'alarm'. So the staging must keep the radio out, as the existing `radioNet.cut(runner)` already
  tried to.

## Fix (scripts only)

`scripts/e2e-sectorops.mjs` `panelAlarm`: radio silence for the whole race. After every 0.5 s step of both loops (find
the runner, wait for the raise) a `hush()` cuts every open call of every live guard (`em.radioNet.cut(num)`). A call
holds at least 1.75 s (callIn 2.5 s x the fastest reaction 0.7), so none can complete; no contact gets through, no
command call is owed, and the stage can only rise through the panel. The callers cut (guard id -> calls) are printed
in both asserts, so the rerun shows which guards called (evidence for the S24 / S27 mechanism). Asserts unchanged:
the runner goes to section 2's panel, the stage rises by 1, `alarmBy === 'panel'`; the same for the restart pass.

No `src/` change, so no `e2e-stealth-ai` in the rerun.

## Checks

- `node --check scripts/e2e-sectorops.mjs`: OK.
- No local e2e (laptop rule); tsc / vitest not needed (no src or tests change).

## Rerun

Laptop set `s27-sec1-fix`, suites `e2e-sectorops:1`, on 1e8d1b6c: request `20261023T130022-night-shift-guard-ai-1e8d1b6c-4671`.

## Open

- If the rerun's "calls cut" shows nobody but the runner, the radio came from another source; read the printed
  callers before closing.
