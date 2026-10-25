"""Stage: baked maps, LODs and glTF per LOD (step 10, SPEC 6.3-6.4, DECISIONS D21, A40, A69-A71).

The source is the last garment's blend (the body, the rig and every built item, about 2.4 M render triangles). Its
render meshes are joined into one source mesh that keeps every procedural material. Each LOD is decimated from the one
above it (hero from the source, LOD0 from the hero, LOD1 from LOD0, LOD2 from LOD1), so the silhouette is the same
family; per LOD the faces are regrouped by material group into atlases (hero: cloth, kit, hardware, glow; LOD0 / LOD1:
cloth, kit, glow; LOD2: one atlas, glow), unwrapped, and baked from the source in Cycles on the GPU
(selected to active): albedo, tangent normal (the procedural micro-emboss, perforation, pebble, tape edges and the
source's stitches and folds) and packed occlusion / roughness / metal (glTF: R occlusion, G roughness, B metal). LOD1
has its own 1K set (A71: decimating with LOD0's atlas UVs kept stalls at twice the LOD1 budget). Desktop only (D29): no
phone LOD. Every LOD is skinned by nearest body vertex (the Lab export's rule) except the rigid parts (D28, step 11b,
rigid_skin.py: one bone or one fixed blend per part, identical on every vertex; they stay separate pieces below LOD0
and carry their part id as the '_rigid' glTF attribute for operators:check); the game LODs carry the game joints only
(anim-rig: toe weights to the toe joint at the ball, toeL / toeR; anim-skeleton S1: LOD0 / LOD1 keep the hero's finger
joints and weights and get knuckle loops on the glove fingers, LOD2's finger weights go to the wrist, and every LOD has
the clavicle joints clavL / clavR with the chest weight near each shoulder split onto them, and the goggle parts on
their own head joints goggleUse / goggleStow: ../../anim-skeleton/py/
skeleton.py, the same rules as scripts/anim-skeleton/skin.mjs). Every LOD carries the integration anchors (A40, A41) as
empties parented to the joints that carry them.

Writes <out>/export/<lod>/<op>-<lod>.glb (WebP inside), <out>/export/<lod>/textures/*.png (the KTX2 encoder input),
<out>/<op>-lab-<lod>.glb (the Lab's copy), <out>/export/report.json and README.md, and with --render the hero / LOD
side-by-side renders (Cycles on the GPU) into --dest.
"""
import json
import math
import os
import shutil
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(__file__))
import common  # noqa: E402
import render as R  # noqa: E402
import rigid_skin  # noqa: E402
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'anim-skeleton', 'py'))
import skeleton  # noqa: E402  (anim-skeleton S1: clavicle and finger joints, knuckle loops)

# guard-models G4: `--guard` hands the run to the guard mode (bake_guard.py; guard-lods.mjs runs it). Without it nothing
# below changes, so Wren's outputs stay byte-identical.
if '--guard' in (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []):
    import bake_guard  # noqa: E402
    bake_guard.main()
    raise SystemExit(0)

args = common.parse_args({
    '--operator': {'required': True},
    '--garment': {'action': 'append', 'default': []},
    '--out': {'required': True},
    '--dest': {'default': ''},
    '--render': {'action': 'store_true'},
    '--scale': {'type': float, 'default': 1.0},      # texture size scale (iteration only; reports say so)
    '--samples': {'type': int, 'default': 64},
})
common.check_version()
T0 = time.time()
op_id = args.operator
OUT = args.out
EXP = os.path.join(OUT, 'export')
src_blend = os.path.join(OUT, f'{op_id}-{args.garment[-1]}.blend')
bpy.ops.wm.open_mainfile(filepath=src_blend)
common.seed_everything(args.seed)
scene = bpy.context.scene
gpus = R.use_gpu(scene, 8)


def log(*a):
    print(f'[bake {time.time() - T0:7.1f}s]', *a, flush=True)


# ---------------------------------------------------------------- LOD table (SPEC 6.4; A69-A71)
GROUPS = {  # LOD: atlas groups (texture size, before --scale); 'glow' is the goggle lens: constant factors, no maps
    'hero': [('cloth', 4096), ('kit', 2048), ('hardware', 2048), ('glow', 0)],
    'lod0': [('cloth', 2048), ('kit', 2048), ('glow', 0)],
    'lod1': [('cloth', 1024), ('kit', 1024), ('glow', 0)],   # own set (A71: UV-keeping decimation stalls at 2x)
    'lod2': [('atlas', 1024), ('glow', 0)],
}
TARGET_TRIS = {'hero': 230000, 'lod0': 40000, 'lod1': 13600, 'lod2': 6000}  # lod2 5200 -> 5600 in fix round 3 (A77), 6000 in the step 10 retry (A95: the placard pieces); lod1 13500 -> 13600 in 11b r1 (A89)
# Cage (selected to active): the ray starts this far outside the LOD surface and looks twice as far inward.
CAGE = {'hero': 0.010, 'lod0': 0.020, 'lod1': 0.020, 'lod2': 0.060}  # lod1 3 -> 2 cm in fix round 3 (A76)
# Faces left to the maps (A70): stitches from LOD0 down, zip teeth from LOD1 down; pieces smaller than this
# (bounding-box diagonal, m) are dropped at the level (keepers, cord locks, rivets read in the maps).
DROP_MATS = {'lod0': {'thread'}, 'lod1': {'thread', 'zip teeth'}, 'lod2': {'thread', 'zip teeth'}}
DROP_SMALL = {'lod1': 0.012, 'lod2': 0.045}
# Covered faces (a ray along the face normal meets another surface within this reach: layers under layers, the inner
# walls of solidified cloth) leave LOD1 and LOD2, so their budget goes to what can be seen (A70).
# (fix round 1: LOD1 and LOD2 are shells now, so no level culls; the multi-ray cull stays for a layered level)
CULL_COVERED = {}
# LOD1 and LOD2 are closed shells (fix round 1, A74): the hero minus the pieces kept separate,
# voxel-remeshed at SHELL_VOXEL (the union of every layer: nothing inside can poke through, no holes), then decimated;
# the separate pieces (their share of the budget at most) join it again. Only the lens stays separate: kept separate at
# LOD1, the decimated plates and rib segments let the shell under them show through (fix round 1 trial), so below LOD0
# they are part of the shell and bend with it (no gaps possible).
SHELL_VOXEL = 0.0025
# fix round 2 (A76): the shell's flat faces (holster face, back plate) meet their sides at near right angles; smooth
# vertex normals there tilt up to 45 deg and, interpolated across the decimator's long sliver triangles, send the cage
# rays (3-6 cm out) sideways onto the holster sides, the pistol and the plate rim: dark diagonal slashes and torn wedges
# in the maps. Edges sharper than this angle are split, so a flat face bakes along its own normal (50 deg rendered the
# same; thin arcs left on the holster face are OPEN, A76).
SHELL_SHARP_DEG = 30.0
# fix round 3 (A76): the same split on LOD0 (the layered level) against its OPEN bake errors at near right-angle edges
# (thigh-band lower edge, buckles, chest-plate top edge, boot toe). Undo: SHARP_SPLIT = {}.
SHARP_SPLIT = {'lod0': 30.0}
SHARP_ABOVE_Z = -1.0   # m: everywhere since the step 10 retry (A95; was 0.20: the split stopped at the boots)
GAME_JOINTS = ['pelvis', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR',
               'hipL', 'knL', 'anL', 'toeL', 'hipR', 'knR', 'anR', 'toeR']  # anim-rig: the toe joints skinned
# (anim-skeleton S1) also skinned, but not rig joints yet (they follow chest / wrist / head until S2): clavL / clavR and
# goggleStow / goggleUse on every LOD, the hero's 30 finger joints on LOD0 / LOD1 (skeleton.FINGER_LODS)

CLOTH_PREFIX = ('suit', 'glove', 'hood', 'balaclava')
CLOTH = {'thread', 'binding', 'loop', 'knit', 'ripstop', 'ripstop patch', 'softshell', 'softshell patch',
         'compression knit', 'cordura'}
HARDWARE = {'hardware gunmetal', 'hardware metal', 'gunmetal', 'anodised aluminium', 'zip slider'}
GLOW = {'goggle lens'}
SHELL_KEEP = {'lod1': GLOW, 'lod2': GLOW}
# fix round 3 (A77): the rigid moulded polymer pieces (the thigh holster shell and hood, the knife sheath, the
# magazine pouches, the goggle housing and mount, the belt's polymer holder) stay separate pieces below LOD0 like the
# lens: decimated on their own from the hero's copy and joined to the shell, which is remeshed without them. Inside the
# voxel shell their flat faces were cut by sliver triangles running into the thigh / the plate (the holster arcs and
# groove, the torn knife sheath and its wedge into the mag pouch). A piece is a welded connected component of the hero
# whose faces are all RIGID_MATS, with a bounding-box diagonal in RIGID_DIAG (m): smaller pieces stay in the shell or
# drop (DROP_SMALL). Undo: RIGID_MATS = set() (the round-2 shells: the lens alone kept, about 5 % of the budget).
RIGID_MATS = {'harness polymer'}
# step 11b (D28): every hard rigid part (its '_rigid' id, role 'hard' in the registry) is such a piece too, whatever its
# material; shell vertices within RIGID_ADOPT of a rigid part's source take its id and its weights (rigid_skin.py)
RIGID_ADOPT = 0.004
RIGID_DIAG = (0.05, 0.25)
# The pieces keep this share of their hero triangles (the lens keeps all of its own). At LOD2 only the front torso and
# thigh pieces (holster, hood, knife sheath, magazine pouches: centre forward of the body, below the head) stay separate:
# decimated jointly to LOD2's budget every piece lost its shape (flaps, a twisted belt holder), and the head and back
# pieces read right in the round-2 shell.
RIGID_KEEP = {'lod1': 0.75, 'lod2': 0.55}
# step 10 retry (A95): at LOD2 the rifle magazine placard and its seat (carrier / mount parts the magazines stand in)
# stay separate with the magazines: in the shell the pouch lip baked a dark band against the separate magazine
# (bakeDiff chest 44 px at wren-chest-lod2.png 138,425)
RIGID_EXTRA = {'lod2': {'rifleMagPlacard', 'rifleMagSeat'}}
RIGID_AT = {'lod1': lambda c: True, 'lod2': lambda c: c.y < 0.0 and c.z < 1.45}
# step 10 retry (A95): at LOD2 every hard part under RIGID_DIAG[0] (judged on the whole part, not per welded piece) that
# A82 does not name as absorbed stays a separate piece too, decimated on its own to RIGID_SMALL_KEEP of its hero
# triangles: in the shell the leg-band and hanger buckles lived only where a shell vertex fell within RIGID_ADOPT of
# them (legBandBuckleR0 / hangerBuckleR by one vertex each, the left ones by none: rigidSkin:lod2 FAIL).
# LOD_ABSORBED mirrors src/operators/rigidKit.ts LOD_ABSORBED (A82; rigidSkin:<lod> judges both).
LOD_ABSORBED = {'lod1': {'browRivetL', 'browRivetR'},
                'lod2': {'gadgetTab', 'camTab', 'slingSocket', 'rappelRing', 'browRivetL', 'browRivetR'}}
RIGID_SMALL_AT = {'lod2'}
RIGID_SMALL_KEEP = 0.25


def principled_nodes(mat):
    return [n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'] if mat and mat.use_nodes else []


def is_metal(mat):
    for p in principled_nodes(mat):
        s = p.inputs['Metallic']
        if s.is_linked or s.default_value > 0.5:
            return True
    return False


def group_of(mat):
    n = mat.name if mat else ''
    if n in GLOW:
        return 'glow'
    if n.startswith(CLOTH_PREFIX) or n in CLOTH:
        return 'cloth'
    if n in HARDWARE or is_metal(mat):
        return 'hardware'
    return 'kit'


# ---------------------------------------------------------------- the source mesh
rig = bpy.data.objects[f'{op_id}-rig']
body = bpy.data.objects[f'{op_id}-body']
SKIP = {f'{op_id}-body', 'floor'}
items = [o for o in bpy.data.objects
         if o.type == 'MESH' and not o.hide_render and o.name not in SKIP and o.parent is None
         and not o.name.startswith('collider')]
RIGID_REG = rigid_skin.registry(OUT, op_id)
# the plates and rib segments stay in the shell below LOD0 (A74: decimated alone they let the shell show through) and
# the head kit as before (A77's polymer rule): they ride their bones through the shell vertices that adopt them (A82)
HARD_IDS = {i for i, e in RIGID_REG.items() if e.get('role', 'hard') == 'hard' and e.get('item') not in ('armour', 'head_kit')}
rigid_skin.tag_head(items, op_id)
# the solidified cloth (suit, gloves, hood, balaclava, boot upper) carries its inner shell on the same pattern UVs as the
# outer face: one UV island with two layers. Baked together, the inner shell's texels (unoccluded occlusion, a flipped
# normal) overwrite the outer face triangle by triangle: the hero / LOD0 confetti (step 10 retry, A95). The solidify
# marks its generated shell in a vertex group; the faces on it bake nothing and read the outer face's texels.
INNER_VG = 'bake-inner-shell'
for o in items:
    for mod in o.modifiers:
        if mod.type == 'SOLIDIFY' and mod.show_render:
            if INNER_VG not in o.vertex_groups:
                o.vertex_groups.new(name=INNER_VG)
            mod.shell_vertex_group = INNER_VG
dg = bpy.context.evaluated_depsgraph_get()
parts = []
for o in items:
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    me.transform(o.matrix_world)
    p = bpy.data.objects.new(f'src-{o.name}', me)
    scene.collection.objects.link(p)
    parts.append(p)
for o in items:
    bpy.data.objects.remove(o, do_unlink=True)
for o in bpy.data.objects:
    if o.type == 'MESH' and o not in parts:
        o.hide_render = True
        o.hide_viewport = True
bpy.ops.object.select_all(action='DESELECT')
for p in parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
src = bpy.context.view_layer.objects.active
src.name = f'{op_id}-source'
src_tris = sum(len(p.vertices) - 2 for p in src.data.polygons)
log('source', src_tris, 'triangles,', len(src.data.materials), 'materials, from', len(items), 'items')
SRC_GROUP = {m.name: group_of(m) for m in src.data.materials if m}
SRC_NAMES = [m.name if m else '' for m in src.data.materials]
_mi = np.zeros(len(src.data.polygons), dtype=np.int32)
src.data.polygons.foreach_get('material_index', _mi)
src.data.attributes.new('srcmat', 'INT', 'FACE').data.foreach_set('value', _mi)


def inner_faces(me, vg_index):
    """Faces whose every vertex lies on a solidify's generated (inner) shell."""
    w = np.zeros(len(me.vertices), dtype=bool)
    for v in me.vertices:
        for g in v.groups:
            if g.group == vg_index and g.weight > 0.5:
                w[v.index] = True
                break
    lt = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_total', lt)
    lv = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('vertex_index', lv)
    return np.minimum.reduceat(w[lv].astype(np.int32), np.cumsum(lt) - lt).astype(np.int32)


_inner = (inner_faces(src.data, src.vertex_groups[INNER_VG].index) if INNER_VG in src.vertex_groups
          else np.zeros(len(src.data.polygons), dtype=np.int32))
src.data.attributes.new('inner', 'INT', 'FACE').data.foreach_set('value', _inner)
if INNER_VG in src.vertex_groups:
    src.vertex_groups.remove(src.vertex_groups[INNER_VG])
log('inner shell faces', int(_inner.sum()), 'of', len(_inner))


def tri_count(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def decimate(me, target, name):
    """Collapse-decimate a mesh copy to about `target` triangles (two passes at most)."""
    cur = me
    for _ in range(3):
        tris = tri_count(cur)
        if tris <= target * 1.05:
            break
        tmp = bpy.data.objects.new('tmp-dec', cur)
        scene.collection.objects.link(tmp)
        sm = np.zeros(len(cur.polygons), dtype=np.int32)
        cur.attributes['srcmat'].data.foreach_get('value', sm)
        glow = np.isin(sm, [i for i, n in enumerate(SRC_NAMES) if n in GLOW])
        if glow.any():  # the goggle lens keeps its shape at every level (D13 glow)
            keep = tmp.vertex_groups.new(name='keep')
            keep.add(sorted({v for p, g in zip(cur.polygons, glow) if g for v in p.vertices}), 1.0, 'REPLACE')
        m = tmp.modifiers.new('dec', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = max(0.001, target / tris)
        m.use_collapse_triangulate = True
        if 'keep' in tmp.vertex_groups:
            m.vertex_group = 'keep'
            m.invert_vertex_group = True
        d = bpy.context.evaluated_depsgraph_get()
        out = bpy.data.meshes.new_from_object(tmp.evaluated_get(d), preserve_all_data_layers=True, depsgraph=d)
        bpy.data.objects.remove(tmp, do_unlink=True)
        if cur is not me:
            bpy.data.meshes.remove(cur)
        cur = out
    cur.name = name
    return cur


def drop_faces(me, mats, small, cover=None):
    if not mats and not small and not cover:
        return 0
    bm = bmesh.new()
    bm.from_mesh(me)
    lay = bm.faces.layers.int.get('srcmat')
    kill = [f for f in bm.faces if SRC_NAMES[f[lay]] in mats]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    dropped = 0
    if small:
        seen = set()
        doomed = []
        for f in bm.faces:
            if f in seen:
                continue
            stack, comp = [f], []
            seen.add(f)
            while stack:
                g = stack.pop()
                comp.append(g)
                for e in g.edges:
                    for h in e.link_faces:
                        if h not in seen:
                            seen.add(h)
                            stack.append(h)
            if any(SRC_NAMES[g[lay]] in GLOW for g in comp):
                continue  # the goggle lens glow (D13) stays at every LOD
            vs = {v for g in comp for v in g.verts}
            lo = Vector((min(v.co.x for v in vs), min(v.co.y for v in vs), min(v.co.z for v in vs)))
            hi = Vector((max(v.co.x for v in vs), max(v.co.y for v in vs), max(v.co.z for v in vs)))
            if (hi - lo).length < small:
                doomed.extend(comp)
                dropped += 1
        bmesh.ops.delete(bm, geom=doomed, context='FACES')
    culled = 0
    if cover:
        from mathutils.bvhtree import BVHTree
        bm.faces.ensure_lookup_table()
        bm.normal_update()
        tree = BVHTree.FromBMesh(bm)
        hidden = []
        for f in bm.faces:
            if SRC_NAMES[f[lay]] in GLOW:
                continue
            n = f.normal
            c = f.calc_center_median()
            # fix round 1: a face goes only when it is covered everywhere (its centre and a point near each corner all
            # meet a cover); one ray at the centre culled partly covered faces, and the collapse then opened holes and
            # pulled inner layers through outer ones
            covered = True
            for p in [c] + [c + (v.co - c) * 0.85 for v in f.verts]:
                hit = tree.ray_cast(p + n * 0.0008, n, cover)
                # facing back at us: the inner wall of a closed shell (cull within the reach); facing the same way: a
                # layer over this one, a cover only when it lies close (6 mm)
                if hit[0] is None or hit[2] == f.index or not (hit[1].dot(n) < 0.0 or hit[3] < 0.006):
                    covered = False
                    break
            if covered:
                hidden.append(f)
        culled = len(hidden)
        bmesh.ops.delete(bm, geom=hidden, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.faces.index_update()
    bm.to_mesh(me)
    bm.free()
    if culled:
        log('  covered faces culled', culled)
    return dropped


PLAIN_IDX = next(i for i, n in enumerate(SRC_NAMES) if n not in GLOW)


RIGID = {}
RIGID_SMALL = {}  # per (mesh, LOD): the small hard parts' hero faces (A95), a subset of neither RIGID mask


def rigid_mask(hero_me, lod):
    """Per hero face: True on the rigid polymer pieces kept separate at this LOD (A77), cached per mesh and LOD."""
    if (hero_me.name, lod) in RIGID:
        return RIGID[(hero_me.name, lod)]
    mask = np.zeros(len(hero_me.polygons), dtype=bool)
    bm = bmesh.new()
    bm.from_mesh(hero_me)
    lay = bm.faces.layers.int.get('srcmat')
    rl = bm.verts.layers.float.get('_rigid')
    fi = bm.faces.layers.int.new('fidx')
    for f in bm.faces:
        f[fi] = f.index
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)

    ids = HARD_IDS | {i for i, e in RIGID_REG.items() if e.get('name') in RIGID_EXTRA.get(lod, set())}
    # A95: the whole-part size of each hard part; the small ones A82 does not name stay separate at RIGID_SMALL_AT
    small_ids = set()
    if lod in RIGID_SMALL_AT and rl is not None:
        box = {}
        for v in bm.verts:
            r = int(round(v[rl]))
            if r in HARD_IDS:
                b = box.setdefault(r, [Vector(v.co), Vector(v.co)])
                b[0] = Vector((min(b[0].x, v.co.x), min(b[0].y, v.co.y), min(b[0].z, v.co.z)))
                b[1] = Vector((max(b[1].x, v.co.x), max(b[1].y, v.co.y), max(b[1].z, v.co.z)))
        small_ids = {r for r, (lo, hi) in box.items()
                     if (hi - lo).length < RIGID_DIAG[0] and RIGID_REG[r].get('name') not in LOD_ABSORBED.get(lod, set())}
        log('  small hard parts kept separate at', lod, ':', sorted(RIGID_REG[r].get('name') for r in small_ids))
    smask = np.zeros(len(hero_me.polygons), dtype=bool)

    def hard(g):
        return SRC_NAMES[g[lay]] in RIGID_MATS or (rl is not None and all(int(round(v[rl])) in ids for v in g.verts))
    seen = set()
    n = 0
    for f in bm.faces:
        if f in seen or not hard(f):
            continue
        stack, comp = [f], []
        seen.add(f)
        while stack:
            g = stack.pop()
            comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in seen:
                        seen.add(h)
                        stack.append(h)
        if not all(hard(g) for g in comp):
            continue
        vs = {v for g in comp for v in g.verts}
        if small_ids and rl is not None and {int(round(v[rl])) for v in vs} <= small_ids:
            for g in comp:
                smask[g[fi]] = True
            continue
        lo = Vector((min(v.co.x for v in vs), min(v.co.y for v in vs), min(v.co.z for v in vs)))
        hi = Vector((max(v.co.x for v in vs), max(v.co.y for v in vs), max(v.co.z for v in vs)))
        if RIGID_DIAG[0] <= (hi - lo).length <= RIGID_DIAG[1] and RIGID_AT[lod]((lo + hi) / 2):
            for g in comp:
                mask[g[fi]] = True
            n += 1
            log('  rigid piece', round((hi - lo).length, 3), 'm,', len(comp), 'faces, centre',
                tuple(round(x, 3) for x in (lo + hi) / 2))
    bm.free()
    RIGID[(hero_me.name, lod)] = mask
    RIGID_SMALL[(hero_me.name, lod)] = smask
    log('  rigid pieces kept separate at', lod, ':', n, 'pieces,', int(mask.sum()), 'hero faces; small parts',
        int(smask.sum()), 'hero faces')
    return mask


def kept_mask(hero_me, names, lod):
    """Per hero face: (kept separate from the shell: the SHELL_KEEP materials or a rigid piece (A77), the rigid part)."""
    hm = np.zeros(len(hero_me.polygons), dtype=np.int32)
    hero_me.attributes['srcmat'].data.foreach_get('value', hm)
    keep_idx = [i for i, n in enumerate(SRC_NAMES) if n in names]
    rig = rigid_mask(hero_me, lod)
    return np.isin(hm, keep_idx) | rig, rig


def mask_faces(me, mask, keep):
    """Keep (keep True) or delete (keep False) the faces where `mask` (per face of `me`) is True, in place."""
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if bool(mask[f.index]) != keep], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me)
    bm.free()


def only_faces(me, names, keep):
    """Keep (keep True) or delete (keep False) the faces whose source material is in `names`, in place."""
    bm = bmesh.new()
    bm.from_mesh(me)
    lay = bm.faces.layers.int.get('srcmat')
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if (SRC_NAMES[f[lay]] in names) != keep], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me)
    bm.free()


def shell(lod, hero_me, target, name):
    """A closed shell LOD (fix round 1, A74): the hero without the pieces that stay separate (SHELL_KEEP: the lens, and
    at LOD1 the rigid armour plates and rib segments) and the small pieces, voxel-remeshed (the union of every layer: no
    inside surface left to poke through, no holes) and decimated; the separate pieces, decimated on their own (the
    lens protected), join it again."""
    keep_names = SHELL_KEEP[lod]
    kmask, rmask = kept_mask(hero_me, keep_names, lod)
    smask = RIGID_SMALL.get((hero_me.name, lod))
    rig_tris = sum(len(p.vertices) - 2 for p in hero_me.polygons if rmask[p.index])
    kept = hero_me.copy()
    mask_faces(kept, kmask, True)
    weld(kept)  # split rims stall the collapse (as below the hero)
    kt = tri_count(kept)
    kept_target = min(kt, kt - rig_tris + int(rig_tris * RIGID_KEEP[lod]))  # the lens whole, the pieces their share
    kept_me = decimate(kept, kept_target, f'{name}-kept') if kt > kept_target else kept
    if kept_me is not kept:
        bpy.data.meshes.remove(kept)
    small_me = None
    if smask is not None and smask.any():  # A95: the small hard parts, on their own at RIGID_SMALL_KEEP
        small = hero_me.copy()
        mask_faces(small, smask, True)
        weld(small)
        st = tri_count(small)
        small_me = decimate(small, int(st * RIGID_SMALL_KEEP), f'{name}-small')
        if small_me is not small:
            bpy.data.meshes.remove(small)
        log('  small hard parts', st, '->', tri_count(small_me), 'triangles')
    me = hero_me.copy()
    mask_faces(me, kmask | smask if smask is not None else kmask, False)
    drop_faces(me, DROP_MATS[lod], DROP_SMALL[lod])
    tmp = bpy.data.objects.new('tmp-shell', me)
    scene.collection.objects.link(tmp)
    m = tmp.modifiers.new('remesh', 'REMESH')
    m.mode = 'VOXEL'
    m.voxel_size = SHELL_VOXEL
    m.adaptivity = 0.0
    m.use_smooth_shade = True
    d = bpy.context.evaluated_depsgraph_get()
    vox = bpy.data.meshes.new_from_object(tmp.evaluated_get(d), depsgraph=d)
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.meshes.remove(me)
    log('  shell remeshed', tri_count(vox), 'triangles at', SHELL_VOXEL, 'm; kept pieces', kt, '->', tri_count(kept_me))
    vox.attributes.new('srcmat', 'INT', 'FACE').data.foreach_set('value', np.full(len(vox.polygons), PLAIN_IDX, dtype=np.int32))
    body_me = decimate(vox, max(1000, target - tri_count(kept_me) - (tri_count(small_me) if small_me else 0)), f'{name}-shell')
    if body_me is not vox:
        bpy.data.meshes.remove(vox)
    # each shell face takes the source material of the nearest hero face, so it bakes into its own atlas group
    from mathutils.bvhtree import BVHTree
    hm = np.zeros(len(hero_me.polygons), dtype=np.int32)
    hero_me.attributes['srcmat'].data.foreach_get('value', hm)
    hb = bmesh.new()
    hb.from_mesh(hero_me)
    hb.faces.ensure_lookup_table()
    out_mask = kmask | smask if smask is not None else kmask
    hb_del = [f for f in hb.faces if out_mask[f.index]]
    hidx = np.array([f.index for f in hb.faces if not out_mask[f.index]], dtype=np.int32)
    bmesh.ops.delete(hb, geom=hb_del, context='FACES')
    hb.faces.index_update()
    hb.faces.ensure_lookup_table()
    tree = BVHTree.FromBMesh(hb)
    sm = np.full(len(body_me.polygons), PLAIN_IDX, dtype=np.int32)
    for i, poly in enumerate(body_me.polygons):
        hit = tree.find_nearest(poly.center)
        if hit[2] is not None:
            sm[i] = hm[hidx[hit[2]]]
    hb.free()
    body_me.attributes['srcmat'].data.foreach_set('value', sm)
    a = bpy.data.objects.new(name, body_me)
    b = bpy.data.objects.new('tmp-kept', kept_me)
    joined = [a, b] + ([bpy.data.objects.new('tmp-small', small_me)] if small_me else [])
    for o in joined:
        scene.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in joined:
        o.select_set(True)
    bpy.context.view_layer.objects.active = a
    bpy.ops.object.join()
    out = a.data
    bpy.data.objects.remove(a, do_unlink=True)
    out.name = name
    return out


def open_edge_m(me):
    """Open (boundary) edge length in metres after a 0.2 mm position weld (split seams are not openings)."""
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)
    s = sum(e.calc_length() for e in bm.edges if len(e.link_faces) == 1)
    bm.free()
    return round(s, 2)


def weld(me, dist=0.0002):
    """Merge the split vertices of hard edges and seams (0.2 mm): split rims are boundaries the collapse will not
    cross, so an unwelded LOD stalls at about twice its budget."""
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bm.to_mesh(me)
    bm.free()


def regroup(obj, groups):
    """Replace the source materials by one bake material per atlas group; faces follow their material's group."""
    me = obj.data
    names = [g for g, _ in groups]
    gi = []
    for n in SRC_NAMES:
        g = SRC_GROUP.get(n, 'kit')
        if g not in names:
            g = 'kit' if 'kit' in names else names[0]
        gi.append(names.index(g))
    idx = np.zeros(len(me.polygons), dtype=np.int32)
    me.attributes['srcmat'].data.foreach_get('value', idx)
    lut = np.array(gi, dtype=np.int32)
    idx = lut[idx]
    me.materials.clear()
    for g in names:
        me.materials.append(bpy.data.materials.new(f'{obj.name}-{g}'))
    me.polygons.foreach_set('material_index', idx)
    me.update()


def uv_area(me):
    uv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    ls = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_start', ls)
    a, b, c = uv[ls], uv[ls + 1], uv[ls + 2]
    ar = 0.5 * np.abs((b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0]))
    return round(float(ar.sum()), 4), int((ar < 1e-12).sum())


def unwrap(obj, groups, scale):
    """Atlas UVs per group: the garments' own pattern panels (the source's 'pattern' layer, carried through decimation)
    repacked into 0-1 per group; faces without a pattern (zero UV area: most hard kit) are smart-projected first."""
    me = obj.data
    names = [l.name for l in me.uv_layers]
    base = 'pattern' if 'pattern' in names else 'atlas' if 'atlas' in names else None
    if base is None:
        me.uv_layers.new(name='atlas')
    else:
        me.uv_layers[base].name = 'atlas'
    for n in [l.name for l in me.uv_layers if l.name != 'atlas']:
        me.uv_layers.remove(me.uv_layers[n])
    me.uv_layers.active = me.uv_layers['atlas']
    uv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers['atlas'].data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    ls = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_start', ls)
    a, b, c = uv[ls], uv[ls + 1], uv[ls + 2]
    area = 0.5 * np.abs((b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0]))
    flat = area < 1e-12
    mi = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('material_index', mi)
    # bring each group's islands into the 0-1 tile first (patterns are in metres; the packer keeps the nearest tile)
    lt = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_total', lt)
    for i in range(len(groups)):
        cm = np.repeat((mi == i) & ~flat, lt)
        if cm.any():
            lo = uv[cm].min(axis=0)
            span = float((uv[cm].max(axis=0) - lo).max()) or 1.0
            uv[cm] = (uv[cm] - lo) / span * 0.98 + 0.01
    me.uv_layers['atlas'].data.foreach_set('uv', uv.ravel())
    scene.tool_settings.use_uv_select_sync = True
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    lv = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('vertex_index', lv)
    ev = np.empty(len(me.edges) * 2, dtype=np.int32)
    me.edges.foreach_get('vertices', ev)
    ev = ev.reshape(-1, 2)

    def select(mask):
        """Select exactly the masked faces (object-mode flags, then edit mode for the UV operators)."""
        if bpy.context.object.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
        vs = np.zeros(len(me.vertices), dtype=bool)
        vs[lv[np.repeat(mask, lt)]] = True
        me.vertices.foreach_set('select', vs)
        me.edges.foreach_set('select', vs[ev[:, 0]] & vs[ev[:, 1]])
        me.polygons.foreach_set('select', mask)
        me.update()
        bpy.ops.object.mode_set(mode='EDIT')
        return bool(mask.any())

    for i, (g, size) in enumerate(groups):
        px = max(64, int((size or 256) * scale))
        if select((mi == i) & flat):
            bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0,
                                     correct_aspect=True, scale_to_bounds=False)
        if select(mi == i):
            bpy.ops.uv.pack_islands(udim_source='ORIGINAL_AABB', rotate=True, scale=True, margin_method='FRACTION', margin=2.5 / (size or 1024),
                                    shape_method='CONVEX')
    bpy.ops.object.mode_set(mode='OBJECT')
    # the packer may still spill past the tile: scale each group back into 0-1 (uniform, islands unchanged)
    flat_uv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers['atlas'].data.foreach_get('uv', flat_uv)
    uv = flat_uv.reshape(-1, 2)
    for i in range(len(groups)):
        cm = np.repeat(mi == i, lt)
        if cm.any():
            lo = uv[cm].min(axis=0)
            span = float((uv[cm].max(axis=0) - lo).max())
            if lo.min() < 0 or lo.max() + span > 1:
                uv[cm] = (uv[cm] - lo) / max(span, 1e-6) * 0.995 + 0.0025
    me.uv_layers['atlas'].data.foreach_set('uv', uv.ravel())
    log('unwrapped', obj.name, int(flat.sum()), 'faces without a pattern; uv area, zero-area faces', uv_area(me))


# ---------------------------------------------------------------- skin weights (nearest body vertex)
names_vg = [g.name for g in body.vertex_groups]
kd = KDTree(len(body.data.vertices))
for v in body.data.vertices:
    kd.insert(body.matrix_world @ v.co, v.index)
kd.balance()
bw_raw = [[(names_vg[g.group], g.weight) for g in v.groups if g.weight > 0] for v in body.data.vertices]


def game_joint(n, fingers=False):
    """The game joint a body bone's weight goes to. fingers: the LOD keeps the finger joints (anim-skeleton S1: LOD0 /
    LOD1; LOD2 folds them into the wrist)."""
    if n.startswith('fingerL') and not fingers:
        return 'wrL'
    if n.startswith('fingerR') and not fingers:
        return 'wrR'
    # anim-rig (docs/archive/anim-rework/RIG.md): the toes ride the toe joint at the ball of the foot (was the ankle: a rigid
    # foot). Undo: return 'anL' / 'anR' here and drop toeL / toeR from GAME_JOINTS.
    if n.startswith('toesL'):
        return 'toeL'
    if n.startswith('toesR'):
        return 'toeR'
    return n


def joint_map(mode):
    """'hero': every bone as it is; 'fingers': toes folded, fingers kept (LOD0 / LOD1); 'game': both folded (LOD2)."""
    if mode == 'hero':
        return lambda n: n
    return lambda n: game_joint(n, fingers=mode == 'fingers')


def weight_table(mode):
    out = []
    jm = joint_map(mode)
    for ws in bw_raw:
        acc = {}
        for n, w in ws:
            n = jm(n)
            acc[n] = acc.get(n, 0.0) + w
        top = sorted(acc.items(), key=lambda kv: -kv[1])[:4]
        s = sum(w for _, w in top) or 1.0
        out.append([(n, w / s) for n, w in top])
    return out


BW = {m: weight_table(m) for m in ('hero', 'fingers', 'game')}


def lod_mode(lod):
    return 'hero' if lod == 'hero' else 'fingers' if lod in skeleton.FINGER_LODS else 'game'


SRC_IDS = rigid_skin.ids_of(src.data)
_sc = np.empty(len(src.data.vertices) * 3, dtype=np.float32)
src.data.vertices.foreach_get('co', _sc)
_rig = SRC_IDS > 0
ADOPT = rigid_skin.adopter(_sc.reshape(-1, 3)[_rig], SRC_IDS[_rig], RIGID_ADOPT)
RIGID_COUNT = {}


def skin(obj, arm, lod):
    """Nearest-body weights; rigid parts (D28) their declared bone(s) on every vertex; shell vertices near a rigid
    part's source take its id (rigid_skin.py); then the clavicle split and 4 influences (anim-skeleton S1)."""
    table = BW[lod_mode(lod)]

    def nearest(p):
        _, idx, _ = kd.find(p)
        return table[idx]
    shell_lod = lod in SHELL_KEEP
    used, count = rigid_skin.apply(obj, RIGID_REG, nearest, [v.co.copy() for v in obj.data.vertices],
                                   adopt=ADOPT if shell_lod else None, joint=joint_map(lod_mode(lod)))
    RIGID_COUNT[lod] = {str(k): v for k, v in sorted(count.items())}
    skeleton.clavicle_split(obj)
    skeleton.goggle_split(obj)  # the goggle parts ride goggleUse / goggleStow (gear offsets)
    skeleton.limit_influences(obj, 4)
    used = sorted(set(used) | {g.name for g in obj.vertex_groups if g.name.startswith(('clav', 'goggle'))})
    am = obj.modifiers.new('rig', 'ARMATURE')
    am.object = arm
    obj.parent = arm
    obj.matrix_parent_inverse = arm.matrix_world.inverted()
    return used


def game_rig(fingers, name):
    """A copy of the rig without the hero-only toe bones and, unless `fingers` (LOD0 / LOD1), the finger bones."""
    arm = rig.copy()
    arm.data = rig.data.copy()
    arm.name = name
    scene.collection.objects.link(arm)
    arm.hide_viewport = False
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for b in list(arm.data.edit_bones):
        if b.name.startswith('toes') or (b.name.startswith('finger') and not fingers):
            arm.data.edit_bones.remove(b)
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


# ---------------------------------------------------------------- anchors (A36, A40, A41)
sim = {}
for item in ('armour', 'waist_belt', 'leg_kit'):
    f = os.path.join(OUT, f'{op_id}-{item}-sim.json')
    if os.path.exists(f):
        with open(f, encoding='utf-8') as fh:
            sim[item] = json.load(fh).get('measurements', {})
back_gear = sim.get('armour', {}).get('backGearM')
ANCHOR_BONE = {'weaponMount.backL': 'chest', 'weaponMount.backC': 'chest', 'weaponMount.backR': 'chest',
               'pistolHolster': 'hipR', 'slingSocket': 'pelvis'}
anchor_world = {}
for n in ANCHOR_BONE:
    e = bpy.data.objects.get(n)
    if e is not None:
        anchor_world[n] = e.matrix_world.copy()
sock = sim.get('waist_belt', {}).get('slingSocket')
if 'slingSocket' not in anchor_world and sock:
    anchor_world['slingSocket'] = Matrix.Translation(Vector(sock['at']))
# anim-rig (docs/archive/anim-rework/RIG.md): the back sling socket, where a sling's rear end anchors: WREN_SLING.back
# (src/operators/handFrame.ts) from the chest joint, game frame, on the back plate at the left shoulder blade.
SLING_BACK = {'wren': (-0.078, 0.123, -0.1)}
if op_id in SLING_BACK and 'chest' in rig.data.bones:
    ANCHOR_BONE['slingBack'] = 'chest'
    chest_at = rig.matrix_world @ rig.data.bones['chest'].head_local
    anchor_world['slingBack'] = Matrix.Translation(chest_at + Vector(common.game_to_blender(SLING_BACK[op_id])))
for n in list(ANCHOR_BONE):
    e = bpy.data.objects.get(n)
    if e is not None:
        bpy.data.objects.remove(e, do_unlink=True)


def anchors_for(arm, tag):
    made = []
    for n, mw in anchor_world.items():
        e = bpy.data.objects.new(f'{n}#{tag}', None)
        e.empty_display_size = 0.03
        scene.collection.objects.link(e)
        e.parent = arm
        e.parent_type = 'BONE'
        e.parent_bone = ANCHOR_BONE[n]
        bpy.context.view_layer.update()
        e.matrix_world = mw
        e['anchor'] = n
        e['tag'] = tag
        made.append(e)
    bpy.context.view_layer.update()
    return made


# ---------------------------------------------------------------- LOD geometry
lods = {}
skeleton.add_joints(rig)  # anim-skeleton S1: clavL / clavR, goggleStow / goggleUse on the hero rig (every game rig copy too)
game_arm = game_rig(True, f'{op_id}-rig-game')  # LOD0 / LOD1: fingers kept
far_arm = game_rig(False, f'{op_id}-rig-game-far')  # LOD2


def is_hand(co):
    """Glove: the nearest body vertex is weighted to a wrist or a finger (knuckle loops)."""
    return any(n.startswith(('wr', 'finger')) for n, _ in bw_raw[kd.find(co)[1]])

prev = src.data
for lod in ('hero', 'lod0', 'lod1', 'lod2'):
    if lod in SHELL_KEEP:
        drop = 0
        me = shell(lod, lods['hero']['obj'].data, TARGET_TRIS[lod], f'{op_id}-{lod}')
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(SHELL_SHARP_DEG))
    else:
        base = prev.copy()
        drop = drop_faces(base, DROP_MATS.get(lod, set()), DROP_SMALL.get(lod), CULL_COVERED.get(lod))
        if lod != 'hero':
            weld(base)
        me = decimate(base, TARGET_TRIS[lod], f'{op_id}-{lod}')
        if me is not base:
            bpy.data.meshes.remove(base)
        if lod in SHARP_SPLIT:  # fix round 3 (A76 on LOD0): flat faces bake along their own normal
            me.set_sharp_from_angle(angle=math.radians(SHARP_SPLIT[lod]))
            # on the boots too since the step 10 retry: with the inner shell out of the bake the split clears the toe (A95)
            sh = np.zeros(len(me.edges), dtype=bool)
            me.attributes['sharp_edge'].data.foreach_get('value', sh)
            co = np.empty(len(me.vertices) * 3, dtype=np.float32)
            me.vertices.foreach_get('co', co)
            ev = np.empty(len(me.edges) * 2, dtype=np.int32)
            me.edges.foreach_get('vertices', ev)
            low = co.reshape(-1, 3)[ev.reshape(-1, 2)][:, :, 2].max(axis=1) < SHARP_ABOVE_Z
            me.attributes['sharp_edge'].data.foreach_set('value', sh & ~low)
    if lod in skeleton.FINGER_LODS:  # anim-skeleton S1: the glove fingers bend smoothly
        log(lod, 'knuckle loops:', skeleton.knuckle_loops(me, rig, skeleton.CFG['knuckles'][lod], is_hand), 'vertices')
    me.validate(clean_customdata=False)
    obj = bpy.data.objects.new(f'{op_id}-{lod}', me)
    scene.collection.objects.link(obj)
    lods[lod] = {'obj': obj, 'dropped': drop}
    if GROUPS[lod]:
        regroup(obj, GROUPS[lod])
        unwrap(obj, GROUPS[lod], args.scale)
    prev = me
    log(lod, tri_count(me), 'triangles', f'({drop} small pieces dropped)' if drop else '')

# ---------------------------------------------------------------- bake (selected to active, Cycles GPU)
src.hide_render = False
src.hide_viewport = False
RAYS = ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter',
        'visible_shadow')
for lod in lods:  # the LOD surfaces sit on the source: never occluders while it is baked (camera visibility
    for attr in RAYS[1:]:  # stays on: Cycles drops an object with no ray visibility at all, and the bake with it)
        setattr(lods[lod]['obj'], attr, False)
if scene.world is None:
    scene.world = bpy.data.worlds.new('bake')
scene.world.light_settings.distance = 0.1  # occlusion reach: creases, strap and plate edges, not the whole figure


def new_img(name, size, data):
    img = bpy.data.images.new(name, size, size, alpha=False)
    img.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    img.generated_color = (0.5, 0.5, 1.0, 1.0) if name.endswith('normal') else (0, 0, 0, 1)
    return img


def setup_bake_mats(obj, groups, size_scale):
    sets = {}
    for i, (g, size) in enumerate(groups):
        mat = obj.data.materials[i]
        mat.use_nodes = True
        nt = mat.node_tree
        node = nt.nodes.new('ShaderNodeTexImage')
        node.name = 'bake'
        if not size:
            sets[g] = None
            continue
        px = max(64, int(size * size_scale))
        sets[g] = {'size': px, 'node': node, 'mat': mat,
                   'albedo': new_img(f'{obj.name}-{g}-albedo', px, False),
                   'normal': new_img(f'{obj.name}-{g}-normal', px, True),
                   'orm': new_img(f'{obj.name}-{g}-orm', px, True),
                   'ao': new_img(f'{obj.name}-{g}-ao', px, True),
                   'rough': new_img(f'{obj.name}-{g}-rough', px, True),
                   'metal': new_img(f'{obj.name}-{g}-metal', px, True),
                   'cov': new_img(f'{obj.name}-{g}-cov', px, True)}
    # glow (and any group without maps): a dummy image so the bake has a target for those faces
    dummy = new_img(f'{obj.name}-dummy', 16, True)
    for i, (g, _) in enumerate(groups):
        if sets[g] is None:
            n = obj.data.materials[i].node_tree.nodes['bake']
            n.image = dummy
            obj.data.materials[i].node_tree.nodes.active = n
    return sets


BAKED = {}
for lod in ('hero', 'lod0', 'lod1', 'lod2'):
    BAKED[lod] = setup_bake_mats(lods[lod]['obj'], GROUPS[lod], args.scale)

# the inner shell faces (A95) bake into a dummy through one extra material slot; restored after the bake
INNER_SAVED = {}
for lod in BAKED:
    me = lods[lod]['obj'].data
    if 'inner' not in me.attributes:
        continue
    inn = np.zeros(len(me.polygons), dtype=np.int32)
    me.attributes['inner'].data.foreach_get('value', inn)
    if not inn.any():
        continue
    mi = np.zeros(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('material_index', mi)
    INNER_SAVED[lod] = mi.copy()
    skip = bpy.data.materials.new(f'{me.name}-inner-skip')
    skip.use_nodes = True
    n = skip.node_tree.nodes.new('ShaderNodeTexImage')
    n.name = 'bake'
    n.image = new_img(f'{me.name}-inner-dummy', 16, True)
    skip.node_tree.nodes.active = n
    me.materials.append(skip)
    mi[inn > 0] = len(me.materials) - 1
    me.polygons.foreach_set('material_index', mi)
    me.update()
    log(lod, int((inn > 0).sum()), 'inner shell faces skipped in the bake')


def point(lod, pass_name):
    for g, s in BAKED[lod].items():
        if s is None:
            continue
        s['node'].image = s[pass_name]
        s['mat'].node_tree.nodes.active = s['node']


def bake(lod, kind, pass_name, samples):
    point(lod, pass_name)
    obj = lods[lod]['obj']
    bpy.ops.object.select_all(action='DESELECT')
    src.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    scene.cycles.samples = samples
    e = CAGE[lod]
    t = time.time()
    margin = max(2, int(8 * min(s['size'] for s in BAKED[lod].values() if s) / 2048))
    kw = dict(type=kind, use_selected_to_active=True, cage_extrusion=e, max_ray_distance=e * 3, margin=margin,
              margin_type='EXTEND', use_clear=True, target='IMAGE_TEXTURES')
    if kind == 'NORMAL':
        kw.update(normal_space='TANGENT', normal_r='POS_X', normal_g='POS_Y', normal_b='POS_Z')
    bpy.ops.object.bake(**kw)
    log('baked', lod, pass_name, f'{time.time() - t:.1f}s')


# pass 1-2: the source's own materials (shading normal with the procedural bump; occlusion)
for lod in BAKED:
    bake(lod, 'NORMAL', 'normal', 8)
for lod in BAKED:
    bake(lod, 'AO', 'ao', 48)

# pass 3-5: every Principled BSDF in the source's materials swapped for an Emission fed by one of its inputs
# (mix shaders then mix the values with the same factors as the shading does)
swaps = []
for mat in src.data.materials:
    if not mat or not mat.use_nodes:
        continue
    nt = mat.node_tree
    for p in principled_nodes(mat):
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Strength'].default_value = 1.0
        for lk in list(p.outputs['BSDF'].links):
            nt.links.new(em.outputs['Emission'], lk.to_socket)
        swaps.append((nt, p, em))


def feed(sock_name):
    for nt, p, em in swaps:
        for lk in list(em.inputs['Color'].links):
            nt.links.remove(lk)
        if sock_name is None:  # coverage: every source surface emits 1
            em.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
            continue
        s = p.inputs[sock_name]
        if s.is_linked:
            nt.links.new(s.links[0].from_socket, em.inputs['Color'])
        else:
            v = s.default_value
            em.inputs['Color'].default_value = (v[0], v[1], v[2], 1.0) if hasattr(v, '__len__') else (v, v, v, 1.0)


for sock, pass_name in (('Base Color', 'albedo'), ('Roughness', 'rough'), ('Metallic', 'metal'), (None, 'cov')):
    feed(sock)
    for lod in BAKED:
        bake(lod, 'EMIT', pass_name, 4)


# the inner shell faces back on their own atlas material (they read the outer face's texels: one island)
for lod, mi in INNER_SAVED.items():
    me = lods[lod]['obj'].data
    me.polygons.foreach_set('material_index', mi)
    me.materials.pop(index=len(me.materials) - 1)
    me.update()

# the source's own shading back (the renders show it as the reference column)
for nt, p, em in swaps:
    for lk in list(em.outputs['Emission'].links):
        nt.links.new(p.outputs['BSDF'], lk.to_socket)
    nt.nodes.remove(em)


def px(img):
    a = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(-1, 4)


# ORM pack (R occlusion, G roughness, B metal) and per-group means for the report
MEANS = {}
for lod, sets in BAKED.items():
    for g, s in sets.items():
        if s is None:
            continue
        o = px(s['ao'])
        o[:, 1] = px(s['rough'])[:, 0]
        o[:, 2] = px(s['metal'])[:, 0]
        o[:, 3] = 1.0
        # texels no ray reached (islands thinner than a texel at this size, misses): the group's mean instead of the
        # cleared black, which shades as a glossy black hole
        hit = px(s['cov'])[:, 0] > 0.5
        alb = px(s['albedo'])
        nrm = px(s['normal'])
        miss = ~hit
        if hit.any() and miss.any():
            o[miss, :3] = o[hit, :3].mean(axis=0)
            alb[miss, :3] = alb[hit, :3].mean(axis=0)
            nrm[miss, :3] = (0.5, 0.5, 1.0)
            s['albedo'].pixels.foreach_set(alb.ravel())
            s['normal'].pixels.foreach_set(nrm.ravel())
        # rays that met the underside or the edge wall of a thin strip (seam tape, binding, strap edges) bake a normal
        # turned more than ~70 degrees from the LOD surface and a black occlusion: flatten those to the surface
        nz = nrm[:, 2] * 2.0 - 1.0
        bad = hit & (nz < 0.35)
        if bad.any():
            nrm[bad, :3] = (0.5, 0.5, 1.0)
            o[bad, 0] = o[hit & ~bad, 0].mean()
            s['normal'].pixels.foreach_set(nrm.ravel())
        MEANS.setdefault('flattenedTexels', {})[f'{lod}.{g}'] = round(float(bad.sum() / max(1, hit.sum())), 4)
        s['orm'].pixels.foreach_set(o.ravel())
        MEANS.setdefault('missedTexels', {})[f'{lod}.{g}'] = round(float(miss.mean()), 4)
        MEANS[f'{lod}.{g}'] = {'albedoMeanSrgb': round(float(alb[:, :3].mean()), 4),
                               'roughMean': round(float(o[:, 1].mean()), 3),
                               'aoMean': round(float(o[:, 0].mean()), 3)}
        for k in ('ao', 'rough', 'metal', 'cov'):
            bpy.data.images.remove(s[k])
            s[k] = None

# ---------------------------------------------------------------- export materials (glTF metallic-roughness)
gltf_out = bpy.data.node_groups.get('glTF Material Output')
if gltf_out is None:
    gltf_out = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    gltf_out.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
lens_src = bpy.data.materials.get('goggle lens')


def finish_material(mat, s, glow):
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    if glow:
        lb = next(iter(principled_nodes(lens_src)), None) if lens_src else None
        col = tuple(lb.inputs['Base Color'].default_value) if lb else (0.02, 0.02, 0.02, 1)
        bsdf.inputs['Base Color'].default_value = col
        bsdf.inputs['Roughness'].default_value = 0.08
        bsdf.inputs['Emission Color'].default_value = (0.3, 0.85, 0.16, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 1.0
        return
    uv = nt.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'atlas'
    ta = nt.nodes.new('ShaderNodeTexImage')
    ta.image = s['albedo']
    to = nt.nodes.new('ShaderNodeTexImage')
    to.image = s['orm']
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = s['normal']
    for t in (ta, to, tn):
        nt.links.new(uv.outputs['UV'], t.inputs['Vector'])
    nt.links.new(ta.outputs['Color'], bsdf.inputs['Base Color'])
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(to.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.uv_map = 'atlas'
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    go = nt.nodes.new('ShaderNodeGroup')
    go.node_tree = gltf_out
    nt.links.new(sep.outputs['Red'], go.inputs['Occlusion'])


for lod, sets in BAKED.items():
    obj = lods[lod]['obj']
    for i, (g, _) in enumerate(GROUPS[lod]):
        finish_material(obj.data.materials[i], sets[g], sets[g] is None)

# ---------------------------------------------------------------- skin and anchors, export per LOD
os.makedirs(EXP, exist_ok=True)
report = {'operator': op_id, 'source': os.path.basename(src_blend), 'sourceTriangles': src_tris,
          'textureScale': args.scale, 'gpus': gpus, 'backGearM': back_gear,
          'anchorsBone': ANCHOR_BONE, 'budgets': 'SPEC 6.4', 'lods': {},
          'rigid': {str(k): {'name': e['name'], 'bones': e['bones'], 'role': e.get('role', 'hard'), 'item': e.get('item')}
                    for k, e in sorted(RIGID_REG.items())}}
SPEC = {'hero': {'tris': [150000, 250000], 'draws': 4, 'bones': 30, 'texDesktopMB': [30, 40]},
        'lod0': {'tris': [35000, 45000], 'draws': 3, 'bones': 17, 'texDesktopMB': [0, 8]},
        'lod1': {'tris': [12000, 15000], 'draws': 2, 'bones': 17, 'texDesktopMB': "shares LOD0's"},
        'lod2': {'tris': [4000, 6000], 'draws': 1, 'bones': 17, 'texDesktopMB': [0, 1.5]}}
hero_arm = rig
anchor_objs = {'hero': anchors_for(hero_arm, 'hero'), 'game': anchors_for(game_arm, 'game'), 'far': anchors_for(far_arm, 'far')}
tex_root = os.path.join(EXP, 'textures')


def max_edge(me):
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    ev = np.empty(len(me.edges) * 2, dtype=np.int32)
    me.edges.foreach_get('vertices', ev)
    ev = ev.reshape(-1, 2)
    return float(np.linalg.norm(co[ev[:, 0]] - co[ev[:, 1]], axis=1).max()) if len(ev) else 0.0


for lod in ('hero', 'lod0', 'lod1', 'lod2'):
    obj = lods[lod]['obj']
    game = lod != 'hero'
    tag = 'hero' if not game else 'game' if lod in skeleton.FINGER_LODS else 'far'
    arm = {'hero': hero_arm, 'game': game_arm, 'far': far_arm}[tag]
    used = skin(obj, arm, lod)
    tex_set = BAKED[lod]
    files = []
    tex = {'desktopVramMB_rgba8': 0.0, 'bc7MB': 0.0, 'astc4x4MB': 0.0, 'pngMB': 0.0}
    for g, s in tex_set.items():
        if s is None:
            continue
        for k in ('albedo', 'normal', 'orm'):
            img = s[k]
            dest = os.path.join(tex_root, lod, f'{op_id}-{lod}-{g}-{k}.png')
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            img.filepath_raw = dest
            img.file_format = 'PNG'
            img.save()
            n = img.size[0] * img.size[1]
            files.append({'file': os.path.relpath(dest, EXP).replace('\\', '/'), 'size': img.size[0], 'bytes': os.path.getsize(dest)})
            tex['pngMB'] += os.path.getsize(dest) / 2 ** 20
            tex['desktopVramMB_rgba8'] += n * 4 * 4 / 3 / 2 ** 20
            tex['bc7MB'] += n * 1 * 4 / 3 / 2 ** 20
            tex['astc4x4MB'] += n * 1 * 4 / 3 / 2 ** 20
    tex = {k: round(v, 2) for k, v in tex.items()}
    for e in anchor_objs['hero'] + anchor_objs['game'] + anchor_objs['far']:
        e.name = f"{e['anchor']}#{e['tag']}"
    for e in anchor_objs[tag]:
        e.name = e['anchor']  # the glTF node names are the anchor names
    bpy.ops.object.select_all(action='DESELECT')
    sel = [arm, obj, *anchor_objs[tag]]
    for o in sel:
        o.hide_viewport = False
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    d = os.path.join(EXP, lod)
    os.makedirs(d, exist_ok=True)
    dest = os.path.join(d, f'{op_id}-{lod}.glb')
    bpy.ops.export_scene.gltf(
        filepath=dest, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_skins=True, export_def_bones=False, export_influence_nb=4, export_normals=True, export_tangents=True, export_texcoords=True,
        export_materials='EXPORT', export_image_format='WEBP', export_image_quality=92, export_animations=False,
        export_cameras=False, export_lights=False, export_extras=False, export_attributes=True)
    shutil.copyfile(dest, os.path.join(OUT, f'{op_id}-lab-{lod}.glb'))
    # read back what the file holds: anchors, joints, primitives, materials
    with open(dest, 'rb') as fh:
        raw = fh.read()
    jl = int.from_bytes(raw[12:16], 'little')
    gj = json.loads(raw[20:20 + jl])
    node_names = [n.get('name') for n in gj['nodes']]
    prims = sum(len(m['primitives']) for m in gj['meshes'])
    joints = gj['skins'][0]['joints'] if gj.get('skins') else []
    parent = {c: i for i, n in enumerate(gj['nodes']) for c in n.get('children', [])}
    anchors = {}
    for n in ANCHOR_BONE:
        if n in node_names:
            i = node_names.index(n)
            anchors[n] = gj['nodes'][parent[i]]['name'] if i in parent else None
    tris = tri_count(obj.data)
    report['lods'][lod] = {
        'glb': os.path.relpath(dest, EXP).replace('\\', '/'), 'glbMB': round(os.path.getsize(dest) / 2 ** 20, 2),
        'triangles': tris, 'draws': prims, 'materials': len(gj.get('materials', [])),
        'materialNames': [m.get('name') for m in gj.get('materials', [])],
        'textures': files, 'textureMB': tex, 
        'skinJoints': len(joints), 'weightedJoints': len(used), 'weighted': used,
        'anchors': anchors, 'anchorsMissing': [n for n in ANCHOR_BONE if n not in anchors],
        'maxEdgeM': round(max_edge(obj.data), 4), 'openEdgeM': open_edge_m(obj.data), 'piecesDropped': lods[lod]['dropped'],
        'tangents': all('TANGENT' in p.get('attributes', {}) for m in gj['meshes'] for p in m['primitives']),
        'cageExtrusionM': CAGE[lod], 'rigidVerts': RIGID_COUNT.get(lod, {}),
        'spec': SPEC[lod],
    }
    for o in sel:
        o.select_set(False)
    log('exported', lod, tris, 'tris', prims, 'draws', len(joints), 'joints', 'anchors', anchors)

report['bakeMeans'] = MEANS

# ---------------------------------------------------------------- side-by-side renders (Cycles, OptiX)
SIL = {}
if args.render and args.dest:
    os.makedirs(args.dest, exist_ok=True)
    scr = os.path.join(EXP, 'renders')
    os.makedirs(scr, exist_ok=True)
    scene.render.film_transparent = True
    scene.cycles.samples = args.samples
    R.world(scene)
    R.studio_rig((0, 0, 0.9), 1.75)
    cols = [('source', src), ('hero', lods['hero']['obj']), ('lod0', lods['lod0']['obj']),
            ('lod1', lods['lod1']['obj']), ('lod2', lods['lod2']['obj'])]
    for _, o in cols:
        for attr in RAYS:
            setattr(o, attr, True)
    cams = {}
    for name, loc in (('front', (0, -6, 0.9)), ('side', (-6, 0, 0.9)), ('back', (0, 6, 0.9))):
        c = R.camera(f'cam-{name}', loc, (0, 0, 0.9))
        c.data.type = 'ORTHO'
        c.data.ortho_scale = 1.95
        cams[name] = (c, (420, 840))
    cams['chest'] = (R.camera('cam-chest', (0.25, -1.05, 1.32), (0.0, 0.0, 1.22), 85), (560, 560))
    cams['boot'] = (R.camera('cam-boot', (-0.55, -0.85, 0.22), (-0.11, -0.02, 0.07), 85), (560, 560))
    cams['head'] = (R.camera('cam-head', (0.35, -0.95, 1.62), (0.0, 0.0, 1.58), 85), (560, 560))
    # fix round 3: the holster close-up (right thigh, outer face and front; about the chest view's scale)
    hc = anchor_world['pistolHolster'].translation if 'pistolHolster' in anchor_world else Vector((-0.21, 0.0, 0.59))
    hc = Vector((hc.x, hc.y - 0.04, hc.z + 0.06))
    cams['holster'] = (R.camera('cam-holster', (hc.x - 0.95, hc.y - 0.5, hc.z + 0.12), tuple(hc), 85), (560, 560))
    bg = np.array([0.11, 0.115, 0.125], dtype=np.float32)
    shots = {}
    for cname, (cam, res) in cams.items():
        scene.camera = cam
        for lab, o in cols:
            for _, other in cols:
                other.hide_render = other is not o
            path = os.path.join(scr, f'{op_id}-{cname}-{lab}.png')
            scene.render.resolution_x, scene.render.resolution_y = res
            scene.render.resolution_percentage = 100
            scene.render.image_settings.file_format = 'PNG'
            scene.render.image_settings.color_mode = 'RGBA'
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            im = bpy.data.images.load(path)
            a = px(im).reshape(res[1], res[0], 4).copy()
            bpy.data.images.remove(im)
            shots[(cname, lab)] = a
        log('rendered', cname)
    # silhouette agreement (IoU of the alpha masks) against the hero, and the hero against the source
    for cname in ('front', 'side', 'back'):
        hm = shots[(cname, 'hero')][..., 3] > 0.5
        for lab, _ in cols:
            m = shots[(cname, lab)][..., 3] > 0.5
            ref = shots[(cname, 'source')][..., 3] > 0.5 if lab == 'hero' else hm
            inter = np.logical_and(m, ref).sum()
            uni = np.logical_or(m, ref).sum() or 1
            SIL.setdefault(lab, {})[cname] = round(float(inter / uni), 4)

    def sheet(names, file):
        gap = 8
        rows = []
        for cname in names:
            tiles = []
            for lab, _ in cols:
                a = shots[(cname, lab)]
                rgb = a[..., :3] * a[..., 3:4] + bg * (1 - a[..., 3:4])
                tiles.append(rgb)
                tiles.append(np.tile(bg, (a.shape[0], gap, 1)))
            rows.append(np.concatenate(tiles[:-1], axis=1))
        w = max(r.shape[1] for r in rows)
        rows = [np.concatenate([r, np.tile(bg, (r.shape[0], w - r.shape[1], 1))], axis=1) for r in rows]
        out = np.concatenate(rows[::-1], axis=0)  # pixel rows run bottom-up: the first view ends on top
        h, w = out.shape[:2]
        img = bpy.data.images.new(os.path.basename(file), w, h, alpha=False)
        full = np.concatenate([out, np.ones((h, w, 1), dtype=np.float32)], axis=2)
        img.pixels.foreach_set(full.ravel())
        img.filepath_raw = file
        img.file_format = 'WEBP'
        img.save()
        return file

    report['renders'] = [
        sheet(['front', 'side', 'back'], os.path.join(args.dest, f'{op_id}-lods-a-silhouettes.webp')),
        sheet(['chest', 'head'], os.path.join(args.dest, f'{op_id}-lods-b-closeups-chest-head.webp')),
        sheet(['boot'], os.path.join(args.dest, f'{op_id}-lods-c-closeup-boot.webp')),
        sheet(['holster'], os.path.join(args.dest, f'{op_id}-lods-d-closeup-holster.webp')),
    ]
    report['renderColumns'] = [lab for lab, _ in cols]

    # fix round 1: visible back faces (holes, interiors seen through them) per view, flat emission with back faces in
    # the flag colour; operators:check fails a LOD over the hero's count + 0.2 % of its figure pixels
    flag = bpy.data.materials.new('backface-flag')
    flag.use_nodes = True
    fnt = flag.node_tree
    fnt.nodes.clear()
    fo = fnt.nodes.new('ShaderNodeOutputMaterial')
    fe = fnt.nodes.new('ShaderNodeEmission')
    fg = fnt.nodes.new('ShaderNodeNewGeometry')
    fm = fnt.nodes.new('ShaderNodeMix')
    fm.data_type = 'RGBA'
    fm.inputs['A'].default_value = (0.5, 0.5, 0.5, 1.0)
    fm.inputs['B'].default_value = (1.0, 0.0, 0.0, 1.0)
    fnt.links.new(fg.outputs['Backfacing'], fm.inputs['Factor'])
    fnt.links.new(fm.outputs['Result'], fe.inputs['Color'])
    fnt.links.new(fe.outputs['Emission'], fo.inputs['Surface'])
    vl = bpy.context.view_layer
    vl.material_override = flag
    scene.cycles.samples = 4
    bounces = scene.cycles.max_bounces
    scene.cycles.max_bounces = 0
    view = (scene.view_settings.view_transform, scene.view_settings.look, scene.view_settings.exposure)
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.0
    BACK = {}
    for cname, (cam, res) in cams.items():
        scene.camera = cam
        scene.render.resolution_x, scene.render.resolution_y = res
        for lab, o in cols:
            for _, other in cols:
                other.hide_render = other is not o
            path = os.path.join(scr, f'{op_id}-{cname}-{lab}-backfaces.png')
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            im = bpy.data.images.load(path)
            a = px(im)
            bpy.data.images.remove(im)
            fig = a[:, 3] > 0.5
            red = fig & (a[:, 0] > 0.6) & (a[:, 1] < 0.25)
            BACK.setdefault(lab, {})[cname] = {'px': int(red.sum()), 'figurePx': int(fig.sum()),
                                               'frac': round(float(red.sum() / max(1, fig.sum())), 5)}
    vl.material_override = None
    scene.cycles.max_bounces = bounces
    scene.view_settings.view_transform, scene.view_settings.look, scene.view_settings.exposure = view
    report['backFacePx'] = BACK
    log('back-face pixels', json.dumps({k: {c: v['px'] for c, v in d.items()} for k, d in BACK.items()}))
report['silhouetteIoU'] = SIL

# ---------------------------------------------------------------- report and README
with open(os.path.join(EXP, 'report.json'), 'w', encoding='utf-8') as fh:
    json.dump(report, fh, indent=1)
KTX = ('for f in build/operators/{op}/export/textures/*/*.png; do case "$f" in *-normal.png) '
       'toktx --t2 --encode uastc --uastc_quality 2 --zcmp 18 --assign_oetf linear --normal_mode "${{f%.png}}.ktx2" "$f";; '
       '*-orm.png) toktx --t2 --encode uastc --uastc_quality 2 --zcmp 18 --assign_oetf linear "${{f%.png}}.ktx2" "$f";; '
       '*) toktx --t2 --encode uastc --uastc_quality 2 --zcmp 18 --assign_oetf srgb "${{f%.png}}.ktx2" "$f";; esac; done').format(op=op_id)
lines = [f'# {op_id} game assets (step 10; generated by scripts/operators/py/bake_lods.py, do not edit)', '',
         f'Source: {report["source"]} ({src_tris:,} triangles). Texture scale {args.scale}. backGearM (rig.backGear): {back_gear}.', '',
         '| LOD | Triangles | Draws | Materials | Textures (PNG MB / BC7 or ASTC MB) | Skin joints (weighted) | Anchors | GLB MB |',
         '| --- | --- | --- | --- | --- | --- | --- | --- |']
for lod, r in report['lods'].items():
    lines.append(f'| {lod} | {r["triangles"]:,} | {r["draws"]} | {r["materials"]} | {r["textureMB"]["pngMB"]} / '
                 f'{r["textureMB"]["bc7MB"]} | {r["skinJoints"]} ({r["weightedJoints"]}) | '
                 f'{", ".join(f"{k}->{v}" for k, v in r["anchors"].items())} | {r["glbMB"]} |')
lines += ['', 'KTX2 (Basis UASTC, BC7 on desktop at transcode), one command from the repo root '
          '(scripts/operators/ktx2.mjs runs it next and replaces this paragraph with the measured table, step 11):', '', '```sh', KTX, '```', '']
with open(os.path.join(EXP, 'README.md'), 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(lines))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, f'{op_id}-lods.blend'), compress=False)
log('done', json.dumps({k: (v['triangles'], v['draws'], v['skinJoints'], v['anchorsMissing']) for k, v in report['lods'].items()}))
log('silhouette IoU', json.dumps(SIL))
