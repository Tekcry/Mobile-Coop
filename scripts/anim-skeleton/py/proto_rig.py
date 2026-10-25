"""anim-skeleton P0 prototype (docs/archive/anim-skeleton/PLAN.md P0): a real clavicle (R2), per-finger joints (R1) and FK legs
per key (R3) on Wren's game LOD0, with the skin following, in one test clip `skeleton_test`, rendered as contact sheets.

Runs headless on a COPY of the anim-rig build (build/anim-skeleton/wren-lods.blend); never saves over it (--save writes
build/anim-skeleton/wren-proto.blend). Run through scripts/anim-skeleton/proto.mjs (it takes the heavy lock):

  node scripts/anim-skeleton/proto.mjs proto_rig [-- --no-render] [-- --save]

Steps:
  a. `clavL` / `clavR` on the game armature (`wren-rig-game`): parent chest, head at the sternoclavicular joint (medial,
     just below the neck base, a little forward of the chest bone), tail at the shoulder joint head; shL / shR reparented
     under them (edit-bone positions untouched, so every existing bone's rest matrix is unchanged; checked).
  b. 30 finger bones copied from the hero armature (`wren-rig`): same names, rest matrices, parents (under wrL / wrR).
  c. Weights on LOD0 (`wren-lod0`):
     - fingers: each LOD0 vertex weighted to wrX takes the finger share of its nearest hero hand vertices (k = 4,
       inverse-distance mean; hero share = finger weight / (wrist + finger weights) on that hand): wrX keeps
       w * (1 - share), each finger bone gets w * its share.
     - clavicles: the chest weight near each shoulder is split onto clavX by a smooth falloff:
         share = smoothstep(CLAV_X0, CLAV_X1, |x|) * smoothstep(CLAV_Z0, CLAV_Z1, z) * CLAV_MAX
       |x|: zero at the sternum / spine midline, full past the root of the neck; z: zero below the pec and the middle
       of the scapula, full over the top of the shoulder and the trapezius. The side is the sign of x (+x = Wren's left).
     Then max 4 influences (smallest dropped), renormalised.
  d. Rest check: every pose bone at identity, LOD0's evaluated vertices vs the same before the change: max error must be
     <= 1e-5 m (fails the script otherwise).
  e. `skeleton_test`, 48 frames at 24 fps, hand keyed (axes in the armature's rest frame; Wren faces -Y, her left +X):
     0-19 shrug both clavicles 20 deg, then the right shoulder pushed forward 25 deg; 12-40 fingers curl one at a time
     (index, middle, ring, little, thumb; MCP / PIP / DIP 70 / 85 / 55 deg, thumb 25 / 40 / 35 + 35 deg opposition),
     open and spread; 24-48 a left-leg FK kick (chamber: hip flex 60, knee 70, ankle plantarflex 20, toe up 20; extend:
     hip 70, knee 15), the right leg planted (untouched).
  f. Renders (Eevee, Workbench fallback), clay override, stamped labels; two WebP contact sheets in
     docs/archive/anim-skeleton/proto/.
  g. build/anim-skeleton/proto-report.json.
"""
import argparse
import json
import math
import os
import sys
import time

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree

T0 = time.time()
TIMES = {}


def stage(name):
    TIMES[name] = round(time.time() - T0, 1)
    print(f'proto_rig: [{TIMES[name]:7.1f} s] {name}', flush=True)


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--seed', type=int, default=1015)
ap.add_argument('--root', required=True)
ap.add_argument('--no-render', action='store_true')
ap.add_argument('--save', action='store_true')
ap.add_argument('--size', type=int, default=800, help='tile height in px')
args = ap.parse_args(argv)
if tuple(bpy.app.version) != (5, 2, 2):
    raise SystemExit(f'Blender {bpy.app.version_string} refused: pinned to 5.2.2')

ROOT = args.root
BUILD = os.path.join(ROOT, 'build', 'anim-skeleton')
TILES = os.path.join(BUILD, 'tiles')
DOCS = os.path.join(ROOT, 'docs', 'archive', 'anim-skeleton', 'proto')
os.makedirs(TILES, exist_ok=True)
os.makedirs(DOCS, exist_ok=True)

scene = bpy.context.scene
HERO_RIG = bpy.data.objects['wren-rig']
HERO = bpy.data.objects['wren-hero']
ARM = bpy.data.objects['wren-rig-game']
LOD0 = bpy.data.objects['wren-lod0']
assert HERO_RIG.matrix_world == Matrix.Identity(4) and ARM.matrix_world == Matrix.Identity(4)
SIDES = 'LR'
FINGERS = [b.name for b in HERO_RIG.data.bones if b.name.startswith('finger')]
assert len(FINGERS) == 30, FINGERS


def set_rest_pose(arm):
    if arm.animation_data:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
        pb.scale = Vector((1, 1, 1))
    bpy.context.view_layer.update()


def evaluated_coords(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    co = np.empty(len(me.vertices) * 3, np.float64)
    me.vertices.foreach_get('co', co)
    ev.to_mesh_clear()
    return co.reshape(-1, 3)


def mesh_coords_world(obj):
    co = np.empty(len(obj.data.vertices) * 3, np.float64)
    obj.data.vertices.foreach_get('co', co)
    m = np.array(obj.matrix_world)
    return co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- before: rest snapshot and an untouched copy of LOD0
set_rest_pose(ARM)
set_rest_pose(HERO_RIG)
REST_BEFORE = evaluated_coords(LOD0)
BONES_BEFORE = {b.name: b.matrix_local.copy() for b in ARM.data.bones}
ORIG = bpy.data.objects.new('wren-lod0-orig', LOD0.data.copy())
scene.collection.objects.link(ORIG)
ORIG.matrix_world = LOD0.matrix_world.copy()
stage('loaded, rest snapshot')

# ---------------------------------------------------------------- a + b: clavicles and finger bones (edit mode)
HB = {n: (HERO_RIG.data.bones[n].head_local.copy(), HERO_RIG.data.bones[n].tail_local.copy(),
          HERO_RIG.data.bones[n].matrix_local.copy(), HERO_RIG.data.bones[n].parent.name,
          HERO_RIG.data.bones[n].use_connect) for n in FINGERS}
GB = ARM.data.bones
chest_x = GB['chest']
# the sternoclavicular joint: 3 cm off the midline, 3.5 cm under the neck base, 4 cm forward of the chest bone (-Y)
SC = {s: Vector((sx * 0.03, -0.04, GB['neck'].head_local.z - 0.035)) for s, sx in (('L', 1), ('R', -1))}
for o in bpy.context.selected_objects:
    o.select_set(False)
bpy.context.view_layer.objects.active = ARM
ARM.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = ARM.data.edit_bones
for s in SIDES:
    sh = eb[f'sh{s}']
    c = eb.new(f'clav{s}')
    c.head = SC[s]
    c.tail = sh.head.copy()
    c.roll = 0.0
    c.parent = eb['chest']
    c.use_connect = False
    c.use_deform = True
    sh.use_connect = False
    sh.parent = c
for n in FINGERS:
    h, t, m, parent, conn = HB[n]
    b = eb.new(n)
    b.head = h
    b.tail = t
    b.matrix = m
    b.use_deform = True
for n in FINGERS:
    b = eb[n]
    b.parent = eb[HB[n][3]]
    b.use_connect = HB[n][4]
bpy.ops.object.mode_set(mode='OBJECT')
set_rest_pose(ARM)
bone_err = max(max(abs(a - b) for ra, rb in zip(BONES_BEFORE[n], GB[n].matrix_local) for a, b in zip(ra, rb)) for n in BONES_BEFORE)
fing_err = max(max(abs(a - b) for ra, rb in zip(HB[n][2], GB[n].matrix_local) for a, b in zip(ra, rb)) for n in FINGERS)
print(f'proto_rig: bones {len(BONES_BEFORE)} -> {len(GB)}; existing rest matrices max change {bone_err:.2e}; '
      f'finger rest vs hero {fing_err:.2e}; shL parent {GB["shL"].parent.name}')
assert bone_err < 1e-6 and fing_err < 1e-5
stage('bones added')

# ---------------------------------------------------------------- c: weights
groups = [g.name for g in LOD0.vertex_groups]
for n in [f'clav{s}' for s in SIDES] + FINGERS:
    if n not in groups:
        LOD0.vertex_groups.new(name=n)
groups = [g.name for g in LOD0.vertex_groups]
gidx = {n: i for i, n in enumerate(groups)}
NV = len(LOD0.data.vertices)
W = np.zeros((NV, len(groups)))
for v in LOD0.data.vertices:
    for g in v.groups:
        W[v.index, g.group] = g.weight
W_OLD = W.copy()
infl_before = int((W > 0).sum(1).max())
P = mesh_coords_world(LOD0)

# fingers from the hero by nearest vertex
hg = [g.name for g in HERO.vertex_groups]
HP = mesh_coords_world(HERO)
fing_of = {s: [n for n in FINGERS if n.startswith(f'finger{s}_')] for s in SIDES}
HW = {s: np.zeros((len(HP), 1 + len(fing_of[s]))) for s in SIDES}   # column 0: wrist, then fingers
col = {}
for s in SIDES:
    col[f'wr{s}'] = (s, 0)
    for j, n in enumerate(fing_of[s]):
        col[n] = (s, j + 1)
for v in HERO.data.vertices:
    for g in v.groups:
        c = col.get(hg[g.group])
        if c:
            HW[c[0]][v.index, c[1]] += g.weight
FINGER_REPORT = {}
for s in SIDES:
    tot = HW[s].sum(1)
    hand = np.nonzero(tot > 0.01)[0]
    share = HW[s][hand, 1:] / tot[hand, None]
    kd = KDTree(len(hand))
    for i, vi in enumerate(hand):
        kd.insert(HP[vi], i)
    kd.balance()
    wc = gidx[f'wr{s}']
    sel = np.nonzero(W[:, wc] > 0)[0]
    far = 0
    moved = 0
    for vi in sel:
        hits = kd.find_n(Vector(P[vi]), 4)
        if not hits or hits[0][2] > 0.02:
            far += 1
            continue
        ww = np.array([1.0 / max(h[2], 1e-4) for h in hits])
        f = (share[[h[1] for h in hits]] * ww[:, None]).sum(0) / ww.sum()
        if f.sum() < 1e-4:
            continue
        w = W[vi, wc]
        W[vi, wc] = w * (1 - f.sum())
        for j, n in enumerate(fing_of[s]):
            W[vi, gidx[n]] += w * f[j]
        moved += 1
    FINGER_REPORT[s] = {'wristVerts': int(len(sel)), 'fingerWeighted': moved, 'farFromHero': far}
print('proto_rig: finger weights', FINGER_REPORT)

# clavicles split from the chest (A3). Tuned by eye for the prototype: see the module docstring.
CLAV_X0, CLAV_X1 = 0.035, 0.13     # m from the midline: zero at the sternum / spine, full past the root of the neck
CLAV_Z0, CLAV_Z1 = 1.22, 1.35      # m: zero at the pec / mid scapula, full at the shoulder joint height and above
CLAV_MAX = 0.95                    # the chest keeps a little everywhere, so the trapezius blends into the neck
cc = gidx['chest']
side_share = smoothstep(CLAV_X0, CLAV_X1, np.abs(P[:, 0])) * smoothstep(CLAV_Z0, CLAV_Z1, P[:, 2]) * CLAV_MAX
CLAV_REPORT = {}
for s, sign in (('L', 1), ('R', -1)):
    on = (np.sign(P[:, 0]) == sign) & (W[:, cc] > 0) & (side_share > 1e-4)
    k = gidx[f'clav{s}']
    W[on, k] += W[on, cc] * side_share[on]
    W[on, cc] *= 1 - side_share[on]
    CLAV_REPORT[s] = int(on.sum())
print('proto_rig: clavicle-weighted verts', CLAV_REPORT)

# max 4 influences, renormalised
order = np.argsort(-W, axis=1)
keep = np.zeros_like(W, bool)
np.put_along_axis(keep, order[:, :4], True, axis=1)
pruned = int(((W > 0) & ~keep).sum())
W = np.where(keep, W, 0.0)
W[W < 1e-4] = 0.0
s_ = W.sum(1, keepdims=True)
W = np.where(s_ > 0, W / np.maximum(s_, 1e-12), W)
for gi, g in enumerate(LOD0.vertex_groups):
    old = W_OLD[:, gi]
    new = W[:, gi]
    rm = np.nonzero((old > 0) & (new == 0))[0].tolist()
    if rm:
        g.remove(rm)
    for vi in np.nonzero(new > 0)[0]:
        if new[vi] != old[vi]:
            g.add([int(vi)], float(new[vi]), 'REPLACE')
infl_after = int((W > 0).sum(1).max())
per_bone = {n: int((W[:, gidx[n]] > 0).sum()) for n in [f'clav{s}' for s in SIDES] + FINGERS}
print(f'proto_rig: influences max {infl_before} -> {infl_after}, {pruned} small influences pruned')
stage('weights')

# ---------------------------------------------------------------- d: rest check
set_rest_pose(ARM)
REST_AFTER = evaluated_coords(LOD0)
rest_err = float(np.abs(REST_AFTER - REST_BEFORE).max())
print(f'proto_rig: REST CHECK max error {rest_err:.3e} m (limit 1e-5)')
if rest_err > 1e-5:
    raise SystemExit('rest check failed')
stage('rest check')

# ---------------------------------------------------------------- e: the test clip
MW3 = Matrix.Identity(3)


def head(n):
    return GB[n].head_local.copy()


def tail(n):
    return GB[n].tail_local.copy()


def hand_frame(s):
    """Palm normal, thumb, finger row and hand axes from the finger bases (grip_morphs.py's method)."""
    bases = {k: head(f'finger{s}_{k}_1') for k in range(1, 6)}
    # the wrist joint is wrX's head (wrX is the hand bone; handX is a 4 cm stub past the knuckles, so grip_morphs.py's
    # `hand{s}` head gives a reversed `along` here; the palm normal is fixed by the thumb either way)
    wrist = head(f'wr{s}')
    cen = sum((bases[k] for k in range(1, 6)), Vector()) / 5
    along = (cen - wrist).normalized()
    off = {k: ((bases[k] - wrist) - along * (bases[k] - wrist).dot(along)).length for k in bases}
    lateral = {k: (bases[k] - cen).length for k in bases}
    thumb = max(bases, key=lambda k: lateral[k] + off[k])
    others = [k for k in range(1, 6) if k != thumb]
    row = sorted(others, key=lambda k: (bases[k] - bases[thumb]).length)
    index, little = row[0], row[-1]
    across = (bases[little] - bases[index]).normalized()
    n = along.cross(across).normalized()
    if n.dot(bases[thumb] - (bases[index] + bases[little]) / 2) < 0:
        n = -n
    return {'n': n, 'thumb': thumb, 'index': index, 'little': little, 'order': row, 'along': along, 'across': across,
            'wrist': wrist}


FR = {s: hand_frame(s) for s in SIDES}
for s, f in FR.items():
    print('proto_rig: hand', s, 'thumb', f['thumb'], 'row index..little', f['order'])


def arm_rot(axis, deg):
    return Matrix.Rotation(math.radians(deg), 3, Vector(axis).normalized())


def to_local(name, R):
    """A rotation in the armature's rest frame -> the pose bone's local quaternion."""
    M = GB[name].matrix_local.to_3x3()
    return (M.inverted() @ R @ M).to_quaternion()


def bone_dir(name):
    return (tail(name) - head(name)).normalized()


# key tracks: bone -> [(frame, R_armature)]
KEYS = {}


def key(name, frame, R=None):
    KEYS.setdefault(name, []).append((frame, R if R is not None else Matrix.Identity(3)))


# R2 clavicles. Raising the lateral end: about -Y (left) / +Y (right); forward (-Y): about -Z (left) / +Z (right).
SHRUG, PUSH = 20, 25
for s, sx in (('L', 1), ('R', -1)):
    n = f'clav{s}'
    up = arm_rot((0, -sx, 0), SHRUG)
    key(n, 0)
    key(n, 4, up)
    key(n, 6, up)
    key(n, 10)
    if s == 'R':
        fwd = arm_rot((0, 0, -sx), PUSH)
        key(n, 13, fwd)
        key(n, 15, fwd)
    key(n, 19)

# R1 fingers. Curl about d x n (towards the palm), spread about the palm normal (fanned from the middle finger).
CURL = (70, 85, 55)
THUMB = (25, 40, 35)
THUMB_IN = 35
SPREAD = {0: -14, 1: -3, 2: 7, 3: 16}   # row position (index..little): deg towards the little-finger side


def finger_R(s, k, j, curl, spread=0.0, opp=0.0):
    name = f'finger{s}_{k}_{j}'
    d = bone_dir(name)
    f = FR[s]
    R = arm_rot(d.cross(f['n']), curl) if curl else Matrix.Identity(3)
    if spread:
        sgn = 1.0 if f['n'].cross(d).dot(f['across']) > 0 else -1.0
        R = arm_rot(f['n'], sgn * spread) @ R
    if opp:
        to_idx = head(f'finger{s}_{f["index"]}_1') - head(name)
        R = arm_rot(d.cross(to_idx), opp) @ R
    return R


for s in SIDES:
    f = FR[s]
    seq = list(f['order']) + [f['thumb']]
    for i, k in enumerate(seq):
        is_thumb = k == f['thumb']
        start = 12 + 2 * i
        pos = None if is_thumb else f['order'].index(k)
        for j in (1, 2, 3):
            n = f'finger{s}_{k}_{j}'
            curl = (THUMB if is_thumb else CURL)[j - 1]
            opp = THUMB_IN if (is_thumb and j == 1) else 0.0
            spread = SPREAD[pos] if (pos is not None and j == 1) else 0.0
            key(n, start)
            key(n, start + 4, finger_R(s, k, j, curl, opp=opp))
            key(n, 27, finger_R(s, k, j, curl, opp=opp))
            key(n, 32, finger_R(s, k, j, 0, spread=spread, opp=(12 if is_thumb and j == 1 else 0)))
            key(n, 36, finger_R(s, k, j, 0, spread=spread, opp=(12 if is_thumb and j == 1 else 0)))
            key(n, 40)

# R3 left-leg FK kick. Hip flex (thigh forward, -Y): about -X; knee flex: about +X; ankle plantarflex (toes down): +X;
# toe up: -X. Child rotations are in the rest frame, so each is relative to its parent.
LEG = {  # frame: (hip, knee, ankle, toe) degrees
    24: (0, 0, 0, 0),
    31: (60, 70, 20, 20),
    36: (70, 15, 20, 20),
    42: (50, 70, 10, 10),
    48: (0, 0, 0, 0),
}
for fr, (hp, kn, an, to) in LEG.items():
    key('hipL', fr, arm_rot((-1, 0, 0), hp))
    key('knL', fr, arm_rot((1, 0, 0), kn))
    key('anL', fr, arm_rot((1, 0, 0), an))
    key('toeL', fr, arm_rot((-1, 0, 0), to))

set_rest_pose(ARM)
ARM.animation_data_create()
act = bpy.data.actions.new('skeleton_test')
ARM.animation_data.action = act
for name, ks in KEYS.items():
    pb = ARM.pose.bones[name]
    pb.rotation_mode = 'QUATERNION'
    prev = None
    for fr, R in sorted(ks, key=lambda t: t[0]):
        q = to_local(name, R)
        if prev is not None and prev.dot(q) < 0:
            q.negate()
        prev = q
        pb.rotation_quaternion = q
        pb.keyframe_insert('rotation_quaternion', frame=fr, group=name)
scene.frame_start, scene.frame_end = 0, 48
scene.render.fps = 24
nkeys = sum(len(v) for v in KEYS.values())
print(f'proto_rig: clip skeleton_test: {len(KEYS)} bones keyed, {nkeys} keys, frames 0-48 at 24 fps')


def tip(name):
    scene.frame_set(scene.frame_current)
    pb = ARM.pose.bones[name]
    return ARM.matrix_world @ pb.tail


# sanity: the motions go the intended way
scene.frame_set(0)
r = {'shL': tip('clavL').copy(), 'toeL': tip('toeL').copy(), 'kn': tip('hipL').copy(), 'idx': tip(f'fingerR_{FR["R"]["index"]}_3').copy()}
scene.frame_set(5)
assert tip('clavL').z > r['shL'].z + 0.03, 'shrug should raise the shoulder'
scene.frame_set(14)
assert tip('clavR').y < head('shR').y - 0.03, 'the right shoulder should go forward (-Y)'
scene.frame_set(31)
assert tip('hipL').y < r['kn'].y - 0.2 and tip('hipL').z > r['kn'].z + 0.15, 'the knee should come up and forward'
scene.frame_set(25)
idx_d = tip(f'fingerR_{FR["R"]["index"]}_3') - r['idx']
print('proto_rig: index tip moved', round(idx_d.length, 3), 'm; along the palm normal', round(idx_d.dot(FR['R']['n']), 3),
      'along the hand', round(idx_d.dot(FR['R']['along']), 3))
if os.environ.get('PROTO_DEBUG'):
    for fr_ in (0, 25):
        scene.frame_set(fr_)
        for j in (1, 2, 3):
            nm = f'fingerR_{FR["R"]["index"]}_{j}'
            pb = ARM.pose.bones[nm]
            print('dbg', fr_, nm, [round(x, 3) for x in pb.head], [round(x, 3) for x in pb.tail], [round(x, 3) for x in pb.rotation_quaternion])
    print('dbg along', FR['R']['along'], 'n', FR['R']['n'], 'wrist', FR['R']['wrist'])
assert idx_d.length > 0.04 and idx_d.dot(FR['R']['along']) < 0, 'the index should curl back into the hand'
scene.frame_set(0)
stage('clip')

# ---------------------------------------------------------------- f: renders
RENDERS = []
engine_used = None
if not args.no_render:
    for o in bpy.data.objects:
        o.hide_render = o is not LOD0
    clay = bpy.data.materials.new('proto-clay')
    clay.use_nodes = True
    bsdf = clay.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.42, 0.42, 0.43, 1)
    bsdf.inputs['Roughness'].default_value = 0.55
    bpy.context.view_layer.material_override = clay
    wd = bpy.data.worlds.new('proto-world')
    wd.use_nodes = True
    wd.node_tree.nodes['Background'].inputs[0].default_value = (0.20, 0.21, 0.23, 1)
    wd.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    scene.world = wd

    def look_at(obj, target):
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

    sun = bpy.data.objects.new('proto-sun', bpy.data.lights.new('proto-sun', 'SUN'))
    sun.data.energy = 3.2
    sun.data.angle = math.radians(6)
    scene.collection.objects.link(sun)
    sun.location = (1.5, -2.5, 3.0)
    look_at(sun, (0, 0, 1.0))
    fill = bpy.data.objects.new('proto-fill', bpy.data.lights.new('proto-fill', 'SUN'))
    fill.data.energy = 0.8
    scene.collection.objects.link(fill)
    fill.location = (-2.0, -1.0, 1.0)
    look_at(fill, (0, 0, 1.0))
    back = bpy.data.objects.new('proto-back', bpy.data.lights.new('proto-back', 'SUN'))
    back.data.energy = 1.6
    scene.collection.objects.link(back)
    back.location = (-1.0, 2.5, 2.5)
    look_at(back, (0, 0, 1.0))

    def set_engine(name):
        scene.render.engine = name
        if name == 'BLENDER_EEVEE':
            ee = scene.eevee
            ee.taa_render_samples = 16
        if name == 'BLENDER_WORKBENCH':
            sh = scene.display.shading
            sh.light = 'STUDIO'
            sh.color_type = 'SINGLE'
            sh.single_color = (0.6, 0.6, 0.6)
            sh.show_shadows = True
            sh.show_cavity = True

    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'None'
    r_ = scene.render
    r_.film_transparent = False
    r_.image_settings.file_format = 'PNG'
    r_.image_settings.color_mode = 'RGB'
    r_.use_stamp = True
    for a in ('date', 'time', 'render_time', 'camera', 'lens', 'scene', 'filename', 'memory', 'hostname', 'marker',
              'frame_range', 'sequencer_strip', 'marker', 'frame'):
        if hasattr(r_, f'use_stamp_{a}'):
            setattr(r_, f'use_stamp_{a}', False)
    r_.use_stamp_note = True
    r_.stamp_font_size = 18
    r_.stamp_background = (0, 0, 0, 0.6)

    cams = {}

    def camera(name, loc, target, ortho=None, lens=50.0):
        cd = bpy.data.cameras.new(name)
        if ortho:
            cd.type = 'ORTHO'
            cd.ortho_scale = ortho
        else:
            cd.lens = lens
        cd.clip_start = 0.01
        cd.sensor_fit = 'VERTICAL'
        cd.sensor_height = 24
        ob = bpy.data.objects.new(name, cd)
        scene.collection.objects.link(ob)
        ob.location = loc
        look_at(ob, target)
        cams[name] = ob
        return ob

    H = args.size
    Wt = int(H * 0.75)
    camera('front', (0, -6, 0.92), (0, 0, 0.92), ortho=2.05)
    camera('threeq', (4.2, -4.2, 1.2), (0, 0, 0.92), ortho=2.05)
    hr = FR['R']
    hc = hr['wrist'] + hr['along'] * 0.08
    # the right palm faces the thigh at rest: palm-side views come from in front and below, between hand and body
    camera('hand_palm', hc + Vector((0.28, -0.45, -0.22)), hc, lens=40)
    camera('hand_back', hc + Vector((-0.5, -0.3, 0.05)), hc, lens=40)
    camera('hand_side', hc + Vector((0.0, -0.6, 0.0)), hc, lens=40)
    camera('sh_front', (0, -1.6, 1.36), (0, 0, 1.32), lens=50)
    camera('sh_back', (0, 1.6, 1.4), (0, 0, 1.32), lens=50)
    camera('sh_top', (0, -0.25, 2.55), (0, -0.02, 1.35), lens=40)
    camera('rest', (0, -6, 0.92), (0, 0, 0.92), ortho=2.05)

    def render(tag, cam, frame, note, objs=(LOD0,)):
        for o in bpy.data.objects:
            if o.type == 'MESH':
                o.hide_render = o not in objs
        scene.camera = cams[cam]
        scene.frame_set(frame)
        r_.stamp_note_text = f'{note}  (f{frame})'
        r_.resolution_x, r_.resolution_y, r_.resolution_percentage = Wt, H, 100
        path = os.path.join(TILES, f'{tag}.png')
        r_.filepath = path
        bpy.ops.render.render(write_still=True)
        RENDERS.append({'tile': tag, 'camera': cam, 'frame': frame, 'note': note})
        return path

    engine_used = 'BLENDER_EEVEE'
    try:
        set_engine(engine_used)
        render('probe', 'front', 0, 'probe')
        RENDERS.clear()
    except Exception as e:  # noqa: BLE001
        print('proto_rig: Eevee failed headless, Workbench instead:', e)
        engine_used = 'BLENDER_WORKBENCH'
        set_engine(engine_used)
    stage(f'render setup ({engine_used})')

    SEQ = [(0, 'rest'), (5, 'shrug both 20'), (13, 'R shoulder forward 25'), (22, 'index-ring curled'),
           (31, 'curl held / kick chamber'), (35, 'spread / kick extend')]
    sheet1 = []
    for view, label in (('front', 'front'), ('threeq', '3/4')):
        row = []
        for fr, what in SEQ:
            row.append(render(f's1-{view}-{fr:02d}', view, fr, f'{label}: {what}'))
        sheet1.append(row)
    stage('sheet 1 tiles')
    sheet2 = [
        [render('s2-hand-palm', 'hand_palm', 27, 'R hand curled, palm'),
         render('s2-hand-back', 'hand_back', 27, 'R hand curled, back'),
         render('s2-hand-side', 'hand_side', 18, 'R hand index+middle curling'),
         render('s2-hand-spread', 'hand_palm', 35, 'R hand spread, palm'),
         render('s2-rest-orig', 'rest', 0, 'rest: ORIGINAL LOD0', objs=(ORIG,))],
        [render('s2-sh-front', 'sh_front', 5, 'shrug, front'),
         render('s2-sh-back', 'sh_back', 5, 'shrug, back'),
         render('s2-sh-push', 'sh_top', 14, 'R shoulder forward, top (front down)'),
         render('s2-sh-rest', 'sh_top', 0, 'shoulders at rest, top'),
         render('s2-rest-new', 'rest', 0, 'rest: NEW LOD0 (55 bones)')],
    ]
    stage('sheet 2 tiles')

    def load_px(path):
        im = bpy.data.images.load(path)
        w, h = im.size
        a = np.empty(w * h * 4, np.float32)
        im.pixels.foreach_get(a)
        bpy.data.images.remove(im)
        return a.reshape(h, w, 4)

    def compose(rows, out_name):
        tiles = [[load_px(p) for p in row] for row in rows]
        th, tw = tiles[0][0].shape[:2]
        gap = 4
        cols = max(len(r) for r in rows)
        Wsh, Hsh = cols * tw + (cols - 1) * gap, len(rows) * th + (len(rows) - 1) * gap
        sheet = np.ones((Hsh, Wsh, 4), np.float32) * 0.05
        sheet[..., 3] = 1
        for ri, row in enumerate(tiles):
            for ci, t in enumerate(row):
                y0 = Hsh - (ri + 1) * th - ri * gap   # pixels run bottom-up
                x0 = ci * (tw + gap)
                sheet[y0:y0 + th, x0:x0 + tw] = t
        im = bpy.data.images.new(out_name, Wsh, Hsh, alpha=False)
        im.pixels.foreach_set(sheet.ravel())
        path = os.path.join(DOCS, out_name)
        im.filepath_raw = path
        im.file_format = 'WEBP'
        try:
            im.save(filepath=path, quality=88)
        except TypeError:
            im.save()
        print('proto_rig: sheet', path, os.path.getsize(path), 'bytes')
        return path

    SHEETS = [compose(sheet1, 'skeleton-test-sequence.webp'), compose(sheet2, 'skeleton-test-closeups.webp')]
    stage('sheets')
else:
    SHEETS = []

# ---------------------------------------------------------------- g: report
report = {
    'blend': 'build/anim-skeleton/wren-lods.blend (copy of the anim-rig build, 2026-10-20)',
    'armature': ARM.name, 'mesh': LOD0.name, 'vertices': NV,
    'bones': {'before': len(BONES_BEFORE), 'after': len(GB), 'added': ['clavL', 'clavR'] + FINGERS},
    'clavicle': {s: {'head': [round(x, 4) for x in SC[s]], 'tail': [round(x, 4) for x in GB[f'clav{s}'].tail_local],
                     'children': [c.name for c in GB[f'clav{s}'].children]} for s in SIDES},
    'restMatrixChangeExisting': bone_err, 'fingerRestVsHero': fing_err,
    'influences': {'maxBefore': infl_before, 'maxAfter': infl_after, 'pruned': pruned},
    'weightedVertsPerNewBone': per_bone,
    'fingerTransfer': FINGER_REPORT, 'clavicleSplit': {'verts': CLAV_REPORT, 'x': [CLAV_X0, CLAV_X1], 'z': [CLAV_Z0, CLAV_Z1], 'max': CLAV_MAX},
    'restErrorM': rest_err, 'restLimitM': 1e-5,
    'clip': {'name': 'skeleton_test', 'frames': [0, 48], 'fps': 24, 'bonesKeyed': len(KEYS), 'keys': nkeys},
    'render': {'engine': engine_used, 'tiles': RENDERS, 'sheets': [os.path.relpath(p, ROOT).replace('\\', '/') for p in SHEETS]},
    'timing': TIMES,
}
if args.save:
    set_rest_pose(ARM)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BUILD, 'wren-proto.blend'), copy=True)
stage('done')
report['timing'] = TIMES
with open(os.path.join(BUILD, 'proto-report.json'), 'w', encoding='utf-8') as fh:
    json.dump(report, fh, indent=1)
print('proto_rig: report', os.path.join(BUILD, 'proto-report.json'))
