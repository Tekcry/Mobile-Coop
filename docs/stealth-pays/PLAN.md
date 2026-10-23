# stealth-pays plan

Line refs at master 4f6db420. Wire: none in S1-S3 (PROTOCOL_VERSION unchanged). Groups run in parallel only when no two
slices share a file. One changelog fragment for the branch, written in S3.

| id | title | files (only these) | model | group |
| --- | --- | --- | --- | --- |
| S1 | Course: interrogation codes set course flags | `src/game/modes/courseMode.ts` (new method beside `onRemoteTakedown` :418; `setFlag` use as :221); `tests/intelPartB.test.ts` (new); `scripts/e2e-ctcourse.mjs` (one appended check) | Sonnet 5.5 | A |
| S2 | Sector Ops: guard info at spawn, codes to the team | `src/game/sectorKeypads.ts` (new `grantCode` after `grant` :42-49); `src/game/modes/sectorMode.ts` (spawn :754-756, new `onIntelCode` beside `onAlarm` :773, calls `keypadLabels` :344); `tests/sectorIntelCode.test.ts` (new); `scripts/e2e-sectorops.mjs` (one appended check) | Sonnet 5.5 | A |
| S3 | Docs and changelog | `docs/systems/takedowns.md`, `docs/interrogation-intel/REPORT.md` (open items :18-21), `TESTING.md` (the new checks), `changes/feature-stealth-pays.md` (new) | Sonnet 5.5 | B (after A) |
| P1 | Parked: client hang-down interrogation gives the intel | `src/net/coopHost.ts` (hang branch :1312-1315, interrogation check :1336-1342), `src/net/hangHold.ts` :27, `src/net/protocol.ts` | Opus 5.5 | parked (A6) |

Group A: S1 and S2 in parallel (no shared file). Group B: S3. P1 only if the orchestrator unparks it.
(12) and (7) have no slice: done on master (dual-reward, sd-rounds); the rest is owned elsewhere (BRIEF.md "Owners").

## S1 - Course codes (Sonnet, strict)
- `CourseMode.onIntelCode(flag: string): void { this.state?.setFlag(flag); }` with a one-line doc comment
  "(stealth-pays S1, spare 9 part B) host / solo: an interrogation's code flag, like a keypad code from a camera or a
  hack". Nothing else in courseMode. Host / solo only (`revealIntel` already skips the puppet,
  `takedownController.ts:476`).
- Acceptance: a guard whose `info` has `codes: [{ flag: 'x', label: 'L' }]` interrogated in Course mode leaves
  `__course.state.hasFlag('x')` true; a guard with no codes sets nothing; tsc clean, eslint on the touched files.
- Vitest: `tests/intelPartB.test.ts`: a `CourseState` and the method called on a minimal object (no Babylon) -
  `onIntelCode` makes `hasFlag` true; a repeat is a no-op (one `flagSet` event). Run `tests/intel.test.ts` too.
- e2e: `e2e-ctcourse` (laptop only, via Test Runner): one appended check - spawn a guard with `window.__t`, set
  `e.info = { lines: ['x'], codes: [{ flag: 'e2e-course-code', label: 'E2E' }] }`, grab, pick interrogate, step 1.8 s,
  assert `window.__course.state.hasFlag('e2e-course-code')` (pattern: `scripts/e2e-takedown.mjs:269-299`).

## S2 - Sector codes (Sonnet, strict)
- `SectorCodes.grantCode(flag: string, sec: number): boolean`: false when `!this.host`, `!flag` or already held; else
  `have.set(flag, sec)` and true. `restart(sec)` already drops it (:87-89). Doc comment "(stealth-pays S2) a code from
  an interrogation (no intel index)".
- `sectorMode.ts` spawn (:754-756): `if (p.slot.info) e.info = p.slot.info;` right after the null check, before
  `setPatrol` (no Sector map has `info` today, so play is unchanged until a map authors one).
- `onIntelCode(flag: string): void { if (this.codes.grantCode(flag, this.run.index)) this.keypadLabels(); }`. No radio
  line (the feed already shows "Code: label", relayed to the client by `coopHost.ts:259`).
- Acceptance: interrogating a Sector guard whose slot has `info.codes` with a keypad's code makes that keypad usable
  (`useKeypad` true, prompt `KEYPAD_LABEL`); a section restart drops the code and relocks; an unknown flag is held but
  opens nothing; tsc clean, eslint on the touched files.
- Vitest: `tests/sectorIntelCode.test.ts`: `grantCode` on host true then false (repeat), mirror (`host` false) false,
  `useKeypad` true after it, `restart(sec)` drops it, a code from section 0 survives section 1's restart. Run
  `tests/sectorKeypad.test.ts` too (unchanged, must stay green).
- e2e: `e2e-sectorops` (desktop lane, `E2E_GPU=1`): one appended check on a section with a keypad - give a spawned
  guard `info` with that keypad's code, interrogate, assert the keypad opens on use.

## S3 - Docs (Sonnet)
- `docs/systems/takedowns.md`: interrogation codes now reach Course flags and Sector keypads (one short paragraph).
- `docs/interrogation-intel/REPORT.md`: part B done (stealth-pays S1, S2); the hang-down gap stays (P1).
- `TESTING.md`: the two new checks and two new vitest files.
- `changes/feature-stealth-pays.md` (see `changes/README.md`): "Interrogation door codes now open Course gates and
  Sector Ops keypads."
- Acceptance: docs only; no tests.

## P1 - Parked (A6)
The host sees a client's interrogation from MoveState `m: 'grab'` (sub bit 2, `ph`); from the hang-down the client
sends `m: 'boost'` + `HANG_SUB` and no interrogation progress, so the host never reveals. A fix needs a wire field or
bit: **wire change, PROTOCOL bump with the orchestrator's number** (section-rating holds 42, 41 reserved for guard-ai
S9). Opus. Suite: `e2e-coop` (laptop). Not started without the orchestrator.

## Test tier
Slice batch (S1 + S2 + S3): CI `check` + `e2e-ctcourse` (laptop) + `e2e-sectorops` (desktop lane). No `src/net`,
PROTOCOL or save change, so `e2e-coop` / `e2e-netmove` are not required.

## Merge notes
`origin/feature/section-rating` (Marlow Build) edits `courseMode.ts`, `sectorMode.ts` and `coopHost.ts`; our hunks are
new methods and one spawn line, so expect trivial conflicts at most. Merge master in only when entering a train.
