# stealth-pays S1 report - Course: interrogation codes set course flags

- What: `CourseMode.onIntelCode(flag)` = `this.state?.setFlag(flag)` (`src/game/modes/courseMode.ts`, beside `onRemoteTakedown`). `revealIntel` already calls `g.mode.onIntelCode` per code flag (host / solo only), so a guard's code is now a course flag, not just a feed line.
- Why: interrogation-intel part B for Course (BRIEF A1). A gate reading the flag must list it in `def.externalFlags`. A bay restart drops the flag like any other.
- Files: `src/game/modes/courseMode.ts`, `tests/intelPartB.test.ts` (new), `scripts/e2e-ctcourse.mjs` (one appended check), `changes/feature-stealth-pays-s1.md`.
- Tests: `tests/intelPartB.test.ts` 2/2 (flag set, repeat gives one `flagSet`, no state is a no-op); `tests/intel.test.ts`, `tests/course.test.ts`, `tests/ctcourse.test.ts` green; `tsc --noEmit` clean; eslint clean on courseMode.ts and the new test; `node --check` on the e2e script.
- e2e-ctcourse not run (laptop). The appended check (before the exit-zone block) calls `g.mode.onIntelCode('e2e-course-code')` twice on the host and asserts `__course.state.hasFlag` false before, true after.
- Open items: the PLAN asked for a real grab + interrogate with `window.__t`; `__t` exists only inside e2e-takedown's page setup and ctcourse is a real-time two-page co-op run with pads, so the check drives the hook directly. The real interrogate chain to `onIntelCode` stays covered by e2e-takedown `grab-interrogate-intel`. A fuller check would need the `__t` harness ported; the lead decides.
- Changelog line: Interrogation door codes now open Course gates.
