"""Marlow Yard facility kit (marlow-final M5): the reusable luxury training-hall pieces, built headless.

  blender -b --factory-startup -noaudio --python-exit-code 1 --python build_kit.py -- --seed N --out DIR

Every piece is modelled in the GAME frame (metres: +X right, +Y up, +Z out of the face; docs/marlow-final/KIT.md has
each piece's frame and module size) and converted to Blender (`G`, as scripts/weapons/py/wlib.py) so Blender's
outward, counter-clockwise faces stay front faces through the glTF writer and the game's GLB reader
(src/operators/lab/glb.ts). One GLB holds every piece: one mesh per (piece, material), named `<piece>.<material>`,
flat-shaded hard surface (sharp edges over 30 deg), no UVs and no textures (the game's kit renderer owns the look,
src/world/kit/kitRender.ts). Output: <out>/facility-kit.glb and <out>/facility-kit.json (triangles, bounds, bytes).
Low poly on purpose (prototype quality, believable at a glance): budgets per piece in src/world/kit/facilityKit.ts.
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

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'operators', 'py'))
import common  # noqa: E402

# glTF material factors (linear); the renderer replaces them by name with its own table (kitRender.ts KIT_LOOK)
MATERIALS = {
    'composite': ((0.024, 0.027, 0.031), 0.55, 0.05, (0, 0, 0)),   # charcoal composite panel
    'metal': ((0.50, 0.52, 0.54), 0.30, 0.90, (0, 0, 0)),          # brushed stainless trim
    'metalDark': ((0.045, 0.048, 0.053), 0.40, 0.75, (0, 0, 0)),    # graphite anodised housings
    'reveal': ((0.004, 0.0045, 0.005), 0.85, 0.0, (0, 0, 0)),       # shadow-gap black
    'glass': ((0.34, 0.47, 0.51), 0.05, 0.0, (0, 0, 0)),            # clear glass
    'frosted': ((0.72, 0.78, 0.80), 0.55, 0.0, (0, 0, 0)),          # acid-etched glass / film
    'led': ((1, 1, 1), 1.0, 0.0, (1, 1, 1)),                         # LED line (tinted per instance)
    'status': ((1, 1, 1), 1.0, 0.0, (1, 1, 1)),                      # door status bar (green / red per instance)
}

# piece -> material -> bmesh
PIECES = {}


def G(x, y, z):
    """Game frame to Blender (the weapons' mapping)."""
    return Vector((-x, -z, y))


def bm_of(piece, mat):
    if mat not in MATERIALS:
        raise SystemExit(f'unknown material {mat}')
    return PIECES.setdefault(piece, {}).setdefault(mat, bmesh.new())


def box(piece, mat, lo, hi, bevel=0.0):
    """An axis-aligned box from game-frame corners lo..hi, optionally chamfered (one segment) on every edge."""
    bm = bm_of(piece, mat)
    c = G((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)
    sx, sy, sz = hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]
    if min(sx, sy, sz) <= 0:
        raise SystemExit(f'{piece}.{mat}: empty box {lo} {hi}')
    m = Matrix.Translation(c) @ Matrix.Diagonal((sx, sz, sy, 1.0))
    verts = bmesh.ops.create_cube(bm, size=1.0, matrix=m)['verts']
    if bevel > 0:
        b = min(bevel, 0.45 * min(sx, sy, sz))
        edges = list({e for v in verts for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=verts + edges, offset=b, offset_type='OFFSET', segments=1, profile=0.5, affect='EDGES', clamp_overlap=True)


def cyl_x(piece, mat, x0, x1, y, z, r, segs=8):
    """A cylinder along the game x axis (rails)."""
    bm = bm_of(piece, mat)
    L = x1 - x0
    c = G((x0 + x1) / 2, y, z)
    # create_cone builds along Blender z; game x is Blender -x: turn z onto x
    m = Matrix.Translation(c) @ Matrix.Rotation(math.pi / 2, 4, 'Y')
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=r, depth=L, matrix=m)


# ------------------------------------------------------------------------------------------------------------ pieces
# Frames: a wall-mounted piece has its back on the wall face at z 0 and faces +z; the run goes along +x, centred on
# x 0; y 0 is its base. A free-standing piece (glass, rail, door leaf) is centred on z 0.

def wall_panel():
    """1.2 m x 3.0 m charcoal composite cladding: two panels split by a brushed dado trim, an LED cove under a
    brushed fascia near the top (an uplight wash), a top cap. 12 mm open joints between modules show the wall box
    behind (its colour: KIT_BOX_COLOR). Back at z 0 (the wall face), front 30 mm out."""
    p = 'wallPanel'
    h = 0.594
    box(p, 'composite', (-h, 0.0, 0.004), (h, 0.995, 0.030), 0.003)
    box(p, 'composite', (-h, 1.055, 0.004), (h, 2.700, 0.030), 0.003)
    box(p, 'metal', (-0.6, 0.995, 0.004), (0.6, 1.055, 0.040), 0.002)          # dado trim, 1 cm proud
    box(p, 'reveal', (-0.6, 2.700, 0.004), (0.6, 2.780, 0.012))                # the cove's shadow recess
    box(p, 'led', (-0.6, 2.735, 0.012), (0.6, 2.752, 0.016))                    # the LED line in the cove
    box(p, 'metal', (-0.6, 2.780, 0.004), (0.6, 2.860, 0.060), 0.002)          # fascia lip (3 cm out, hides the LED)
    box(p, 'composite', (-h, 2.860, 0.004), (h, 3.000, 0.030), 0.003)          # top cap


def wall_upper():
    """1.2 m x 1.5 m plain composite panel for halls over 3 m (stacked on wallPanel)."""
    box('wallUpper', 'composite', (-0.594, 0.006, 0.004), (0.594, 1.494, 0.030), 0.003)


def glass_module(p, frosted):
    """1.5 m x 3.0 m glazed partition module: a full-height pane in slim brushed head / sill channels, half mullions
    at both ends (two modules make one 50 mm mullion). Clear panes carry a frosted manifestation band at 1.0-1.1 m
    (real safety marking); frosted panes are acid-etched all over. Centred on z 0, 80 mm deep."""
    box(p, 'metalDark', (-0.75, 0.0, -0.04), (0.75, 0.06, 0.04), 0.002)       # sill channel
    box(p, 'metalDark', (-0.75, 2.94, -0.04), (0.75, 3.0, 0.04), 0.002)       # head channel
    for s in (-1, 1):
        box(p, 'metal', (min(s * 0.75, s * 0.725), 0.06, -0.035), (max(s * 0.75, s * 0.725), 2.94, 0.035), 0.002)
    box(p, 'frosted' if frosted else 'glass', (-0.725, 0.06, -0.006), (0.725, 2.94, 0.006))
    if not frosted:
        box(p, 'frosted', (-0.725, 1.0, -0.0075), (0.725, 1.1, 0.0075))


def door_frame():
    """Sliding-door surround for one wall face, for a 2.0 m x 2.1 m opening (scaled along x for 1.6-2.4 m): brushed
    architrave round the opening, a graphite motor-head housing over it with a status bar (green unlocked, red
    locked: the renderer reads the door's lock). Back at z 0 on the face, opening centred on x 0."""
    p = 'doorFrame'
    for s in (-1, 1):
        box(p, 'metal', (min(s * 1.0, s * 1.06), 0.0, 0.0), (max(s * 1.0, s * 1.06), 2.16, 0.022), 0.002)
    box(p, 'metal', (-1.06, 2.10, 0.0), (1.06, 2.16, 0.022), 0.002)
    box(p, 'metalDark', (-1.10, 2.16, 0.0), (1.10, 2.42, 0.085), 0.004)        # the motor head
    box(p, 'reveal', (-0.46, 2.245, 0.085), (0.46, 2.285, 0.088))
    box(p, 'status', (-0.42, 2.255, 0.088), (0.42, 2.275, 0.092))


def door_jamb():
    """The opening's brushed linings (both jambs and the soffit) for a 2.0 m opening through a 1 m deep wall: scaled
    along x by the opening and along z by the wall's thickness. Centred on the wall's middle plane."""
    p = 'doorJamb'
    for s in (-1, 1):
        box(p, 'metal', (min(s * 0.985, s * 1.0), 0.0, -0.5), (max(s * 0.985, s * 1.0), 2.10, 0.5))
    box(p, 'metal', (-1.0, 2.085, -0.5), (1.0, 2.10, 0.5))


def door_leaf():
    """One motorised leaf, 1.0 m x 2.08 m x 40 mm, symmetric (both leaves of a pair are this piece): charcoal
    composite, brushed edge caps, a brushed kick band and a recessed pull channel near each edge. Centred on x 0 and
    z 0, base at y 0.01 (a floor-guide gap)."""
    p = 'doorLeaf'
    box(p, 'composite', (-0.49, 0.01, -0.02), (0.49, 2.08, 0.02), 0.003)
    for s in (-1, 1):
        box(p, 'metal', (min(s * 0.49, s * 0.5), 0.01, -0.021), (max(s * 0.49, s * 0.5), 2.08, 0.021))
        box(p, 'metal', (-0.49, 0.01, min(s * 0.02, s * 0.022)), (0.49, 0.16, max(s * 0.02, s * 0.022)))
        for e in (-1, 1):   # pull channels on both faces near both edges
            x0, x1 = sorted((e * 0.40, e * 0.42))
            box(p, 'reveal', (x0, 0.85, min(s * 0.02, s * 0.0215)), (x1, 1.35, max(s * 0.02, s * 0.0215)))


def led_slot():
    """A 1 m run of surface-mounted linear LED slot profile under a ceiling (top at y 0, flush), 80 mm wide: graphite
    channel, the diffuser recessed 25 mm up inside it. Scaled along x by the run. When the slot is a real light
    the light's fixture box draws the diffuser (it goes dark with the light); the renderer then skips `led`."""
    p = 'ledSlot'
    box(p, 'metalDark', (-0.5, -0.005, -0.04), (0.5, 0.0, 0.04))               # back plate on the ceiling
    for s in (-1, 1):
        box(p, 'metalDark', (-0.5, -0.045, min(s * 0.026, s * 0.04)), (0.5, -0.005, max(s * 0.026, s * 0.04)), 0.002)
    box(p, 'reveal', (-0.5, -0.025, -0.026), (0.5, -0.005, 0.026))
    box(p, 'led', (-0.5, -0.030, -0.025), (0.5, -0.025, 0.025))


def skirting():
    """A 1 m run of recessed brushed skirting (120 mm) with an LED toe-kick line in its shadow gap washing the floor.
    Back on the wall face at z 0, 22 mm out."""
    p = 'skirting'
    box(p, 'reveal', (-0.5, 0.0, 0.0), (0.5, 0.03, 0.009))
    box(p, 'led', (-0.5, 0.012, 0.009), (0.5, 0.019, 0.012))
    box(p, 'metal', (-0.5, 0.03, 0.0), (0.5, 0.12, 0.022), 0.002)


def column():
    """Column cladding on a 1 m x 1 m x 3 m unit (scaled to the column box): a charcoal panel per face between
    brushed corner angles, a vertical LED reveal up each face, brushed base and head collars. The unit's faces are at
    +-0.5 (the column box); the cladding stands 15 mm proud in unit terms."""
    p = 'column'
    o, k = 0.515, 0.47      # outer face, panel half-width
    for ax in (0, 1):
        for s in (-1, 1):
            if ax == 0:   # faces at x = s * 0.5
                for a, b in ((-k, -0.012), (0.012, k)):
                    box(p, 'composite', (min(s * 0.5, s * o), 0.10, a), (max(s * 0.5, s * o), 2.88, b), 0.002)
                box(p, 'led', (min(s * 0.5, s * (o - 0.004)), 0.10, -0.012), (max(s * 0.5, s * (o - 0.004)), 2.88, 0.012))
            else:         # faces at z = s * 0.5
                for a, b in ((-k, -0.012), (0.012, k)):
                    box(p, 'composite', (a, 0.10, min(s * 0.5, s * o)), (b, 2.88, max(s * 0.5, s * o)), 0.002)
                box(p, 'led', (-0.012, 0.10, min(s * 0.5, s * (o - 0.004))), (0.012, 2.88, max(s * 0.5, s * (o - 0.004))))
    for sx in (-1, 1):
        for sz in (-1, 1):   # corner angles
            box(p, 'metal', (min(sx * k, sx * (o + 0.005)), 0.10, min(sz * k, sz * (o + 0.005))),
                (max(sx * k, sx * (o + 0.005)), 2.88, max(sz * k, sz * (o + 0.005))), 0.002)
    box(p, 'metal', (-(o + 0.01), 0.0, -(o + 0.01)), (o + 0.01, 0.10, o + 0.01), 0.003)
    box(p, 'metal', (-(o + 0.01), 2.88, -(o + 0.01)), (o + 0.01, 3.0, o + 0.01), 0.003)


def handrail():
    """A 1.5 m module of the instructor gallery's glass balustrade: brushed half posts at both ends, a 50 mm round
    top rail at 1.0 m with an LED line under it, a graphite base shoe, a clear glass infill. Centred on z 0."""
    p = 'handrail'
    for s in (-1, 1):
        box(p, 'metal', (min(s * 0.725, s * 0.75), 0.10, -0.022), (max(s * 0.725, s * 0.75), 0.975, 0.022), 0.002)
    cyl_x(p, 'metal', -0.75, 0.75, 1.0, 0.0, 0.025, 10)
    box(p, 'led', (-0.725, 0.968, -0.006), (0.725, 0.976, 0.006))
    box(p, 'metalDark', (-0.75, 0.0, -0.035), (0.75, 0.10, 0.035), 0.003)
    box(p, 'glass', (-0.725, 0.10, -0.006), (0.725, 0.95, 0.006))


BUILDERS = [wall_panel, wall_upper, lambda: glass_module('glassClear', False), lambda: glass_module('glassFrosted', True),
            door_frame, door_jamb, door_leaf, led_slot, skirting, column, handrail]


# ------------------------------------------------------------------------------------------------------------ export

def mesh_arrays(bm):
    """Triangulated, flat-shaded (sharp over 30 deg) arrays in glTF's frame: positions, normals, indices."""
    # (no remove_doubles / recalc: each primitive is a closed shell with outward faces already; merging touching
    # shells would join them into odd regions. The export below welds identical corners anyway.)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
    me = bpy.data.meshes.new('kit-tmp')
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
    idx = inv.ravel()[tri].astype(np.uint32)
    bpy.data.meshes.remove(me)
    return P[first].astype(np.float32), N[first].astype(np.float32), idx


def write_glb(path, meshes):
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
        'asset': {'version': '2.0', 'generator': 'night-shift scripts/facility-kit'},
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


def main():
    args = common.parse_args({'--out': {'required': True}})
    common.check_version()
    common.empty_scene()
    common.seed_everything(args.seed)
    os.makedirs(args.out, exist_ok=True)
    for b in BUILDERS:
        b()
    meshes = []
    report = {'pieces': {}, 'materials': list(MATERIALS), 'blender': bpy.app.version_string}
    for piece, mats in PIECES.items():
        info = {'meshes': {}, 'triangles': 0}
        lo = np.array([np.inf] * 3)
        hi = -lo
        for mat, bm in mats.items():
            P, N, idx = mesh_arrays(bm)
            bm.free()
            name = f'{piece}.{mat}'
            meshes.append((name, mat, P, N, idx))
            t = int(len(idx) // 3)
            info['meshes'][mat] = t
            info['triangles'] += t
            g = P * np.array([-1, 1, 1], np.float32)   # glTF -> game (the reader's mirror)
            lo = np.minimum(lo, g.min(0))
            hi = np.maximum(hi, g.max(0))
        info['bounds'] = {'min': [round(float(v), 4) for v in lo], 'max': [round(float(v), 4) for v in hi]}
        report['pieces'][piece] = info
    glb = os.path.join(args.out, 'facility-kit.glb')
    report['bytes'] = write_glb(glb, meshes)
    report['triangles'] = sum(p['triangles'] for p in report['pieces'].values())
    with open(os.path.join(args.out, 'facility-kit.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=1)
    print('facility-kit', json.dumps({k: v['triangles'] for k, v in report['pieces'].items()}), 'bytes', report['bytes'])


main()
