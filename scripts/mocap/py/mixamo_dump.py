# Dumps Mixamo FBX takes (armature only, no mesh) to the JSON the retarget pipeline reads
# (docs/mixamo-retarget/PLAN.md "Dump format"). Run by scripts/mocap/mixamo.mjs in a headless Blender:
#   blender -b --factory-startup -noaudio --python-exit-code 1 --python mixamo_dump.py -- --jobs <jobs.json>
# jobs.json: [{ "fbx": <path>, "out": <path>, "file": <name>, "slug": <slug>, "sha256": <hex> }, ...]
# Per frame, per pose bone: the world head, and the rest-relative world rotation W . R . W^-1 with
# R = pose_bone.matrix @ bone.matrix_local.inverted() (armature space) and W the rotation part of the armature's
# world matrix (the importer's 0.01 scale taken out). Bone tails are never written (the importer guesses them).
import bpy
import json
import sys

ROUND = 5


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if '--jobs' not in argv:
        raise SystemExit('mixamo_dump.py: --jobs <jobs.json> is required')
    return argv[argv.index('--jobs') + 1]


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_fbx(path):
    # The Python FBX add-on ships enabled with factory settings; Blender 5's built-in importer is the fallback.
    if hasattr(bpy.ops.import_scene, 'fbx'):
        bpy.ops.import_scene.fbx(filepath=path, use_anim=True, automatic_bone_orientation=False, ignore_leaf_bones=False)
    else:
        bpy.ops.wm.fbx_import(filepath=path)


def r(v):
    return round(float(v), ROUND)


def find_armature():
    arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    if len(arms) != 1:
        raise RuntimeError('expected one armature, found %d' % len(arms))
    return arms[0]


def frame_range(arm):
    ad = arm.animation_data
    if ad is None or ad.action is None:
        raise RuntimeError('armature %s has no action' % arm.name)
    a, b = ad.action.frame_range
    return int(round(a)), int(round(b))


def ordered_bones(arm):
    # Parents before children: armature data bones are already in that order, but walk the tree to be sure.
    out = []
    def walk(b):
        out.append(b)
        for c in b.children:
            walk(c)
    for b in arm.data.bones:
        if b.parent is None:
            walk(b)
    return out


def dump(job):
    clear_scene()
    import_fbx(job['fbx'])
    scene = bpy.context.scene
    arm = find_armature()
    fps = scene.render.fps / scene.render.fps_base
    f0, f1 = frame_range(arm)
    scene.frame_start, scene.frame_end = f0, f1

    world = arm.matrix_world.copy()
    w_loc, w_rot, w_scale = world.decompose()
    w_inv = w_rot.inverted()
    scale = (w_scale.x + w_scale.y + w_scale.z) / 3.0

    bones = ordered_bones(arm)
    rest = {}
    for b in bones:
        h = world @ b.head_local
        rest[b.name] = [r(h.x), r(h.y), r(h.z)]

    pos = {b.name: [] for b in bones}
    rot = {b.name: [] for b in bones}
    prev = {}
    pose = arm.pose.bones
    for f in range(f0, f1 + 1):
        scene.frame_set(f)
        for b in bones:
            pb = pose[b.name]
            h = world @ pb.head
            pos[b.name].extend((r(h.x), r(h.y), r(h.z)))
            q_arm = (pb.matrix @ b.matrix_local.inverted()).to_quaternion()
            q = w_rot @ q_arm @ w_inv
            q.normalize()
            p = prev.get(b.name)
            if p is not None and p.dot(q) < 0.0:
                q.negate()
            prev[b.name] = q.copy()
            rot[b.name].extend((r(q.w), r(q.x), r(q.y), r(q.z)))

    rows = [list(world.row[i]) for i in range(4)]
    data = {
        'version': 1,
        'file': job['file'],
        'slug': job['slug'],
        'sha256': job['sha256'],
        'fps': fps,
        'frameStart': f0,
        'frameEnd': f1,
        'frames': f1 - f0 + 1,
        'armature': arm.name,
        'world': [r(v) for row in rows for v in row],
        'scale': r(scale),
        'bones': [{'name': b.name, 'parent': b.parent.name if b.parent else None, 'rest': rest[b.name]} for b in bones],
        'pos': pos,
        'rot': rot,
    }
    with open(job['out'], 'w', encoding='utf-8') as fh:
        json.dump(data, fh, separators=(',', ':'))
    print('mixamo_dump: %s -> %s (%d frames, %d bones, %.3g fps)' % (job['file'], job['out'], f1 - f0 + 1, len(bones), fps))


def main():
    with open(args(), encoding='utf-8') as fh:
        jobs = json.load(fh)
    for job in jobs:
        dump(job)


main()
