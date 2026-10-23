# interrogation-intel (CT Core spare 9)

Michael (ROADMAP Decided "Stealth over shooting", 2026-10-23 ~10:10): "(9) interrogation gives door codes, camera routes,
patrol timing". Rule (2026-10-20 08:10): "once they are grabbed it can show interrogate (if they have information)".

## Assumed decisions
- A1 Door codes are authored per guard: `codes: [{ flag, label }]` on the guard's info (`GuardIntel`, `src/game/intel.ts`; no src/ai edit). Interrogation hands each flag to `GameMode.onIntelCode`. Undo: drop `codes`.
- A2 Camera routes and patrol timing are derived: every guard with information also reveals the cameras (count, sweep cycle) and patrols (count, loop time) within 30 m, same storey. Undo: `INTEL.reach` 0.
- A3 Shown as feed lines (<= 60 chars) on every player: host / solo shows them, the host relays them as `feed` events. No map marks. Undo: remove the relay / lines.
- A4 The host is the authority: a client's interrogation is seen on the host from its MoveState (grab, sub bit 2, ph); no wire change. A client interrogating from the hang-down (MoveState `boost`) gives only the guard's own lines (gap).
- A5 Part B (not this job): the modes implement `onIntelCode` once marlow-final and sector-redesign merge (courseMode: `this.state?.setFlag(flag)` + the flag in `externalFlags`; sectorMode: copy `slot.info` to `e.info` at spawn like courseMode.ts:665, and `SectorCodes.grantCode(flag, sec)`); map owners author `codes`. Until then codes show as text only.
