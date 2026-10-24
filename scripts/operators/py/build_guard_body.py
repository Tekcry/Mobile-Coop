"""Guard bake stage `bodies` (docs/guard-models/PLAN.md G1, SPEC sections 1, 6, 7): one guard base body, rigged on the
game joints, A-pose bind (D13), 4 influences, the head cut off at the neck seam (G1h builds the heads).

Run by guard-bake.mjs: blender -b ... --python build_guard_body.py -- --seed S --stage bodies --job bodies-<base>
  --base <base> --kit <guards.json> --out <dir>
Reads (from the `prep` stage, under --out): joints/guard-<base>.json and mpfb2/. Writes bodies/guard-<base>-body.blend
(armature `guard-<base>-rig`: 33 bones = the 23 rig joints + 10 fingers; skinned mesh `guard-<base>-body` with the
hm08 vertex index as the `_mh` point attribute; the cut-off head part `guard-<base>-headref`, unskinned and hidden, for
G1h) and bodies/guard-<base>-body.json (measurements against targets, seam, bones, checks).

Bones: `root body pelvis spine chest neck head clavL clavR shL elL wrL shR elR wrR hipL knL anL toeL hipR knR anR toeR`
at the bind joints (torso joints = the game rig's, limbs = the game lengths in MakeHuman's A-pose directions, like
Wren), `shL` / `shR` under the clavicles, the clavicles in the chest's orientation (rest identity under the chest, as
anim-skeleton's add_joints makes Wren's), Wren's finger names `fingerL_<f>_1` / `fingerR_<f>_1` under the wrists (f 1 =
thumb .. 5, one segment each): head at the MCP joint (thumb: CMC), tail at the fingertip, rolled so the bone's local Z
is src/anim/fingers.ts' curl axis (a turn about game +Z on the right hand, -Z on the left, closes it toward the palm;
in Blender's own bone frame that is -Z right, +Z left: the game frame is mirrored); the thumb so fingers.ts'
THUMB_AXES[0] is Wren's opposition axis.
The clavicle weight split is already in (G4 must not split again).
"""
import json
import math
import os
import sys
import time

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402
import guard_body as gb  # noqa: E402

T0 = time.time()
args = common.parse_args({
    '--stage': {'default': 'bodies'},
    '--job': {'default': None},
    '--base': {'required': True},
    '--kit': {'required': True},
    '--out': {'required': True},
    '--joints': {'default': None},
    '--mpfb': {'default': None},
})
common.check_version()
common.empty_scene()
common.seed_everything(args.seed)

with open(args.kit, encoding='utf-8') as f:
    kit = json.load(f)
base = next((b for b in kit['bases'] if b['id'] == args.base), None)
if base is None:
    raise SystemExit(f'base "{args.base}" is not in {args.kit}')
joints_path = args.joints or os.path.join(args.out, 'joints', f'guard-{args.base}.json')
mpfb_dir = args.mpfb or os.path.join(args.out, 'mpfb2')
for p in (joints_path, os.path.join(mpfb_dir, '3dobjs', 'base.obj')):
    if not os.path.exists(p):
        raise SystemExit(f'{p} missing: run the prep stage first (guard-bake.mjs --stage prep)')
op = common.load_operator(joints_path, f'guard-{args.base}')
NAME = f'guard-{args.base}'
seam_cfg = kit.get('face', {}).get('neckSeam', {'joint': 'neck', 'at': 0.45, 'blendLoops': 2})
if seam_cfg.get('blendLoops', 2) != 2 or seam_cfg.get('joint', 'neck') != 'neck':
    raise SystemExit(f'neck seam {seam_cfg}: this script blends 2 loops each side from the neck joint')

# --- the fit (guard_body.py) ------------------------------------------------------------------------------------------
fit = gb.GuardFit(mpfb_dir, op, base['macro'])
r = fit.solve()
m, T = r['m'], fit.target
errors = {k: m[k] - T[k] for k in T}
# stature is not solved (the A-pose legs spread a few mm off it); every other dimension is
worst = max(abs(e) for k, e in errors.items() if k != 'stature')
if worst > 0.01 or abs(errors['stature']) > 0.012:
    raise SystemExit(f'{NAME}: body dimensions off: {errors}')
seam = fit.neck_seam(seam_cfg['at'])
W = fit.skin_weights(op.get('clavicleSplit'), seam['rings'])
fingers = fit.fingers()
seam_tf = fit.seam_transforms(seam)
V, tgt, GJ = r['V'], r['tgt'], fit.GJ
# the top of the head (feet on y = 0): what helmets and caps sit on (G3); the head joint is bindJoints.head
crown_y = round(float(V[fit.body_idx, 1].max()), 5)

# --- Blender: armature -----------------------------------------------------------------------------------------------
G2B = common.game_to_blender
order = [j['name'] for j in op['joints']]
PARENT = {j['name']: j['parent'] for j in op['joints']}
arm_data = bpy.data.armatures.new(f'{NAME}-rig')
arm = bpy.data.objects.new(f'{NAME}-rig', arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones
for name in order:
    if name.startswith('clav'):
        continue   # after the chest exists: its orientation
    head = Vector(G2B(tgt[name]))
    kids = [n for n in order if PARENT[n] == name and not n.startswith('clav')]
    if kids:
        tail = Vector(G2B(tgt[kids[0]]))
    elif PARENT[name]:
        d = head - Vector(G2B(tgt[PARENT[name]]))
        tail = head + (d.normalized() * 0.04 if d.length > 1e-6 else Vector((0, 0, 0.04)))
    else:
        tail = head + Vector((0, 0, 0.04))
    if (tail - head).length < 1e-4:
        tail = head + Vector((0, 0, 0.02))
    b = eb.new(name)
    b.head, b.tail = head, tail
chest = eb['chest']
for s in 'LR':
    c = eb.new(f'clav{s}')
    c.head = Vector(G2B(tgt[f'clav{s}']))
    c.tail = c.head + (chest.tail - chest.head).normalized() * 0.05
    c.roll = chest.roll
for name in order:
    if PARENT[name]:
        eb[name].parent = eb[PARENT[name]]
        eb[name].use_connect = False
for name, fb in fingers.items():
    b = eb.new(name)
    b.head, b.tail = Vector(G2B(fb['head'])), Vector(G2B(fb['tail']))
    if (b.tail - b.head).length < 1e-4:
        b.tail = b.head + Vector((0, 0, 0.01))
    b.align_roll(Vector(G2B(fb['zAxis'])))
    b.parent = eb[fb['parent']]
    b.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
for b in arm_data.bones:
    b.use_deform = b.name in gb.DEFORM_BONES
# roll read back: each finger bone's local Z (Blender) in the game frame = the intended curl axis (game local Y and Z are
# the Blender ones through the frame map; X flips with the mirror)
B2G = lambda v: np.array((-v[0], v[2], -v[1]))  # noqa: E731
roll_err = 0.0
for name, fb in fingers.items():
    zb = arm_data.bones[name].matrix_local.to_3x3().col[2]
    roll_err = max(roll_err, math.degrees(math.acos(min(1.0, float(np.dot(B2G(zb), fb['zAxis']))))))
if roll_err > 0.5:
    raise SystemExit(f'{NAME}: finger roll off by {roll_err:.2f} deg')

# --- the body mesh: hm08 'body' faces below the seam -----------------------------------------------------------------
faces_all = fit.topo.faces
keep_faces = [f for fi, f in enumerate(faces_all) if fi not in seam['head_faces']]
used = sorted({v for f in keep_faces for v in f})
remap = {v: i for i, v in enumerate(used)}
me = bpy.data.meshes.new(f'{NAME}-body')
me.from_pydata([G2B(V[v]) for v in used], [], [[remap[v] for v in f] for f in keep_faces])
me.validate()
for p in me.polygons:
    p.use_smooth = True
at = me.attributes.new('_mh', 'INT', 'POINT')
at.data.foreach_set('value', np.array(used, dtype=np.int32))
obj = bpy.data.objects.new(f'{NAME}-body', me)
bpy.context.scene.collection.objects.link(obj)
groups = {n: obj.vertex_groups.new(name=n) for n in gb.DEFORM_BONES}
Wu = W[np.array(used)]
inf = (Wu > 0).sum(axis=1)
for j, n in enumerate(gb.DEFORM_BONES):
    nz = np.nonzero(Wu[:, j])[0]
    for i in nz:
        groups[n].add([int(i)], float(Wu[i, j]), 'REPLACE')
obj.modifiers.new('rig', 'ARMATURE').object = arm
obj.parent = arm
unweighted_used = int((inf == 0).sum())

# the cut-off head part, for G1h (same fit, hm08 indices in `_mh`); not skinned, hidden
head_faces = [faces_all[fi] for fi in sorted(seam['head_faces'])]
hused = sorted({v for f in head_faces for v in f})
hmap = {v: i for i, v in enumerate(hused)}
hme = bpy.data.meshes.new(f'{NAME}-headref')
hme.from_pydata([G2B(V[v]) for v in hused], [], [[hmap[v] for v in f] for f in head_faces])
hme.validate()
hme.attributes.new('_mh', 'INT', 'POINT').data.foreach_set('value', np.array(hused, dtype=np.int32))
href = bpy.data.objects.new(f'{NAME}-headref', hme)
bpy.context.scene.collection.objects.link(href)
href.hide_render = True
href.hide_viewport = True

# --- checks ------------------------------------------------------------------------------------------------------------
# joint round trip: bone heads read back into the game frame against the intended bind joints (and finger heads)
want = {n: tgt[n] for n in order}
want.update({n: fb['head'] for n, fb in fingers.items()})
rt = 0.0
heads = {}
for b in arm_data.bones:
    x, y, z = b.head_local
    g = np.array((-x, z, -y))
    heads[b.name] = [round(float(v), 5) for v in g]
    rt = max(rt, float(np.abs(g - want[b.name]).max()))
if rt > 1e-4:
    raise SystemExit(f'{NAME}: joint round trip off by {rt:.6f} m')
# bone lengths (joint to parent joint) equal the game rig's at rest; root -> body is off by the floor lift (the A-pose
# legs stand the soles on y = 0; root stays at the floor origin)
blen = max(abs(np.linalg.norm(tgt[n] - tgt[PARENT[n]]) - np.linalg.norm(GJ[n] - GJ[PARENT[n]]))
           for n in order if PARENT[n] and PARENT[n] != 'root')
if blen > 1e-4:
    raise SystemExit(f'{NAME}: bone lengths differ from the game rig by {blen:.6f} m')
n_bones = len(arm_data.bones)
if n_bones != 33:
    raise SystemExit(f'{NAME}: {n_bones} bones, want 33 (23 rig joints + 10 fingers)')
missing = sorted(set(kit.get('bones', {}).get('rig', [])) - set(order)) + sorted(set(kit.get('bones', {}).get('fingers', [])) - set(fingers))
if missing:
    raise SystemExit(f'{NAME}: kit bones missing from the rig: {missing}')

# deformation: elbows and knees 60 deg, fingers curled 60 deg the way src/anim/fingers.ts curls them, clavicles
# shrugged 15 deg. fingers.ts turns a joint about its game-frame local axis l (fingers (0, 0, +-1), the thumb's base
# THUMB_AXES[0], the left hand mirrored x, -y, -z); in the Blender bone frame that is the axis (lx, -ly, -lz).
CURL = math.radians(60)


def curl_axis(name):
    mx = -1.0 if name.startswith('fingerL') else 1.0
    if name.split('_')[1] == '1':
        lx, ly, lz = gb.THUMB_AXIS0[0], gb.THUMB_AXIS0[1] * mx, gb.THUMB_AXIS0[2] * mx
    else:
        lx, ly, lz = 0.0, 0.0, mx
    return (lx, -ly, -lz)


bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
posed_bones = {n: (math.radians(60), 0, 0) for n in ('elL', 'elR', 'knL', 'knR')}
posed_bones.update({'clavL': (0, 0, math.radians(15)), 'clavR': (0, 0, math.radians(-15))})
for n, e in posed_bones.items():
    arm.pose.bones[n].rotation_mode = 'XYZ'
    arm.pose.bones[n].rotation_euler = e
for n in fingers:
    pbone = arm.pose.bones[n]
    pbone.rotation_mode = 'AXIS_ANGLE'
    pbone.rotation_axis_angle = (CURL, *curl_axis(n))
bpy.context.view_layer.update()
# each fingertip's (bone tail's) move in its wrist's frame (the elbow turn moves the whole hand), back in the rest
# frame, game axes
tips = {}
for n, fb in fingers.items():
    w_rest = arm_data.bones[fb['parent']].matrix_local
    t_pose = arm.pose.bones[fb['parent']].matrix.inverted() @ arm.pose.bones[n].tail
    t_rest = w_rest.inverted() @ arm_data.bones[n].tail_local
    tips[n] = B2G(w_rest.to_3x3() @ (t_pose - t_rest))
dg = bpy.context.evaluated_depsgraph_get()
ev = obj.evaluated_get(dg).to_mesh()
posed = np.array([v.co[:] for v in ev.vertices])
obj.evaluated_get(dg).to_mesh_clear()
for n in posed_bones:
    arm.pose.bones[n].rotation_euler = (0, 0, 0)
for n in fingers:
    arm.pose.bones[n].rotation_axis_angle = (0.0, 0.0, 1.0, 0.0)
    arm.pose.bones[n].rotation_mode = 'QUATERNION'
bpy.ops.object.mode_set(mode='OBJECT')
rest = np.array([v.co[:] for v in me.vertices])
moved = float(np.nanmax(np.linalg.norm(posed - rest, axis=1)))
if not np.isfinite(posed).all() or moved > 0.8:
    raise SystemExit(f'{NAME}: skin deformation check failed (max move {moved:.3f} m)')
# the curl closes every finger (2..5) toward the palm, both hands (the thumb's base swings across, reported only):
# towardPalm = the tip's move . the palm direction normal to the bone (cos 30 deg = 0.866 for a clean 60 deg curl)
curl = {}
for n, fb in fingers.items():
    d = tips[n]
    dn = float(np.linalg.norm(d))
    yb = (np.asarray(fb['tail']) - np.asarray(fb['head'])) / np.linalg.norm(np.asarray(fb['tail']) - np.asarray(fb['head']))
    pp = fb['palm'] - np.dot(fb['palm'], yb) * yb
    pp /= np.linalg.norm(pp)
    curl[n] = {'tipMoveMm': round(dn * 1000, 1), 'towardPalm': round(float(np.dot(d, pp)) / max(dn, 1e-9), 3)}
bad = [n for n, c in curl.items() if not n.split('_')[1] == '1' and c['towardPalm'] < 0.5]
if bad:
    raise SystemExit(f'{NAME}: a curl does not close {bad} toward the palm: {[curl[n] for n in bad]}')

# --- outputs -------------------------------------------------------------------------------------------------------------
out = os.path.join(args.out, 'bodies')
os.makedirs(out, exist_ok=True)
blend = os.path.join(out, f'{NAME}-body.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
tris = sum(len(p.vertices) - 2 for p in me.polygons)
head_tris = sum(len(f) - 2 for f in head_faces)
seam_body = [remap[v] for v in seam['seam']]
r4 = lambda v: [round(float(x), 5) for x in v]  # noqa: E731
report = {
    'base': args.base, 'job': args.job, 'refHeight': op['height'], 'height': op['height'], 'build': op['build'],
    'seed': args.seed,
    'blender': bpy.app.version_string, 'seconds': round(time.time() - T0, 1),
    'source': 'MakeHuman hm08 base mesh, targets and default rig weights, MPFB2 CC0 data (docs/art-credits.md)',
    'macro': base['macro'], 'fixedTargets': gb.FIXED_TARGETS,
    'solvedTargets': {k: {'targets': gb.SOLVED_TARGETS[k], 'weight': round(w, 4)} for k, w in fit.solved.items()},
    'mhStatureAtSliders': fit.mh_stature, 'uniformScale': fit.K,
    'measured': m, 'target': T, 'errorsMm': {k: round(e * 1000, 2) for k, e in errors.items()},
    'targetNotes': 'stature: not solved (A-pose legs); shoulderWidth: bideltoid with the arms hanging (rig rest), the rig '
                   'shoulder width x 1.04; chestGirth / neckGirth: ANSUR II male means x stature / 1.756 x build chest '
                   '/ girth mod; neckGirth on the neck loop nearest 25% up the neck; the rest: proportions(build, height)',
    'torsoField': {'heights': fit.ctrl_y.tolist(), 'scaleXZ': fit.field.tolist()},
    'headScale': fit.scale['head'].tolist(), 'neckScale': fit.scale['neck'].tolist(), 'floorLift': r['lift'],
    'tris': tris, 'vertices': len(me.vertices), 'faces': len(me.polygons),
    'headRefTris': head_tris,
    'bones': n_bones, 'boneNames': [b.name for b in arm_data.bones], 'deformBones': gb.DEFORM_BONES,
    # PLAN 5 / SPEC 6 for G4: LOD0 keeps the 33 bones, LOD1 / LOD2 the 23 rig joints (finger weights onto the wrist);
    # influences per LOD from the kit (4 / 4 / 2)
    'lodBones': {
        'lod0': order + list(fingers), 'lod1': order, 'lod2': order,
        'fold': {n: fb['parent'] for n, fb in fingers.items()},
        'influences': kit.get('bones', {}).get('influences', [4, 4, 2]),
    },
    'maxInfluences': int(inf.max()), 'unweightedVerts': unweighted_used, 'mhUnweightedBodyVerts': fit.unweighted,
    'jointRoundTripMaxError': rt, 'boneLengthMaxError': blen,
    'deformCheck': {'poses': 'elbows / knees 60, fingers curled 60 (fingers.ts axes and sign), clavicles 15 deg',
                    'maxMove': moved, 'fingerCurl': curl},
    'fingerAxes': {
        'names': 'finger<S>_<f>_1 (src/anim/fingers.ts FINGER_RE; f 1 = thumb .. 5 little; one segment per finger)',
        'curl': 'bone local +Z (right hand) / -Z (left hand) in the game frame closes the finger toward the palm; the '
                'thumb base turns about THUMB_AXES[0] (left mirrored x, -y, -z); Blender bone frame: (lx, -ly, -lz)',
        'rollErrorDeg': round(roll_err, 4),
        'thumbFlexDot': {n: round(fb['thumbFlexDot'], 4) for n, fb in fingers.items() if 'thumbFlexDot' in fb},
    },
    # bind joints incl. the fingertip ends handL / handR (G2's reused garment scripts read them)
    'bindJoints': {k: r4(tgt[k]) for k in order + ['handL', 'handR']}, 'rigRestJoints': {k: r4(GJ[k]) for k in order},
    'crownY': crown_y,
    'boneHeads': heads,
    'fingerBones': {n: {'head': r4(fb['head']), 'tail': r4(fb['tail']), 'parent': fb['parent'], 'zAxis': r4(fb['zAxis']),
                        'palm': r4(fb['palm']), 'dorsal': r4(fb['dorsal'])}
                    for n, fb in fingers.items()},
    'seamTransforms': seam_tf,
    'clavicleSplit': op.get('clavicleSplit'),
    'hitVolumes': op['hitVolumes'],
    'neckSeam': {
        'at': seam_cfg['at'], 'targetY': seam['y'], 'meanY': seam['meanY'], 'perimeter': seam['perimeter'],
        'mhVerts': [int(v) for v in seam['seam']], 'bodyVerts': seam_body,
        'rings': {str(k): sorted(int(v) for v in vs) for k, vs in seam['rings'].items()},
        'headShare': {str(k): h for k, h in gb.SEAM_BLEND.items()},
        'note': 'mhVerts: the seam loop in order (hm08 index = the `_mh` attribute); rings: hm08 indices of the loops '
                'round it (negative: body side); headShare: the head bone share of the neck + head weight per ring '
                '(the seam is exactly neck 0.5 / head 0.5); G1h applies rings 0..2 the same way',
    },
}
with open(os.path.join(out, f'{NAME}-body.json'), 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)
print(f"guard body {args.base}: {len(me.vertices)} verts, {tris} tris, {n_bones} bones, stature {m['stature']:.3f} m, "
      f"shoulders {m['shoulderWidth']:.3f} m, chest girth {m['chestGirth']:.3f} m, dims worst {worst * 1000:.1f} mm, "
      f"round trip {rt:.1e} m, {time.time() - T0:.0f} s -> {blend}")
