# (mixamo-chars, N53) One game model from Mixamo downloads, headless Blender 5.2.2:
#   the character FBX (with skin) + every move FBX (without skin, same Mixamo skeleton) -> one GLB, one glTF animation
#   per move, named by its file name. Run through scripts/mixamo/pack.mjs, never by hand.
# Args after `--`: --seed <n> --character <fbx> --moves <dir> --out <glb>
import argparse
import os
import sys

import bpy


def args():
    argv = sys.argv[sys.argv.index('--') + 1:]
    p = argparse.ArgumentParser()
    p.add_argument('--seed', type=int, default=0)
    p.add_argument('--character', required=True)
    p.add_argument('--moves', required=True)
    p.add_argument('--out', required=True)
    return p.parse_args(argv)


def armatures():
    return [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']


def fcurves(act):
    """Every F-curve of an action (Blender 5 layered actions keep them in channel bags)."""
    if hasattr(act, 'layers'):
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    yield from cb.fcurves
    elif hasattr(act, 'fcurves'):
        yield from act.fcurves


# Moves whose climb the game's traversal already carries (the body rises with the ladder / ledge): their vertical
# travel goes too (channel 1), else the body would rise twice.
CLIMBS = ('ladder', 'hang_climb_up', 'rope_climb')
# (slice i) Jumps whose arc the game's traversal carries: their vertical travel is held flat at the first key (the
# pose stays, the body does not leave the capsule).
JUMPS = ('wall_kick',)


def in_place(act, name=''):
    """Removes the hips' steady ground travel (pack moves carry it; the game's controller moves the body): on the two
    horizontal location channels (0, 2: the Hips bone's own frame), and the vertical one (1) for `CLIMBS`, the straight
    line from the first key to the last is taken away, so the sway stays and the clip starts and ends on the spot.
    In-place downloads change by millimetres."""
    axes = (0, 1, 2) if name in CLIMBS or name in JUMPS else (0, 2)
    for fc in fcurves(act):
        if not (fc.data_path.endswith('location') and 'Hips' in fc.data_path and fc.array_index in axes):
            continue
        ks = fc.keyframe_points
        if len(ks) < 2:
            continue
        t0, v0 = ks[0].co
        if name in JUMPS and fc.array_index == 1:
            for k in ks:
                dv = k.co[1] - v0
                k.co[1] -= dv
                k.handle_left[1] -= dv
                k.handle_right[1] -= dv
            fc.update()
            continue
        t1, v1 = ks[-1].co
        span = (t1 - t0) or 1.0
        for k in ks:
            d = v0 + (v1 - v0) * (k.co[0] - t0) / span
            k.co[1] -= d - v0
            k.handle_left[1] -= d - v0
            k.handle_right[1] -= d - v0
        fc.update()


def hips_height(arm):
    """The Hips bone's rest distance from the armature origin (armature units): the body's scale measure."""
    for b in arm.data.bones:
        if b.name.split(':')[-1] == 'Hips':
            return b.head_local.length
    raise RuntimeError(f'{arm.name}: no Hips bone')


def retarget(act, src_arm, dst_arm):
    """A move downloaded on one Mixamo skeleton (Y Bot) played on another (Swat): its bone positions carry the source's
    bone lengths and units, which would stretch the target. Only rotations travel, plus the hips' position, scaled by the
    two skeletons' hip heights (the standard rule); every other bone keeps the target's own rest position."""
    k = hips_height(dst_arm) / hips_height(src_arm)
    # each curve with its owner (the channel bag in Blender 5's layered actions, else the action)
    owned = []
    if hasattr(act, 'layers'):
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    owned += [(cb, fc) for fc in cb.fcurves]
    elif hasattr(act, 'fcurves'):
        owned = [(act, fc) for fc in act.fcurves]
    for owner, fc in owned:
        if not fc.data_path.endswith('location'):
            continue
        if '"' in fc.data_path and fc.data_path.split('"')[1].split(':')[-1] == 'Hips':
            for kp in fc.keyframe_points:
                kp.co[1] *= k
                kp.handle_left[1] *= k
                kp.handle_right[1] *= k
            fc.update()
        else:
            owner.fcurves.remove(fc)
    return k


def import_fbx(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False, ignore_leaf_bones=True)
    return [o for o in bpy.context.scene.objects if o not in before]


def main():
    a = args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    new = import_fbx(a.character)
    rigs = [o for o in new if o.type == 'ARMATURE']
    if len(rigs) != 1:
        raise RuntimeError(f'{a.character}: expected one armature, found {len(rigs)}')
    rig = rigs[0]
    rig.name = 'character'
    if rig.animation_data is None:
        rig.animation_data_create()
    # the character file's own take (Mixamo's T-pose clip) is not a move
    if rig.animation_data.action is not None:
        bpy.data.actions.remove(rig.animation_data.action)
    rig.animation_data.action = None

    files = sorted(f for f in os.listdir(a.moves) if f.lower().endswith('.fbx'))
    if not files:
        raise RuntimeError(f'{a.moves}: no move files')
    for f in files:
        name = os.path.splitext(f)[0]
        objs = import_fbx(os.path.join(a.moves, f))
        src = [o for o in objs if o.type == 'ARMATURE']
        if len(src) != 1 or src[0].animation_data is None or src[0].animation_data.action is None:
            raise RuntimeError(f'{f}: expected one animated armature')
        act = src[0].animation_data.action
        in_place(act, name)
        k = retarget(act, src[0], rig)
        act.name = name
        act.use_fake_user = True
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, int(act.frame_range[0]), act)
        # Blender 5 slotted actions: the strip binds the action's one slot to this armature
        if hasattr(strip, 'action_slot') and len(act.slots) > 0:
            strip.action_slot = act.slots[0]
        track.mute = True
        for o in objs:
            bpy.data.objects.remove(o, do_unlink=True)
        print(f'move {name}: frames {act.frame_range[0]:.0f}-{act.frame_range[1]:.0f}, hips x{k:.4f}')

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=a.out,
        export_format='GLB',
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_force_sampling=True,
        export_frame_step=1,
        export_def_bones=True,
        export_optimize_animation_size=True,
        export_apply=False,
        export_yup=True,
    )
    print(f'wrote {a.out}: {len(files)} moves')


main()
