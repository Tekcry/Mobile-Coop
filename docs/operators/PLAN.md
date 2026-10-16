# Operators run - plan

Goal (Michael, D15): completed Wren and Moth as described in ART-DIRECTION.md and SPEC, built unattended in small
focused steps, reviewed by Michael at the end.

Re-planned 2026-10-16 for D22-D24: Wren is the A2 stealth operative (`docs/operators/concepts/A2/`, ART-DIRECTION
Section 9). Steps 05-07 stand (their base-layer, glove, boot and head generators are reused); step 08 is superseded
(committed OPEN, never retried); 08a, 08b, 09 (rewritten) and 09b replace it and the old step 09.

Order and why:
1. 03b fixes the shirt and adds the automatic checks every later step uses.
2. 04 builds the Lab and the sheet script, so every later step renders the same views.
3. 05-07 built Wren's base layer, trousers, gloves, boots and head. Then, for the stealth operative: 08a the one-piece
   suit (it replaces the base layer, shirt and trousers; gloves, boots and head items are rebuilt over it), 08b the
   composite plates and harness with the reusable magnetic buckle, 09 the storage, holster and cables (and step 07's
   earpiece cable fix), 09b the approach boots (the suit's cuff sits inside the boot, so only the items after the boots
   rebuild, A38). Then 10 bakes, LODs and exports; 11 the full render set and self-review.
4. 12-16 Moth. **Step 12 starts by asking Michael Moth's direction (D24: "Decide at step 12")**: the orchestrator
   stops before the implementer, asks with the native multiple-choice UI, records the answer, and has a replan
   subagent update steps 12-16 if the answer changes them. Steps 12-18 are otherwise unchanged.
5. 17 shared sheets and the review page; 18 the final spec and the integration plan (it also carries the A36, A39-A41
   weapon-anchor items for locomotion step 25). The run ends; Michael reviews.

Each step file has: objective, the only files to read, what to do, what is out of scope, pass/fail checks, finish.

| Step | What | Model | Effort |
| --- | --- | --- | --- |
| 03b | Wren combat shirt fit, and the automatic checks | Opus 5.5 | High |
| 04 | Operator Lab and the contact sheet script | Sonnet 5.5 | Medium |
| 05 | Wren: base layer and trousers | Opus 5.5 | High |
| 06 | Wren: gloves and boots | Opus 5.5 | High |
| 07 | Wren: hood, optic, mount and comms head kit | Opus 5.5 | High |
| 08 | Wren: plate carrier, harness and belt (superseded by D22-D24; history) | - | - |
| 08a | Wren: stealth suit (`steps/08a-wren-stealth-suit.md`) | Opus 5.5 | High |
| 08b | Wren: composite armour and harness (`steps/08b-wren-armour-harness.md`) | Opus 5.5 | High |
| 09 | Wren: storage, holster and cables (`steps/09-wren-holster-pack-comms.md`) | Opus 5.5 | High |
| 09b | Wren: approach boots (`steps/09b-wren-approach-boots.md`) | Opus 5.5 | High |
| 10 | Wren: baked maps, LODs, glTF and costs | Opus 5.5 | High |
| 11 | Wren: full render set and self-review pass | Opus 5.5 | High |
| 12 | Moth: shirt with rolled sleeves, base layer, trousers (ask Michael Moth's direction first, D24) | Opus 5.5 | High |
| 13 | Moth: gloves, boots, hood and round optic | Opus 5.5 | High |
| 14 | Moth: climbing harness, chest rig, hardware, pack, comms | Opus 5.5 | High |
| 15 | Moth: baked maps, LODs, glTF and costs | Opus 5.5 | High |
| 16 | Moth: full render set and self-review pass | Opus 5.5 | High |
| 17 | Shared sheets and the review page | Sonnet 5.5 | Medium |
| 18 | Final spec and integration plan (the run ends) | Opus 5.5 | High |

Wren block: 05-11 (with 08a, 08b, 09b). Block end (after 11): step 08 is not retried (superseded); step 07's OPEN
cable item is fixed and re-checked inside step 09.

Each step's model id for chaining: Opus 5.5 = `claude-opus-5-5`, Sonnet 5.5 = `claude-sonnet-5-5`.
