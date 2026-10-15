"""Pipeline stage 1: the CC0 MakeHuman base body shaped to an operator, rigged on the game's joints and skinned.

1. MakeHuman macro sliders give a plausible young adult of the operator's sex and build (mh.py).
2. The body is moved onto the game skeleton by linear blend skinning: every game bone maps the matching MakeHuman
   segment onto its own (rotation, length, and for the torso and head a breadth / depth scale). The torso and head
   scales are solved so the waist, hips, chest depth and head match the exported proportions (SPEC 4.3 A4-A6, 4.4).
3. Bind pose (mesh): the game skeleton's bone lengths and joint offsets in MakeHuman's A-pose directions (arms about
   42 degrees out, a slight elbow bend, legs a few degrees apart). The game rig's rest pose has the arms hanging
   straight through the hips, which no body mesh can occupy; see DECISIONS S3. The armature's bones are the game
   joints exactly; glTF export writes the inverse bind matrices of this A-pose.
4. Skin: the CC0 default rig weights summed onto the game bones, 4 influences. The hero level adds visual-only finger
   bones (3 per finger, under the hand) and one bone per toe (under toeL / toeR); the in-game levels fold those into
   the hand and toe bones.

Writes build/operators/<id>/<id>-body.blend (armature + skinned body, bind pose) and <id>-body.json (report).
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402
import mh  # noqa: E402

args = common.parse_args({
    '--joints': {'required': True},
    '--operator': {'required': True},
    '--mpfb': {'required': True},
    '--out': {'required': True},
})
common.check_version()
common.empty_scene()
common.seed_everything(args.seed)

op = common.load_operator(args.joints, args.operator)
P = op['proportions']
H = op['height']
GJ = {j['name']: np.array(j['pos'], dtype=np.float64) for j in op['joints']}
PARENT = {j['name']: j['parent'] for j in op['joints']}

# MakeHuman sliders per operator: sex, then muscle / weight for the build (SPEC 4.4: Wren compact and fit, Moth lean
# and ropey). Height and torso dimensions are set exactly afterwards, so these only choose the body's character.
SLIDERS = {
    'wren': dict(gender=0.0, muscle=0.62, weight=0.42, proportions=0.8),
    'moth': dict(gender=1.0, muscle=0.6, weight=0.28, proportions=0.8),
}
s = SLIDERS[op['id']]
body = mh.BaseBody(args.mpfb)
co_mh = body.macro(s['gender'], s['muscle'], s['weight'], proportions=s['proportions'])
body_idx = body.group_indices('body')
floor_y = co_mh[body_idx, 1].min()
mh_stature = (co_mh[body_idx, 1].max() - floor_y) / 10.0
K = H / mh_stature  # uniform scale: MakeHuman stature -> operator height


def to_game(p):
    """MakeHuman (dm, +Y up, faces +Z, left on +X) -> game (m, +Y up, faces +Z, right on +X), scaled to height."""
    p = np.asarray(p, dtype=np.float64)
    out = np.empty_like(p)
    out[..., 0] = -p[..., 0] * 0.1 * K
    out[..., 1] = (p[..., 1] - floor_y) * 0.1 * K
    out[..., 2] = p[..., 2] * 0.1 * K
    return out


V0 = to_game(co_mh)  # every base-mesh vertex (helpers included: the targets and weights index them all)


def mj(name):
    return to_game(body.joint(co_mh, name))


# --- Source points on the MakeHuman body for each game joint --------------------------------------------------------
head_top = V0[body_idx, 1].max()
src = {}
for side, s_mh in (('L', 'l'), ('R', 'r')):
    src[f'sh{side}'] = mj(f'joint-{s_mh}-shoulder')
    src[f'el{side}'] = mj(f'joint-{s_mh}-elbow')
    src[f'wr{side}'] = mj(f'joint-{s_mh}-hand')
    src[f'hand{side}'] = mj(f'joint-{s_mh}-finger-3-4')
    src[f'hip{side}'] = mj(f'joint-{s_mh}-upper-leg')
    src[f'kn{side}'] = mj(f'joint-{s_mh}-knee')
    src[f'an{side}'] = mj(f'joint-{s_mh}-ankle')
    src[f'toe{side}'] = mj(f'joint-{s_mh}-foot-1')
hip_mid = (src['hipL'] + src['hipR']) / 2.0
# The game hangs each hip joint 0.03 x height/1.75 below the pelvis joint; the neck joint is the neck base and the
# head joint sits half a head height below the top of the head (proportions.ts conventions).
src['pelvis'] = hip_mid + np.array([0.0, GJ['pelvis'][1] - GJ['hipL'][1], 0.0])
src['neck'] = mj('joint-neck')
head_c_y = head_top - P['head']['h'] / 2.0
near = body_idx[np.abs(V0[body_idx, 1] - head_c_y) < 0.01]
near = near[np.abs(V0[near, 0]) < 0.12]
src['head'] = np.array([0.0, head_c_y, (V0[near, 2].max() + V0[near, 2].min()) / 2.0])
for name in ('spine', 'chest'):
    f = (GJ[name][1] - GJ['pelvis'][1]) / (GJ['neck'][1] - GJ['pelvis'][1])
    src[name] = src['pelvis'] + (src['neck'] - src['pelvis']) * f

# --- Target joints: the game skeleton's lengths, MakeHuman's A-pose directions for the limbs ------------------------
tgt = {k: v.copy() for k, v in GJ.items()}
LIMB_CHAINS = [['shL', 'elL', 'wrL', 'handL'], ['shR', 'elR', 'wrR', 'handR'],
               ['hipL', 'knL', 'anL', 'toeL'], ['hipR', 'knR', 'anR', 'toeR']]
for chain in LIMB_CHAINS:
    for a, b in zip(chain, chain[1:]):
        length = np.linalg.norm(GJ[b] - GJ[a])
        d = src[b] - src[a]
        tgt[b] = tgt[a] + d / np.linalg.norm(d) * length
pose_angles = {}
for side in ('L', 'R'):
    ua = tgt[f'el{side}'] - tgt[f'sh{side}']
    pose_angles[f'upperArm{side}'] = math.degrees(math.acos(-ua[1] / np.linalg.norm(ua)))
    fa = tgt[f'wr{side}'] - tgt[f'el{side}']
    pose_angles[f'elbowBend{side}'] = math.degrees(math.acos(np.dot(ua, fa) / np.linalg.norm(ua) / np.linalg.norm(fa)))
    th = tgt[f'kn{side}'] - tgt[f'hip{side}']
    pose_angles[f'thigh{side}'] = math.degrees(math.acos(-th[1] / np.linalg.norm(th)))
# The feet must stand on the floor: lift or drop the whole leg so the ball of the foot sits at y = 0 like the game's.
# (The leg directions spread the ankle slightly higher than the game's straight leg.)

# --- MakeHuman bones -> game bones ----------------------------------------------------------------------------------
GAME_BONES = ['pelvis', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR',
              'hipL', 'knL', 'anL', 'toeL', 'hipR', 'knR', 'anR', 'toeR']
CHILD = {'pelvis': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head', 'shL': 'elL', 'elL': 'wrL',
         'wrL': 'handL', 'shR': 'elR', 'elR': 'wrR', 'wrR': 'handR', 'hipL': 'knL', 'knL': 'anL', 'anL': 'toeL',
         'hipR': 'knR', 'knR': 'anR', 'anR': 'toeR'}


def game_bone_of(mh_bone):
    n = mh_bone
    side = 'L' if n.endswith('.L') else 'R' if n.endswith('.R') else ''
    base = n[:-2] if side else n
    if base in ('spine05', 'spine04', 'pelvis', 'root'):
        return 'pelvis'
    if base == 'spine03':
        return 'spine'
    if base in ('spine02', 'spine01', 'clavicle', 'breast'):
        return 'chest'
    if base.startswith('neck'):
        return 'neck'
    if base in ('shoulder01', 'upperarm01', 'upperarm02'):
        return f'sh{side}'
    if base.startswith('lowerarm'):
        return f'el{side}'
    if base in ('wrist',) or base.startswith('metacarpal'):
        return f'wr{side}'
    if base.startswith('finger'):
        return f'finger{side}_{base[6:].replace("-", "_")}'  # hero bone, e.g. fingerL_3_2
    if base.startswith('upperleg'):
        return f'hip{side}'
    if base.startswith('lowerleg'):
        return f'kn{side}'
    if base == 'foot':
        return f'an{side}'
    if base.startswith('toe'):
        return f'toes{side}_{base[3]}'  # hero bone per toe, e.g. toesL_1
    return 'head'  # head, jaw, eyes, tongue and the facial bones


def fold(bone):
    """Hero-only bones fold into the game bone that carries them."""
    if bone.startswith('finger'):
        return 'wr' + bone[6]
    if bone.startswith('toes'):
        return 'toe' + bone[4]
    return bone


mh_w = body.weights('default')
nv = len(V0)
hero_names = sorted({game_bone_of(b) for b in mh_w})
hero_index = {n: i for i, n in enumerate(hero_names)}
W_hero = np.zeros((nv, len(hero_names)))
for b, pairs in mh_w.items():
    gi = hero_index[game_bone_of(b)]
    for v, w in pairs:
        W_hero[v, gi] += w
W_game = np.zeros((nv, len(GAME_BONES)))
gidx = {n: i for i, n in enumerate(GAME_BONES)}
for n, i in hero_index.items():
    W_game[:, gidx[fold(n)]] += W_hero[:, i]
tot = W_game.sum(axis=1, keepdims=True)
unweighted = int((tot[body_idx, 0] < 1e-6).sum())
W_game = np.divide(W_game, tot, out=np.zeros_like(W_game), where=tot > 1e-9)


# --- Per-bone affine maps (source segment -> target segment) --------------------------------------------------------
def rot_between(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1.0 / (1.0 + c))


TORSO = ('pelvis', 'spine', 'chest', 'neck', 'head')
scale = {b: np.array([1.0, 1.0]) for b in TORSO}  # (breadth x, depth z); only the head's is solved


def bone_maps():
    M = {}
    for b in GAME_BONES:
        c = CHILD.get(b)
        s0, t0 = src[b], tgt[b]
        if b in TORSO:
            if b == 'head':
                ky = 1.0
            else:
                ky = (tgt[c][1] - t0[1]) / (src[c][1] - s0[1])
            S = np.diag([scale[b][0], ky, scale[b][1]])
            M[b] = (S, t0 - S @ s0)
            continue
        if c is None:  # toe: follow its parent foot
            continue
        d_src = src[c] - s0
        d_tgt = tgt[c] - t0
        R = rot_between(d_src, d_tgt)
        u = d_src / np.linalg.norm(d_src)
        k = np.linalg.norm(d_tgt) / np.linalg.norm(d_src)
        A = R @ (np.eye(3) + (k - 1.0) * np.outer(u, u))
        M[b] = (A, t0 - A @ s0)
    for side in ('L', 'R'):
        M[f'toe{side}'] = M[f'an{side}']
    return M


def skin(M):
    out = np.zeros_like(V0)
    for b, (A, t) in M.items():
        w = W_game[:, gidx[b]]
        m = w > 0
        out[m] += w[m, None] * (V0[m] @ A.T + t)
    return out


def measure(V):
    B = V[body_idx]

    def band(y, h=0.006, xmax=0.3):
        sel = B[(np.abs(B[:, 1] - y) < h) & (np.abs(B[:, 0]) < xmax)]
        return sel

    y = P['y']
    waist = band(y['waist'])
    chest = band(y['chest'], xmax=0.2)
    hips = np.concatenate([band(yy) for yy in np.linspace(y['hip'] - 0.09, y['hip'] + 0.01, 11)])
    headband = band(GJ['head'][1], h=0.01, xmax=0.15)
    return {
        'waistW': float(np.ptp(waist[:, 0])), 'waistD': float(np.ptp(waist[:, 2])),
        'hipW': float(np.ptp(hips[:, 0])), 'hipD': float(np.ptp(hips[:, 2])),
        'chestD': float(np.ptp(chest[:, 2])),
        'headW': float(np.ptp(headband[:, 0])), 'headD': float(np.ptp(headband[:, 2])),
        'stature': float(B[:, 1].max() - B[:, 1].min()),
    }


# Art direction 2 (DECISIONS D13): lean, trained bodies with a narrow waist, about 7% slimmer than SPEC A4's
# survey-based waist. Visual only: hit volumes still come from proportions (they follow the body within ~1 cm).
LEAN_WAIST = 0.93
target = {
    'waistW': P['waist']['w'] * LEAN_WAIST, 'waistD': P['waist']['d'] * LEAN_WAIST,
    'hipW': P['pelvis']['w'], 'hipD': P['pelvis']['d'],
    'chestD': P['chest']['d'],
    'headW': P['head']['w'], 'headD': P['head']['d'],
}
def skin_on_floor(M):
    V = skin(M)
    lift = -V[body_idx, 1].min()  # the leg directions move the soles a few mm; stand them on y = 0
    V[:, 1] += lift
    return V, lift


# Torso breadth and depth: a smooth height field (not per-bone scales, which bulge where weights blend). Control
# heights from the crotch to the shoulders; the field is 1 at both ends and leaves the arms, neck and head alone.
y = P['y']
CTRL_Y = np.array([y['hip'] - 0.15, y['hip'] - 0.04, y['waist'], y['chest'], y['shoulder'] + 0.02])
field = np.ones((len(CTRL_Y), 2))  # (x, z) scale per control height
not_torso = sum(W_game[:, gidx[b]] for b in ('neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR'))
torso_w = np.clip(1.0 - not_torso, 0.0, 1.0)


def interp(yv, vals):
    """C1 cosine interpolation between control heights, clamped at the ends."""
    out = np.empty(len(yv))
    i = np.clip(np.searchsorted(CTRL_Y, yv) - 1, 0, len(CTRL_Y) - 2)
    t = np.clip((yv - CTRL_Y[i]) / (CTRL_Y[i + 1] - CTRL_Y[i]), 0.0, 1.0)
    t = (1.0 - np.cos(t * math.pi)) / 2.0
    out[:] = vals[i] * (1.0 - t) + vals[i + 1] * t
    return out


def apply_field(V):
    B = V[body_idx]
    cz = []
    for cy in CTRL_Y:
        sl = B[(np.abs(B[:, 1] - cy) < 0.006) & (np.abs(B[:, 0]) < 0.2)]
        cz.append((sl[:, 2].max() + sl[:, 2].min()) / 2.0)
    cz = np.array(cz)
    yv = V[:, 1]
    sx = 1.0 + (interp(yv, field[:, 0]) - 1.0) * torso_w
    sz = 1.0 + (interp(yv, field[:, 1]) - 1.0) * torso_w
    czv = interp(yv, cz)
    out = V.copy()
    out[:, 0] *= sx
    out[:, 2] = czv + (V[:, 2] - czv) * sz
    return out


M = None
for it in range(12):
    M = bone_maps()
    V_skin, lift = skin_on_floor(M)
    V = apply_field(V_skin)
    m = measure(V)
    field[1] *= [target['hipW'] / m['hipW'], target['hipD'] / m['hipD']]
    field[2] *= [target['waistW'] / m['waistW'], target['waistD'] / m['waistD']]
    field[3, 1] *= target['chestD'] / m['chestD']
    scale['head'] *= np.array([target['headW'] / m['headW'], target['headD'] / m['headD']])
M = bone_maps()
V_skin, lift = skin_on_floor(M)
V = apply_field(V_skin)
for k in tgt:
    if k != 'root':
        tgt[k] = tgt[k] + np.array([0.0, lift, 0.0])
m = measure(V)
errors = {k: m[k] - target[k] for k in target}
worst = max(abs(e) for e in errors.values())
if worst > 0.01:
    raise SystemExit(f"{op['id']}: body dimensions off by {worst:.4f} m: {errors}")

# Hero bones: MakeHuman finger and toe joints carried by their game bone's map.
hero_bones = {}
for side, s_mh in (('L', 'l'), ('R', 'r')):
    A, t = M[f'wr{side}']
    for f in range(1, 6):
        for seg in range(1, 4):
            h = A @ mj(f'joint-{s_mh}-finger-{f}-{seg}') + t
            tl = A @ mj(f'joint-{s_mh}-finger-{f}-{seg + 1}') + t
            hero_bones[f'finger{side}_{f}_{seg}'] = (h, tl, f'wr{side}' if seg == 1 else f'finger{side}_{f}_{seg - 1}')
    A, t = M[f'toe{side}']
    for f in range(1, 6):
        h = A @ mj(f'joint-{s_mh}-toe-{f}-1') + t
        last = 3 if f == 1 else 4
        tl = A @ mj(f'joint-{s_mh}-toe-{f}-{last}') + t
        hero_bones[f'toes{side}_{f}'] = (h + [0, lift, 0], tl + [0, lift, 0], f'toe{side}')
    for k in list(hero_bones):
        if k.startswith('finger' + side):
            h, tl, par = hero_bones[k]
            hero_bones[k] = (h + [0, lift, 0], tl + [0, lift, 0], par)

# --- Blender: armature and skinned mesh -----------------------------------------------------------------------------
G2B = common.game_to_blender
arm_data = bpy.data.armatures.new(f"{op['id']}-rig")
arm = bpy.data.objects.new(f"{op['id']}-rig", arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
order = [j['name'] for j in op['joints']]
for name in order:
    head = Vector(G2B(tgt[name]))
    kids = [n for n in order if PARENT[n] == name]
    if kids:
        tail = Vector(G2B(tgt[kids[0]]))
    elif PARENT[name]:
        d = head - Vector(G2B(tgt[PARENT[name]]))
        tail = head + (d.normalized() * 0.04 if d.length > 1e-6 else Vector((0, 0, 0.04)))
    else:
        tail = head + Vector((0, 0, 0.04))
    if (tail - head).length < 1e-4:
        tail = head + Vector((0, 0, 0.02))
    eb = arm_data.edit_bones.new(name)
    eb.head, eb.tail = head, tail
    if PARENT[name]:
        eb.parent = arm_data.edit_bones[PARENT[name]]
for name, (h, tl, par) in hero_bones.items():
    eb = arm_data.edit_bones.new(name)
    eb.head, eb.tail = Vector(G2B(h)), Vector(G2B(tl))
    if (eb.tail - eb.head).length < 1e-4:
        eb.tail = eb.head + Vector((0, 0, 0.01))
    eb.parent = arm_data.edit_bones[par]
bpy.ops.object.mode_set(mode='OBJECT')
for b in arm_data.bones:
    b['hero_only'] = b.name in hero_bones

# The body mesh: MakeHuman's 'body' faces only (no helpers, joint cubes, eyes or teeth).
keep_faces = [f for f, g in zip(body.faces, body.face_group) if g == 'body']
used = sorted({v for f in keep_faces for v in f})
remap = {v: i for i, v in enumerate(used)}
me = bpy.data.meshes.new(f"{op['id']}-body")
me.from_pydata([G2B(V[v]) for v in used], [], [[remap[v] for v in f] for f in keep_faces])
me.validate()
for p in me.polygons:
    p.use_smooth = True
obj = bpy.data.objects.new(f"{op['id']}-body", me)
bpy.context.scene.collection.objects.link(obj)

# Hero skin: top 4 influences of the hero bone set, normalised.
used_arr = np.array(used)
Wh = W_hero[used_arr]
inf_counts = []
groups = {n: obj.vertex_groups.new(name=n) for n in hero_names}
for i in range(len(used)):
    row = Wh[i]
    top = np.argsort(row)[::-1][:4]
    top = [j for j in top if row[j] > 1e-4]
    ssum = sum(row[j] for j in top)
    inf_counts.append(len(top))
    for j in top:
        groups[hero_names[j]].add([i], float(row[j] / ssum), 'REPLACE')
mod = obj.modifiers.new('rig', 'ARMATURE')
mod.object = arm
obj.parent = arm

# Deformation check: bend every elbow and knee 60 degrees; no vertex may move more than a forearm away or go NaN.
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
for n in ('elL', 'elR', 'knL', 'knR'):
    arm.pose.bones[n].rotation_mode = 'XYZ'
    arm.pose.bones[n].rotation_euler = (math.radians(60), 0, 0)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
ev = obj.evaluated_get(dg).to_mesh()
posed = np.array([v.co[:] for v in ev.vertices])
obj.evaluated_get(dg).to_mesh_clear()
for n in ('elL', 'elR', 'knL', 'knR'):
    arm.pose.bones[n].rotation_euler = (0, 0, 0)
bpy.ops.object.mode_set(mode='OBJECT')
rest = np.array([v.co[:] for v in me.vertices])
moved = float(np.nanmax(np.linalg.norm(posed - rest, axis=1)))
if not np.isfinite(posed).all() or moved > 0.8:
    raise SystemExit(f"{op['id']}: skin deformation check failed (max move {moved:.3f} m)")

os.makedirs(args.out, exist_ok=True)
blend = os.path.join(args.out, f"{op['id']}-body.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
report = {
    'operator': op['id'], 'height': H, 'seed': args.seed, 'blender': bpy.app.version_string,
    'source': 'MakeHuman hm08 base mesh and targets, MPFB2 CC0 data (docs/art-credits.md)',
    'sliders': s, 'leanWaist': LEAN_WAIST, 'mhStatureAtSliders': mh_stature, 'uniformScale': K,
    'measured': m, 'target': target, 'errors': errors,
    'torsoField': {'heights': CTRL_Y.tolist(), 'scaleXZ': field.tolist()}, 'headScale': scale['head'].tolist(),
    'bindPose': {k: round(v, 1) for k, v in pose_angles.items()},
    'vertices': len(me.vertices), 'faces': len(me.polygons),
    'gameBones': len(GAME_BONES), 'heroBones': len(hero_bones),
    'maxInfluences': max(inf_counts), 'unweightedBodyVerts': unweighted,
    'deformCheckMaxMove': moved, 'floorLift': lift,
    'bindJoints': {k: [round(x, 5) for x in v.tolist()] for k, v in tgt.items()},
}
with open(os.path.join(args.out, f"{op['id']}-body.json"), 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)
print(f"operators: {op['id']} body {len(me.vertices)} verts, stature {m['stature']:.3f} m, "
      f"dims worst {worst * 1000:.1f} mm, bind arms {pose_angles['upperArmL']:.0f} deg -> {blend}")
