"""Saltmarsh Park base kit K (sector-redesign ART-KIT step 3, ART-PLAN 3.2): the office, lab, data hall, Old House and
grounds furniture every campus room is dressed from, built headless.

  blender -b --factory-startup -noaudio --python-exit-code 1 --python kit.py -- --seed N --out DIR --name campus-kit [--only a,b]

Frames (facility PROPS.md section 1): a free-standing piece faces +z with its origin at the footprint centre on the
floor; a wall piece has its back on the wall face at z 0 and is modelled at its mount height over the floor; the hung
pieces (exitSign, ductRun) have the origin on the bottom edge; the ceiling pieces (ceilingDiffuser, smokeDetector,
ceilingGrid) have the origin on their top face (they hang below y 0). Sizes, budgets and classes: CAMPUS_KIT in
src/world/campusArt/campusKit.ts (the kit test holds this build's report against it). Low poly on purpose.
"""
import math
import os
import random
import sys

import bmesh
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import G, box, bm_of, cyl, obox, prism_x, to_blender, game_rot  # noqa: E402


def lin(h):
    """sRGB hex -> linear RGB (the glTF factor; the renderer replaces the look by name)."""
    return tuple(round((int(h[i:i + 2], 16) / 255) ** 2.2, 4) for i in (1, 3, 5))


# CAMPUS_LOOK / PROP_LOOK by name (src/world/campusArt/campusKit.ts K_MATERIALS, same order)
LOOK = [
    ('steel', '#7c7f82', 0.55, 0.6), ('steelDark', '#2c2e30', 0.5, 0.5), ('galv', '#adafb1', 0.45, 0.9),
    ('plastic', '#1b1b1c', 0.6, 0.0), ('fabric', '#2b2d31', 0.95, 0.0), ('glass', '#cfd8da', 0.05, 0.0),
    ('white', '#e8e8e4', 0.5, 0.0), ('red', '#c0262b', 0.5, 0.1), ('concrete', '#a5a29b', 0.9, 0.0),
    ('brass', '#c19a50', 0.3, 1.0), ('foliage', '#2f5a22', 0.8, 0.0), ('screen', '#05080a', 0.1, 0.0),
    ('laminate', '#b9b3a6', 0.5, 0.0), ('whiteGloss', '#e9e9e4', 0.25, 0.0), ('oakDark', '#4a2e17', 0.5, 0.0),
    ('leatherGreen', '#24402e', 0.55, 0.0), ('paper', '#d8d2c2', 0.9, 0.0), ('carPaint1', '#a9adb1', 0.3, 0.6),
    ('carPaint2', '#16181a', 0.3, 0.5), ('carPaint3', '#1f3f6e', 0.3, 0.5), ('carPaint4', '#e3e4e1', 0.3, 0.3),
    ('tyre', '#1a1a1a', 0.9, 0.0), ('chrome', '#c9cdd0', 0.15, 1.0), ('labWhite', '#dfe2e0', 0.45, 0.0),
    ('epoxy', '#6c7a6f', 0.35, 0.0), ('lead', '#5d6265', 0.7, 0.6), ('bark', '#3d2d20', 0.95, 0.0),
    ('leaf', '#2b4a22', 0.85, 0.0), ('exitGreen', '#1aff4d', 1.0, 0.0),
]
EMISSIVE = {'screen': (0.35, 0.55, 0.7), 'exitGreen': (0.1, 1.0, 0.3)}
lib.set_materials({n: (lin(h), r, m, EMISSIVE.get(n, (0, 0, 0))) for n, h, r, m in LOOK})


def quad(piece, mat, pts, n):
    """One face from four game-frame points, its normal turned to the game-frame direction n (single sided)."""
    bm = bm_of(piece, mat)
    vs = [bm.verts.new(G(*p)) for p in pts]
    f = bm.faces.new(vs)
    f.normal_update()
    want = G(*n)
    if f.normal.dot(want) < 0:
        f.normal_flip()


def blob(piece, mat, c, r, sx=1.0, sy=1.0, sz=1.0):
    """A low icosphere (80 tris) of radius r scaled per game axis about its centre c."""
    bm = bm_of(piece, mat)
    mg = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((r * sx, r * sy, r * sz, 1.0))
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0, matrix=to_blender(mg))


# ---------------------------------------------------------------------------------------------------------- office

def meeting_table():
    p = 'meetingTable'
    box(p, 'laminate', (-1.2, 0.71, -0.6), (1.2, 0.74, 0.6))
    for x in (-1.1, 1.1):
        for z in (-0.5, 0.5):
            box(p, 'steel', (x - 0.03, 0.0, z - 0.03), (x + 0.03, 0.71, z + 0.03))
    box(p, 'steel', (-1.05, 0.45, -0.02), (1.05, 0.69, 0.02))          # modesty / cable rail


def printer_mfd():
    p = 'printerMfd'
    box(p, 'white', (-0.3, 0.0, -0.325), (0.3, 0.95, 0.325), 0.01)
    box(p, 'plastic', (-0.27, 0.12, 0.3), (0.27, 0.13, 0.326))           # tray lines
    box(p, 'plastic', (-0.27, 0.42, 0.3), (0.27, 0.43, 0.326))
    box(p, 'steelDark', (-0.28, 0.95, -0.3), (0.28, 1.05, 0.3))          # scanner and lid
    box(p, 'plastic', (-0.25, 1.05, 0.05), (0.05, 1.15, 0.3))           # control panel


def water_cooler():
    p = 'waterCooler'
    box(p, 'white', (-0.16, 0.0, -0.16), (0.16, 1.0, 0.16))
    box(p, 'plastic', (-0.08, 0.72, 0.12), (0.08, 0.85, 0.16))          # tap recess
    cyl(p, 'glass', (0.0, 1.15, 0.0), 0.14, 0.3, segs=8)               # bottle


def locker_bank():
    p = 'lockerBank'
    box(p, 'steel', (-0.45, 0.0, -0.25), (0.45, 1.9, 0.24))
    for k in range(3):
        x0 = -0.44 + k * 0.296
        box(p, 'galv', (x0, 0.05, 0.24), (x0 + 0.286, 1.85, 0.25))
        box(p, 'chrome', (x0 + 0.22, 1.0, 0.25), (x0 + 0.25, 1.12, 0.256))         # handles
    box(p, 'plastic', (-0.44, 1.6, 0.25), (0.44, 1.62, 0.253))                  # vent line


def shelving():
    p = 'shelving'
    for x in (-0.6, 0.57):
        for z in (-0.25, 0.22):
            box(p, 'steel', (x, 0.0, z), (x + 0.03, 2.0, z + 0.03))
    for y in (0.08, 0.55, 1.02, 1.49, 1.96):
        box(p, 'galv', (-0.6, y, -0.25), (0.6, y + 0.03, 0.25))
    for k, y in enumerate((0.11, 0.58, 1.05, 1.52)):
        w = 0.9 - 0.12 * (k % 2)
        box(p, 'paper', (-w / 2, y, -0.2), (w / 2, y + 0.3, 0.18))


def whiteboard():
    p = 'whiteboard'
    box(p, 'galv', (-0.9, 0.9, 0.0), (0.9, 2.1, 0.015))
    box(p, 'whiteGloss', (-0.88, 0.92, 0.015), (0.88, 2.08, 0.02))
    box(p, 'galv', (-0.4, 0.9, 0.015), (0.4, 0.93, 0.04))                # pen tray


def notice_board():
    p = 'noticeBoard'
    box(p, 'oakDark', (-0.6, 1.1, 0.0), (0.6, 2.0, 0.02))
    box(p, 'paper', (-0.5, 1.3, 0.02), (-0.2, 1.7, 0.03))
    box(p, 'paper', (0.0, 1.45, 0.02), (0.42, 1.88, 0.03))


def wall_clock():
    p = 'wallClock'
    cyl(p, 'plastic', (0.0, 2.2, 0.0225), 0.175, 0.045, axis='z', segs=8)
    cyl(p, 'white', (0.0, 2.2, 0.0475), 0.15, 0.005, axis='z', segs=8)


def fire_extinguisher():
    p = 'fireExtinguisher'
    box(p, 'steelDark', (-0.04, 0.45, 0.0), (0.04, 0.75, 0.02))
    cyl(p, 'red', (0.0, 0.6, 0.105), 0.095, 0.6, segs=8)
    box(p, 'plastic', (-0.03, 0.9, 0.07), (0.03, 0.95, 0.15))


def fire_call_point():
    p = 'fireCallPoint'
    box(p, 'red', (-0.05, 1.35, 0.0), (0.05, 1.45, 0.04))
    box(p, 'white', (-0.03, 1.37, 0.04), (0.03, 1.43, 0.05))


def exit_sign():
    p = 'exitSign'
    box(p, 'white', (-0.2, 0.0, 0.0), (0.2, 0.15, 0.04))
    box(p, 'exitGreen', (-0.18, 0.02, 0.04), (0.18, 0.13, 0.05))


def ceiling_diffuser():
    p = 'ceilingDiffuser'
    box(p, 'white', (-0.3, -0.01, -0.3), (0.3, 0.0, 0.3))
    box(p, 'galv', (-0.2, -0.03, -0.2), (0.2, -0.01, 0.2))


def smoke_detector():
    cyl('smokeDetector', 'white', (0.0, -0.025, 0.0), 0.06, 0.05, segs=8)


def ceiling_grid():
    """A 3.6 m tile of 600 mm T-bar grid: the down face of each bar and one web face (the slab shows between)."""
    p = 'ceilingGrid'
    w = 0.012
    for k in range(7):
        t = -1.8 + 0.6 * k
        a, b = max(-1.8, t - w), min(1.8, t + w)
        quad(p, 'white', ((a, -0.02, -1.8), (b, -0.02, -1.8), (b, -0.02, 1.8), (a, -0.02, 1.8)), (0, -1, 0))
        quad(p, 'white', ((t, -0.02, -1.8), (t, 0.0, -1.8), (t, 0.0, 1.8), (t, -0.02, 1.8)), (1, 0, 0))
        quad(p, 'white', ((-1.8, -0.02, a), (1.8, -0.02, a), (1.8, -0.02, b), (-1.8, -0.02, b)), (0, -1, 0))
        quad(p, 'white', ((-1.8, -0.02, t), (-1.8, 0.0, t), (1.8, 0.0, t), (1.8, -0.02, t)), (0, 0, 1))


# --------------------------------------------------------------------------------------------------------- kitchen

def kitchen_run():
    p = 'kitchenRun'
    box(p, 'plastic', (-0.6, 0.0, -0.3), (0.6, 0.1, 0.25))
    box(p, 'whiteGloss', (-0.6, 0.1, -0.3), (0.6, 0.86, 0.28))
    box(p, 'plastic', (-0.003, 0.12, 0.28), (0.003, 0.84, 0.285))       # door split
    for x in (-0.08, 0.05):
        box(p, 'chrome', (x, 0.7, 0.28), (x + 0.03, 0.72, 0.295))
    box(p, 'laminate', (-0.6, 0.86, -0.3), (0.6, 0.9, 0.3))


def wall_cupboards():
    p = 'wallCupboards'
    box(p, 'whiteGloss', (-0.6, 1.45, 0.0), (0.6, 2.15, 0.34))
    box(p, 'plastic', (-0.003, 1.46, 0.34), (0.003, 2.14, 0.345))
    for x in (-0.08, 0.05):
        box(p, 'chrome', (x, 1.5, 0.34), (x + 0.03, 1.52, 0.35))


def fridge():
    p = 'fridge'
    box(p, 'whiteGloss', (-0.3, 0.0, -0.325), (0.3, 1.8, 0.31), 0.01)
    box(p, 'plastic', (-0.29, 1.1, 0.31), (0.29, 1.12, 0.315))
    box(p, 'chrome', (0.22, 0.7, 0.31), (0.25, 1.6, 0.325))


def vending_machine():
    p = 'vendingMachine'
    box(p, 'steelDark', (-0.45, 0.0, -0.4), (0.45, 1.85, 0.38))
    box(p, 'glass', (-0.4, 0.6, 0.38), (0.15, 1.75, 0.4))
    for k, y in enumerate((0.7, 0.95, 1.2, 1.45)):
        box(p, 'red' if k % 2 else 'white', (-0.38, y, 0.2), (0.13, y + 0.15, 0.37))
    box(p, 'screen', (0.2, 1.3, 0.38), (0.4, 1.5, 0.4))
    box(p, 'plastic', (0.2, 0.9, 0.38), (0.4, 1.25, 0.395))
    box(p, 'plastic', (-0.4, 0.2, 0.38), (0.15, 0.4, 0.395))


def cafe_table():
    p = 'cafeTable'
    box(p, 'laminate', (-0.45, 0.72, -0.45), (0.45, 0.75, 0.45))
    cyl(p, 'steel', (0.0, 0.36, 0.0), 0.04, 0.72, segs=6)
    box(p, 'steel', (-0.3, 0.0, -0.3), (0.3, 0.03, 0.3))


def cafe_chair():
    p = 'cafeChair'
    box(p, 'white', (-0.225, 0.43, -0.25), (0.225, 0.46, 0.25))
    box(p, 'white', (-0.225, 0.46, -0.25), (0.225, 0.85, -0.22))
    for x in (-0.2, 0.175):
        for z in (-0.23, 0.2):
            box(p, 'steel', (x, 0.0, z), (x + 0.025, 0.43, z + 0.025))


def recycling_bins():
    p = 'recyclingBins'
    for k, lid in enumerate(('red', 'galv', 'white')):
        x0 = -0.5 + k * 0.335
        box(p, 'steelDark', (x0, 0.0, -0.2), (x0 + 0.325, 0.86, 0.2))
        box(p, lid, (x0, 0.86, -0.2), (x0 + 0.325, 0.9, 0.2))


def planter_trough():
    p = 'planterTrough'
    box(p, 'concrete', (-1.0, 0.0, -0.4), (1.0, 0.66, 0.4))
    box(p, 'foliage', (-0.95, 0.66, -0.35), (0.95, 0.7, 0.35))


def plant_pot():
    p = 'plantPot'
    cyl(p, 'whiteGloss', (0.0, 0.25, 0.0), 0.25, 0.5, segs=8, r2=0.22)
    cyl(p, 'bark', (0.0, 0.7, 0.0), 0.03, 0.5, segs=6)
    box(p, 'leaf', (-0.3, 0.75, -0.3), (0.3, 1.15, 0.3))
    obox(p, 'leaf', (0.0, 1.25, 0.0), (0.38, 0.4, 0.38), yaw=math.pi / 4)
    obox(p, 'leaf', (0.0, 1.45, 0.0), (0.25, 0.3, 0.25), yaw=0.3)


# ------------------------------------------------------------------------------------------------------------- lab

def lab_bench():
    p = 'labBench'
    box(p, 'labWhite', (-1.5, 0.0, -0.45), (1.5, 0.87, 0.45))
    box(p, 'epoxy', (-1.5, 0.87, -0.45), (1.5, 0.9, 0.45))
    for x in (-0.75, 0.0, 0.75):
        box(p, 'plastic', (x - 0.003, 0.08, 0.45 - 0.004), (x + 0.003, 0.84, 0.45))   # door lines
    for x in (-1.45, -0.02, 1.41):
        box(p, 'steel', (x, 0.9, -0.03), (x + 0.04, 1.6, 0.03))                    # reagent shelf uprights
    for y in (1.22, 1.56):
        box(p, 'galv', (-1.5, y, -0.15), (1.5, y + 0.03, 0.15))
    box(p, 'paper', (-1.2, 1.25, -0.12), (-0.4, 1.4, 0.1))
    box(p, 'glass', (0.3, 1.25, -0.1), (1.1, 1.42, 0.1))


def fume_hood():
    p = 'fumeHood'
    box(p, 'labWhite', (-0.75, 0.0, -0.45), (0.75, 0.9, 0.45))
    box(p, 'epoxy', (-0.7, 0.9, -0.4), (0.7, 0.93, 0.4))
    for x in (-0.75, 0.7):
        box(p, 'labWhite', (x, 0.9, -0.45), (x + 0.05, 2.0, 0.45))
    box(p, 'labWhite', (-0.7, 0.9, -0.45), (0.7, 2.0, -0.4))
    box(p, 'labWhite', (-0.75, 2.0, -0.45), (0.75, 2.4, 0.45))
    box(p, 'glass', (-0.7, 1.1, 0.38), (0.7, 1.9, 0.4))
    box(p, 'steel', (-0.7, 0.93, 0.38), (0.7, 0.96, 0.45))


def gas_cylinders():
    p = 'gasCylinders'
    for x in (-0.6, 0.57):
        box(p, 'steel', (x, 0.0, -0.2), (x + 0.03, 1.5, -0.17))
    for y in (0.6, 1.2):
        box(p, 'steel', (-0.6, y, 0.17), (0.6, y + 0.04, 0.2))
        box(p, 'steel', (-0.6, y, -0.2), (0.6, y + 0.04, -0.17))
    for k, x in enumerate((-0.42, -0.14, 0.14, 0.42)):
        cyl(p, 'galv' if k % 2 else 'white', (x, 0.725, 0.0), 0.11, 1.45, segs=8)
        cyl(p, 'brass', (x, 1.575, 0.0), 0.04, 0.25, segs=6)


def instrument_cart():
    p = 'instrumentCart'
    for x in (-0.3, 0.27):
        for z in (-0.25, 0.22):
            box(p, 'steel', (x, 0.08, z), (x + 0.03, 1.0, z + 0.03))
            box(p, 'plastic', (x, 0.0, z), (x + 0.03, 0.08, z + 0.03))
    for y in (0.2, 0.6, 0.97):
        box(p, 'galv', (-0.3, y, -0.25), (0.3, y + 0.03, 0.25))
    box(p, 'steelDark', (-0.22, 0.63, -0.18), (0.22, 0.85, 0.18))
    box(p, 'plastic', (-0.2, 1.0, -0.15), (0.15, 1.1, 0.15))


# ------------------------------------------------------------------------------------------------------- data hall

def battery_rack():
    p = 'batteryRack'
    for x in (-1.0, 0.97):
        for z in (-0.4, 0.37):
            box(p, 'steelDark', (x, 0.0, z), (x + 0.03, 1.2, z + 0.03))
    for y in (0.05, 0.45, 0.85):
        box(p, 'steelDark', (-1.0, y, -0.4), (1.0, y + 0.03, 0.4))
        box(p, 'plastic', (-0.95, y + 0.03, -0.35), (0.95, y + 0.3, 0.35))
        box(p, 'red', (-0.9, y + 0.3, 0.2), (0.9, y + 0.32, 0.25))
    box(p, 'steelDark', (-1.0, 1.17, -0.4), (1.0, 1.2, 0.4))


def pdu_strip():
    p = 'pduStrip'
    box(p, 'steelDark', (-0.075, 0.2, 0.0), (0.075, 2.0, 0.09))
    box(p, 'plastic', (-0.05, 0.3, 0.09), (0.05, 1.9, 0.1))


def floor_tile_grid():
    """Raised-floor grid lines (600 mm): up faces 1 cm over the floor; the next tile's first line closes the +x / +z edge."""
    p = 'floorTileGrid'
    w = 0.008
    for k in range(5):
        t = -1.5 + 0.6 * k
        a, b = max(-1.5, t - w), t + w
        quad(p, 'steelDark', ((a, 0.01, -1.5), (b, 0.01, -1.5), (b, 0.01, 1.5), (a, 0.01, 1.5)), (0, 1, 0))
        quad(p, 'steelDark', ((-1.5, 0.01, a), (1.5, 0.01, a), (1.5, 0.01, b), (-1.5, 0.01, b)), (0, 1, 0))


# ------------------------------------------------------------------------------------------------------- old house

def bookcase():
    p = 'bookcase'
    for x in (-0.5, 0.47):
        box(p, 'oakDark', (x, 0.0, -0.2), (x + 0.03, 2.2, 0.2))
    box(p, 'oakDark', (-0.47, 0.0, -0.2), (0.47, 0.1, 0.2))
    box(p, 'oakDark', (-0.5, 2.15, -0.2), (0.5, 2.2, 0.2))
    box(p, 'oakDark', (-0.47, 0.1, -0.2), (0.47, 2.15, -0.18))
    for k, y in enumerate((0.1, 0.62, 1.12, 1.62)):
        if k:
            box(p, 'oakDark', (-0.47, y - 0.03, -0.18), (0.47, y, 0.2))
        box(p, 'paper' if k % 2 else 'red', (-0.45, y, -0.17), (0.2 + 0.05 * k, y + 0.32, 0.12))
        box(p, 'leatherGreen', (0.22 + 0.05 * k, y, -0.17), (0.45, y + 0.27, 0.12))


def board_table():
    p = 'boardTable'
    box(p, 'oakDark', (-2.0, 0.72, -0.7), (2.0, 0.75, 0.7))
    box(p, 'leatherGreen', (-1.8, 0.75, -0.5), (1.8, 0.76, 0.5))
    for x in (-1.5, 1.1):
        box(p, 'oakDark', (x, 0.0, -0.4), (x + 0.4, 0.72, 0.4))
    box(p, 'oakDark', (-1.1, 0.5, -0.05), (1.1, 0.62, 0.05))


def chesterfield():
    p = 'chesterfield'
    for x in (-0.95, 0.9):
        for z in (-0.4, 0.35):
            box(p, 'oakDark', (x, 0.0, z), (x + 0.05, 0.08, z + 0.05))
    box(p, 'leatherGreen', (-0.8, 0.08, -0.3), (0.8, 0.44, 0.45), 0.04)
    box(p, 'leatherGreen', (-1.0, 0.08, -0.45), (1.0, 0.8, -0.3), 0.05)
    for x in (-1.0, 0.8):
        box(p, 'leatherGreen', (x, 0.08, -0.45), (x + 0.2, 0.7, 0.45), 0.05)


def wing_chair():
    p = 'wingChair'
    for x in (-0.35, 0.3):
        for z in (-0.35, 0.3):
            box(p, 'oakDark', (x, 0.0, z), (x + 0.05, 0.12, z + 0.05))
    box(p, 'fabric', (-0.4, 0.12, -0.4), (0.4, 0.45, 0.4))
    box(p, 'fabric', (-0.4, 0.45, -0.4), (0.4, 1.1, -0.25))
    for x in (-0.4, 0.3):
        box(p, 'fabric', (x, 0.45, -0.25), (x + 0.1, 0.95, 0.2))
    box(p, 'leatherGreen', (-0.3, 0.45, -0.25), (0.3, 0.52, 0.38))


def fireplace():
    p = 'fireplace'
    box(p, 'concrete', (-0.8, 0.0, 0.0), (0.8, 0.15, 0.5))
    box(p, 'white', (-0.8, 0.15, 0.0), (-0.45, 1.0, 0.15))
    box(p, 'white', (0.45, 0.15, 0.0), (0.8, 1.0, 0.15))
    box(p, 'white', (-0.8, 1.0, 0.0), (0.8, 1.25, 0.15))
    box(p, 'oakDark', (-0.8, 1.25, 0.0), (0.8, 1.3, 0.2))
    box(p, 'steelDark', (-0.45, 0.15, 0.0), (0.45, 1.0, 0.02))
    box(p, 'steelDark', (-0.3, 0.15, 0.05), (0.3, 0.3, 0.3))
    box(p, 'brass', (-0.5, 0.15, 0.4), (0.5, 0.25, 0.42))


def portrait_frame():
    p = 'portraitFrame'
    box(p, 'brass', (-0.4, 1.4, 0.0), (0.4, 2.4, 0.04))
    box(p, 'fabric', (-0.33, 1.47, 0.04), (0.33, 2.33, 0.05))


def sideboard():
    p = 'sideboard'
    for x in (-0.97, 0.92):
        for z in (-0.23, 0.18):
            box(p, 'oakDark', (x, 0.0, z), (x + 0.05, 0.12, z + 0.05))
    box(p, 'oakDark', (-1.0, 0.12, -0.25), (1.0, 0.86, 0.24))
    box(p, 'oakDark', (-1.0, 0.86, -0.25), (1.0, 0.9, 0.25))
    box(p, 'plastic', (-0.003, 0.15, 0.24), (0.003, 0.83, 0.245))
    for x in (-0.12, 0.09):
        box(p, 'brass', (x, 0.5, 0.24), (x + 0.03, 0.56, 0.25))


def longcase_clock():
    p = 'longcaseClock'
    box(p, 'oakDark', (-0.25, 0.0, -0.15), (0.25, 0.5, 0.15))
    box(p, 'oakDark', (-0.18, 0.5, -0.12), (0.18, 1.6, 0.12))
    box(p, 'oakDark', (-0.22, 1.6, -0.14), (0.22, 2.05, 0.14))
    box(p, 'white', (-0.15, 1.68, 0.14), (0.15, 1.98, 0.15))
    box(p, 'oakDark', (-0.25, 2.05, -0.15), (0.25, 2.1, 0.15))
    box(p, 'brass', (-0.06, 0.8, 0.12), (0.06, 1.4, 0.13))


def radiator_cast():
    p = 'radiatorCast'
    for k in range(9):
        x = -0.5 + 0.06 + k * 0.11
        box(p, 'white', (x - 0.04, 0.0, 0.03), (x + 0.04, 0.7, 0.15))
    box(p, 'white', (-0.5, 0.08, 0.0), (0.5, 0.12, 0.15))
    box(p, 'white', (-0.5, 0.58, 0.0), (0.5, 0.62, 0.15))


def radiator_panel():
    p = 'radiatorPanel'
    box(p, 'white', (-0.6, 0.15, 0.02), (0.6, 0.75, 0.1))
    box(p, 'galv', (-0.45, 0.6, 0.0), (0.45, 0.63, 0.02))


def stove_range():
    p = 'stoveRange'
    box(p, 'plastic', (-0.6, 0.0, -0.325), (0.6, 0.08, 0.28))
    box(p, 'whiteGloss', (-0.6, 0.08, -0.325), (0.6, 0.85, 0.3), 0.02)
    for x in (-0.55, 0.05):
        box(p, 'chrome', (x, 0.85, -0.25), (x + 0.5, 0.9, 0.2))
        box(p, 'chrome', (x + 0.05, 0.25, 0.3), (x + 0.45, 0.7, 0.325))
    box(p, 'chrome', (-0.58, 0.76, 0.31), (0.58, 0.78, 0.325))


# --------------------------------------------------------------------------------------------------------- grounds

def car(p, paint):
    """A hatchback: the body to 0.95 (bonnet and boot lower at the ends), the cabin to 1.5 over the middle 2.4, four
    wheels; 1.8 x 1.5 x 4.2, front +z (CAR_PROFILE in campusKit.ts is its hull)."""
    side = [(-2.1, 0.3), (2.1, 0.3), (2.1, 0.62), (1.95, 0.78), (1.3, 0.9), (1.15, 0.95), (-1.9, 0.95), (-2.1, 0.82)]
    prism_x(p, paint, side, -0.9, 0.9)
    prism_x(p, 'glass', [(-1.2, 0.95), (1.15, 0.95), (0.55, 1.42), (-1.0, 1.42)], -0.8, 0.8)
    box(p, paint, (-0.75, 1.42, -0.95), (0.75, 1.5, 0.5))
    box(p, 'plastic', (-0.85, 0.15, -1.9), (0.85, 0.3, 1.9))
    for z in (-2.1, 2.06):
        box(p, 'plastic', (-0.88, 0.3, z), (0.88, 0.45, z + 0.04))
    for s in (-1, 1):
        box(p, 'white', (s * 0.62 - 0.15, 0.62, 2.06), (s * 0.62 + 0.15, 0.72, 2.1))
        box(p, 'red', (s * 0.66 - 0.12, 0.7, -2.1), (s * 0.66 + 0.12, 0.8, -2.06))
        for z in (-1.35, 1.35):
            cyl(p, 'tyre', (s * 0.79, 0.32, z), 0.32, 0.22, axis='x', segs=12)
            cyl(p, 'chrome', (s * 0.895, 0.32, z), 0.18, 0.01, axis='x', segs=8)


def bike_rack():
    """Three bikes in a low toast rack (galvanised stands), parked along x."""
    p = 'bikeRack'
    for z in (-0.2, 0.0, 0.2):
        box(p, 'galv', (-0.95, 0.0, z - 0.1), (-0.9, 0.5, z - 0.08))
        box(p, 'galv', (-0.95, 0.45, z - 0.1), (0.95, 0.5, z - 0.08))
        for x in (-0.55, 0.55):
            cyl(p, 'tyre', (x, 0.33, z), 0.33, 0.03, axis='z', segs=8)
        obox(p, 'red' if z == 0.0 else 'steelDark', (0.0, 0.5, z), (1.0, 0.04, 0.03), roll=0.0)
        obox(p, 'red' if z == 0.0 else 'steelDark', (-0.25, 0.45, z), (0.62, 0.04, 0.03), roll=0.9)
        obox(p, 'red' if z == 0.0 else 'steelDark', (0.3, 0.45, z), (0.62, 0.04, 0.03), roll=-0.9)
        box(p, 'plastic', (-0.3, 0.88, z - 0.03), (-0.1, 0.92, z + 0.03))       # saddle
        box(p, 'plastic', (0.4, 0.95, z - 0.09), (0.44, 1.0, z + 0.09))         # bars
    box(p, 'galv', (-1.0, 0.0, -0.3), (-0.97, 0.05, 0.3))
    box(p, 'galv', (0.97, 0.0, -0.3), (1.0, 0.05, 0.3))


def wheelie_bin():
    p = 'wheelieBin'
    box(p, 'plastic', (-0.28, 0.05, -0.35), (0.28, 1.05, 0.33))
    box(p, 'foliage', (-0.3, 1.05, -0.375), (0.3, 1.1, 0.375))
    box(p, 'plastic', (-0.25, 0.95, -0.375), (0.25, 1.0, -0.35))
    for x in (-0.24, 0.24):
        cyl(p, 'tyre', (x, 0.1, -0.27), 0.1, 0.06, axis='x', segs=8)


def bin_large():
    p = 'binLarge'
    box(p, 'galv', (-0.7, 0.12, -0.55), (0.7, 1.1, 0.5))
    box(p, 'plastic', (-0.7, 1.1, -0.55), (0.7, 1.2, 0.55))
    for x in (-0.6, 0.5):
        for z in (-0.45, 0.35):
            box(p, 'plastic', (x, 0.0, z), (x + 0.1, 0.12, z + 0.1))
    box(p, 'galv', (-0.6, 0.9, 0.5), (0.6, 0.95, 0.55))


def park_bench():
    p = 'parkBench'
    for x in (-0.85, 0.8):
        box(p, 'steelDark', (x, 0.0, -0.3), (x + 0.05, 0.42, 0.3))
        obox(p, 'steelDark', (x + 0.025, 0.6, -0.24), (0.05, 0.4, 0.05), pitch=-0.2)
    for k in range(3):
        z = 0.28 - k * 0.14
        box(p, 'oakDark', (-0.9, 0.4, z - 0.12), (0.9, 0.44, z))
    for y in (0.55, 0.7):
        box(p, 'oakDark', (-0.9, y, -0.3), (0.9, y + 0.1, -0.26))


def litter_bin():
    p = 'litterBin'
    cyl(p, 'steelDark', (0.0, 0.425, 0.0), 0.225, 0.85, segs=8)
    cyl(p, 'galv', (0.0, 0.875, 0.0), 0.2, 0.05, segs=8)


def feeder_pillar():
    p = 'feederPillar'
    box(p, 'concrete', (-0.78, 0.0, -0.18), (0.78, 0.1, 0.18))
    box(p, 'steel', (-0.8, 0.1, -0.2), (0.8, 1.45, 0.19))
    box(p, 'steelDark', (-0.8, 1.45, -0.2), (0.8, 1.5, 0.2))
    for x in (-0.003, 0.4):
        box(p, 'plastic', (x - 0.003, 0.15, 0.19), (x + 0.003, 1.4, 0.195))
    box(p, 'red', (-0.2, 1.1, 0.19), (0.0, 1.25, 0.2))


def site_sign():
    p = 'siteSign'
    box(p, 'concrete', (-0.7, 0.0, -0.13), (0.7, 0.1, 0.13))
    box(p, 'steelDark', (-0.75, 0.1, -0.15), (0.75, 2.2, 0.14))
    box(p, 'white', (-0.6, 1.3, 0.14), (0.6, 1.9, 0.15))
    box(p, 'white', (-0.6, 0.5, 0.14), (0.6, 1.1, 0.15))


def reeds(rng):
    p = 'reeds'
    pts = [(-0.97, 0.0), (0.97, 0.0), (0.0, -0.97), (0.0, 0.97)]
    while len(pts) < 22:
        x, z = rng.uniform(-0.9, 0.9), rng.uniform(-0.9, 0.9)
        if x * x + z * z <= 0.85:
            pts.append((x, z))
    for k, (x, z) in enumerate(pts):
        h = 0.32 + 0.17 * rng.random() if k >= 4 else 0.3
        obox(p, 'leaf', (x, h / 2, z), (0.03, h, 0.03), yaw=rng.uniform(0, math.pi), pitch=rng.uniform(-0.15, 0.15))


def tree_skin():
    """The trunk over a greybox pillar (r 0.3, 5 m; fit to the S5 r 0.35 x 6 m) and a canopy from 3.0."""
    p = 'treeSkin'
    cyl(p, 'bark', (0.0, 2.5, 0.0), 0.33, 5.0, segs=8, r2=0.31)
    for yaw, pitch in ((0.4, 0.6), (2.5, 0.55), (4.4, 0.65)):
        obox(p, 'bark', (0.35 * math.sin(yaw), 3.6, 0.35 * math.cos(yaw)), (0.1, 1.2, 0.1), yaw=yaw, pitch=pitch)
    blob(p, 'leaf', (0.0, 4.9, 0.0), 1.6, 1.25, 1.0, 1.25)
    blob(p, 'leaf', (0.9, 4.0, 0.3), 0.9, 1.2, 0.9, 1.0)
    blob(p, 'leaf', (-0.8, 4.2, -0.6), 0.95, 1.2, 0.9, 1.15)
    blob(p, 'leaf', (-0.2, 5.6, 0.4), 0.9, 1.2, 1.0, 1.2)
    blob(p, 'leaf', (0.3, 3.9, -1.0), 0.8, 1.1, 0.9, 1.1)


def hedge():
    p = 'hedge'
    box(p, 'foliage', (-0.5, 0.0, -0.28), (0.5, 1.17, 0.28), 0.04)
    obox(p, 'foliage', (-0.25, 1.1, 0.0), (0.45, 0.2, 0.55), yaw=0.1)
    obox(p, 'foliage', (0.25, 1.08, 0.02), (0.45, 0.24, 0.52), yaw=-0.12)


def ac_condenser():
    p = 'acCondenser'
    for x in (-0.5, 0.45):
        for z in (-0.225, 0.175):
            box(p, 'galv', (x, 0.0, z), (x + 0.05, 0.15, z + 0.05))
    box(p, 'white', (-0.5, 0.15, -0.225), (0.5, 1.0, 0.2))
    cyl(p, 'steelDark', (-0.1, 0.575, 0.2125), 0.3, 0.025, axis='z', segs=12)
    box(p, 'galv', (0.3, 0.2, 0.2), (0.48, 0.95, 0.225))


def roof_cowl():
    p = 'roofCowl'
    cyl(p, 'lead', (0.0, 0.25, 0.0), 0.15, 0.5, segs=8)
    cyl(p, 'lead', (0.0, 0.65, 0.0), 0.25, 0.3, segs=8, r2=0.1)


def duct_run():
    p = 'ductRun'
    box(p, 'galv', (-0.48, 0.01, -0.28), (0.48, 0.39, 0.28))
    for x in (-0.5, 0.47):
        box(p, 'steel', (x, 0.0, -0.3), (x + 0.03, 0.4, 0.3))


BUILDERS = {
    'meetingTable': meeting_table,
    'printerMfd': printer_mfd,
    'waterCooler': water_cooler,
    'lockerBank': locker_bank,
    'shelving': shelving,
    'whiteboard': whiteboard,
    'noticeBoard': notice_board,
    'wallClock': wall_clock,
    'fireExtinguisher': fire_extinguisher,
    'fireCallPoint': fire_call_point,
    'exitSign': exit_sign,
    'ceilingDiffuser': ceiling_diffuser,
    'smokeDetector': smoke_detector,
    'ceilingGrid': ceiling_grid,
    'kitchenRun': kitchen_run,
    'wallCupboards': wall_cupboards,
    'fridge': fridge,
    'vendingMachine': vending_machine,
    'cafeTable': cafe_table,
    'cafeChair': cafe_chair,
    'recyclingBins': recycling_bins,
    'planterTrough': planter_trough,
    'plantPot': plant_pot,
    'labBench': lab_bench,
    'fumeHood': fume_hood,
    'gasCylinders': gas_cylinders,
    'instrumentCart': instrument_cart,
    'batteryRack': battery_rack,
    'pduStrip': pdu_strip,
    'floorTileGrid': floor_tile_grid,
    'bookcase': bookcase,
    'boardTable': board_table,
    'chesterfield': chesterfield,
    'wingChair': wing_chair,
    'fireplace': fireplace,
    'portraitFrame': portrait_frame,
    'sideboard': sideboard,
    'longcaseClock': longcase_clock,
    'radiatorCast': radiator_cast,
    'radiatorPanel': radiator_panel,
    'stoveRange': stove_range,
    'carSilver': lambda: car('carSilver', 'carPaint1'),
    'carBlack': lambda: car('carBlack', 'carPaint2'),
    'carBlue': lambda: car('carBlue', 'carPaint3'),
    'carWhite': lambda: car('carWhite', 'carPaint4'),
    'bikeRack': bike_rack,
    'wheelieBin': wheelie_bin,
    'binLarge': bin_large,
    'parkBench': park_bench,
    'litterBin': litter_bin,
    'feederPillar': feeder_pillar,
    'siteSign': site_sign,
    'reeds': None,          # seeded (rng)
    'treeSkin': tree_skin,
    'hedge': hedge,
    'acCondenser': ac_condenser,
    'roofCowl': roof_cowl,
    'ductRun': duct_run,
}


def main():
    args = lib.common.parse_args({'--out': {'required': True}, '--name': {'default': 'campus-kit'}, '--only': {'default': ''}})
    lib.common.check_version()
    lib.common.empty_scene()
    lib.common.seed_everything(args.seed)
    only = {s for s in args.only.split(',') if s}
    for name, fn in BUILDERS.items():
        if only and name not in only:
            continue
        if name == 'reeds':
            reeds(random.Random(args.seed))
        else:
            fn()
    lib.export(lib.PIECES, args.out, args.name, args.seed)


main()
