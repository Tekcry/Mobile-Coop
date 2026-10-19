"""The Hush 9 SD (G76 pistol, G152 held jammer; feature/weapons): an original polymer-frame 9 mm service pistol with a
compact suppressor and the jammer emitter built into the dust-cover nose (A4: no module hanging below the frame).

Real-world proportions (weapon frame, metres, bore at y 0.035): a 182 mm slide (31 mm tall, 26 mm wide, chamfered top,
front and rear cocking serrations, ejection port on the right, low sights), a polymer frame with a beavertail and a
square-front trigger guard, an 18 degree grip (46 mm deep, 28 mm wide) with a magazine base plate, the emitter module
(dark glass window, a red / green aim-light lens beside it, heat-sink grooves) in the dust-cover nose, a 118 mm can
(33 mm) on a short thread adapter. Overall about 318 mm. Wren's thigh holster (leg_kit.py) was built around the
extents (A3); `extra_renders` measures the fit at the game's holster pose.
"""
import math
import os

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

import wlib as W

SIZE = 1024
BORE = 0.035
POINTS = {
    'grip': [0.0, -0.03, -0.012],
    'foregrip': [-0.015, -0.06, 0.0],
    'muzzle': [0.0, BORE, 0.275],
    'mag': [0.0, -0.03, -0.012],
}
SLIDE_Y0, SLIDE_Y1 = 0.021, 0.0505
LENGTH = 0.318                   # overall (m): the studio lights' exposure (see exposure())
FRAME_X = 0.0127
GRIP_X = 0.0140
TAN = math.tan(math.radians(18.0))
GB = -0.042                      # the grip's bottom-back (weapon z at y -0.086)
DEPTH = 0.046 / math.cos(math.radians(18.0))


def back(y):
    """The grip's back line (z) at height y: 18 degrees, the bottom-back at GB."""
    return GB + (y + 0.086) * TAN


def front(y):
    return back(y) + DEPTH


def materials():
    W.material('nitride', (0.034, 0.035, 0.037), 0.40, 0.75, wear=((0.30, 0.30, 0.31), 1.0, 0.3, 0.45), bump=('noise', 0.06, 900.0))
    W.material('emitter glass', (0.004, 0.008, 0.014), 0.04, 0.0, noise=0.0, cavity=0.0)
    W.material('aim lens', (0.32, 0.018, 0.014), 0.08, 0.0, noise=0.0, cavity=0.0)


def exposure(length):
    """build_weapon.py scales the studio lights' power with the weapon length L while their distance scales with L too,
    so the light on the weapon goes as 1/L and a short weapon renders far brighter than the rifle (L 0.93). Scales the
    three studio lights by L / 0.93 so every weapon's renders share the rifle's exposure."""
    base = W.light

    def light(name, loc, target, power, size, colour=(1.0, 0.97, 0.93)):
        return base(name, loc, target, power * (length / 0.93 if name in ('key', 'fill', 'rim') else 1.0), size, colour)
    W.light = light


def multi_cut(target, specs, name='cutter'):
    """One boolean for many box cutters: specs are (size, centre, rot about x or None, r)."""
    objs = []
    for i, (size, centre, rx, r) in enumerate(specs):
        o = W.box(f'{name}{i}', 'polymer', size, centre, 0.0, 1, r)
        if rx:
            W.place(o, rot=(rx, 0, 0), origin=centre)
        objs.append(o)
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    for o in objs[1:]:
        W.PARTS.remove(o)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].select_set(False)
    W.cut(target, objs[0])


def build():
    materials()
    exposure(LENGTH)

    # --- slide: chamfered top edges, front nose chamfer, serrations, ejection port, barrel hood, sights
    s = W.section('slide', 'nitride', [(-0.013, SLIDE_Y0, 0.001), (0.013, SLIDE_Y0, 0.001), (0.013, 0.0440, 0.0015), (0.0095, SLIDE_Y1, 0.0012),
                                       (-0.0095, SLIDE_Y1, 0.0012), (-0.013, 0.0440, 0.0015)], -0.030, 0.152, 0.0007, 2)
    W.cut(s, W.profile('c-nose', 'nitride', [(0.1445, 0.0525), (0.1540, 0.0525), (0.1540, 0.0445)], -0.02, 0.02, 0.0, 1))
    W.cut(s, W.profile('c-tail', 'nitride', [(-0.0310, 0.0525), (-0.0272, 0.0525), (-0.0310, 0.0472)], -0.02, 0.02, 0.0, 1))
    cuts = []
    for i in range(7):
        for sx in (-1, 1):
            cuts.append(((0.0018, 0.0205, 0.0011), (sx * 0.013, 0.0330, -0.0252 + i * 0.0027), 0.15, 0.0))
    for i in range(5):
        for sx in (-1, 1):
            cuts.append(((0.0018, 0.0205, 0.0011), (sx * 0.013, 0.0330, 0.1105 + i * 0.0027), -0.15, 0.0))
    cuts.append(((0.020, 0.018, 0.038), (0.0095, 0.049, 0.032), None, 0.0015))   # ejection port, right side
    multi_cut(s, cuts, 'c-serr')
    W.box('barrel-hood', 'steel', (0.0122, 0.0105, 0.040), (0.0, 0.0442, 0.031), 0.0006, 1)
    W.box('extractor', 'nitride', (0.0012, 0.0035, 0.012), (0.0128, 0.0425, 0.004), 0.0003, 1)
    rs = W.profile('rear-sight', 'nitride', [(-0.0262, 0.0500), (-0.0128, 0.0500), (-0.0150, 0.0540, 0.0006), (-0.0262, 0.0540, 0.0006)], -0.0085, 0.0085, 0.0005, 1)
    W.cut(rs, W.box('c-notch', 'nitride', (0.0032, 0.003, 0.02), (0.0, 0.0543, -0.020), 0.0, 1))
    W.profile('front-sight', 'nitride', [(0.1375, 0.0500), (0.1460, 0.0500), (0.1446, 0.0540, 0.0005), (0.1390, 0.0540, 0.0005)], -0.0017, 0.0017, 0.0004, 1)

    # --- polymer frame: beavertail, web, square-front trigger guard (the opening cut), dust cover to the emitter seam
    gy = -0.004   # the grip panel's top
    fr = W.profile('frame', 'polymer', [(-0.0355, 0.0215, 0.0015), (0.0880, 0.0215), (0.0880, 0.0135), (0.0790, 0.0135, 0.0025), (0.0765, -0.0060, 0.0035),
                                        (0.0360, -0.0060, 0.002), (0.0270, -0.0140), (-0.0140, -0.0140), (back(gy), gy), (back(0.004) - 0.0002, 0.004, 0.003),
                                        (-0.0150, 0.0095, 0.003), (-0.0355, 0.0105, 0.0025)], -FRAME_X, FRAME_X, 0.0010, 2)
    W.cut(fr, W.profile('c-guard', 'polymer', [(front(-0.0025), -0.0025, 0.002), (0.0730, -0.0025, 0.0025), (0.0755, 0.0135), (front(0.0135), 0.0135, 0.004)],
                        -0.02, 0.02, 0.0, 1))
    W.profile('trigger', 'polymer', [(0.0435, 0.0140), (0.0475, 0.0140), (0.0485, 0.0080, 0.003), (0.0510, 0.0010, 0.002), (0.0495, -0.0002), (0.0470, 0.0040, 0.002),
                                     (0.0445, 0.0090)], -0.0032, 0.0032, 0.0006, 1)
    W.profile('trigger-safety', 'nitride', [(0.0478, 0.0060), (0.0492, 0.0060), (0.0502, 0.0018), (0.0490, 0.0014)], -0.0009, 0.0009, 0.0002, 1)

    # --- grip (stippled), 18 degrees back, magazine base plate
    W.profile('grip', 'polymer', [(back(-0.086), -0.086, 0.004), (front(-0.086), -0.086, 0.003), (front(-0.050) + 0.0008, -0.050, 0.02), (front(gy), gy, 0.002),
                                  (back(gy), gy, 0.002), (back(-0.050) - 0.0010, -0.050, 0.03)], -GRIP_X, GRIP_X, 0.0022, 2)
    for sx in (-1, 1):
        x0, x1 = sorted((sx * (GRIP_X - 0.0004), sx * (GRIP_X + 0.0005)))
        W.profile('grip-panel', 'stipple', [(back(-0.079) + 0.0035, -0.079, 0.004), (front(-0.079) - 0.0030, -0.079, 0.004), (front(-0.050) - 0.0024, -0.050, 0.02),
                                            (front(-0.012) - 0.0030, -0.012, 0.004), (back(-0.012) + 0.0035, -0.012, 0.004), (back(-0.050) + 0.0026, -0.050, 0.03)],
                  x0, x1, 0.0004, 1)
    W.profile('mag-plate', 'polymer', [(back(-0.086) - 0.0006, -0.0850, 0.002), (front(-0.086) + 0.0012, -0.0850), (front(-0.086) + 0.0028, -0.0930, 0.002),
                                       (back(-0.086) - 0.0014, -0.0930, 0.002)], -0.0140, 0.0140, 0.0010, 2)
    # (anim-cleanup) the magazine body inside the grip (seen only when it is pulled for a reload)
    W.profile('mag', 'cerakote', [(back(-0.085) + 0.0045, -0.085), (front(-0.085) - 0.0035, -0.085), (front(0.0) - 0.0035, 0.0, 0.002),
                                  (back(0.0) + 0.0045, 0.0, 0.002)], -0.0105, 0.0105, 0.0008, 1)

    # --- controls: slide stop (left), takedown levers, magazine release, the jammer's ambidextrous paddle
    W.profile('slide-stop', 'nitride', [(0.0120, 0.0195), (0.0400, 0.0195), (0.0400, 0.0225, 0.001), (0.0245, 0.0232), (0.0195, 0.0262, 0.0015),
                                        (0.0120, 0.0252, 0.0015)], -0.0148, -0.0124, 0.0004, 1)
    W.cyl('slide-stop-pin', 'nitride', 0.0019, -0.0150, -0.0124, centre=(0.0210, 0.0380), axis='x', segs=12)
    for sx in (-1, 1):
        x0, x1 = sorted((sx * 0.0122, sx * 0.0137))
        W.profile('takedown', 'nitride', [(0.0545, 0.0168), (0.0620, 0.0168), (0.0620, 0.0193, 0.0008), (0.0545, 0.0193, 0.0008)], x0, x1, 0.0003, 1)
        x0, x1 = sorted((sx * 0.0122, sx * 0.0142))
        W.profile('jam-paddle', 'nitride', [(0.0660, 0.0150), (0.0760, 0.0146), (0.0770, 0.0192, 0.0012), (0.0670, 0.0194, 0.0012)], x0, x1, 0.0004, 1)
        x0, x1 = sorted((sx * 0.0122, sx * 0.0143))
        W.profile('mag-release', 'nitride', [(0.0255, 0.0010), (0.0335, 0.0010), (0.0335, 0.0070, 0.001), (0.0255, 0.0070, 0.001)], x0, x1, 0.0004, 1)

    # --- the jammer emitter: a module in the dust-cover nose (seam at z 0.088), heat-sink grooves, the window and the
    # aim-light lens on its front face
    em = W.section('emitter', 'polymer', [(-0.0125, 0.0090, 0.003), (0.0125, 0.0090, 0.003), (0.0125, 0.0213, 0.0005), (-0.0125, 0.0213, 0.0005)],
                   0.0884, 0.1510, 0.0007, 2)
    cuts = []
    for y in (0.0122, 0.0147, 0.0172):
        for sx in (-1, 1):
            cuts.append(((0.0016, 0.0011, 0.042), (sx * 0.0125, y, 0.1190), None, 0.0))
    cuts.append(((0.0142, 0.0077, 0.0016), (-0.0025, 0.01425, 0.1510), None, 0.0))      # window pocket
    multi_cut(em, cuts, 'c-emit')
    W.cut(em, W.cyl('c-lens', 'polymer', 0.0028, 0.1494, 0.1525, centre=(0.0080, 0.0143), segs=20, bevel=0.0))   # lens bezel pocket
    W.box('emitter-window', 'emitter glass', (0.0138, 0.0073, 0.0010), (-0.0025, 0.01425, 0.1498), 0.0, 1)
    W.lathe('aim-bezel', 'nitride', [(0.0, 0.1496), (0.0027, 0.1496), (0.0027, 0.1508), (0.0021, 0.1508), (0.0021, 0.1500), (0.0, 0.1500)],
            centre=(0.0080, 0.0143), segs=20)
    W.cyl('aim-lens', 'aim lens', 0.0021, 0.1496, 0.1503, centre=(0.0080, 0.0143), segs=20, bevel=0.0)

    # --- barrel stub / thread adapter and the suppressor (knurled rear collar, chamfered front cap with the bore)
    W.cyl('barrel', 'steel', 0.0068, 0.1500, 0.1580, centre=(0.0, BORE), segs=20)
    W.lathe('supp-collar', 'knurl', [(0.0, 0.1570), (0.0150, 0.1570), (0.0158, 0.1578), (0.0158, 0.1700), (0.0150, 0.1708), (0.0, 0.1708)],
            centre=(0.0, BORE), segs=32)
    W.lathe('suppressor', 'cerakote', [(0.0, 0.1700), (0.0154, 0.1700), (0.0154, 0.1722), (0.0165, 0.1733), (0.0165, 0.2690), (0.0150, 0.2750),
                                       (0.0050, 0.2750), (0.0046, 0.2712), (0.0, 0.2712)], centre=(0.0, BORE), segs=36)


# ---------------------------------------------------------------------------------------------------- the holster check

LEG_KIT = 'C:/NightShift/Mobile-Coop-operators/build/operators/wren/wren-leg_kit.blend'
HOLSTER_OBJS = ['wren-leg_kit-poly', 'wren-leg_kit-lam', 'wren-leg_kit-elastic', 'wren-leg_kit-metal', 'wren-leg_kit-rubber']
SHOW_OBJS = HOLSTER_OBJS + ['wren-suit-hero', 'wren-body']
HIP_HALF, THIGH_OUTER, CARRY_GAP = 0.0897895, 0.0957883, 0.012
# the holster frame the leg kit built (wren-leg_kit-sim.json, measurements.pistolHolster): origin and axes
HOLSTER_FRAME = {'origin': (-0.20827, 0.00052, 0.59359), 'x': (0.9913, 0.1189, 0.0569), 'y': (0.1191, -0.9929, -0.0), 'z': (0.0565, 0.0068, -0.9984)}


def proxy_extents():
    """weapons.json pistolSd model extents, as modelExtents (weaponDefs.ts)."""
    import json
    here = os.path.dirname(__file__)
    with open(os.path.join(here, '..', '..', '..', 'src', 'config', 'weapons.json'), encoding='utf-8') as f:
        model = json.load(f)['pistolSd']['model']
    lo, hi = [1e9] * 3, [-1e9] * 3
    for p in model:
        sx, sy0, sz0 = p['size']
        rx = (p.get('rot') or [0, 0, 0])[0]
        c, s_ = abs(math.cos(rx)), abs(math.sin(rx))
        sz = (sx, sy0 * c + sz0 * s_, sy0 * s_ + sz0 * c)
        for i in range(3):
            lo[i] = min(lo[i], p['pos'][i] - sz[i] / 2)
            hi[i] = max(hi[i], p['pos'][i] + sz[i] / 2)
    return lo, hi


def slot_matrix(lo, hi):
    """Blender matrix taking the weapon mesh (authored at G(gun)) to the game's right-thigh holster pose in Wren's bind
    frame: the extents centre at SLOT, bore down, slide top forward, the gun's +x outward."""
    xc, yc, zc = [(a + b) / 2 for a, b in zip(lo, hi)]
    half = (hi[0] - lo[0]) / 2
    sx, sz = -(HIP_HALF + THIGH_OUTER + CARRY_GAP + half), 0.85236 - 0.25
    # H(g) = (SX - (gx - xc), -(gy - yc), SZ - (gz - zc)) with g = G^-1(b) = (-b.x, b.z, -b.y)
    return Matrix(((1, 0, 0, sx + xc), (0, 0, -1, yc), (0, 1, 0, sz + zc), (0, 0, 0, 1)))


def frame_matrix(lo, hi):
    """The same gun posed in the leg kit's own holster frame (pistolHolster: offset and tilted from the slot)."""
    xc, yc, zc = [(a + b) / 2 for a, b in zip(lo, hi)]
    o, xa, ya, za = (Vector(HOLSTER_FRAME[k]) for k in ('origin', 'x', 'y', 'z'))
    t = o + xc * xa - yc * ya - zc * za
    m = Matrix.Identity(4)
    for r in range(3):
        m[r][0], m[r][1], m[r][2], m[r][3] = xa[r], -za[r], ya[r], t[r]
    return m


def world_tree(obj, dg):
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    mw = obj.matrix_world
    vs = [mw @ v.co for v in me.vertices]
    tree = BVHTree.FromPolygons(vs, [p.vertices[:] for p in me.polygons])
    ev.to_mesh_clear()
    return tree


REGIONS = (
    ('slide', lambda g: g[1] >= 0.0205 and g[2] < 0.153),
    ('dustCoverEmitter', lambda g: 0.0085 <= g[1] < 0.0205 and 0.079 <= g[2] < 0.153),
    ('frameTriggerGuard', lambda g: -0.0065 <= g[1] < 0.0205 and g[2] < 0.079),
    ('grip', lambda g: g[1] < -0.0065),
    ('suppressor', lambda g: g[2] >= 0.153),
)
SHELL_TOP_Z = 0.7314   # the shell's mouth (Blender z, wren-leg_kit-sim.json pistolHolster.shellZ): hits above it are the hood


def penetration(gun, M, trees):
    """Pistol vertices (weapon frame) vs the holster objects, per region of the gun. Per vertex:
    - 'wall': the vertex lies past a holster wall seen from the cavity: a ray at the same gun z from the cavity's middle,
      gun (0, 0.03, z), to the vertex crosses a holster surface below the shell's mouth; the distance past that crossing
      (a vertex sunk into the 2.2 mm wall or right through it);
    - 'hood': the same, where the crossing is the closed retention hood over the mouth;
    - 'inside': within 6 mm under a holster surface (find_nearest, the face normal's sign).
    Each: the worst depth (mm), the object and where (gun frame, mm)."""
    me = gun.data
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(float)
    out = {}
    for label, sel in REGIONS:
        best = {k: (0.0, None, None) for k in ('wall', 'hood', 'inside')}
        for b in co:
            g = W.g_of(b)
            if not sel(g):
                continue
            p = M @ Vector(b)
            o = M @ W.G(0.0, 0.03, g[2])
            v = p - o
            L = v.length
            for name, t in trees:
                loc, nrm, _, d = t.find_nearest(p, 0.006)
                if loc is not None and (p - loc).dot(nrm) < 0 and d > best['inside'][0]:
                    best['inside'] = (d, name, g)
                if L > 1e-6:
                    hit, _, _, dh = t.ray_cast(o, v / L, L)
                    if hit is not None:
                        k = 'hood' if hit.z > SHELL_TOP_Z - 0.0005 else 'wall'
                        if L - dh > best[k][0]:
                            best[k] = (L - dh, name, g)
        out[label] = {k: {'mm': round(float(v[0]) * 1000, 1), 'object': v[1], 'at': [round(float(x) * 1000, 1) for x in v[2]] if v[2] else None}
                      for k, v in best.items()}
    return out


def extra_renders(scene, render_dir, report):
    gun = bpy.data.objects.get(report['id'])
    lo, hi = proxy_extents()
    with bpy.data.libraries.load(LEG_KIT, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n in SHOW_OBJS]
    for o in dst.objects:
        if o is not None:
            scene.collection.objects.link(o)
    for o in list(scene.objects):
        if o.type == 'MESH' and (o.name.startswith('ruler') or o.name == 'backdrop' or o is gun):
            o.hide_render = True
    # flat check materials: the holster parts tan, Wren grey (the gun keeps its baked material)
    tints = {'wren-leg_kit-poly': (0.30, 0.20, 0.09), 'wren-leg_kit-metal': (0.25, 0.25, 0.26)}
    for o in dst.objects:
        if o is None or o.type != 'MESH':
            continue
        m = bpy.data.materials.new('check-' + o.name)
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*tints.get(o.name, (0.12, 0.12, 0.125)), 1.0)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.7
        o.data.materials.clear()
        o.data.materials.append(m)
    M = slot_matrix(lo, hi)
    # the renders show the gun where the game puts it now: Wren's own holster frame (DECISIONS A12)
    F = frame_matrix(lo, hi)
    pose = gun.copy()
    pose.name = 'pistol-holstered'
    scene.collection.objects.link(pose)
    pose.matrix_world = F
    pose.hide_render = False
    dg = bpy.context.evaluated_depsgraph_get()
    trees = [(n, world_tree(bpy.data.objects[n], dg)) for n in HOLSTER_OBJS if n in bpy.data.objects]
    res = {'pose': 'regions: the old generic game slot; holsterFrame: the leg kit frame the game uses (A12, the renders)',
           'extents': [[round(v, 4) for v in lo], [round(v, 4) for v in hi]],
           'mouthGunZ': round(float(M.translation.z - SHELL_TOP_Z), 4),
           'slot': [round(float(v), 5) for v in M.translation], 'regions': penetration(gun, M, trees)}
    res['holsterFrame'] = penetration(gun, frame_matrix(lo, hi), trees)
    # the slide and frame (slide, dust cover with the emitter, frame with the trigger guard) against the shell walls
    sf = [(res['regions'][k]['wall']['mm'], res['regions'][k]['wall']['object'], k) for k in ('slide', 'dustCoverEmitter', 'frameTriggerGuard')]
    worst = max(sf, key=lambda t: t[0])
    res['maxPenetrationMm'], res['object'], res['region'] = worst
    hf = [(res['holsterFrame'][k]['wall']['mm'], k) for k in ('slide', 'dustCoverEmitter', 'frameTriggerGuard')]
    res['holsterFrameMaxPenetrationMm'], res['holsterFrameRegion'] = max(hf)
    report['holster'] = res
    print('holster', res)

    # renders: close side and front views of the holstered gun on Wren's right thigh
    c = F @ W.G(0.0, 0.02, 0.10)
    for o in [o for o in scene.objects if o.type == 'LIGHT']:
        o.hide_render = True
    W.light('h-key', (c.x - 0.6, c.y - 0.5, c.z + 0.6), c, 40.0, 0.4)
    W.light('h-fill', (c.x - 0.2, c.y - 0.8, c.z + 0.1), c, 15.0, 0.6, (0.9, 0.94, 1.0))
    W.light('h-rim', (c.x - 0.3, c.y + 0.7, c.z + 0.4), c, 25.0, 0.4, (0.9, 0.95, 1.0))
    views = {'side': (c.x - 0.55, c.y, c.z + 0.03), 'front': (c.x - 0.05, c.y - 0.55, c.z + 0.03)}
    for name, loc in views.items():
        cam = W.camera('holster-' + name, loc, c, 70.0)
        scene.camera = cam
        W.render(os.path.join(render_dir, f'pistolSd-holster-{name}.webp'), res=(1200, 1200))
