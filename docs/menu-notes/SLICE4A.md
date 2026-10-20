# Menu notes - slice 4a (M1, M2)

Branch `feature/menu-notes`, 2026-10-19. Prototype effort. No e2e or GPU run here (the job lead runs them): every visual
result is "pending PC run".

## Michael's words
- M1: "Keep the main/first view as the close up of wrens goggles flicking on. Can you change it so it's full darkness
  until pressing the start button, which causes wrens goggles to flicker on in the darkness. Adjust darkness to suit so
  you can't see wren at all until pressing the button."
- M2: "Don't show any loading text, just fade in the press any button text when it's loaded." and "Night shift should be
  visible always, but prompt should fade in once loaded".

## M1: the dark title and the goggle strike
- **Done with the lights, not an overlay.** On the title the void's three spots go to intensity 0 (key, rim and the
  goggle's green spill), the goggle's emissive tint goes to 0 (so nothing blooms), the hemi is already 0, the clear
  colour is black, and the scene ambient is now black in the void (it only mattered on the stage). The lights stay
  enabled at 0, so the shaders the load gate compiled are the ones used (no new compile at the press). The rig's own
  lens parts (`setLensGlow`) are disabled under the operator figure, so they draw nothing. The menu post stack has no
  grain or lift (tone mapping and contrast keep 0 at 0). So the stage should render true black: no overlay needed.
- **The director owns it** (`src/world/menuShots.ts`, pure): a title phase `none` / `dark` / `ignite` / `done`, with
  `lit` (the lights' level) and `glow` (the goggle level, -1 = the shot decides).
  - The first time the title context is entered it goes `dark`: T1 waits on its first frame, lit 0, glow 0.
  - The press pops the title, so the screen context turns `main`; the director then strikes the goggle on T1 first
    (`ignite`) and holds the main menu's opening until the lights are up:
    - 0-2.4 s: the authored flicker (`goggleLevel`: two blips, a stutter, a warm-up), lights off;
    - 2.4-3.0 s: the goggle alone;
    - 3.0-4.8 s: the key and rims ease up; T1's push runs on under all of it;
    - then T2 opens the main menu as before (the camera eases across from T1, no cut).
    `IGNITE` / `IGNITE_S`, `igniteGlow`, `igniteLit`.
  - The main menu UI shows at once on the press (navigation never waits); the stage strikes behind it, Wren right of
    centre, the list over black.
  - Any other screen during the strike (the loadout) ends it at once. Reduced motion: dark until the press, then the
    lights straight up (no flicker).
- **Launch only.** The title shows once per launch (`titleShown`), so after a match, under automation without
  `?title=1` and with `?autostart` the director never enters the title: phase `none`, lit from the first frame, as
  before.
- **The same press as the music.** The title press is the same input that unlocks audio (slice 1). Where the browser
  allows autoplay the theme is already playing on the dark title (note 1); otherwise it starts on that press, with the
  flicker. No change to the audio code.
- **Load screen presses still cannot skip the title** (slice 2 `arm()`): the strike starts only when the title pops.
  New for M2: the boot sits under the screens now, so a click could reach the title; `TitleScreen.continue()` is
  ignored until `arm()`.
- `src/world/menuScene.ts`: `cinematicFrame` takes `glow` and `lit` from the director and sets the three spots each
  frame (base x lit, the glow light x glow). Debug hooks:
  - `titleLight`: `{ phase, igniteT, lit, glow, spots (sum of intensities), hemi, ambient, clear, goggle (level set on
    the figure, -1 before a body), lens (the figure's lens tint now, rgb sum) }`. On the dark title all are 0 / 'dark'.
  - `debugPause`: stops the director's clock (the GPU script freezes moments of the strike for stills).

## M2: the wordmark-only boot, the prompt fading in
- **One wordmark from the first paint.** `index.html`'s boot now has a `.boot-frame` (the menu frame's geometry, as
  `:root .screens`) holding NIGHT / SHIFT with the title's own classes and place (left 150, top 300, the same sizes and
  colours). A tiny inline script sets `--ui-scale` before the bundle runs (the `uiScale` formula; App sets it again), so
  the wordmark does not move when the app starts.
- **Launch path** (`#boot.launch`, while the title will follow): black plus the wordmark only. The status line, the
  progress line and the old ghost wordmark are hidden (the status text is still written, so the scripts and the crash
  path can read it).
- **When the title is pushed** (goToMenu, still behind the gate) the boot drops under the screens (`under`, z-index 19:
  above the stage, below the screens), so the title's own wordmark shows in exactly the boot's place: no jump, no
  cross-fade. The title screen has no slide-in animation any more, and it starts with `ts-wait`: the prompt, the
  version and the slash are at `filter: opacity(0)`.
- **When the gate opens** (ready, stall, cap or error: the same reveal as slice 2) `arm()` removes `ts-wait`: the
  prompt (with the version and the slash) fades in over 0.9 s. The boot fades out underneath it (black over the black
  stage: unseen). The gate itself is unchanged.
- **Other boots keep today's screen.** 800 ms after the reveal, a match load (`startGame`), a boot failure, a menu
  without the title (after a match, automation, `?autostart`) remove `launch` / `under`: the match's "Loading map…" and
  the menu-after-match "Loading Wren…" screens show the ghost, the progress line and the status as before (SPEC 7.1
  path untouched). A boot failure shows its "Failed to start" text.

## Files
- `src/world/menuShots.ts`: title phase, `IGNITE`, `igniteGlow`, `igniteLit`.
- `src/world/menuScene.ts`: lights / glow from the director, void ambient black, `titleLight`, `debugPause`.
- `src/ui/screens/titleScreen.ts`: `ts-wait`, `continue()` ignored until `arm()`.
- `src/main.ts`: `endLaunchBoot()`, the boot `under` at the title push, reset after the reveal / on a match load / on
  failure / when no title.
- `src/styles.css`: `.boot-frame` / `.boot-mark`, the launch boot rules, the title's `ts-wait` fade, no slide-in.
- `index.html`: the boot wordmark, `class="boot launch"`, the early `--ui-scale`.
- `tests/menuShots.test.ts`: the title test updated (dark, t 0) and 6 new tests (dark until the press; the flicker has
  at least 3 strikes with the lights off; the lights rise; T2 after; no title = lit; reduced motion; another screen ends
  it; the pure levels).
- `scripts/e2e-menus.mjs`: one separate block with `?title=1` (the prompt faded in; the light read-back dark; Space
  dismisses the title and strikes; then lit and T2). #18's condition wait untouched.
- `scripts/menu-boot-shots.mjs`: the launch boot checks and stills (below); the old per-status-line shots are gone (the
  status is hidden on this path; the lines are still logged with times).
- `scripts/menu-shots6.mjs`: `T1-dark` is the title (`?title=1`, now black); `T1` is the lit shot held over the main
  menu (`menuShot=T1`, no title).
- `tests/__snapshots__/visionIsolation.test.ts.snap` shows as modified (line endings only, as before): not mine.

## Results
- `npx vitest run tests/menuShots.test.ts tests/menuGate.test.ts tests/menuPoses.test.ts`: 34 passed.
- `npm run check` (after M2): pass. Lint 0 errors / 41 warnings (the existing script `no-console`), 157 files, 1765
  passed / 1 skipped, build ok.
- Not run here: e2e (logic) and GPU.

## Logic e2e for the job lead
`smoke e2e-menus e2e-score e2e-offline e2e-mouse e2e-pad e2e-desktop e2e-progression e2e-feedback`
(e2e-menus has the new `?title=1` block; the others boot without a title, so the launch boot reverts to the status
screen for them; smoke and e2e-offline read `#boot-status` text, still written).

## GPU command (desktop, `C:/NightShift/heavy.lock` held, port 4189 free)
```
cd /c/NightShift/Mobile-Coop-menu-notes
npm run build
node node_modules/vite/bin/vite.js preview --port 4189 --strictPort --host 127.0.0.1 &
E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high node scripts/menu-boot-shots.mjs docs/menu-notes/shots
```
It saves to `docs/menu-notes/shots/`:
- `s4-boot.png`: the boot, wordmark only; `s4-boot-title-up.png`: the title's wordmark over the boot's (logs the
  offset, must be <= 1 px, and the prompt hidden);
- `s4-reveal.png`, `s4-prompt.png`: the prompt faded in;
- `s4-title-dark.png` and `s4-title-dark-stage.png` (UI hidden): the stage's brightest channel must be <= 3 / 255;
- `s4-press.png` (just after the press), `s4-flicker-1..4.png`, `s4-flicker-done.png` (2.8 s: goggle on, lights off),
  `s4-lights-rising.png` (3.9 s), each frozen with `debugPause`, logging the goggle and light levels;
- `s4-menu-first.png`: the first main-menu frame (T2, lights up); plus the slice 2 checks (`s2-closeup-H1.png`).
It logs the audio state before and after the press, and exits 1 on any failed check. Then stop the preview, free 4189,
release the lock. Optional: `E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high node scripts/menu-shots6.mjs docs/menu-notes/shots T1-dark,T1,T2`.
The same script runs on software GL (`SHOT_GFX=min`, no `E2E_GPU`) for the logic parts (wordmark offset, prompt,
light read-back); its pixels mean nothing there.

## What Michael should try
1. Cold launch: a black screen with NIGHT / SHIFT only, no loading text or bar. The wordmark never moves.
2. When the game is ready, only "Press (any) to start" fades in under it (with the version). Wren is not visible at
   all: no outline, no glint, no goggle glow.
3. Press: the menu list appears, and in the dark right of it the goggle flickers on (a couple of blips, a stutter, a
   warm-up), holds a moment, then the light comes up on her face and the menu's shots carry on. The music is there by
   then (on the title already if the browser allowed it, else from that press).
4. Keys or clicks during the black boot do not skip the title.
5. Play a match and quit to the menu: no dark title, no flicker; the usual loading screen with its status shows.

## Open / polish
- The press shows the main menu list at once while the goggle strikes; if Michael wants the list to wait for the lights,
  hold the main menu's reveal for `IGNITE_S` (one line in `main.ts`).
- The dark title's black is proven by the light read-back here; the pixel check is the GPU run.
- The very first paint before the menu font loads could draw the wordmark in a fallback font (`font-display: block`
  makes it invisible instead, briefly).
