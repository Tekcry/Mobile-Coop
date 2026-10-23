"""Saltmarsh Park section 4 hero set H4, the data hall (sector-redesign ART-S4, briefs/ART-S4.md section 3), built headless.

  blender -b --factory-startup -noaudio --python-exit-code 1 --python hero_s4.py -- --seed N --out DIR --name hero-s4 [--only a,b]

Frames (ART-KIT): a free-standing piece faces +z with its origin at the footprint centre on the floor; a row piece's local
x runs along the row (its pitch) and local z is its depth (the front is +z). Every skin is modelled to the exact hull of the
greybox it dresses (hull = box, so the fit scale is 1 or a small stretch), thin members only where the skin rule allows.
Sizes, budgets, classes: HERO_S4 in src/world/maps/campusS4Dress.ts (the dress test holds this build's report against it).
Materials are names from CAMPUS_LOOK / PROP_LOOK only (no new look, no alpha: the section stays inside its draw budget).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import box, cyl  # noqa: E402


def lin(h):
    """sRGB hex -> linear RGB (the glTF factor; the renderer replaces the look by name)."""
    return tuple(round((int(h[i:i + 2], 16) / 255) ** 2.2, 4) for i in (1, 3, 5))


# CAMPUS_LOOK / PROP_LOOK by name
LOOK = [
    ('steel', '#7c7f82', 0.55, 0.6), ('steelDark', '#2c2e30', 0.5, 0.5), ('galv', '#adafb1', 0.45, 0.9),
    ('plastic', '#1b1b1c', 0.6, 0.0), ('white', '#e8e8e4', 0.5, 0.0), ('red', '#c0262b', 0.5, 0.1),
    ('concrete', '#a5a29b', 0.9, 0.0), ('brass', '#c19a50', 0.3, 1.0), ('screen', '#ffffff', 1.0, 0.0), ('lamp', '#ffffff', 1.0, 0.0),
]
EMISSIVE = {'screen': (0.16, 0.26, 0.34), 'lamp': (0.1, 0.9, 0.3)}
lib.set_materials({n: (lin(h), r, m, EMISSIVE.get(n, (0, 0, 0))) for n, h, r, m in LOOK})


def contain_panel():
    """0.1 x 0.7 x 1.2: a hot-aisle containment panel (row along local x 1.2, 0.1 thick): a steel frame round smoked polycarbonate."""
    p = 'containPanel'
    box(p, 'steelDark', (-0.6, 0.0, -0.05), (0.6, 0.04, 0.05))
    box(p, 'steelDark', (-0.6, 0.66, -0.05), (0.6, 0.7, 0.05))
    for x in (-0.6, -0.02, 0.56):
        box(p, 'steelDark', (x, 0.04, -0.05), (x + 0.04, 0.66, 0.05))
    # the smoked infill, a little proud of nothing: recessed 2 cm on each face
    box(p, 'plastic', (-0.56, 0.04, -0.03), (0.56, 0.66, 0.03))


def pod_roof():
    """3.6 deep x 0.1 x 1.2 along the row: the containment roof, a cable cut-out in the middle (a recessed dark plate) and a blanking lip."""
    p = 'podRoof'
    box(p, 'galv', (-0.6, 0.0, -1.8), (-0.25, 0.1, 1.8))
    box(p, 'galv', (0.25, 0.0, -1.8), (0.6, 0.1, 1.8))
    box(p, 'galv', (-0.25, 0.0, -1.8), (0.25, 0.1, -0.4))
    box(p, 'galv', (-0.25, 0.0, 0.4), (0.25, 0.1, 1.8))
    # the cut-out: a brush strip well below the roof's top
    box(p, 'steelDark', (-0.25, 0.0, -0.4), (0.25, 0.03, 0.4))
    # the blanking lip: a darker edge strip along each long side, flush with the top
    box(p, 'steelDark', (-0.6, 0.085, -1.8), (0.6, 0.1, -1.7))
    box(p, 'steelDark', (-0.6, 0.085, 1.7), (0.6, 0.1, 1.8))


def basket_run():
    """1.0 x 0.4 x 1.0 (hull to 3.0 with the hanger rods): a wire-mesh cable basket (the walked top is flush at 0.4) full of
    cable bundles, a trapeze hanger with two 2 cm drop rods up to the slab (the greybox's 2.6 m of dead air)."""
    p = 'basketRun'
    for z in (-0.46, -0.23, 0.0, 0.23, 0.46):
        box(p, 'galv', (-0.5, 0.0, z - 0.01), (0.5, 0.02, z + 0.01))
    for x in (-0.25, 0.25):
        box(p, 'galv', (x - 0.01, 0.0, -0.5), (x + 0.01, 0.02, 0.5))
    for z in (-0.49, 0.49):
        box(p, 'galv', (-0.5, 0.38, z - 0.01), (0.5, 0.4, z + 0.01))
        box(p, 'galv', (-0.5, 0.19, z - 0.01), (0.5, 0.21, z + 0.01))
    # cable bundles (below the top)
    box(p, 'plastic', (-0.5, 0.02, -0.4), (0.5, 0.3, -0.12))
    box(p, 'steelDark', (-0.5, 0.02, -0.1), (0.5, 0.26, 0.14))
    box(p, 'red', (-0.5, 0.02, 0.16), (0.5, 0.2, 0.28))
    box(p, 'plastic', (-0.5, 0.02, 0.3), (0.5, 0.33, 0.46))
    # the trapeze: a cross bar under the basket and two rods to the slab
    box(p, 'steelDark', (-0.03, 0.0, -0.5), (0.03, 0.03, 0.5))
    for z in (-0.48, 0.48):
        box(p, 'steel', (-0.01, 0.03, z - 0.01), (0.01, 3.0, z + 0.01))


def crac_unit():
    """2.0 x 2.0 x 1.2 along the row: a downflow cooling unit, louvred front, a status display."""
    p = 'cracUnit'
    box(p, 'steelDark', (-1.0, 0.0, -0.6), (1.0, 0.1, 0.6))
    box(p, 'white', (-1.0, 0.1, -0.6), (1.0, 1.95, 0.58))
    for k in range(6):
        y = 0.25 + 0.2 * k
        box(p, 'steelDark', (-0.9, y, 0.58), (0.15, y + 0.06, 0.6))
    box(p, 'plastic', (0.4, 1.35, 0.58), (0.9, 1.85, 0.6))
    box(p, 'screen', (0.45, 1.5, 0.585), (0.85, 1.8, 0.6))
    box(p, 'steelDark', (0.4, 0.3, 0.58), (0.9, 0.9, 0.6))
    box(p, 'galv', (-1.0, 1.95, -0.6), (1.0, 2.0, 0.6))


def ups_cabinet():
    """0.8 x 2.0 x 1.0 along the row: a UPS / battery cabinet line-up unit, a mimic panel with three LEDs."""
    p = 'upsCabinet'
    box(p, 'steel', (-0.4, 0.0, -0.5), (0.4, 2.0, 0.47))
    box(p, 'steelDark', (-0.36, 0.08, 0.47), (0.36, 1.92, 0.5))
    box(p, 'plastic', (-0.26, 1.4, 0.47), (0.26, 1.8, 0.5))
    for k, x in enumerate((-0.16, 0.0, 0.16)):
        box(p, 'lamp', (x - 0.03, 1.62, 0.485), (x + 0.03, 1.68, 0.5))
    for y in (0.3, 0.42):
        box(p, 'steel', (-0.3, y, 0.485), (0.3, y + 0.05, 0.5))


def battery_string():
    """2.0 x 1.2 x 1.0 along the row: a battery rack string (the K batteryRack is 0.8 deep, this greybox 1.0: kit gap L1)."""
    p = 'batteryString'
    for x in (-1.0, 0.97):
        for z in (-0.5, 0.47):
            box(p, 'steelDark', (x, 0.0, z), (x + 0.03, 1.2, z + 0.03))
    for y in (0.05, 0.45, 0.85):
        box(p, 'steelDark', (-1.0, y, -0.5), (1.0, y + 0.03, 0.5))
        box(p, 'plastic', (-0.95, y + 0.03, -0.45), (0.95, y + 0.3, 0.45))
        box(p, 'red', (-0.9, y + 0.3, 0.3), (0.9, y + 0.32, 0.36))
    box(p, 'steelDark', (-1.0, 1.17, -0.5), (1.0, 1.2, 0.5))


def chiller():
    """4.0 x 2.2 x 2.0: an air-cooled chiller, coil grilles on the long sides, two fan stacks on top."""
    p = 'chiller'
    box(p, 'steelDark', (-2.0, 0.0, -1.0), (2.0, 0.15, 1.0))
    box(p, 'galv', (-2.0, 0.15, -0.98), (2.0, 1.9, 0.98))
    for z in (-1.0, 0.98):
        box(p, 'steelDark', (-1.85, 0.3, z), (1.85, 1.7, z + 0.02))
    for x in (-1.0, 1.0):
        cyl(p, 'steel', (x, 2.05, 0.0), 0.7, 0.3, segs=12)
        cyl(p, 'steelDark', (x, 2.2 - 0.01, 0.0), 0.6, 0.02, segs=12)
    box(p, 'red', (-0.3, 0.5, 0.98), (0.3, 0.7, 1.0))
    box(p, 'plastic', (1.5, 1.0, 0.98), (1.9, 1.5, 1.0))


def genset():
    """3.0 x 2.6 x 6.0 (hull to 3.6 with the stack): a containerised generator, louvres on the long sides, an exhaust stack
    0.3 dia above the roof."""
    p = 'genset'
    box(p, 'steelDark', (-1.4, 0.0, -2.9), (1.4, 0.2, 2.9))
    box(p, 'steel', (-1.46, 0.2, -2.96), (1.46, 2.6, 2.96))
    for x in (-1.5, 1.46):
        for z0 in (-2.4, -0.9, 0.6):
            for k in range(5):
                y = 0.5 + 0.28 * k
                box(p, 'steelDark', (x, y, z0), (x + 0.04, y + 0.1, z0 + 1.2))
    box(p, 'steelDark', (-1.0, 0.5, 2.96), (1.0, 2.3, 3.0))
    box(p, 'steelDark', (-1.0, 0.5, -3.0), (1.0, 2.3, -2.96))
    cyl(p, 'steelDark', (-1.0, 3.1, -2.4), 0.15, 1.0, segs=8)
    cyl(p, 'steel', (-1.0, 2.7, -2.4), 0.25, 0.2, segs=8)
    box(p, 'steelDark', (-1.2, 2.6, -2.6), (-0.8, 2.68, -2.2))


def fuel_tank():
    """3.0 x 2.0 x 4.0: a bunded fuel tank: a concrete bund, a horizontal tank on saddles, a fill point. 2.0 high (the S4 tanks)."""
    p = 'fuelTank'
    # the bund: a plinth with a raised rim
    box(p, 'concrete', (-1.5, 0.0, -2.0), (1.5, 0.15, 2.0))
    for lo, hi in (((-1.5, 0.15, -2.0), (1.5, 0.45, -1.85)), ((-1.5, 0.15, 1.85), (1.5, 0.45, 2.0)),
                   ((-1.5, 0.15, -1.85), (-1.35, 0.45, 1.85)), ((1.35, 0.15, -1.85), (1.5, 0.45, 1.85))):
        box(p, 'concrete', lo, hi)
    for z in (-1.1, 1.1):
        box(p, 'steelDark', (-0.5, 0.15, z - 0.1), (0.5, 0.55, z + 0.1))
    cyl(p, 'steel', (0.0, 1.2, 0.0), 0.8, 3.4, axis='z', segs=12)
    # the fill point: a flange and cap on the tank's crown, inside the hull
    cyl(p, 'steelDark', (0.0, 1.97, -0.9), 0.12, 0.06, segs=8)
    box(p, 'red', (-0.1, 1.9, 0.7), (0.1, 2.0, 0.9))
    # a gauge column on the saddle end
    box(p, 'galv', (0.85, 0.5, 1.6), (0.95, 1.4, 1.7))


def crate_stack():
    """1.2 x 1.0 x 0.8: replacement drives in flight cases (two cases stacked, the 03:00 courier's)."""
    p = 'crateStack'
    box(p, 'plastic', (-0.6, 0.0, -0.4), (0.6, 0.5, 0.4))
    box(p, 'plastic', (-0.6, 0.5, -0.4), (0.6, 1.0, 0.4))
    for y0, y1 in ((0.0, 0.03), (0.48, 0.52), (0.97, 1.0)):
        box(p, 'galv', (-0.6, y0, -0.4), (0.6, y1, 0.4))
    box(p, 'red', (-0.55, 0.6, 0.38), (-0.35, 0.7, 0.4))


def cage_panel():
    """1.5 x 3.0 x 0.1 along the row: a welded-mesh cage face (flat bars: the F meshPanel's 2.4 m high stretches 1.26 to this
    3.0 m box, over the fit limit: kit gap L2); open, no alpha."""
    p = 'cagePanel'
    for x in (-0.75, 0.7):
        box(p, 'steel', (x, 0.0, -0.05), (x + 0.05, 3.0, 0.05))
    box(p, 'steel', (-0.75, 2.92, -0.05), (0.75, 3.0, 0.05))
    box(p, 'steel', (-0.75, 1.4, -0.04), (0.75, 1.46, 0.04))
    box(p, 'steel', (-0.75, 0.0, -0.05), (0.75, 0.2, 0.05))
    for k in range(1, 6):
        y = 0.2 + 0.45 * k
        if abs(y - 1.4) < 0.1:
            continue
        box(p, 'galv', (-0.7, y, -0.01), (0.7, y + 0.02, 0.01))
    for k in range(1, 6):
        x = -0.75 + 0.25 * k
        box(p, 'galv', (x - 0.01, 0.2, -0.01), (x + 0.01, 2.92, 0.01))


def suppression_bank():
    """1.2 x 1.7 x 0.35: gas-suppression cylinders in a floor rack against the wall (back on the wall at z 0), see class."""
    p = 'suppressionBank'
    box(p, 'steelDark', (-0.6, 0.0, 0.0), (0.6, 0.1, 0.35))
    box(p, 'steelDark', (-0.6, 1.0, 0.0), (0.6, 1.06, 0.04))
    box(p, 'steelDark', (-0.6, 0.0, 0.0), (-0.56, 1.7, 0.04))
    box(p, 'steelDark', (0.56, 0.0, 0.0), (0.6, 1.7, 0.04))
    box(p, 'steelDark', (-0.6, 1.66, 0.0), (0.6, 1.7, 0.04))
    box(p, 'steelDark', (-0.6, 0.45, 0.2), (0.6, 0.5, 0.35))
    for x in (-0.42, -0.14, 0.14, 0.42):
        cyl(p, 'red', (x, 0.82, 0.17), 0.12, 1.45, segs=8)
        box(p, 'brass', (x - 0.04, 1.55, 0.1), (x + 0.04, 1.68, 0.24))


BUILDERS = {
    'containPanel': contain_panel,
    'podRoof': pod_roof,
    'basketRun': basket_run,
    'cracUnit': crac_unit,
    'upsCabinet': ups_cabinet,
    'batteryString': battery_string,
    'chiller': chiller,
    'genset': genset,
    'fuelTank': fuel_tank,
    'crateStack': crate_stack,
    'cagePanel': cage_panel,
    'suppressionBank': suppression_bank,
}


def main():
    args = lib.common.parse_args({'--out': {'required': True}, '--name': {'default': 'hero-s4'}, '--only': {'default': ''}})
    lib.common.check_version()
    lib.common.empty_scene()
    lib.common.seed_everything(args.seed)
    only = {s for s in args.only.split(',') if s}
    for name, fn in BUILDERS.items():
        if only and name not in only:
            continue
        fn()
    lib.export(lib.PIECES, args.out, args.name, args.seed)


main()
