# Operators run - state (resume point)

**Stage:** 2 in progress. RUNBOOK step 2 (rules and pipeline foundation) done 2026-10-15. Next: RUNBOOK step 3 (base
bodies and the first garment test, Opus 5.5). `RUNBOOK.md` holds every step's model and prompt.

**Step 2 done (2026-10-15)**
- Rule text applied (SPEC 7, D8): bible 1.15 (5.14 generated operators and per-operator size, 5.15 Confrontation
  note, 5.16, Section 6), the CLAUDE.md hard rule, story.md Section 4.
- `docs/art-credits.md` created (no external files yet; ANSUR II listed as reference data, not in the repo).
- ANSUR II check (Michael approved the CSV download; kept in the scratchpad, not the repo). SPEC 4.2-4.4 rewritten
  from the real means:
  - shoulder joint 3.5 cm high (A1, now 1.40); arm segments right, so A2 is withdrawn; hand 2 cm short (A3, 0.19);
  - body mass A4 revised (pelvis 0.35, waist 0.30 x 0.215, chest depth 0.24); new A5 head depth 0.20, A6 shoulder
    width 0.49, A7 thigh 0.39 (the rig's straight leg put the ankle 3 cm under its table height);
  - Wren chest 1.03 and hips 1.08 (survey female ratios); Wren is the 79th percentile of women, Moth the 63rd of men;
  - head light sample gap is about 9 cm, not 6 (SPEC 4.1 fixed).
  - A7 touches standing leg IK (`legLen * 0.97`): the locomotion run owns it at integration.
- `src/operators/operatorBody.ts`: per-operator corrected proportions, hit volumes and bind-pose joints (mirrors the
  rig's node offsets), pure, tested.
- `src/operators/kit.ts`: Wren and Moth kit lists as data with `validateKit`; both kits pass. Writing them as data
  added a few cable fixings (SPEC 5 intro).
- Pipeline skeleton `scripts/operators/` (README there): Node launcher pinned to Blender 5.2.2 (refuses others),
  joint export to `build/operators/joints.json`, fixed seed 1015, stage 0 `build_skeleton.py` (armature from the
  joints, round trip under 0.1 mm: measured 4e-8 m). `npm run operators:build` runs it; output in `build/`
  (git-ignored).
- `npm ci` run in the worktree (Michael approved). `npm run check` passes (lint 0 errors, 746 tests, build).

**Done**
- Worktree `C:\NightShift\Mobile-Coop-operators`, branch `feature/operators` from `origin/ct-movement` (DECISIONS S1).
- `docs/operators/`: BRIEF, RULES, STATE, DECISIONS (D1-D11, S1-S2), SPEC (Stage 1):
  - the detail standard;
  - the design language (D5);
  - the reference study;
  - anthropometry and per-operator heights;
  - kit lists;
  - the technique;
  - cost estimates;
  - the approved rule text;
  - risks.
- CLAUDE.md line for this branch.
- Michael's answers:
  - the Blender pipeline on a CC0 base body (D7);
  - the rule text approved (D8);
  - the phone follows bible 1.14 (D9);
  - per-operator heights, Wren about 1.68 m and Moth about 1.78 m. Skeleton, hit volumes and light samples follow the
    body; the capsule, speeds and traversal stay shared (D10, D11).

**Stage 2 work (split into RUNBOOK steps 2-7)**
1. Done (step 2): the approved rule text.
2. Check the tools: Blender (Michael installs it before the session; pin the installed version in the pipeline). Ask
   Michael before installing anything else; a KTX2 encoder can wait until the export step. Create
   `docs/art-credits.md`.
3. Verify the SPEC 4.2 anthropometry table against the ANSUR II report or CSVs (openlab.psu.edu/ansur2). Ask Michael
   before downloading.
4. Pipeline skeleton:
   - `scripts/operators/` (Python, Blender headless) and `npm run operators:build`;
   - the CC0 base body (MPFB / MakeHuman assets) shaped to each operator's proportions;
   - the kit data file with its pure Vitest validator (every strap two anchors, every pouch named contents, every
     cable a source, a device and retention points no more than 15 cm apart).
5. The Operator Lab (`npm run operators`, dev only, never in the production bundle). It reads the rig's pose data
   read-only.
6. `scripts/operator-sheet.mjs` (E2E_GPU=1, E2E_PORT=4191) and the contact sheets of BRIEF Stage 2.2.
7. Three concepts per operator, Splinter Cell inspired and original (D5). Renders go in `docs/operators/mockups/`.
8. The review Artifact with Approve / Reject / Note per card (db capability).
9. `npm run check`, commit, push, STOP.

**Tool check (2026-10-15).**
- Headless Blender works: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, 5.2.2 LTS (Python 3.13).
- OptiX and CUDA see the RTX 4090 Laptop GPU. A cloth drape test simulated and rendered in Cycles on the GPU; the
  glTF exporter is present.
- Pin 5.2.2 LTS in the pipeline.
- The Blender MCP connector (live session, localhost:9876) only answers while Blender is open with the add-on's server
  started. The pipeline does not need it; it is for inspecting scenes live.

**Open items**
- None waiting on Michael.
