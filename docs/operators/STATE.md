# Operators run - state (resume point)

**Stage:** 1 done and answered (DECISIONS D7-D11). Next: Stage 2 (mockups).

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

**Next: Stage 2, in this order**
1. Apply the approved rule text from SPEC Section 7 (bible 5.14, 5.15, 5.16, Section 6, version 1.15; CLAUDE.md
   hard rule; story.md Section 4). Commit.
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
- Headless Blender works: `C:\Program Files\Blender Foundation\Blender 5.2lender.exe`, 5.2.2 LTS (Python 3.13).
- OptiX and CUDA see the RTX 4090 Laptop GPU. A cloth drape test simulated and rendered in Cycles on the GPU; the
  glTF exporter is present.
- Pin 5.2.2 LTS in the pipeline.
- The Blender MCP connector (live session, localhost:9876) only answers while Blender is open with the add-on's server
  started. The pipeline does not need it; it is for inspecting scenes live.

**Open items**
- None waiting on Michael.
