"""Shared helpers of the campus prop builds (sector-redesign ART-KIT step 3): the base kit (kit.py) and the section hero
sets (hero_s<N>.py) import this module. The helpers are the facility props build's (scripts/facility-props/build.py
lines 1-140: `G`, `bm_of`, `game_rot`, `to_blender`, `box`, `obox`, `cyl`, `prism_x`) with the MATERIALS table passed
in (`set_materials`), plus `export(pieces, out, name)`, which writes `<name>.glb` and `<name>.json` in the facility
report shape ({ pieces: { id: { triangles, bounds, meshes: { material: triangles } } }, triangles, bytes }).

Every piece is modelled in the GAME frame (metres: +X right, +Y up, +Z the piece's front) and converted to Blender by
conjugating with the game -> Blender mirror (G(x, y, z) = (-x, -z, y)), so outward faces stay front faces through the
glTF writer and the game's GLB reader (src/operators/lab/glb.ts). One mesh per (piece, material) named
`<piece>.<material>`, flat-shaded hard surface (sharp over 30 deg), triangulated, no UVs, no textures (the game's
renderer owns the look by material name: CAMPUS_LOOK / PROP_LOOK).
"""
import json
import math
import os
import struct
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'operators', 'py'))
import common  # noqa: E402,F401  (re-exported for the set scripts)

# glTF material factors by name (linear base colour, roughness, metallic, emissive); set by the set script
MATERIALS = {}
# piece -> material -> bmesh
PIECES = {}


def set_materials(table):
    MATERIALS.clear()
    MATERIALS.update(table)


# game -> Blender: G(x, y, z) = (-x, -z, y), a mirror (det -1). A game-frame transform T becomes M T M^T in Blender,
# a proper transform, so primitives built there keep outward faces.
M3 = Matrix(((-1, 0, 0), (0, 0, -1), (0, 1, 0)))
M4 = M3.to_4x4()
M4T = M4.transposed()


def G(x, y, z):
    return Vector((-x, -z, y))


def bm_of(piece, mat):
    if mat not in MATERIALS:
        raise SystemExit(f'unknown material {mat}')
    return PIECES.setdefault(piece, {}).setdefault(mat, bmesh.new())


def game_rot(yaw=0.0, pitch=0.0, roll=0.0):
    """Game-frame rotation (radians): roll about +z, then pitch about +x, then yaw about +y (Babylon's yaw)."""
    return Matrix.Rotation(yaw, 4, 'Y') @ Matrix.Rotation(pitch, 4, 'X') @ Matrix.Rotation(roll, 4, 'Z')


def to_blender(game_matrix):
    return M4 @ game_matrix @ M4T


def box(piece, mat, lo, hi, bevel=0.0):
    """An axis-aligned box from game-frame corners lo..hi (any order), optionally chamfered (one segment)."""
    c = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)
    s = (abs(hi[0] - lo[0]), abs(hi[1] - lo[1]), abs(hi[2] - lo[2]))
    obox(piece, mat, c, s, bevel=bevel)


def obox(piece, mat, c, s, yaw=0.0, pitch=0.0, roll=0.0, bevel=0.0):
    """An oriented box: centre c, size s (game local x, y, z), rotated by yaw / pitch / roll about its centre."""
    if min(s) <= 0:
        raise SystemExit(f'{piece}.{mat}: empty box {c} {s}')
    bm = bm_of(piece, mat)
    mg = Matrix.Translation(Vector(c)) @ game_rot(yaw, pitch, roll) @ Matrix.Diagonal((s[0], s[1], s[2], 1.0))
    verts = bmesh.ops.create_cube(bm, size=1.0, matrix=to_blender(mg))['verts']
    if bevel > 0:
        b = min(bevel, 0.45 * min(s))
        bm.edges.index_update()
        # (determinism) a set of BMEdges iterates in memory order: sort by index so the bevel, and the GLB, are the same every build
        edges = sorted({e for v in verts for e in v.link_edges}, key=lambda e: e.index)
        bmesh.ops.bevel(bm, geom=verts + edges, offset=b, offset_type='OFFSET', segments=1, profile=0.5, affect='EDGES', clamp_overlap=True)


def cyl(piece, mat, c, r, h, axis='y', segs=8, r2=None, yaw=0.0, pitch=0.0, roll=0.0):
    """A cylinder (or a frustum with top radius r2) of length h centred on c along a game axis, then rotated."""
    bm = bm_of(piece, mat)
    lay = {'y': Matrix.Identity(4), 'x': Matrix.Rotation(-math.pi / 2, 4, 'Z'), 'z': Matrix.Rotation(math.pi / 2, 4, 'X')}[axis]
    mg = Matrix.Translation(Vector(c)) @ game_rot(yaw, pitch, roll) @ lay
    # create_cone builds along Blender local z, which is game local +y under the conjugation
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2,
                          depth=h, matrix=to_blender(mg))


def prism_x(piece, mat, profile, x0, x1):
    """A closed prism along game x from a (z, y) profile polygon (convex or simple), outward faces."""
    bm = bm_of(piece, mat)
    a = [bm.verts.new(G(x0, y, z)) for z, y in profile]
    b = [bm.verts.new(G(x1, y, z)) for z, y in profile]
    n = len(profile)
    faces = [bm.faces.new(a), bm.faces.new(list(reversed(b)))]
    for i in range(n):
        j = (i + 1) % n
        faces.append(bm.faces.new((a[i], a[j], b[j], b[i])))
    bmesh.ops.recalc_face_normals(bm, faces=faces)


# ------------------------------------------------------------------------------------------------------------ export
# (the facility kit's export, unchanged in format: positions + normals + uint32 indices, factor materials)

def mesh_arrays(bm):
    """Triangulated, flat-shaded (sharp over 30 deg) arrays in glTF's frame: positions, normals, indices."""
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    me = bpy.data.meshes.new('campus-tmp')
    bm.to_mesh(me)
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(30.0))
    me.calc_loop_triangles()
    nl = len(me.loops)
    vi = np.empty(nl, np.int32)
    me.loops.foreach_get('vertex_index', vi)
    nor = np.empty(nl * 3, np.float32)
    me.corner_normals.foreach_get('vector', nor)
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)[vi]
    nor = nor.reshape(-1, 3)
    tri = np.empty(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get('loops', tri)
    rot = lambda a: np.stack([a[:, 0], a[:, 2], -a[:, 1]], 1)  # noqa: E731  Blender -> glTF (a rotation)
    P, N = rot(co), rot(nor)
    key = np.concatenate([np.round(P, 6), np.round(N, 4)], 1)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    t3 = inv.ravel()[tri].reshape(-1, 3)
    # (determinism) bmesh ops (bevel) may emit faces in memory order: put each triangle's lowest index first (winding
    # kept) and sort the triangles, so the same geometry always writes the same bytes
    r = np.argmin(t3, 1)
    t3 = np.stack([t3[np.arange(len(t3)), (r + k) % 3] for k in range(3)], 1)
    t3 = t3[np.lexsort((t3[:, 2], t3[:, 1], t3[:, 0]))]
    idx = t3.ravel().astype(np.uint32)
    bpy.data.meshes.remove(me)
    return P[first].astype(np.float32), N[first].astype(np.float32), idx


def write_glb(path, meshes, generator):
    """meshes: [(name, material name, P, N, idx)] -> one GLB, a node per mesh, factor-only materials."""
    blobs, views, accessors = [], [], []
    off = 0

    def add(data, target):
        nonlocal off
        b = data.tobytes()
        pad = (-len(b)) % 4
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), 'target': target})
        blobs.append(b + b'\0' * pad)
        off += len(b) + pad
        return len(views) - 1

    def acc(data, comp, typ, target, minmax=False):
        a = {'bufferView': add(data, target), 'componentType': comp, 'count': int(data.shape[0]), 'type': typ}
        if minmax:
            a['min'] = [float(x) for x in data.min(0)]
            a['max'] = [float(x) for x in data.max(0)]
        accessors.append(a)
        return len(accessors) - 1

    mat_names = list(MATERIALS)
    meshes_js, nodes_js = [], []
    for name, mat, P, N, idx in meshes:
        prim = {'attributes': {'POSITION': acc(P, 5126, 'VEC3', 34962, True), 'NORMAL': acc(N, 5126, 'VEC3', 34962)},
                'indices': acc(idx, 5125, 'SCALAR', 34963), 'material': mat_names.index(mat)}
        meshes_js.append({'name': name, 'primitives': [prim]})
        nodes_js.append({'name': name, 'mesh': len(meshes_js) - 1})
    mats = []
    for n in mat_names:
        base, rough, metal, em = MATERIALS[n]
        mats.append({'name': n, 'pbrMetallicRoughness': {'baseColorFactor': [*base, 1.0], 'roughnessFactor': rough, 'metallicFactor': metal},
                     'emissiveFactor': list(em)})
    gl = {
        'asset': {'version': '2.0', 'generator': generator},
        'scene': 0, 'scenes': [{'nodes': list(range(len(nodes_js)))}],
        'nodes': nodes_js, 'meshes': meshes_js, 'materials': mats,
        'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': off}],
    }
    js = json.dumps(gl, separators=(',', ':')).encode('utf8')
    js += b' ' * ((-len(js)) % 4)
    bin_ = b''.join(blobs)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A))
        f.write(js)
        f.write(struct.pack('<II', len(bin_), 0x004E4942))
        f.write(bin_)
    return os.path.getsize(path)


def export(pieces, out, name, seed=0):
    """Writes <out>/<name>.glb and <out>/<name>.json (the facility report shape) for the built pieces (`PIECES`, or a
    subset dict of it), in insertion order. Returns the report."""
    meshes = []
    report = {'pieces': {}, 'materials': list(MATERIALS), 'blender': bpy.app.version_string, 'seed': seed}
    for piece, mats in pieces.items():
        info = {'meshes': {}, 'triangles': 0}
        lo = np.array([np.inf] * 3)
        hi = -lo
        for mat, bm in mats.items():
            P, N, idx = mesh_arrays(bm)
            bm.free()
            meshes.append((f'{piece}.{mat}', mat, P, N, idx))
            t = int(len(idx) // 3)
            info['meshes'][mat] = t
            info['triangles'] += t
            g = P * np.array([-1, 1, 1], np.float32)   # glTF -> game (the reader's mirror)
            lo = np.minimum(lo, g.min(0))
            hi = np.maximum(hi, g.max(0))
        info['bounds'] = {'min': [round(float(v), 4) for v in lo], 'max': [round(float(v), 4) for v in hi]}
        report['pieces'][piece] = info
    os.makedirs(out, exist_ok=True)
    report['bytes'] = write_glb(os.path.join(out, f'{name}.glb'), meshes, f'night-shift scripts/campus-props ({name})')
    report['triangles'] = sum(p['triangles'] for p in report['pieces'].values())
    with open(os.path.join(out, f'{name}.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=1)
    print(name, json.dumps({k: v['triangles'] for k, v in report['pieces'].items()}), 'bytes', report['bytes'])
    return report
