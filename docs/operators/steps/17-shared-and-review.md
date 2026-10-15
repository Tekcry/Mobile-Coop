# Step 17 - Shared sheets and the review page

Model: Sonnet 5.5, Medium effort. One session. Unattended (DECISIONS D15).

## Objective

The shared sheets and Michael's review page.

## Read (only these, plus the common files)

- BRIEF Stage 2.2 shared sheets; the `DESIGN.md` files of both operators.

## Do

1. Shared sheets into `docs/operators/mockups/shared/`: both operators side by side, each beside the current game
   operator (before / after), the 20 m darkness identity test, the colour-blind strip of the goggle glows.
2. The review page as a private claude.ai Artifact: one card per operator and per sheet, Approve / Reject / Note saved
   with the db capability, renders open full size; each operator's design notes and costs. URL into STATE.md.

## Out of scope

Changing the assets.

## Checks (all must pass before the commit)

- The step's own outputs exist and work as described; `npm run check` passes.
- `npm run check` passes.

## Finish

- LOG.md: what was built, numbers, open items. STATE.md: the next step (keep it short).
- Commit and push `feature/operators`.
- Start step 18 (final-spec) as RULES.md Chaining says.
