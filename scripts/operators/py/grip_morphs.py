"""Grip morph targets for the operator's game files (feature/weapons; Michael 2026-10-19: "I'd rather the character holds
the gun properly").

The game LODs skin to the 23 game joints only (one bone per hand), so their fingers cannot bend at runtime. This poses
the hero rig's finger bones (wren-lods.blend: `wren-rig`, `wren-hero`) into two grips and stores each as a morph target
on every game file (hero, LOD0-2):
  - gripR: the trigger hand round a pistol grip (middle, ring, little finger wrapped; index finger crooked to the
    trigger; thumb along the far side);
  - gripL: the support hand round a handguard / launcher tube or cupping the pistol (all four fingers wrapped, thumb over).
Per game vertex weighted to that hand, the displacement is the inverse-distance mean of the nearest hero vertices'
(posed - rest) displacement (positions and normals), written as glTF sparse morph targets (POSITION, NORMAL), names in
`mesh.extras.targetNames`. Re-running replaces the targets. The runtime blends them by the rig's hand-grip weights.

  blender -b wren-lods.blend --python grip_morphs.py -- --seed N --glb a.glb --glb b.glb [--render DIR]
"""
import json
import math
import os
import struct
import sys

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402

args = common.parse_args({'--glb': {'action': 'append', 'default': []}, '--render': {'default': ''}, '--operator': {'default': 'wren'}})
common.check_version()
op = args.operator
rig = bpy.data.objects[f'{op}-rig']
hero = bpy.data.objects[f'{op}-hero']

# ---- the hands' frames from the rest skeleton ---------------------------------------------------------------------
B = rig.data.bones
MW = rig.matrix_world


def head(n):
    return MW @ B[n].head_local


def tail(n):
    return MW @ B[n].tail_local


def hand_frame(s):
    """Palm normal (out of the palm) and the thumb's index for side s, from the finger bases."""
    bases = {k: head(f'finger{s}_{k}_1') for k in range(1, 6)}
    wrist = head(f'hand{s}')
    # the thumb: the finger base farthest from the line of the other bases' centroid along the hand
    cen = sum((bases[k] for k in range(1, 6)), Vector()) / 5
    along = (cen - wrist).normalized()
    off = {k: ((bases[k] - wrist) - along * (bases[k] - wrist).dot(along)).length for k in bases}
    lateral = {k: (bases[k] - cen).length for k in bases}
    thumb = max(bases, key=lambda k: lateral[k] + off[k])
    others = [k for k in range(1, 6) if k != thumb]
    # index and little finger bases: the two ends of the row of the other four
    row = sorted(others, key=lambda k: (bases[k] - bases[thumb]).length)
    index, little = row[0], row[-1]
    across = (bases[little] - bases[index]).normalized()
    n = along.cross(across).normalized()
    # the palm is the side the thumb sits towards
    if n.dot(bases[thumb] - (bases[index] + bases[little]) / 2) < 0:
        n = -n
    return {'n': n, 'thumb': thumb, 'index': index, 'little': little, 'order': row, 'along': along, 'across': across, 'wrist': wrist}


FR = {s: hand_frame(s) for s in 'LR'}
for s, f in FR.items():
    print('grip_morphs: hand', s, 'thumb', f['thumb'], 'index', f['index'], 'row', f['order'], 'palm n', [round(x, 3) for x in f['n']])

# finger curl (deg) per joint 1..3; index row position 0 (index) .. 3 (little)
GRIPS = {
    # trigger hand on a pistol grip: index crooked onto the trigger, the other three wrapped round the grip
    'gripR': {'side': 'R', 'fingers': [(28, 40, 22), (62, 88, 48), (64, 90, 50), (66, 92, 52)], 'thumb': (18, 22, 14), 'thumbIn': 34},
    # support hand round a 50 mm tube or cupping a pistol grip: all four wrapped, a little more open
    'gripL': {'side': 'L', 'fingers': [(48, 62, 34), (52, 66, 36), (54, 68, 38), (56, 70, 40)], 'thumb': (20, 24, 16), 'thumbIn': 30},
}


def pose_grip(g):
    """Sets the finger pose bones for one grip (others at rest)."""
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = Quaternion()
    if g is None:
        return
    s = g['side']
    f = FR[s]
    n = f['n']

    def bend(name, axis_arm, deg):
        b = B[name]
        loc = (MW.to_3x3() @ b.matrix_local.to_3x3()).inverted() @ axis_arm
        rig.pose.bones[name].rotation_quaternion = Quaternion(loc.normalized(), math.radians(deg))

    for pos, k in enumerate(f['order']):
        for j, deg in zip((1, 2, 3), g['fingers'][pos]):
            name = f'finger{s}_{k}_{j}'
            d = (tail(name) - head(name)).normalized()
            # rotate the bone towards the palm normal: about d x n
            bend(name, d.cross(n), deg)
    t = f['thumb']
    for j, deg in zip((1, 2, 3), g['thumb']):
        name = f'finger{s}_{t}_{j}'
        d = (tail(name) - head(name)).normalized()
        q = Quaternion(d.cross(n).normalized(), math.radians(deg))
        if j == 1:
            # opposition: the thumb swings in towards the index finger's base, across the palm
            to_idx = (head(f'finger{s}_{f["index"]}_1') - head(name))
            ax = d.cross(to_idx).normalized()
            q = Quaternion(ax, math.radians(g['thumbIn'])) @ q
        b = B[name]
        m = (MW.to_3x3() @ b.matrix_local.to_3x3()).inverted()
        aa = q.to_axis_angle()
        rig.pose.bones[name].rotation_quaternion = Quaternion((m @ aa[0]).normalized(), aa[1])
    bpy.context.view_layer.update()


def hero_coords():
    dg = bpy.context.evaluated_depsgraph_get()
    ev = hero.evaluated_get(dg)
    me = ev.to_mesh()
    n = len(me.vertices)
    co = np.empty(n * 3, np.float32)
    me.vertices.foreach_get('co', co)
    no = np.empty(n * 3, np.float32)
    me.vertices.foreach_get('normal', no)
    ev.to_mesh_clear()
    m = np.array(hero.matrix_world)
    co = co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]
    no = no.reshape(-1, 3) @ m[:3, :3].T
    return co, no


pose_grip(None)
REST, REST_N = hero_coords()
# hero vertices of each hand (weight on the hand or a finger of that side)
gi = {g.index: g.name for g in hero.vertex_groups}
hand_w = {'L': np.zeros(len(hero.data.vertices), np.float32), 'R': np.zeros(len(hero.data.vertices), np.float32)}
for v in hero.data.vertices:
    for g in v.groups:
        nm = gi.get(g.group, '')
        for s in 'LR':
            if nm == f'hand{s}' or nm.startswith(f'finger{s}_'):
                hand_w[s][v.index] += g.weight
DISP = {}
for name, g in GRIPS.items():
    pose_grip(g)
    co, no = hero_coords()
    DISP[name] = (co - REST, no - REST_N)
    print('grip_morphs:', name, 'max hero displacement', round(float(np.abs(co - REST).max()) * 1000, 1), 'mm')
TREE = {}
for s in 'LR':
    idx = np.nonzero(hand_w[s] > 0.01)[0]
    kd = KDTree(len(idx))
    for i, vi in enumerate(idx):
        kd.insert(REST[vi], i)
    kd.balance()
    TREE[s] = (kd, idx)


def transfer(P, s, name, k=6):
    """Displacement (positions, normals) at points P (Blender frame) from the hero's nearest hand vertices."""
    kd, idx = TREE[s]
    dp, dn = DISP[name]
    out_p = np.zeros_like(P)
    out_n = np.zeros_like(P)
    far = 0
    for i, p in enumerate(P):
        hits = kd.find_n(Vector(p), k)
        if not hits or hits[0][2] > 0.012:
            far += 1
            continue
        w = np.array([1.0 / max(h[2], 1e-4) for h in hits])
        ids = np.array([idx[h[1]] for h in hits])
        w /= w.sum()
        out_p[i] = (dp[ids] * w[:, None]).sum(0)
        out_n[i] = (dn[ids] * w[:, None]).sum(0)
    return out_p, out_n, far


# ---- GLB patching ---------------------------------------------------------------------------------------------------
COMP = {5126: ('f', 4), 5125: ('I', 4), 5123: ('H', 2), 5121: ('B', 1)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def read_glb(path):
    b = open(path, 'rb').read()
    jl = struct.unpack_from('<I', b, 12)[0]
    js = json.loads(b[20:20 + jl])
    bl = struct.unpack_from('<I', b, 20 + jl)[0]
    return js, bytearray(b[28 + jl:28 + jl + bl])


def acc_data(js, binb, i):
    a = js['accessors'][i]
    bv = js['bufferViews'][a['bufferView']]
    fmt, size = COMP[a['componentType']]
    nc = NC[a['type']]
    stride = bv.get('byteStride', nc * size)
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    dt = np.dtype('<' + fmt)
    if stride == nc * size:
        arr = np.frombuffer(bytes(binb[off:off + a['count'] * stride]), dt)
        return arr.reshape(a['count'], nc).astype(np.float64)
    out = np.empty((a['count'], nc))
    for r in range(a['count']):
        out[r] = np.frombuffer(bytes(binb[off + r * stride:off + r * stride + nc * size]), dt)
    return out


def write_glb(path, js, binb):
    raw = json.dumps(js, separators=(',', ':')).encode()
    raw += b' ' * ((-len(raw)) % 4)
    binb = bytes(binb) + b'\0' * ((-len(binb)) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(raw) + len(binb)))
        f.write(struct.pack('<II', len(raw), 0x4E4F534A))
        f.write(raw)
        f.write(struct.pack('<II', len(binb), 0x004E4942))
        f.write(binb)


def patch(path):
    js, binb = read_glb(path)
    joints = js['skins'][0]['joints']
    jname = [js['nodes'][j]['name'] for j in joints]
    # the game files skin the hand to the wrist joint (and a hand joint where present)
    hand_slot = {s: [jname.index(n) for n in (f'wr{s}', f'hand{s}') if n in jname] for s in 'LR'}
    names = list(GRIPS)
    report = {}

    def add_view(data):
        nonlocal binb
        pad = (-len(binb)) % 8
        binb += b'\0' * pad
        js['bufferViews'].append({'buffer': 0, 'byteOffset': len(binb), 'byteLength': len(data)})
        binb += data
        return len(js['bufferViews']) - 1

    for m in js['meshes']:
        for prim in m['primitives']:
            prim.pop('targets', None)
            at = prim['attributes']
            P = acc_data(js, binb, at['POSITION'])
            J = acc_data(js, binb, at['JOINTS_0']).astype(int)
            W = acc_data(js, binb, at['WEIGHTS_0'])
            # glTF (x, y, z) -> Blender (x, -z, y)
            PB = np.stack([P[:, 0], -P[:, 2], P[:, 1]], 1)
            targets = []
            for name in names:
                s = GRIPS[name]['side']
                hw = np.zeros(len(P))
                for c in range(4):
                    hw += np.where(np.isin(J[:, c], hand_slot[s]), W[:, c], 0.0)
                sel = np.nonzero(hw > 0.02)[0]
                dp, dn, far = transfer(PB[sel], s, name) if len(sel) else (np.zeros((0, 3)), np.zeros((0, 3)), 0)
                dp *= np.clip(hw[sel] * 1.5, 0, 1)[:, None]
                dn *= np.clip(hw[sel] * 1.5, 0, 1)[:, None]
                moved = np.nonzero(np.abs(dp).max(1) > 1e-6)[0] if len(sel) else np.zeros(0, int)
                ids = sel[moved].astype(np.uint32)
                # Blender (x, y, z) -> glTF (x, z, -y)
                gp = np.stack([dp[moved, 0], dp[moved, 2], -dp[moved, 1]], 1).astype(np.float32)
                gn = np.stack([dn[moved, 0], dn[moved, 2], -dn[moved, 1]], 1).astype(np.float32)
                t = {}
                for key, vals in (('POSITION', gp), ('NORMAL', gn)):
                    acc = {'componentType': 5126, 'count': len(P), 'type': 'VEC3'}
                    if len(ids):
                        acc['sparse'] = {'count': int(len(ids)), 'indices': {'bufferView': add_view(ids.tobytes()), 'componentType': 5125},
                                         'values': {'bufferView': add_view(vals.tobytes())}}
                    if key == 'POSITION':
                        acc['min'] = [float(x) for x in (vals.min(0) if len(ids) else np.zeros(3))]
                        acc['max'] = [float(x) for x in (vals.max(0) if len(ids) else np.zeros(3))]
                        acc['min'] = [min(0.0, x) for x in acc['min']]
                        acc['max'] = [max(0.0, x) for x in acc['max']]
                    js['accessors'].append(acc)
                    t[key] = len(js['accessors']) - 1
                targets.append(t)
                report.setdefault(name, {'vertices': 0, 'far': 0, 'maxMm': 0.0})
                report[name]['vertices'] += int(len(ids))
                report[name]['far'] += int(far)
                if len(ids):
                    report[name]['maxMm'] = max(report[name]['maxMm'], round(float(np.abs(gp).max()) * 1000, 1))
            prim['targets'] = targets
        m['weights'] = [0.0] * len(names)
        m.setdefault('extras', {})['targetNames'] = names
    js['buffers'][0]['byteLength'] = len(binb)
    write_glb(path, js, binb)
    print('grip_morphs:', os.path.basename(path), json.dumps(report), os.path.getsize(path))
    return report


reports = {os.path.basename(p): patch(p) for p in args.glb}

# ---- proof renders: each hand gripping, hero mesh, close ------------------------------------------------------------
if args.render:
    args.render = os.path.abspath(args.render)
    os.makedirs(args.render, exist_ok=True)
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'weapons', 'py'))
    import wlib as W  # noqa: E402
    scene = bpy.context.scene
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.hide_render = o is not hero
        if o.type in ('LIGHT', 'CAMERA') and o.name not in ('key', 'fill', 'rim'):
            o.hide_render = True
    W.render_setup(scene, 64)
    for name, g in GRIPS.items():
        pose_grip(g)
        f = FR[g['side']]
        c = f['wrist'] + f['along'] * 0.07
        for view, off in (('palm', f['n'] * 0.32 + f['across'] * 0.05), ('back', -f['n'] * 0.32 + f['across'] * 0.05), ('side', f['across'] * 0.32 + f['n'] * 0.08)):
            cam = W.camera(f'cam-{name}-{view}', c + off, c, 50.0)
            scene.camera = cam
            W.light(f'k-{name}-{view}', c + off * 1.5 + Vector((0, 0, 0.3)), c, 30, 0.4)
            W.render(os.path.join(args.render, f'{op}-{name}-{view}.webp'), (900, 900))
    pose_grip(None)
print('grip_morphs: done', json.dumps(reports))
