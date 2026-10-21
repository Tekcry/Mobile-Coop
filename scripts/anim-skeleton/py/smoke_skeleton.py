"""anim-skeleton S1: smoke test of py/skeleton.py (the functions bake_lods.py now calls) on the copied anim-rig blend.

  node scripts/anim-skeleton/proto.mjs smoke_skeleton

On build/anim-skeleton/wren-lods.blend (never saved): add_joints on the game armature (clavicles + the hero's fingers),
knuckle_loops on LOD0 and LOD1 (glove = nearest original vertex weighted to a wrist), clavicle_split and
limit_influences on LOD0-2. Checks: existing bone rests unchanged, each clavicle's rest rotation equal to the chest's,
the LODs deformed at rest unchanged (old vertices; new ones against their own position) within 1e-5 m. Writes
build/anim-skeleton/s1/smoke-report.json; fails on any check.
"""
import json
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import skeleton  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = argv[argv.index('--root') + 1]
OUT = os.path.join(ROOT, 'build', 'anim-skeleton', 's1')
os.makedirs(OUT, exist_ok=True)
HERO_RIG = bpy.data.objects['wren-rig']
ARM = bpy.data.objects['wren-rig-game']
LODS = {n: bpy.data.objects[f'wren-{n}'] for n in ('lod0', 'lod1', 'lod2')}


def rest(arm):
    if arm.animation_data:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
        pb.scale = Vector((1, 1, 1))
    bpy.context.view_layer.update()


def evaluated(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.to_mesh()
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    ev.to_mesh_clear()
    return co.reshape(-1, 3)


def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


rest(ARM)
rest(HERO_RIG)
report = {'lods': {}}
before = {n: evaluated(o) for n, o in LODS.items()}
bones0 = {b.name: b.matrix_local.copy() for b in ARM.data.bones}
added = skeleton.add_joints(ARM, HERO_RIG)
rest(ARM)
B = ARM.data.bones
bone_err = max(max(abs(a - b) for ra, rb in zip(bones0[n], B[n].matrix_local) for a, b in zip(ra, rb)) for n in bones0)
clav_rot = max(max(abs(a - b) for ra, rb in zip((B['chest'].matrix_local.inverted() @ B[f'clav{s}'].matrix_local).to_3x3(),
                                                Matrix.Identity(3)) for a, b in zip(ra, rb)) for s in 'LR')
report['bones'] = {'before': len(bones0), 'after': len(B), 'added': len(added), 'restChange': bone_err, 'clavRotVsChest': clav_rot,
                   'shParent': B['shL'].parent.name, 'sc': {s: [round(x, 4) for x in B[f'clav{s}'].head_local] for s in 'LR'}}
print('smoke: bones', report['bones'])
assert len(added) == 34 and bone_err < 1e-6 and clav_rot < 1e-5 and B['shL'].parent.name == 'clavL'

for n, obj in LODS.items():
    me = obj.data
    nv0, t0 = len(me.vertices), tris(me)
    r = {'verts': [nv0, nv0], 'tris': [t0, t0]}
    if n in skeleton.FINGER_LODS:
        wr = [obj.vertex_groups[f'wr{s}'].index for s in 'LR']
        flag = [any(g.group in wr and g.weight > 0 for g in v.groups) for v in me.vertices]
        kd = KDTree(nv0)
        for v in me.vertices:
            kd.insert(obj.matrix_world @ v.co, v.index)
        kd.balance()
        r['loopVerts'] = skeleton.knuckle_loops(me, HERO_RIG, skeleton.CFG['knuckles'][n], lambda co: flag[kd.find(co)[1]])
        r['verts'][1], r['tris'][1] = len(me.vertices), tris(me)
    r['clavicle'] = skeleton.clavicle_split(obj)
    r['goggle'] = skeleton.goggle_split(obj)
    r['pruned'] = skeleton.limit_influences(obj)
    rest(ARM)
    after = evaluated(obj)
    old_err = float(np.abs(after[:nv0] - before[n]).max())
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    new_err = float(np.abs(after[nv0:] - co.reshape(-1, 3)[nv0:]).max()) if len(me.vertices) > nv0 else 0.0
    r['restOldM'], r['restNewM'] = old_err, new_err
    report['lods'][n] = r
    print('smoke:', n, r)
    assert old_err <= 1e-5 and new_err <= 1e-5, f'{n}: rest check failed'

with open(os.path.join(OUT, 'smoke-report.json'), 'w', encoding='utf-8') as fh:
    json.dump(report, fh, indent=1)
print('smoke: ok', os.path.join(OUT, 'smoke-report.json'))
