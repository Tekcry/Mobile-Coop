"""Stage: glTF export for the Operator Lab (RUNBOOK step 04). One .glb per operator: the skinned body and every built
garment item, weighted to the body's weights by nearest surface, joints named as the game rig (root, body, pelvis,
spine, chest, neck, head, shL, elL, ... plus the pipeline-only hero finger and toe bones). Frame: Y up, +Z forward
after the exporter's conversion (common.game_to_blender). Procedural materials export their base colour, roughness
and metallic factors only; baked maps arrive in step 10 (KTX2 with them).
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402

args = common.parse_args({
    '--operator': {'required': True},
    '--garment': {'action': 'append', 'default': []},
    '--out': {'required': True},
})
common.check_version()
op_id = args.operator
# the last garment's blend holds the body, the rig and every earlier garment's final objects
src = os.path.join(args.out, f'{op_id}-{args.garment[-1]}.blend') if args.garment else os.path.join(args.out, f'{op_id}-body.blend')
bpy.ops.wm.open_mainfile(filepath=src)
common.seed_everything(args.seed)

rig = bpy.data.objects[f'{op_id}-rig']
body = bpy.data.objects[f'{op_id}-body']
SKIP = {f'{op_id}-body', 'floor'}
# every rendered garment item: the hero meshes, stitches and hardware ('<id>-...') and the sewn-on patches
items = [o for o in bpy.data.objects
         if o.type == 'MESH' and not o.hide_render and o.name not in SKIP and o.parent is None
         and not o.name.startswith('collider')]

from mathutils.kdtree import KDTree  # noqa: E402

# nearest-surface weights: each vertex takes the weights of the closest body vertex (rest pose, A-pose bind)
names = [g.name for g in body.vertex_groups]
kd = KDTree(len(body.data.vertices))
for v in body.data.vertices:
    kd.insert(body.matrix_world @ v.co, v.index)
kd.balance()
bw = [[(names[g.group], g.weight) for g in v.groups] for v in body.data.vertices]

bpy.ops.object.select_all(action='DESELECT')
for o in items:
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    for m in list(o.modifiers):  # solidify, bevel: baked into the exported mesh
        bpy.ops.object.modifier_apply(modifier=m.name)
    o.select_set(False)
    for g in list(o.vertex_groups):
        o.vertex_groups.remove(g)
    groups = {}
    mw = o.matrix_world
    for v in o.data.vertices:
        _, idx, _ = kd.find(mw @ v.co)
        for name, w in bw[idx]:
            if w <= 0.0:
                continue
            g = groups.get(name) or groups.setdefault(name, o.vertex_groups.new(name=name))
            g.add([v.index], w, 'REPLACE')
    am = o.modifiers.new('rig', 'ARMATURE')
    am.object = rig
    o.parent = rig
    o.matrix_parent_inverse = rig.matrix_world.inverted()

for o in bpy.data.objects:
    o.select_set(False)
for o in [rig, body, *items]:
    o.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None

# procedural albedo and roughness do not export: flatten to the materials' mean values (py/materials.py defaults)
FLAT = {  # name: (albedo, roughness)
    'knit': (0.031, 0.90), 'ripstop': (0.027, 0.85), 'ripstop patch': (0.027, 0.85), 'cordura': (0.022, 0.88),
    'loop': (0.023, 0.95), 'binding': (0.023, 0.80), 'zip teeth': (0.022, 0.70), 'zip slider': (0.022, 0.60),
    'softshell': (0.027, 0.80), 'softshell patch': (0.027, 0.80), 'compression knit': (0.035, 0.90),
    'hardware metal': (0.022, 0.60), 'thread': (0.036, 0.72),
}
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None or mat.name not in FLAT:
        continue
    a, r = FLAT[mat.name]
    for sock in ('Base Color', 'Roughness'):
        for lk in list(bsdf.inputs[sock].links):
            mat.node_tree.links.remove(lk)
    bsdf.inputs['Base Color'].default_value = (a, a * 1.02, a * 1.05, 1.0)
    bsdf.inputs['Roughness'].default_value = r

dest = os.path.join(args.out, f'{op_id}-lab.glb')
bpy.ops.export_scene.gltf(
    filepath=dest, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
    export_skins=True, export_def_bones=False, export_influence_nb=4, export_normals=True, export_texcoords=True,
    export_materials='EXPORT', export_image_format='NONE', export_animations=False, export_cameras=False,
    export_lights=False, export_extras=False)
print('exported', dest, os.path.getsize(dest), [o.name for o in items])
