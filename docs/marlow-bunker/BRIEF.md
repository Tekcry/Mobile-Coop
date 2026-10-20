# marlow-bunker - brief

Job lead: a session started by the orchestrator (2026-10-20, desktop folder `C:/NightShift/Mobile-Coop-marlow-bunker`,
branch `feature/marlow-bunker`, cut from master b125599e, 4.19.1). One PR to master.

## The ask
Michael (2026-10-20, to the orchestrator, verbatim): "it seems to have no ceiling, and lights need to be on ceiling also.
I would like to audit the design and make it more accurate to being an underground training bunker that isn't just
square/rectangle rooms, it needs to be high tech and have variety. Only review and make suggestions that are cheap for
prototype and fast." Then: "Make the mallow yard review comprehensive."

The orchestrator's review (`docs/reviews/marlow-yard-audit.md` on `feature/menu`) is the plan. Michael approved its FULL
ranked shortlist (2026-10-20):
1. Per-bay ceilings (low cells 4.5, S4 5.5, high halls 7.5), FENCE 6 -> 7.5, underground theme (no moon, dark sky, fog).
2. Fittings for all 29 lamps (pendants on 0.04 m rods at today's positions in the high halls, flush strips elsewhere,
   compensated), cool white.
3. Airlock lids with haunches, caged bulkhead lamps, door frames.
4. Ceiling ribs, LED strips, panel seams, cell colour bands.
5. Obstacle walls to the ceiling at S3, S6, S8 and the S4 header (>= 4.6).
6. Readability paint (S2 band, S6 pair line, S3 sweep lines, S4 emitters, S5 hatch cover, S7 anchor).
7. Entry lift lobby and exit goods lift.
8. The bunker fiction in the spec and "fence" -> "wall" in the texts.

## Michael's answers
- M1 (2026-10-20): the floor light: keep the open floor at 0.30 after the moon goes (raise the fill so the light meter
  values the course was tuned on hold; prove it with the light tests).
- M2 (2026-10-20): approve the full shortlist (above).

## Limits (from the orchestrator)
Every traversal stays as it is (ledges, hatch, S5 front-lip drop, S7 stair, S4 throw headroom, the S2 / S5 / S7 leg-up
squares); dressing is collide=false or noLedge (no new climbs); yellow, green and blue-grey stay reserved for the floor
marks; light parity holds (bake, meter, guard perception); element register rows for new lamps and objects; Babylon
only through `src/core/babylon.ts`; no new art assets; prototype quality, one self-review. Tests: `npm run check`,
the ctcourse unit tests, e2e-ctcourse, e2e-lightbake, smoke (`E2E_JOBS=2`); GPU look pending a PC run. CHANGELOG under
"Unreleased - marlow-bunker"; no `package.json` bump.

## Assumed decisions (each with how to undo)
- A1 Door frames are steel with a pale status lamp, not yellow-black: the audit's own wayfinding rule keeps yellow for
  the floor marks. Undo: `doorFrame` colours in `src/world/maps/ctcourseBunker.ts`.
- A2 The S2 wall band is yellow (it carries the leg-up square's mark up the wall: the same element) and the same band is
  on S5 and S7, which have the same leg-up square (2.5, one element behaves the same everywhere). Undo: the `wallPaintZ`
  loop in `ctcourse.ts` (`[1, 4, 6]` -> `[1]`).
- A3 Lamp compensation by measurement, not the audit's first numbers (strip and panel fittings bake as area lights):
  `docs/marlow-bunker/LIGHT.md`. Undo: the constants after `ANNEX_LAMP_Y` in `ctcourse.ts`.
- A4 Only the eight shortlist items are built; the audit's other station extras (S1 sentry desk, S3 monitor wall, plant
  rooms, instructor booths, S6 pilasters and racks, S8 coffer, S5 plywood faces and window outlines, the S4 release
  frame, S7 block colours) are on the polish list (STATE.md).
- A5 `theme.ambient` 0.25 -> 0.3 (the render hemisphere matches the 0.30 gameplay fill now that the moon is 0). Undo: the
  theme in `ctcourse.ts`.
- A6 The guard's second line: "And one on the north side, before the last wall. That is all I know." (was "north
  fence"; the unit test wants "last wall"). Undo: `GUARD_INFO` in `ctcourse.ts`.
