"""Saltmarsh Park section 1 hero set H1 (sector-redesign ART-S1, briefs/ART-S1.md section 3): the gatehouse, the barrier lane
and the yard pieces, built headless.

  blender -b --factory-startup -noaudio --python-exit-code 1 --python hero_s1.py -- --seed N --out DIR --name hero-s1 [--only a,b]

Frames (facility PROPS.md section 1, as the kit): a free-standing piece faces +z with its origin at the footprint centre on
the floor; a wall piece (monitorBank, keyCabinet, visitorBoard) has its back on the wall face at z 0 and is modelled at its
mount height over the floor. Sizes, budgets and classes: HERO_S1 in src/world/maps/campusS1Dress.ts (its test holds this
build's report against them). Low poly on purpose.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import box, cyl  # noqa: E402


def lin(h):
    """sRGB hex -> linear RGB (the glTF factor; the renderer replaces the look by name)."""
    return tuple(round((int(h[i:i + 2], 16) / 255) ** 2.2, 4) for i in (1, 3, 5))


# CAMPUS_LOOK / PROP_LOOK by name (name, sRGB, roughness, metallic)
LOOK = [
    ('steel', '#7c7f82', 0.55, 0.6), ('steelDark', '#2c2e30', 0.5, 0.5), ('galv', '#adafb1', 0.45, 0.9),
    ('plastic', '#1b1b1c', 0.6, 0.0), ('plastic', '#2b2d31', 0.95, 0.0), ('white', '#e8e8e4', 0.5, 0.0),
    ('red', '#c0262b', 0.5, 0.1), ('concrete', '#a5a29b', 0.9, 0.0), ('brass', '#c19a50', 0.3, 1.0),
    ('screen', '#05080a', 0.1, 0.0), ('laminate', '#b9b3a6', 0.5, 0.0),
    ('tyre', '#1a1a1a', 0.9, 0.0), ('steel', '#c9cdd0', 0.15, 1.0), ('safety', '#f2b705', 0.5, 0.1),
    ('lamp', '#ffffff', 1.0, 0.0),
]
EMISSIVE = {'screen': (0.35, 0.55, 0.7), 'lamp': (1.0, 0.75, 0.4)}
lib.set_materials({n: (lin(h), r, m, EMISSIVE.get(n, (0, 0, 0))) for n, h, r, m in LOOK})


def gate_desk():
    """1.6 x 0.75 x 0.7: laminate desk closed to the floor, two 24in monitors on the back 0.25, keyboard, radio charger, phone."""
    p = 'gateDesk'
    box(p, 'steelDark', (-0.8, 0.0, -0.35), (0.8, 0.04, 0.35))                       # plinth
    box(p, 'laminate', (-0.8, 0.04, -0.35), (0.8, 0.72, 0.34), 0.01)                  # carcass closed by the modesty panel
    box(p, 'steelDark', (-0.78, 0.2, 0.34), (-0.45, 0.22, 0.35))                      # drawer seams on the pedestal
    box(p, 'steelDark', (-0.78, 0.45, 0.34), (-0.45, 0.47, 0.35))
    box(p, 'steel', (-0.64, 0.5, 0.34), (-0.6, 0.54, 0.35))                           # drawer handle
    box(p, 'laminate', (-0.8, 0.72, -0.35), (0.8, 0.75, 0.35), 0.008)                 # top
    for x in (-0.4, 0.4):
        box(p, 'plastic', (x - 0.05, 0.75, -0.32), (x + 0.05, 0.84, -0.2))            # stand
        box(p, 'plastic', (x - 0.275, 0.83, -0.27), (x + 0.275, 1.15, -0.2))          # panel
        box(p, 'screen', (x - 0.255, 0.85, -0.2), (x + 0.255, 1.13, -0.195))          # lit face, flush +z
    box(p, 'plastic', (-0.6, 0.75, 0.08), (-0.2, 0.765, 0.22))                        # keyboard
    box(p, 'white', (0.22, 0.75, 0.05), (0.42, 0.765, 0.2))                           # mouse mat
    box(p, 'plastic', (0.62, 0.75, 0.0), (0.72, 0.84, 0.12))                          # radio charger
    box(p, 'red', (0.64, 0.84, 0.05), (0.66, 0.85, 0.07))
    box(p, 'plastic', (0.1, 0.75, 0.12), (0.3, 0.785, 0.3))                           # desk phone


def pc_desk():
    """1.6 (local x) x 0.75 x 0.9: legs, modesty rail, PC tower under, keyboard; the monitor stands at the far end (0.7 from the objective)."""
    p = 'pcDesk'
    box(p, 'laminate', (-0.8, 0.72, -0.45), (0.8, 0.75, 0.45), 0.008)                 # top
    box(p, 'steel', (-0.8, 0.0, -0.45), (-0.77, 0.72, 0.45))                          # end panels
    box(p, 'steel', (0.77, 0.0, -0.45), (0.8, 0.72, 0.45))
    box(p, 'steelDark', (-0.77, 0.3, -0.45), (0.77, 0.7, -0.43))                      # back panel
    box(p, 'plastic', (-0.7, 0.05, -0.35), (-0.5, 0.45, 0.1))                          # PC tower
    box(p, 'steelDark', (-0.7, 0.35, 0.1), (-0.5, 0.37, 0.101))                       # drive slot
    box(p, 'plastic', (-0.3, 0.75, 0.17), (0.12, 0.765, 0.33))                        # keyboard (operator side, 0.25 off the objective line)
    box(p, 'plastic', (0.18, 0.75, 0.24), (0.24, 0.765, 0.3))                         # mouse
    box(p, 'plastic', (0.55, 0.75, -0.33), (0.67, 0.83, -0.2))                        # monitor stand, far end
    box(p, 'plastic', (0.48, 0.82, -0.3), (0.74, 1.05, -0.24))                        # monitor (off, not lit)
    box(p, 'steelDark', (0.5, 0.84, -0.24), (0.72, 1.03, -0.235))
    box(p, 'white', (-0.55, 0.75, -0.3), (-0.3, 0.755, -0.1))                         # a paper pad


def tea_point():
    """1.6 x 0.9 x 0.6: steel base unit, worktop, kettle (0.2 x 0.28), 3 mugs, a small under-counter fridge door."""
    p = 'teaPoint'
    box(p, 'steelDark', (-0.8, 0.0, -0.3), (0.8, 0.1, 0.295))                         # plinth
    box(p, 'steel', (-0.8, 0.1, -0.3), (0.8, 0.86, 0.295))                            # carcass
    box(p, 'steel', (-0.78, 0.12, 0.295), (-0.02, 0.84, 0.3))                         # cupboard doors
    box(p, 'steelDark', (-0.02, 0.12, 0.295), (0.0, 0.84, 0.3))                       # seam
    box(p, 'white', (0.3, 0.12, 0.295), (0.78, 0.84, 0.3))                            # small fridge door
    box(p, 'steel', (0.32, 0.5, 0.3), (0.34, 0.75, 0.31))                            # fridge handle
    box(p, 'steel', (-0.1, 0.45, 0.3), (-0.07, 0.6, 0.31))                           # cupboard handle
    box(p, 'galv', (-0.8, 0.86, -0.3), (0.8, 0.9, 0.3), 0.005)                        # worktop
    cyl(p, 'white', (-0.55, 0.9 + 0.11, -0.05), 0.1, 0.22, segs=8)                    # kettle body
    box(p, 'plastic', (-0.56, 0.9, -0.17), (-0.54, 0.9 + 0.28, -0.12))                # handle
    box(p, 'plastic', (-0.56, 0.9 + 0.22, -0.17), (-0.5, 0.9 + 0.28, -0.05))
    for i, x in enumerate((-0.1, 0.05, 0.2)):
        cyl(p, 'red' if i == 1 else 'white', (x, 0.9 + 0.045, -0.12 + 0.05 * i), 0.04, 0.09, segs=6)


def monitor_bank():
    """1.2 x 0.8 x 0.12, modelled at its mount height (0.85-1.65): 2 x 2 CCTV screens on a wall bracket."""
    p = 'monitorBank'
    box(p, 'steelDark', (-0.6, 0.85, 0.0), (0.6, 1.65, 0.02))                         # bracket plate
    box(p, 'steel', (-0.04, 0.85, 0.02), (0.04, 1.65, 0.07))                          # upright
    for x in (-0.31, 0.31):
        for y in (1.05, 1.45):
            box(p, 'plastic', (x - 0.28, y - 0.18, 0.07), (x + 0.28, y + 0.18, 0.11))
            box(p, 'screen', (x - 0.26, y - 0.16, 0.11), (x + 0.26, y + 0.16, 0.12))


def key_cabinet():
    """0.45 x 0.6 x 0.1 at its mount height (1.1-1.7): a steel key safe."""
    p = 'keyCabinet'
    box(p, 'steel', (-0.225, 1.1, 0.0), (0.225, 1.7, 0.08))
    box(p, 'steelDark', (-0.2, 1.13, 0.08), (0.2, 1.67, 0.09))                        # door
    box(p, 'brass', (0.1, 1.38, 0.09), (0.15, 1.46, 0.1))                             # lock


def visitor_board():
    """0.9 x 0.6 x 0.03 at its mount height (0.9-1.5): clipboard rack and a fault-ticket sheet."""
    p = 'visitorBoard'
    box(p, 'steelDark', (-0.45, 0.9, 0.0), (0.45, 1.5, 0.01))
    box(p, 'white', (-0.4, 0.98, 0.01), (-0.05, 1.42, 0.02))                          # visitor sheet on the clipboard
    box(p, 'white', (0.08, 0.98, 0.01), (0.4, 1.42, 0.02))                            # fault-ticket sheet


def traffic_island():
    """1.0 x 1.0 x 2.4: kerbed island, yellow / black kerb faces, a control post plate flush with the top."""
    p = 'trafficIsland'
    box(p, 'concrete', (-0.49, 0.0, -1.19), (0.49, 0.98, 1.19))
    box(p, 'steelDark', (-0.49, 0.98, -1.19), (0.49, 1.0, 1.19))                      # top
    box(p, 'steel', (-0.15, 0.98, -0.75), (0.15, 1.0, -0.45))                         # the control post stub, flush
    n = 5
    for i in range(n):
        z0 = -1.2 + 0.48 * i
        m = 'safety' if i % 2 == 0 else 'plastic'
        box(p, m, (-0.5, 0.0, z0), (-0.49, 0.18, z0 + 0.48))                           # kerb faces, both long sides
        box(p, m, (0.49, 0.0, z0), (0.5, 0.18, z0 + 0.48))
    box(p, 'safety', (-0.5, 0.0, 1.19), (0.5, 0.18, 1.2))                             # end faces
    box(p, 'safety', (-0.5, 0.0, -1.2), (0.5, 0.18, -1.19))


def barrier_arm():
    """2.5 x 0.08 x 0.1: round aluminium arm 0.08 with red / white bands and the tip lamp lens (x +1.25 end)."""
    p = 'barrierArm'
    for i in range(4):
        x0 = -1.15 + 0.55 * i
        cyl(p, 'red' if i % 2 == 0 else 'white', (x0 + 0.275, 0.04, 0.0), 0.04, 0.55, axis='x', segs=6)
    box(p, 'steelDark', (-1.25, 0.0, -0.05), (-1.15, 0.08, 0.05))                     # pivot clamp
    box(p, 'steelDark', (1.05, 0.0, -0.05), (1.15, 0.08, 0.05))                       # lamp housing
    box(p, 'lamp', (1.15, 0.0, -0.05), (1.25, 0.08, 0.05))                            # tip lamp lens


def barrier_housing():
    """0.32 x 0.9 x 0.32: the motor housing on the island top."""
    p = 'barrierHousing'
    box(p, 'steelDark', (-0.16, 0.0, -0.16), (0.16, 0.05, 0.16))                      # base plate
    box(p, 'white', (-0.15, 0.05, -0.15), (0.15, 0.82, 0.15), 0.01)                   # body
    box(p, 'red', (-0.155, 0.62, -0.155), (0.155, 0.7, 0.155))                        # hazard band
    box(p, 'steelDark', (-0.16, 0.82, -0.16), (0.16, 0.9, 0.16), 0.01)                # cap


def cage_trolley():
    """1.0 x 1.2 x 0.8: galvanised roll cage full of courier sacks (reads solid)."""
    p = 'cageTrolley'
    box(p, 'galv', (-0.5, 0.12, -0.4), (0.5, 0.17, 0.4))                              # base deck
    for x in (-0.48, 0.48):
        for z in (-0.38, 0.38):
            box(p, 'galv', (x - 0.02, 0.17, z - 0.02), (x + 0.02, 1.2, z + 0.02))     # corner posts
            cx, cz = x * 46 / 48, z * 36 / 38
            box(p, 'steelDark', (cx - 0.04, 0.0, cz - 0.04), (cx + 0.04, 0.12, cz + 0.04))  # castor (inside the posts' footprint)
    for y in (0.6, 1.15):
        box(p, 'galv', (-0.5, y, -0.4), (0.5, y + 0.03, -0.37))                       # rails, front and back
        box(p, 'galv', (-0.5, y, 0.37), (0.5, y + 0.03, 0.4))
        box(p, 'galv', (-0.5, y, -0.37), (-0.47, y + 0.03, 0.37))                     # and the ends
        box(p, 'galv', (0.47, y, -0.37), (0.5, y + 0.03, 0.37))
    box(p, 'white', (-0.44, 0.17, -0.34), (-0.02, 0.62, 0.34))                        # sacks
    box(p, 'laminate', (0.0, 0.17, -0.34), (0.44, 0.58, 0.0))
    box(p, 'plastic', (0.0, 0.17, 0.02), (0.44, 0.7, 0.34))
    box(p, 'white', (-0.44, 0.62, -0.34), (0.0, 1.0, 0.0))
    box(p, 'white', (-0.4, 0.62, 0.02), (0.0, 1.05, 0.34))
    box(p, 'plastic', (0.0, 0.7, -0.34), (0.44, 1.1, 0.34))
    box(p, 'red', (0.1, 0.9, 0.34), (0.2, 0.96, 0.345))                               # a sack tag


def light_bollard():
    """0.2 dia x 0.95: aluminium bollard with the top lens (emissive `lamp`; the real light stays the rig's)."""
    p = 'lightBollard'
    box(p, 'steelDark', (-0.1, 0.0, -0.1), (0.1, 0.05, 0.1))                          # foot
    cyl(p, 'galv', (0.0, 0.45, 0.0), 0.07, 0.8, segs=8)                               # body
    box(p, 'steelDark', (-0.1, 0.84, -0.1), (0.1, 0.89, 0.1))                         # cap
    cyl(p, 'lamp', (0.0, 0.92, 0.0), 0.06, 0.06, segs=8)                              # lens


def intercom_post():
    """0.2 x 1.3 x 0.15: the drivers' intercom on a post."""
    p = 'intercomPost'
    box(p, 'steelDark', (-0.1, 0.0, -0.075), (0.1, 0.03, 0.075))                      # base plate
    box(p, 'steel', (-0.04, 0.03, -0.04), (0.04, 0.95, 0.04))                         # post
    box(p, 'steel', (-0.1, 0.95, -0.075), (0.1, 1.3, 0.075))                          # head
    box(p, 'plastic', (-0.07, 1.1, 0.075), (0.07, 1.25, 0.08))                        # speaker grille
    box(p, 'red', (-0.03, 1.02, 0.075), (0.03, 1.07, 0.085))                          # call button


BUILDERS = {
    'gateDesk': gate_desk,
    'pcDesk': pc_desk,
    'teaPoint': tea_point,
    'monitorBank': monitor_bank,
    'keyCabinet': key_cabinet,
    'visitorBoard': visitor_board,
    'trafficIsland': traffic_island,
    'barrierArm': barrier_arm,
    'barrierHousing': barrier_housing,
    'cageTrolley': cage_trolley,
    'lightBollard': light_bollard,
    'intercomPost': intercom_post,
}


def main():
    args = lib.common.parse_args({'--out': {'required': True}, '--name': {'default': 'hero-s1'}, '--only': {'default': ''}})
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
