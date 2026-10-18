"""The knife (CT's close lethal option, always carried; A5): an original fixed-blade fighting knife, the one Wren wears
sheathed on her left thigh (scripts/operators/py/garments/leg_kit.py, "the knife": 190 mm overall, a gunmetal guard and
pommel, a rubber grip), shown in the right hand when drawn.

Knife frame (metres): +z from the handle towards the tip, +y the spine side, x across; the handle's centre (the palm
point) at the origin. Handle 90 mm: guard 6 mm (30 x 18 mm), rubber grip 78 mm (26 x 22 mm, waisted), pommel 6 mm
(24 x 21 mm). Blade 100 mm: 26 mm tall at the guard, 4 mm thick with a distal taper, black coated, a bright flat-ground
edge bevel, a drop point and thumb jimping on the spine.
"""
import math

import bmesh

import wlib as W

SIZE = 512
LENGTH = 0.190
Z_GUARD, L_GUARD, L_GRIP, L_POMMEL, L_BLADE = 0.039, 0.006, 0.078, 0.006, 0.100
Z_BLADE = Z_GUARD + L_GUARD          # 0.045: the blade leaves the guard
TIP = (0.0, 0.0015, Z_BLADE + L_BLADE)
POINTS = {'grip': [0.0, 0.0, 0.0], 'tip': list(TIP)}


def exposure(length):
    """build_weapon.py's studio lights get brighter as a weapon gets shorter (power ~ L at distance ~ L): scale the three
    studio lights by L / 0.93 so the renders share the rifle's exposure (as pistolSd.py)."""
    base = W.light

    def light(name, loc, target, power, size, colour=(1.0, 0.97, 0.93)):
        return base(name, loc, target, power * (length / 0.93 if name in ('key', 'fill', 'rim') else 1.0), size, colour)
    W.light = light


def materials():
    W.material('blade coat', (0.020, 0.020, 0.022), 0.48, 0.0, wear=((0.35, 0.35, 0.36), 1.0, 0.3, 0.25), bump=('noise', 0.06, 900.0))
    W.material('edge', (0.56, 0.56, 0.57), 0.22, 1.0, bump=('brush', 0.12, 1600.0), noise=0.08, cavity=0.1)
    W.material('gunmetal', (0.15, 0.155, 0.165), 0.55, 1.0, wear=((0.42, 0.42, 0.43), 1.0, 0.3, 0.35), noise=0.1)


def smooth01(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def blade_section(u):
    """At u (0 at the guard, 1 at the tip): the coated body's section (x, y) down to the grind line, and the ground
    edge's section (shoulder, apex, apex, shoulder). The edge is its own part, its shoulder 50 um inside the body's, so
    the unwrap gives it its own UV island and the bright bevel ends cleanly at the grind line (no texel staircase)."""
    ys = 0.0125 if u <= 0.58 else 0.0125 - 0.0110 * ((u - 0.58) / 0.42) ** 1.7               # spine, dropping to the point
    ye = -0.0135 + 0.0006 * u if u <= 0.5 else -0.0132 + 0.0147 * ((u - 0.5) / 0.5) ** 2.3   # edge, the belly sweeping up
    t = 0.0020 * (1 - 0.40 * u) * (1 - 0.72 * smooth01((u - 0.78) / 0.22))                    # half thickness, distal taper
    hg = min(0.0095, 0.55 * (ys - ye))                                                         # flat grind height
    yg = ye + hg
    e = t + (min(0.00025, 0.8 * t) - t) * smooth01((u - 0.025) / 0.05)                         # unsharpened ricasso
    c = min(0.0004, 0.3 * t)
    d = 0.00005
    body = [(t - c, ys), (t, ys - c), (t, yg), (-t, yg), (-t, ys - c), (-t + c, ys)]
    edge = [(t - d, yg), (min(e, t - d), ye), (-min(e, t - d), ye), (-t + d, yg)]
    return body, edge


def _tube(name, mat, rings, tip, mat_of=None, smooth=8.0):
    """A closed tube through same-size sections [(z, [(x, y)])], capped at the start, fanned to the tip point."""
    bm = bmesh.new()
    vr = [[bm.verts.new(W.G(x, y, z)) for x, y in sec] for z, sec in rings]
    tv = bm.verts.new(W.G(*tip))
    m = len(rings[0][1])
    for k, (r0, r1) in enumerate(zip(vr, vr[1:])):
        for j in range(m):
            f = bm.faces.new((r0[j], r0[(j + 1) % m], r1[(j + 1) % m], r1[j]))
            f.material_index = mat_of(rings[k + 1][0], j) if mat_of else 0
    bm.faces.new(list(reversed(vr[0])))
    for j in range(m):
        f = bm.faces.new((vr[-1][j], vr[-1][(j + 1) % m], tv))
        f.material_index = mat_of(tip[2], j) if mat_of else 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return W._finish(bm, name, mat, 0.0, 1, smooth=smooth)


def blade():
    us = [i / 30 for i in range(30)] + [0.975, 0.988]
    zs = [Z_BLADE - 0.004] + [Z_BLADE + u * L_BLADE for u in us]
    secs = [blade_section(max(0.0, (z - Z_BLADE) / L_BLADE)) for z in zs]
    body = _tube('blade', 'blade coat', [(z, s[0]) for z, s in zip(zs, secs)], TIP)
    # the ground edge: bright from the end of the ricasso to the tip (its shoulders hidden inside the body)
    edge = _tube('blade-edge', 'edge', [(z, s[1]) for z, s in zip(zs, secs)], (TIP[0], TIP[1] - 0.00006, TIP[2] - 0.00006),
                 mat_of=lambda z, j: 1 if (z - Z_BLADE) / L_BLADE < 0.05 or j == 3 else 0)
    edge.data.materials.append(W.MATS['blade coat'])
    return body


def grip():
    """The rubber grip: rounded sections 26 x 22 mm, 10 % waisted at the middle (as the sheathed handle)."""
    bm = bmesh.new()
    rings = []
    n = 13
    for i in range(n):
        z = -L_GRIP / 2 + L_GRIP * i / (n - 1)
        hy = 0.013 * (1 - 0.1 * math.cos(math.pi * z / L_GRIP) ** 2)
        pts = W.fillet(W.rrect(0.022, 2 * hy, 0.0058), 0.0, 3)
        rings.append([bm.verts.new(W.G(x, y, z)) for x, y in pts])
    m = len(rings[0])
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(m):
            bm.faces.new((r0[j], r0[(j + 1) % m], r1[(j + 1) % m], r1[j]))
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return W._finish(bm, 'grip', 'rubber', 0.0, 1, smooth=50.0)


def build():
    materials()
    exposure(LENGTH)
    b = blade()
    # thumb jimping: six notches across the spine just ahead of the guard
    cutters = [W.box(f'c-jimp{i}', 'blade coat', (0.012, 0.0016, 0.0012), (0.0, 0.0125, 0.0515 + i * 0.0026), 0.0, 1) for i in range(6)]
    for c in cutters:
        W.cut(b, c)
    W.section('guard', 'gunmetal', W.rrect(0.018, 0.030, 0.0035), Z_GUARD, Z_GUARD + L_GUARD, 0.0009, 2)
    grip()
    pommel = W.section('pommel', 'gunmetal', W.rrect(0.021, 0.024, 0.0045), -L_GRIP / 2 - L_POMMEL, -L_GRIP / 2 + 0.0005, 0.0013, 2)
    W.cut(pommel, W.cyl('lanyard-hole', 'gunmetal', 0.0016, -0.0106, 0.0106, centre=(0.0, -L_GRIP / 2 - L_POMMEL / 2), axis='x', segs=12, bevel=0.0))
