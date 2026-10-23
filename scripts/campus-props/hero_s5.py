"""Saltmarsh Park hero set H5 (sector-redesign ART-S5, brief ART-S5.md section 3): the Old House pieces the base kit and the
facility props do not cover, built headless.

  blender -b --factory-startup -noaudio --python-exit-code 1 --python hero_s5.py -- --seed N --out DIR --name hero-s5 [--only a,b]

Frames as the kit (kit.py): a free-standing piece faces +z with its origin at the footprint centre on the floor; a skin piece
is modelled to the size of the greybox box it skins (the fit scale takes up the rest, 0.8-1.25) and stands at most 5 cm
proud of it. Materials are CAMPUS_LOOK / PROP_LOOK names only. Sizes, budgets and classes: HERO_S5 in
src/world/maps/campusS5Dress.ts (the dress test holds this build's report against it).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import box, cyl, obox, prism_x  # noqa: E402


def lin(h):
    """sRGB hex -> linear RGB (the glTF factor; the renderer replaces the look by name)."""
    return tuple(round((int(h[i:i + 2], 16) / 255) ** 2.2, 4) for i in (1, 3, 5))


# CAMPUS_LOOK / PROP_LOOK by name
LOOK = [
    ('steel', '#7c7f82', 0.55, 0.6), ('steelDark', '#2c2e30', 0.5, 0.5), ('galv', '#adafb1', 0.45, 0.9),
    ('plastic', '#1b1b1c', 0.6, 0.0), ('glass', '#cfd8da', 0.05, 0.0), ('white', '#e8e8e4', 0.5, 0.0),
    ('concrete', '#a5a29b', 0.9, 0.0), ('brass', '#c19a50', 0.3, 1.0), ('lamp', '#ffffff', 1.0, 0.0),
    ('oakDark', '#4a2e17', 0.5, 0.0), ('brick', '#7d4a36', 0.9, 0.0), ('leatherGreen', '#24402e', 0.55, 0.0),
    ('paper', '#d8d2c2', 0.9, 0.0), ('carPaint4', '#e3e4e1', 0.3, 0.3), ('tyre', '#1a1a1a', 0.9, 0.0),
]
EMISSIVE = {'lamp': (1.0, 0.9, 0.7)}
lib.set_materials({n: (lin(h), r, m, EMISSIVE.get(n, (0, 0, 0))) for n, h, r, m in LOOK})


# ------------------------------------------------------------------------------------------------ control room / gallery

def radio_rack_row():
    """One 1.1 m module of the control room's rack row (1.1 x 2.2 x 0.3): radio and CCTV recorder faces both sides."""
    p = 'radioRackRow'
    box(p, 'steelDark', (-0.55, 0.0, -0.14), (0.55, 2.2, 0.14))
    for sgn in (1, -1):
        za, zb = (0.14, 0.15) if sgn > 0 else (-0.15, -0.14)
        for y0, y1, m in ((0.15, 0.55, 'plastic'), (0.65, 1.05, 'galv'), (1.15, 1.55, 'plastic'), (1.65, 2.05, 'steel')):
            box(p, m, (-0.5, y0, za), (0.5, y1, zb))
    # status LEDs: thin plates standing in the panel faces (the hull stays at the 0.3 depth)
    for x, y in ((-0.4, 0.45), (-0.32, 0.95)):
        box(p, 'lamp', (x - 0.02, y, 0.15), (x + 0.02, y + 0.03, 0.152))
        box(p, 'lamp', (x - 0.02, y, -0.152), (x + 0.02, y + 0.03, -0.15))


def display_screen():
    """One 1.2 m module of a gallery display screen (local x along the row, 0.3 deep, 2.2 high): oak frame, framed plans."""
    p = 'displayScreen'
    box(p, 'oakDark', (-0.6, 0.0, -0.14), (0.6, 2.2, 0.14))
    for sgn in (1, -1):
        z0, z1 = (0.14, 0.15) if sgn > 0 else (-0.15, -0.14)
        box(p, 'paper', (-0.45, 0.5, z0), (0.45, 1.7, z1))
        box(p, 'brass', (-0.45, 0.45, z0), (0.45, 0.5, z1))        # picture rail under the plan
        box(p, 'oakDark', (-0.5, 1.7, z0), (0.5, 1.78, z1))        # frame head


def rolling_stack():
    """A rolling archive stack (1.4 x 2.2 x 1.0): steel end panels, shelves of archive boxes on both long faces, a handwheel on the west end."""
    p = 'rollingStack'
    for x in (-0.7, 0.66):
        box(p, 'steel', (x, 0.0, -0.5), (x + 0.04, 2.2, 0.5))
    box(p, 'steelDark', (-0.66, 0.0, -0.5), (0.66, 0.12, 0.5))
    box(p, 'steel', (-0.66, 2.15, -0.5), (0.66, 2.2, 0.5))
    for y in (0.5, 0.95, 1.4, 1.85):
        box(p, 'steel', (-0.66, y, -0.5), (0.66, y + 0.03, 0.5))
    for k, y in enumerate((0.15, 0.53, 0.98, 1.43, 1.88)):
        for z0, z1 in ((-0.5, -0.3), (0.3, 0.5)):
            h = 0.3 if k else 0.33
            box(p, 'paper', (-0.6, y, z0), (0.6 - 0.14 * (k % 2), min(y + h, 2.14), z1))
    cyl(p, 'brass', (-0.715, 1.1, 0.0), 0.12, 0.03, axis='x', segs=8)
    cyl(p, 'steelDark', (-0.725, 1.1, 0.0), 0.03, 0.05, axis='x', segs=6)


def token_plinth():
    """The token table's plinth (1.2 x 0.9 x 0.6): steel carcass, green baize top flush at 0.9, an empty key-case recess in the front."""
    p = 'tokenPlinth'
    box(p, 'steelDark', (-0.6, 0.0, -0.3), (0.6, 0.84, 0.3))
    box(p, 'leatherGreen', (-0.6, 0.84, -0.3), (0.6, 0.9, 0.3))
    box(p, 'plastic', (-0.25, 0.3, 0.29), (0.25, 0.7, 0.3))        # the recess (empty: dark)
    box(p, 'brass', (-0.27, 0.28, 0.285), (0.27, 0.3, 0.295))
    box(p, 'brass', (-0.27, 0.7, 0.285), (0.27, 0.72, 0.295))
    box(p, 'steel', (-0.6, 0.0, -0.3), (0.6, 0.06, 0.3))


# ------------------------------------------------------------------------------------------------------ roof and grounds

def chimney_stack():
    """A brick chimney stack on its 1.2 x 1.2 base (2.0 high): stone setback and cap, two clay pots above (<= 0.3 dia)."""
    p = 'chimneyStack'
    box(p, 'brick', (-0.6, 0.0, -0.6), (0.6, 1.95, 0.6))
    box(p, 'concrete', (-0.62, 1.3, -0.62), (0.62, 1.36, 0.62))        # a stone weathering course
    box(p, 'concrete', (-0.68, 1.95, -0.68), (0.68, 2.05, 0.68))       # the cap
    box(p, 'concrete', (-0.62, 2.05, -0.62), (0.62, 2.11, 0.62))
    for x in (-0.3, 0.3):
        cyl(p, 'brick', (x, 2.31, 0.0), 0.14, 0.4, segs=8, r2=0.12)


def panel_van():
    """The courier's panel van, no livery (2.5 x 2.0 x 5.0, nose +z; fit 1.208 x 1.21 x 1.0 on the 3.0 x 2.4 x 5.0 greybox): body, cab, glass, wheels."""
    p = 'panelVan'
    box(p, 'carPaint4', (-1.25, 0.25, -2.5), (1.25, 0.75, 2.5), 0.04)               # lower body and sills
    box(p, 'carPaint4', (-1.2, 0.75, -2.5), (1.2, 2.0, 0.85), 0.05)                 # the cargo box
    prism_x(p, 'carPaint4', [(0.85, 0.75), (2.5, 0.75), (2.5, 1.05), (2.3, 1.3), (1.65, 1.55), (1.3, 1.55), (0.85, 1.5)], -1.2, 1.2)   # cab: bonnet and screen rake
    box(p, 'glass', (-1.18, 1.18, 1.3), (-1.2, 1.5, 1.66))                          # side windows (cab)
    box(p, 'glass', (1.2, 1.18, 1.3), (1.18, 1.5, 1.66))
    prism_x(p, 'glass', [(1.34, 1.5), (1.64, 1.5), (1.99, 1.38), (1.74, 1.32)], -1.0, 1.0)            # windscreen
    box(p, 'tyre', (-1.25, 0.0, 2.35), (1.25, 0.3, 2.5))                            # front bumper and valance
    box(p, 'tyre', (-1.25, 0.0, -2.5), (1.25, 0.3, -2.35))                          # rear bumper
    box(p, 'tyre', (-1.1, 0.7, 2.48), (1.1, 0.95, 2.5))                             # grille
    for sx in (-1, 1):
        for zc in (1.55, -1.45):
            cyl(p, 'tyre', (sx * 1.1, 0.36, zc), 0.36, 0.28, axis='x', segs=12)
        box(p, 'tyre', (sx * 1.19 - 0.02, 1.12, 1.85), (sx * 1.19 + 0.02, 1.4, 1.92))           # flush mirror arms
    box(p, 'tyre', (-0.9, 1.0, -2.5), (0.9, 1.1, -2.49))                            # rear door seam band


def balustrade():
    """One 1.0 m of the terrace balustrade (1.0 x 1.0 x 0.24, fit along x): stone coping, base rail, balusters at gaps <= 8 cm."""
    p = 'balustrade'
    box(p, 'concrete', (-0.5, 0.9, -0.12), (0.5, 1.0, 0.12))
    box(p, 'concrete', (-0.5, 0.0, -0.1), (0.5, 0.14, 0.1))
    for i in range(8):
        x = -0.47 + 0.134 * i
        box(p, 'concrete', (x - 0.03, 0.14, -0.04), (x + 0.03, 0.9, 0.04))


# ------------------------------------------------------------------------------------------------------ strongroom

def deposit_face():
    """One 1.2 m module of strongroom safe-deposit fronts, flush on the wall (1.2 x 2.4 x 0.12, back on the wall face at z 0): a steel plate and three columns of five box doors."""
    p = 'depositFace'
    box(p, 'steelDark', (-0.6, 0.0, 0.0), (0.6, 2.4, 0.04))
    for c in range(3):
        x0 = -0.57 + c * 0.38
        for r in range(5):
            y0 = 0.06 + r * 0.46
            box(p, 'steel', (x0, y0, 0.04), (x0 + 0.34, y0 + 0.42, 0.11))


BUILDERS = {
    'radioRackRow': radio_rack_row,
    'displayScreen': display_screen,
    'rollingStack': rolling_stack,
    'tokenPlinth': token_plinth,
    'chimneyStack': chimney_stack,
    'panelVan': panel_van,
    'balustrade': balustrade,
    'depositFace': deposit_face,
}


def main():
    args = lib.common.parse_args({'--out': {'required': True}, '--name': {'default': 'hero-s5'}, '--only': {'default': ''}})
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
