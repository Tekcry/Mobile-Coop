# Operators run - state (resume point)

**Stage:** 1 done (research and the technique decision). Waiting for Michael's answers to Q1-Q4 (DECISIONS.md).

**Done**
- Worktree `C:\NightShift\Mobile-Coop-operators`, branch `feature/operators` from `origin/ct-movement` (DECISIONS S1).
- `docs/operators/`: BRIEF, RULES, STATE, DECISIONS (D1-D6, S1-S2, Q1-Q4), SPEC (Stage 1 draft):
  - the detail standard;
  - the design language (D5);
  - the reference study;
  - the anthropometry check and proposed skeleton corrections A1-A4;
  - kit lists for Wren and Moth;
  - the technique comparison and recommendation;
  - cost estimates;
  - draft rule text;
  - risks.
- CLAUDE.md line for this branch.

**Next (Stage 2, after the answers)**
1. Apply the approved rule changes (bible 5.14, 5.16, Section 6, version 1.15; CLAUDE.md).
2. Install the pipeline tools on the PC: Blender (pinned LTS) and a KTX2 encoder. Create `docs/art-credits.md` with the
   CC0 base body and any textures.
3. Pipeline skeleton: `scripts/operators/` (Python, headless Blender), `npm run operators:build`, the kit data file
   and its Vitest validator.
4. The Operator Lab (`npm run operators`, dev only).
5. `scripts/operator-sheet.mjs`.
6. Three concepts per operator, contact sheets, the review Artifact with the db capability.
7. `npm run check`, commit, push, STOP.

**Open items**
- Verify the anthropometry table (SPEC 4.2) against the ANSUR II report tables (needs a PDF text tool or the CSVs).
