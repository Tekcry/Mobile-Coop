# stealth-pays check - S1 + S2 (Opus checker)

Head checked: 28bb6e2a (S1 + S2 merged onto 956c1243). Read-only review; no e2e run (laptop runs e2e-ctcourse / e2e-sectorops).

## Verdict: FAIL

One blocking finding: S2's appended e2e check breaks the next existing check in the same part, so e2e-sectorops `--part=6`
cannot pass. The src and Vitest work is correct; the fix is a few lines in `scripts/e2e-sectorops.mjs`.

## Blocking

- B1 `scripts/e2e-sectorops.mjs:2798` vs `:2811-2813`. Check (a2) ends with `open: m.useKeypad(3, 0)`, which opens kp-batt:
  `SectorMode.enterCode` disables the keypad item (`sectorMode.ts:327`, `setEnabled(q.it, false)`). The existing check (b)
  then calls `window.__sector.useKeypad(3, 0)`, which returns false at once on a disabled item (`sectorMode.ts:519`,
  `if (!q || !q.it.enabled) return false`), and asserts `codes.a === true`. (b) fails every run where (a2) passes.
  Fix (either): (a2) drops `open: m.useKeypad(3, 0)` and asserts only held + label (b still opens both); or (b) reads
  kp-batt as `window.__sector.codes.isOpen(3, 0)` and calls `useKeypad` only for kp-deck. No src change needed.

## Checked, fine

- Scope (1): S1 touched only `courseMode.ts`, `tests/intelPartB.test.ts`, `scripts/e2e-ctcourse.mjs` (+ its fragment);
  S2 only `sectorKeypads.ts`, `sectorMode.ts`, `tests/sectorIntelCode.test.ts`, `scripts/e2e-sectorops.mjs` (+ fragment).
  Both match PLAN S1 / S2 exactly.
- `CourseMode.onIntelCode` (`courseMode.ts:419`): `this.state?.setFlag(flag)`; null state is a no-op; `setFlag` is
  idempotent (`courseState.ts:209`) and records `flagBay`, so a bay restart drops it (`courseState.ts:380-383`). Unknown
  flag: held, the `flagSet` handler (`courseMode.ts:579-582`) only speaks for a matching flag gate, nothing else. Flags ride
  the packed state (`courseState.ts:607`, `apply` :644), so the co-op client mirrors it.
- `SectorCodes.grantCode` (`sectorKeypads.ts:51`): false on mirror / empty / held; held per section; `restart(sec)`
  drops it like board / overhear codes (`:96`). Unknown flag held, opens nothing (tested).
- `SectorMode.onIntelCode` (`sectorMode.ts:774`): grant for `run.index`, labels refresh only on a new code. Restart and
  "Restart at checkpoint" both go through `restartSection` -> `rekey` -> `codes.restart` + `keypadLabels` (:901, :364).
- Spawn copy (`sectorMode.ts:756`): shares the slot's `GuardInfo` object, but `takeInfo` nulls `e.info` (does not mutate
  the object), so a respawned guard has his information again (BRIEF A4). Reinforcement slots are fresh objects
  (`sectorStage.ts:204`, sectorMode :821-823) and never carry `info`. No Sector map authors `info` yet: play unchanged.
- Co-op: the client never calls the hook (`takedownController.ts:476` skips the puppet); the host reveals a client's grab
  interrogation (`coopHost.ts:1338-1340`) and calls its own mode. Correct: codes are host-owned in both modes.
- e2e-ctcourse check (`scripts/e2e-ctcourse.mjs:1029-1043`): `window.__app.current.mode` and `window.__course.state`
  exist on the host page; sets an unused flag in the current bay; nothing later reads flags or that bay's events. Safe.
- Tests (each `--maxWorkers=2`, one at a time): intelPartB 2/2, sectorIntelCode 4/4, sectorKeypad 19/19, intel 16/16,
  course 34/34. `tsc --noEmit -p .` clean; eslint clean on the 5 touched src / test files; `node --check` on both scripts.
- No allocation on a hot path (hook is per interrogation; spawn line assigns a reference); no `Math.hypot` in the src diff.

## Polish (not blocking)

- P1 Two changelog fragments (`changes/feature-stealth-pays-s1.md`, `-s2.md`); PLAN says one for the branch: S3 should
  fold them into `changes/feature-stealth-pays.md` and delete these.
- P2 Sector co-op client: its puppet looks up info only from `layout.course?.squads` (`coopClient.ts:326`), so once a
  Sector map authors `info`, the client never sees INTERROGATE on that guard (host / solo only). Not ours to fix
  (`src/net`, no Sector info exists yet); worth a line in S3's REPORT open items next to P1.
- P3 A guard of an earlier section interrogated after the run moved on gives a code held for the live section (`run.index`),
  dropped by its restart. Harmless; a note only.
- P4 Both e2e checks drive the hook directly (accepted deviation); the real chain stays covered by e2e-takedown
  `grab-interrogate-intel`.

## Fix round (lead, 2026-10-23)
B1 fixed: (a2) no longer calls `useKeypad(3, 0)`; it asserts the held code and the "Enter code" label only, and (b) opens kp-batt as before. `node --check` passes. e2e-sectorops reruns on the laptop (e2e-ctcourse unaffected).
