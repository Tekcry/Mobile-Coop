"""Garment method test renders (RUNBOOK step 3): front and 3/4 back in stealth light, raking-light close-ups at about
0.4 m of what the garment adds, and a neutral front; Cycles on the hardware GPU (OptiX), WebP into
docs/operators/mockups/tests/. The shirt frames the upper body; the base layer and the trousers the whole figure.
Close-ups: shirt - left upper arm and elbow; base layer - collar and left cuff; trousers - left knee and cargo pocket,
the waist (belt loops, fly, tucked shirt) and the seat.
"""
import json
import math
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
    '--quick': {'action': 'store_true'},   # close-ups only (the per-item tuning loop, step 07)
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

if not args.quick:
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
elif gname in ('headwear', 'head_kit'):
    # Step 07: the head. Front three-quarter, the left side (earpiece side, chin buckle), the back (cradle, battery,
    # the band, the hood's cord lock); for the head kit also the goggle in use (close), stowed on the brow (front and
    # side, D19 / D20) and a darkness view lit by the lens glow alone, in use (D13). Near-black parts: small rake lights (gloves 2 W, boots 6-8 W).
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'garments'))
    import fitted as FT  # noqa: E402
    import head_common as HC  # noqa: E402
    body = bpy.data.objects[f'{op_id}-body']
    hf = HC.head_frame(FT.bvh_of(body, bpy.context.evaluated_depsgraph_get()))
    hc, ez = hf['c'], hf['eye_z']
    face = np.array([0.0, hc[1] - 0.07, ez])
    closeup('c-closeup-head-front', face + np.array([0.0, 0.0, 0.01]), (0.5, -1.0, 0.15), lens=50, dist=0.55,
            rake_from=(0.3, -0.12, 0.2), power=3)
    closeup('e-closeup-head-side', np.array([0.02, hc[1] - 0.02, ez - 0.02]), (1.0, -0.2, 0.08), lens=50, dist=0.55,
            rake_from=(0.12, -0.25, 0.2), power=3)
    closeup('f-closeup-head-back', np.array([0.0, hc[1] + 0.05, hc[2] - 0.01]), (-0.45, 1.0, 0.3), lens=50, dist=0.55,
            rake_from=(0.25, 0.12, 0.22), power=3)
    stow = [o for o in bpy.data.objects if o.get('stowM')]
    if gname == 'head_kit' and stow:
        # g. In use (D19 / D20): the goggle over the eyes, the eyecups sealing on the eye port.
        closeup('g-closeup-goggle', face + np.array([0.0, -0.06, 0.0]), (0.35, -1.0, -0.12), lens=50, dist=0.36,
                rake_from=(0.2, -0.1, 0.15), power=2)
        # h. Stowed: slid up onto the brow over the hood, the band and its cable in their stowed run (A29).
        from mathutils import Matrix  # noqa: E402
        M = Matrix([stow[0]['stowM'][r * 4:r * 4 + 4] for r in range(4)])
        pos = [o for o in bpy.data.objects if o.get('goggle_pos')]
        for o in stow:
            o.matrix_world = M @ o.matrix_world
        for o in pos:
            o.hide_render = o['goggle_pos'] != 'stowed'
            o.hide_viewport = False
        # the hood's band dent follows the band (fix round 2, item 1): head_kit stores the stowed run as a delta
        dent = [o for o in bpy.data.objects if o.type == 'MESH' and 'stow_delta' in o.data.attributes]

        def shift_dent(sgn):
            for o in dent:
                n_ = len(o.data.vertices)
                co, dl = np.zeros(3 * n_), np.zeros(3 * n_)
                o.data.vertices.foreach_get('co', co)
                o.data.attributes['stow_delta'].data.foreach_get('vector', dl)
                o.data.vertices.foreach_set('co', co + sgn * dl)
                o.data.update()
        shift_dent(1.0)
        closeup('h-closeup-goggle-stowed', face + np.array([0.0, 0.0, 0.035]), (0.55, -1.0, 0.2), lens=50, dist=0.55,
                rake_from=(0.3, -0.12, 0.2), power=3)
        closeup('j-closeup-stowed-side', np.array([0.02, hc[1] - 0.02, ez + 0.01]), (1.0, -0.35, 0.15), lens=50,
                dist=0.6, rake_from=(0.12, -0.25, 0.2), power=3)
        for o in stow:
            o.matrix_world = M.inverted() @ o.matrix_world
        shift_dent(-1.0)
        for o in pos:
            o.hide_render = o['goggle_pos'] != 'inuse'
        # i. Darkness: no lights, no world: what shows is the lens glow and what it lights.
        clear_rig()
        RN.world(sc, 0.0)
        # framed on the head (fix round 1, item 8): the glow's spill on the eyecups, the brow and the hood is judged
        tgt = face + np.array([0.0, -0.03, -0.005])
        sc.camera = RN.camera('dark', tuple(tgt + FT.unit(np.array([0.45, -1.0, 0.12])) * 0.42), tuple(tgt), 50)
        out.append(shot('i-darkness-glow', (1500, 1500), 1.8))
elif gname in ('carrier', 'belt'):
    # Step 08: the carrier and the belt. Raking close-ups at 0.45-0.6 m (moderate lights: near-black parts blew out
    # above about 8 W at this range) and, for the carrier, the silhouette against a rim light (shoulder line, straps).
    if gname == 'carrier':
        closeup('c-closeup-carrier-front', np.array([0.0, -0.2, 1.22]), (0.35, -1.0, 0.18), lens=35, dist=0.62,
                rake_from=(0.32, -0.12, 0.3), power=6)
        closeup('e-closeup-shoulder', np.array([0.09, -0.05, 1.37]), (0.55, -1.0, 0.65), lens=35, dist=0.42,
                rake_from=(0.25, -0.02, 0.3), power=4)
        closeup('f-closeup-carrier-back', np.array([0.0, 0.13, 1.26]), (-0.3, 1.0, 0.2), lens=35, dist=0.62,
                rake_from=(-0.32, 0.12, 0.3), power=6)
        closeup('g-closeup-cummerbund-left', np.array([0.15, -0.01, 1.2]), (1.0, -0.3, 0.12), lens=35, dist=0.5,
                rake_from=(0.22, -0.25, 0.28), power=6)
        closeup('h-closeup-cummerbund-right', np.array([-0.15, 0.0, 1.2]), (-1.0, -0.3, 0.12), lens=35, dist=0.5,
                rake_from=(-0.22, -0.25, 0.28), power=6)
        # i. Silhouette: near-black, only two hard rim lights from behind; the shoulder line and straps must read.
        clear_rig()
        RN.world(sc, 0.002, (0.5, 0.55, 0.65))
        RN.area_light('rimL', (1.3, 2.0, 1.9), (0.0, 0.0, 1.25), 900, 0.08, (0.62, 0.75, 1.0))
        RN.area_light('rimR', (-1.3, 2.0, 1.9), (0.0, 0.0, 1.25), 900, 0.08, (0.62, 0.75, 1.0))
        sc.camera = RN.camera('sil', (0.35, -2.6, 1.3), (0.0, 0.0, 1.2), 55)
        out.append(shot('i-silhouette-rim', (1200, 1500), -0.5))
    else:
        closeup('c-closeup-belt-front', np.array([0.03, -0.17, 0.95]), (0.4, -1.0, 0.2), lens=35, dist=0.55,
                rake_from=(0.3, -0.1, 0.25), power=6)
        closeup('e-closeup-belt-back', np.array([-0.03, 0.12, 0.95]), (-0.35, 1.0, 0.2), lens=35, dist=0.55,
                rake_from=(-0.3, 0.1, 0.25), power=6)
elif gname == 'armour':
    # Step 08b: the composite armour and harness. Raking close-ups at 0.4-0.65 m with moderate lights (near-black
    # renders mid grey under a strong one, OPEN since step 05), a full side view and the rim-light silhouette.
    sg = float(np.sign(J['shL'][0]))
    closeup('c-closeup-chest-plate', np.array([0.0, -0.17, 1.24]), (sg * 0.35, -1.0, 0.2), lens=35, dist=0.62,
            rake_from=(sg * 0.32, -0.12, 0.3), power=8)
    closeup('e-closeup-back-recess-mount', np.array([sg * 0.02, 0.1, 1.245]), (-sg * 0.25, 1.0, 0.15), lens=35,
            dist=0.5, rake_from=(-sg * 0.3, 0.12, 0.3), power=8)
    closeup('f-closeup-rib-segments', np.array([sg * 0.06, -0.14, 1.07]), (sg * 0.95, -0.75, 0.12), lens=35,
            dist=0.45, rake_from=(sg * 0.15, -0.25, 0.3), power=6)
    closeup('h-closeup-shoulder-buckle', np.array([sg * 0.095, -0.1, 1.335]), (sg * 0.45, -1.0, 0.55), lens=35,
            dist=0.4, rake_from=(sg * 0.25, -0.05, 0.3), power=5)
    closeup('j-closeup-side-strap', np.array([sg * 0.14, -0.04, 1.2]), (1.0 * sg, -0.25, 0.1), lens=35, dist=0.45,
            rake_from=(sg * 0.2, -0.25, 0.28), power=6)
    if not args.quick:
        stealth((sg * 3.3, -0.35, 1.05), (0.0, 0.0, 0.92), (sg * 1.2, -2.2, 2.3), (-sg * 1.6, 1.9, 2.0))
        out.append(shot('g-side-stealth', (1200, 1500), -1.2))
        stealth((-0.3, 3.4, 1.0), (0.0, 0.0, 0.9), (-2.2, 0.9, 2.3), (1.4, -2.2, 2.0))
        out.append(shot('k-back-stealth', (1200, 1500), -1.2))
        clear_rig()
        RN.world(sc, 0.002, (0.5, 0.55, 0.65))
        RN.area_light('rimL', (1.3, 2.0, 1.9), (0.0, 0.0, 1.2), 900, 0.08, (0.62, 0.75, 1.0))
        RN.area_light('rimR', (-1.3, 2.0, 1.9), (0.0, 0.0, 1.2), 900, 0.08, (0.62, 0.75, 1.0))
        sc.camera = RN.camera('sil', (0.35, -2.6, 1.25), (0.0, 0.0, 1.15), 55)
        out.append(shot('i-silhouette-rim', (1200, 1500), -0.5))
elif gname == 'base_layer':
    nk = J['neck']
    closeup('c-closeup-collar', nk + np.array([0.0, -0.05, -0.02]), (0.3, -1.0, 0.15), lens=35, dist=0.42,
            rake_from=(0.25, -0.05, 0.2))
    wr = J['wrL']
    closeup('e-closeup-cuff', wr, (np.sign(wr[0]) * 0.6, -1.0, 0.3), lens=35, dist=0.36,
            rake_from=(np.sign(wr[0]) * 0.05, -0.05, 0.25))

elif gname == 'suit':
    # Step 08a: the suit's close-ups at 0.35-0.6 m (the micro-texture reads here, not at full figure), one moderate
    # rake each (near-black renders mid grey under a strong one, OPEN since step 05), and a rim-light silhouette.
    sg = float(np.sign(J['shL'][0]))
    nk, ch, pv = J['neck'], J['chest'], J['pelvis']
    closeup('c-closeup-collar-zip', nk + np.array([-sg * 0.02, -0.07, -0.07]), (sg * 0.35, -1.0, 0.25), lens=35,
            dist=0.5, rake_from=(sg * 0.3, -0.1, 0.25), power=10)
    closeup('e-closeup-chest-waist', np.array([0.0, ch[1] - 0.1, (ch[2] + pv[2]) / 2]), (-sg * 0.25, -1.0, 0.1),
            lens=35, dist=0.6, rake_from=(-sg * 0.35, -0.1, 0.3), power=10)
    # fix round 1, item 7: from in front of and below the arm (from the side the A-pose arm hid the vent)
    closeup('f-closeup-underarm-vent', np.array([sg * 0.15, ch[1] + 0.0, ch[2] - 0.06]), (sg * 0.7, -0.7, -0.2),
            lens=35, dist=0.45, rake_from=(sg * 0.4, -0.5, 0.3), power=8)
    el_, wr_ = J['elL'], J['wrL']
    closeup('g-closeup-forearm-elbow', el_ + (wr_ - el_) * 0.35, (sg * 0.5, 0.35, 0.8), lens=35, dist=0.5,
            rake_from=(sg * 0.25, -0.2, 0.2), power=8)
    kn = J['knL']
    closeup('h-closeup-knee', kn + np.array([0.0, -0.05, 0.0]), (sg * 0.3, -1.0, 0.12), lens=35, dist=0.5,
            rake_from=(sg * 0.3, -0.1, 0.3), power=10)
    closeup('j-closeup-knee-back-seat', (kn + J['hipL']) / 2 + np.array([0.0, 0.07, 0.05]), (sg * 0.25, 1.0, 0.05),
            lens=30, dist=0.75, rake_from=(sg * 0.35, 0.1, 0.35), power=12)
    an = J['anL']
    closeup('k-closeup-ankle-cuff', np.array([an[0], an[1], 0.1]), (sg * 0.6, -1.0, 0.25), lens=35, dist=0.42,
            rake_from=(sg * 0.25, -0.1, 0.25), power=8)
    if not args.quick:
        clear_rig()
        RN.world(sc, 0.002, (0.5, 0.55, 0.65))
        RN.area_light('rimL', (1.3, 2.0, 1.9), (0.0, 0.0, 1.0), 900, 0.08, (0.62, 0.75, 1.0))
        RN.area_light('rimR', (-1.3, 2.0, 1.9), (0.0, 0.0, 1.0), 900, 0.08, (0.62, 0.75, 1.0))
        sc.camera = RN.camera('sil', *front_cam, 55)
        out.append(shot('i-silhouette-rim', (1200, 1500), -0.5))

if gname == 'head_kit' and bpy.data.objects.get(f'{op_id}-suit-hero') is not None:
    # Step 08a: the suit with everything over it - the hood skirt over the mock neck and the zip garage (front and
    # nape), the glove cuff over the sleeve and its thumb loop, the boot collar over the ankle cuff.
    sg = float(np.sign(J['shL'][0]))
    nk = J['neck']
    closeup('s1-suit-collar-hood-front', nk + np.array([-sg * 0.01, -0.06, -0.03]), (sg * 0.3, -1.0, 0.2), lens=35,
            dist=0.45, rake_from=(sg * 0.3, -0.1, 0.25), power=10)
    closeup('s2-suit-collar-hood-nape', nk + np.array([0.0, 0.06, -0.03]), (sg * 0.35, 1.0, 0.2), lens=35, dist=0.45,
            rake_from=(sg * 0.3, 0.1, 0.25), power=10)
    wr_ = J['wrL']
    closeup('s3-suit-glove-cuff', wr_, (sg * 0.6, -1.0, 0.3), lens=35, dist=0.36,
            rake_from=(sg * 0.05, -0.05, 0.25), power=8)
    an = J['anL']
    closeup('s4-suit-ankle-boot', np.array([an[0], an[1], 0.11]), (sg * 0.6, -1.0, 0.25), lens=35, dist=0.45,
            rake_from=(sg * 0.25, -0.1, 0.25), power=8)

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
if not args.quick:
    clear_rig()
    RN.world(sc, 0.6, (0.5, 0.5, 0.5))
    RN.studio_rig(centre, 1.7)
    floor.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.08, 0.08, 0.085, 1)
    sc.camera = RN.camera('front', *front_cam, 55)
    out.append(shot('d-front-neutral', (1200, 1500), 1.4))

print('operators: test renders on', ', '.join(gpus))
for p in out:
    print('operators: wrote', p)
