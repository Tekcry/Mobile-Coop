"""Garment method test renders (RUNBOOK step 3): front and 3/4 back in stealth light, raking-light close-ups at about
0.4 m of what the garment adds, and a neutral front; Cycles on the hardware GPU (OptiX), WebP into
docs/operators/mockups/tests/. The shirt frames the upper body; the base layer and the trousers the whole figure.
Close-ups: shirt - left upper arm and elbow; base layer - collar and left cuff; trousers - left knee and cargo pocket,
the waist (belt loops, fly, tucked shirt) and the seat.
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

FULL = gname != 'combat_shirt'   # the whole figure (legs) or the upper body (the shirt's own framing)
front_cam = ((0.3, -3.4, 1.0), (0.0, 0.0, 0.88)) if FULL else ((0.22, -2.45, 1.22), (0.0, 0.0, 1.06))

# a. Front, stealth: the key rakes in hard from the wearer's left and above; the rim from behind right.
stealth(*front_cam, (2.2, -0.9, 2.3), (-1.4, 2.2, 2.0))
out.append(shot('a-front-stealth', (1200, 1500), -1.2))

# b. Three-quarter back, stealth (behind the wearer's left shoulder).
if FULL:
    stealth((2.1, 2.6, 1.15), (0.03, 0.0, 0.9), (-1.8, 1.2, 2.4), (1.6, -2.0, 1.9))
else:
    stealth((1.55, 1.85, 1.45), (0.04, 0.0, 1.1), (-1.8, 1.2, 2.4), (1.6, -2.0, 1.9))
out.append(shot('b-back34-stealth', (1200, 1500), -1.2))


def closeup(name, target, view, lens=35, dist=0.40, rake_from=None, power=30):
    """Raking-light close-up: camera at dist along view from target; one small light skimming the surface. Power 30 W:
    at 120 W (the shirt's arm rake, which skims from 0.5 m along the arm) these lights, closer and facing more of the
    surface, clipped the fabric to white (step 05 fix round 1)."""
    clear_rig()
    RN.world(sc, 0.02)
    view = np.asarray(view, float) / np.linalg.norm(view)
    target = np.asarray(target, float)
    cam = target + view * dist
    sc.camera = RN.camera(name, tuple(cam), tuple(target), lens)
    rake = target + np.asarray(rake_from, float)
    RN.area_light('rake', tuple(rake), tuple(target), power, 0.04, (1.0, 0.96, 0.9))
    up = np.array([0.0, 0.0, 1.0])
    RN.area_light('fill', tuple(cam + up * 0.3), tuple(target), 1.5, 0.5, (0.85, 0.9, 1.0))
    out.append(shot(name, (1800, 1350), 1.0))


if gname == 'trousers':
    kn, hp = J['knL'], J['hipL']
    side = np.sign(kn[0])
    # c. Left knee and cargo pocket from the front-outside; the light skims down the thigh.
    closeup('c-closeup-knee-cargo', (kn + (hp - kn) * 0.45) + np.array([side * 0.03, -0.07, 0.0]),
            (side * 0.55, -1.0, 0.12), lens=28, dist=0.55, rake_from=(side * 0.12, -0.08, 0.45))
    # e. The waist: belt loops, the fly, the snap and the shirt tucked under the band.
    closeup('e-closeup-waist', (0.02, J['spine'][1] - 0.13, J['spine'][2] - 0.07), (0.25, -1.0, 0.15), lens=35,
            dist=0.42, rake_from=(0.35, -0.05, 0.15))
    # f. The seat and the back of the knee from behind.
    closeup('f-closeup-seat', (side * 0.05, J['pelvis'][1] + 0.1, hp[2] - 0.06), (0.15, 1.0, 0.1), lens=28,
            dist=0.6, rake_from=(-side * 0.4, 0.1, 0.25))
    # g. The crotch gusset from below, between the knees, looking up: the knit diamond and its four seams (step 05 fix
    # round 2: the earlier front-and-below view left it in the thighs' shadow). The light skims in from the front.
    closeup('g-closeup-gusset', (0.0, J['pelvis'][1] + 0.01, hp[2] - 0.13), (0.05, -0.12, -1.0), lens=30,
            dist=0.32, rake_from=(0.1, -0.2, -0.15), power=12)
    # h. The hem sealed over the boot top, from the front-outside at ankle height (step 06).
    an = J['anL']
    closeup('h-closeup-hem-boot', an + np.array([0.0, -0.03, 0.03]), (side * 0.7, -1.0, 0.25), lens=35, dist=0.45,
            rake_from=(side * 0.25, -0.15, 0.3), power=8)
elif gname == 'gloves':
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'garments'))
    from gloves import hand_frame  # noqa: E402
    rig = bpy.data.objects[f'{op_id}-rig']
    bones = {b.name: (np.array(rig.matrix_world @ b.head_local), np.array(rig.matrix_world @ b.tail_local)) for b in rig.data.bones}
    fr = hand_frame(bones, 'L')
    hc = fr['wr'] + fr['a'] * 0.06
    # c. The back of the left hand: knuckle panel, knit back, fourchettes, the wrist tab; light along the fingers.
    closeup('c-closeup-glove-back', hc, fr['back'] * 1.0 - fr['af'] * 0.35 + np.array([0.0, -0.3, 0.0]), lens=35, dist=0.36,
            rake_from=-fr['l'] * 0.28 + fr['back'] * 0.06 + fr['a'] * 0.08, power=2)
    # e. The palm: goatskin, the palm-heel patch, fingertip patches and the polished trigger finger.
    closeup('e-closeup-glove-palm', hc, -fr['back'] * 1.0 + np.array([0.0, -0.45, 0.1]), lens=35, dist=0.34,
            rake_from=fr['a'] * 0.3 - fr['back'] * 0.1, power=2)
elif gname == 'boots':
    an, toe = J['anL'], J['toeL']
    side = np.sign(an[0])
    bc = np.array([an[0], (an[1] + toe[1]) / 2 + 0.02, 0.06])
    # c. The left boot from the outside front: rand, toe cap, heel counter, sole, eyestays.
    closeup('c-closeup-boot-side', bc, (side * 1.0, -0.55, 0.3), lens=35, dist=0.55, rake_from=(side * 0.15, -0.3, 0.25), power=6)
    # e. The lacing from the front and above: eyelets, speed hooks, laces, tongue, lace garage, the forefoot crease.
    closeup('e-closeup-boot-laces', np.array([an[0], an[1] - 0.06, 0.08]), (side * 0.25, -1.0, 0.75), lens=35, dist=0.42,
            rake_from=(side * 0.3, -0.05, 0.2), power=6)
    # f. Heel and sole from behind and below (floor hidden): heel counter, pull loop, heel brake, lugs.
    floor.hide_render = True
    closeup('f-closeup-boot-sole', np.array([an[0], an[1] + 0.0, 0.01]), (side * 0.35, 0.8, -0.75), lens=30, dist=0.5,
            rake_from=(side * 0.2, 0.25, -0.15), power=8)
    floor.hide_render = False
elif gname == 'base_layer':
    nk = J['neck']
    closeup('c-closeup-collar', nk + np.array([0.0, -0.05, -0.02]), (0.3, -1.0, 0.15), lens=35, dist=0.42,
            rake_from=(0.25, -0.05, 0.2))
    wr = J['wrL']
    closeup('e-closeup-cuff', wr, (np.sign(wr[0]) * 0.6, -1.0, 0.3), lens=35, dist=0.36,
            rake_from=(np.sign(wr[0]) * 0.05, -0.05, 0.25))

# c. Close-up at 0.4 m: the left upper arm from behind and outside, so the back raglan seam (knit to ripstop), the
# arm pocket and the elbow are in frame. One small light skims along the arm (raking); a faint fill.
if gname == 'combat_shirt':
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
    # e, f. The base layer under the shirt: the mock neck above the collar, the knit inside the cuff.
    nk, wr = J['neck'], J['wrL']
    closeup('e-closeup-collar', nk + np.array([0.0, -0.05, -0.02]), (0.3, -1.0, 0.15), lens=35, dist=0.42,
            rake_from=(0.25, -0.05, 0.2))
    closeup('f-closeup-cuff', wr, (np.sign(wr[0]) * 0.6, -1.0, 0.3), lens=35, dist=0.36,
            rake_from=(np.sign(wr[0]) * 0.05, -0.05, 0.25))


# d. Front, neutral even light, for checking construction.
clear_rig()
RN.world(sc, 0.6, (0.5, 0.5, 0.5))
RN.studio_rig(centre, 1.7)
floor.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.08, 0.08, 0.085, 1)
sc.camera = RN.camera('front', *front_cam, 55)
out.append(shot('d-front-neutral', (1200, 1500), 1.4))

print('operators: test renders on', ', '.join(gpus))
for p in out:
    print('operators: wrote', p)
