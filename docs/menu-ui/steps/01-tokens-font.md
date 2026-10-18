# Step 01 - tokens-font (Block A)
Bundles the menu font (MD1), sets the colour, type and spacing tokens (SPEC 2) and adds the menu accessibility settings
(MD17). No screen layouts change yet beyond font and colours. Deps: none. Model: implementer Opus 5.5; checker Opus 5.5.
Local only. Line numbers from feature/ct-locomotion 57c4fed: grep the named symbol first.

## Read
- SPEC.md sections 2 and 10; DECISIONS.md MD1, MD4, MD17.
- `src/styles.css` `:root` (~1-40), the "Silent But Deadly - menu theme" block (~2297), desktop scale (~3159).
- `src/core/settings.ts`: `Settings`, `access`, `sanitizeSettings`, defaults; `src/core/app.ts` (body classes).
- `src/ui/screens/settingsScreen.ts` Accessibility tab (rows only, the restyle is step 05).
- `CLAUDE.md` Hard rules; `docs/art-credits.md`; `package.json` version; `CHANGELOG.md` head.

## Task
1. Font (approved, MD1): take `BarlowCondensed-Medium.ttf`, `-SemiBold.ttf`, `-Bold.ttf` and `OFL.txt` from the
   official release in the google/fonts repository (`ofl/barlowcondensed/`, by Jeremy Tribby). Convert to Latin-subset
   woff2 with `pyftsubset` (pip `fonttools brotli`) into `src/ui/fonts/barlow-condensed-{500,600,700}.woff2`; if the
   tools are missing, commit the TTFs and log an A-number. Never fetched at runtime. `@font-face` in `src/styles.css`
   with Vite-resolved URLs, `font-display: block`. Fallback stack per SPEC 2.
2. Credit the font in `docs/art-credits.md` (name, author, licence, files).
3. CLAUDE.md hard rules: after the "No external art or audio" line add: "Exception: the menu font Barlow Condensed
   (SIL OFL), bundled in `src/ui/fonts/` (menu-ui MD1)."
4. Tokens: add every SPEC 2 colour token to `:root` (keep `--accent` as an alias of `--hl` until step 05 removes
   uses), the type scale as `--fs-*` custom properties multiplied by `--ts`, and the spacing values as `--sp-*`.
5. Replace the "Silent But Deadly - menu theme" block with a new "Menu UI (menu-ui)" block that only sets fonts and
   colours on existing classes (layout comes in 02-10). Remove dead rules it supersedes.
6. Settings: `access.menuText: 1 | 1.15 | 1.3` (default 1), `access.highContrast: boolean` (false),
   `access.reducedMotion: 'system' | 'on' | 'off'` ('system'). `sanitizeSettings` fills them. No SAVE_VERSION change.
7. App applies them: `--ts` on `:root`; `body.hc`; `body.rm` when on, or when 'system' and
   `matchMedia('(prefers-reduced-motion: reduce)')` matches (listen for changes).
8. Add the three rows to the Accessibility tab with the current widgets (copy and descriptions from SPEC 7.11).
9. Version: next minor after master's `package.json` at Step 0; CHANGELOG entry "Menu UI redesign" started.

## Tests
- `tests/settings.test.ts` (or the existing settings test): a literal old settings object without the new fields
  sanitises to the defaults; bad values fall back.
- e2e-desktop: computed `font-family` of a menu item starts with "Barlow Condensed" and `document.fonts.check` passes;
  no network request for a font (`page.on('request')` shows only same-origin).

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-desktop e2e-pad smoke`.
- Grep proofs: `grep -rn "fonts.googleapis\|@import url(http" src index.html` empty; `grep -rn localStorage src/core
  src/ui` shows no new hits.

## Commit
"menu-ui 01: bundled Barlow Condensed, menu tokens, text size / contrast / reduced motion settings"
Then LOG, STATE, CHANGELOG, TESTING (desktop: font renders; phone: font renders offline), docs/systems/ui.md.
