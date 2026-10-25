"""anim-skeleton S1: a close-up sheet of LOD0's right hand curled, before and after the knuckle loops.

Reads the right hand of the shipped LOD0 as skin.mjs patches it, without and with the loops
(`node scripts/anim-skeleton/skin.mjs --check --dump build/anim-skeleton/s1`: lod0-hand-{before,after}.json, glTF frame),
builds each as a Blender mesh skinned to an armature made from the file's joints, curls the fingers (P0's curl: MCP / PIP /
DIP 70 / 85 / 55 deg, thumb 25 / 40 / 35 + opposition), and renders both from three views into
docs/archive/anim-skeleton/s1/hand-knuckle-loops.webp. Run headless through scripts/anim-skeleton/proto.mjs (heavy lock):

  node scripts/anim-skeleton/proto.mjs hand_sheet
"""
import argparse
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--seed', type=int, default=1015)
ap.add_argument('--root', required=True)
ap.add_argument('--size', type=int, default=520)
args = ap.parse_args(argv)
if tuple(bpy.app.version) != (5, 2, 2):
    raise SystemExit(f'Blender {bpy.app.version_string} refused: pinned to 5.2.2')

ROOT = args.root
SRC = os.path.join(ROOT, 'build', 'anim-skeleton', 's1')
TILES = os.path.join(SRC, 'tiles')
DOCS = os.path.join(ROOT, 'docs', 'archive', 'anim-skeleton', 's1')
os.makedirs(TILES, exist_ok=True)
os.makedirs(DOCS, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
C4 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))   # glTF (x, y, z) -> Blender (x, -z, y)


def gl(v):
    return Vector((v[0], -v[2], v[1]))


def build(tag, data, x_off):
    """An armature from the file's joints (rest = their world matrices) and the hand mesh skinned to it."""
    arm = bpy.data.objects.new(f'arm-{tag}', bpy.data.armatures.new(f'arm-{tag}'))
    scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    J = data['joints']
    for j in J:
        b = eb.new(j['name'])
        b.head = (0, 0, 0)
        b.tail = (0, 0.02, 0)
        M = C4 @ Matrix([j['world'][c::4] for c in range(4)])   # column-major -> rows
        b.matrix = M
    names = {j['name'] for j in J}
    for j in J:
        if j['parent'] in names:
            eb[j['name']].parent = eb[j['parent']]
    bpy.ops.object.mode_set(mode='OBJECT')
    P = np.array(data['P']).reshape(-1, 3)
    N = np.array(data['N']).reshape(-1, 3)
    I = np.array(data['I']).reshape(-1, 3)
    me = bpy.data.meshes.new(f'hand-{tag}')
    me.from_pydata([tuple(gl(p)) for p in P], [], [tuple(int(x) for x in t) for t in I])
    me.shade_smooth()
    me.normals_split_custom_set_from_vertices([tuple(gl(n)) for n in N])
    ob = bpy.data.objects.new(f'hand-{tag}', me)
    scene.collection.objects.link(ob)
    Jv = np.array(data['J']).reshape(-1, 4)
    Wv = np.array(data['W']).reshape(-1, 4)
    groups = {}
    for v in range(len(P)):
        for k in range(4):
            w = float(Wv[v, k])
            if w <= 0:
                continue
            n = J[int(Jv[v, k])]['name']
            g = groups.get(n) or groups.setdefault(n, ob.vertex_groups.new(name=n))
            g.add([v], w, 'REPLACE')
    md = ob.modifiers.new('rig', 'ARMATURE')
    md.object = arm
    ob.parent = arm
    arm.location.x = x_off
    return arm, ob


def hand_frame(arm, s):
    B = arm.data.bones
    head = lambda n: B[n].head_local.copy()   # noqa: E731
    bases = {k: head(f'finger{s}_{k}_1') for k in range(1, 6)}
    wrist = head(f'wr{s}')
    cen = sum((bases[k] for k in range(1, 6)), Vector()) / 5
    along = (cen - wrist).normalized()
    row = [2, 3, 4, 5]
    across = (bases[5] - bases[2]).normalized()
    n = along.cross(across).normalized()
    if n.dot(bases[1] - (bases[2] + bases[5]) / 2) < 0:
        n = -n
    return {'n': n, 'along': along, 'across': across, 'wrist': wrist, 'index': 2, 'row': row}


def curl(arm, s):
    """P0's fist in the armature's rest frame, written as local pose rotations."""
    B = arm.data.bones
    f = hand_frame(arm, s)
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    for k in range(1, 6):
        thumb = k == 1
        for j in (1, 2, 3):
            nm = f'finger{s}_{k}_{j}'
            d = (B[nm].tail_local - B[nm].head_local).normalized()
            deg = ((25, 40, 35) if thumb else (70, 85, 55))[j - 1]
            R = Matrix.Rotation(math.radians(deg), 3, d.cross(f['n']).normalized())
            if thumb and j == 1:
                to_idx = B[f'finger{s}_2_1'].head_local - B[nm].head_local
                R = Matrix.Rotation(math.radians(35), 3, d.cross(to_idx).normalized()) @ R
            # a child's rotation is in the rest frame, relative to its parent's: as P0 keys them
            M = B[nm].matrix_local.to_3x3()
            arm.pose.bones[nm].rotation_quaternion = (M.inverted() @ R @ M).to_quaternion()
    bpy.context.view_layer.update()


data = {t: json.load(open(os.path.join(SRC, f'lod0-hand-{t}.json'), encoding='utf-8')) for t in ('before', 'after')}
objs = {}
for i, t in enumerate(('before', 'after')):
    arm, ob = build(t, data[t], 0.0)
    curl(arm, 'R')
    objs[t] = (arm, ob)
print('hand_sheet: tris', {t: data[t]['tris'] for t in data}, 'verts', {t: len(data[t]['P']) // 3 for t in data})

# ---------------------------------------------------------------- render
clay = bpy.data.materials.new('clay')
clay.use_nodes = True
bsdf = clay.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (0.45, 0.45, 0.46, 1)
bsdf.inputs['Roughness'].default_value = 0.5
bpy.context.view_layer.material_override = clay
wd = bpy.data.worlds.new('w')
wd.use_nodes = True
wd.node_tree.nodes['Background'].inputs[0].default_value = (0.18, 0.19, 0.21, 1)
wd.node_tree.nodes['Background'].inputs[1].default_value = 0.6
scene.world = wd


def look_at(o, target):
    o.rotation_euler = (Vector(target) - o.location).to_track_quat('-Z', 'Y').to_euler()


B = objs['after'][0].data.bones
f = hand_frame(objs['after'][0], 'R')


def fist_centre(ob):
    """Centre of the posed vertices mostly on the right fingers (the frame target)."""
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.to_mesh()
    fing = {g.index for g in ob.vertex_groups if g.name.startswith('fingerR_')}
    pts = [ev.matrix_world @ v.co for v, src in zip(me.vertices, ob.data.vertices)
           if sum(g.weight for g in src.groups if g.group in fing) > 0.5]
    ev.to_mesh_clear()
    return sum(pts, Vector()) / len(pts)


hc = fist_centre(objs['after'][1])
print('hand_sheet: fist centre', tuple(round(x, 3) for x in hc))
for name, loc, e in (('key', hc + f['n'] * -0.6 + Vector((0.3, -0.5, 0.6)), 3.0), ('fill', hc + Vector((-0.6, -0.4, 0.1)), 0.9),
                     ('rim', hc + Vector((0.2, 0.7, 0.4)), 1.4)):
    L = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN'))
    L.data.energy = e
    scene.collection.objects.link(L)
    L.location = loc
    look_at(L, hc)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.data.lens = 50
cam.data.clip_start = 0.01
cam.data.sensor_fit = 'VERTICAL'
cam.data.sensor_height = 24
scene.collection.objects.link(cam)
scene.camera = cam
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 16
scene.view_settings.view_transform = 'AgX'
r = scene.render
r.resolution_x = r.resolution_y = args.size
r.image_settings.file_format = 'PNG'
r.image_settings.color_mode = 'RGB'
r.use_stamp = True
for a in ('date', 'time', 'render_time', 'camera', 'lens', 'scene', 'filename', 'memory', 'hostname', 'marker', 'frame_range',
          'sequencer_strip', 'frame'):
    if hasattr(r, f'use_stamp_{a}'):
        setattr(r, f'use_stamp_{a}', False)
r.use_stamp_note = True
r.stamp_font_size = 16
r.stamp_background = (0, 0, 0, 0.6)

# the right hand hangs at her right side (-X), palm in: front (-Y), outside (-X), behind (+Y), and the mesh at rest as wire
VIEWS = [('front', Vector((-0.04, -0.30, 0.03))), ('outside', Vector((-0.30, -0.06, 0.03))), ('behind', Vector((-0.04, 0.30, 0.03))),
         ('rest wire', Vector((-0.30, -0.06, 0.03)))]
for t in ('before', 'after'):
    arm, ob = objs[t]
    w = bpy.data.objects.new(f'wire-{t}', ob.data)
    scene.collection.objects.link(w)
    w.parent = arm
    wm = w.modifiers.new('wire', 'WIREFRAME')
    wm.thickness = 0.0005
    wm.use_replace = True
    objs[t] = (arm, ob, w)
objs['after'][0].data.pose_position = 'REST'
bpy.context.view_layer.update()
fist_rest = fist_centre(objs['after'][1])
objs['after'][0].data.pose_position = 'POSE'
tiles = []
for t in ('before', 'after'):
    row = []
    for v, off in VIEWS:
        wire = v == 'rest wire'
        for o in scene.objects:
            if o.type == 'MESH':
                o.hide_render = o is not objs[t][2 if wire else 1]
        objs[t][0].data.pose_position = 'REST' if wire else 'POSE'
        bpy.context.view_layer.update()
        cam.location = (hc + off) if not wire else (fist_rest + off * 0.8)
        look_at(cam, hc if not wire else fist_rest)
        lab = 'LOD0 shipped (fingers, no loops)' if t == 'before' else 'LOD0 + knuckle loops'
        r.stamp_note_text = f'{lab}: {v}, {data[t]["tris"]} hand tris'
        p = os.path.join(TILES, f'{t}-{v}.png')
        r.filepath = p
        bpy.ops.render.render(write_still=True)
        row.append(p)
    tiles.append(row)


def load_px(path):
    im = bpy.data.images.load(path)
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(h, w, 4)


T = [[load_px(p) for p in row] for row in tiles]
th, tw = T[0][0].shape[:2]
gap = 4
Wsh, Hsh = len(VIEWS) * tw + (len(VIEWS) - 1) * gap, 2 * th + gap
sheet = np.ones((Hsh, Wsh, 4), np.float32) * 0.05
sheet[..., 3] = 1
for ri, row in enumerate(T):
    for ci, t in enumerate(row):
        y0 = Hsh - (ri + 1) * th - ri * gap
        x0 = ci * (tw + gap)
        sheet[y0:y0 + th, x0:x0 + tw] = t
im = bpy.data.images.new('sheet', Wsh, Hsh, alpha=False)
im.pixels.foreach_set(sheet.ravel())
out = os.path.join(DOCS, 'hand-knuckle-loops.webp')
im.filepath_raw = out
im.file_format = 'WEBP'
im.save(filepath=out, quality=85)
print('hand_sheet:', out, os.path.getsize(out), 'bytes')
