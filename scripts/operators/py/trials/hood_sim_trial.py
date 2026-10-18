"""Step 07 fix round 1, item 7: the hood as three sewn panels simulated over the balaclava (A24's undo, trial).
Panels = the fitted hood's centre / left / right panels, flattened (conformal unwrap, area-true scale) as the cloth's
rest shape (A1 Dynamic Mesh method), sewn by springs along the two seams, the skirt pinned where it is sewn to the top's
collar; colliders: balaclava and shirt. Measures seam gap, divergence, penetration, deviation from the fitted hood.
Args after --: frames out_dir gravity ease"""
import sys, os, time, json, math
import bpy, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
GAR = r'C:/NightShift/Mobile-Coop-operators/scripts/operators/py/garments'
sys.path[:0] = [GAR, os.path.dirname(GAR)]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FRAMES = int(argv[0]) if argv else 60
OUT = argv[1] if len(argv) > 1 else os.path.dirname(__file__)
GRAV = float(argv[2]) if len(argv) > 2 else 0.3
EASE = float(argv[3]) if len(argv) > 3 else 1.0
import fitted as FT  # noqa: E402
import head_common as HC  # noqa: E402
bpy.ops.wm.open_mainfile(filepath=r'C:/NightShift/Mobile-Coop-operators/build/operators/wren/wren-headwear.blend')
sc = bpy.context.scene
O = bpy.data.objects


def world(ob):
    mw = np.array(ob.matrix_world)
    V = np.array([v.co[:] for v in ob.data.vertices]) @ mw[:3, :3].T + mw[:3, 3]
    return V, [tuple(p.vertices) for p in ob.data.polygons]


Vs, Fs = world(O['wren-body'])
skin = BVHTree.FromPolygons([tuple(v) for v in Vs], Fs)
fr = HC.head_frame(skin)
c, chin_z = fr['c'], fr['chin_z']
hood = O['wren-headwear-hood']
Vh, Fh = world(hood)
cen = np.array([Vh[list(f)].mean(axis=0) for f in Fh])
isC = (np.abs(cen[:, 0]) < 0.042) & ((cen[:, 1] > c[1] - 0.02) | (cen[:, 2] > chin_z + 0.04))
lab = np.where(isC, 0, np.where(cen[:, 0] > 0, 1, 2))
co, uvs, tris, owner, src = [], [], [], [], []
copies = {}
for p in range(3):
    fs = [f for f, l in zip(Fh, lab) if l == p]
    used = sorted({i for f in fs for i in f})
    rm = {v: k for k, v in enumerate(used)}
    me = bpy.data.meshes.new('flat')
    me.from_pydata(Vh[used].tolist(), [], [tuple(rm[i] for i in f) for f in fs])
    ob = bpy.data.objects.new('flat', me)
    sc.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    for o in sc.objects:
        o.select_set(o == ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.unwrap(method=os.environ.get('UNWRAP', 'CONFORMAL'), margin=0.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    uvl = me.uv_layers.active.data
    U = np.zeros((len(used), 2))
    for poly in me.polygons:
        for li in poly.loop_indices:
            U[me.loops[li].vertex_index] = uvl[li].uv
    a3 = sum(pp.area for pp in me.polygons)
    a2 = 0.0
    for poly in me.polygons:
        q = U[list(poly.vertices)]
        a2 += 0.5 * abs(sum(q[i, 0] * q[(i + 1) % len(q), 1] - q[(i + 1) % len(q), 0] * q[i, 1] for i in range(len(q))))
    U = U * math.sqrt(a3 / a2) * EASE
    bpy.data.objects.remove(ob)
    base = len(co)
    for v in used:
        copies.setdefault(v, []).append(base + rm[v])
        co.append(Vh[v])
        uvs.append(U[rm[v]])
        src.append(v)
        owner.append(p)
    for f in fs:
        g = [base + rm[i] for i in f]
        tris += [(g[0], g[k], g[k + 1]) for k in range(1, len(g) - 1)]
co, uvs, src = np.array(co), np.array(uvs), np.array(src)
pairs = [(cs[0], cs[k]) for cs in copies.values() for k in range(1, len(cs))]
print('trial: panel verts', np.bincount(owner).tolist(), 'tris', len(tris), 'seam pairs', len(pairs), flush=True)
Nv = FT.vertex_normals(co, tris)
co0 = co + Nv * 0.002
me = bpy.data.meshes.new('hoodsim')
me.from_pydata(co0.tolist(), [list(p) for p in pairs], tris)
me.validate()
obj = bpy.data.objects.new('hoodsim', me)
sc.collection.objects.link(obj)
obj.shape_key_add(name='arranged')
flat = obj.shape_key_add(name='pattern')
flat.value = 0.0
for i, (x, y) in enumerate(uvs):
    flat.data[i].co = (x, y, 0.0)
pin = np.where(co[:, 2] < co[:, 2].min() + float(os.environ.get('PINH', '0.012')))[0]
for i in pin:
    flat.data[int(i)].co = tuple(co0[int(i)])
vg = obj.vertex_groups.new(name='pin')
vg.add(pin.tolist(), 1.0, 'REPLACE')
hood.hide_render = hood.hide_viewport = True
for nm in ('wren-headwear-balaclava', 'wren-combat_shirt-hero'):
    cu = O[nm]
    cu.modifiers.new('collision', 'COLLISION')
    cu.collision.thickness_outer = 0.001
    cu.collision.cloth_friction = 5.0
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'CONSTANT'
flat.value = 0.0
flat.keyframe_insert('value', frame=1)
flat.value = 1.0
flat.keyframe_insert('value', frame=2)
sc.frame_set(2)
sc.frame_set(1)
flat.value = 0.0
print('trial: frame-1 key value', obj.data.shape_keys.key_blocks['pattern'].value, flush=True)
cl = obj.modifiers.new('cloth', 'CLOTH')
cs = cl.settings
cs.quality = int(os.environ.get('QUAL', '12'))
cs.mass = float(argv[4]) if len(argv) > 4 else 0.004
cs.effector_weights.gravity = GRAV
cs.air_damping = 1.0
cs.tension_stiffness = cs.compression_stiffness = float(os.environ.get('TENS', '20'))
cs.shear_stiffness = 6.0
cs.bending_stiffness = 0.6
cs.tension_damping = cs.compression_damping = cs.shear_damping = 5.0
cs.use_sewing_springs = True
cs.sewing_force_max = 12.0
cs.use_dynamic_mesh = True
cs.vertex_group_mass = 'pin'
cs.pin_stiffness = 1.0
cc = cl.collision_settings
cc.use_collision = True
cc.distance_min = 0.0015
cc.collision_quality = 4
cc.use_self_collision = False
cl.point_cache.frame_start, cl.point_cache.frame_end = 1, FRAMES
sc.frame_start, sc.frame_end = 1, FRAMES
t0 = time.time()
log = []
bV, bF = world(O['wren-headwear-balaclava'])
bal = BVHTree.FromPolygons([tuple(v) for v in bV], bF)


def pos():
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    em = ev.to_mesh()
    P = np.array([v.co[:] for v in em.vertices])
    ev.to_mesh_clear()
    return P


def inside_count(P):
    n = 0
    for q in P[::5]:
        loc, nrm, _, _ = bal.find_nearest(Vector(q))
        if loc is not None and (Vector(q) - loc).dot(nrm) < -0.0005:
            n += 1
    return n


P = co0
for f in range(1, FRAMES + 1):
    sc.frame_set(f)
    if f in (1, 2, 3, 5) or f % 10 == 0 or f == FRAMES:
        P = pos()
        gap = float(np.linalg.norm(P[[a for a, _ in pairs]] - P[[b for _, b in pairs]], axis=1).max())
        dev = np.linalg.norm(P - co, axis=1)
        rec = {'frame': f, 'gapMm': round(gap * 1000, 2), 'devMeanMm': round(float(dev.mean()) * 1000, 2),
               'devMaxMm': round(float(dev.max()) * 1000, 1), 'finite': bool(np.isfinite(P).all()),
               'insideBalaclavaOf': [inside_count(P), len(P[::5])], 's': round(time.time() - t0), 'centroid': np.round(P.mean(axis=0), 3).tolist(), 'pinDevMm': round(float(dev[pin].mean()) * 1000, 1), 'start': np.round(co.mean(axis=0), 3).tolist(), 'f': f}
        log.append(rec)
        print('trial:', rec, flush=True)
        if not rec['finite'] or gap > 0.5:
            break
Pw = np.zeros_like(Vh)
cnt = np.zeros(len(Vh))
np.add.at(Pw, src, P)
np.add.at(cnt, src, 1)
Pw /= np.maximum(cnt, 1)[:, None]
mw_inv = np.linalg.inv(np.array(hood.matrix_world))
L = Pw @ mw_inv[:3, :3].T + mw_inv[:3, 3]
hood.data.vertices.foreach_set('co', L.ravel())
hood.data.update()
hood.hide_render = hood.hide_viewport = False
obj.modifiers.remove(cl)
bpy.data.objects.remove(obj)
for nm in ('wren-headwear-balaclava', 'wren-combat_shirt-hero'):
    cu = O[nm]
    for m in list(cu.modifiers):
        if m.type == 'COLLISION':
            cu.modifiers.remove(m)
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'hood_sim_trial.json'), 'w') as fh:
    json.dump({'frames': FRAMES, 'gravity': GRAV, 'ease': EASE, 'log': log, 'pins': int(len(pin)), 'verts': int(len(co))}, fh, indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'wren-headwear.blend'), compress=True)
print('trial: saved', OUT)
