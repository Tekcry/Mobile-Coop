# Step 11c - fix list, round 1 (checker, read-only review of a804c48 + 0de3293)

The merge itself is sound: every conflict resolution follows master (G1-G122) and keeps the operators work; the code
tree (src, scripts, tests) equals master's except the operators files and the KTX2 block in src/core/babylon.ts;
none of master's 57 deleted files came back; no operators file was dropped. The fixes are config and record items.

1. **GPU port defaults still 4191 (G94).** Master CLAUDE.md port table: 4191 is software-GL e2e only, "never with
   `E2E_GPU=1`"; GPU work uses 4189. 0de3293 moved the preamble, RULES.md and OWNER-NOTES.md to 4189, but:
   - `scripts/operator-sheet.mjs:26` `const PORT = Number(process.env.E2E_PORT ?? 4191);` and its header comment at
     line 3 ("E2E_GPU=1 ... E2E_PORT=4191");
   - `vite.operators.config.ts:10` `const port = Number(process.env.E2E_PORT ?? 4191);`
   - `scripts/operators/README.md:99` (serves at `127.0.0.1:4191`) and `:101` ("run with `E2E_GPU=1 E2E_PORT=4191`");
   - committed `docs/operators/STATE.md:10` still says "the preamble's GPU Lab / sheets on 4191 conflict with that"
     (stale since 0de3293).
   Done: both defaults are 4189, the comment and README say `E2E_GPU=1 E2E_PORT=4189`, STATE.md drops the stale
   conflict sentence (if the 11d rewrite has not already). Old LOG / RUNBOOK / BRIEF mentions stay as history.

2. **LOG "Step 11c" Checks: citation is ambiguous.** `docs/archive/consolidation/PR-BODY.md:48` lists only e2e-kestrel
   ("camera rays along the tour") and e2e-camera-bounds (level U). e2e-editor is listed as a Kestrel-owned
   pre-existing failure only in `docs/archive/consolidation/AGENT-PREAMBLE.md:42`; the LOG's bare "AGENT-PREAMBLE.md 42" reads
   as the operators preamble. Also the characterRig line says "+590 / -249"; `git diff --shortstat a804c48^1
   a804c48^2 -- src/player/characterRig.ts` gives +448 / -142.
   Done: the LOG cites `docs/archive/consolidation/PR-BODY.md` 48 (kestrel, camera-bounds) and
   `docs/archive/consolidation/AGENT-PREAMBLE.md` 42 (editor, kestrel, camera-bounds) and gives +448 / -142.

3. **LOG "depends on deleted systems" list is incomplete.** Missing from it:
   - Item 1 / 2 files: `tests/operatorLab.test.ts:196,211,215,218` (close-up expectations that include `medPouch`);
     `src/operators/lab/labData.ts:326` close-up label "Belt, back: rappel ring and drone pod";
     `scripts/operators/export-gltf.mjs:27` header ("pod and medkit").
   - Item 3 (sling socket): the socket is also wired into `src/operators/lodChecks.ts:7,11` (LOD_ANCHORS),
     `src/operators/rigidKit.ts:51,169,486-490` (LOD2 keep list, pelvis rule, `slingClockCheck`),
     `scripts/operators/check.mjs:49-51` and `scripts/operators/py/bake_lods.py:135,760-768`. State the dependency
     accurately: master keeps a `sling` carry slot (`src/weapons/carrySlots.ts:11`, fallback for any gun when its
     natural slot is taken), so the socket loses its SMG purpose but not its slot.
   Done: these lines are added to items 1-3 of the list in LOG.md; nothing in the asset or code changes.

Notes (not fails)
- `scripts/operators/py/__pycache__/common.cpython-313.pyc` is tracked although `.gitignore` now has `__pycache__/`
  (pre-existing on the operators side). A `git rm --cached` at the next commit would tidy it.
- Verified: known-flaky e2e-netmove, e2e-coop, e2e-pad are in `scripts/run-e2e.mjs:37` KNOWN_FLAKY and
  `docs/backlog.md`; the 4 resolved-to-master files (TESTING.md, performance.md, story.md, perf.mjs) are byte-equal to
  master; package-lock.json was untouched by master since the merge base; `@babylonjs/ktx2decoder` (D27), the seven
  `operators*` scripts, the eslint ignores, the CLAUDE.md art exception and the `docs/operators/` doc-index row are in.
