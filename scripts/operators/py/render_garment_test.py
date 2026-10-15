"""Garment method test renders (RUNBOOK step 3): front, 3/4 back and a 0.4 m raking-light close-up of the shoulder and
elbow, Cycles on the hardware GPU (OptiX), WebP into docs/operators/mockups/tests/.
"""
import json
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402
import render as RN  # noqa: E402

args = common.parse_args({
    '--operator': {'required': True},
    '--garment': {'required': True},
    '--out': {'required': True},
    '--dest': {'required': True},
    '--samples': {'type': int, 'default': 512},
})
common.check_version()
op_id, gname = args.operator, args.garment
bpy.ops.wm.open_mainfile(filepath=os.path.join(args.out, f'{op_id}-{gname}.blend'))
common.seed_everything(args.seed)
with open(os.path.join(args.out, f'{op_id}-body.json'), encoding='utf-8') as f:
    J = {k: np.array(common.game_to_blender(v)) for k, v in json.load(f)['bindJoints'].items()}
sc = bpy.context.scene
gpus = RN.use_gpu(sc, args.samples)
sc.cycles.seed = args.seed
args.dest = os.path.abspath(args.dest)
os.makedirs(args.dest, exist_ok=True)


def clear_rig():
    for o in list(bpy.data.objects):
        if o.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(o)


def shot(name, res, exposure=0.0):
    sc.view_settings.exposure = exposure
    path = os.path.join(args.dest, f'{op_id}-{gname}-{name}.webp')
    RN.write_webp(sc, path, res, 92)
    return path


out = []
floor = RN.floor()
centre = (0.0, 0.0, 1.08)
sh, el = J['shL'], J['elL']


def stealth(cam_loc, cam_target, key_loc, rim_loc):
    """Low-key stealth lighting (art direction 7): near-black surroundings, one hard raking key, a thin cool rim."""
    clear_rig()
    RN.world(sc, 0.004, (0.5, 0.55, 0.65))
    RN.area_light('key', key_loc, centre, 160, 0.12, (1.0, 0.93, 0.82))
    RN.area_light('rim', rim_loc, (0.0, 0.0, 1.2), 700, 0.06, (0.62, 0.75, 1.0))
    sc.camera = RN.camera('cam', cam_loc, cam_target, 55)


floor.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.012, 0.012, 0.013, 1)

# a. Front, stealth: the key rakes in hard from the wearer's left and above; the rim from behind right.
stealth((0.22, -2.45, 1.22), (0.0, 0.0, 1.06), (2.2, -0.9, 2.3), (-1.4, 2.2, 2.0))
out.append(shot('a-front-stealth', (1200, 1500), -1.2))

# b. Three-quarter back, stealth (behind the wearer's left shoulder).
stealth((1.55, 1.85, 1.45), (0.04, 0.0, 1.1), (-1.8, 1.2, 2.4), (1.6, -2.0, 1.9))
out.append(shot('b-back34-stealth', (1200, 1500), -1.2))

# c. Close-up at 0.4 m: the left upper arm from behind and outside, so the back raglan seam (knit to ripstop), the
# arm pocket and the elbow are in frame. One small light skims along the arm (raking); a faint fill.
clear_rig()
RN.world(sc, 0.02)
axis = (el - sh) / np.linalg.norm(el - sh)
up = np.array([0, 0, 1.0]) - axis[2] * axis
up /= np.linalg.norm(up)
back = np.array([0, 1.0, 0]) - axis[1] * axis
back /= np.linalg.norm(back)
view = up * 0.45 + back * 0.9
view /= np.linalg.norm(view)
target = sh + (el - sh) * 0.55 + view * 0.045 - np.array([np.sign(sh[0]) * 0.03, 0, 0])
cam = target + view * 0.40
sc.camera = RN.camera('close', tuple(cam), tuple(target), 35)
rake = sh - axis * 0.32 + view * 0.05 + up * 0.03
RN.area_light('rake', tuple(rake), tuple(target + axis * 0.1), 120, 0.04, (1.0, 0.96, 0.9))
RN.area_light('fill', tuple(cam + up * 0.3), tuple(target), 1.5, 0.5, (0.85, 0.9, 1.0))
out.append(shot('c-closeup-raking', (1800, 1350), 1.0))

# d. Front, neutral even light, for checking construction.
clear_rig()
RN.world(sc, 0.6, (0.5, 0.5, 0.5))
RN.studio_rig(centre, 1.7)
floor.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.08, 0.08, 0.085, 1)
sc.camera = RN.camera('front', (0.22, -2.45, 1.22), (0.0, 0.0, 1.06), 55)
out.append(shot('d-front-neutral', (1200, 1500), 1.4))

print('operators: test renders on', ', '.join(gpus))
for p in out:
    print('operators: wrote', p)
