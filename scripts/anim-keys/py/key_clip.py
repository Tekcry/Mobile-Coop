"""(CT prototype G8) Bake a hand-keyed gait cycle on Wren's armature, headless (scripts/anim-keys/build.mjs).

Reads the operator joints (build/operators/joints.json, the game rig's bind pose) and a key file
(scripts/anim-keys/keys/<clip>.json: key poses typed by hand, see its note). Builds the armature as build_skeleton.py
does, poses each key by forward kinematics in the game frame (+X right, +Y up, +Z forward), keys the bones (quaternion
and location, Bezier, cyclic), saves the .blend, samples the evaluated armature at `frames` per cycle and writes the
runtime samples (JSON) for build.mjs. With --preview, renders a side and a front strip of 8 phases (Workbench, capsules
skinned to the bones) for checking the keys by eye before the game.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

# no __pycache__ in the operators' tracked folder
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'operators', 'py'))
import common  # noqa: E402

args = common.parse_args({
    '--joints': {'required': True},
    '--operator': {'required': True},
    '--keys': {'required': True},
    '--out': {'required': True},
    '--blend': {'required': True},
    '--preview': {'default': ''},
})
common.check_version()
common.empty_scene()
common.seed_everything(args.seed)

op = common.load_operator(args.joints, args.operator)
J = {j['name']: j for j in op['joints']}
ORDER = [j['name'] for j in op['joints']]
H = op['height']
K = H / 1.75
with open(args.keys, encoding='utf-8') as f:
    clip = json.load(f)

# game <-> Blender frames (common.game_to_blender: (x, y, z) -> (-x, -z, y))
C = Matrix(((-1, 0, 0), (0, 0, -1), (0, 1, 0)))
CI = C.transposed()
P = {n: Vector(J[n]['pos']) for n in ORDER}
OFF = {n: (P[n] - P[J[n]['parent']]) if J[n]['parent'] else Vector((0, 0, 0)) for n in ORDER}
d2r = math.radians


def rx(a):
    return Matrix.Rotation(a, 3, 'X')


def ry(a):
    return Matrix.Rotation(a, 3, 'Y')


def rz(a):
    return Matrix.Rotation(a, 3, 'Z')


def ypr(e):
    """Babylon's RotationYawPitchRoll (roll about Z, then pitch about X, then yaw about Y), degrees."""
    return ry(d2r(e.get('yaw', 0))) @ rx(d2r(e.get('pitch', 0))) @ rz(d2r(e.get('roll', 0)))


def bone_rot(d, hint):
    """The rig's boneRotation: a rotation whose -Y points along d and +Z leans toward hint."""
    ay = (-d).normalized()
    az = hint - ay * hint.dot(ay)
    if az.length_squared < 1e-10:
        az = Vector((0, 0, 1))
    az.normalize()
    ax = ay.cross(az)
    return Matrix((ax, ay, az)).transposed()


DOWN = Vector((0, -1, 0))
FWD = Vector((0, 0, 1))
CARRY = float(clip.get('carry', 5))  # the elbow's carrying angle (deg): the forearm hangs a little out from the upper arm


def wrist_local(e, s):
    """(anim-rig) A key's wrist frame in its forearm's frame (degrees; right hand as written, left mirrored)."""
    if not e:
        return Matrix.Identity(3)
    return ry(d2r(s * e.get('yaw', 0))) @ rx(d2r(e.get('pitch', 0))) @ rz(d2r(s * e.get('roll', 0)))


# (anim-rig) the clip keys a wrist frame when any key's arm carries one: the samples then carry `wrist` (8 per frame)
HAS_WRIST = any('wrist' in k.get(a, {}) for k in clip['keys'] for a in ('armL', 'armR'))


def sh_local(a, s):
    """(marlow-bays T1a) A key's shoulder turn in the chest frame (deg; + pitch forward as the flex, right side as written,
    the left mirrored): the runtime `sh` channel."""
    e = a.get('sh') or {}
    return ry(d2r(s * e.get('yaw', 0))) @ rx(-d2r(e.get('pitch', 0))) @ rz(d2r(s * e.get('roll', 0)))


# (marlow-bays T1a) the optional channels: the samples carry `fore` (forearm twist L, R: 8 per frame), `head` (4) and
# `sh` (shoulder L, R: 8) when any key sets them (non-zero); without them the lines are left out (identity), as before
HAS_FORE = any(k.get(a, {}).get('twist', 0) for k in clip['keys'] for a in ('armL', 'armR'))
HAS_SH = any(any((k.get(a, {}).get('sh') or {}).get(x, 0) for x in ('pitch', 'yaw', 'roll')) for k in clip['keys'] for a in ('armL', 'armR'))
HAS_HEAD = any(any(k.get('head', {}).get(x, 0) for x in ('pitch', 'yaw', 'roll')) for k in clip['keys'])

# (anim-skeleton S3b) the opt-in clavicle, finger and FK leg channels (src/anim/keyed.ts `clav` 8, `fing` 20, `leg` 22):
# only when the key file sets `"clav"`, `"fingers"` or `"legs": true` (every older key file has leg values but none of
# the flags, so its output is unchanged). Per key: `armL` / `armR` `clav {pitch, yaw, roll}` (deg, chest frame, right side
# as written and the left mirrored like `sh`: a shrug is roll + on both sides, a shoulder pushed forward yaw - on
# both); `handL` / `handR` `{thumb|index|middle|ring|little: {curl, spread}}` (curl in fingers.ts units, 1 = closed,
# added to the grip shape; spread in deg, + away from the middle finger, the middle toward the index); `legL` / `legR`
# `toe` (deg, + the toes up, as `ankle`) and `w` (the FK weight 0..1; 0 = the foot planner's IK leg).
HAS_CLAV = bool(clip.get('clav'))
HAS_FING = bool(clip.get('fingers'))
HAS_LEGS = bool(clip.get('legs'))
FINGER_NAMES = ('thumb', 'index', 'middle', 'ring', 'little')
# (anim-skeleton S4) auto opt-in: a key file whose keys set a non-zero clavicle or finger value (the tuner's Keys edits
# on any clip) gets that channel without the flag; any non-zero leg delta `legL` / `legR` `d` {hipPitch, hipYaw, hipRoll,
# knee, anklePitch, ankleRoll, toe, (tuner-clarity S2) ankleYaw (+ toes out), shinTwist (+ shin turned out)} (deg,
# anatomical: the same sense on both sides) gets the `legd` channel (18 a frame, 9 a side, rad in the rig frame,
# src/anim/keyed.ts `KD`): deltas on the foot planner's solved IK leg. Untouched files: unchanged.
LEGD_FIELDS = ('hipPitch', 'hipYaw', 'hipRoll', 'knee', 'anklePitch', 'ankleRoll', 'toe', 'ankleYaw', 'shinTwist')
# key degrees -> the rig frame per side (src/anim/keyed.ts LEGD_SIGN, the same table)
LEGD_SIGN = {'L': (-1, -1, -1, 1, -1, 1, -1, -1, -1), 'R': (-1, 1, 1, 1, -1, -1, -1, 1, 1)}
HAS_CLAV = HAS_CLAV or any(any((k.get(a, {}).get('clav') or {}).get(x, 0) for x in ('pitch', 'yaw', 'roll')) for k in clip['keys'] for a in ('armL', 'armR'))
HAS_FING = HAS_FING or any(any((k.get(h, {}).get(fn) or {}).get(x, 0) for fn in FINGER_NAMES for x in ('curl', 'spread')) for k in clip['keys'] for h in ('handL', 'handR'))
HAS_LEGD = any(any((k.get(g, {}).get('d') or {}).get(x, 0) for x in LEGD_FIELDS) for k in clip['keys'] for g in ('legL', 'legR'))
SPREAD_MAX_DEG = 30.0  # src/anim/fingers.ts SPREAD_MAX_DEG (spread 1 = 30 deg)
CHECK = []  # the frame proof at the key file's `checkFrames` (sample indices), written as the JSON's `check`
with open(os.path.join(os.path.dirname(__file__), '..', '..', 'anim-skeleton', 'skeleton.json'), encoding='utf-8') as f:
    _SC = json.load(f)['clavicle']


def clav_local(a, s):
    """(anim-skeleton S3b) A key's clavicle turn: the rig's clavicle node local to the chest (Babylon YawPitchRoll, as
    the Joints clavicle row's right side; the left mirrored: yaw and roll negated)."""
    e = a.get('clav') or {}
    return ry(d2r(s * e.get('yaw', 0))) @ rx(d2r(e.get('pitch', 0))) @ rz(d2r(s * e.get('roll', 0)))


def sc_point(side):
    """(anim-skeleton S3b) The sternoclavicular point in the chest frame (src/anim/clavicle.ts `clavPoint`)."""
    s = -1 if side == 'L' else 1
    return Vector((s * _SC['lateral'], P['neck'].y - P['chest'].y - _SC['belowNeck'], _SC['forward']))


def leg_rig(W, side):
    """(anim-skeleton S3b) One evaluated leg in the rig's local frames (src/player/characterRig.ts: the hip, knee, ankle
    and toe nodes hang along -Y at an identity rest, the knee a hinge about its local X). Returns the hip rotation under
    the pelvis, the knee flex (rad, + the shin back), the ankle rotation under the knee and the toe angle (rad, about
    the toe's X: - the toes up, the toe roll's sense). The bake's knee hinges about the pelvis X before the thigh's
    adduction, so with `add` it is not a pure local-X hinge: the hip is twisted about the thigh by the angle that brings
    the shin into the hip's YZ plane, so the thigh, the shin and the foot come out exactly (the twist is 0 at add 0)."""
    hip, kn, an, toe = 'hip' + side, 'kn' + side, 'an' + side, 'toe' + side
    pinv = W['pelvis'].inverted()
    s = (W[hip].inverted() @ W[kn]) @ DOWN  # the shin in the bake's thigh frame
    psi = 0.0
    if s.x * s.x + s.z * s.z > 1e-8:  # a near-straight knee: no hinge to align (no twist flip on round-off)
        psi = math.atan2(s.x, s.z)
        if psi > math.pi / 2:
            psi -= math.pi
        elif psi <= -math.pi / 2:
            psi += math.pi
    v = ry(-psi) @ s
    knee = math.atan2(-v.z, -v.y)
    hq = pinv @ W[hip] @ ry(psi)
    aq = (hq @ rx(knee)).inverted() @ pinv @ W[an]
    t = W[an].inverted() @ W[toe]
    return hq, knee, aq, math.atan2(t[2][1], t[1][1])


def mirror_key(k):
    """The right step from the left one: sides swapped, lateral offsets, yaws and rolls negated."""
    m = {'phase': k['phase'] + 0.5}
    for seg in ('pelvis', 'spine', 'chest', 'neck', 'head'):
        if seg == 'head' and 'head' not in k:
            continue
        e = dict(k.get(seg, {}))
        for a in ('dx', 'yaw', 'roll'):
            if a in e:
                e[a] = -e[a]
        m[seg] = e
    for a, b in (('armL', 'armR'), ('legL', 'legR')):
        m[a], m[b] = dict(k[b]), dict(k[a])
    # (anim-skeleton S3b) the hands' finger values swap too (each hand's own: symmetric)
    if 'handL' in k or 'handR' in k:
        m['handL'], m['handR'] = dict(k.get('handR', {})), dict(k.get('handL', {}))
    return m


keys = list(clip['keys'])
if clip.get('mirror'):
    keys += [mirror_key(k) for k in clip['keys']]
keys.sort(key=lambda k: k['phase'])


def fk(k):
    """World (body frame) rotation and joint position of every rig joint for one key."""
    W = {}
    X = {}
    W['root'] = W['body'] = Matrix.Identity(3)
    X['root'] = P['root'].copy()
    X['body'] = P['body'].copy()
    pe = k['pelvis']
    W['pelvis'] = ypr(pe)
    X['pelvis'] = P['pelvis'] + Vector((pe.get('dx', 0), pe.get('dy', 0), pe.get('dz', 0))) * 0.01
    for n, par in (('spine', 'pelvis'), ('chest', 'spine'), ('neck', 'chest')):
        W[n] = ypr(k[n])
        X[n] = X[par] + W[par] @ OFF[n]
    # (marlow-bays T1a) an optional keyed head turn, local on the neck (the runtime `head` channel)
    W['head'] = W['neck'] @ ypr(k['head']) if 'head' in k else W['neck']
    X['head'] = X['neck'] + W['neck'] @ OFF['head']
    for side, s in (('L', -1), ('R', 1)):
        a = k['arm' + side]
        sh, el, wr, hd = 'sh' + side, 'el' + side, 'wr' + side, 'hand' + side
        X[sh] = X['chest'] + W['chest'] @ OFF[sh]
        u = W['chest'] @ rx(-d2r(a['flex'])) @ rz(s * d2r(a['abd'])) @ DOWN
        # the forearm bends forward at the elbow and (inward, deg) turns in toward the midline, hands in front of the hips
        f = W['chest'] @ ry(-s * d2r(a.get('inward', 0))) @ rx(-d2r(a['flex'] + a['elbow'])) @ rz(s * d2r(a['abd'] + CARRY)) @ DOWN
        # (marlow-bays T1a) the upper arm twist: the forearm turned about the shoulder-elbow line (it rides the points)
        if a.get('twistUpper', 0):
            f = Matrix.Rotation(s * d2r(a['twistUpper']), 3, u.normalized()) @ f
        # (marlow-bays T1a) the keyed shoulder: the whole arm turned about the shoulder joint in the chest frame (the
        # runtime `sh` channel; the sampled arm points leave it out, `sh_local` below)
        SHc = W['chest'] @ sh_local(a, s) @ W['chest'].inverted()
        W[sh] = SHc @ bone_rot(u, FWD)
        X[el] = X[sh] + SHc @ u * OFF[el].length
        # (marlow-bays T1a) the forearm twist about the bone (the runtime `fore` channel)
        W[el] = SHc @ bone_rot(f, FWD) @ ry(s * d2r(a.get('twist', 0)))
        X[wr] = X[el] + SHc @ f * OFF[wr].length
        # (anim-rig) an optional keyed wrist frame, local to the forearm (the rig's wrist node under its elbow node):
        # yaw twists the hand about the forearm, pitch and roll swing it, written for the right hand (s = 1) and mirrored
        # for the left (yaw and roll negated), so a mirrored key swaps the arms as they are. Without it the hand
        # continues the forearm (identity), as before.
        W[wr] = W[el] @ wrist_local(a.get('wrist'), s)
        W[hd] = W[wr]
        X[hd] = X[wr] + W[wr] @ OFF[hd]
        g = k['leg' + side]
        hip, kn, an, toe = 'hip' + side, 'kn' + side, 'an' + side, 'toe' + side
        X[hip] = X['pelvis'] + W['pelvis'] @ OFF[hip]
        add = rz(-s * d2r(g['add']))
        thigh = W['pelvis'] @ rx(-d2r(g['flex'])) @ add
        W[hip] = thigh
        X[kn] = X[hip] + thigh @ DOWN * OFF[kn].length
        shin = W['pelvis'] @ rx(-d2r(g['flex'] - g['knee'])) @ add
        W[kn] = shin
        X[an] = X[kn] + shin @ DOWN * OFF[an].length
        foot = shin @ rx(-d2r(g['ankle']))
        # (anim-skeleton S3b) an optional toe bend at the ball (deg, + the toes up, as the ankle); 0 = the foot, as before
        W[an] = foot
        W[toe] = foot @ rx(-d2r(g.get('toe', 0)))
        X[toe] = X[an] + foot @ OFF[toe]
    return W, X


# --- the armature (one bone per joint, as build_skeleton.py)
children = {}
for n in ORDER:
    if J[n]['parent']:
        children.setdefault(J[n]['parent'], []).append(n)
arm_data = bpy.data.armatures.new(f"{op['id']}-{clip['name']}")
arm = bpy.data.objects.new(f"{op['id']}-{clip['name']}", arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for n in ORDER:
    head = Vector(common.game_to_blender(P[n]))
    kids = children.get(n, [])
    if kids:
        tail = Vector(common.game_to_blender(P[kids[0]]))
    elif J[n]['parent']:
        dd = head - Vector(common.game_to_blender(P[J[n]['parent']]))
        tail = head + (dd.normalized() * 0.04 if dd.length > 1e-6 else Vector((0, 0, 0.04)))
    else:
        tail = head + Vector((0, 0, 0.04))
    if (tail - head).length < 1e-4:
        tail = head + Vector((0, 0, 0.02))
    b = arm_data.edit_bones.new(n)
    b.head, b.tail = head, tail
    if J[n]['parent']:
        b.parent = arm_data.edit_bones[J[n]['parent']]
bpy.ops.object.mode_set(mode='POSE')
REST = {b.name: b.matrix_local.to_3x3() for b in arm_data.bones}
for pb in arm.pose.bones:
    pb.rotation_mode = 'QUATERNION'

# --- key the poses: 48 frames a cycle, the first key repeated at the end, cyclic curves
SPAN = 48
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 0, SPAN
prev = {}


def set_pose(k, frame):
    W, X = fk(k)
    for n in ORDER:
        pb = arm.pose.bones[n]
        m = (C @ W[n] @ CI @ REST[n]).to_4x4()
        m.translation = C @ X[n]
        pb.matrix = m
        bpy.context.view_layer.update()
        q = pb.rotation_quaternion.copy()
        if n in prev and q.dot(prev[n]) < 0:
            pb.rotation_quaternion = -q
        prev[n] = pb.rotation_quaternion.copy()
        pb.keyframe_insert('rotation_quaternion', frame=frame)
        pb.keyframe_insert('location', frame=frame)


for k in keys:
    set_pose(k, round(k['phase'] * SPAN))
set_pose(dict(keys[0], phase=1.0), SPAN)
action = arm.animation_data.action


def curves(act):
    """Every F-curve of the action (Blender 5 layered actions keep them in channelbags)."""
    out = list(getattr(act, 'fcurves', []) or [])
    for layer in getattr(act, 'layers', []):
        for strip in layer.strips:
            for bag in getattr(strip, 'channelbags', []):
                out.extend(bag.fcurves)
    return out


for fc in curves(action):
    fc.modifiers.new('CYCLES')
    for kp in fc.keyframe_points:
        kp.interpolation = 'BEZIER'
        kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
    fc.update()

os.makedirs(os.path.dirname(args.blend), exist_ok=True)


# --- sample the evaluated armature
def evaluated():
    W, X = {}, {}
    for n in ORDER:
        m = arm.pose.bones[n].matrix
        W[n] = CI @ (m.to_3x3() @ REST[n].inverted()) @ C
        X[n] = CI @ m.translation
    return W, X


def quat(m):
    q = m.to_quaternion().normalized()
    return [q.x, q.y, q.z, q.w]


def lerp_key(p, get):
    """(marlow-bays T1a) A key value at cycle phase p, linear between the keys at their baked frames (round(phase * SPAN),
    wrapping), as the game's live key preview spreads an edit (src/anim/tuneKeys.ts `build`)."""
    ph = [round(k['phase'] * SPAN) / SPAN % 1 for k in keys]
    order = sorted(range(len(keys)), key=lambda i: ph[i])
    a = order[-1]
    for i in order:
        if ph[i] <= p:
            a = i
    b = order[(order.index(a) + 1) % len(order)]
    pa, pb = ph[a], ph[b]
    if pa > p:
        pa -= 1
    if pb <= pa:
        pb += 1
    t = (p - pa) / (pb - pa) if pb > pa else 0
    va, vb = get(keys[a]), get(keys[b])
    return [x + (y - x) * t for x, y in zip(va, vb)]


def arm_get(side, sub, fields):
    def g(k):
        a = k.get('arm' + side, {})
        e = (a.get(sub) or {}) if sub else a
        return [e.get(f, 0) for f in fields]
    return g


N = int(clip.get('frames', 32))
frames = []
lastq = {}
for i in range(N):
    fr = i * SPAN / N
    scene.frame_set(int(fr), subframe=fr - int(fr))
    W, X = evaluated()
    # (marlow-bays T1a) the shoulder turn per side at this phase (stripped from the sampled arm points: the runtime
    # applies its `sh` channel after aiming the arm at them), the forearm twist and the head turn
    shq = {}
    extra = {'fore': [], 'sh': [], 'head': []}
    for side, s in (('L', -1), ('R', 1)):
        yaw, pitch, roll = lerp_key(i / N, arm_get(side, 'sh', ('yaw', 'pitch', 'roll')))
        shq[side] = sh_local({'sh': {'yaw': yaw, 'pitch': pitch, 'roll': roll}}, s)
        extra['sh'] += quat(shq[side])
        tw = lerp_key(i / N, arm_get(side, '', ('twist',)))[0]
        extra['fore'] += quat(ry(s * d2r(tw)))
    hy, hp, hr = lerp_key(i / N, lambda k: [k.get('head', {}).get(f, 0) for f in ('yaw', 'pitch', 'roll')])
    extra['head'] = quat(ypr({'yaw': hy, 'pitch': hp, 'roll': hr}))
    # (anim-skeleton S3b) the clavicles (keys lerped, as `sh`), the fingers (lerped) and the FK legs (the evaluated
    # armature in the rig's frames, `leg_rig`; the weight lerped): only for a key file that opts in
    skel = {'clav': [], 'fing': [], 'leg': []}
    clq = {}
    for side, s in (('L', -1), ('R', 1)):
        cy, cp, cr = lerp_key(i / N, arm_get(side, 'clav', ('yaw', 'pitch', 'roll')))
        clq[side] = clav_local({'clav': {'yaw': cy, 'pitch': cp, 'roll': cr}}, s)
        skel['clav'] += quat(clq[side])
        for fn in FINGER_NAMES:
            curl, spread = lerp_key(i / N, lambda k, h='hand' + side, fn=fn: [(k.get(h, {}).get(fn) or {}).get(x, 0) for x in ('curl', 'spread')])
            skel['fing'] += [curl, spread / SPREAD_MAX_DEG]
        if HAS_LEGS:
            hq, knee, aq, toe_a = leg_rig(W, side)
            for nm, m in (('hip' + side, hq), ('an' + side, aq)):
                q = quat(m)
                if nm in lastq and sum(a * b for a, b in zip(q, lastq[nm])) < 0:
                    q = [-v for v in q]
                lastq[nm] = q
                skel['leg'] += q
                if nm.startswith('hip'):
                    skel['leg'].append(knee)
            skel['leg'] += [toe_a, lerp_key(i / N, lambda k, g='leg' + side: [k.get(g, {}).get('w', 0)])[0]]
        # (anim-skeleton S4) the leg deltas (keys lerped, as the live preview spreads them), key degrees -> rig radians
        dl = lerp_key(i / N, lambda k, g='leg' + side: [(k.get(g, {}).get('d') or {}).get(x, 0) for x in LEGD_FIELDS])
        skel.setdefault('legd', [])
        skel['legd'] += [sg * d2r(v) for sg, v in zip(LEGD_SIGN[side], dl)]
    # (anim-skeleton S3b) the frame proof (tests/animSkeletonBake.test.ts): at the key file's `checkFrames`, the evaluated
    # knee / ankle / toe (and a toe tip 6 cm along the toe) from the hip in the pelvis frame, and the shoulder carried by
    # the clavicle about the SC point in the chest frame (Wren's metres; kept out of the clip module)
    if i in clip.get('checkFrames', []):
        pinv = W['pelvis'].inverted()
        c = {'frame': i}
        for side, s in (('L', -1), ('R', 1)):
            hip, kn, an, toe = 'hip' + side, 'kn' + side, 'an' + side, 'toe' + side
            rel = [pinv @ (X[j] - X[hip]) for j in (kn, an, toe)]
            tip = pinv @ (X[toe] + W[toe] @ Vector((0, 0, 0.06)) - X[hip])
            lever = P['sh' + side] - P['chest'] - sc_point(side)
            c['leg' + side] = {'kn': list(rel[0]), 'an': list(rel[1]), 'toe': list(rel[2]), 'toeTip': list(tip)}
            c['sh' + side] = list(clq[side] @ lever - lever)
            c['lever' + side] = list(lever)
        CHECK.append(c)
    loc = {
        'pelvis': W['pelvis'],
        'spine': W['pelvis'].inverted() @ W['spine'],
        'chest': W['spine'].inverted() @ W['chest'],
        'neck': W['chest'].inverted() @ W['neck'],
    }
    qs = []
    for n in ('pelvis', 'spine', 'chest', 'neck'):
        q = quat(loc[n])
        if n in lastq and sum(a * b for a, b in zip(q, lastq[n])) < 0:
            q = [-v for v in q]
        lastq[n] = q
        qs += q
    pel = (X['pelvis'] - P['pelvis']) / K
    arms = []
    cinv = W['chest'].inverted()
    for side in ('L', 'R'):
        for j in ('el', 'wr'):
            v = shq[side].inverted() @ cinv @ (X[j + side] - X['sh' + side]) / K
            arms += [v.x, v.y, v.z]
    wrists = []
    if HAS_WRIST:
        for side in ('L', 'R'):
            q = quat(W['el' + side].inverted() @ W['wr' + side])
            n = 'wr' + side
            if n in lastq and sum(a * b for a, b in zip(q, lastq[n])) < 0:
                q = [-v for v in q]
            lastq[n] = q
            wrists += q
    # (anim-run-half) the pelvis yaw (about the vertical; its pitch and roll left out) and each ankle from the pelvis,
    # kept for the track half-width after the loop (it needs the clip's mean yaw); the yaw is read off the pelvis's
    # lateral axis, not its forward axis, which goes vertical in face-down frames (the knife collapse flipped ~180 deg)
    pl = W['pelvis'] @ Vector((1, 0, 0))
    frames.append({
        'yaw': math.atan2(-pl.z, pl.x),
        'anRel': [X['anL'] - X['pelvis'], X['anR'] - X['pelvis']],
        'pel': [pel.x, pel.y, pel.z],
        'q': qs,
        'arm': arms,
        **({'wrist': wrists} if HAS_WRIST else {}),
        **({'fore': extra['fore']} if HAS_FORE else {}),
        **({'head': extra['head']} if HAS_HEAD else {}),
        **({'sh': extra['sh']} if HAS_SH else {}),
        **({'clav': skel['clav']} if HAS_CLAV else {}),
        **({'fing': skel['fing']} if HAS_FING else {}),
        **({'leg': skel['leg']} if HAS_LEGS else {}),
        **({'legd': skel['legd']} if HAS_LEGD else {}),
        'X': {n: list(X[n]) for n in ORDER},
    })

# (anim-run-half) each ankle's lateral offset with only the stride-locked pelvis yaw removed (the frame's yaw minus the
# clip's mean yaw, a circular mean): the game's planner places the feet in the facing frame and the swing of the pelvis
# yaw does not move them, so a yawed pelvis (the run's +-25.5 deg, mirrored with the stride) must not leak the fore / aft
# stride into the track half-width (it did with the world x: the run's half baked -0.02); a constant stance yaw (the
# ready stance's ~6 deg) is not removed, so such a clip keeps its world-x half
mean_yaw = math.atan2(sum(math.sin(f['yaw']) for f in frames), sum(math.cos(f['yaw']) for f in frames))
for f in frames:
    unyaw = ry(-(f.pop('yaw') - mean_yaw))
    # each sample's 'ankle' is now pelvis-relative and un-yawed (was world x / K); only 'half' below reads it
    f['ankle'] = [(unyaw @ v).x / K for v in f.pop('anRel')]

half = sum((f['ankle'][1] - f['ankle'][0]) / 2 for f in frames) / N
out = {
    'name': clip['name'],
    'operator': op['id'],
    'height': H,
    'blender': bpy.app.version_string,
    'frames': N,
    'duty': clip['duty'],
    'liftH': clip['liftH'],
    'kneeOut': clip.get('kneeOut', 0.12),
    'half': half,
    'samples': [{k: v for k, v in f.items() if k != 'X'} for f in frames],
    **({'check': CHECK} if CHECK else {}),
}
with open(args.out, 'w', encoding='utf-8') as fh:
    json.dump(out, fh)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.wm.save_as_mainfile(filepath=args.blend, compress=True)
print(f"anim-keys: {clip['name']} {len(keys)} keys -> {N} samples, track half-width {half:.3f} m (1.75 m) -> {args.out}")

# --- preview strips (optional): capsules skinned to the bones, 8 phases side and front
if args.preview:
    import bmesh
    radius = {'pelvis': 0.13, 'spine': 0.12, 'chest': 0.13, 'neck': 0.05, 'head': 0.09, 'sh': 0.045, 'el': 0.037,
              'wr': 0.03, 'hip': 0.07, 'kn': 0.05, 'an': 0.04}
    segs = [('pelvis', 'spine'), ('spine', 'chest'), ('chest', 'neck'), ('neck', 'head')]
    for s in ('L', 'R'):
        segs += [('sh' + s, 'el' + s), ('el' + s, 'wr' + s), ('wr' + s, 'hand' + s), ('hip' + s, 'kn' + s), ('kn' + s, 'an' + s), ('an' + s, 'toe' + s)]
    segs += [('hipL', 'hipR'), ('shL', 'shR')]
    for a, b in segs:
        key = next((p for p in sorted(radius, key=len, reverse=True) if a.startswith(p)), 'el')
        r = radius[key]
        pa, pb_ = Vector(common.game_to_blender(P[a])), Vector(common.game_to_blender(P[b]))
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=r, radius2=r * 0.85, depth=max(0.02, (pb_ - pa).length))
        me = bpy.data.meshes.new(f'cap-{a}')
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(f'cap-{a}-{b}', me)
        scene.collection.objects.link(ob)
        d = (pb_ - pa)
        ob.matrix_world = Matrix.Translation((pa + pb_) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bone = a if a not in ('hipL', 'shL') or b not in ('hipR', 'shR') else ('pelvis' if a == 'hipL' else 'chest')
        vg = ob.vertex_groups.new(name=bone)
        vg.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
        mod = ob.modifiers.new('arm', 'ARMATURE')
        mod.object = arm
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'SINGLE'
    scene.render.resolution_x, scene.render.resolution_y = 300, 420
    scene.render.film_transparent = False
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 2.2
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    os.makedirs(args.preview, exist_ok=True)
    views = {'side': ((-4, 0, 0.85), (math.pi / 2, 0, -math.pi / 2)), 'front': ((0, -4, 0.85), (math.pi / 2, 0, 0))}
    for view, (loc, rot) in views.items():
        cam.location = loc
        cam.rotation_euler = rot
        for i in range(8):
            fr = i * SPAN / 8
            scene.frame_set(int(fr), subframe=fr - int(fr))
            # stand the lowest sole on the floor (preview only: the game's feet come from the foot planner)
            W, X = evaluated()
            low = min(min(X['an' + s].y - P['an' + s].y, X['toe' + s].y) for s in ('L', 'R'))
            arm.location = (0, 0, -low)
            bpy.context.view_layer.update()
            scene.render.filepath = os.path.join(args.preview, f"{clip['name']}-{view}-{i}.png")
            bpy.ops.render.render(write_still=True)
        arm.location = (0, 0, 0)
    print(f"anim-keys: preview -> {args.preview}")
