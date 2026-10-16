"""Pipeline stage for the fitted items (step 06, DECISIONS A18): gloves (shrink-fitted panels on the hand) and boots
(parametric hard model sized from the foot). They are not cloth-simulated, so this one stage replaces build_garment.py
and garment_details.py for them: it opens the previous item's blend (--under, layer order of GARMENTS), builds the item
with py/garments/<garment>.py `build(ctx)`, and writes the same files a sewn garment leaves:

- <id>-<item>.blend: everything so far plus the item's render objects and its shell '<id>-<item>' (hidden; a later
  garment pushes clear of it like any layer, A11),
- <id>-<item>-sim.json / -sim.npz: the report check_garment.py reads (method 'fitted': no seams are sewn by a
  simulation, so the seam gap is reported as 0 with the method named), the shell positions,
- <id>-<item>.json: the detail report (stitches, parts, panel areas).
"""
import json
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'garments'))
import common  # noqa: E402
import fitted as FT  # noqa: E402
import materials as MAT  # noqa: E402

args = common.parse_args({
    '--operator': {'required': True},
    '--garment': {'required': True},
    '--out': {'required': True},
    '--under': {'default': ''},
})
common.check_version()
op_id, gname = args.operator, args.garment
UNDER_IDS = [u for u in args.under.split(',') if u]
src = os.path.join(args.out, f'{op_id}-{UNDER_IDS[-1]}.blend' if UNDER_IDS else f'{op_id}-body.blend')
bpy.ops.wm.open_mainfile(filepath=src)
common.seed_everything(args.seed)
scene = bpy.context.scene
for o in [o for o in bpy.data.objects if o.name.startswith('collider')]:
    bpy.data.objects.remove(o)
with open(os.path.join(args.out, f'{op_id}-body.json'), encoding='utf-8') as f:
    body_report = json.load(f)
body = bpy.data.objects[f'{op_id}-body']
rig = bpy.data.objects[f'{op_id}-rig']
bones = {b.name: (np.array(rig.matrix_world @ b.head_local), np.array(rig.matrix_world @ b.tail_local)) for b in rig.data.bones}
J = {k: np.array(common.game_to_blender(v)) for k, v in body_report['bindJoints'].items()}
garment = __import__(gname)


def reuse(fn, name, **kw):
    """One material per name across an operator's items (a later blend holds the earlier ones)."""
    return bpy.data.materials.get(name) or fn(name, **kw)


# The rendered body surface (armature at bind pose, subdivided once) and the base mesh with its dominant bone groups.
dg = bpy.context.evaluated_depsgraph_get()
skin = FT.bvh_of(body, dg)
BV = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices])
gnames = {g.index: g.name for g in body.vertex_groups}
dominant = np.array([gnames[max(v.groups, key=lambda g: g.weight).group] if len(v.groups) else '' for v in body.data.vertices])
ev = body.evaluated_get(dg).to_mesh()
BVE = np.array([(body.matrix_world @ v.co)[:] for v in ev.vertices])
body.evaluated_get(dg).to_mesh_clear()
layers = []
for u in UNDER_IDS:
    ob = bpy.data.objects.get(f'{op_id}-{u}')
    if ob is None:
        raise SystemExit(f'operators: {u} is not in {src} (build the items in GARMENTS order)')
    V = np.array([(ob.matrix_world @ v.co)[:] for v in ob.data.vertices])
    layers.append((u, V, [tuple(p.vertices) for p in ob.data.polygons]))

ctx = {
    'op_id': op_id, 'scene': scene, 'body': body, 'rig': rig, 'bones': bones, 'J': J, 'H': body_report['height'],
    'skin': skin, 'BV': BV, 'BVE': BVE, 'dominant': dominant, 'layers': layers, 'reuse': reuse, 'MAT': MAT,
}
res = garment.build(ctx)

# The shell: what a later garment is drafted over and pushed clear of (hidden, never rendered or exported).
SV, SF = res['shell']
# triangles: the later garments treat a layer as a triangle mesh (build_garment's envelope for SIM 'bridge')
SF = [tuple(f[k] for k in t) for f in SF for t in ((0, 1, 2), (0, 2, 3))[:len(f) - 2]]
shell = FT.add_mesh(scene, f'{op_id}-{gname}', SV, SF, [], smooth=False)
shell.hide_render = True
shell.hide_viewport = True
body.hide_render = False
os.makedirs(args.out, exist_ok=True)
stem = os.path.join(args.out, f'{op_id}-{gname}')
bpy.ops.wm.save_as_mainfile(filepath=stem + '.blend', compress=True)
np.savez_compressed(stem + '-sim.npz', sim=np.asarray(SV, np.float32), uv=np.zeros((len(SV), 2), np.float32))
sim = {
    'operator': op_id, 'garment': gname, 'kit': garment.KIT, 'seed': args.seed, 'blender': bpy.app.version_string,
    'method': 'fitted', 'methodNote': garment.METHOD, 'under': UNDER_IDS,
    # no simulated seams: the panels are cut from one fitted surface (gloves) or modelled closed (boots)
    'seamGapByFrame': [[0, 'none (fitted, not sewn by simulation)', 0.0]],
    # kit items the build carries besides its own (step 07: the head kit is one built item with many kit parts)
    'details': {'patches': [{'kit': k} for k in res.get('kits', [])]}, 'measurements': res.get('measurements', {}), 'verts': len(SV),
}
with open(stem + '-sim.json', 'w', encoding='utf-8') as f:
    json.dump(sim, f, indent=1)
tri_count = sum(len(o.data.polygons) for o in res['objects'])
report = {'operator': op_id, 'garment': gname, 'seed': args.seed, 'objects': [o.name for o in res['objects']],
          'faces': tri_count, **res.get('report', {})}
with open(stem + '.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=1)
print(f'operators: {op_id} {gname} fitted: {len(res["objects"])} objects, {tri_count} faces -> {stem}.blend')
