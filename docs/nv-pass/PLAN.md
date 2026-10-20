# Night vision pass - plan

Loop: `docs/systems/session-method.md` (Opus implementer, fresh Opus checker, at most 1 fix round per slice). Facts and
file references: `SURVEY.md`.

| Slice | Content | Checks |
| --- | --- | --- |
| 0 | GPU "before" shots: Marlow Yard (`shots-ctcourse.mjs`, a dark subset with NV on) and Warehouse section 1, epic and medium, plus `?gfx=min`; one labelled sheet | desktop lock gap, port 4189 |
| 1 | Realistic green phosphor (A1). Bodies: the characters' flat ambient-grid fill no longer goes x12 under NV (render path in `LampPlugin` only; sky-visibility or N.L weighting, or a capped NV lift for the fill term). Tube: lower `VISION_GAIN` / softer gamma so shadows read without crushed blacks or a flat murk; white clip later (about 0.85); greener tint; grain stronger in the dark than in the light (scintillation). Bloom: measured on the HDR scene (compress the input or a higher threshold), lower strength; the default pipeline bloom off while NV is on. `?gfx=min`: a small post-only lift so NV is not darker than off. Tests follow the new look (`nightVision`, `darkCurve`, `vision`), `visionIsolation` unchanged and passing | check, smoke, e2e-mouse, e2e-desktop, e2e-stealth-ai; GPU: e2e-darkness and the after sheet |
| 2 | The goggle outline: a wide aspect-aware frame showing most of the screen; thin rim; eyepiece falloff from about r 0.85 with a floor about 0.3 (not 0.06); the same frame for thermal and electro (one goggle) | check, smoke; GPU after sheet with slice 1 |
| 3 | Vision carousel in the selection wheel (after the orchestrator's go: CT Core holds `src/ui` until anim-rework S1 merges): on the vision slot, A (pad `interact` or `reload`, keyboard E) steps night -> thermal -> electro -> night; the stack shows the current one; release selects; `begin()` starts from the selected mode; the length pick goes; A must not reach the context menu while the wheel is open | check, e2e-pad, e2e-gadgets, e2e-mouse |
| End | CHANGELOG "Unreleased - nv-pass", TESTING.md lines, `docs/systems/lighting.md` and `graphics-quality.md` (stale NV numbers), perf budgets (render work); full `E2E_SUITE_TIMEOUT=900 npm run e2e` on the PR head; PR | full e2e |

Slices 1 and 2 may ship as one look PR if slice 3 waits long; slice 3 then goes in a second PR.
