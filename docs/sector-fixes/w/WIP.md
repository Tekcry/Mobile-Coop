# sector-fixes slice W - parked work in progress (2026-10-22 ~08:55)
Parked (priority switch to anim-natural). UNVERIFIED: the implementer was stopped mid-slice while fixing a test (its
last note: "axis index 0 is the left stick. Fix to axis 2" in its own new test). Files: src/game/{selectionWheel,
gadgetSystem, gameState}.ts, src/input/{gamepadMapping, gamepadSource, inputState}.ts, scripts/{e2e-gadgets, e2e-pad}.mjs,
tests/{input, selectionWheel}.test.ts. Resume: read the diff against ea3399ed, fix the axis in the test, check, e2e-gadgets.
