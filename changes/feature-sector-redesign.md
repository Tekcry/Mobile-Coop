# Unreleased - sector-redesign
kind: minor
- Sector Ops campusOps: S2 HQ atrium and offices greybox.
- Sector Ops team doors: pair bolts (open only while the partner pushes the door from the other side) and pair gates (two key switches turned within 1 s by both players), host-authoritative, reset on a restart; guards route round them while locked (engine only, no map uses them yet).
- Sector Ops keypads: a keypad door stays locked until the team finds its code (overheard, a handover board, or an objective such as a hack); a section restart forgets the codes found in it.
- Sector Ops engine: breaker and timed isolator boards (`MapLayout.boards`): cut light circuits until switched back or for a timed window (default 20 s), a guard comes to look, restart puts them back, co-op lamps follow (no map uses them yet).
- Sector Ops alarm stages: a section can now force lights to full, lock doors (never the only way through) and send its reinforcements along a response route at a stage; a restart undoes them (data only, no map uses it yet).
- Sector Ops campusOps: S3 lab block greybox (16 guards, the first lasers las-gown and las-store with their power panels, cam-view and cam-dock, the prototype grab, CR3 chamber roof).
- Sector Ops engine: security desks (`security.desks`): with the operator down or away, the console loops its cameras (they sweep but report nothing, default 30 s) or switches them off until a restart; a restart or section change puts them back, the co-op client follows (no map uses them yet).
