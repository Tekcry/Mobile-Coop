"""Marlow Yard props kit (marlow-final M5 / A6): the set dressing that makes each mock-up read as a real site, built
headless. The architecture kit (walls, glazing, doors, coves) is scripts/facility-kit; this is its sibling.

  blender -b --factory-startup -noaudio --python-exit-code 1 --python build.py -- --seed N --out DIR [--only a,b]

Same export format as scripts/facility-kit/py/build_kit.py: every prop is modelled in the GAME frame (metres: +X right,
+Y up, +Z the prop's front; free-standing props have their origin at the footprint centre on the floor) and converted to
Blender by conjugating with the game -> Blender mirror `M` (G(x, y, z) = (-x, -z, y)), so Blender's outward faces stay
front faces through the glTF writer and the game's GLB reader (src/operators/lab/glb.ts). One GLB holds every prop:
one mesh per (prop, material), named `<prop>.<material>`, flat-shaded hard surface (sharp over 30 deg), no UVs, no
textures (the game's renderer owns the look by material name: PROP_LOOK in src/world/props/facilityProps.ts).
Output: <out>/facility-props.glb and <out>/facility-props.json (triangles, bounds, bytes per prop).
Low poly on purpose (believable at a glance): budgets per prop in src/world/props/facilityProps.ts (PROP_TRI_BUDGET).
"""
import json
import math
import os
import random
import struct
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'operators', 'py'))
import common  # noqa: E402

# glTF material factors (linear base colour, roughness, metallic, emissive); the renderer replaces them by name
MATERIALS = {
    'steel': ((0.20, 0.21, 0.22), 0.55, 0.6, (0, 0, 0)),         # painted mid-grey steel
    'steelDark': ((0.025, 0.027, 0.030), 0.5, 0.5, (0, 0, 0)),   # near-black powder coat
    'galv': ((0.42, 0.43, 0.44), 0.45, 0.9, (0, 0, 0)),          # galvanised steel
    'mesh': ((0.35, 0.36, 0.37), 0.5, 0.9, (0, 0, 0)),           # welded mesh infill (alpha in the renderer)
    'rackBlue': ((0.010, 0.060, 0.200), 0.5, 0.3, (0, 0, 0)),    # RAL 5010
    'rackOrange': ((0.800, 0.180, 0.010), 0.5, 0.3, (0, 0, 0)),  # RAL 2004
    'timber': ((0.300, 0.190, 0.100), 0.85, 0.0, (0, 0, 0)),     # pallet pine
    'cardboard': ((0.420, 0.270, 0.130), 0.9, 0.0, (0, 0, 0)),
    'wrap': ((0.700, 0.720, 0.730), 0.35, 0.0, (0, 0, 0)),       # stretch wrap
    'vanBody': ((0.160, 0.050, 0.030), 0.75, 0.1, (0, 0, 0)),    # oxide brown
    'vanRoof': ((0.120, 0.120, 0.115), 0.85, 0.1, (0, 0, 0)),
    'iron': ((0.018, 0.017, 0.016), 0.6, 0.7, (0, 0, 0)),        # oiled running gear, vault steel
    'transformer': ((0.230, 0.250, 0.220), 0.55, 0.3, (0, 0, 0)),  # RAL 7033
    'porcelain': ((0.120, 0.050, 0.025), 0.2, 0.0, (0, 0, 0)),   # brown glazed bushings
    'concrete': ((0.380, 0.370, 0.350), 0.9, 0.0, (0, 0, 0)),
    'pumpPaint': ((0.030, 0.160, 0.090), 0.45, 0.3, (0, 0, 0)),  # machinery green
    'safety': ((0.900, 0.600, 0.010), 0.5, 0.1, (0, 0, 0)),      # safety yellow
    'oak': ((0.200, 0.095, 0.035), 0.45, 0.0, (0, 0, 0)),
    'marble': ((0.720, 0.700, 0.660), 0.15, 0.0, (0, 0, 0)),
    'brass': ((0.700, 0.480, 0.180), 0.3, 1.0, (0, 0, 0)),
    'plastic': ((0.012, 0.012, 0.013), 0.6, 0.0, (0, 0, 0)),
    'fabric': ((0.040, 0.042, 0.046), 0.95, 0.0, (0, 0, 0)),
    # batch 2
    'glass': ((0.600, 0.650, 0.650), 0.05, 0.0, (0, 0, 0)),     # vitrine and case fronts (alpha in the renderer)
    'leather': ((0.090, 0.035, 0.015), 0.55, 0.0, (0, 0, 0)),   # lounge seats (dark cognac)
    'foliage': ((0.030, 0.120, 0.020), 0.8, 0.0, (0, 0, 0)),    # green wall planting
    'ballast': ((0.120, 0.115, 0.110), 0.95, 0.0, (0, 0, 0)),   # track ballast
    'red': ((0.550, 0.020, 0.020), 0.5, 0.1, (0, 0, 0)),        # RAL 3020 traffic red
    'white': ((0.750, 0.750, 0.730), 0.5, 0.0, (0, 0, 0)),      # signal white, laminate, paper, model card
    'screen': ((0.02, 0.03, 0.04), 0.1, 0.0, (0.35, 0.55, 0.7)),  # tinted per instance
    'lamp': ((1, 1, 1), 1.0, 0.0, (1, 1, 1)),                     # tinted per instance
}

# prop -> material -> bmesh
PIECES = {}

# game -> Blender: G(x, y, z) = (-x, -z, y), a mirror (det -1). A game-frame transform T becomes M T M^T in Blender,
# a proper transform, so primitives built there keep outward faces.
M3 = Matrix(((-1, 0, 0), (0, 0, -1), (0, 1, 0)))
M4 = M3.to_4x4()
M4T = M4.transposed()


def G(x, y, z):
    return Vector((-x, -z, y))


def bm_of(piece, mat):
    if mat not in MATERIALS:
        raise SystemExit(f'unknown material {mat}')
    return PIECES.setdefault(piece, {}).setdefault(mat, bmesh.new())


def game_rot(yaw=0.0, pitch=0.0, roll=0.0):
    """Game-frame rotation (radians): roll about +z, then pitch about +x, then yaw about +y (Babylon's yaw)."""
    return Matrix.Rotation(yaw, 4, 'Y') @ Matrix.Rotation(pitch, 4, 'X') @ Matrix.Rotation(roll, 4, 'Z')


def to_blender(game_matrix):
    return M4 @ game_matrix @ M4T


def box(piece, mat, lo, hi, bevel=0.0):
    """An axis-aligned box from game-frame corners lo..hi, optionally chamfered (one segment)."""
    c = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)
    s = (abs(hi[0] - lo[0]), abs(hi[1] - lo[1]), abs(hi[2] - lo[2]))   # corners in any order (batch 2)
    obox(piece, mat, c, s, bevel=bevel)


def obox(piece, mat, c, s, yaw=0.0, pitch=0.0, roll=0.0, bevel=0.0):
    """An oriented box: centre c, size s (game local x, y, z), rotated by yaw / pitch / roll about its centre."""
    if min(s) <= 0:
        raise SystemExit(f'{piece}.{mat}: empty box {c} {s}')
    bm = bm_of(piece, mat)
    mg = Matrix.Translation(Vector(c)) @ game_rot(yaw, pitch, roll) @ Matrix.Diagonal((s[0], s[1], s[2], 1.0))
    verts = bmesh.ops.create_cube(bm, size=1.0, matrix=to_blender(mg))['verts']
    if bevel > 0:
        b = min(bevel, 0.45 * min(s))
        edges = list({e for v in verts for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=verts + edges, offset=b, offset_type='OFFSET', segments=1, profile=0.5, affect='EDGES', clamp_overlap=True)


def cyl(piece, mat, c, r, h, axis='y', segs=8, r2=None, yaw=0.0, pitch=0.0, roll=0.0):
    """A cylinder (or a frustum with top radius r2) of length h centred on c along a game axis, then rotated."""
    bm = bm_of(piece, mat)
    lay = {'y': Matrix.Identity(4), 'x': Matrix.Rotation(-math.pi / 2, 4, 'Z'), 'z': Matrix.Rotation(math.pi / 2, 4, 'X')}[axis]
    mg = Matrix.Translation(Vector(c)) @ game_rot(yaw, pitch, roll) @ lay
    # create_cone builds along Blender local z, which is game local +y under the conjugation
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2,
                          depth=h, matrix=to_blender(mg))


def prism_x(piece, mat, profile, x0, x1):
    """A closed prism along game x from a (z, y) profile polygon (convex or simple), outward faces."""
    bm = bm_of(piece, mat)
    a = [bm.verts.new(G(x0, y, z)) for z, y in profile]
    b = [bm.verts.new(G(x1, y, z)) for z, y in profile]
    n = len(profile)
    faces = [bm.faces.new(a), bm.faces.new(list(reversed(b)))]
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((a[i], a[j], b[j], b[i])))
    bmesh.ops.recalc_face_normals(bm, faces=faces)


# -------------------------------------------------------------------------------------------------------------- props
# Frames: free-standing props face +z with the origin at the footprint centre on the floor (y 0). A wall prop has its
# back on the wall face at z 0 and faces +z. Hinged leaves have the origin on the hinge axis.

def monitor_wall():
    """Security office video wall (A4, and the instructor bridge): 3 x 3 55" screens (1.21 x 0.68) in slim bezels on a
    floor-standing black frame, a plinth with cable trunking. 3.7 x 0.35 x 2.6; back at z 0 (the wall), faces +z."""
    p = 'monitorWall'
    box(p, 'steelDark', (-1.85, 0.0, 0.0), (1.85, 0.48, 0.35), 0.01)          # plinth / cable trunking
    box(p, 'plastic', (-1.80, 0.44, 0.30), (1.80, 0.46, 0.352))               # trunking lid line
    # frame posts and head as deep as the screens' backs (the collision box behind the screens: PROP_COLLISION)
    for s in (-1, 1):
        box(p, 'steelDark', (min(s * 1.85, s * 1.80), 0.48, 0.0), (max(s * 1.85, s * 1.80), 2.60, 0.115))
    box(p, 'steelDark', (-1.85, 2.55, 0.0), (1.85, 2.60, 0.115))
    w, h, gap = 1.21, 0.68, 0.006
    for col in range(3):
        for row in range(3):
            cx = (col - 1) * (w + gap)
            cy = 0.52 + h / 2 + row * (h + gap)
            box(p, 'plastic', (cx - w / 2, cy - h / 2, 0.10), (cx + w / 2, cy + h / 2, 0.16))
            box(p, 'screen', (cx - w / 2 + 0.008, cy - h / 2 + 0.008, 0.16), (cx + w / 2 - 0.008, cy + h / 2 - 0.008, 0.163))
    for s in (-1, 1):   # status lamps on the plinth (feed on / looped)
        box(p, 'lamp', (s * 1.6 - 0.02, 0.30, 0.35), (s * 1.6 + 0.02, 0.32, 0.354))


def security_desk(p='securityDesk', top='steelDark', body='steel'):
    """Security operator console (A4): a worktop on a cable-managed rear carcass and end panels, open knee space at the
    front (+z, the operator's side), three 27" monitors (the side ones turned in), keyboard, PTZ joystick, desk phone.
    2.4 x 0.9 x 0.75 (monitors to 1.25). `nightDesk` (A8) is the same console in oak."""
    box(p, top, (-1.2, 0.72, -0.45), (1.2, 0.75, 0.45), 0.008)        # worktop
    box(p, body, (-1.18, 0.0, -0.45), (1.18, 0.72, -0.15))                 # rear cable carcass
    for s in (-1, 1):
        box(p, body, (min(s * 1.2, s * 1.16), 0.0, -0.45), (max(s * 1.2, s * 1.16), 0.72, 0.42))
    box(p, 'plastic', (-1.1, 0.60, -0.151), (1.1, 0.64, -0.149))              # cable slot line on the carcass face
    mw, mh = 0.61, 0.36
    for i, (x, yaw) in enumerate(((-0.66, math.radians(18)), (0.0, 0.0), (0.66, math.radians(-18)))):
        z = -0.22 + (0.06 if i != 1 else 0.0)
        obox(p, 'plastic', (x, 0.75 + 0.13 + mh / 2, z), (mw, mh, 0.03), yaw=yaw)              # bezel
        fx, fz = x + 0.0155 * math.sin(yaw), z + 0.0155 * math.cos(yaw)
        obox(p, 'screen', (fx, 0.75 + 0.13 + mh / 2, fz), (mw - 0.02, mh - 0.02, 0.002), yaw=yaw)
        obox(p, 'plastic', (x, 0.75 + 0.07, z - 0.03), (0.05, 0.14, 0.03), yaw=yaw)            # neck
        obox(p, 'plastic', (x, 0.755, z - 0.02), (0.24, 0.01, 0.18), yaw=yaw)                  # foot
    box(p, 'plastic', (-0.24, 0.75, 0.10), (0.24, 0.77, 0.26))                # keyboard
    box(p, 'plastic', (0.42, 0.75, 0.10), (0.58, 0.79, 0.26))                 # PTZ keyboard base
    cyl(p, 'plastic', (0.50, 0.83, 0.20), 0.012, 0.08, segs=6)               # joystick
    box(p, 'plastic', (-0.70, 0.75, 0.05), (-0.50, 0.80, 0.25))               # desk phone
    box(p, 'lamp', (-0.66, 0.80, 0.18), (-0.62, 0.802, 0.22))                 # its line lamp


def server_rack():
    """42U server cabinet (A7): black side panels, top and plinth, a perforated front door (mesh) over the servers'
    faces with status LED lines, a door handle; plain rear door. 0.6 x 1.2 x 2.2, front +z."""
    p = 'serverRack'
    w, d, h = 0.3, 0.6, 2.2
    for s in (-1, 1):
        box(p, 'steelDark', (min(s * w, s * (w - 0.02)), 0.08, -d), (max(s * w, s * (w - 0.02)), h - 0.04, d))
    box(p, 'steelDark', (-w, h - 0.04, -d), (w, h, d), 0.005)                 # top
    box(p, 'plastic', (-0.12, h - 0.001, -0.4), (0.12, h + 0.002, -0.2))      # cable entry brush
    box(p, 'plastic', (-w, 0.0, -d + 0.02), (w, 0.08, d - 0.02))              # plinth
    box(p, 'steelDark', (-w + 0.02, 0.08, -d), (w - 0.02, h - 0.04, -d + 0.02))   # rear door
    # front door: frame + perforated panel; the servers' faces sit behind it
    box(p, 'plastic', (-w + 0.03, 0.12, d - 0.05), (w - 0.03, h - 0.08, d - 0.04))   # server faces / blanking
    for k in range(6):   # LED lines (one per group of servers), staggered lengths
        y = 0.35 + k * 0.3
        x1 = -0.22 + (0.08 if k % 3 == 0 else 0.16 if k % 3 == 1 else 0.12)
        box(p, 'lamp', (-0.22, y, d - 0.04), (x1, y + 0.012, d - 0.037))
    for s in (-1, 1):
        box(p, 'steelDark', (min(s * (w - 0.02), s * (w - 0.06)), 0.08, d - 0.02), (max(s * (w - 0.02), s * (w - 0.06)), h - 0.04, d))
    box(p, 'steelDark', (-w + 0.06, 0.08, d - 0.02), (w - 0.06, 0.16, d))
    box(p, 'steelDark', (-w + 0.06, h - 0.12, d - 0.02), (w - 0.06, h - 0.04, d))
    box(p, 'mesh', (-w + 0.06, 0.16, d - 0.012), (w - 0.06, h - 0.12, d - 0.008))
    box(p, 'steel', (w - 0.055, 1.0, d), (w - 0.035, 1.25, d + 0.025))        # handle


RACK_PITCH = 2.7    # beam length + one frame (m)
RACK_FRAME = 0.09   # upright face width (m)
RACK_DEPTH = 1.1    # frame depth (m)
RACK_H = 5.4
RACK_BEAMS = (1.5, 3.0, 4.5)   # beam tops (m): three loaded levels over a floor level, loads to 5.4 under the frame top


def rack_frame(p, x):
    """One racking frame (two uprights, horizontal and diagonal lacing) centred on x."""
    hd = RACK_DEPTH / 2
    for s in (-1, 1):
        box(p, 'rackBlue', (x - RACK_FRAME / 2, 0.0, min(s * hd, s * (hd - 0.07))), (x + RACK_FRAME / 2, RACK_H, max(s * hd, s * (hd - 0.07))))
        box(p, 'galv', (x - 0.05, 0.0, min(s * hd, s * (hd - 0.12)) - 0.02), (x + 0.05, 0.01, max(s * hd, s * (hd - 0.12)) + 0.02))  # foot plate
    inner = RACK_DEPTH - 0.14
    panel = 1.2
    n = int(RACK_H // panel)
    for i in range(n + 1):
        y = 0.15 + i * (RACK_H - 0.3) / n
        box(p, 'galv', (x - 0.02, y - 0.02, -inner / 2), (x + 0.02, y + 0.02, inner / 2))
    for i in range(n):
        y0 = 0.15 + i * (RACK_H - 0.3) / n
        y1 = 0.15 + (i + 1) * (RACK_H - 0.3) / n
        length = math.hypot(inner, y1 - y0)
        ang = math.atan2(y1 - y0, inner) * (1 if i % 2 == 0 else -1)
        obox(p, 'galv', (x, (y0 + y1) / 2, 0.0), (0.03, 0.03, length), pitch=ang)


def pallet(p, x, y, z, load, h):
    """A 1.0 (x) x 1.2 (z) timber pallet at floor (x, y, z) with a load of height h ('cardboard' or 'wrap')."""
    box(p, 'timber', (x - 0.5, y + 0.12, z - 0.6), (x + 0.5, y + 0.145, z + 0.6))
    for s in (-1, 0, 1):
        box(p, 'timber', (x + s * 0.44 - 0.05, y, z - 0.6), (x + s * 0.44 + 0.05, y + 0.12, z + 0.6))
    box(p, load, (x - 0.48, y + 0.145, z - 0.57), (x + 0.48, y + 0.145 + h, z + 0.57), 0.0)


def pallet_rack_bay(rng):
    """One bay of wide-aisle pallet racking (A4): the frame at its -x end, three beam levels (orange beams front and
    back), two pallets on the floor and on each beam level (loads of cartons or stretch wrap, seeded). A row ends with
    `palletRackEnd` (the closing frame). Footprint 2.7 (x, frame pitch) x 1.1 (z) x 5.4; pallets overhang 5 cm in z."""
    p = 'palletRackBay'
    x0 = -RACK_PITCH / 2
    rack_frame(p, x0)
    hd = RACK_DEPTH / 2
    for yb in RACK_BEAMS:
        for s in (-1, 1):
            box(p, 'rackOrange', (x0 + RACK_FRAME / 2, yb - 0.12, min(s * hd, s * (hd - 0.05))), (-x0 - RACK_FRAME / 2, yb, max(s * hd, s * (hd - 0.05))))
    levels = (0.0,) + RACK_BEAMS
    for li, y in enumerate(levels):
        for k, x in enumerate((-0.6, 0.6)):
            if li == len(levels) - 1 and k == 1:
                continue   # one empty slot up top reads as a working warehouse
            # clear height to the next beam's underside (top level: the frame top), less the pallet and a 0.15 lift gap
            room = (RACK_BEAMS[li] - 0.12 - y if li < len(RACK_BEAMS) else RACK_H - y) - 0.145 - 0.15
            h = min(room, 0.75 + 0.35 * rng.random())
            pallet(p, x, y, 0.0, 'wrap' if rng.random() < 0.45 else 'cardboard', h)


def pallet_rack_end():
    """The closing frame at a racking row's +x end (the bay's frame sits at its -x end)."""
    rack_frame('palletRackEnd', 0.0)


def box_van():
    """Covered goods van (A2): planked body with a curved roof, steel stanchions and diagonal braces, a sliding door
    each side, solebars and headstocks, two wheelsets in axleguards with leaf springs, four buffers. 10 x 2.6 x 3.4 over
    buffers (body 9.1 m); wheels stand on y 0 (rails set flush in the shed floor, as real carriage sheds)."""
    p = 'boxVan'
    L = 4.55
    prism_x(p, 'vanBody', [(-1.27, 1.12), (1.27, 1.12), (1.27, 3.12), (-1.27, 3.12)], -L, L)
    prism_x(p, 'vanRoof', [(-1.30, 3.10), (1.30, 3.10), (1.30, 3.16), (0.75, 3.40), (-0.75, 3.40), (-1.30, 3.16)], -L - 0.03, L + 0.03)
    for s in (-1, 1):
        zf = s * 1.27
        zo = s * 1.295
        z0, z1 = min(zf, zo), max(zf, zo)
        for x in (-4.45, -2.3, 2.3, 4.45):           # stanchions
            box(p, 'iron', (x - 0.05, 1.12, z0), (x + 0.05, 3.10, z1))
        for sx in (-1, 1):                           # diagonal braces between the end stanchions
            xa, xb = sx * 4.4, sx * 2.35
            ln = math.hypot(xb - xa, 1.9)
            ang = math.atan2(1.9, xb - xa)
            obox(p, 'iron', ((xa + xb) / 2, 2.12, (z0 + z1) / 2), (ln, 0.08, z1 - z0), roll=ang)
        box(p, 'vanBody', (-0.95, 1.18, min(s * 1.27, s * 1.31)), (0.95, 3.0, max(s * 1.27, s * 1.31)))   # sliding door
        for y in (1.12, 3.02):                       # door rails
            box(p, 'iron', (-2.1, y, min(s * 1.27, s * 1.30)), (2.1, y + 0.06, max(s * 1.27, s * 1.30)))
        box(p, 'iron', (-L - 0.05, 0.88, min(s * 0.95, s * 1.12)), (L + 0.05, 1.12, max(s * 0.95, s * 1.12)))   # solebar
    for sx in (-1, 1):
        box(p, 'iron', (min(sx * 4.55, sx * 4.65), 0.82, -1.25), (max(sx * 4.55, sx * 4.65), 1.15, 1.25))      # headstock
        for sz in (-1, 1):                           # buffers
            cyl(p, 'iron', (sx * 4.80, 1.03, sz * 0.875), 0.09, 0.30, axis='x', segs=8)
            cyl(p, 'iron', (sx * 4.975, 1.03, sz * 0.875), 0.19, 0.05, axis='x', segs=10)
    for ax in (-2.6, 2.6):
        cyl(p, 'iron', (ax, 0.46, 0.0), 0.07, 1.6, axis='z', segs=6)              # axle
        for sz in (-1, 1):
            cyl(p, 'iron', (ax, 0.46, sz * 0.72), 0.46, 0.12, axis='z', segs=14)  # wheel
            box(p, 'iron', (ax - 0.35, 0.32, sz * 0.92 - 0.05), (ax + 0.35, 0.88, sz * 0.92 + 0.05))   # axleguard
            box(p, 'iron', (ax - 0.11, 0.38, sz * 0.92 - 0.08), (ax + 0.11, 0.56, sz * 0.92 + 0.08))   # axlebox
            box(p, 'iron', (ax - 0.75, 0.78, sz * 0.92 - 0.045), (ax + 0.75, 0.86, sz * 0.92 + 0.045))  # leaf spring


def transformer():
    """33/11 kV transformer in its concrete oil bund (A5): bund walls 1.2 m (low cover), a plinth, the tank with a lid,
    radiator banks on both long sides (fins and headers), three HV and three LV bushings, a conservator on brackets,
    the marshalling box. Bund 6.0 (x) x 5.0 (z) x 1.2; unit 3.0 x 2.8 x 3.5 (to the HV bushing caps)."""
    p = 'transformer'
    bx, bz, t, bh = 3.0, 2.5, 0.25, 1.2
    box(p, 'concrete', (-bx, 0.0, -bz), (bx, bh, -bz + t))
    box(p, 'concrete', (-bx, 0.0, bz - t), (bx, bh, bz))
    box(p, 'concrete', (-bx, 0.0, -bz + t), (-bx + t, bh, bz - t))
    box(p, 'concrete', (bx - t, 0.0, -bz + t), (bx, bh, bz - t))
    box(p, 'concrete', (-bx + t, 0.0, -bz + t), (bx - t, 0.05, bz - t))      # bund floor (stone fill level)
    box(p, 'concrete', (-1.7, 0.05, -1.0), (1.7, 0.30, 1.0))                  # plinth
    box(p, 'transformer', (-1.5, 0.30, -0.8), (1.5, 2.45, 0.8), 0.02)         # tank
    box(p, 'transformer', (-1.55, 2.45, -0.85), (1.55, 2.52, 0.85))           # lid
    for s in (-1, 1):                                                         # radiator banks on the long (z) sides
        for bank in (-0.75, 0.75):
            z0, z1 = sorted((s * 0.82, s * 1.38))
            box(p, 'transformer', (bank - 0.55, 2.05, z0), (bank + 0.55, 2.13, z1))   # top header
            box(p, 'transformer', (bank - 0.55, 0.55, z0), (bank + 0.55, 0.63, z1))   # bottom header
            for k in range(6):
                fx = bank - 0.5 + k * 0.2
                box(p, 'transformer', (fx - 0.012, 0.63, z0 + 0.03), (fx + 0.012, 2.05, z1))
    for i, x in enumerate((-0.9, 0.0, 0.9)):                                  # HV bushings (+z half), LV (-z half)
        cyl(p, 'porcelain', (x, 2.52 + 0.42, 0.35), 0.11, 0.84, segs=8, r2=0.07)
        cyl(p, 'galv', (x, 3.42, 0.35), 0.05, 0.16, segs=6)
        cyl(p, 'porcelain', (x * 0.8, 2.52 + 0.2, -0.40), 0.09, 0.40, segs=8, r2=0.06)
        cyl(p, 'galv', (x * 0.8, 2.98, -0.40), 0.05, 0.12, segs=6)
    cyl(p, 'transformer', (-0.6, 3.05, -0.45), 0.28, 1.5, axis='x', segs=12)  # conservator
    for x in (-1.15, -0.05):
        box(p, 'galv', (x - 0.04, 2.52, -0.50), (x + 0.04, 2.80, -0.40))
    cyl(p, 'galv', (0.25, 2.78, -0.45), 0.03, 0.5, segs=6)                    # Buchholz pipe
    box(p, 'steel', (1.5, 0.9, -0.35), (1.78, 1.7, 0.35))                     # marshalling box
    box(p, 'safety', (1.781, 1.45, -0.12), (1.785, 1.6, 0.12))                 # its danger plate


def pump_unit():
    """Vertical mixed-flow pump set on its 1.2 m concrete plinth (A6): sole plate, discharge head with a horizontal
    discharge stub and flange (to the plinth edge, +x), motor stool, yellow coupling guard, motor with a fan cowl,
    terminal box and lifting eyes. Plinth 2.4 x 2.4 x 1.2; the set rises to 4.0."""
    p = 'pumpUnit'
    box(p, 'concrete', (-1.2, 0.0, -1.2), (1.2, 1.2, 1.2), 0.02)
    box(p, 'iron', (-0.75, 1.2, -0.75), (0.75, 1.26, 0.75))                    # sole plate
    cyl(p, 'pumpPaint', (0.0, 1.26 + 0.45, 0.0), 0.48, 0.9, segs=14)          # discharge head
    cyl(p, 'pumpPaint', (0.0, 2.16 + 0.03, 0.0), 0.56, 0.06, segs=14)         # head flange
    cyl(p, 'pumpPaint', (0.66, 1.62, 0.0), 0.30, 0.72, axis='x', segs=12)     # discharge stub
    cyl(p, 'pumpPaint', (1.12, 1.62, 0.0), 0.42, 0.06, axis='x', segs=12)     # its flange at the plinth edge
    for sx in (-1, 1):                                                        # motor stool posts
        for sz in (-1, 1):
            box(p, 'pumpPaint', (sx * 0.36 - 0.05, 2.22, sz * 0.36 - 0.05), (sx * 0.36 + 0.05, 2.78, sz * 0.36 + 0.05))
    box(p, 'safety', (-0.34, 2.22, -0.34), (0.34, 2.78, 0.34))                # coupling guard (covers the column box)
    cyl(p, 'pumpPaint', (0.0, 2.78 + 0.03, 0.0), 0.52, 0.06, segs=14)         # motor flange
    cyl(p, 'pumpPaint', (0.0, 2.84 + 0.48, 0.0), 0.50, 0.96, segs=14)         # motor
    cyl(p, 'steelDark', (0.0, 3.80 + 0.10, 0.0), 0.46, 0.20, segs=14, r2=0.40)  # fan cowl
    box(p, 'pumpPaint', (-0.14, 3.0, 0.46), (0.14, 3.3, 0.60))                # terminal box (+z)
    for sx in (-1, 1):
        box(p, 'safety', (sx * 0.30 - 0.03, 3.80, -0.03), (sx * 0.30 + 0.03, 3.95, 0.03))   # lifting eyes


def mesh_panel():
    """Welded-mesh partition panel (A6 drive cage, A7 colocation cage): galvanised half posts at both ends (two panels
    make one post), bottom, mid and top rails, a 1.2 m solid kick panel, mesh above. 1.5 x 0.05 x 2.4, centred on
    z 0 (two-faced)."""
    p = 'meshPanel'
    for s in (-1, 1):
        box(p, 'galv', (min(s * 0.75, s * 0.725), 0.0, -0.025), (max(s * 0.75, s * 0.725), 2.4, 0.025))
    for y0, y1 in ((0.0, 0.04), (1.18, 1.22), (2.36, 2.4)):
        box(p, 'galv', (-0.725, y0, -0.02), (0.725, y1, 0.02))
    box(p, 'steel', (-0.725, 0.04, -0.004), (0.725, 1.18, 0.004))
    box(p, 'mesh', (-0.725, 1.22, -0.002), (0.725, 2.36, 0.002))


def bank_counter():
    """Banking-hall counter module (A8): a panelled oak front (+z, the public side) with three raised panels between
    rails and stiles, a dark plinth, a marble top overhanging 2.5 cm, a brass foot rail on two brackets. 2.4 x 0.8 x 1.2
    (low cover)."""
    p = 'bankCounter'
    box(p, 'oak', (-1.2, 0.10, -0.4), (1.2, 1.16, 0.38))                      # carcass
    box(p, 'iron', (-1.2, 0.0, -0.39), (1.2, 0.10, 0.37))                     # plinth (recessed 1 cm)
    box(p, 'marble', (-1.2, 1.16, -0.4), (1.2, 1.2, 0.425), 0.006)            # top
    for k in range(3):                                                        # raised panels
        cx = (k - 1) * 0.78
        box(p, 'oak', (cx - 0.32, 0.25, 0.38), (cx + 0.32, 1.02, 0.40), 0.006)
    box(p, 'oak', (-1.2, 1.06, 0.38), (1.2, 1.12, 0.395))                     # top rail moulding
    cyl(p, 'brass', (0.0, 0.17, 0.47), 0.022, 2.3, axis='x', segs=8)          # foot rail (9 cm out at the floor)
    for x in (-0.9, 0.9):
        box(p, 'brass', (x - 0.015, 0.12, 0.38), (x + 0.015, 0.19, 0.47))


VAULT_W, VAULT_H = 1.4, 2.2     # clear opening (m)
VAULT_D = 0.35                  # frame half depth (m): 0.7 deep, centred on the wall's middle plane
VAULT_T = 0.5                   # leaf thickness (m)
# the leaf's hinge axis in the frame's frame (x, z): on the +z face, beside the -x jamb (facilityProps.ts VAULT_HINGE)
VAULT_HINGE = (-0.78, 0.43)


def vault_door():
    """Vault door frame (A8; a Victorian strongroom door is rectangular): a heavy steel surround (2.4 x 2.8 outer, 0.7
    deep) round a 1.4 x 2.2 opening, a threshold plate, a bright steel reveal round the face opening, two hinge knuckles
    on the -x side of the +z face (the leaf `vaultLeaf` turns about them), a brass maker's plate. Centred on the wall's
    middle plane, opening centred on x 0."""
    p = 'vaultDoor'
    hw, d = VAULT_W / 2, VAULT_D
    box(p, 'iron', (-1.2, 0.0, -d), (-hw, 2.8, d), 0.02)
    box(p, 'iron', (hw, 0.0, -d), (1.2, 2.8, d), 0.02)
    box(p, 'iron', (-hw, VAULT_H, -d), (hw, 2.8, d), 0.02)
    box(p, 'steel', (-hw, 0.0, -d), (hw, 0.02, d))                            # threshold
    for s in (-1, 1):                                                         # bright reveal round the face opening
        box(p, 'steel', (min(s * hw, s * (hw + 0.06)), 0.0, d), (max(s * hw, s * (hw + 0.06)), VAULT_H + 0.06, d + 0.02))
    box(p, 'steel', (-hw, VAULT_H, d), (hw, VAULT_H + 0.06, d + 0.02))
    hx, hz = VAULT_HINGE
    for y in (0.45, 1.75):                                                    # hinge knuckles
        cyl(p, 'steel', (hx, y, hz), 0.07, 0.30, segs=10)
        box(p, 'iron', (hx - 0.06, y - 0.12, d), (-hw - 0.06, y + 0.12, hz))  # knuckle plates on the face
    box(p, 'brass', (-0.3, 2.42, d), (0.3, 2.6, d + 0.01))                    # maker's plate


def vault_leaf():
    """Vault door leaf (A8), its origin on the hinge axis (`VAULT_HINGE` of the frame), modelled shut in the frame's
    frame and shifted: a 0.25 m face slab filling the opening, a stepped inner plug behind it, five locking bolts out of
    the lock edge (+x, into the jamb when shut), a spoked brass hand wheel, a combination dial and a name plate on the
    face (+z), the time-lock box with its ready lamp on the back (-z), hinge arms out to the knuckles. The renderer turns
    it about +y by its door's open state (outward, to the frame's +z side: PROP_SWING)."""
    p = 'vaultLeaf'
    hx, hz = VAULT_HINGE

    def vb(mat, lo, hi, bevel=0.0):
        box(p, mat, (lo[0] - hx, lo[1], lo[2] - hz), (hi[0] - hx, hi[1], hi[2] - hz), bevel)

    def vc(mat, c, r, h, **kw):
        cyl(p, mat, (c[0] - hx, c[1], c[2] - hz), r, h, **kw)

    def vo(mat, c, s, **kw):
        obox(p, mat, (c[0] - hx, c[1], c[2] - hz), s, **kw)

    hw, t = VAULT_W / 2, VAULT_T / 2
    vb('iron', (-hw + 0.02, 0.02, 0.0), (hw - 0.02, VAULT_H - 0.02, t), 0.03)          # face slab
    vb('steel', (-hw + 0.10, 0.10, -t), (hw - 0.10, VAULT_H - 0.10, 0.0))              # inner plug
    for k in range(5):                                                                 # locking bolts
        y = 0.35 + k * (VAULT_H - 0.7) / 4
        vc('steel', (hw - 0.03, y, -0.12), 0.05, 0.16, axis='x', segs=8)
    cx, cy, cz = 0.0, 1.15, t
    vc('brass', (cx, cy, cz + 0.05), 0.07, 0.10, axis='z', segs=10)                   # wheel hub
    for k in range(4):                                                                 # spokes
        vo('brass', (cx, cy, cz + 0.08), (0.5, 0.025, 0.025), roll=k * math.pi / 4)
    for k in range(8):                                                                 # rim: an octagon of bars
        a = k * math.pi / 4 + math.pi / 8
        vo('brass', (cx + 0.25 * math.cos(a), cy + 0.25 * math.sin(a), cz + 0.08), (0.035, 0.21, 0.035), roll=a)
    vc('steel', (cx, 1.62, cz + 0.02), 0.08, 0.04, axis='z', segs=12)                  # combination dial
    vb('brass', (cx - 0.25, 0.55, cz), (cx + 0.25, 0.68, cz + 0.008))                  # name plate
    vb('steel', (-0.25, 1.2, -t - 0.12), (0.30, 1.65, -t))                              # time-lock box on the back
    vb('lamp', (-0.15, 1.5, -t - 0.122), (-0.10, 1.55, -t - 0.12))                      # its ready lamp
    for y in (0.45, 1.75):                                                             # hinge arms to the knuckles
        vb('iron', (hx - 0.05, y - 0.08, t - 0.02), (-hw + 0.12, y + 0.08, hz + 0.05))


def beam_tower():
    """IR beam tower (A5 cable gateway): a square aluminium column on a base plate, a black IR-pass window up both
    faces (+z, -z) with three lens heads each, a hood cap. 0.22 x 0.22 x 2.4."""
    p = 'beamTower'
    box(p, 'galv', (-0.13, 0.0, -0.13), (0.13, 0.015, 0.13))                  # base plate
    box(p, 'galv', (-0.09, 0.015, -0.09), (0.09, 2.32, 0.09), 0.008)          # column
    box(p, 'plastic', (-0.11, 2.32, -0.11), (0.11, 2.40, 0.11))               # hood cap
    for s in (-1, 1):
        z0, z1 = sorted((s * 0.09, s * 0.096))
        box(p, 'plastic', (-0.065, 0.25, z0), (0.065, 2.25, z1))              # IR-pass window
        for y in (0.45, 1.2, 1.95):
            l0, l1 = sorted((s * 0.096, s * 0.099))
            box(p, 'lamp', (-0.03, y - 0.03, l0), (0.03, y + 0.03, l1))       # lens heads (red aim LEDs)


# ------------------------------------------------------------------------------------------------- batch 2 (0f)
# Hung props (galleryScreen, signPlate, pushStation, timeLockPanel, wicketBolt, cableTray): the origin is the prop's
# bottom edge on its mounting face (the cable tray: its hanger's underside); the placement's y is the mount height.

def gallery_console():
    """Instructor gallery control desk module (2.4 m, runs end to end): a cable spine at the back, end panels, a dark
    worktop, a sloped control surface along the front edge (+z, the instructor's side), two desk monitors. 2.4 x 0.9
    x 1.1 (monitor tops)."""
    p = 'galleryConsole'
    box(p, 'steelDark', (-1.2, 0.0, -0.45), (1.2, 0.70, -0.10))               # cable spine
    for s in (-1, 1):
        box(p, 'steelDark', (s * 1.2, 0.0, -0.10), (s * 1.16, 0.70, 0.42))   # end panels
    box(p, 'steelDark', (-1.2, 0.70, -0.45), (1.2, 0.75, 0.45), 0.008)        # worktop
    box(p, 'steelDark', (-1.2, 0.75, -0.45), (1.2, 0.86, -0.38))              # rear upstand
    prism_x(p, 'plastic', [(0.05, 0.75), (0.42, 0.75), (0.42, 0.77), (0.05, 0.83)], -0.95, 0.95)   # control surface
    for x in (-0.55, 0.55):
        box(p, 'plastic', (x - 0.29, 0.77, -0.29), (x + 0.29, 1.10, -0.26))   # bezel
        box(p, 'screen', (x - 0.28, 0.78, -0.26), (x + 0.28, 1.09, -0.258))
        box(p, 'plastic', (x - 0.03, 0.75, -0.33), (x + 0.03, 0.80, -0.29))   # stand


def task_chair(p, back_top, head):
    """Task chair (galleryChair high back with a head pad, officeChair low back): five-star base on castors, gas lift,
    fabric seat, mesh back leaning 8 deg between dark rails, arm pads. Faces +z."""
    cyl(p, 'steelDark', (0.0, 0.11, 0.0), 0.05, 0.06, segs=6)                 # hub
    for k in range(5):
        a = k * 2 * math.pi / 5
        sa, ca = math.sin(a), math.cos(a)
        obox(p, 'steelDark', (0.155 * sa, 0.10, 0.155 * ca), (0.04, 0.035, 0.27), yaw=a)                         # leg
        box(p, 'steelDark', (0.28 * sa - 0.025, 0.0, 0.28 * ca - 0.025), (0.28 * sa + 0.025, 0.085, 0.28 * ca + 0.025))  # castor
    cyl(p, 'steelDark', (0.0, 0.27, 0.0), 0.025, 0.26, segs=6)                # gas lift
    box(p, 'steelDark', (-0.17, 0.40, -0.15), (0.17, 0.43, 0.15))             # seat mechanism
    box(p, 'fabric', (-0.25, 0.43, -0.23), (0.25, 0.50, 0.25), 0.02)          # seat
    box(p, 'steelDark', (-0.03, 0.43, -0.31), (0.03, 0.60, -0.23))            # back spine
    lean = math.radians(-8)
    y0 = 0.56
    hb = back_top - y0
    cy, cz = (y0 + back_top) / 2, -0.30
    for s in (-1, 1):
        obox(p, 'steelDark', (s * 0.235, cy, cz), (0.03, hb, 0.03), pitch=lean)
    obox(p, 'mesh', (0.0, cy, cz), (0.44, hb - 0.04, 0.01), pitch=lean)
    d = hb / 2 - 0.015
    obox(p, 'steelDark', (0.0, cy + d * math.cos(lean), cz + d * math.sin(lean)), (0.5, 0.03, 0.03), pitch=lean)
    if head:
        d = hb / 2 + 0.07
        obox(p, 'fabric', (0.0, cy + d * math.cos(lean), cz + d * math.sin(lean)), (0.30, 0.11, 0.05), pitch=lean)
    for s in (-1, 1):
        box(p, 'steelDark', (s * 0.265 - 0.012, 0.43, -0.07), (s * 0.265 + 0.012, 0.64, -0.03))   # arm post
        box(p, 'steelDark', (s * 0.265 - 0.03, 0.64, -0.20), (s * 0.265 + 0.03, 0.67, 0.08))      # arm pad


def gallery_chair():
    task_chair('galleryChair', 1.08, True)


def office_chair():
    task_chair('officeChair', 0.98, False)


def gallery_screen():
    """Wall-hung 86" display (gallery, showing a set's camera feed): slim bezel, the screen face tinted per instance.
    1.95 x 0.06 x 1.15, hung (origin at its bottom edge on the wall)."""
    p = 'galleryScreen'
    box(p, 'plastic', (-0.975, 0.0, 0.0), (0.975, 1.15, 0.06))
    box(p, 'screen', (-0.955, 0.02, 0.06), (0.955, 1.13, 0.062))


def reception_desk():
    """Arrival lounge reception desk: a tall marble-look visitor front (+z) under an oak transaction top with a warm
    LED line under its lip, a lower staff worktop behind (-z), a dark recessed kick. 3.6 x 1.15 x 1.1."""
    p = 'receptionDesk'
    box(p, 'steelDark', (-1.8, 0.0, -0.55), (1.8, 0.10, 0.545))               # kick, 5 mm back from the front
    box(p, 'marble', (-1.8, 0.10, 0.15), (1.8, 1.06, 0.55))                   # visitor front
    box(p, 'oak', (-1.8, 1.06, 0.12), (1.8, 1.10, 0.58), 0.006)               # transaction top
    box(p, 'lamp', (-1.75, 1.045, 0.55), (1.75, 1.058, 0.556))                # LED line under the lip
    box(p, 'steelDark', (-1.8, 0.10, -0.55), (1.8, 0.72, 0.15))               # staff carcass
    box(p, 'oak', (-1.8, 0.72, -0.57), (1.8, 0.75, 0.15))                     # staff worktop


def lounge_seat():
    """Leather club armchair on a dark plinth: base, seat cushion, arms and back. 0.85 x 0.85 x 0.8, faces +z."""
    p = 'loungeSeat'
    box(p, 'steelDark', (-0.425, 0.0, -0.425), (0.425, 0.06, 0.425))          # plinth
    box(p, 'leather', (-0.425, 0.06, -0.425), (0.425, 0.40, 0.425))           # base
    for s in (-1, 1):
        box(p, 'leather', (s * 0.425, 0.40, -0.425), (s * 0.30, 0.62, 0.425), 0.03)   # arms
    box(p, 'leather', (-0.30, 0.40, -0.425), (0.30, 0.80, -0.24), 0.03)       # back
    box(p, 'leather', (-0.30, 0.40, -0.24), (0.30, 0.50, 0.425), 0.03)        # seat cushion


def green_wall(rng):
    """Living green wall module behind reception (1.2 m): a planter trough at the foot, an irrigation capping, side
    frames, a planted mat with seeded leaf clumps. 1.2 x 0.2 x 3.0, back on the wall at z 0."""
    p = 'greenWall'
    box(p, 'steelDark', (-0.6, 0.0, 0.0), (0.6, 0.15, 0.2))                   # planter trough
    box(p, 'steelDark', (-0.6, 2.92, 0.0), (0.6, 3.0, 0.12))                  # capping
    for s in (-1, 1):
        box(p, 'steelDark', (s * 0.6, 0.15, 0.0), (s * 0.57, 2.92, 0.08))     # side frames
    box(p, 'foliage', (-0.57, 0.15, 0.0), (0.57, 2.92, 0.07))                 # planted mat
    for _ in range(16):
        w = 0.16 + 0.10 * rng.random()
        obox(p, 'foliage', (-0.38 + 0.76 * rng.random(), 0.35 + 2.4 * rng.random(), 0.09), (w, w * (0.8 + 0.3 * rng.random()), 0.09),
             yaw=0.4 * (rng.random() - 0.5), pitch=0.4 * (rng.random() - 0.5), roll=math.pi * rng.random())


def model_vitrine():
    """L7: a white card scale model of the Strongroom (A8) under a glass hood on a dark plinth. 2.0 x 1.2 x 1.1."""
    p = 'modelVitrine'
    box(p, 'steelDark', (-1.0, 0.0, -0.6), (1.0, 0.75, 0.6), 0.01)            # plinth
    box(p, 'white', (-0.9, 0.75, -0.5), (0.9, 0.77, 0.5))                     # site base
    box(p, 'white', (-0.70, 0.77, -0.30), (0.35, 0.95, 0.30))                 # banking hall
    box(p, 'white', (-0.66, 0.95, -0.26), (0.31, 0.99, 0.26))                 # its roof light
    box(p, 'white', (0.40, 0.77, -0.30), (0.75, 0.90, 0.05))                  # vault block
    box(p, 'white', (0.40, 0.77, 0.10), (0.75, 0.84, 0.30))                   # security office
    box(p, 'oak', (-0.55, 0.77, 0.32), (0.20, 0.80, 0.36))                    # counter run (model)
    cyl(p, 'brass', (0.575, 0.84, 0.06), 0.04, 0.02, axis='z', segs=8)        # vault door (model)
    box(p, 'glass', (-0.98, 0.755, -0.58), (0.98, 1.10, 0.58))                # glass hood
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(p, 'steelDark', (sx * 0.985, 0.755, sz * 0.585), (sx * 0.965, 1.10, sz * 0.565))   # hood corner posts


def holding_bench():
    """Holding-room bench: an oak slab on two brushed steel plate legs. 1.8 x 0.45 x 0.45."""
    p = 'holdingBench'
    box(p, 'oak', (-0.9, 0.40, -0.225), (0.9, 0.45, 0.225), 0.005)
    for x in (-0.7, 0.7):
        box(p, 'steel', (x - 0.02, 0.0, -0.19), (x + 0.02, 0.40, 0.19))


def kit_case_wall():
    """Glass-fronted kit room module (1.2 m): a dark carcass, rifle cases standing in the upper bay, pistol cases on two
    shelves below, a glass front with a centre mullion, a warm LED line inside the head. 1.2 x 0.5 x 2.4, back on the
    wall at z 0."""
    p = 'kitCaseWall'
    box(p, 'steelDark', (-0.6, 0.0, 0.0), (0.6, 2.4, 0.03))                   # back
    for s in (-1, 1):
        box(p, 'steelDark', (s * 0.6, 0.0, 0.03), (s * 0.57, 2.4, 0.5))       # sides
    box(p, 'steelDark', (-0.57, 2.32, 0.03), (0.57, 2.4, 0.5))                # head
    box(p, 'steelDark', (-0.57, 0.0, 0.03), (0.57, 0.10, 0.5))                # plinth
    for y in (0.55, 1.0):
        box(p, 'steelDark', (-0.57, y, 0.03), (0.57, y + 0.02, 0.46))         # shelves
    for y in (0.10, 0.57):
        for x in (-0.27, 0.27):
            box(p, 'plastic', (x - 0.22, y, 0.10), (x + 0.22, y + 0.12, 0.42))   # pistol cases
    for x in (-0.39, -0.13, 0.13, 0.39):
        box(p, 'plastic', (x - 0.06, 1.02, 0.12), (x + 0.06, 2.25, 0.42))     # rifle cases, standing
    box(p, 'lamp', (-0.55, 2.30, 0.40), (0.55, 2.32, 0.44))                   # LED line
    box(p, 'glass', (-0.57, 0.10, 0.47), (0.57, 2.32, 0.48))                  # glass front
    box(p, 'steelDark', (-0.01, 0.10, 0.465), (0.01, 2.32, 0.49))             # mullion


def sign_plate():
    """Set signage stand-in: a dark plate with a backlit face (the set number and name wait for a texture: KIT.md 6).
    1.2 x 0.042 x 0.3, hung."""
    p = 'signPlate'
    box(p, 'steelDark', (-0.6, 0.0, 0.0), (0.6, 0.3, 0.04))
    box(p, 'lamp', (-0.56, 0.04, 0.04), (0.56, 0.26, 0.042))


def barrier_post():
    """Rising-arm lorry barrier (A1): the motor post, the hub, a 6 m arm down along +x in red and white bands at 1.0 m.
    Post 0.4 x 0.4 x 1.1; the arm to x 6.24."""
    p = 'barrierPost'
    box(p, 'steel', (-0.2, 0.0, -0.2), (0.2, 1.1, 0.2))
    cyl(p, 'steel', (0.22, 1.04, 0.0), 0.08, 0.04, axis='x', segs=8)          # hub
    n = 10
    seg = 6.0 / n
    for i in range(n):
        x0 = 0.24 + i * seg
        box(p, 'red' if i % 2 == 0 else 'white', (x0, 1.0, -0.03), (x0 + seg, 1.08, 0.03))


def checker_desk():
    """Gate checker's booth desk (A1): worktop on an end panel and a drawer pedestal, back panel, a monitor and an open
    logbook. 1.4 x 0.7 x 0.75 (monitor to 1.12); the checker sits at +z."""
    p = 'checkerDesk'
    box(p, 'steel', (-0.7, 0.72, -0.35), (0.7, 0.75, 0.35))                   # top
    box(p, 'steel', (-0.7, 0.0, -0.35), (0.7, 0.72, -0.32))                   # back panel
    box(p, 'steel', (0.25, 0.0, -0.32), (0.7, 0.72, 0.35))                    # drawer pedestal
    box(p, 'steel', (-0.7, 0.0, -0.32), (-0.67, 0.72, 0.33))                  # end panel
    for y in (0.25, 0.50):
        box(p, 'plastic', (0.27, y, 0.35), (0.68, y + 0.01, 0.353))           # drawer lines
    box(p, 'plastic', (-0.35, 0.82, -0.20), (0.15, 1.12, -0.17))              # monitor bezel
    box(p, 'screen', (-0.34, 0.83, -0.17), (0.14, 1.11, -0.168))
    box(p, 'plastic', (-0.12, 0.75, -0.21), (-0.08, 0.82, -0.19))             # neck
    box(p, 'plastic', (-0.20, 0.75, -0.26), (0.0, 0.76, -0.14))               # foot
    box(p, 'plastic', (0.09, 0.75, -0.01), (0.41, 0.755, 0.23))               # logbook cover
    box(p, 'white', (0.10, 0.755, 0.0), (0.40, 0.77, 0.22))                   # its pages


def bollard():
    """Steel lane bollard (A1) with a reflective yellow sleeve band. 0.21 dia x 1.0."""
    p = 'bollard'
    cyl(p, 'steelDark', (0.0, 0.5, 0.0), 0.1, 1.0, segs=8)
    cyl(p, 'safety', (0.0, 0.82, 0.0), 0.104, 0.12, segs=8)


def wicket_bolt():
    """Heavy tower bolt on the wicket's yard face (A1): back plate, two staples, the bolt with its knob, the keep on the
    frame. 0.4 x 0.1 x 0.06, hung (back on the door face)."""
    p = 'wicketBolt'
    box(p, 'iron', (-0.2, 0.0, 0.0), (0.05, 0.08, 0.012))                     # back plate
    cyl(p, 'steel', (-0.05, 0.04, 0.03), 0.018, 0.32, axis='x', segs=6)       # bolt
    for x in (-0.17, 0.0):
        box(p, 'iron', (x, 0.01, 0.012), (x + 0.05, 0.07, 0.05))              # staples
    box(p, 'steel', (-0.10, 0.04, 0.03), (-0.085, 0.10, 0.045))               # knob
    box(p, 'iron', (0.12, 0.0, 0.0), (0.20, 0.08, 0.06))                      # keep


TRACK_GAUGE = 1.435
TRACK_RAIL_TOP = 0.02   # rail head height (facilityProps.ts TRACK_RAIL_TOP): a van on the track stands at this y


def track_panel():
    """Rail road module (A2), set flush in the shed floor as the box van assumes: a ballast strip, timber sleeper tops,
    two rail heads at standard gauge. 10 x 2.6 x 0.02; modules join end to end."""
    p = 'trackPanel'
    box(p, 'ballast', (-4.995, 0.0, -1.3), (4.995, 0.01, 1.3))
    for i in range(14):
        x = -5 + 0.357 + i * 0.714
        box(p, 'timber', (x - 0.125, 0.0, -1.25), (x + 0.125, 0.016, 1.25))
    for s in (-1, 1):
        z = s * (TRACK_GAUGE + 0.07) / 2
        box(p, 'iron', (-5.0, 0.0, z - 0.035), (5.0, TRACK_RAIL_TOP, z + 0.035))


def buffer_stop():
    """Rail-built buffer stop (A2): a red headstock beam with two buffers facing the train (+z), posts and raking struts
    of old rail down to sills behind. 2.6 x 1.4 x 1.25."""
    p = 'bufferStop'
    box(p, 'red', (-1.3, 0.80, 0.30), (1.3, 1.25, 0.55))
    for sx in (-1, 1):
        cyl(p, 'iron', (sx * 0.875, 1.03, 0.60), 0.09, 0.10, axis='z', segs=8)
        cyl(p, 'iron', (sx * 0.875, 1.03, 0.675), 0.19, 0.05, axis='z', segs=10)
        x = sx * (TRACK_GAUGE + 0.07) / 2
        box(p, 'iron', (x - 0.04, 0.0, 0.35), (x + 0.04, 0.80, 0.47))         # post
        box(p, 'iron', (x - 0.04, 0.0, -0.70), (x + 0.04, 0.12, 0.47))        # sill
        dz, dy = 0.90, 1.07                                                   # strut from (z -0.6, y 0.08) to (0.3, 1.15)
        obox(p, 'iron', (x, 0.08 + dy / 2, -0.6 + dz / 2), (0.08, 0.12, math.hypot(dz, dy)), pitch=-math.atan2(dy, dz))


def push_station():
    """Lighting push station (A2): a grey wall cabinet, a red ISOLATE mushroom button, a label, a status lamp (tinted by
    the isolator's state). 0.6 x 0.34 x 1.0, hung."""
    p = 'pushStation'
    box(p, 'steel', (-0.3, 0.0, 0.0), (0.3, 1.0, 0.3))
    cyl(p, 'red', (0.0, 0.55, 0.32), 0.05, 0.04, axis='z', segs=10)           # mushroom button
    box(p, 'white', (-0.15, 0.70, 0.30), (0.15, 0.80, 0.302))                 # ISOLATE label
    box(p, 'lamp', (-0.03, 0.86, 0.30), (0.03, 0.92, 0.31))                   # status lamp


def permit_gate():
    """Padlocked permit-to-work gate (A2 staging stair): yellow tube frame and bars, a hasp, a brass padlock and a
    permit tag. 1.0 x 0.1 x 1.1, centred on z 0."""
    p = 'permitGate'
    for s in (-1, 1):
        box(p, 'safety', (s * 0.5, 0.0, -0.03), (s * 0.47, 1.1, 0.03))       # stiles
    for y0, y1 in ((0.05, 0.08), (0.55, 0.58), (1.07, 1.1)):
        box(p, 'safety', (-0.47, y0, -0.025), (0.47, y1, 0.025))              # rails
    for x in (-0.235, 0.0, 0.235):
        box(p, 'safety', (x - 0.012, 0.08, -0.012), (x + 0.012, 1.07, 0.012))   # bars
    box(p, 'brass', (0.40, 0.48, 0.03), (0.46, 0.55, 0.05))                   # padlock
    box(p, 'white', (0.39, 0.33, 0.03), (0.47, 0.45, 0.032))                  # permit tag


def office_desk():
    """Office bench desk (A3): white top on closed end panels with a modesty panel, a monitor, keyboard and mouse.
    1.6 x 0.8 x 0.75 (monitor to 1.2); the user sits at +z."""
    p = 'officeDesk'
    box(p, 'white', (-0.8, 0.72, -0.4), (0.8, 0.75, 0.4))
    for s in (-1, 1):
        box(p, 'steel', (s * 0.78, 0.0, -0.38), (s * 0.74, 0.72, 0.38))      # end panels
    box(p, 'steel', (-0.74, 0.25, -0.36), (0.74, 0.70, -0.34))                # modesty panel
    box(p, 'plastic', (-0.30, 0.86, -0.22), (0.30, 1.20, -0.19))              # monitor bezel
    box(p, 'screen', (-0.29, 0.87, -0.19), (0.29, 1.19, -0.188))
    box(p, 'plastic', (-0.025, 0.75, -0.24), (0.025, 0.86, -0.21))            # neck
    box(p, 'plastic', (-0.12, 0.75, -0.30), (0.12, 0.76, -0.16))              # foot
    box(p, 'plastic', (-0.22, 0.75, 0.05), (0.22, 0.77, 0.20))                # keyboard
    box(p, 'plastic', (0.30, 0.75, 0.10), (0.36, 0.765, 0.16))                # mouse


def filing_cabinet():
    """Four-drawer steel filing cabinet (A3): carcass, drawer gap lines and recessed handles. 0.47 x 0.63 x 1.32."""
    p = 'filingCabinet'
    box(p, 'steel', (-0.235, 0.0, -0.31), (0.235, 1.32, 0.30))
    for k in range(1, 4):
        y = 0.02 + k * 0.325
        box(p, 'plastic', (-0.235, y - 0.004, 0.30), (0.235, y + 0.004, 0.303))   # drawer gaps
    for k in range(4):
        y = 0.02 + k * 0.325 + 0.24
        box(p, 'plastic', (-0.08, y, 0.30), (0.08, y + 0.03, 0.32))           # handles


def cleaner_trolley():
    """Cleaner's trolley (A3): a black base on four castors, a galvanised handle frame at -x, a yellow mop bucket with
    its wringer and mop, a black bin bag on the +x end. 1.1 x 0.5 x 1.0."""
    p = 'cleanerTrolley'
    box(p, 'plastic', (-0.55, 0.08, -0.25), (0.55, 0.15, 0.25))
    for x in (-0.45, 0.45):
        for z in (-0.18, 0.18):
            cyl(p, 'plastic', (x, 0.04, z), 0.04, 0.04, axis='z', segs=6)
    for z in (-0.21, 0.21):
        box(p, 'galv', (-0.55, 0.15, z - 0.015), (-0.52, 0.95, z + 0.015))    # handle posts
    box(p, 'galv', (-0.55, 0.92, -0.23), (-0.52, 0.96, 0.23))                 # handle bar
    box(p, 'plastic', (0.12, 0.15, -0.21), (0.52, 0.85, 0.21), 0.04)          # bin bag
    box(p, 'safety', (-0.47, 0.15, -0.2), (-0.07, 0.45, 0.2), 0.02)           # bucket
    box(p, 'plastic', (-0.40, 0.45, -0.12), (-0.14, 0.60, 0.12))              # wringer
    cyl(p, 'galv', (-0.30, 0.64, 0.0), 0.012, 0.70, segs=6)                   # mop handle


def pallet_load(p, h):
    """Floor pallet (A4): a 1.2 (x) x 1.0 (z) timber pallet with a stretch-wrapped load to h (palletLoad 1.4,
    palletLoadLow 1.2: low cover)."""
    box(p, 'timber', (-0.6, 0.12, -0.5), (0.6, 0.145, 0.5))
    for z in (-0.45, 0.0, 0.45):
        box(p, 'timber', (-0.6, 0.0, z - 0.05), (0.6, 0.12, z + 0.05))
    box(p, 'wrap', (-0.6, 0.145, -0.5), (0.6, h, 0.5))


def dispatch_desk():
    """Dispatch desk (A4): a counter-height carcass with a white top, drawer lines, a label printer with its label, a
    kettle and two mugs. 1.8 x 0.72 x 0.9 (kettle to 1.14)."""
    p = 'dispatchDesk'
    box(p, 'steel', (-0.9, 0.0, -0.35), (0.9, 0.87, 0.35))
    box(p, 'white', (-0.9, 0.87, -0.35), (0.9, 0.9, 0.37))
    for y in (0.35, 0.62):
        box(p, 'plastic', (-0.85, y, 0.35), (0.85, y + 0.01, 0.353))
    box(p, 'plastic', (0.30, 0.90, -0.20), (0.55, 1.08, 0.05))                # label printer
    box(p, 'white', (0.36, 0.95, 0.05), (0.49, 0.952, 0.15))                  # its label
    cyl(p, 'plastic', (-0.60, 1.02, -0.15), 0.08, 0.24, segs=8)               # kettle
    for x in (-0.40, -0.30):
        cyl(p, 'white', (x, 0.95, -0.05), 0.04, 0.10, segs=6)                 # mugs


def reach_truck():
    """Parked reach truck (A4), forks down toward +x: a yellow chassis and operator compartment, an overhead guard on
    four posts with an amber beacon, a two-stage mast, the fork carriage and forks on the floor, reach legs either side.
    2.6 x 1.3 x 2.3."""
    p = 'reachTruck'
    box(p, 'safety', (-1.3, 0.0, -0.65), (0.2, 1.0, 0.65), 0.01)              # chassis
    box(p, 'plastic', (-0.70, 1.0, -0.25), (-0.30, 1.10, 0.35))               # seat
    box(p, 'plastic', (-0.20, 1.0, -0.40), (0.15, 1.25, 0.40))                # control console
    for x in (-1.25, -0.25):
        for z in (-0.6, 0.6):
            box(p, 'steelDark', (x - 0.03, 1.0, z - 0.03), (x + 0.03, 2.15, z + 0.03))   # guard posts
    box(p, 'steelDark', (-1.28, 2.15, -0.63), (-0.22, 2.20, 0.63))            # guard roof
    box(p, 'lamp', (-0.80, 2.20, -0.05), (-0.70, 2.26, 0.05))                 # beacon
    for z in (-0.5, 0.5):
        box(p, 'steelDark', (0.22, 0.0, z - 0.05), (0.36, 2.3, z + 0.05))     # mast channels
    for y in (1.2, 2.25):
        box(p, 'steelDark', (0.22, y - 0.04, -0.45), (0.36, y + 0.04, 0.45))  # mast ties
    box(p, 'steelDark', (0.36, 0.05, -0.45), (0.42, 1.1, 0.45))               # carriage and backrest
    for z in (-0.3, 0.3):
        box(p, 'steelDark', (0.42, 0.0, z - 0.06), (1.25, 0.05, z + 0.06))    # forks
    for s in (-1, 1):
        box(p, 'safety', (0.2, 0.0, s * 0.48), (1.3, 0.25, s * 0.62))         # reach legs


def zone_kiosk():
    """Zone control kiosk (A5 zone release): a grey pedestal cabinet on a plinth, a keypad, a small display and three
    status lamps (tinted by the zone's state). 0.8 x 0.5 x 1.5."""
    p = 'zoneKiosk'
    box(p, 'steelDark', (-0.3, 0.0, -0.2), (0.3, 0.10, 0.2))
    box(p, 'steel', (-0.4, 0.10, -0.25), (0.4, 1.5, 0.25), 0.01)
    box(p, 'plastic', (-0.12, 1.00, 0.25), (0.12, 1.25, 0.27))                # keypad
    box(p, 'screen', (-0.10, 1.28, 0.25), (0.10, 1.38, 0.262))                # display
    for x in (-0.15, 0.0, 0.15):
        box(p, 'lamp', (x - 0.02, 1.42, 0.25), (x + 0.02, 1.44, 0.256))


def switchgear_panel():
    """One 11 kV switchgear panel (A5, a 0.8 m module of a line-up): the cubicle, relay door with a window and
    indicator lamps, breaker door with a red mimic line, cable door, handles. 0.8 x 1.6 x 2.3, front +z."""
    p = 'switchgearPanel'
    box(p, 'steel', (-0.4, 0.0, -0.8), (0.4, 2.3, 0.78))
    for y0, y1 in ((0.05, 0.75), (0.78, 1.58), (1.62, 2.25)):
        box(p, 'steel', (-0.38, y0, 0.78), (0.38, y1, 0.80))                  # doors
        box(p, 'plastic', (0.28, y0 + 0.30, 0.80), (0.31, y0 + 0.45, 0.82))   # handles
    box(p, 'plastic', (-0.25, 1.80, 0.80), (0.20, 2.10, 0.802))               # relay window
    box(p, 'red', (-0.015, 0.82, 0.80), (0.015, 1.55, 0.803))                 # mimic line
    for x in (-0.25, -0.15, -0.05):
        box(p, 'lamp', (x - 0.02, 1.68, 0.80), (x + 0.02, 1.72, 0.806))       # indicators


def cable_drum():
    """Timber cable drum on its side (A5): two flanges and the wound black cable, axis along z. 1.8 dia x 1.1."""
    p = 'cableDrum'
    for s in (-1, 1):
        cyl(p, 'timber', (0.0, 0.9, s * 0.5), 0.9, 0.1, axis='z', segs=16)
    cyl(p, 'plastic', (0.0, 0.9, 0.0), 0.62, 0.9, axis='z', segs=16)


def drive_cabinet():
    """Variable-speed drive cabinet (A6 hack terminal): two-door grey enclosure on a plinth, the door HMI screen (tinted
    by the hack's state), status lamps, vent grilles, handles. 1.2 x 0.6 x 2.0, front +z."""
    p = 'driveCabinet'
    box(p, 'steelDark', (-0.6, 0.0, -0.3), (0.6, 0.10, 0.3))
    box(p, 'steel', (-0.6, 0.10, -0.3), (0.6, 2.0, 0.28))
    for s in (-1, 1):
        box(p, 'steel', (s * 0.595, 0.12, 0.28), (s * 0.005, 1.98, 0.30))    # doors
        box(p, 'plastic', (s * 0.50, 0.25, 0.30), (s * 0.15, 0.45, 0.305))   # vent grilles
    for x in (-0.06, 0.06):
        box(p, 'plastic', (x - 0.015, 1.0, 0.30), (x + 0.015, 1.2, 0.33))    # handles
    box(p, 'plastic', (-0.46, 1.30, 0.30), (-0.14, 1.56, 0.31))               # HMI bezel
    box(p, 'screen', (-0.45, 1.31, 0.31), (-0.15, 1.55, 0.312))
    for x in (0.20, 0.30, 0.40):
        box(p, 'lamp', (x - 0.02, 1.50, 0.30), (x + 0.02, 1.54, 0.306))


def davit_box():
    """Confined-space rescue kit box (A6 rope anchor): red body and lid, a white label, two latches. 0.82 x 0.52 x
    0.6."""
    p = 'davitBox'
    box(p, 'red', (-0.4, 0.0, -0.25), (0.4, 0.52, 0.25), 0.01)
    box(p, 'red', (-0.41, 0.52, -0.26), (0.41, 0.6, 0.26))                    # lid
    box(p, 'white', (-0.25, 0.25, 0.25), (0.25, 0.40, 0.252))                 # label
    for x in (-0.25, 0.25):
        box(p, 'steelDark', (x - 0.03, 0.46, 0.25), (x + 0.03, 0.56, 0.27))   # latches


def gland_plate():
    """Cable gland plate on the floor (A6 hang-down anchor): a galvanised plate, two cable glands, the yellow
    lifting-point sign. 0.6 x 0.6 x 0.03."""
    p = 'glandPlate'
    box(p, 'galv', (-0.3, 0.0, -0.3), (0.3, 0.02, 0.3))
    box(p, 'safety', (-0.12, 0.02, 0.10), (0.12, 0.022, 0.25))
    for x in (-0.12, 0.12):
        cyl(p, 'steelDark', (x, 0.025, -0.12), 0.04, 0.01, segs=6)


def pipe_run():
    """DN600 discharge pipe (A6), a 1 m module along x with a half flange at each end (modules join flange to flange),
    on a saddle. 1.0 x 0.7 x 0.7."""
    p = 'pipeRun'
    cyl(p, 'pumpPaint', (0.0, 0.35, 0.0), 0.305, 0.94, axis='x', segs=10)
    for s in (-1, 1):
        cyl(p, 'pumpPaint', (s * 0.485, 0.35, 0.0), 0.35, 0.03, axis='x', segs=10)
    box(p, 'steelDark', (-0.12, 0.0, -0.25), (0.12, 0.10, 0.25))              # saddle


def cooling_unit():
    """Downflow computer-room air handler (A7): a white cabinet, the return-air grille on top of its front, panel
    lines, a controller screen. 1.8 x 0.9 x 2.0, front +z."""
    p = 'coolingUnit'
    box(p, 'white', (-0.9, 0.0, -0.45), (0.9, 2.0, 0.43))
    box(p, 'plastic', (-0.85, 1.50, 0.43), (0.85, 1.95, 0.45))                # return-air grille
    for x in (-0.3, 0.3):
        box(p, 'plastic', (x - 0.004, 0.05, 0.43), (x + 0.004, 1.45, 0.433))  # panel lines
    box(p, 'plastic', (0.45, 1.20, 0.43), (0.70, 1.38, 0.44))                 # controller bezel
    box(p, 'screen', (0.46, 1.21, 0.44), (0.69, 1.37, 0.442))


def cable_tray():
    """Overhead wire cable basket (A7), a 1 m module: a mesh floor and sides, top wires, a trapeze strut under it on
    two drop-rod stubs. 1.0 x 0.38 x 0.5, hung (origin under the strut; y is the strut's height)."""
    p = 'cableTray'
    box(p, 'galv', (-0.02, 0.0, -0.19), (0.02, 0.03, 0.19))                   # trapeze strut
    for z in (-0.17, 0.17):
        cyl(p, 'galv', (0.0, 0.25, z), 0.006, 0.5, segs=4)                     # drop-rod stubs
    box(p, 'mesh', (-0.5, 0.03, -0.15), (0.5, 0.035, 0.15))                   # floor
    for s in (-1, 1):
        box(p, 'mesh', (-0.5, 0.035, s * 0.145), (0.5, 0.13, s * 0.15))      # sides
        box(p, 'galv', (-0.5, 0.125, s * 0.144), (0.5, 0.135, s * 0.154))    # top wires


def trench_grating():
    """Cable trench grating (A7), a 1 m module: a galvanised frame round a grating. 1.0 x 1.0 x 0.03."""
    p = 'trenchGrating'
    for s in (-1, 1):
        box(p, 'galv', (-0.5, 0.0, s * 0.5), (0.5, 0.03, s * 0.47))
        box(p, 'galv', (s * 0.5, 0.0, -0.47), (s * 0.47, 0.03, 0.47))
    box(p, 'mesh', (-0.47, 0.0, -0.47), (0.47, 0.025, 0.47))


def bank_grille():
    """Banking-hall public grille (A8 maglocked gate), a 1.5 m module of brass bars: stiles, top, mid and bottom rails,
    ten bars. 1.5 x 0.08 x 3.0, centred on z 0."""
    p = 'bankGrille'
    for s in (-1, 1):
        box(p, 'brass', (s * 0.75, 0.0, -0.04), (s * 0.72, 3.0, 0.04))
    box(p, 'brass', (-0.72, 0.0, -0.04), (0.72, 0.08, 0.04))
    box(p, 'brass', (-0.72, 1.10, -0.03), (0.72, 1.16, 0.03))
    box(p, 'brass', (-0.72, 2.92, -0.04), (0.72, 3.0, 0.04))
    for i in range(10):
        x = -0.72 + (i + 1) * 1.44 / 11
        box(p, 'brass', (x - 0.01, 0.08, -0.01), (x + 0.01, 2.92, 0.01))


def time_lock_panel():
    """Time-lock panel (A8 sync terminal): a dark case, a brass bezel round a white clock face with two hands, the
    ready lamp (amber). 0.5 x 0.15 x 0.7, hung."""
    p = 'timeLockPanel'
    box(p, 'iron', (-0.25, 0.0, 0.0), (0.25, 0.7, 0.12))
    cyl(p, 'brass', (0.0, 0.45, 0.13), 0.16, 0.02, axis='z', segs=12)
    cyl(p, 'white', (0.0, 0.45, 0.142), 0.14, 0.005, axis='z', segs=12)
    obox(p, 'iron', (0.0, 0.50, 0.147), (0.012, 0.10, 0.004))                 # minute hand
    obox(p, 'iron', (0.03, 0.43, 0.147), (0.012, 0.07, 0.004), roll=math.radians(-120))   # hour hand
    box(p, 'lamp', (-0.03, 0.12, 0.12), (0.03, 0.18, 0.125))


def lighting_board():
    """Lighting distribution board (A8 isolator): a grey two-door cabinet against the wall, a red rotary isolator on a
    yellow plate, handles, two indicator lamps. 1.2 x 0.33 x 1.8, back at z 0."""
    p = 'lightingBoard'
    box(p, 'steel', (-0.6, 0.0, 0.0), (0.6, 1.8, 0.28))
    box(p, 'plastic', (-0.005, 0.05, 0.28), (0.005, 1.75, 0.285))             # door split
    box(p, 'safety', (0.30, 1.05, 0.28), (0.50, 1.35, 0.29))                  # isolator plate
    box(p, 'red', (0.37, 1.12, 0.29), (0.43, 1.30, 0.33))                     # isolator handle
    for x in (-0.15, 0.15):
        box(p, 'plastic', (x - 0.015, 0.8, 0.28), (x + 0.015, 1.0, 0.31))    # handles
    for x in (-0.45, -0.35):
        box(p, 'lamp', (x - 0.02, 1.55, 0.28), (x + 0.02, 1.59, 0.286))


def deposit_wall():
    """Safe deposit box wall module (A8): a dark carcass, a brass door field ruled into boxes (3 columns small, 10
    rows). 1.2 x 0.6 x 2.4, front +z."""
    p = 'depositWall'
    box(p, 'iron', (-0.6, 0.0, -0.3), (0.6, 2.4, 0.28))
    box(p, 'brass', (-0.58, 0.10, 0.28), (0.58, 2.30, 0.29))
    for k in range(1, 11):
        y = 0.10 + k * 0.2
        box(p, 'iron', (-0.58, y - 0.004, 0.29), (0.58, y + 0.004, 0.292))
    for x in (-0.29, 0.0, 0.29):
        box(p, 'iron', (x - 0.004, 0.10, 0.29), (x + 0.004, 2.30, 0.292))


def night_desk():
    security_desk('nightDesk', 'oak', 'oak')


def cash_cart():
    """Cash-in-transit trolley (A8 exit dock): a closed grey steel box on a dark chassis and four castors, a push
    handle at -x. 1.0 x 0.6 x 1.1."""
    p = 'cashCart'
    for x in (-0.35, 0.35):
        for z in (-0.22, 0.22):
            cyl(p, 'steelDark', (x, 0.05, z), 0.05, 0.04, axis='z', segs=6)
    box(p, 'steelDark', (-0.42, 0.08, -0.28), (0.5, 0.14, 0.28))
    box(p, 'steel', (-0.42, 0.14, -0.3), (0.5, 1.1, 0.3))
    box(p, 'steelDark', (-0.5, 0.85, -0.25), (-0.46, 0.89, 0.25))             # grip
    for z in (-0.22, 0.22):
        box(p, 'steelDark', (-0.46, 0.85, z - 0.015), (-0.42, 0.89, z + 0.015))   # arms


BUILDERS = {
    'monitorWall': monitor_wall,
    'securityDesk': security_desk,
    'serverRack': server_rack,
    'palletRackBay': None,   # seeded (rng)
    'palletRackEnd': pallet_rack_end,
    'boxVan': box_van,
    'transformer': transformer,
    'pumpUnit': pump_unit,
    'meshPanel': mesh_panel,
    'bankCounter': bank_counter,
    'vaultDoor': vault_door,
    'vaultLeaf': vault_leaf,
    'beamTower': beam_tower,
    # batch 2 (0f)
    'galleryConsole': gallery_console,
    'galleryChair': gallery_chair,
    'galleryScreen': gallery_screen,
    'receptionDesk': reception_desk,
    'loungeSeat': lounge_seat,
    'greenWall': None,       # seeded (its own rng, so batch 1's racking loads stay as built)
    'modelVitrine': model_vitrine,
    'holdingBench': holding_bench,
    'kitCaseWall': kit_case_wall,
    'signPlate': sign_plate,
    'barrierPost': barrier_post,
    'checkerDesk': checker_desk,
    'bollard': bollard,
    'wicketBolt': wicket_bolt,
    'trackPanel': track_panel,
    'bufferStop': buffer_stop,
    'pushStation': push_station,
    'permitGate': permit_gate,
    'officeDesk': office_desk,
    'officeChair': office_chair,
    'filingCabinet': filing_cabinet,
    'cleanerTrolley': cleaner_trolley,
    'palletLoad': lambda: pallet_load('palletLoad', 1.4),
    'palletLoadLow': lambda: pallet_load('palletLoadLow', 1.2),
    'dispatchDesk': dispatch_desk,
    'reachTruck': reach_truck,
    'zoneKiosk': zone_kiosk,
    'switchgearPanel': switchgear_panel,
    'cableDrum': cable_drum,
    'driveCabinet': drive_cabinet,
    'davitBox': davit_box,
    'glandPlate': gland_plate,
    'pipeRun': pipe_run,
    'coolingUnit': cooling_unit,
    'cableTray': cable_tray,
    'trenchGrating': trench_grating,
    'bankGrille': bank_grille,
    'timeLockPanel': time_lock_panel,
    'lightingBoard': lighting_board,
    'depositWall': deposit_wall,
    'nightDesk': night_desk,
    'cashCart': cash_cart,
}


# ------------------------------------------------------------------------------------------------------------ export
# (the facility kit's export, unchanged in format: positions + normals + uint32 indices, factor materials)

def mesh_arrays(bm):
    """Triangulated, flat-shaded (sharp over 30 deg) arrays in glTF's frame: positions, normals, indices."""
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    me = bpy.data.meshes.new('props-tmp')
    bm.to_mesh(me)
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(30.0))
    me.calc_loop_triangles()
    nl = len(me.loops)
    vi = np.empty(nl, np.int32)
    me.loops.foreach_get('vertex_index', vi)
    nor = np.empty(nl * 3, np.float32)
    me.corner_normals.foreach_get('vector', nor)
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)[vi]
    nor = nor.reshape(-1, 3)
    tri = np.empty(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get('loops', tri)
    rot = lambda a: np.stack([a[:, 0], a[:, 2], -a[:, 1]], 1)  # noqa: E731  Blender -> glTF (a rotation)
    P, N = rot(co), rot(nor)
    key = np.concatenate([np.round(P, 6), np.round(N, 4)], 1)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    idx = inv.ravel()[tri].astype(np.uint32)
    bpy.data.meshes.remove(me)
    return P[first].astype(np.float32), N[first].astype(np.float32), idx


def write_glb(path, meshes):
    """meshes: [(name, material name, P, N, idx)] -> one GLB, a node per mesh, factor-only materials."""
    blobs, views, accessors = [], [], []
    off = 0

    def add(data, target):
        nonlocal off
        b = data.tobytes()
        pad = (-len(b)) % 4
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), 'target': target})
        blobs.append(b + b'\0' * pad)
        off += len(b) + pad
        return len(views) - 1

    def acc(data, comp, typ, target, minmax=False):
        a = {'bufferView': add(data, target), 'componentType': comp, 'count': int(data.shape[0]), 'type': typ}
        if minmax:
            a['min'] = [float(x) for x in data.min(0)]
            a['max'] = [float(x) for x in data.max(0)]
        accessors.append(a)
        return len(accessors) - 1

    mat_names = list(MATERIALS)
    meshes_js, nodes_js = [], []
    for name, mat, P, N, idx in meshes:
        prim = {'attributes': {'POSITION': acc(P, 5126, 'VEC3', 34962, True), 'NORMAL': acc(N, 5126, 'VEC3', 34962)},
                'indices': acc(idx, 5125, 'SCALAR', 34963), 'material': mat_names.index(mat)}
        meshes_js.append({'name': name, 'primitives': [prim]})
        nodes_js.append({'name': name, 'mesh': len(meshes_js) - 1})
    mats = []
    for n in mat_names:
        base, rough, metal, em = MATERIALS[n]
        mats.append({'name': n, 'pbrMetallicRoughness': {'baseColorFactor': [*base, 1.0], 'roughnessFactor': rough, 'metallicFactor': metal},
                     'emissiveFactor': list(em)})
    gl = {
        'asset': {'version': '2.0', 'generator': 'night-shift scripts/facility-props'},
        'scene': 0, 'scenes': [{'nodes': list(range(len(nodes_js)))}],
        'nodes': nodes_js, 'meshes': meshes_js, 'materials': mats,
        'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': off}],
    }
    js = json.dumps(gl, separators=(',', ':')).encode('utf8')
    js += b' ' * ((-len(js)) % 4)
    bin_ = b''.join(blobs)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A))
        f.write(js)
        f.write(struct.pack('<II', len(bin_), 0x004E4942))
        f.write(bin_)
    return os.path.getsize(path)


def main():
    args = common.parse_args({'--out': {'required': True}, '--only': {'default': ''}})
    common.check_version()
    common.empty_scene()
    common.seed_everything(args.seed)
    rng = random.Random(args.seed)
    os.makedirs(args.out, exist_ok=True)
    only = {s for s in args.only.split(',') if s}
    for name, fn in BUILDERS.items():
        if only and name not in only:
            continue
        if name == 'palletRackBay':
            pallet_rack_bay(rng)
        elif name == 'greenWall':
            green_wall(random.Random(args.seed + 1))
        else:
            fn()
    meshes = []
    report = {'pieces': {}, 'materials': list(MATERIALS), 'blender': bpy.app.version_string, 'seed': args.seed}
    for piece, mats in PIECES.items():
        info = {'meshes': {}, 'triangles': 0}
        lo = np.array([np.inf] * 3)
        hi = -lo
        for mat, bm in mats.items():
            P, N, idx = mesh_arrays(bm)
            bm.free()
            name = f'{piece}.{mat}'
            meshes.append((name, mat, P, N, idx))
            t = int(len(idx) // 3)
            info['meshes'][mat] = t
            info['triangles'] += t
            g = P * np.array([-1, 1, 1], np.float32)   # glTF -> game (the reader's mirror)
            lo = np.minimum(lo, g.min(0))
            hi = np.maximum(hi, g.max(0))
        info['bounds'] = {'min': [round(float(v), 4) for v in lo], 'max': [round(float(v), 4) for v in hi]}
        report['pieces'][piece] = info
    glb = os.path.join(args.out, 'facility-props.glb')
    report['bytes'] = write_glb(glb, meshes)
    report['triangles'] = sum(p['triangles'] for p in report['pieces'].values())
    with open(os.path.join(args.out, 'facility-props.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=1)
    print('facility-props', json.dumps({k: v['triangles'] for k, v in report['pieces'].items()}), 'bytes', report['bytes'])


main()
