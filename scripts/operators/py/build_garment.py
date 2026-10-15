"""Pipeline stage 2: a garment sewn from 2D pattern panels onto the operator's body by Blender cloth simulation.

1. Measure the bind-pose body (circumferences, arm girths, landmark heights).
2. Draft the garment's panels and seams from those measurements (garments/<name>.py).
3. Mesh the panels (pattern.py); arrange them round the body (torso panels on the body's contour, sleeves as tubes
   round the arm, everything pushed clear of the skin).
4. Simulate: the flat pattern is the cloth's rest shape (shape key), sewing springs pull every seam pair together,
   gravity settles the fabric on the body (collision, self collision).
5. Weld the seams and save the simulated garment with its pattern-space UVs for the detail stage.

Writes build/operators/<id>/<id>-<garment>-sim.blend and <id>-<garment>-sim.npz / .json.
"""
import json
import math
import os
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import convex_hull_2d

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'garments'))
import common  # noqa: E402

args = common.parse_args({
    '--operator': {'required': True},
    '--garment': {'required': True},
    '--out': {'required': True},
    '--frames': {'type': int, 'default': 90},
})
common.check_version()
common.seed_everything(args.seed)
garment = __import__(args.garment)

op_id = args.operator
body_blend = os.path.join(args.out, f'{op_id}-body.blend')
with open(os.path.join(args.out, f'{op_id}-body.json'), encoding='utf-8') as f:
    body_report = json.load(f)
bpy.ops.wm.open_mainfile(filepath=body_blend)
common.seed_everything(args.seed)
scene = bpy.context.scene
body = bpy.data.objects[f'{op_id}-body']
rig = bpy.data.objects[f'{op_id}-rig']
J = {k: np.array(common.game_to_blender(v)) for k, v in body_report['bindJoints'].items()}
H = body_report['height']
s = H / 1.68

# --- 1. Measure -----------------------------------------------------------------------------------------------------
BV = np.array([v.co[:] for v in body.data.vertices])
gnames = {g.index: g.name for g in body.vertex_groups}
dominant = []
for v in body.data.vertices:
    best = max(v.groups, key=lambda g: g.weight, default=None)
    dominant.append(gnames[best.group] if best else '')
dominant = np.array(dominant)
TORSO = {'pelvis', 'spine', 'chest', 'neck', 'hipL', 'hipR'}
is_torso = np.array([d in TORSO for d in dominant])


def hull_ring(pts2):
    idx = convex_hull_2d([tuple(p) for p in pts2])
    ring = pts2[idx]
    x, y = ring[:, 0], ring[:, 1]
    if 0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))) < 0:
        ring = ring[::-1]
    return ring


def ring_at(z, mask, band=0.006):
    sel = BV[mask & (np.abs(BV[:, 2] - z) < band)]
    return hull_ring(sel[:, :2])


def perimeter(ring):
    return float(np.linalg.norm(np.roll(ring, -1, axis=0) - ring, axis=1).sum())


def arm_circ(a, b, t, side_bones):
    """Girth of the limb segment a -> b at fraction t, from the vertices skinned to its bones."""
    mask = np.isin(dominant, side_bones)
    p = a + (b - a) * t
    d = (b - a) / np.linalg.norm(b - a)
    rel = BV[mask] - p
    near = rel[np.abs(rel @ d) < 0.006]
    u = np.cross(d, [0, 0, 1.0])
    if np.linalg.norm(u) < 1e-6:
        u = np.cross(d, [1.0, 0, 0])
    u /= np.linalg.norm(u)
    v = np.cross(d, u)
    return perimeter(hull_ring(np.stack([near @ u, near @ v], axis=1)))


y_hip = J['hipL'][2]
m = {
    'height': H,
    'z_hem': y_hip + 0.01 * s,
    'z_waist': J['spine'][2],
    'z_bust': body_report['bindJoints']['chest'][1] + 0.077 * s,
    'z_ua': J['shL'][2] - 0.085 * s,
    'z_neck': J['neck'][2],
}
for k in ('hem', 'waist', 'bust', 'ua'):
    m[f'circ_{k}'] = perimeter(ring_at(m[f'z_{k}'], is_torso))
neck_ring = ring_at(m['z_neck'] + 0.01, dominant == 'neck')
m['neck_half_w'] = float(np.ptp(neck_ring[:, 0]) / 2)
L = ('shL', 'elL', 'wrL')
m['circ_bicep'] = arm_circ(J['shL'], J['elL'], 0.35, ['shL'])
m['circ_elbow'] = arm_circ(J['shL'], J['elL'], 0.97, ['shL', 'elL'])
m['circ_wrist'] = arm_circ(J['elL'], J['wrL'], 0.95, ['elL', 'wrL'])
upper = float(np.linalg.norm(J['elL'] - J['shL']))
fore = float(np.linalg.norm(J['wrL'] - J['elL']))
CUFF_EXT = 0.02 * s
m['sleeve_under'] = fore + upper - 0.11 * s + CUFF_EXT
m['sleeve_elbow'] = fore + CUFF_EXT
m['collar_h'] = 0.045 * s

pattern, details, info = garment.draft(m)
uv, panel_of, tris, pairs, seam_lines = pattern.mesh()
panel_names = list(pattern.panels)
panel_idx = np.array([panel_names.index(p) for p in panel_of])
PANELS_OF = panel_of
print(f'operators: {op_id} {args.garment}: {len(uv)} verts, {len(tris)} tris, {len(pairs)} seam pairs')

# --- 3. Arrange round the body --------------------------------------------------------------------------------------
# Body contour as a radial profile r(theta, z) round the torso axis, smoothed over height, so the start shape has no
# jumps between slices. theta = 0 at the front (-Y), increasing towards +X (anticlockwise seen from above).
N_TH = 240
TH = np.linspace(0, 2 * math.pi, N_TH, endpoint=False)
prof_cache = {}


def radial_profile(mask_key):
    if mask_key in prof_cache:
        return prof_cache[mask_key]
    mask = is_torso if mask_key == 'torso' else (dominant == 'neck') | is_torso
    zs = np.arange(m['z_hem'] - 0.05, m['z_neck'] + 0.12, 0.005)
    R = np.zeros((len(zs), N_TH))
    C = np.zeros((len(zs), 2))
    for k, z in enumerate(zs):
        sel = BV[mask & (np.abs(BV[:, 2] - z) < 0.012)]
        if len(sel) < 8:
            R[k], C[k] = R[k - 1], C[k - 1]
            continue
        ring = hull_ring(sel[:, :2])
        c = np.array([0.0, (ring[:, 1].max() + ring[:, 1].min()) / 2])
        # Radius of the hull polygon along each direction from c.
        closed = np.concatenate([ring, ring[:1]])
        for j, th in enumerate(TH):
            d = np.array([math.sin(th), -math.cos(th)])
            best = 0.0
            for i in range(len(closed) - 1):
                a0, a1 = closed[i] - c, closed[i + 1] - c
                den = d[0] * (a1[1] - a0[1]) - d[1] * (a1[0] - a0[0])
                if abs(den) < 1e-12:
                    continue
                t = (a0[0] * (a1[1] - a0[1]) - a0[1] * (a1[0] - a0[0])) / den
                u = (a0[0] * d[1] - a0[1] * d[0]) / den
                if t > 0 and 0 <= u <= 1:
                    best = max(best, t)
            R[k, j] = best
        C[k] = c
    # Smooth over height (5 cm window) and around (symmetric).
    K = 5
    Rs = np.array([R[max(0, k - K):k + K + 1].mean(axis=0) for k in range(len(zs))])
    Rs = (Rs + Rs[:, (-np.arange(N_TH)) % N_TH]) / 2
    Cs = np.array([C[max(0, k - K):k + K + 1].mean(axis=0) for k in range(len(zs))])
    prof_cache[mask_key] = (zs, Rs, Cs)
    return prof_cache[mask_key]


def contour_point(mask_key, z, arc, offset):
    """Point at arc length `arc` from the front (+ towards +X) on the offset contour at height z."""
    zs, Rs, Cs = radial_profile(mask_key)
    k = int(np.clip(np.searchsorted(zs, z), 1, len(zs) - 1))
    f = float(np.clip((z - zs[k - 1]) / (zs[k] - zs[k - 1]), 0, 1))
    r = Rs[k - 1] * (1 - f) + Rs[k] * f + offset
    c = Cs[k - 1] * (1 - f) + Cs[k] * f
    pts = np.stack([c[0] + r * np.sin(TH), c[1] - r * np.cos(TH)], axis=1)
    closed = np.concatenate([pts, pts[:1]])
    cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(closed, axis=0), axis=1))])
    t = arc % cum[-1]
    i = int(np.clip(np.searchsorted(cum, t) - 1, 0, len(closed) - 2))
    g = (t - cum[i]) / max(cum[i + 1] - cum[i], 1e-12)
    p = closed[i] + (closed[i + 1] - closed[i]) * g
    return p, cum[-1]


co = np.zeros((len(uv), 3))
radial = np.zeros((len(uv), 3))  # outward direction of each start position (for pushing clear of the skin)
for pn in ('front', 'back'):
    sel = np.where(panel_idx == panel_names.index(pn))[0]
    for i in sel:
        x, y = uv[i]
        z = min(m['z_hem'] + y, m['z_neck'] + 0.01)
        perim = contour_point('torso', z, 0.0, 0.015)[1]
        start = 0.0 if pn == 'front' else perim / 2  # the back panel starts at the back centre, +x towards -X
        p, _ = contour_point('torso', z, start + x, 0.015)
        co[i] = (p[0], p[1], z)
        c0 = radial_profile('torso')[2][int(np.clip(np.searchsorted(radial_profile('torso')[0], z), 0, len(radial_profile('torso')[0]) - 1))]
        radial[i] = (p[0] - c0[0], p[1] - c0[1], 0.0)

# Collar: round the neck, centre front at x = 0, towards +X first; its length spread over the neck contour.
sel = np.where(panel_idx == panel_names.index('collar'))[0]
for i in sel:
    x, y = uv[i]
    # The collar's bottom follows the neckline: low at the centre front, high at the back.
    z = m['z_neck'] - 0.015 * math.cos(2 * math.pi * x / info['collar_len']) + 0.005 + y
    perim = contour_point('neck', z, 0.0, 0.02)[1]
    p, _ = contour_point('neck', z, x * perim / info['collar_len'], 0.02)
    co[i] = (p[0], p[1], z)
    radial[i] = (p[0], p[1] - J['neck'][1], 0.0)


# Underarm gussets: a small diamond in the armpit, gT towards the arm, gF towards the front.
for side, sgn in (('L', 1.0), ('R', -1.0)):
    sel = np.where(panel_idx == panel_names.index(f'gusset{side}'))[0]
    perim = contour_point('torso', m['z_ua'], 0.0, 0.015)[1]
    p, _ = contour_point('torso', m['z_ua'], perim * (0.25 if sgn > 0 else 0.75), 0.015)
    c3 = np.array([p[0], p[1], m['z_ua']])
    e_y = np.array([sgn * 0.94, 0.0, 0.34])
    e_x = np.array([0.0, 1.0, 0.0]) * (1 if sgn > 0 else -1)
    for i in sel:
        co[i] = c3 + uv[i, 0] * e_x + uv[i, 1] * e_y
        radial[i] = (sgn, 0.0, 0.0)


def smooth_path(points, n=200):
    pts = np.array(points)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, cum[-1], n)
    P = np.stack([np.interp(t, cum, pts[:, k]) for k in range(3)], axis=1)
    for _ in range(40):  # relax the corners so the frame turns smoothly at the elbow and shoulder
        P[1:-1] = P[1:-1] * 0.5 + (P[:-2] + P[2:]) * 0.25
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    return P, np.concatenate([[0], np.cumsum(seg)])


for side in ('L', 'R'):
    pn = f'sleeve{side}'
    sel = np.where(panel_idx == panel_names.index(pn))[0]
    sh, el, wr = J[f'sh{side}'], J[f'el{side}'], J[f'wr{side}']
    cuff = wr + (wr - el) / np.linalg.norm(wr - el) * CUFF_EXT
    sgn = 1.0 if sh[0] > 0 else -1.0
    neck_pt = np.array([sgn * (m['neck_half_w'] + 0.015), J['neck'][1], m['z_neck'] + 0.01])
    P, cum = smooth_path([cuff, wr, el, sh, neck_pt])
    ys = uv[sel, 1]
    ytop = ys.max()
    # Width of the pattern at each height (both sides of the outline), for the tube radius.
    bins = np.linspace(0, ytop, 60)
    widths = []
    for b0 in bins:
        near = uv[sel][np.abs(ys - b0) < ytop / 60 + 0.004]
        widths.append(np.ptp(near[:, 0]) if len(near) > 1 else 0.05)
    widths = np.maximum(np.array(widths), 0.04)
    for i in sel:
        x, y = uv[i]
        t = y / ytop * cum[-1]
        k = min(int(np.searchsorted(cum, t)), len(P) - 1)
        k0 = max(k - 1, 0)
        T = P[min(k + 1, len(P) - 1)] - P[k0]
        T /= np.linalg.norm(T)
        U = np.array([0, 0, 1.0]) - T[2] * T
        U /= np.linalg.norm(U)
        S = np.cross(T, U)
        w = np.interp(y, bins, widths)
        r = w / (2 * math.pi) + 0.012
        th = 2 * math.pi * x / w
        co[i] = P[k] + r * (math.cos(th) * U + math.sin(th) * S)
        radial[i] = math.cos(th) * U + math.sin(th) * S

# Push every vertex clear of the skin.
deps = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(body, deps)
standoff = np.where(np.isin(panel_idx, [panel_names.index('sleeveL'), panel_names.index('sleeveR')]), 0.02, 0.012)
standoff[panel_idx == panel_names.index('collar')] = 0.018
def push_clear():
    """Snap any vertex closer than its standoff to the skin out to the standoff (nearest skin point)."""
    count = 0
    for i in range(len(co)):
        loc, nrm_, _, _ = bvh.find_nearest(Vector(co[i]))
        if loc is None:
            continue
        if (Vector(co[i]) - loc).dot(nrm_) < standoff[i]:
            co[i] = np.array(loc + nrm_ * standoff[i])
            count += 1
    return count


# Snap clear, then relax the start shape (neighbours in the pattern stay neighbours in 3D) and snap again. Without
# the relaxation, armpit vertices land on different surfaces (arm, chest) and the simulation tears them apart.
tri_arr = np.array(tris)
nbr_sum = np.zeros_like(co)
deg = np.zeros(len(co))
for a_, b_ in ((0, 1), (1, 2), (2, 0)):
    np.add.at(deg, tri_arr[:, a_], 1)
    np.add.at(deg, tri_arr[:, b_], 1)
pushed = push_clear()
for it in range(12):
    nbr_sum[:] = 0
    for a_, b_ in ((0, 1), (1, 2), (2, 0)):
        np.add.at(nbr_sum, tri_arr[:, a_], co[tri_arr[:, b_]])
        np.add.at(nbr_sum, tri_arr[:, b_], co[tri_arr[:, a_]])
    co = co * 0.5 + 0.5 * nbr_sum / np.maximum(deg, 1)[:, None]
    pushed = push_clear()

# --- 4. Cloth simulation --------------------------------------------------------------------------------------------
me = bpy.data.meshes.new(f'{op_id}-{args.garment}')
loose = [list(p) for p in pairs]
me.from_pydata(co.tolist(), loose, tris)
me.validate()
obj = bpy.data.objects.new(f'{op_id}-{args.garment}', me)
scene.collection.objects.link(obj)
# Rest shape: the flat pattern (lengths and zero curvature come from the cut fabric, not the arrangement).
obj.shape_key_add(name='arranged')
flat = obj.shape_key_add(name='pattern')
flat.value = 0.0  # Blender 5.2 adds keys at 1.0; the start shape must stay the arranged one
for i, (x, y) in enumerate(uv):
    flat.data[i].co = (x, y, 0.0)
uvl = me.uv_layers.new(name='pattern')
for loop in me.loops:
    uvl.data[loop.index].uv = uv[loop.vertex_index]
pid = me.attributes.new('panel', 'INT', 'FACE')
for poly in me.polygons:
    pid.data[poly.index].value = int(panel_idx[poly.vertices[0]])

MAT = {name: p.material for name, p in pattern.panels.items()}
vg_struct = obj.vertex_groups.new(name='stiff_struct')
vg_bend = obj.vertex_groups.new(name='stiff_bend')
for pi, name in enumerate(panel_names):
    ids = np.where(panel_idx == pi)[0].tolist()
    ripstop = MAT[name] == 'ripstop'
    vg_struct.add(ids, 1.0 if ripstop else 0.0, 'REPLACE')
    vg_bend.add(ids, 1.0 if name == 'collar' else (0.05 if ripstop else 0.0), 'REPLACE')

coll_src = body.copy()
coll_src.data = body.data.copy()
coll_src.modifiers.clear()
coll_src.parent = None
coll_src.matrix_world = body.matrix_world
coll_src.name = 'collider'
scene.collection.objects.link(coll_src)
cm = coll_src.modifiers.new('collision', 'COLLISION')
coll_src.collision.thickness_outer = 0.004
coll_src.collision.cloth_friction = 2.0
body.hide_render = True

def add_cloth(self_collision, frames):
    cloth = obj.modifiers.new('cloth', 'CLOTH')
    cs = cloth.settings
    cs.quality = 16
    cs.mass = 0.1
    cs.air_damping = 1.0
    cs.tension_stiffness = 14.0
    cs.compression_stiffness = 40.0
    cs.tension_stiffness_max = 45.0
    cs.compression_stiffness_max = 60.0
    cs.vertex_group_structural_stiffness = 'stiff_struct'
    cs.shear_stiffness = 6.0
    cs.bending_stiffness = 0.05
    cs.bending_stiffness_max = 8.0
    cs.vertex_group_bending = 'stiff_bend'
    cs.use_sewing_springs = True
    cs.sewing_force_max = 8.0
    cs.rest_shape_key = flat
    cs.use_internal_springs = False
    cc = cloth.collision_settings
    cc.use_collision = True
    cc.distance_min = 0.003
    cc.collision_quality = 4
    cc.use_self_collision = self_collision
    cc.self_distance_min = 0.003
    cc.self_friction = 5.0
    cloth.point_cache.frame_start = 1
    cloth.point_cache.frame_end = frames
    scene.frame_start, scene.frame_end = 1, frames
    return cloth


def evaluated_positions():
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    em = ev.to_mesh()
    out = np.array([v.co[:] for v in em.vertices])
    ev.to_mesh_clear()
    return out


# Phase A: sew without self collision so seam edges can pass over each other to meet. Phase B: settle with self
# collision from the sewn state (the rest shape stays the flat pattern).
PHASES = (('sew', False, args.frames), ('settle', True, max(30, args.frames // 3)))
t0 = time.time()
gaps = []
for phase, self_coll, frames in PHASES:
    scene.frame_set(1)
    cloth = add_cloth(self_coll, frames)
    for f in range(1, frames + 1):
        scene.frame_set(f)
        if f % 15 == 0 or f == frames:
            P = evaluated_positions()
            gap = float(np.linalg.norm(P[[a for a, _ in pairs]] - P[[b for _, b in pairs]], axis=1).max())
            gaps.append((phase, f, gap))
            print(f'operators: {phase} frame {f}/{frames}, worst seam gap {gap * 1000:.1f} mm, {time.time() - t0:.0f} s')
            if not np.isfinite(P).all() or gap > 0.5:
                far = np.argsort(-np.linalg.norm(P - co, axis=1))[:8]
                for i in far:
                    print('  moved', i, PANELS_OF[i], np.round(uv[i], 3), np.round(co[i], 3), '->', np.round(P[i], 2))
                raise SystemExit(f'cloth simulation diverged in {phase} at frame {f} (seam gap {gap:.2f} m)')
    obj.modifiers.remove(cloth)
    scene.frame_set(1)
    for i, kd in enumerate(obj.data.shape_keys.key_blocks['arranged'].data):
        kd.co = P[i]
sim_seconds = time.time() - t0
if not np.isfinite(P).all():
    raise SystemExit('cloth simulation diverged')

# --- 5. Weld the seams ----------------------------------------------------------------------------------------------
parent = list(range(len(P)))


def find(a):
    while parent[a] != a:
        parent[a] = parent[parent[a]]
        a = parent[a]
    return a


for a, b in pairs:
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[max(ra, rb)] = min(ra, rb)
groups = {}
for i in range(len(P)):
    groups.setdefault(find(i), []).append(i)
Pw = P.copy()
for root, members in groups.items():
    if len(members) > 1:
        Pw[members] = P[members].mean(axis=0)

obj.shape_key_clear()
for i, v in enumerate(me.vertices):
    v.co = Pw[i]
bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
# Where the weld moved vertices more than a few millimetres (a seam the simulation left open), relax the fabric
# round them afterwards so the join does not leave a pinch. Collected before the weld (surviving vertices only).
moved = np.linalg.norm(Pw - P, axis=1)
roots = np.array([find(i) == i for i in range(len(P))])
region = set()
for root in {find(i) for i in range(len(P)) if moved[i] > 0.004}:
    r = min(0.06, 3.0 * float(moved[groups[root]].max()))
    near = np.where(roots & (np.linalg.norm(Pw - Pw[root], axis=1) < r))[0]
    region.update(bm.verts[int(k)] for k in near)
relaxed = len(region)
targetmap = {bm.verts[i]: bm.verts[find(i)] for i in range(len(P)) if find(i) != i}
bmesh.ops.weld_verts(bm, targetmap=targetmap)
loose_e = [e for e in bm.edges if not e.link_faces]
bmesh.ops.delete(bm, geom=loose_e, context='EDGES')
if region:
    for _ in range(8):
        bmesh.ops.smooth_vert(bm, verts=list(region), factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.to_mesh(me)
bm.free()
for poly in me.polygons:
    poly.use_smooth = True

os.makedirs(args.out, exist_ok=True)
stem = os.path.join(args.out, f'{op_id}-{args.garment}-sim')
np.savez_compressed(stem + '.npz', uv=uv, panel_idx=panel_idx, tris=np.array(tris), sim=P,
                    pairs=np.array(pairs), weld=np.array([find(i) for i in range(len(P))]))
coll_src.hide_render = True
bpy.ops.wm.save_as_mainfile(filepath=stem + '.blend', compress=True)
report = {
    'operator': op_id, 'garment': args.garment, 'seed': args.seed, 'blender': bpy.app.version_string,
    'measurements': m, 'panels': {n: {'material': p.material, 'areaM2': round(p.area(), 4)}
                                  for n, p in pattern.panels.items()},
    'seams': [{'name': sl['name'], 'style': sl['style'], 'a': sl['a'][0], 'b': sl['b'][0], 'pairs': len(sl['a'][1])}
              for sl in seam_lines],
    'seamLines': [{'name': sl['name'], 'style': sl['style'], 'a': [sl['a'][0], [int(i) for i in sl['a'][1]]],
                   'b': [sl['b'][0], [int(i) for i in sl['b'][1]]]} for sl in seam_lines],
    'panelNames': panel_names,
    'details': details,
    'verts': len(uv), 'tris': len(tris), 'weldedVerts': len(me.vertices), 'pushedClear': pushed, 'relaxedAfterWeld': relaxed,
    'weldMoveMaxMm': round(float(moved.max()) * 1000, 1),
    'frames': args.frames, 'simSeconds': round(sim_seconds, 1), 'seamGapByFrame': gaps,
    'outlines': {n: [[c, np.asarray(pl).round(5).tolist()] for c, pl in p.edges] for n, p in pattern.panels.items()},
}
with open(stem + '.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
print(f'operators: {op_id} {args.garment} sewn: worst seam gap before weld {gaps[-1][2] * 1000:.1f} mm, '
      f'{sim_seconds:.0f} s -> {stem}.blend')
