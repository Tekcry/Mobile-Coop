# nv-pass slice 3 check (vision carousel), commit 3fa8d372
**PASS.** Matches Michael's ask ("press A ... cycle through like a carousel") and PLAN row 3; G99/G100 order kept
(`VISION_WHEEL` night -> thermal -> electro, one list), G181 kept (wheel on LB / Tab hold, release selects).

- Stepping: `gadgetSystem.fixedUpdate` cycles only while `wheelOpen` and only when the lit segment is `kind: 'vision'`
  (`SelectionWheel.cycle`); off the slot it returns false and the mode is untouched.
- Consumption: same step - the context menu runs first but is `aside` while the wheel is open (0 rows -> state none,
  `ctxOwnsA` false); the rest of the step gets `blankInp` (`takes` true); `interact.pressed` is cleared after a cycle, so
  even the release step (wheel closes, real input passes) never sees it. Next step - the edge is gone and the menu opens
  only on a press (`ContextMenu.step` passive branch), so a held A after letting go of LB opens nothing. Reload is X
  held (pad A = `interact` only, `gamepadMapping.ts:61`), so A cannot reload.
- Release selects (`pick` returns `sel.mode`), `begin(vision.selected)` opens on the selected mode; the cursor-length
  pick is gone.
- KBM: E = `interact` (`keyBindings.ts:52`), same path; mouse look still lights the slot; hint uses `keyLabels.interact`.
- Co-op: nothing new is sent; `vision.selected` stays local and `applyPick` -> `vision.select` is the pre-existing path.
- Hot path: `cycle` / `nextVision` index a const list, no allocation.
- Tests: unit covers order + wrap, cycle on / off the slot, begin from a mode, rim no longer picks. Consumption is
  covered by the e2e (`ctxMenu.state !== 'active'`) only. e2e-pad (LB + stick up + A x2 -> electro, release picks
  electro) and e2e-gadgets (Tab held, E steps from the selected mode, release selects) edits look right.
- Ran: vitest selectionWheel 8/8; tsc clean. e2e: laptop runner on 3fa8d372 (not here). CHANGELOG still pending.

Polish (not blocking)
1. e2e-gadgets calls `openWheel()` before the step that sees the Tab press edge, so `lbOpened` resets to false; if a
   later fixed step in the same frame sees the Tab release edge it could fire a `swapNext` tap (gun swap, not asserted).
   Done looks like: step once with Tab held before `openWheel()`, or assert the gun slot is unchanged.
2. A pressed off the vision slot on the exact LB-release step is not consumed (reaches the world that step). Done looks
   like: clear `interact.pressed` whenever the wheel was open at the start of the step.
3. No assert that A on the slot never interacts / reloads (e.g. weapon slot and `drawPhase` unchanged). Done looks like:
   one extra check in the e2e-pad block.
