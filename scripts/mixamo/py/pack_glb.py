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
        print(f'move {name}: frames {act.frame_range[0]:.0f}-{act.frame_range[1]:.0f}')

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
