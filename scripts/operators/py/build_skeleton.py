"""Pipeline stage 0: build an operator's armature from the exported game joints and check it round-trips.

Writes build/operators/<id>/<id>-skeleton.blend and <id>-skeleton.json (bone heads in the game frame, measured back
out of Blender). Later stages (base body, skinning) start from this armature.
"""
import json
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402

args = common.parse_args({
    '--joints': {'required': True},
    '--operator': {'required': True},
    '--out': {'required': True},
})
common.check_version()
common.empty_scene()
common.seed_everything(args.seed)

op = common.load_operator(args.joints, args.operator)
joints = {j['name']: j for j in op['joints']}
children = {}
for j in op['joints']:
    if j['parent']:
        children.setdefault(j['parent'], []).append(j['name'])

arm_data = bpy.data.armatures.new(f"{op['id']}-rig")
arm = bpy.data.objects.new(f"{op['id']}-rig", arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')

# One bone per joint, named like the game rig's node. Its head is the joint; its tail points at the first child
# (the limb), or a short step along the parent direction for end joints.
order = [j['name'] for j in op['joints']]
for name in order:
    j = joints[name]
    head = Vector(common.game_to_blender(j['pos']))
    kids = children.get(name, [])
    if kids:
        tail = Vector(common.game_to_blender(joints[kids[0]]['pos']))
    elif j['parent']:
        d = head - Vector(common.game_to_blender(joints[j['parent']]['pos']))
        tail = head + (d.normalized() * 0.04 if d.length > 1e-6 else Vector((0, 0, 0.04)))
    else:
        tail = head + Vector((0, 0, 0.04))
    if (tail - head).length < 1e-4:
        tail = head + Vector((0, 0, 0.02))
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = head, tail
    if j['parent']:
        b.parent = arm_data.edit_bones[j['parent']]
bpy.ops.object.mode_set(mode='OBJECT')

# Round trip: read the heads back, convert to the game frame, compare with the input.
worst = 0.0
measured = {}
for bone in arm_data.bones:
    x, y, z = bone.head_local
    game = (-x, z, -y)
    measured[bone.name] = [round(v, 5) for v in game]
    worst = max(worst, max(abs(a - b) for a, b in zip(game, joints[bone.name]['pos'])))
if worst > 1e-4:
    raise SystemExit(f'{op["id"]}: joint round trip off by {worst:.6f} m')

os.makedirs(args.out, exist_ok=True)
blend = os.path.join(args.out, f"{op['id']}-skeleton.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
report = {
    'operator': op['id'],
    'height': op['height'],
    'blender': bpy.app.version_string,
    'seed': args.seed,
    'bones': len(arm_data.bones),
    'roundTripMaxError': worst,
    'heads': measured,
}
with open(os.path.join(args.out, f"{op['id']}-skeleton.json"), 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)
print(f"operators: {op['id']} skeleton, {len(arm_data.bones)} bones, round trip {worst:.2e} m -> {blend}")
