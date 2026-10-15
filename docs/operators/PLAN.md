# Operators run - plan

Goal (Michael, D15): completed Wren and Moth as described in ART-DIRECTION.md and SPEC, built unattended in small
focused steps, reviewed by Michael at the end.

Order and why:
1. 03b fixes the shirt and adds the automatic checks every later step uses.
2. 04 builds the Lab and the sheet script, so every later step renders the same views.
3. 05-11 build Wren layer by layer from the skin out (base, trousers, hands and feet, head, carrier and harness,
   holster, pack and comms), then bakes, LODs and exports, then a full render and self-review pass.
4. 12-16 repeat for Moth, reusing Wren's generators with Moth's body and kit.
5. 17 shared sheets and the review page; 18 the final spec. The run ends; Michael reviews.

Each step file has: objective, the only files to read, what to do, what is out of scope, pass/fail checks, finish.

| Step | What | Model | Effort |
| --- | --- | --- | --- |
| 03b | Wren combat shirt fit, and the automatic checks | Opus 5.5 | High |
| 04 | Operator Lab and the contact sheet script | Sonnet 5.5 | Medium |
| 05 | Wren: base layer and trousers | Opus 5.5 | High |
| 06 | Wren: gloves and boots | Opus 5.5 | High |
| 07 | Wren: hood, optic, mount and comms head kit | Opus 5.5 | High |
| 08 | Wren: plate carrier, harness and belt | Opus 5.5 | High |
| 09 | Wren: thigh holster, pack, cables and strobe | Opus 5.5 | High |
| 10 | Wren: baked maps, LODs, glTF and costs | Opus 5.5 | High |
| 11 | Wren: full render set and self-review pass | Opus 5.5 | High |
| 12 | Moth: shirt with rolled sleeves, base layer, trousers | Opus 5.5 | High |
| 13 | Moth: gloves, boots, hood and round optic | Opus 5.5 | High |
| 14 | Moth: climbing harness, chest rig, hardware, pack, comms | Opus 5.5 | High |
| 15 | Moth: baked maps, LODs, glTF and costs | Opus 5.5 | High |
| 16 | Moth: full render set and self-review pass | Opus 5.5 | High |
| 17 | Shared sheets and the review page | Sonnet 5.5 | Medium |
| 18 | Final spec and integration plan (the run ends) | Opus 5.5 | High |

Each step's model id for chaining: Opus 5.5 = `claude-opus-5-5`, Sonnet 5.5 = `claude-sonnet-5-5`.
