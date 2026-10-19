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


def mirror_key(k):
    """The right step from the left one: sides swapped, lateral offsets, yaws and rolls negated."""
    m = {'phase': k['phase'] + 0.5}
    for seg in ('pelvis', 'spine', 'chest', 'neck'):
        e = dict(k.get(seg, {}))
        for a in ('dx', 'yaw', 'roll'):
            if a in e:
                e[a] = -e[a]
        m[seg] = e
    for a, b in (('armL', 'armR'), ('legL', 'legR')):
        m[a], m[b] = dict(k[b]), dict(k[a])
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
    W['head'] = W['neck']
    X['head'] = X['neck'] + W['neck'] @ OFF['head']
    for side, s in (('L', -1), ('R', 1)):
        a = k['arm' + side]
        sh, el, wr, hd = 'sh' + side, 'el' + side, 'wr' + side, 'hand' + side
        X[sh] = X['chest'] + W['chest'] @ OFF[sh]
        u = W['chest'] @ rx(-d2r(a['flex'])) @ rz(s * d2r(a['abd'])) @ DOWN
        W[sh] = bone_rot(u, FWD)
        X[el] = X[sh] + u * OFF[el].length
        f = W['chest'] @ rx(-d2r(a['flex'] + a['elbow'])) @ rz(s * d2r(a['abd'] + CARRY)) @ DOWN
        W[el] = bone_rot(f, FWD)
        X[wr] = X[el] + f * OFF[wr].length
        W[wr] = W[hd] = W[el]
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
        W[an] = W[toe] = foot
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


N = int(clip.get('frames', 32))
frames = []
lastq = {}
for i in range(N):
    fr = i * SPAN / N
    scene.frame_set(int(fr), subframe=fr - int(fr))
    W, X = evaluated()
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
            v = cinv @ (X[j + side] - X['sh' + side]) / K
            arms += [v.x, v.y, v.z]
    frames.append({
        'pel': [pel.x, pel.y, pel.z],
        'q': qs,
        'arm': arms,
        'ankle': [X['anL'].x / K, X['anR'].x / K],
        'X': {n: list(X[n]) for n in ORDER},
    })

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
