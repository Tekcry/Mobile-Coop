# stealth-pays state

## Now
S1, S2 and S3 done and checked (check FAIL B1 fixed by the lead). Docs and the single changelog fragment are in. PR #249 open; laptop `e2e-ctcourse` + `e2e-sectorops` PASS on bf9445d6 (30ab34e7 is docs only past it); CI check pass; labelled train-ready.

## Next
Ride the next train (33, after train 32 releases). On a train failure in ctcourse / sectorops: Opus triage at once. P1 stays parked.

## Open
- P1 (client hang-down interrogation) parked: needs a wire change and a PROTOCOL number from the orchestrator (A6).
- Polish (CHECK.md): Sector co-op client never sees INTERROGATE on a Sector guard with `info` (`coopClient.ts:326`, `src/net`; noted in interrogation-intel REPORT); a code from an earlier section's guard is held for the live section (harmless).
- Hand-offs (no action here): map owners author `GuardIntel.codes` (Sector Ops, Marlow Build); section-rating may read
  `dualTakedown` / `style.duals` instead of its own `SyncedDetector` (A2); the weapons crate refills quiet rounds (A3).

## Done
- 2026-10-23: BRIEF, PLAN, STATE (planner, base 4f6db420).
- 2026-10-23: S1 (course onIntelCode), S2 (sector grantCode, spawn info, onIntelCode), check (FAIL B1, fixed).
- 2026-10-23: S3 docs: takedowns.md, interrogation-intel REPORT, TESTING.md; one fragment changes/feature-stealth-pays.md (slice fragments merged and deleted).

## Resume prompt
```
Night Shift | Player Build: resume job stealth-pays. Worktree C:/NightShift/Mobile-Coop-stealth-pays, branch
feature/stealth-pays (base 4f6db420, 4.79.0). Read C:/NightShift/scratch/ctcore/COMMON-27.md (guard, commit, e2e lock
rules), then docs/stealth-pays/STATE.md, BRIEF.md (A1-A6), PLAN.md. Use the line refs, never whole large files.
Next: group A in parallel - S1 (src/game/modes/courseMode.ts onIntelCode -> state.setFlag; tests/intelPartB.test.ts;
e2e-ctcourse check) and S2 (src/game/sectorKeypads.ts grantCode after :42-49; src/game/modes/sectorMode.ts copy
p.slot.info to e.info at spawn :754-756 and onIntelCode beside onAlarm :773 -> grantCode + keypadLabels :344;
tests/sectorIntelCode.test.ts; e2e-sectorops check). Sonnet builders from strict briefs, one fresh Sonnet checker,
at most 1 fix round. Then S3 docs + changes/feature-stealth-pays.md. No src/ai, no map data, no wire change.
P1 stays parked unless the orchestrator unparks it with a PROTOCOL number. Progress goes in STATE.md; message the
orchestrator only at PR / train-ready / blocked.
```
