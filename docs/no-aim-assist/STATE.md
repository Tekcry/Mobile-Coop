# no-aim-assist - state

Updated 2026-10-21 Sydney. CT Core's spare job (Michael approved ~09:30 via the orchestrator). Branch
feature/no-aim-assist, folder C:/NightShift/Mobile-Coop-no-aim-assist, from master f7e89679 (4.30.0).

## Brief
G16 says no aim assist on any input; CLAUDE.md and docs/progress.md said `src/weapons/aimAssist.ts` was still wired
for the pad. Unwire and delete it with its setting and UI toggle, update the tests that assumed it; a removed setting
bumps SAVE_VERSION only if settings are in the save schema. Docs: combat.md, input-and-loop.md. Then check + e2e-pad,
e2e-weapons-carry, e2e-menus, a PR, the laptop's full e2e. One implementer, one checker, one fix round.

## Now
- Found: the aim-assist code was already gone; only the dead `gamepad.aimAssist` setting (read by nothing), test
  asserts and e2e toggles remained. Removed at 88c61c9d (settings.ts, settings / ui tests, e2e-combat, e2e-stealth,
  e2e-weapon-audio, anim-audit, two damage.ts comments, docs, CHANGELOG "Unreleased - no-aim-assist"). Settings are not
  in the save schema (sanitizeSettings drops the old field), so no SAVE_VERSION bump. Done by the job lead directly
  (the change was too small for a separate implementer).
- Checker PASS (no fixes, so no fix round): npm run check pass (2299); e2e-menus, e2e-combat, e2e-weapons-carry,
  e2e-stealth pass; e2e-pad (known flaky) failed in the run and two solo reruns, each on a different controls-screen
  timing / capture check (none touches aim assist); the laptop's full e2e decides it.
- PR to master opened; Character Build asked for the full e2e on the PR head.

## Next
- The orchestrator merges on a green full e2e. Then nothing more.

## Resume
```
CT Core Build: RESUME no-aim-assist. Work only in C:\NightShift\Mobile-Coop-no-aim-assist on feature/no-aim-assist (git pull --ff-only). Read CLAUDE.md ("Sessions") and docs/no-aim-assist/STATE.md, then carry on from "Now". Desktop heavy.lock with noclobber; long suites to "Night Shift | Character Build" with the exact commit. Report to "Night Shift | Orchestrator". No em dashes.
```
