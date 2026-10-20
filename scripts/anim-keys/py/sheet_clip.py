"""(anim-guard) Contact-sheet frames of a baked keyed clip, headless (scripts/anim-keys/sheet.mjs).

Opens build/anim-keys/<clip>.blend (saved by key_clip.py), skins capsules to the bones (as key_clip.py's preview) and
renders the chosen frames from the side and the front. Unlike the bake's preview it keeps the armature where the keys
put it (no lowest-sole fit: the pelvis offset is the floor truth, so a body sitting or lying on the floor shows as it
is) and frames the camera on the clip's whole extent. Left limbs blue, right limbs orange, the floor dark.
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'operators', 'py'))
import common  # noqa: E402

args = common.parse_args({
    '--blend': {'required': True},
    '--frames': {'required': True},  # comma separated, in the bake's 48-frame units (floats allowed)
    '--out': {'required': True},
    '--name': {'required': True},
    '--size': {'default': '300'},
})
common.check_version()
bpy.ops.wm.open_mainfile(filepath=args.blend)
scene = bpy.context.scene
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
frames = [float(f) for f in args.frames.split(',')]


def at(fr):
    scene.frame_set(int(fr), subframe=fr - int(fr))
    bpy.context.view_layer.update()


# the clip's extent over the chosen frames (bone heads and tails, Blender frame)
lo = Vector((1e9, 1e9, 1e9))
hi = Vector((-1e9, -1e9, -1e9))
for fr in frames:
    at(fr)
    for pb in arm.pose.bones:
        for p in (arm.matrix_world @ pb.head, arm.matrix_world @ pb.tail):
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
lo.z = min(lo.z, 0.0)

radius = {'pelvis': 0.13, 'spine': 0.12, 'chest': 0.13, 'neck': 0.05, 'head': 0.09, 'sh': 0.045, 'el': 0.037,
          'wr': 0.03, 'hip': 0.07, 'kn': 0.05, 'an': 0.04}
bones = {b.name: b for b in arm.data.bones}
segs = [('pelvis', 'spine'), ('spine', 'chest'), ('chest', 'neck'), ('neck', 'head')]
for s in ('L', 'R'):
    segs += [('sh' + s, 'el' + s), ('el' + s, 'wr' + s), ('wr' + s, 'hand' + s), ('hip' + s, 'kn' + s), ('kn' + s, 'an' + s),
             ('an' + s, 'toe' + s)]
segs += [('hipL', 'hipR'), ('shL', 'shR')]
COL = {'L': (0.45, 0.62, 1.0, 1), 'R': (1.0, 0.66, 0.4, 1), '': (0.92, 0.92, 0.9, 1)}
scene.frame_set(0)
rest = {n: bones[n].head_local.copy() for n in bones}
for a, b in segs:
    key = next((p for p in sorted(radius, key=len, reverse=True) if a.startswith(p)), 'el')
    r = radius[key]
    pa, pb_ = rest[a], rest[b]
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=r, radius2=r * 0.85, depth=max(0.02, (pb_ - pa).length))
    me = bpy.data.meshes.new(f'cap-{a}')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(f'cap-{a}-{b}', me)
    scene.collection.objects.link(ob)
    d = (pb_ - pa)
    ob.matrix_world = arm.matrix_world @ Matrix.Translation((pa + pb_) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bone = a if a not in ('hipL', 'shL') or b not in ('hipR', 'shR') else ('pelvis' if a == 'hipL' else 'chest')
    side = '' if bone in ('pelvis', 'spine', 'chest', 'neck', 'head') else bone[-1]
    ob.color = COL.get(side, COL[''])
    vg = ob.vertex_groups.new(name=bone)
    vg.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    mod = ob.modifiers.new('arm', 'ARMATURE')
    mod.object = arm
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
bpy.context.active_object.color = (0.3, 0.32, 0.36, 1)
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'OBJECT'
size = int(args.size)
scene.render.resolution_x = scene.render.resolution_y = size
scene.render.film_transparent = False
cam_data = bpy.data.cameras.new('sheet-cam')
cam_data.type = 'ORTHO'
cam = bpy.data.objects.new('sheet-cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
c = (lo + hi) / 2
pad = 0.25
# side: looking along Blender +x (the body's left side toward the camera), horizontal = Blender y (game -z)
# front: looking along Blender +y (the camera in front of the body), horizontal = Blender x (game -x)
views = {
    'side': ((lo.x - 4, c.y, c.z), (math.pi / 2, 0, -math.pi / 2), max(hi.y - lo.y, hi.z - lo.z) + pad),
    'front': ((c.x, lo.y - 4, c.z), (math.pi / 2, 0, 0), max(hi.x - lo.x, hi.z - lo.z) + pad),
}
os.makedirs(args.out, exist_ok=True)
for view, (loc, rot, scale) in views.items():
    cam.location = loc
    cam.rotation_euler = rot
    cam_data.ortho_scale = scale
    for i, fr in enumerate(frames):
        at(fr)
        scene.render.filepath = os.path.join(args.out, f'{args.name}-{view}-{i}.png')
        bpy.ops.render.render(write_still=True)
print(f'anim-keys sheet: {args.name} {len(frames)} frames -> {args.out}')
