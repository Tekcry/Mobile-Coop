"""Step 11b pose check (D28): the BUILT Wren (the last garment's blend, skinned by the shipped rule, rigid_skin.py) in the
four LAYOUT.md movement poses - prone knee-up crawl, rope climb with the knee at hip height, deep crouch, rappel seat -
with each rigid item measured against the posed body (per region), the other rigid items, the ground (prone), a
modelled sit harness and rope (rappel; Wren wears none, LAYOUT.md note 3), and its draw path (9 rays from the grip end
plus the hand room). Clay renders (Cycles on the GPU), red = interference, amber = tight.
Usage: blender -b --python scripts/operators/py/pose_check.py -- <build dir> <dest dir> [norender] (opens <build>/wren-leg_kit.blend)
Writes <dest>/wren-pose-{rest,prone,climb,crouch,rappel,gameCrouch,gameSneak}.webp and <build>/wren-poses.json; the
game poses come from <build>/wren-game-poses.json (optional, fix round 1; the script that wrote it is removed).
From the D28 scratch pass (concepts/D28/LAYOUT.md, layout.py): the block-in placement is replaced by the built items."""
import sys, os, json, math
sys.dont_write_bytecode = True
REPO = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, REPO)
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import render as RD
import rigid_skin

ARGS = sys.argv[sys.argv.index('--') + 1:]
if ARGS[:1] == ['--seed']:          # scripts/operators/blender.mjs runBlender passes the seed first
    ARGS = ARGS[2:]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(REPO)))
BUILD, OUT = (os.path.join(ROOT, a) if not os.path.isabs(a) else a for a in ARGS[:2])   # Blender's cwd is not the repo
VAR = 'built'
RENDER = 'norender' not in ARGS
SAMPLES = 40
TW, TH = 800, 800
TILES = os.path.join(BUILD, 'pose-tiles')
if not bpy.data.filepath.endswith('wren-leg_kit.blend'):
    bpy.ops.wm.open_mainfile(filepath=os.path.join(BUILD, 'wren-leg_kit.blend'))
scene = bpy.context.scene
rig = bpy.data.objects['wren-rig']
body = bpy.data.objects['wren-body']
Zv = np.array([0.0, 0.0, 1.0])
os.makedirs(TILES, exist_ok=True)
os.makedirs(OUT, exist_ok=True)


def unit(v):
    v = np.asarray(v, float)
    return v / (np.linalg.norm(v) + 1e-12)


# --- clay look ---------------------------------------------------------------------------------------------------------
def mat(name, col, rough=0.6, emit=None, es=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = es
    return m


M_SUIT = mat('L suit', (0.42, 0.42, 0.43))
M_ARM = mat('L armour', (0.24, 0.25, 0.27))
M_KIT = mat('L kit', (0.16, 0.16, 0.17))
M_SOFT = mat('L soft new', (0.30, 0.27, 0.22))
M_OPT = mat('L rigid', (0.85, 0.32, 0.04), 0.45)
M_MNT = mat('L seat', (0.05, 0.35, 0.6), 0.5)
M_RED = mat('L red', (0.9, 0.02, 0.02), 0.4, emit=(0.9, 0.0, 0.0), es=0.6)
M_YEL = mat('L amber', (0.95, 0.75, 0.02), 0.4)
M_HAR = mat('L harness', (0.10, 0.45, 0.15), 0.6)
M_GND = mat('L ground', (0.30, 0.30, 0.30), 0.9)
M_TXT = mat('L text', (0, 0, 0), emit=(1.0, 1.0, 0.85))
M_TAG = mat('L tag', (0, 0, 0), emit=(1.0, 1.0, 1.0), es=1.5)
M_BG = mat('L label bg', (0.0, 0.0, 0.0), 1.0)
GARM = []
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        continue
    n = o.name
    if 'stitches' in n or o.hide_render:
        o.hide_render = True
        o.hide_viewport = True
        continue
    if n == 'wren-body':
        o.hide_render = True
        continue
    GARM.append(o)
    o.data.materials.clear()
    if n.startswith(('wren-suit', 'wren-gloves', 'wren-headwear', 'wren-approach')):
        o.data.materials.append(M_SUIT)
    elif n.startswith('wren-armour'):
        o.data.materials.append(M_ARM)
    else:
        o.data.materials.append(M_KIT)
    for p in o.data.polygons:
        p.material_index = 0

dg = bpy.context.evaluated_depsgraph_get()


def tree_of(names):
    V, F = [], []
    for n in names:
        ob = bpy.data.objects[n]
        me = ob.evaluated_get(dg).to_mesh()
        off = len(V)
        V += [tuple(ob.matrix_world @ v.co) for v in me.vertices]
        F += [tuple(i + off for i in p.vertices) for p in me.polygons]
        ob.evaluated_get(dg).to_mesh_clear()
    return BVHTree.FromPolygons(V, F)


SURF = ['wren-suit-hero', 'wren-armour-plate', 'wren-armour-trim', 'wren-armour-strap', 'wren-waist_belt-lam',
        'wren-leg_kit-elastic']
TREE = None
THIGH_TREE = None
USE_THIGH = False


def ray(o, d, reach=0.5):
    global TREE, THIGH_TREE
    if TREE is None:
        TREE = tree_of(SURF)
    if THIGH_TREE is None:
        THIGH_TREE = tree_of(['wren-suit-hero'])
    tr = THIGH_TREE if USE_THIGH else TREE
    loc, nrm, _, dist = tr.ray_cast(Vector(tuple(o)), Vector(tuple(unit(d))), reach)
    return (None, None) if loc is None else (np.array(loc), np.array(nrm))


def faces_in(ob, box, keep=None):
    lo, hi = np.array(box[0]), np.array(box[1])
    mw = ob.matrix_world
    out = []
    for p in ob.data.polygons:
        c = np.array(mw @ p.center)
        if np.all(c > lo) and np.all(c < hi) and (keep is None or keep(c)):
            out.append(p.index)
    return out


def remove(regions, keep=None):
    for objn, box in regions:
        ob = bpy.data.objects[objn]
        idx = set(faces_in(ob, box, keep))
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index in idx], context='FACES')
        bm.to_mesh(ob.data)
        bm.free()




# --- the built rigid items (D28, step 11b): separated from their objects by their '_rigid' ids ------------------------
RIG_REG = rigid_skin.registry(BUILD, 'wren')
BY_NAME = {e['name']: rid for rid, e in RIG_REG.items()}
rigid_skin.tag_head(GARM, 'wren')
SUIT_T = tree_of(['wren-suit-hero'])
# id, label, registry names, tag, draw ('up' world up, 'fwd' world forward, 'out' away from the body), draw length (m)
ITEMS = [('R0', 'rifle mag', ['rifleMag0'], '1', 'up', 0.21), ('R1', 'rifle mag', ['rifleMag1'], '1', 'up', 0.21),
         ('P0', 'pistol mag', ['pistolMag0'], '2', 'fwd', 0.16), ('P1', 'pistol mag', ['pistolMag1'], '2', 'fwd', 0.16),
         ('K', 'knife', ['knife'], '3', 'up', 0.13),
         ('T0', 'throwable', ['canister0'], '4', 'up', 0.12), ('T1', 'throwable', ['canister1'], '4', 'up', 0.12),
         ('T2', 'throwable', ['canister2'], '4', 'up', 0.12),
         ('D', 'drone pod', ['dronePod'], '5', 'out', 0.05), ('H', 'holster', ['holster'], '6', 'up', 0.12)]
TH_AX = {'hipL': (0.105, -0.04), 'hipR': (-0.105, -0.04)}


def split_off(ids, name):
    """Moves the faces whose vertices all carry one of `ids` out of every garment object into one new object."""
    Vn, Fn = [], []
    for ob in list(GARM):
        me = ob.data
        a = me.attributes.get('_rigid')
        if a is None or a.domain != 'POINT':
            continue
        r = np.zeros(len(me.vertices), np.float32)
        a.data.foreach_get('value', r)
        sel = np.isin(np.rint(r).astype(int), ids)
        if not sel.any():
            continue
        mw = ob.matrix_world
        bm = bmesh.new()
        bm.from_mesh(me)
        bm.verts.ensure_lookup_table()
        faces = [f for f in bm.faces if all(sel[v.index] for v in f.verts)]
        idx = {}
        for f in faces:
            for v in f.verts:
                if v.index not in idx:
                    idx[v.index] = len(Vn)
                    Vn.append(tuple(mw @ v.co))
            Fn.append(tuple(idx[v.index] for v in f.verts))
        bmesh.ops.delete(bm, geom=faces, context='FACES')
        bm.to_mesh(me)
        bm.free()
    me = bpy.data.meshes.new(name)
    me.from_pydata(Vn, [], Fn)
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(M_OPT)
    scene.collection.objects.link(ob)
    return ob, np.array(Vn)


L = []
for sid, label_, names, tag, draw, dlen in ITEMS:
    ids = [BY_NAME[n] for n in names if n in BY_NAME]
    if not ids:
        print('MISSING', names, flush=True)
        continue
    bone = next(iter(RIG_REG[ids[0]]['bones']))
    ob, W = split_off(ids, f'item-{sid}')
    O = W.mean(axis=0)
    ev, evec = np.linalg.eigh(np.cov((W - O).T))
    ax_long, ax_mid, ax_out = evec[:, 2], evec[:, 1], evec[:, 0]
    cxy = np.array(TH_AX.get(bone, (0.0, -0.01)))
    away = unit(np.array([O[0] - cxy[0], O[1] - cxy[1], 0.0]))
    if ax_out @ away < 0:
        ax_out = -ax_out
    if draw == 'up':
        y = ax_long if ax_long[2] > 0 else -ax_long
    elif draw == 'fwd':
        y = ax_long if ax_long[1] < 0 else -ax_long
    else:
        y = ax_out
    z = ax_out if draw != 'out' else unit(np.cross(ax_long, y))
    x = unit(np.cross(y, z))
    R = np.column_stack([x, y, z])
    Lc = (W - O) @ R
    grip = (0.0, float(Lc[:, 1].max()), float(Lc[:, 2].max()) * 0.5)
    L.append(dict(id=sid, label=label_, bone=bone, objs=[ob], seat=None, O=O, R=R, allV=Lc, grip=grip,
                  draw=(0, 1, 0), drawLen=dlen, tag=tag, gap=RIG_REG[ids[0]].get('seatGapMm'), names=names))
    GARM.append(ob)
    print('ITEM', sid, names, bone, 'O', np.round(O, 3), 'extent', np.round(Lc.max(0) - Lc.min(0), 3), flush=True)

# --- skin: every object by the shipped rule (rigid_skin.py: rigid parts one bone, the rest the nearest body vertex) ----
from mathutils.kdtree import KDTree  # noqa: E402
BKD = KDTree(len(body.data.vertices))
for v in body.data.vertices:
    BKD.insert(body.matrix_world @ v.co, v.index)
BKD.balance()
BNAMES = [g.name for g in body.vertex_groups]
BW = [[(BNAMES[g.group], g.weight) for g in v.groups] for v in body.data.vertices]


def nearest_w(p):
    _, i, _ = BKD.find(p)
    return BW[i]


for ob in GARM:
    for m in list(ob.modifiers):
        if m.type == 'ARMATURE':
            ob.modifiers.remove(m)
    mw = ob.matrix_world
    rigid_skin.apply(ob, RIG_REG, nearest_w, [mw @ v.co for v in ob.data.vertices])
    a = ob.modifiers.new('arm', 'ARMATURE')
    a.object = rig
    ob.modifiers.move(len(ob.modifiers) - 1, 0)
for b in body.modifiers:
    if b.type == 'SUBSURF':
        SUB = b
print('SKINNED', len(GARM), flush=True)


def bone_parent(ob, bone):
    bpy.context.view_layer.update()
    mw = ob.matrix_world.copy()
    ob.parent = rig
    ob.parent_type = 'BONE'
    ob.parent_bone = bone
    bpy.context.view_layer.update()
    ob.matrix_world = mw


# --- harness for the rappel check (hidden elsewhere) ------------------------------------------------------------------
HARN = []


def band(name, c, axis, radius, width, thick, bone, seg=48):
    axis = unit(axis)
    u = unit(np.cross(axis, [0, 1, 0]) if abs(axis[1]) < 0.9 else np.cross(axis, [1, 0, 0]))
    v = np.cross(axis, u)
    V, F = [], []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        d = u * math.cos(t) + v * math.sin(t)
        for (rr, hh) in ((radius, -width / 2), (radius + thick, -width / 2), (radius + thick, width / 2), (radius, width / 2)):
            V.append(tuple(np.array(c) + d * rr + axis * hh))
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(4):
            a, b = i * 4 + k, i * 4 + (k + 1) % 4
            F.append((a, b, j * 4 + (k + 1) % 4, j * 4 + k))
    me = bpy.data.meshes.new(name)
    me.from_pydata(V, [], F)
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(M_HAR)
    scene.collection.objects.link(ob)
    bone_parent(ob, bone)
    HARN.append(ob)
    return ob


def thigh_radius(c, axis):
    axis = unit(axis)
    u = unit(np.cross(axis, [0, 1, 0]))
    v = np.cross(axis, u)
    rs = []
    for i in range(24):
        t = 2 * math.pi * i / 24
        d = u * math.cos(t) + v * math.sin(t)
        h, _ = ray(np.array(c) + d * 0.15, -d, 0.15)
        if h is not None:
            rs.append(float(np.linalg.norm(h - np.array(c) - axis * ((h - np.array(c)) @ axis))))
    return float(np.percentile(rs, 75))


USE_THIGH = True
for side, bn in ((1, 'hipL'), (-1, 'hipR')):
    bb = rig.data.bones[bn]
    hd, tl = np.array(bb.head_local), np.array(bb.tail_local)
    ax = unit(tl - hd)
    c = hd + ax * 0.13
    r = thigh_radius(c, ax) + 0.004
    band(f'legloop{bn}', c, ax, r, 0.035, 0.007, bn)
    print('LEGLOOP', bn, 'centre', np.round(c, 3), 'r', round(r, 3), flush=True)
USE_THIGH = False
# belay ring + descender at the belt centre front (pelvis)
bpy.ops.mesh.primitive_torus_add(major_radius=0.026, minor_radius=0.005, location=(0, -0.135, 0.905), rotation=(0, math.pi / 2, 0))
ring_ob = bpy.context.active_object
ring_ob.name = 'belayRing'
ring_ob.data.materials.append(M_HAR)
bone_parent(ring_ob, 'pelvis')
HARN.append(ring_ob)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.150, 0.845))
dsc = bpy.context.active_object
dsc.name = 'descender'
dsc.scale = (0.045, 0.018, 0.075)
bpy.ops.object.transform_apply(location=True, scale=True)
dsc.data.materials.append(M_HAR)
bone_parent(dsc, 'pelvis')
HARN.append(dsc)
for o in HARN:
    o.hide_render = True

# --- posing -----------------------------------------------------------------------------------------------------------
FRONT0 = Vector((0, -1, 0))


def frame(d, f):
    d = Vector(d).normalized()
    f = Vector(f)
    f = (f - d * d.dot(f)).normalized()
    s = d.cross(f)
    M = Matrix.Identity(3)
    M.col[0], M.col[1], M.col[2] = d, f, s
    return M


def set_frame(name, d1, f1):
    pb = rig.pose.bones[name]
    b = pb.bone
    Rrest = b.matrix_local.to_3x3()
    Rw = pb.matrix.to_3x3() @ Rrest.inverted()
    d0 = Rrest.col[1].normalized()
    dc, fc = Rw @ d0, Rw @ FRONT0
    R = frame(d1, f1) @ frame(dc, fc).transposed()
    h = pb.head.copy()
    pb.matrix = Matrix.Translation(h) @ R.to_4x4() @ Matrix.Translation(-h) @ pb.matrix
    bpy.context.view_layer.update()


def knee(td, tf, flex):
    """Shin direction and front for a knee flexed `flex` degrees from the thigh (td, tf)."""
    td, tf = Vector(td).normalized(), Vector(tf)
    tf = (tf - td * td.dot(tf)).normalized()
    a = math.radians(flex)
    return td * math.cos(a) - tf * math.sin(a), tf * math.cos(a) + td * math.sin(a)


def leg(side, d, f, flex):
    s = 'L' if side > 0 else 'R'
    set_frame('hip' + s, d, f)
    sd, sf = knee(d, f, flex)
    set_frame('kn' + s, sd, sf)


def mirror(v):
    return (-v[0], v[1], v[2])


def thigh(flex, abd, side):
    """Thigh direction / front for hip flexion `flex` and abduction `abd` (degrees)."""
    a, b = math.radians(flex), math.radians(abd)
    d = Vector((0, -math.sin(a), -math.cos(a)))
    f = Vector((0, -math.cos(a), math.sin(a)))
    Rb = Matrix.Rotation(-b * side, 3, 'Y')
    return Rb @ d, Rb @ f


def reset():
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def pose_prone():
    th = math.radians(78)
    d = Vector((math.sin(th), -0.03, -math.cos(th)))
    f = Vector((math.cos(th), 0, math.sin(th)))
    leg(1, d, f, 100)
    leg(-1, (-0.16, 0, -0.99), (0, -1, 0), 4)
    set_frame('shL', (0.62, -0.05, 0.78), (0, -1, 0))
    set_frame('elL', (-0.35, -0.12, 0.93), (0, -1, 0))
    set_frame('shR', (-0.62, -0.05, 0.78), (0, -1, 0))
    set_frame('elR', (0.35, -0.12, 0.93), (0, -1, 0))
    set_frame('neck', (0, 0.25, 0.97), (0, -0.97, 0.25))
    pb = rig.pose.bones['root']
    p = Vector((0, 0, 0.9))
    pb.matrix = Matrix.Translation(p) @ Matrix.Rotation(math.radians(90), 4, 'X') @ Matrix.Translation(-p) @ pb.matrix
    bpy.context.view_layer.update()


def pose_climb():
    d, f = thigh(95, 10, 1)
    leg(1, d, f, 100)
    set_frame('shL', (0.22, -0.05, 0.97), (0, 0.97, 0.22))
    set_frame('elL', (0.05, -0.12, 0.99), (0, 0.99, 0.12))
    set_frame('shR', (-0.22, -0.05, 0.97), (0, 0.97, 0.22))
    set_frame('elR', (-0.05, -0.12, 0.99), (0, 0.99, 0.12))


def pose_crouch():
    set_frame('pelvis', (0, 0.26, 0.966), (0, -0.966, 0.26))
    set_frame('spine', (0, -0.34, 0.94), (0, -0.94, -0.34))
    set_frame('chest', (0, -0.50, 0.87), (0, -0.87, -0.50))
    set_frame('neck', (0, -0.15, 0.99), (0, -0.99, -0.15))
    for sd in (1, -1):
        d, f = thigh(110, 22, sd)
        leg(sd, d, f, 140)
    set_frame('shL', (0.30, -0.55, -0.78), (0, -0.78, 0.55))
    set_frame('elL', (-0.30, -0.95, 0.10), (0, 0.1, 0.95))
    set_frame('shR', (-0.30, -0.55, -0.78), (0, -0.78, 0.55))
    set_frame('elR', (0.30, -0.95, 0.10), (0, 0.1, 0.95))


def pose_rappel():
    set_frame('pelvis', (0, 0.17, 0.985), (0, -0.985, 0.17))
    set_frame('spine', (0, 0.30, 0.95), (0, -0.95, 0.30))
    set_frame('chest', (0, 0.26, 0.96), (0, -0.96, 0.26))
    for sd in (1, -1):
        d, f = thigh(82, 14, sd)
        leg(sd, d, f, 55)
    set_frame('shL', (0.15, -0.45, 0.88), (0, -0.88, -0.45))
    set_frame('elL', (0.05, -0.30, 0.95), (0, -0.95, -0.30))
    set_frame('shR', (-0.30, 0.22, -0.93), (0, -1, 0))
    set_frame('elR', (-0.12, 0.42, -0.90), (0, -1, 0))


# Step 11b fix round 1 (item 4): the game rig's own crouch and sneak (optional: the removed Operator Lab's sheet script
# wrote <build>/wren-game-poses.json, per node its bind and posed
# world position / rotation in the game frame). Each bone's pose: the same world delta about its bind head.
GAME_POSES = json.load(open(os.path.join(BUILD, 'wren-game-poses.json'))) if os.path.exists(
    os.path.join(BUILD, 'wren-game-poses.json')) else None
CG = Matrix(((-1.0, 0.0, 0.0), (0.0, 0.0, -1.0), (0.0, 1.0, 0.0)))     # common.game_to_blender as a matrix


def qmat(q):
    x, y, z, w = q
    return Matrix(((1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)),
                   (2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)),
                   (2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y))))


def pose_game(pid):
    def f():
        g = GAME_POSES[pid]
        idx = {n: i for i, n in enumerate(g['names'])}
        target = {}
        for b in rig.data.bones:
            i = idx.get(b.name)
            if i is None:
                continue
            D = CG @ (qmat(g['rot'][i]) @ qmat(g['bindRot'][i]).transposed()) @ CG.transposed()
            P = CG @ Vector(g['pos'][i])
            H = b.head_local
            GAME_POSES.setdefault('_bindErrMm', {})[b.name] = round((CG @ Vector(g['bindPos'][i]) - H).length * 1000, 2)
            target[b.name] = Matrix.Translation(P) @ D.to_4x4() @ Matrix.Translation(-H) @ b.matrix_local
        depth = {b.name: len(b.parent_recursive) for b in rig.data.bones}
        for name in sorted(target, key=lambda n: depth[n]):
            b = rig.data.bones[name]
            if b.parent is None:
                basis = b.matrix_local.inverted() @ target[name]
            else:
                pp = target.get(b.parent.name, b.parent.matrix_local)
                basis = b.matrix_local.inverted() @ b.parent.matrix_local @ pp.inverted() @ target[name]
            rig.pose.bones[name].matrix_basis = basis
        bpy.context.view_layer.update()
        err = max((rig.pose.bones[n].matrix.translation - target[n].translation).length for n in target)
        print('GAME POSE', pid, 'bones', len(target), 'worst head error mm', round(err * 1000, 2),
              'worst bind mismatch mm', max(GAME_POSES['_bindErrMm'].values()), flush=True)
    return f


POSES = [('rest', None), ('prone', pose_prone), ('climb', pose_climb), ('crouch', pose_crouch), ('rappel', pose_rappel)]
if GAME_POSES is not None:
    POSES += [('gameCrouch', pose_game('crouch')), ('gameSneak', pose_game('sneak'))]
else:
    print('POSE CHECK: no wren-game-poses.json: game poses skipped', flush=True)
PNAME = {'gameCrouch': "the game's crouch (CharacterRig crouch 1, labData POSES)",
         'gameSneak': "the game's sneak (crouch 0.6, walking, labData POSES)",
         'prone': 'prone crawl, left knee drawn up', 'climb': 'rope / ladder climb, left knee to hip height',
         'crouch': 'deep crouch', 'rappel': 'rappel seat (leg loops + belay ring modelled)'}

# --- measuring --------------------------------------------------------------------------------------------------------
REGION_OF = {}
for vg in body.vertex_groups:
    n = vg.name
    if n.endswith('L') and n[:-1] in ('hip',):
        REGION_OF[vg.index] = 'thighL'
    elif n.endswith('R') and n[:-1] in ('hip',):
        REGION_OF[vg.index] = 'thighR'
    elif n.startswith(('knL', 'anL', 'toeL', 'toesL')):
        REGION_OF[vg.index] = 'shinL'
    elif n.startswith(('knR', 'anR', 'toeR', 'toesR')):
        REGION_OF[vg.index] = 'shinR'
    elif n.startswith(('shL', 'elL', 'wrL', 'handL', 'fingerL')):
        REGION_OF[vg.index] = 'armL'
    elif n.startswith(('shR', 'elR', 'wrR', 'handR', 'fingerR')):
        REGION_OF[vg.index] = 'armR'
    else:
        REGION_OF[vg.index] = 'torso'
VREG = []
for v in body.data.vertices:
    g = max(v.groups, key=lambda e: e.weight) if len(v.groups) else None
    VREG.append(REGION_OF.get(g.group, 'torso') if g else 'torso')
REGIONS = ['torso', 'thighL', 'thighR', 'shinL', 'shinR', 'armL', 'armR']


def posed_body():
    SUB.show_viewport = False
    dg2 = bpy.context.evaluated_depsgraph_get()
    me = body.evaluated_get(dg2).to_mesh()
    V = np.array([tuple(body.matrix_world @ v.co) for v in me.vertices])
    F = [tuple(p.vertices) for p in me.polygons]
    body.evaluated_get(dg2).to_mesh_clear()
    SUB.show_viewport = True
    T = {}
    for r in REGIONS:
        Fr = [f for f in F if VREG[f[0]] == r]
        T[r] = BVHTree.FromPolygons([tuple(v) for v in V], Fr) if Fr else None
    T['all'] = BVHTree.FromPolygons([tuple(v) for v in V], F)
    T['freg'] = [VREG[f[0]] for f in F]
    return V, T


def obj_world_verts(ob):
    dg2 = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(dg2).to_mesh()
    V = np.array([tuple(ob.matrix_world @ v.co) for v in me.vertices])
    F = [tuple(p.vertices) for p in me.polygons]
    ob.evaluated_get(dg2).to_mesh_clear()
    return V, F


def signed_min(V, T, other=None):
    """Min signed distance of points V to a closed mesh T (inside < 0; the sign is trusted within 40 mm only).
    `other`: the item's own tree, to force a negative when the two meshes overlap."""
    best, bp = 1e9, None
    for v in V:
        loc, nrm, _, d = T.find_nearest(Vector(tuple(v)))
        if loc is None:
            continue
        s = -d if (d < 0.008 and (Vector(tuple(v)) - loc).dot(nrm) < 0) else d
        if s < best:
            best, bp = s, v
    if other is not None and best > 0 and T.overlap(other):
        best = -0.5e-3
    return best, bp


def region_min(V, T):
    """Per body region: min signed distance, each point attributed to the region of its nearest body face."""
    out = {}
    for v in V:
        loc, nrm, idx, d = T['all'].find_nearest(Vector(tuple(v)))
        if loc is None:
            continue
        s = -d if (d < 0.04 and (Vector(tuple(v)) - loc).dot(nrm) < 0) else d
        rg = T['freg'][idx]
        if rg not in out or s < out[rg][0]:
            out[rg] = (s, v)
    return out


def item_verts(s, dense=True):
    Vs = []
    for o in s['objs']:
        V, F = obj_world_verts(o)
        Vs.append(V)
        if dense:      # a 5 x 5 grid on every quad so a long flat face registers contact
            for f in F:
                if len(f) != 4:
                    continue
                a, b, c, d = (V[i] for i in f)
                for u in np.linspace(0, 1, 5):
                    for v in np.linspace(0, 1, 5):
                        Vs.append(((a * (1 - u) + b * u) * (1 - v) + (d * (1 - u) + c * u) * v)[None])
    return np.vstack(Vs)


def item_tree(s):
    V, F = [], []
    for o in s['objs']:
        v, f = obj_world_verts(o)
        off = len(V)
        V += [tuple(x) for x in v]
        F += [tuple(i + off for i in ff) for ff in f]
    return BVHTree.FromPolygons(V, F)


def to_world(s, p_local):
    """A point in the item's local frame -> posed world (via the item object's matrix, which carries the bone)."""
    O, R = s['O'], s['R']
    rest = O + R @ np.array(p_local)
    return np.array(s['objs'][0].matrix_world @ Vector(tuple(rest))), s['objs'][0].matrix_world.to_3x3()


def lower_support(P, axis_i):
    """Prone: the line (in the plane of axis_i and z) the body rests on: the lower convex hull edge under the pelvis."""
    pts = sorted(zip(P[:, axis_i], P[:, 2]))
    hull = []
    for p in pts:
        while len(hull) >= 2 and ((hull[-1][0] - hull[-2][0]) * (p[1] - hull[-2][1]) - (hull[-1][1] - hull[-2][1]) * (p[0] - hull[-2][0])) <= 0:
            hull.pop()
        hull.append(p)
    return hull


GARM_OBST = ['wren-armour-plate', 'wren-armour-trim', 'wren-waist_belt-lam', 'wren-chest_rig-lam', 'wren-leg_kit-elastic',
             'wren-leg_kit-lam', 'wren-leg_kit-poly']
MEAS = [s for s in L if not s.get('soft')]


HID = {s['id'] for s in L if s.get('hidden')}


def others(s, trees, nosib):
    out = []
    for k2, t2 in trees.items():
        if k2 == s['id'] or (k2 in HID and s['id'] not in HID) or (s['id'] in HID and k2[:2] in ('PA', 'PB', 'PV', 'R1', 'RH')):
            continue
        if nosib and k2[:2] == s['id'][:2]:
            continue
        out.append((k2, t2))
    return out


def measure(pname):
    V, T = posed_body()
    res = {}
    ground = None
    if pname == 'prone':
        P = [V]
        for n in ('wren-armour-plate', 'wren-waist_belt-lam', 'wren-leg_kit-elastic', 'wren-approach_boots-sole'):
            P.append(obj_world_verts(bpy.data.objects[n])[0])
        P = np.vstack(P)
        P = P[(P[:, 1] > -0.75) & (P[:, 1] < 0.95)]      # the trunk and legs (forearms ahead excluded)
        hull = lower_support(P, 1)
        # the hull edge under the hip joint
        yh = float(np.array(rig.matrix_world @ rig.pose.bones['pelvis'].head)[1])
        for a, b in zip(hull[:-1], hull[1:]):
            if a[0] <= yh <= b[0]:
                k = (b[1] - a[1]) / (b[0] - a[0])
                ground = (a[0], a[1], k)
        if ground is None:
            ground = (0.0, float(P[:, 2].min()), 0.0)
    obst_g = [obj_world_verts(bpy.data.objects[n]) for n in GARM_OBST]
    gV, gF = [], []
    for v, f in obst_g:
        off = len(gV)
        gV += [tuple(x) for x in v]
        gF += [tuple(i + off for i in ff) for ff in f]
    GT = BVHTree.FromPolygons(gV, gF)
    trees = {s['id']: item_tree(s) for s in MEAS}
    harn = {}
    if pname == 'rappel':
        for o in HARN:
            v, f = obj_world_verts(o)
            harn[o.name] = BVHTree.FromPolygons([tuple(x) for x in v], f)
        harn['rope'] = ROPE_T
    for s in MEAS:
        Vi = item_verts(s)
        r = {'regions': {}, 'items': {}, 'ground': None, 'harness': {}}
        for rg, (d, p) in region_min(Vi, T).items():
            r['regions'][rg] = (round(d * 1000, 1), [round(float(x), 4) for x in p])
        for s2 in MEAS:
            if s2['id'] == s['id'] or s2['bone'] == s['bone'] or (s2.get('hidden') and not s.get('hidden')) or (s.get('hidden') and s2['id'][:2] in ('PA', 'PB', 'PV', 'R1', 'RH')):
                continue
            d, p = signed_min(Vi, trees[s2['id']], trees[s['id']])
            r['items'][s2['id']] = (round(d * 1000, 1), [round(float(x), 4) for x in p] if p is not None else None)
        if ground is not None:
            y0, z0, k = ground
            zl = z0 + k * (Vi[:, 1] - y0)
            pen = zl - Vi[:, 2]
            i = int(np.argmax(pen))
            r['ground'] = (round(float(pen[i]) * 1000, 1), [round(float(x), 4) for x in Vi[i]])
        for hn, ht in harn.items():
            d, p = signed_min(Vi, ht, trees[s['id']])
            r['harness'][hn] = (round(d * 1000, 1), [round(float(x), 4) for x in p] if p is not None else None)
        # draw path: rays from the grip end along the draw direction
        g, M3 = to_world(s, s['grip'])
        dirw = np.array(M3 @ Vector(tuple(s['R'] @ np.array(s['draw']) + 0.25 * s['R'][:, 2])))
        dirw = unit(dirw)
        xs = s['allV'][:, 0]
        hits, by = 0, {}
        n = 0
        for dx in (-0.6, 0.0, 0.6):
            for dz in (0.2, 0.6, 1.0):
                loc = np.array(s['grip'], float)
                loc = loc + np.array([dx * (xs.max() - xs.min()) / 2, 0, (dz - 0.5) * 0.02])
                o, _ = to_world(s, tuple(loc))
                o = o + dirw * 0.004
                n += 1
                best = (s['drawLen'], None)
                for nm, tr in [('body', T['all']), ('kit', GT)] + others(s, trees, False):
                    hl = tr.ray_cast(Vector(tuple(o)), Vector(tuple(dirw)), s['drawLen'])
                    if hl[0] is not None and hl[3] < best[0]:
                        best = (hl[3], nm)
                if ground is not None:
                    y0, z0, k = ground
                    for t in np.linspace(0, s['drawLen'], 30):
                        q = o + dirw * t
                        if q[2] < z0 + k * (q[1] - y0) and t < best[0]:
                            best = (t, 'ground')
                            break
                if best[1]:
                    hits += 1
                    by[best[1]] = by.get(best[1], 0) + 1
        # hand room at the grip: free distance around a point 15 mm out from the grip end
        gp = g + dirw * 0.015
        room = 1e9
        rby = None
        for nm, tr in [('body', T['all'])] + others(s, trees, True):
            loc, _, _, d = tr.find_nearest(Vector(tuple(gp)))
            if loc is not None and d < room:
                room, rby = d, nm
        if ground is not None:
            y0, z0, k = ground
            dgd = gp[2] - (z0 + k * (gp[1] - y0))
            if dgd < room:
                room, rby = dgd, 'ground'
        r['draw'] = {'blocked': f'{hits}/{n}', 'by': by, 'handRoomMm': round(room * 1000, 1), 'roomBy': rby}
        res[s['id']] = r
    return res, ground


# --- verdicts ---------------------------------------------------------------------------------------------------------
def verdict(rest, cur, pname, s):
    red, amb = [], []
    for rg, (d, p) in cur['regions'].items():
        d0 = rest['regions'].get(rg, (1e9,))[0]
        if d0 > 1e8:
            d0 = 999.0
        if d < d0 - 3.0:
            if d < 3.0:
                red.append((f'presses into {rg} ({d:+.0f} mm, rest {d0:.0f})', p))
            elif d < 15.0:
                amb.append((f'{d:.0f} mm from {rg} (rest {d0:.0f})', p))
    for it, (d, p) in cur['items'].items():
        if d < 2.0:
            red.append((f'hits {it} ({d:+.0f} mm)', p))
        elif d < 10.0:
            amb.append((f'{d:.0f} mm from {it}', p))
    if cur['ground'] is not None:
        g, p = cur['ground']
        if g > 2.0:
            red.append((f'on the ground: {g:.0f} mm below the body line', p))
        elif g > -10.0:
            amb.append((f'{-g:.0f} mm above the ground', p))
    for hn, (d, p) in cur['harness'].items():
        if d < 2.0:
            red.append((f'under / hits {hn} ({d:+.0f} mm)', p))
        elif d < 10.0:
            amb.append((f'{d:.0f} mm from {hn}', p))
    dr = cur['draw']
    hb, n = map(int, dr['blocked'].split('/'))
    hb0 = int(rest['draw']['blocked'].split('/')[0])
    room0 = rest['draw']['handRoomMm']
    if hb <= hb0 and dr['handRoomMm'] >= min(room0 - 3.0, 20.0):
        return red, amb
    if hb >= 5 or dr['handRoomMm'] < 5:
        red.append((f"draw blocked {dr['blocked']} by {dr['by']}, hand room {dr['handRoomMm']:.0f} mm ({dr['roomBy']})", None))
    elif hb > 0 or dr['handRoomMm'] < 20:
        amb.append((f"draw {dr['blocked']} rays hit {dr['by']}, hand room {dr['handRoomMm']:.0f} mm ({dr['roomBy']})", None))
    return red, amb


# --- rendering --------------------------------------------------------------------------------------------------------
RD.use_gpu(scene, SAMPLES)
scene.view_settings.look = 'None'
scene.render.resolution_x, scene.render.resolution_y = TW, TH
scene.render.film_transparent = False
w = bpy.data.worlds.new('d28L')
w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.05, 0.055, 0.06, 1)
scene.world = w
for nm, loc, en in (('key', (-1.2, -2.0, 2.2), 5.0), ('fill', (1.8, -1.0, 1.4), 2.5), ('rim', (0.5, 2.0, 2.0), 3.0),
                    ('top', (0.0, 0.0, 3.0), 1.5)):
    ld = bpy.data.lights.new(nm, 'SUN')
    ld.energy = en
    lo = bpy.data.objects.new(nm, ld)
    lo.rotation_euler = (Vector((0, 0, 1.0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(lo)
CAM = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
scene.collection.objects.link(CAM)
scene.camera = CAM
TXT = []


def label(lines):
    for t in TXT:
        bpy.data.objects.remove(t)
    TXT.clear()
    c = CAM.data
    if c.type == 'ORTHO':
        hh, d = c.ortho_scale / 2, 1.0
    else:
        d = 0.5
        hh = d * (c.sensor_height / 2) / c.lens
    hw = hh * TW / TH
    sz = hh * 0.042
    bh = (2.6 + 1.0 * (len(lines) - 1)) * sz
    me = bpy.data.meshes.new('lbg')
    me.from_pydata([(-hw, hh - bh, -d - 0.001), (hw, hh - bh, -d - 0.001), (hw, hh, -d - 0.001), (-hw, hh, -d - 0.001)], [], [(0, 1, 2, 3)])
    bg = bpy.data.objects.new('lbg', me)
    bg.data.materials.append(M_BG)
    scene.collection.objects.link(bg)
    bg.parent = CAM
    bg.visible_shadow = False
    TXT.append(bg)
    for i, s in enumerate(lines):
        cu = bpy.data.curves.new(f't{i}', 'FONT')
        cu.body = s
        cu.size = sz * (1.0 if i == 0 else 0.74)
        t = bpy.data.objects.new(f't{i}', cu)
        t.data.materials.append(M_TXT if i == 0 or not s.startswith('RED') else M_RED)
        scene.collection.objects.link(t)
        t.parent = CAM
        t.visible_shadow = False
        t.location = (-hw * 0.96, hh - sz * 1.25 - i * sz * 1.0, -d)
        TXT.append(t)


def set_cam(dirv, tgt, scale, persp=False, up=(0, 0, 1)):
    tgt = Vector(tgt)
    c = CAM.data
    dirv = Vector(dirv).normalized()
    if persp:
        c.type = 'PERSP'; c.lens = 60; c.sensor_width = 36; c.sensor_height = 36; c.sensor_fit = 'VERTICAL'
        loc = tgt + dirv * scale * 60 / 36 * 1.05
    else:
        c.type = 'ORTHO'; c.ortho_scale = scale; c.sensor_fit = 'VERTICAL'
        loc = tgt + dirv * 3.0
    c.clip_start, c.clip_end = 0.05, 10
    CAM.location = loc
    CAM.rotation_euler = (tgt - loc).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()


def shoot(fn, lines):
    label(lines)
    scene.render.filepath = os.path.join(TILES, fn)
    scene.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
    return scene.render.filepath


def sheet(files, cols, name):
    rows = (len(files) + cols - 1) // cols
    W, H = TW * cols, TH * rows
    A = np.zeros((H, W, 4), np.float32)
    A[..., 3] = 1
    for k, f in enumerate(files):
        r, c = divmod(k, cols)
        im = bpy.data.images.load(f)
        px = np.array(im.pixels[:], np.float32).reshape(TH, TW, 4)
        y0 = H - (r + 1) * TH
        A[y0:y0 + TH, c * TW:(c + 1) * TW] = px
        bpy.data.images.remove(im)
    A[:, ::TW, :3] = 0.6
    A[::TH, :, :3] = 0.6
    img = bpy.data.images.new(name, W, H, alpha=True)
    img.pixels.foreach_set(A.ravel())
    img.filepath_raw = os.path.join(OUT, name + '.webp')
    img.file_format = 'WEBP'
    img.save()
    return img.filepath_raw


TAGS = []


def tags(on):
    for t in TAGS:
        bpy.data.objects.remove(t)
    TAGS.clear()
    if not on:
        return
    done = set()
    for s in L:
        if s.get('hidden') or not s['tag']:
            continue
        key = s['tag'] + s['id'][:1] if s['tag'] != '4' else s['id']
        c = s['O'] + s['R'] @ np.array([0, 0, 0.045])
        cu = bpy.data.curves.new('tag', 'FONT')
        cu.body = s['tag']
        cu.size = 0.028
        cu.align_x = 'CENTER'
        cu.align_y = 'CENTER'
        t = bpy.data.objects.new('tag', cu)
        t.data.materials.append(M_TAG)
        scene.collection.objects.link(t)
        t.location = tuple(c)
        cn = t.constraints.new('COPY_ROTATION')
        cn.target = CAM
        t.visible_shadow = False
        TAGS.append(t)


MARK = []


def markers(points, mat_):
    for p in points:
        if p is None:
            continue
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.011, location=tuple(p), segments=16, ring_count=8)
        o = bpy.context.active_object
        o.data.materials.append(mat_)
        MARK.append(o)


def clear_marks():
    for o in MARK:
        bpy.data.objects.remove(o)
    MARK.clear()
    for s in L:
        for o in s['objs']:
            o.data.materials[0] = M_SOFT if s.get('soft') else M_OPT


ROPE_T = None
ROPE_OBS = []


def make_rope():
    global ROPE_T
    for o in ROPE_OBS:
        bpy.data.objects.remove(o)
    ROPE_OBS.clear()
    dsc_w = np.array(dsc.matrix_world @ Vector((0, -0.150, 0.845)))
    top = dsc_w + np.array([0, -0.30, 0.95])
    hand = np.array(rig.matrix_world @ rig.pose.bones['wrR'].tail)
    low = hand + np.array([0, 0.05, -0.35])
    pts = [top, dsc_w + np.array([0, -0.01, 0.04]), dsc_w + np.array([0, -0.01, -0.04]), hand, low]
    cu = bpy.data.curves.new('rope', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.0055
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new('rope', cu)
    o.data.materials.append(M_HAR)
    scene.collection.objects.link(o)
    ROPE_OBS.append(o)
    bpy.context.view_layer.update()
    dg2 = bpy.context.evaluated_depsgraph_get()
    me = o.evaluated_get(dg2).to_mesh()
    V = [tuple(o.matrix_world @ v.co) for v in me.vertices]
    F = [tuple(p.vertices) for p in me.polygons]
    o.evaluated_get(dg2).to_mesh_clear()
    ROPE_T = BVHTree.FromPolygons(V, F)


GROUND_OBS = []


def make_ground(ground):
    y0, z0, k = ground
    me = bpy.data.meshes.new('ground')
    ys = (-1.2, 1.2)
    me.from_pydata([(-1.2, ys[0], z0 + k * (ys[0] - y0) - 0.001), (1.2, ys[0], z0 + k * (ys[0] - y0) - 0.001),
                    (1.2, ys[1], z0 + k * (ys[1] - y0) - 0.001), (-1.2, ys[1], z0 + k * (ys[1] - y0) - 0.001)], [], [(0, 1, 2, 3)])
    o = bpy.data.objects.new('ground', me)
    o.data.materials.append(M_GND)
    scene.collection.objects.link(o)
    GROUND_OBS.append(o)


# --- run --------------------------------------------------------------------------------------------------------------
RESULTS = {'variant': VAR, 'gaps': {s['id']: s['gap'] for s in L}, 'poses': {}}
REST = None
renders = {}
for pname, fn in POSES:
    reset()
    for o in ROPE_OBS + GROUND_OBS:
        bpy.data.objects.remove(o)
    ROPE_OBS.clear(); GROUND_OBS.clear()
    if fn:
        fn()
    for o in HARN:
        o.hide_render = pname != 'rappel'
    if pname == 'rappel':
        make_rope()
    res, ground = measure(pname)
    if pname == 'rest':
        REST = res
        RESULTS['rest'] = res
    else:
        out = {}
        for s in MEAS:
            red, amb = verdict(REST[s['id']], res[s['id']], pname, s)
            out[s['id']] = {'red': [r[0] for r in red], 'amber': [a[0] for a in amb], 'raw': res[s['id']]}
        RESULTS['poses'][pname] = {'ground': ground, 'items': out}
    print('MEASURED', pname, flush=True)
    if not RENDER:
        continue
    bpy.context.view_layer.update()
    if pname == 'rest':
        tags(True)
        lines0 = ['Wren as built (step 11b, D28): the rigid items, rest pose',
                  "1 rifle mags x2 (chest, base up)  2 pistol mags x2 (9 o'clock, horizontal)",
                  '3 knife 190 mm (outer-front left thigh, handle up)  4 throwable canisters x3 (outer thigh)',
                  '5 drone pod (rear right, A88)  6 holster (right thigh)   orange = rigid item']
        files = []
        for vn, dv, tg, sc, ps in (('front', (0, -1, 0), (0.02, 0, 0.95), 0.95, False), ('left', (1, 0, 0), (0.02, 0, 0.95), 0.95, False),
                                   ('right', (-1, 0, 0), (0.02, 0, 0.95), 0.95, False), ('back', (0, 1, 0), (0.02, 0, 0.95), 0.95, False),
                                   ('34front', (0.6, -0.8, 0.12), (0.05, -0.05, 0.92), 0.85, True)):
            set_cam(dv, tg, sc, ps)
            files.append(shoot(f'rest-{vn}.png', [lines0[0] + f'  [{vn}]'] + lines0[1:]))
        tags(False)
        renders['rest'] = sheet(files, 5, 'wren-pose-rest')
        continue
    # mark interferences
    reds, ambs = [], []
    for s in MEAS:
        if s.get('hidden'):
            continue
        v = RESULTS['poses'][pname]['items'][s['id']]
        red, amb = verdict(REST[s['id']], res[s['id']], pname, s)
        if red:
            for o in s['objs']:
                o.data.materials[0] = M_RED
            markers([p for _, p in red], M_RED)
            reds.append(f"{s['id']}: " + '; '.join(r[0] for r in red))
        elif amb:
            for o in s['objs']:
                o.data.materials[0] = M_YEL
            ambs.append(f"{s['id']}: " + '; '.join(a[0] for a in amb))
    if ground is not None:
        make_ground(ground)
    # frame on the kit
    C = np.mean([np.array(s['objs'][0].matrix_world @ Vector(tuple(s['O']))) for s in MEAS if not s.get('hidden')], axis=0)
    files = []
    if pname == 'prone':
        views = (('left', (1, 0, 0.0), 0.9, False), ('34high', (0.75, 0.35, 0.56), 0.85, True))
    elif pname == 'rappel':
        views = (('left', (1, 0, 0), 1.0, False), ('34front', (0.55, -0.8, 0.25), 0.9, True))
    else:
        views = (('left', (1, 0, 0), 1.0, False), ('34front', (0.6, -0.78, 0.18), 0.9, True))
    lines = [f'Wren as built: {PNAME[pname]}', 'red = interference, amber = tight (<15 mm), orange = clear']
    lines += ['RED ' + r[:120] for r in reds[:7]]
    lines += ['amb ' + a[:120] for a in ambs[:4]]
    for vn, dv, sc, ps in views:
        set_cam(dv, C, sc, ps)
        files.append(shoot(f'{pname}-{vn}.png', [lines[0] + f'  [{vn}]'] + lines[1:]))
    renders[pname] = sheet(files, 2, f'wren-pose-{pname}')
    clear_marks()
RESULTS['renders'] = renders
for s in L:
    s.pop('objs', None); s.pop('seat', None)
    s['O'] = [round(float(x), 4) for x in s['O']]
    s['R'] = [[round(float(x), 3) for x in r] for r in s['R']]
    s.pop('allV', None)
    s['grip'] = list(s['grip'])
RESULTS['layout'] = L
json.dump(RESULTS, open(os.path.join(BUILD, 'wren-poses.json'), 'w'), indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
print('D28L DONE', VAR, renders, flush=True)
