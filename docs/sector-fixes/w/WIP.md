# sector-fixes slice W - done (2026-10-22)
Built (Michael item 8): the selection wheel opens on the vision slot (`WHEEL_HOME`); hold LB + A cycles the vision with
no stick; the pad's right stick is the absolute cursor (`InputState.stick`), let go = back on the vision slot (no held
pick), with a 0.08 s let-go grace (`WHEEL_LETGO_S`) so stick and LB let go together still pick the slot; A with the
stick centred always cycles. KBM: Tab opens on vision, E cycles, the mouse back in the centre = vision.
Checks: lint, vitest, build pass. e2e to run (not run here): e2e-gadgets, e2e-pad (both assert the new wheel behaviour).
`scripts/wheel-shots.mjs` (GPU helper) now drives the stick; pending a PC run if wanted.
