"""Saltmarsh Park section 2 hero set H2 (sector-redesign ART-S2, briefs/ART-S2.md section 3): the HQ atrium, reception, cafe,
post room, facilities office and lift doors, built headless.

  blender -b --factory-startup -noaudio --python-exit-code 1 --python hero_s2.py -- --seed N --out DIR --name hero-s2 [--only a,b]

Frames (campus kit): a free-standing piece faces +z with its origin at the footprint centre on the floor; the wall piece
`logoWall` has its back on the wall face at z 0 and is modelled at its mount height (1.2-2.4). Every skin hull is the
greybox size plus 1 cm a side in plan and 1 cm on top (the skin rule: encloses the box, at most 5 cm proud), except
`balconyPlanter` (exactly the box in plan and height: 0 cm proud on its -x face) and the `lowTable` (a solid: its hull is its
boxes' size). Sizes and budgets: HERO_S2 in src/world/maps/campusS2Dress.ts. Low poly on purpose.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import box, cyl  # noqa: E402


def lin(h):
    """sRGB hex -> linear RGB (the glTF factor; the renderer replaces the look by name)."""
    return tuple(round((int(h[i:i + 2], 16) / 255) ** 2.2, 4) for i in (1, 3, 5))


# CAMPUS_LOOK / PROP_LOOK by name (same colours, roughness, metallic)
LOOK = [
    ('steel', '#7c7f82', 0.55, 0.6), ('steelDark', '#2c2e30', 0.5, 0.5), ('galv', '#adafb1', 0.45, 0.9),
    ('plastic', '#1b1b1c', 0.6, 0.0), ('white', '#e8e8e4', 0.5, 0.0), ('whiteGloss', '#e9e9e4', 0.25, 0.0),
    ('laminate', '#b9b3a6', 0.5, 0.0), ('oak', '#6b4423', 0.45, 0.0), ('marble', '#e4e0d8', 0.15, 0.0),
    ('timber', '#a8875c', 0.85, 0.0), ('glass', '#cfd8da', 0.05, 0.0),
    ('foliage', '#2f5a22', 0.8, 0.0), ('chrome', '#c9cdd0', 0.15, 1.0),
]
EMISSIVE = {'screen': (0.35, 0.55, 0.7), 'lamp': (1.0, 1.0, 1.0)}
TABLE = {n: (lin(h), r, m, (0, 0, 0)) for n, h, r, m in LOOK}
TABLE['screen'] = (lin('#05080a'), 0.1, 0.0, EMISSIVE['screen'])
TABLE['lamp'] = ((1, 1, 1), 1.0, 0.0, EMISSIVE['lamp'])
lib.set_materials(TABLE)

E = 0.01  # the skin's margin: 1 cm a side in plan, 1 cm on top


def monitor(p, cx, y0, z, w=0.5, h=0.32, face=-1):
    """A desk monitor on a neck, its screen on the staff side (face -1: toward -z)."""
    t = 0.03
    box(p, 'steelDark', (cx - 0.12, y0, z - 0.1), (cx + 0.12, y0 + 0.012, z + 0.1))
    box(p, 'steelDark', (cx - 0.02, y0, z - 0.02), (cx + 0.02, y0 + 0.12, z + 0.02))
    box(p, 'plastic', (cx - w / 2, y0 + 0.12, z - t / 2), (cx + w / 2, y0 + 0.12 + h, z + t / 2))
    if face < 0:
        box(p, 'screen', (cx - w / 2 + 0.02, y0 + 0.14, z - t / 2 - 0.003), (cx + w / 2 - 0.02, y0 + 0.10 + h, z - t / 2))
    else:
        box(p, 'screen', (cx - w / 2 + 0.02, y0 + 0.14, z + t / 2), (cx + w / 2 - 0.02, y0 + 0.10 + h, z + t / 2 + 0.003))


# ------------------------------------------------------------------------------------------------- reception and cafe

def reception_counter():
    """3.0 x 1.1 x 0.8: oak visitor front (+z), brushed steel kick, marble transaction top, two monitors behind."""
    p = 'receptionCounter'
    x = 1.5 + E
    box(p, 'steel', (-x, 0.0, -0.4 - E), (x, 0.1, 0.4 + E))                           # kick plate (the whole footprint)
    box(p, 'oak', (-1.5, 0.1, 0.02), (1.5, 1.04, 0.4), 0.01)                         # the tall visitor front
    box(p, 'marble', (-x, 1.04, 0.0), (x, 1.1 + E, 0.4 + E))                         # transaction top
    box(p, 'oak', (-1.5, 0.1, -0.4), (1.5, 0.74, 0.02))                              # the low staff side
    box(p, 'laminate', (-x, 0.74, -0.4 - E), (x, 0.77, 0.02))                        # staff worktop
    box(p, 'steel', (-1.48, 0.62, 0.4), (1.48, 0.66, 0.41), 0.0)                     # a steel inlay line in the front
    for cx in (-0.7, 0.7):
        monitor(p, cx, 0.77, -0.2, 0.52, 0.34, -1)


def speed_gate():
    """1.0 x 1.1 x 0.3: steel cabinet, glass top strip (flaps retracted), green status LED (lamp)."""
    p = 'speedGate'
    box(p, 'steel', (-0.5 - E, 0.0, -0.15 - E), (0.5 + E, 0.95, 0.15 + E), 0.01)
    box(p, 'steelDark', (-0.5 - E, 0.0, -0.15 - E), (0.5 + E, 0.06, 0.15 + E))       # plinth
    box(p, 'glass', (-0.48, 0.95, -0.10), (0.48, 1.05, 0.10))                         # the glass top strip
    box(p, 'steelDark', (-0.5 - E, 1.05, -0.15 - E), (0.5 + E, 1.1 + E, 0.15 + E))   # cap
    box(p, 'lamp', (-0.07, 0.99, 0.15 + E), (0.07, 1.03, 0.15 + E + 0.002))          # the status LED (front, high)


def cafe_counter():
    """3.0 x 1.1 x 0.6: timber slat front, quartz top, a coffee machine and a cake cabinet on top (overhang)."""
    p = 'cafeCounter'
    x = 1.5 + E
    box(p, 'steelDark', (-1.5, 0.0, -0.3), (1.5, 1.04, 0.26))                         # carcass
    box(p, 'steelDark', (-x, 0.0, -0.3 - E), (x, 0.06, 0.3 + E))                      # plinth
    for i in range(10):                                                                # slat front (10 slats)
        cx = -1.35 + i * 0.3
        box(p, 'timber', (cx - 0.07, 0.06, 0.26), (cx + 0.07, 1.04, 0.3 + E))
    box(p, 'whiteGloss', (-x, 1.04, -0.3 - E), (x, 1.1 + E, 0.3 + E))                 # quartz top
    box(p, 'steelDark', (-1.2, 1.11, -0.22), (-0.7, 1.4, 0.1), 0.01)                  # coffee machine body
    box(p, 'chrome', (-1.15, 1.3, 0.1), (-0.75, 1.34, 0.14))                          # group head
    box(p, 'plastic', (-1.1, 1.11, 0.02), (-0.8, 1.2, 0.1))                           # drip tray
    box(p, 'white', (0.3, 1.11, -0.22), (1.1, 1.45, 0.2), 0.01)                       # cake cabinet
    box(p, 'plastic', (0.34, 1.16, 0.2), (1.06, 1.4, 0.205))                          # its dark window
    box(p, 'steel', (0.3, 1.45, -0.22), (1.1, 1.47, 0.2))                             # roof


# ------------------------------------------------------------------------------------------------------ post and stock

def mail_cage():
    """2.2 x 1.8 x 0.9: pigeon-hole sorting frame (left) and two roll cages (right), full (reads solid)."""
    p = 'mailCage'
    x = 1.1 + E
    z = 0.45 + E
    box(p, 'galv', (-x, 0.0, -z), (x, 1.8 + E, -z + 0.03))                            # back panel
    box(p, 'galv', (-x, 0.0, -z), (-x + 0.04, 1.8 + E, z))                            # end posts / sides
    box(p, 'galv', (x - 0.04, 0.0, -z), (x, 1.8 + E, z))
    box(p, 'galv', (0.05, 0.0, -z), (0.09, 1.8 + E, z))                               # divider
    for y in (0.35, 0.7, 1.05, 1.4):                                                   # pigeon-hole shelves
        box(p, 'galv', (-x, y, -z), (0.05, y + 0.02, z))
    box(p, 'galv', (-x, 1.8, -z), (x, 1.8 + E, z))                                    # top
    for i, y in enumerate((0.04, 0.39, 0.74, 1.09)):                                   # parcels in the pigeon-holes
        box(p, 'timber', (-1.0 + 0.1 * (i % 2), y + 0.02, -0.38), (-0.2 + 0.1 * (i % 2), y + 0.28, 0.3))
    box(p, 'timber', (0.15, 0.1, -0.4), (1.0, 0.85, 0.4))                          # roll cage 1: mail sacks stacked
    box(p, 'white', (0.15, 0.9, -0.4), (1.0, 1.6, 0.4))                               # roll cage 2: bagged post
    box(p, 'steel', (0.1, 0.86, -z), (x - 0.04, 0.89, z))                             # the cage shelf
    for s in (0.2, 0.9):
        box(p, 'plastic', (s - 0.03, 0.0, -0.4), (s + 0.03, 0.1, -0.34))              # castors


def switch_board():
    """2.2 x 1.8 x 0.9 fit (L1): a switchgear line-up of three steel door panels with handles and an indicator strip."""
    p = 'switchBoard'
    x = 1.1 + E
    z = 0.45 + E
    box(p, 'steel', (-x, 0.0, -z), (x, 1.8 + E, z - 0.04), 0.01)                       # carcass
    box(p, 'steelDark', (-x, 0.0, -z), (x, 0.1, z))                                    # plinth
    for i in range(3):
        x0 = -1.1 + i * 0.74 + 0.04
        box(p, 'galv', (x0, 0.14, z - 0.04), (x0 + 0.66, 1.7, z))                       # door
        box(p, 'plastic', (x0 + 0.5, 0.8, z), (x0 + 0.58, 1.1, z + 0.004))               # handle
        box(p, 'plastic', (x0 + 0.1, 1.4, z), (x0 + 0.56, 1.5, z + 0.004))               # indicator strip
    box(p, 'steelDark', (-x, 1.76, -z), (x, 1.8 + E, z))                               # cap


def sorting_table():
    """3.0 x 0.9 x 1.0: post-room bench with trays."""
    p = 'sortingTable'
    x = 1.5 + E
    z = 0.5 + E
    box(p, 'laminate', (-x, 0.84, -z), (x, 0.9 + E, z))
    for sx in (-1, 1):
        box(p, 'steel', (sx * 1.42 - 0.03, 0.0, -0.45), (sx * 1.42 + 0.03, 0.84, 0.45))   # end panels
    box(p, 'steel', (-1.45, 0.2, -0.45), (1.45, 0.22, 0.45))                           # lower shelf
    for i in range(4):                                                                  # sorting trays on the bench
        cx = -1.05 + i * 0.7
        box(p, 'plastic', (cx - 0.3, 0.91, -0.35), (cx + 0.3, 1.0, 0.0))
        if i % 2 == 0:
            box(p, 'timber', (cx - 0.25, 1.0, -0.3), (cx + 0.25, 1.06, -0.05))
    box(p, 'timber', (-1.3, 0.22, -0.4), (-0.4, 0.6, 0.4))                          # parcels on the shelf


def stock_shelf():
    """1.2 x 1.8 x 1.4 fit (L2): a double-sided stationery bay, boxed stock on every level (reads solid)."""
    p = 'stockShelf'
    x = 0.6 + E
    z = 0.7 + E
    for sx in (-1, 1):
        for sz in (-1, 1):
            xa, xb = (-x, -x + 0.04) if sx < 0 else (x - 0.04, x)
            za, zb = (-z, -z + 0.04) if sz < 0 else (z - 0.04, z)
            box(p, 'galv', (xa, 0.0, za), (xb, 1.8 + E, zb))
    box(p, 'steel', (-x, 1.8, -z), (x, 1.8 + E, z))
    for k, y in enumerate((0.06, 0.62, 1.22)):
        box(p, 'timber', (-0.55, y, 0.05), (0.55, y + 0.5, 0.65))
        box(p, 'white' if k == 1 else 'timber', (-0.55, y, -0.65), (0.55, y + 0.5, -0.05))


def bms_desk():
    """3.0 x 0.75 x 0.9: facilities desk, three monitors (overhang), a plotter roll holder at the -x end."""
    p = 'bmsDesk'
    x = 1.5 + E
    z = 0.45 + E
    box(p, 'laminate', (-x, 0.72, -z), (x, 0.75 + E, z))
    for s in (-1, 1):
        box(p, 'steel', (s * 1.46 - 0.03, 0.0, -0.43), (s * 1.46 + 0.03, 0.72, 0.43))
    box(p, 'steel', (-1.4, 0.25, -0.42), (1.4, 0.7, -0.4))                             # modesty panel
    for cx in (-0.25, 0.45, 1.05):
        monitor(p, cx, 0.75, -0.2, 0.5, 0.34, 1)
    box(p, 'plastic', (-0.1, 0.75, 0.1), (0.6, 0.77, 0.3))                             # keyboard
    box(p, 'steelDark', (-1.45, 0.75, -0.35), (-1.4, 1.1, -0.05))                      # plotter roll holder: end plate
    box(p, 'steelDark', (-1.1, 0.75, -0.35), (-1.05, 1.1, -0.05))
    cyl(p, 'white', (-1.25, 0.95, -0.2), 0.08, 0.35, axis='x', segs=8)               # the drawing rolls
    cyl(p, 'timber', (-1.25, 0.8, -0.2), 0.04, 0.35, axis='x', segs=6)


def lift_door():
    """1.2 x 2.1 x 0.14 fit (the skin of a dummy lift door; yaw PI/2 faces it to the lobby): brushed steel doors, frame, call panel."""
    p = 'liftDoor'
    w = 0.6 + E
    d = 0.07 + E
    box(p, 'steelDark', (-w, 0.0, -d), (w, 2.1 + E, d))                                # the frame (the hull)
    box(p, 'steel', (-0.56, 0.02, d - 0.05), (-0.01, 2.04, d - 0.005))               # left leaf
    box(p, 'steel', (0.01, 0.02, d - 0.05), (0.56, 2.04, d - 0.005))                 # right leaf
    box(p, 'steelDark', (-0.005, 0.02, d - 0.004), (0.005, 2.04, d))                 # the seam
    box(p, 'chrome', (0.4, 1.0, d - 0.004), (0.5, 1.2, d))                            # the call panel
    box(p, 'plastic', (0.43, 1.07, d), (0.47, 1.13, d + 0.002))                       # its button


def balcony_planter():
    """2.0 x 0.45 x 0.6 fit (row 2.0): a dark steel trough with clipped box planting flush with the top (exact in plan and height)."""
    p = 'balconyPlanter'
    box(p, 'steelDark', (-1.0, 0.0, -0.3), (1.0, 0.35, 0.3))
    for i in range(3):
        cx = -0.667 + i * 0.667
        box(p, 'foliage', (cx - 0.31, 0.3, -0.26), (cx + 0.31, 0.45, 0.26), 0.04)


# ------------------------------------------------------------------------------------------------ foyer feature wall

def logo_wall():
    """4.0 x 1.2 x 0.05 (visual, flush on the foyer wall; modelled at its mount height): a brushed steel panel with an
    abstract tide-line mark, no text, no real logo."""
    p = 'logoWall'
    box(p, 'steel', (-2.0, 1.2, 0.0), (2.0, 2.4, 0.04))
    for i, (x0, x1) in enumerate(((-1.4, 1.4), (-1.0, 1.0), (-0.6, 0.6), (-0.2, 0.2))):
        y = 1.55 + i * 0.12
        box(p, 'steelDark', (x0, y, 0.04), (x1, y + 0.03, 0.05))                        # the tide lines, narrowing upward


def low_table():
    """1.2 x 0.4 x 0.6 (solid): the visitors' low table."""
    p = 'lowTable'
    box(p, 'oak', (-0.6, 0.35, -0.3), (0.6, 0.4, 0.3))
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(p, 'steel', (sx * 0.54 - 0.025, 0.0, sz * 0.24 - 0.025), (sx * 0.54 + 0.025, 0.35, sz * 0.24 + 0.025))


def kitchen_counter():
    """1.2 x 1.1 x 0.6 fit (row 1.2): the breakout kitchen run, white cupboards, laminate top, steel handles."""
    p = 'kitchenCounter'
    x = 0.6 + E
    z = 0.3 + E
    box(p, 'steelDark', (-x, 0.0, -z), (x, 0.08, z))
    box(p, 'whiteGloss', (-0.6, 0.08, -0.3), (0.6, 1.04, 0.3), 0.01)
    box(p, 'laminate', (-x, 1.04, -z), (x, 1.1 + E, z))
    for s in (-1, 1):
        box(p, 'steel', (s * 0.3 - 0.1, 0.8, 0.3), (s * 0.3 + 0.1, 0.83, 0.31))


BUILDERS = {
    'receptionCounter': reception_counter,
    'speedGate': speed_gate,
    'cafeCounter': cafe_counter,
    'mailCage': mail_cage,
    'switchBoard': switch_board,
    'sortingTable': sorting_table,
    'stockShelf': stock_shelf,
    'bmsDesk': bms_desk,
    'liftDoor': lift_door,
    'balconyPlanter': balcony_planter,
    'logoWall': logo_wall,
    'lowTable': low_table,
    'kitchenCounter': kitchen_counter,
}


def main():
    args = lib.common.parse_args({'--out': {'required': True}, '--name': {'default': 'hero-s2'}, '--only': {'default': ''}})
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
