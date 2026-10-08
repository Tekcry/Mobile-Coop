# Handover - pause the map, start the Chaos Theory campaign build

For the Claude Code session (Sonnet 5.5) that is building Kestrel Exchange on `feature/exchange-map` and also works on `ct-movement`. Written 2026-10-08 by Opus 5.5 with Michael.

**Start here.** Read this file in full, then follow "What to do".

---

## In one paragraph

- You finished Exchange map Phase 2 (`87fc0a7`) and are waiting for Michael's approval. **That approval is deferred:**
  - the map is paused before Phase 3;
  - no map code is built until roadmap Phase 3 is done;
  - the design must first pass an alignment check against the new design bible.
- **Your next job is roadmap Phase 0 on `ct-movement`:**
  1. integrate your map branch and `master` (3.4.0) into `ct-movement`;
  2. install the design bible;
  3. cut `CLAUDE.md` down to a lean core;
  4. hide parked modes behind `?legacy=1`.

---

## Who and what

- **Michael** owns the project and approves each phase. He tests on an iPhone 17 Pro Max and on desktop through GitHub Pages. He merges into `dev` and `master` himself.
- **Silent But Deadly** is a third-person stealth game: TypeScript, Vite, Babylon.js 9, Havok, PWA, repo `Tekcry/Mobile-Coop`.
- **The direction changes** from a Splinter Cell: Blacklist style to an original game in the spirit of Splinter Cell: Chaos Theory.
- **`docs/design-bible.md`** (in this bundle) is now the authority on every design question. It outranks the map spec and the level design standard where they conflict (bible Section 0).

---

## Decisions Michael has made

These are fixed. Do not reopen them.

1. **Pure Chaos Theory.**
   - Back-to-wall replaces snap cover and cover-to-cover.
   - Mark & Execute is removed.
   - Sonar is replaced by thermal and electro vision.
   - Removals happen in roadmap Phase 3, not now.
2. **Co-op.** The campaign is fully playable solo and in 2-4 player co-op, on the same missions.
3. **Parked, not deleted.** Wave, Hunter, the old Mission mode, PvP, credits, unlocks, suit, HQ and cosmetics are hidden behind `?legacy=1` in Phase 0.
   - Michael wants Wave and Hunter back after the vertical slice.
4. **Story** is text radio and subtitles only. No voice.
5. **Target devices.**
   - iPhone 17 Pro Max at 60 fps sustained when warm.
   - Desktop to the existing budgets.
   - Gameplay never reads graphics settings.
6. **Vertical slice.** One mission first: Kestrel Exchange, "Dead Line".
7. **Light and shadow is the heart of the game.** Roadmap Phase 1 makes the screen, the light meter and guard perception agree on every device.
8. **Models.** Opus writes specs and reviews. Sonnet implements specs.
9. **Branch flow** is one way only: `ct-movement`, then `dev`, then `master`. Claude never merges into `dev` or `master`.

---

## Why the map is paused

The Exchange design is good, but parts of it rest on things that are about to change:

- **Spaces 5-7** teach cover-to-cover. Space 7's loud route uses Mark & Execute. Both are removed in roadmap Phase 3.
- **Engine facts in its Section 9 will change:**
  - darkness hiding the player beyond 1.8 m (roadmap Phase 1, light parity)
  - footstep distances and silent gears (roadmap Phase 2, sound masking)
- **The bible adds per-space plans** that the design does not have yet: a light plan, a sound plan, a 2-4 player co-op plan, and mission data for the new framework.

`docs/prompts/exchange-alignment.md` (in this bundle) is the spec for the pass that fixes all of this (map Phase 2b). It runs only when Michael says so, after roadmap Phase 3.

---

## State on 2026-10-08

| Branch | Head | Notes |
| --- | --- | --- |
| `master`, `dev` | `df87240`, `c6ea547` | Synced at 3.4.0: light phone renderer, baked lamps on desktop, Phone check. |
| `ct-movement` | `ba21dc9` | CT movement and the OLD Exchange blockout. 26 commits behind `dev`. |
| `feature/exchange-map` | `87fc0a7` | Your map work: old blockout removed, level design standard, map spec template, map phases 0-2 documents and plans, split jump fix `8a364c4`. 6 commits on top of `ct-movement`. |

---

## Bundle contents

| Bundle path | Repo path | What it is |
| --- | --- | --- |
| `HANDOVER.md` | `docs/prompts/phase-0-handover.md` | This file |
| `docs/design-bible.md` | `docs/design-bible.md` | Vision, pillars, systems, out-of-scope list, process, roadmap (v1.1) |
| `docs/prompts/phase-0-foundation.md` | `docs/prompts/phase-0-foundation.md` | The Phase 0 spec you run next |
| `docs/prompts/exchange-alignment.md` | `docs/prompts/exchange-alignment.md` | Map Phase 2b spec (waits for Michael) |

---

## What to do

### Step 0a - Park the map on its branch

1. On `feature/exchange-map`: make sure the working tree is clean and everything is committed and pushed. If anything from Phase 2 is uncommitted, commit it as part of this step.
2. Add a short "Paused" entry at the top of `docs/prompts/exchange-map-progress.md`. It says:
   - Phase 2 is done and awaiting Michael's approval, now deferred;
   - the map is paused for roadmap Phases 0-3;
   - the next map step is `docs/prompts/exchange-alignment.md` (Phase 2b), then Phase 3.
3. Carry over any open items not already in the log:
   - the Space 8 secret route question
   - the sloped battery-room duct clip risk
4. Commit: `Exchange: paused for roadmap Phases 0-3 (design bible)`. Push `feature/exchange-map`.

### Step 0b - Install the bundle on `ct-movement`

1. Run `git fetch --all --prune`, `git checkout ct-movement`, `git pull`.
2. Copy the four files to their repo paths (table above).
3. Commit: `docs: design bible, Phase 0 spec, handover, Exchange alignment spec`. Push.

### Step 1 onwards

1. Open `docs/prompts/phase-0-foundation.md` and run Step 1 (1a-1f).
   - Step 1b merges `feature/exchange-map`, including the pause commit, into `ct-movement`.
2. STOP after Step 1 and report. Michael will test `/ct/` and merge `ct-movement` into `dev` and `master`.
3. When Michael says "continue with Step 2", run Steps 2-5, then STOP with the final report.

### After Phase 0

- `feature/exchange-map` stays as it is until the map resumes.
- When Michael says "start the Exchange alignment pass", follow `docs/prompts/exchange-alignment.md`. It begins by merging `ct-movement` into the map branch.

---

## Working style Michael expects

- **Reports:** short, plain language, hyphens not em dashes. Lead with the result.
- **Questions:** ask only when blocked. Otherwise choose the option closest to existing patterns and log it as a Decision.
- **Reading:** read only what the spec lists. `CLAUDE.md` is large until Phase 0 Step 3 shrinks it, so read it in sections.
- **Map context:** drop the map's detail from your working context for Phase 0. It is all in the map documents for later.
- **Never:**
  - merge into `dev` or `master`
  - start map Phase 3
  - change gameplay in Phase 0
  - delete save data
