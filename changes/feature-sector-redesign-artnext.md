# Campus art next: kit API, dressing and freeze polish
kind: minor
- Campus art kit: `skinFace` puts a visual panel flush on one face of a greybox box. It writes no box, so collision, light and sight stay as they were.
- Campus art kit: `tryAdd` takes a list of spots and returns the first that passes (or -1). Every refusal names its keepout rule (`ArtRuleError`).
- Campus art kit: per-piece fit ranges for battery racks, lab benches, mesh panels and kitchen runs. Floor decals under 5 cm are no longer held to the route, patrol, door and box keepouts (K1-K6, K13). A door frame may span its own door.
- Campus dressing: S1 parked cars come in four colours. S1 heroes go through `tryAdd`; the bike rack and bench it refuses are an explicit omitted list the test checks.
- Campus dressing: the S2 atrium green wall is skinned onto the west wall in both bays.
- Campus dressing: S4 battery rows use the real battery rack piece, the raised-floor tile grid now covers the hall (72 tiles), and the genset exhaust stack is listed as an overhang part.
- Campus dressing: S5 kitchen counter run and wall cupboards are placed. The two hall portraits sit at the hall floor's height.
- Freeze polish C1-C6, see artnext-c.
