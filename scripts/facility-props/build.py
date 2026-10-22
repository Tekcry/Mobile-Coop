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
    s = (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
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


def security_desk():
    """Security operator console (A4): a worktop on a cable-managed rear carcass and end panels, open knee space at the
    front (+z, the operator's side), three 27" monitors (the side ones turned in), keyboard, PTZ joystick, desk phone.
    2.4 x 0.9 x 0.75 (monitors to 1.25)."""
    p = 'securityDesk'
    box(p, 'steelDark', (-1.2, 0.72, -0.45), (1.2, 0.75, 0.45), 0.008)        # worktop
    box(p, 'steel', (-1.18, 0.0, -0.45), (1.18, 0.72, -0.15))                 # rear cable carcass
    for s in (-1, 1):
        box(p, 'steel', (min(s * 1.2, s * 1.16), 0.0, -0.45), (max(s * 1.2, s * 1.16), 0.72, 0.42))
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
