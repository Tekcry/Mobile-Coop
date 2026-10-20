# Campaign spec - state

**Now:** PARKED 2026-10-21 ~07:35, not reviewed (Michael via the orchestrator: spare capacity goes to a Marlow Yard
variety pass instead). The Opus writer was still researching when parked: SPEC.md, BLOCKS.md and QUESTIONS.md were not
started. No checker, no PR. Its research is kept below so a restart does not repeat it.
**Next (on restart):** one Opus writer from BRIEF (deliverables there) using the notes below; fresh Opus checker; at most
one fix round; docs PR to master; message the orchestrator; stop.
**Open:** -

## Research notes (writer, 2026-10-21; checked against docs and code, not reviewed)
- **Co-op moves in code** (`src/game/teamController.ts`, `TEAM` in `src/config/movement.ts`; built for Marlow Yard):
  leg-up and ledge relay (co-op lips 4.3-4.5 m; solo wall-jump reach 3.8 m), partner throw (lands 3.2 m past the
  thrower), hang-down (head 1.0-2.5 m under the edge), two-person rope (2.2-6.0 m drop), held jammer on cameras, lasers
  and lights (20 s charge), paired scanners (2 s hack, 1.5 s window), revive, wall medkits, both-players exit.
- **Devices in code:** cameras (fixed or sweeping), lasers, light switches by circuit, alarm panels, hide spots, doors
  locked or bolted from one side, questioning a guard for information.
- **Needs engine work** (story.md asks, code lacks): keycards and readers; iris scanner and mantrap; a captive at a
  scanner ("living key"); motion-sensor lights; a civilian duty engineer; generator noise masking the players; campaign
  missions with the training level's gate types (Infiltration has only download / plant / intel / sabotage / rescue /
  extract); section loading for the campaign (only Sector Ops has it).
- **Guard cap:** the story wants 16 guards; `docs/level-design.md` caps 9 spawned (12 awake), so 16 needs section
  loading, else 9 or fewer. No heavies or dogs (G155; CT co-op had none).
- **Rule clash for Michael:** level-design section 11 ("solo first": every co-op surface also reachable solo) conflicts
  with G2 (cannot be completed solo). Decisions outrank the standard, but ask Michael (QUESTIONS.md).
- **Reusable from `docs/kestrel/02-building-brief.md`:** the site (goods yard under the viaduct, Cooper's Lane, Sexton's
  depot roof), the 6 m grid and storey heights, a 48 x 30 m building with a staff strip and a tall hall block, the
  generator wing, the carrier vault and tunnel up to the meet-me room.
- **Draft layout (unwritten):** five sections: the yard (leg-up over a 4.4 m goods-yard wall); the ground floor; the
  first floor (security room, records); the secure zone (paired scanners at the mantrap, or the carrier tunnel); the
  meet-me room tap; then the exit across the yard during the generator test.

## Done
- 2026-10-21: branch `feature/campaign-spec` from master d537cbd8; BRIEF (A1); parked with research notes.

## Resume prompt
```
Night Shift | Sector Ops Build. You are the job lead for campaign-spec (the first campaign level's map spec, docs only).
Work only in C:\NightShift\Mobile-Coop-campaign-spec on feature/campaign-spec (git pull --ff-only first). Read CLAUDE.md
"Sessions", docs/campaign-spec/STATE.md (research notes included) and BRIEF.md. Carry on from STATE "Next": one Opus
writer, one fresh Opus checker, at most one fix round. No code, no heavy work. Done: docs PR to master, message the
orchestrator, stop. Lean tokens.
```
