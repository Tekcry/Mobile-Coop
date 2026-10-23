# anim-fix-pass: train 33 entry (merge of master 4.81.0)

Lead (Player Build), 2026-10-23 ~20:40, per `scratch/ctcore/briefs/afp-train-entry.md`.

- Base: origin/master bbd49206 (4.81.0, train 32 #253, PROTOCOL_VERSION 42; #244 in: tests read the constant).
- Pre-merge head: 48b9b73c (AF4b c33ea708 in).
- Conflicts (as merge-tree printed them; same list as the preview against train/32 25c712c9): src/net/protocol.ts,
  src/net/coopClient.ts, src/net/coopHost.ts, src/ui/screens/settingsScreen.ts and the 11 PROTOCOL test files
  tests/{coopWalkFixes,crateWire,hangDownNet,jammer,jammerFixes,moveState,net,poseParity,rejoin,sectorLampSync,sectorStep3}.test.ts.

## Resolutions
- R1 protocol.ts: master's one-line doc comment and `PROTOCOL_VERSION = 42` (byte-equal to master); AF6's PlayerState
  fields (`t`, `gph`, `qs`, `hs`, `mo`, `mt`, `ax`, `az`), `MOTION_WIRE`, `motionWire`, `gaitWire` and the parser clamps
  kept (auto-merged). No name clash with master's fields. The train build sets the next number.
- R2 coopClient.ts imports: union (master's `BARK_CAM`, `BARK_TEXT` + AF6's `gaitWire`, `motionWire`, `CT`,
  `CLIENT_INTERP_DELAY`, `ClockSync`, `sendClock`).
- R3 coopHost.ts imports: union (AF6's `gaitWire`, `motionWire` + master's `BARK_CAM`, `BARK_TEXT`, `hitConfirmKind`);
  AF6's per-joiner `sendClocks` ClockSync and the `gw` gait fields intact.
- R4 settingsScreen.ts: AF5's comment + master's `this.lampFalloffRow(),`; the Mocap row and its reset dropped; the
  lamp falloff reset kept.
- R5 the 11 test files: master's side in every hunk; they are now identical to master (`git diff origin/master` empty).
- R6 `(39, afp AF6)` / `(39) ` labels -> `(afp AF6)` in src/net/{coopClient,coopHost,interp,protocol,remoteAvatar}.ts and
  tests/partnerAnim.test.ts; the grep for `(39)` / `(39,` / `protocol 39` prints nothing.
- R7 changes/feature-afp-af6.md: "A wire change (the train build sets PROTOCOL_VERSION): both players need this build.";
  docs/systems/coop.md PROTOCOL bullet: "Next wire train: afp AF6 (#247) ..." appended. Other fragments unchanged.
- Nothing beyond R1-R7.

## Acceptance
- Markers grep, `PROTOCOL_VERSION).toBe(<n>)` grep, hello `v: <n>` grep: all empty.
- `npx tsc --noEmit -p .`: 0 errors. eslint on the 4 src files + 12 test files: clean.
- Vitest (26 files, one run): 26 files passed, 354 tests passed, 1 skipped (43 s).

## Laptop (laptop-queue request on the pushed merge head)
e2e-coop, e2e-netmove (src/net), e2e-anim, e2e-clip, e2e-menus (AF5 row gone + lamp falloff row on one Gameplay page).

## Open
- None new. Changelog: no new entry (AF6's fragment reworded only).
