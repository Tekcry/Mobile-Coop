"""anim-skeleton S1: the clavicle and finger joints, the clavicle weights and the knuckle loops of the operator LODs.

Shared by scripts/operators/py/bake_lods.py (the full operator bake) and smoke_skeleton.py (a smoke test on the copied
anim-rig blend). The same rules as scripts/anim-skeleton/skin.mjs, which patched the shipped GLBs; the constants live in
scripts/anim-skeleton/skeleton.json (glTF frame; here Blender's: glTF (x, y, z) = Blender (x, z, -y)).

- add_joints(arm, hero_arm): clavL / clavR (parent chest, the chest's orientation at the sternoclavicular point; shL / shR
  reparented under them, every existing rest unchanged), goggleStow / goggleUse (parent head, the head's orientation at
  the goggle pivots) and, with hero_arm, the hero's finger bones under the wrists.
- knuckle_loops(me, hero_arm, offsets, is_hand): planes across each finger at its joints cut the glove edges near them.
- clavicle_split(obj): the chest weight near each shoulder moves to that side's clavicle (smooth falloff); rigid parts keep
  theirs (D28).
- goggle_split(obj): the goggle parts (fully on head) wholly onto goggleUse / goggleStow.
- limit_influences(obj, 4): the 4 largest weights per vertex, renormalised.
"""
import json
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, '..', 'skeleton.json'), encoding='utf-8') as _fh:
    CFG = json.load(_fh)
FINGER_LODS = frozenset(CFG['fingers']['lods'])
SIDES = 'LR'


def _rigid_ids(me):
    at = me.attributes.get('_rigid')
    a = np.zeros(len(me.vertices), dtype=np.float32)
    if at is not None and at.domain == 'POINT' and len(a):
        at.data.foreach_get('value', a)
    return np.rint(a).astype(np.int64)


def sc_points(arm):
    """The sternoclavicular point per side (armature space; skeleton.json's glTF offsets from the neck and chest joints)."""
    B = arm.data.bones
    c = CFG['clavicle']
    neck, chest = B['neck'].head_local, B['chest'].head_local
    return {s: Vector((sx * c['lateral'], chest.y - c['forward'], neck.z - c['belowNeck'])) for s, sx in (('L', 1), ('R', -1))}


def add_joints(arm, hero_arm=None):
    """clavL / clavR on `arm` and, with `hero_arm`, the hero's finger bones it lacks. Returns the added bone names."""
    assert arm.matrix_world == Matrix.Identity(4)
    sc = sc_points(arm)
    fing = {}
    if hero_arm is not None:
        for b in hero_arm.data.bones:
            if b.name.startswith('finger') and b.name not in arm.data.bones:
                fing[b.name] = (b.head_local.copy(), b.tail_local.copy(), b.matrix_local.copy(), b.parent.name, b.use_connect)
    for o in bpy.context.selected_objects:
        o.select_set(False)
    hidden = arm.hide_viewport
    arm.hide_viewport = False
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    added = []
    chest = eb['chest']
    for s in SIDES:
        if f'clav{s}' in eb:
            continue
        c = eb.new(f'clav{s}')
        # the chest's orientation (same direction and roll), so the glTF node's rest rotation is identity under chest
        c.head = sc[s]
        c.tail = sc[s] + (chest.tail - chest.head).normalized() * 0.05
        c.roll = chest.roll
        c.parent = chest
        c.use_connect = False
        c.use_deform = True
        sh = eb[f'sh{s}']
        sh.use_connect = False
        sh.parent = c
        added.append(c.name)
    # goggleStow / goggleUse: the head's orientation at their pivots (skeleton.json goggle, glTF -> Blender)
    head = eb['head']
    g = CFG['goggle']
    for name, at in (('goggleStow', g['stow'] or g['use']), ('goggleUse', g['use'])):
        if name in eb:
            continue
        p = Vector((at[0], -at[2], at[1]))
        b = eb.new(name)
        b.head = p
        b.tail = p + (head.tail - head.head).normalized() * 0.03
        b.roll = head.roll
        b.parent = head
        b.use_connect = False
        b.use_deform = True
        added.append(name)
    for n, (h, t, m, _p, _c) in fing.items():
        b = eb.new(n)
        b.head = h
        b.tail = t
        b.matrix = m
        b.use_deform = True
        added.append(n)
    for n, (_h, _t, _m, p, conn) in fing.items():
        eb[n].parent = eb[p]
        eb[n].use_connect = conn
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.select_set(False)
    arm.hide_viewport = hidden
    return added


def finger_planes(hero_arm, offsets):
    """Per side the 5 finger chains (joint heads + a tip) and the cut planes (skin.mjs handPlanes)."""
    B = hero_arm.data.bones
    chains, planes = {}, []
    for s in SIDES:
        chains[s] = []
        for k in range(1, 6):
            j = [B[f'finger{s}_{k}_{i}'].head_local.copy() for i in (1, 2, 3)]
            seg = [(j[1] - j[0]).length, (j[2] - j[1]).length]
            y = lambda n: B[n].matrix_local.col[1].xyz.normalized()   # noqa: E731 (the bone's own axis)
            tip_len = seg[1] * 0.9
            chains[s].append(j + [j[2] + y(f'finger{s}_{k}_3') * tip_len])
            span = [seg[0], min(seg), min(seg[1], tip_len)]
            for i in range(3):
                n = y(f'finger{s}_{k}_{i + 1}')
                for f in offsets:
                    planes.append({'side': s, 'finger': k, 'joint': i + 1, 'o': j[i] + n * (f * span[i]), 'n': n,
                                   'radius': CFG['knuckles']['thumbRadius' if k == 1 else 'radius']})
    return chains, planes


def _poly_dist(p, pts):
    best = 1e9
    for a, b in zip(pts, pts[1:]):
        ab = b - a
        t = max(0.0, min(1.0, (p - a).dot(ab) / ab.dot(ab)))
        best = min(best, (a + ab * t - p).length)
    return best


def _nearest_finger(p, chains):
    d = [_poly_dist(p, c) for c in chains]
    return 1 + d.index(min(d))


def knuckle_loops(me, hero_arm, offsets, is_hand):
    """Cuts every glove edge (both ends `is_hand(co)`, neither rigid) that a finger plane crosses within its radius of the
    joint, nearest that finger; the two new vertices in a face are joined (the loop). Returns the new vertex count."""
    chains, planes = finger_planes(hero_arm, offsets)
    snap = CFG['knuckles']['snap']
    bm = bmesh.new()
    bm.from_mesh(me)
    rig = bm.verts.layers.float.get('_rigid')
    hand = {}
    added = 0
    for pl in planes:
        o, n = pl['o'], pl['n']
        cuts = []
        for e in bm.edges:
            a, b = e.verts
            if tuple(b.co) < tuple(a.co):   # canonical order by position (skin.mjs does the same)
                a, b = b, a
            da, db = (a.co - o).dot(n), (b.co - o).dot(n)
            if da * db >= 0:
                continue
            t = da / (da - db)
            x = a.co.lerp(b.co, t)
            el = (b.co - a.co).length
            if (x - o).length >= pl['radius'] or t * el <= snap or (1 - t) * el <= snap:
                continue
            if rig is not None and (a[rig] > 0 or b[rig] > 0):
                continue
            ok = True
            for v in (a, b):
                key = tuple(v.co)
                if key not in hand:
                    hand[key] = bool(is_hand(v.co.copy()))
                ok = ok and hand[key]
            if not ok:
                continue
            if _nearest_finger(x, chains[pl['side']]) != pl['finger']:
                continue
            cuts.append((e, a, t, x))
        new = []
        for e, a, t, x in cuts:
            _ne, nv = bmesh.utils.edge_split(e, a, t)
            nv.co = x
            if rig is not None:
                nv[rig] = 0.0
            new.append(nv)
        bm.faces.index_update()
        newset = set(new)
        faces = sorted({f for v in new for f in v.link_faces}, key=lambda f: f.index)
        for f in faces:
            vs = [v for v in f.verts if v in newset]
            if len(vs) == 2:
                bmesh.utils.face_split(f, vs[0], vs[1])
        added += len(new)
    bm.to_mesh(me)
    bm.free()
    me.update()
    return added


def _weights(obj):
    names = [g.name for g in obj.vertex_groups]
    W = np.zeros((len(obj.data.vertices), len(names)))
    for v in obj.data.vertices:
        for g in v.groups:
            W[v.index, g.group] = g.weight
    return names, W


def _write(obj, W_old, W):
    for gi, g in enumerate(obj.vertex_groups):
        old, new = W_old[:, gi], W[:, gi]
        rm = np.nonzero((old > 0) & (new == 0))[0].tolist()
        if rm:
            g.remove(rm)
        for vi in np.nonzero((new > 0) & (new != old))[0]:
            g.add([int(vi)], float(new[vi]), 'REPLACE')


def clavicle_split(obj):
    """The chest weight x smoothstep(|x|) x smoothstep(height) x max moves to clavL / clavR (side by the sign of x);
    rigid parts keep theirs. Returns the vertex count per side."""
    c = CFG['clavicle']
    for s in SIDES:
        if f'clav{s}' not in obj.vertex_groups:
            obj.vertex_groups.new(name=f'clav{s}')
    names, W = _weights(obj)
    W0 = W.copy()
    co = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get('co', co)
    m = np.array(obj.matrix_world)
    P = co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]

    def smooth(e0, e1, x):
        t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
        return t * t * (3 - 2 * t)
    share = smooth(c['x'][0], c['x'][1], np.abs(P[:, 0])) * smooth(c['y'][0], c['y'][1], P[:, 2]) * c['max']
    rigid = _rigid_ids(obj.data) > 0
    ch = names.index('chest')
    out = {}
    for s, sign in (('L', 1), ('R', -1)):
        on = (np.sign(P[:, 0]) == sign) & (W[:, ch] > 0) & (share > 1e-4) & ~rigid
        k = names.index(f'clav{s}')
        W[on, k] += W[on, ch] * share[on]
        W[on, ch] *= 1 - share[on]
        out[s] = int(on.sum())
    _write(obj, W0, W)
    return out


def goggle_split(obj, lens_material_suffix='-glow'):
    """The goggle parts wholly onto goggleUse / goggleStow, only vertices fully on head: by the '_goggle' point attribute
    (1 in use, 2 stowed) when the mesh has it, else the lens faces (material name ending in the suffix) and every connected
    rigid piece inside skeleton.json's goggle box (skin.mjs goggleWeights). Returns {'use': n, 'stow': n}."""
    me = obj.data
    for n in ('goggleStow', 'goggleUse'):
        if n not in obj.vertex_groups:
            obj.vertex_groups.new(name=n)
    names, W = _weights(obj)
    W0 = W.copy()
    nv = len(me.vertices)
    hd = names.index('head') if 'head' in names else -1
    on_head = (W[:, hd] >= 0.999) if hd >= 0 else np.zeros(nv, bool)
    cls = np.zeros(nv, np.int8)
    at = me.attributes.get('_goggle')
    if at is not None and at.domain == 'POINT':
        g = np.zeros(nv, np.float32)
        at.data.foreach_get('value', g)
        g = np.rint(g).astype(np.int8)
        cls[(g == 1) & on_head] = 1
        cls[(g == 2) & on_head] = 2
    else:
        lens = {i for i, m in enumerate(me.materials) if m and m.name.endswith(lens_material_suffix)}
        for p in me.polygons:
            if p.material_index in lens:
                for v in p.vertices:
                    cls[v] = 1 if on_head[v] else cls[v]
        rid = _rigid_ids(me)
        par = np.arange(nv)

        def find(x):
            while par[x] != x:
                par[x] = par[par[x]]
                x = par[x]
            return x
        for e in me.edges:
            a, b = e.vertices
            if rid[a] > 0 and rid[b] > 0:
                ra, rb = find(a), find(b)
                if ra != rb:
                    par[max(ra, rb)] = min(ra, rb)
        co = np.empty(nv * 3)
        me.vertices.foreach_get('co', co)
        m = np.array(obj.matrix_world)
        P = co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]
        bx = CFG['goggle']['box']
        # glTF box -> Blender: x = x, y_gl = z_bl, z_gl = -y_bl
        inside = ((P[:, 0] >= bx['x'][0]) & (P[:, 0] <= bx['x'][1]) & (P[:, 2] >= bx['y'][0]) & (P[:, 2] <= bx['y'][1])
                  & (-P[:, 1] >= bx['z'][0]) & (-P[:, 1] <= bx['z'][1]))
        ok = {}
        for v in np.nonzero(rid > 0)[0]:
            r = find(v)
            ok[r] = ok.get(r, True) and bool(inside[v]) and bool(on_head[v])
        for v in np.nonzero(rid > 0)[0]:
            if ok[find(v)]:
                cls[v] = 1
    for c, n in ((1, 'goggleUse'), (2, 'goggleStow')):
        sel = cls == c
        W[sel] = 0.0
        W[sel, names.index(n)] = 1.0
    _write(obj, W0, W)
    return {'use': int((cls == 1).sum()), 'stow': int((cls == 2).sum())}


def limit_influences(obj, n=4):
    """The n largest weights per vertex, renormalised (ties: the lower group index). Returns the pruned count."""
    _names, W = _weights(obj)
    W0 = W.copy()
    order = np.argsort(-W, axis=1, kind='stable')
    keep = np.zeros_like(W, bool)
    np.put_along_axis(keep, order[:, :n], True, axis=1)
    pruned = int(((W > 0) & ~keep).sum())
    W = np.where(keep, W, 0.0)
    W[W < 1e-6] = 0.0
    s = W.sum(1, keepdims=True)
    W = np.where(s > 0, W / np.maximum(s, 1e-12), W)
    _write(obj, W0, W)
    return pruned
