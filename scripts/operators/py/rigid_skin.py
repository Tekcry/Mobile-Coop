"""The rigid-kit skinning rule (D28, step 11b), shared by export_gltf.py (the Lab GLB), bake_lods.py (hero and LODs)
and pose_check.py.

Every vertex of a rigid part (the '_rigid' point attribute: the part id from the garment builders' registry, written
to each item's sim report as measurements.rigid) takes its part's declared weights - one bone, or one fixed blend
(rib 2: chest 0.5 / spine 0.5) - identical on every vertex, so animation never bends it. Everything else keeps the
nearest-body-vertex weights. The head kit's hard parts (goggle, mounts, brow plate, battery pod) are tagged here by
rule (head_kit.py has no registry): every head_kit vertex above HEAD_Z except the cables rides the head bone.
"""
import glob
import json
import os

import numpy as np
from mathutils import Vector

HEAD = {'id': 501, 'name': 'headKit', 'bones': {'head': 1.0}, 'role': 'hard', 'item': 'head_kit'}
HEAD_Z = 1.48


def registry(out, op):
    """{id: entry} from every built item's sim report, plus the head kit's rule entry."""
    reg = {}
    for f in sorted(glob.glob(os.path.join(out, f'{op}-*-sim.json'))):
        with open(f, encoding='utf-8') as fh:
            m = json.load(fh).get('measurements', {}) or {}
        for e in m.get('rigid', []) or []:
            reg[int(e['id'])] = e
    reg[HEAD['id']] = HEAD
    return reg


def ids_of(me):
    at = me.attributes.get('_rigid')
    a = np.zeros(len(me.vertices), dtype=np.float32)
    if at is not None and at.domain == 'POINT' and len(a):
        at.data.foreach_get('value', a)
    return np.rint(a).astype(np.int64)


def set_ids(me, ids):
    at = me.attributes.get('_rigid')
    if at is None:
        at = me.attributes.new('_rigid', 'FLOAT', 'POINT')
    at.data.foreach_set('value', np.asarray(ids, np.float32))


def tag_head(objs, op):
    """The head kit's hard parts: '_rigid' = HEAD['id'] on every head_kit vertex above HEAD_Z (cables excluded)."""
    for o in objs:
        if o.type != 'MESH' or not o.name.startswith(f'{op}-head_kit-') or 'cable' in o.name:
            continue
        me = o.data
        W = np.array([o.matrix_world @ v.co for v in me.vertices]).reshape(-1, 3)
        ids = ids_of(me)
        ids[(ids == 0) & (W[:, 2] > HEAD_Z)] = HEAD['id']
        set_ids(me, ids)


def weights(reg, rid, joint=lambda n: n):
    acc = {}
    for b, w in reg[rid]['bones'].items():
        acc[joint(b)] = acc.get(joint(b), 0.0) + float(w)
    s = sum(acc.values()) or 1.0
    return [(b, w / s) for b, w in acc.items()]


def apply(obj, reg, nearest, coords, adopt=None, joint=lambda n: n):
    """Vertex groups on obj (cleared first): rigid ids from its '_rigid' attribute (invalid ids are cleared to 0; with
    `adopt(p)` -> id or 0, an untagged vertex may take a nearby rigid part's id: the LOD shells, A74), else
    `nearest(p)` -> [(bone, w)]. coords: the vertices' positions in the frame the callbacks expect. Returns the bones
    used and {id: vertex count}."""
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    me = obj.data
    ids = ids_of(me)
    ids[~np.isin(ids, list(reg))] = 0
    if adopt is not None:
        for i in np.where(ids == 0)[0]:
            ids[i] = adopt(coords[i])
    set_ids(me, ids)
    groups, used, count = {}, set(), {}
    table = {rid: weights(reg, rid, joint) for rid in set(int(x) for x in ids) if rid}
    for v in me.vertices:
        rid = int(ids[v.index])
        ws = table[rid] if rid else nearest(coords[v.index])
        if rid:
            count[rid] = count.get(rid, 0) + 1
        for n, w in ws:
            if w <= 0.0:
                continue
            g = groups.get(n) or groups.setdefault(n, obj.vertex_groups.new(name=n))
            g.add([v.index], w, 'REPLACE')
            used.add(n)
    return sorted(used), count


def adopter(points, ids, reach):
    """adopt(p): the id of the nearest rigid source vertex within `reach` (m), else 0."""
    from mathutils.kdtree import KDTree
    P = np.asarray(points, float).reshape(-1, 3)
    if not len(P):
        return lambda p: 0
    kd = KDTree(len(P))
    for i, p in enumerate(P):
        kd.insert(Vector(tuple(p)), i)
    kd.balance()

    def f(p):
        _, i, d = kd.find(Vector(tuple(p)))
        return int(ids[i]) if i is not None and d <= reach else 0
    return f
