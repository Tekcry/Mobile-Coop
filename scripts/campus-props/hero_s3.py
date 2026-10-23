"""Saltmarsh Park section 3 hero set H3 (sector-redesign ART-S3, brief ART-S3.md section 3): the lab block's own pieces,
built headless.

  blender -b --factory-startup -noaudio --python-exit-code 1 --python hero_s3.py -- --seed N --out DIR --name hero-s3 [--only a,b]

Frames (campus kit, ART-KIT report): a free-standing piece faces +z; a skin piece's hull is the greybox box it dresses plus
a few millimetres (the fit rule: skin 0.8-1.25, at most 2 cm proud; every skin here is built to its box so its scale is 1,
the whole-box shells (chamberWall, emcPanel) carry all four faces); a wall piece (hazardPlate, passBox) has its back on the
wall face at z 0 and is modelled at its mount height over the floor; the crane girder is a ceiling piece (origin on its
top face, hull below y 0). Sizes, classes and budgets: HERO_S3 in src/world/maps/campusS3Dress.ts (its test holds this
build's report against them). Low poly on purpose.

The chamberWall's west face is the co-op lip (CR3): its z- face is flat panel with 1 mm seam lines only (nothing proud
beyond the 7.5 mm skin, no handle, no seam deeper than 5 mm).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import box, cyl, obox  # noqa: E402


def lin(h):
    """sRGB hex -> linear RGB (the glTF factor; the renderer replaces the look by name)."""
    return tuple(round((int(h[i:i + 2], 16) / 255) ** 2.2, 4) for i in (1, 3, 5))


# CAMPUS_LOOK / PROP_LOOK by name (the names H3 uses; src/world/campusArt/campusKit.ts, facilityProps.ts)
LOOK = [
    ('steel', '#7c7f82', 0.55, 0.6), ('steelDark', '#2c2e30', 0.5, 0.5), ('galv', '#adafb1', 0.45, 0.9),
    ('plastic', '#1b1b1c', 0.6, 0.0), ('white', '#e8e8e4', 0.5, 0.0), ('safety', '#f2b705', 0.5, 0.1),
    ('timber', '#a8875c', 0.85, 0.0), ('cardboard', '#a67b4f', 0.9, 0.0), ('labWhite', '#dfe2e0', 0.45, 0.0),
    ('epoxy', '#6c7a6f', 0.35, 0.0), ('copper', '#b0643a', 0.35, 1.0), ('red', '#c0262b', 0.5, 0.1),
]
lib.set_materials({n: (lin(h), r, m, (0, 0, 0)) for n, h, r, m in LOOK})

SK = 0.0075    # a skin stands 7.5 mm proud of its box on every face
DT = 0.002     # detail strips stand 2 mm proud of the panel face


def shell(piece, w, h, d, body, seam, skirt, face_seams):
    """A whole-box shell: hull w x h x d (box + 15 mm / 7.5 mm), body panel, vertical seam lines on the four faces
    (`face_seams` = (n panels along x on the +-z faces, n panels along z on the +-x faces)), a skirt and a mid seam."""
    hx, hz = w / 2 + SK, d / 2 + SK
    bx, bz = hx - DT, hz - DT
    box(piece, body, (-bx, 0.0, -bz), (bx, h + SK - DT, bz))
    nx, nz = face_seams
    for sz_ in (-1, 1):
        for k in range(1, nx):
            x = -w / 2 + w * k / nx
            box(piece, seam, (x - 0.002, 0.0, sz_ * bz), (x + 0.002, h, sz_ * hz))
        box(piece, seam, (-bx, h / 2 - 0.002, sz_ * bz), (bx, h / 2 + 0.002, sz_ * hz))
        box(piece, skirt, (-bx, 0.0, sz_ * bz), (bx, 0.12, sz_ * hz))
    for sx_ in (-1, 1):
        for k in range(1, nz):
            z = -d / 2 + d * k / nz
            box(piece, seam, (sx_ * bx, 0.0, z - 0.002), (sx_ * hx, h, z + 0.002))
        box(piece, seam, (sx_ * bx, h / 2 - 0.002, -bz), (sx_ * hx, h / 2 + 0.002, bz))
        box(piece, skirt, (sx_ * bx, 0.0, -bz), (sx_ * hx, 0.12, bz))
    return hx, hz


def chamber_wall():
    """The environmental chamber (box 8 x 4.4 x 6, front +z = the east face): insulated panels with cam-lock seams, a door
    and a viewing port on the front. The back (-z) is the CR3 lip face: flat panel and 1 mm seam lines only."""
    p = 'chamberWall'
    hx, hz = shell(p, 8.0, 4.4, 6.0, 'labWhite', 'steelDark', 'steel', (7, 5))
    z0, z1 = hz - DT, hz
    box(p, 'steel', (-0.52, 0.0, z0), (0.52, 2.12, z1))                       # door frame
    box(p, 'white', (-0.47, 0.05, z0), (0.47, 2.07, z1))                      # leaf
    box(p, 'plastic', (-0.2, 1.4, z0), (0.2, 1.8, z1))                        # viewing port
    box(p, 'galv', (-0.42, 0.95, z0), (-0.30, 0.98, z1))                      # lever (front only)
    for x in (-0.47, 0.47):
        box(p, 'steelDark', (x - 0.012, 0.3, z0), (x + 0.012, 0.4, z1))       # hinges
        box(p, 'steelDark', (x - 0.012, 1.7, z0), (x + 0.012, 1.8, z1))


def condensing_unit():
    """The chamber's refrigeration condenser (box 2 x 1.2 x 6): casing, louvred sides, two fan grilles, pipe runs."""
    p = 'condensingUnit'
    box(p, 'galv', (-1.0, 0.1, -3.0), (1.0, 1.2, 3.0))
    box(p, 'steelDark', (-1.005, 0.0, -3.005), (1.005, 0.1, 3.005))
    for sx_ in (-1, 1):
        for k in range(6):
            y = 0.25 + 0.15 * k
            box(p, 'steelDark', (sx_ * 1.0, y, -2.7), (sx_ * 1.005, y + 0.05, 2.7))
    for z in (-1.5, 1.5):
        cyl(p, 'steelDark', (0.0, 1.2, z), 0.52, 0.01, segs=12)
        cyl(p, 'steel', (0.0, 1.2, z), 0.1, 0.01, segs=8)
        for a in (0.0, math.pi / 2):
            obox(p, 'steel', (0.0, 1.2, z), (0.9, 0.01, 0.025), yaw=a)
    for x in (-0.75, 0.75):
        cyl(p, 'copper', (x, 1.172, 0.0), 0.028, 5.4, axis='z', segs=6)
    box(p, 'safety', (-0.3, 0.55, 3.0), (0.3, 0.8, 3.005))


def emc_panel():
    """The EMC test room (box 6 x 4.0 x 8, front +z = the north face): copper-clad shielding modules and the closed RF
    door with finger-stock and a dark 'test in progress' lamp box (the room is off)."""
    p = 'emcPanel'
    hx, hz = shell(p, 6.0, 4.0, 8.0, 'copper', 'steel', 'galv', (5, 7))
    z0, z1 = hz - DT, hz
    box(p, 'galv', (-0.66, 0.0, z0), (0.66, 2.16, z1))                        # door frame
    box(p, 'steel', (-0.6, 0.0, z0), (0.6, 2.1, z1))                          # leaf
    for a, b in (((-0.6, 0.0), (0.6, 0.03)), ((-0.6, 2.07), (0.6, 2.1)), ((-0.6, 0.0), (-0.57, 2.1)), ((0.57, 0.0), (0.6, 2.1))):
        box(p, 'copper', (a[0], a[1], z0), (b[0], b[1], z1))                  # finger-stock ring
    box(p, 'steelDark', (-0.05, 0.95, z0), (0.2, 1.0, z1))                    # latch bar
    box(p, 'steelDark', (-0.22, 2.2, z0), (0.22, 2.4, z1))                    # lamp bezel
    box(p, 'plastic', (-0.18, 2.24, z0), (0.18, 2.36, z1))                    # lamp lens (dark)


def hoarding_panel():
    """The crane bay's board screen, one 1.2 m module (box 11 x 3 x 0.3; front +z): plywood with battens; X braces behind."""
    p = 'hoardingPanel'
    box(p, 'timber', (-0.6, 0.0, -0.15), (0.6, 3.0, 0.15))
    box(p, 'cardboard', (-0.6, 2.95, -0.155), (0.6, 3.0075, 0.155))           # cap rail
    for x in (-0.58, 0.0, 0.58):
        box(p, 'cardboard', (x - 0.02, 0.0, 0.15), (x + 0.02, 2.95, 0.155))   # front battens
    for y in (0.6, 1.8):
        box(p, 'cardboard', (-0.6, y, 0.15), (0.6, y + 0.08, 0.155))          # front rails
    ang = math.atan2(1.1, 2.8)
    ln = math.hypot(1.1, 2.8)
    for s in (-1, 1):
        obox(p, 'steelDark', (0.0, 1.5, -0.1525), (0.05, ln, 0.005), roll=s * ang)   # X braces (back)
    for y in (0.5, 2.5):
        cyl(p, 'galv', (0.0, y, 0.1575), 0.04, 0.005, axis='z', segs=6)       # bolt heads


def stock_shelf():
    """The store's shelving partition, one module (box 1.25-1.65 x 2.4 x 0.3; fronts +z and -z): steel shelving full of
    anti-static boxes (reads solid)."""
    p = 'stockShelf'
    for x in (-0.7, 0.0, 0.7):
        box(p, 'steel', (x - 0.025, 0.0, -0.155), (x + 0.025, 2.4075, 0.155))
    for y in (0.0, 0.55, 1.1, 1.65, 2.2):
        box(p, 'galv', (-0.725, y, -0.15), (0.725, y + 0.03, 0.15))
    box(p, 'galv', (-0.725, 2.4, -0.15), (0.725, 2.4075, 0.15))
    for k, y in enumerate((0.04, 0.59, 1.14, 1.69)):
        for s in (-1, 1):
            box(p, 'plastic' if (k + (s > 0)) % 2 == 0 else 'cardboard', (-0.66, y, 0.0 if s > 0 else -0.153), (0.66, y + 0.47, 0.153 if s > 0 else 0.0))


def crane_girder():
    """A parked overhead travelling crane girder (ceiling piece: origin on the top face, hull y -1 .. 0, long axis x): I-beam,
    end carriages, web stiffeners, the hoist trolley (hull z +-0.3)."""
    p = 'craneGirder'
    L = 10.2
    box(p, 'steel', (-L, -0.35, -0.3), (L, -0.3, 0.3))
    box(p, 'steel', (-L, -0.9, -0.03), (L, -0.35, 0.03))
    box(p, 'steel', (-L, -0.95, -0.25), (L, -0.9, 0.25))
    for s in (-1, 1):
        box(p, 'steelDark', (s * L, -0.75, -0.3), (s * (L - 0.8), 0.0, 0.3))
        box(p, 'safety', (s * (L - 0.9) - 0.05, -0.7, -0.3), (s * (L - 0.9) + 0.05, -0.2, 0.3))
    for k in range(-8, 9):
        if k == 0:
            continue

        x = k * 1.2
        box(p, 'steel', (x - 0.02, -0.9, -0.1), (x + 0.02, -0.35, 0.1))
    box(p, 'safety', (-0.5, -1.0, -0.28), (0.5, -0.55, 0.28))                 # trolley
    cyl(p, 'steelDark', (0.0, -0.78, 0.0), 0.16, 0.5, axis='z', segs=10)       # hoist drum
    box(p, 'steelDark', (-0.06, -0.55, -0.3), (0.06, -0.3, 0.3))              # trolley hanger
    for x in (-0.5, 0.5):
        box(p, 'steelDark', (x - 0.04, -0.95, -0.3), (x + 0.04, -0.9, 0.3))


def clean_bench():
    """A laminar-flow bench against a wall (hull 1.8 x 2.2 x 0.8, front +z): cabinet, worktop, side cheeks, tinted sash, hood
    with the filter grille."""
    p = 'cleanBench'
    box(p, 'labWhite', (-0.9, 0.0, -0.4), (0.9, 0.85, 0.4))
    box(p, 'epoxy', (-0.9, 0.85, -0.4), (0.9, 0.9, 0.4))
    for s in (-1, 1):
        box(p, 'labWhite', (s * 0.9 - (0.05 if s > 0 else 0.0), 0.9, -0.4), (s * 0.9 + (0.0 if s > 0 else 0.05), 1.5, 0.4))
    box(p, 'labWhite', (-0.85, 0.9, -0.4), (0.85, 1.5, -0.35))
    box(p, 'plastic', (-0.85, 0.95, 0.36), (0.85, 1.45, 0.37))               # sash (recessed 3 cm)
    box(p, 'steelDark', (-0.85, 0.93, 0.35), (0.85, 0.95, 0.4))
    box(p, 'labWhite', (-0.9, 1.5, -0.4), (0.9, 2.2, 0.4))
    for k in range(5):
        x = -0.72 + k * 0.36
        box(p, 'galv', (x - 0.12, 1.55, 0.395), (x + 0.12, 2.1, 0.4))        # filter grille
    for x in (-0.6, 0.6):
        box(p, 'steelDark', (x - 0.03, 0.0, 0.38), (x + 0.03, 0.1, 0.4))
    box(p, 'safety', (0.7, 1.57, 0.38), (0.84, 1.61, 0.4))


def pass_box():
    """The clean room's wall pass-through hatch (wall piece, 0.6 x 0.6 x 0.15, back on the wall at z 0, mounted 0.9-1.5)."""
    p = 'passBox'
    box(p, 'steel', (-0.3, 0.9, 0.0), (0.3, 1.5, 0.12))
    box(p, 'galv', (-0.27, 0.93, 0.12), (0.27, 1.47, 0.135))
    box(p, 'plastic', (-0.22, 1.0, 0.135), (0.22, 1.4, 0.15))                # window
    box(p, 'steelDark', (-0.04, 0.95, 0.135), (0.04, 0.99, 0.15))            # handle
    for x, m in ((-0.22, 'safety'), (0.22, 'plastic')):
        box(p, m, (x - 0.025, 1.43, 0.135), (x + 0.025, 1.46, 0.15))         # interlock lamps


def sticky_mat():
    """The tacky mat at the gowning doors (floor, 1.2 x 0.005 x 0.9)."""
    box('stickyMat', 'epoxy', (-0.6, 0.0, -0.45), (0.6, 0.005, 0.45))


def hazard_plate():
    """A warning plate, no text (wall piece, 0.4 x 0.4 x 0.02, mounted 1.2-1.6): yellow plate, black diamond, bar."""
    p = 'hazardPlate'
    box(p, 'safety', (-0.2, 1.2, 0.0), (0.2, 1.6, 0.014))
    obox(p, 'plastic', (0.0, 1.4, 0.016), (0.22, 0.22, 0.004), roll=math.pi / 4)
    box(p, 'safety', (-0.015, 1.37, 0.018), (0.015, 1.46, 0.02))
    box(p, 'safety', (-0.015, 1.33, 0.018), (0.015, 1.355, 0.02))




def gas_bottles():
    """The gas cage's cylinder store (box 2.4 x 1.6 x 3.1; fits the greybox bottle block): 4 x 5 bottles, valve shoulders,
    chain rails over the tops, a plinth."""
    p = 'gasBottles'
    box(p, 'steelDark', (-1.205, 0.0, -1.555), (1.205, 0.08, 1.555))
    mats = ('red', 'safety', 'steel')
    for i in range(4):
        for j in range(5):
            x = -1.2 + 2.4 * (i + 0.5) / 4
            z = -1.55 + 3.1 * (j + 0.5) / 5
            m = mats[(i + j) % 3]
            cyl(p, m, (x, 0.79, z), 0.24, 1.38, segs=6)
            cyl(p, m, (x, 1.535, z), 0.24, 0.11, segs=6, r2=0.08)
    for z in (-1.0, 1.0):
        box(p, 'galv', (-1.205, 1.575, z - 0.02), (1.205, 1.605, z + 0.02))
    for x in (-1.2, 1.2):
        box(p, 'galv', (x - 0.005, 1.575, -1.555), (x + 0.005, 1.605, 1.555))


def log_desk():
    """The burn-in log desk (box 2 x 0.9 x 0.8; front +z): cabinet, worktop, a monitor and keyboard on top."""
    p = 'logDesk'
    box(p, 'labWhite', (-1.0, 0.0, -0.4), (1.0, 0.86, 0.4))
    box(p, 'epoxy', (-1.005, 0.86, -0.405), (1.005, 0.9, 0.405))
    for x in (-0.5, 0.5):
        box(p, 'steelDark', (x - 0.2, 0.1, 0.4), (x + 0.2, 0.7, 0.405))     # drawer fronts
    box(p, 'plastic', (-0.3, 0.9, -0.2), (0.3, 1.3, -0.14))                  # monitor
    box(p, 'steelDark', (-0.04, 0.9, -0.2), (0.04, 1.0, -0.12))
    box(p, 'steelDark', (-0.25, 0.9, 0.05), (0.25, 0.92, 0.25))              # keyboard
    box(p, 'white', (0.6, 0.9, -0.1), (0.9, 0.95, 0.15))                      # log book


BUILDERS = {
    'chamberWall': chamber_wall,
    'condensingUnit': condensing_unit,
    'emcPanel': emc_panel,
    'hoardingPanel': hoarding_panel,
    'stockShelf': stock_shelf,
    'craneGirder': crane_girder,
    'cleanBench': clean_bench,
    'passBox': pass_box,
    'stickyMat': sticky_mat,
    'hazardPlate': hazard_plate,
    'logDesk': log_desk,
    'gasBottles': gas_bottles,
}


def main():
    args = lib.common.parse_args({'--out': {'required': True}, '--name': {'default': 'hero-s3'}, '--only': {'default': ''}})
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
