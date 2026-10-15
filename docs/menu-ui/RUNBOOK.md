# Menu redesign - runbook (plain English)

What to paste, which model, and when to clear. Written 2026-10-15 for Michael.

## Model
- Opus 5.5 for every session below (design taste, long specs, code-built UI and animation). The locomotion run
  found Sonnet implementers too weak for this codebase (decision M1) and moved everything to Opus.
- Sonnet 5.5 is fine only for mechanical side jobs: re-rendering screenshots, moving files, simple doc edits.

## Clearing: the rule of thumb
- Clear between steps, never in the middle of one. A step is finished when its docs are committed and pushed.
- Stay in one session for the back-and-forth inside a step (questions, mockup tweaks). Re-reading the spec, the
  prototype and the code after every clear costs more than keeping them in context.
- Clear early when a session is full of images (renders, screenshots): images are the most expensive part of a
  long session, because every turn re-sends them.
- Clear when the app says the conversation was compacted or summarised more than once; quality drops after that.
- Before clearing, ask "is everything recorded in git?". The session should answer yes and give the commit.

## The sessions

### Now: clear this session
Everything from the 2026-10-15 mockup session is in git (`feature/menu-ui-spec`, docs/menu-ui/). It is image-heavy,
so clear it.

### Step 1 - design spec and working prototype (interactive)
- Model: Opus 5.5. New session in `C:\NightShift\Mobile-Coop`.
- Paste: everything below the line in [STEP1-PROMPT.md](STEP1-PROMPT.md) (or the card "Menu redesign step 1").
- What happens: it reads the docs and the current UI code, asks you its open questions as multiple choice (font,
  screen names, title screen, pad text entry), then builds the spec and a prototype you can drive with keyboard,
  mouse and your controller.
- Your part: answer the questions; try the prototype on both devices; ask for changes in the same session.
- Clear: when you are happy with the prototype and it says SPEC.md and the session 2-4 briefs are pushed.

### Locomotion run (separate, already running on the other machine)
When it stops for your play check, include the "Animation problems seen" list from [FINDINGS.md](FINDINGS.md) in
your notes after "Locomotion: go". Nothing else here needs it.

### Steps 2-4 - implementation (unattended, the locomotion way)
- Start only after the feature/ct-locomotion PR is merged to master.
- Step 1 writes their brief and step files (`docs/menu-ui/BRIEF.md`, `PLAN.md`, `steps/`). The prompt to paste will
  be one line, like the locomotion run's: "Menu UI run: START" (first time) and "Menu UI run: RESUME" (after any
  clear or crash). Step 1's report gives the exact lines; they will also be in README.md.
- Model: Opus 5.5 for the run and its subagents.
- The run pauses for you at fixed points (after the core screens, after the pause blur, after the cinematic
  background). Clear at each pause, then paste the RESUME line plus your notes.
