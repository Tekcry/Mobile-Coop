"""Guard gear kit, one piece per job (guard-models G3; PLAN 3 G3, SPEC 4): the `gear` stage's entry script.

Job contract (docs/guard-models/reports/GB-REPORT.md): `-- --seed S --stage gear --job <id> [--base <b>] --piece <p>
--kit <guards.json> --out <dir>`; writes `gear/guard-<b>-<p>.{blend,json}` (the shield, one job with no base:
`gear/guard-shield_riot.{blend,json}`).

The geometry is pure numpy (py/gear/*.py, one builder per piece, dry-run without Blender: gear/pieces.py). Here it
becomes one mesh object on the rigid-kit path (rigid_skin.py): every vertex carries its part's '_rigid' id and that
part's declared weights (one weight vector per part, on the bones the kit declares for the piece), plus '_TINT' (the
kit's tint slot index, SPEC 8) and '_PIECE' (the piece's index in the kit). Tinted parts are baked on a neutral
(tintNeutral fabric) so the per-guard tint multiplies it. LOD0 only: G4 decimates and atlases. The job fails when the
piece is over its LOD0 triangle budget or uses an undeclared bone.
"""
import json
import math
import os
import sys
import time

import bmesh
import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import common              # noqa: E402
import materials as M      # noqa: E402
import rigid_skin          # noqa: E402
from gear import pieces    # noqa: E402
from gear.fit import Fit, load_body    # noqa: E402

T0 = time.time()
args = common.parse_args({
    '--stage': {'default': 'gear'},
    '--job': {'default': ''},
    '--base': {'default': None},
    '--piece': {'required': True},
    '--kit': {'required': True},
    '--out': {'required': True},
})
common.check_version()
common.empty_scene()
common.seed_everything(args.seed)

with open(args.kit, encoding='utf-8') as fh:
    KIT = json.load(fh)
entry = pieces.kit_entry(KIT, args.piece)
own = pieces.own_glb(entry)
base = args.base or (pieces.SHIELD_BASE if own else None)
if base is None:
    raise SystemExit(f'gear: --base is required for {args.piece}')
# the stage's job set (P1 kit: 25 jobs); a job outside it still builds (old driver) but says so in the report
in_job_set = (None if own else base, args.piece) in pieces.gear_jobs(KIT)
if not in_job_set:
    print(f'gear: note: ({base}, {args.piece}) is not in the kit\'s gear job set (no kind of this base shows it)')
stem = f'guard-{args.piece}' if own and not args.base else f'guard-{base}-{args.piece}'
out_dir = os.path.join(args.out, 'gear')
os.makedirs(out_dir, exist_ok=True)

env_offset = float((KIT.get('face') or {}).get('envelopeOffset', 0.015))
fit = Fit(base, env_offset, load_body(args.out, base))
P = pieces.build(args.piece, fit, entry)
budget = int((entry.get('tris') or [0])[0])
tris = P.tris()
if budget and tris > budget:
    raise SystemExit(f'gear: {stem} has {tris} triangles, over its LOD0 budget {budget}')

SLOTS = KIT.get('tintSlots') or ['uniform', 'kit', 'headwear', 'hair', 'skin', 'none']
PIECE_IDS = [p['id'] for p in KIT.get('pieces', []) if isinstance(p, dict)]
piece_index = PIECE_IDS.index(args.piece)
NEUTRAL = float((KIT.get('tintNeutral') or {}).get('fabric', 0.4))

# --- mesh -----------------------------------------------------------------------------------------------------------
V, F, VP = P.arrays()
me = bpy.data.meshes.new(stem)
me.from_pydata([tuple(map(float, v)) for v in V], [], [tuple(f) for f in F])
me.update()
obj = bpy.data.objects.new(stem, me)
bpy.context.scene.collection.objects.link(obj)

# rigid ids: unique per (piece, part) across a base's pieces (G4 joins them all into one mesh)
RID0 = 1000 + piece_index * 20
reg = {}
for k, part in enumerate(P.parts):
    rid = RID0 + k + 1
    reg[rid] = {'id': rid, 'name': part['name'], 'bones': part['bones'], 'role': part['role'], 'item': args.piece,
                'tint': part['tint']}
rigid_skin.set_ids(me, RID0 + 1 + VP)
used, counts = rigid_skin.apply(obj, reg, lambda p: [], V)

tint_ids = np.array([SLOTS.index(P.parts[int(i)]['tint']) for i in VP], np.float32)
# 'edge': distance to a panel edge in Wren's fabric shaders (cordura's edge wear); the gear has no cut panels: far.
for name, vals in (('_TINT', tint_ids), ('_PIECE', np.full(len(V), piece_index, np.float32)), ('edge', np.ones(len(V), np.float32))):
    at = me.attributes.new(name, 'FLOAT', 'POINT')
    at.data.foreach_set('value', vals)

# --- materials: one per (material key, tinted) ----------------------------------------------------------------------
DARK = (0.028, 0.029, 0.031)


def lens(name, colour, rough):
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'lens'
    g = M.Graph(mat)
    g.bsdf.inputs['Base Color'].default_value = (*colour, 1)
    g.bsdf.inputs['Roughness'].default_value = rough
    g.bsdf.inputs['Coat Weight'].default_value = 0.6
    return mat


def make_material(key, tinted):
    c = (NEUTRAL,) * 3 if tinted else DARK
    nm = f'{key}{" (tint)" if tinted else ""}'
    if key == 'twill':
        return M.ripstop(nm, c)
    if key == 'knit':
        return M.knit(nm, c if tinted else (0.024, 0.025, 0.026))
    if key == 'cordura':
        return M.cordura(nm, c)
    if key == 'webbing':
        return M.webbing(nm, c)
    if key in ('polymer', 'shell', 'shield'):
        return M.polymer(nm, c, rough=0.62 if key == 'shell' else 0.7)
    if key == 'gloss':
        return M.polymer(nm, c, rough=0.25)
    if key == 'foam':
        return M.polymer(nm, (0.02, 0.02, 0.021), rough=0.95)
    if key == 'metal':
        return M.gunmetal(nm)
    if key == 'rubber':
        return M.rubber(nm)
    if key == 'cord':
        return M.thread(nm, c if tinted else (0.03, 0.03, 0.031))
    if key == 'lens_dark':
        return lens(nm, (0.012, 0.013, 0.015), 0.06)
    if key in ('visor', 'port'):
        return lens(nm, (0.05, 0.055, 0.06), 0.05)
    raise SystemExit(f'gear: unknown material key {key}')


slot_of = {}
mat_idx = []
for f, key in zip(F, P.fmat):
    tinted = P.parts[int(VP[f[0]])]['tint'] != 'none'
    k = (key, tinted)
    if k not in slot_of:
        slot_of[k] = len(me.materials)
        me.materials.append(make_material(key, tinted))
    mat_idx.append(slot_of[k])
me.polygons.foreach_set('material_index', mat_idx)

# --- normals (outward), smooth with sharp creases, the 'pattern' UV (box projection in metres) ----------------------
bm = bmesh.new()
bm.from_mesh(me)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for fc in bm.faces:
    fc.smooth = True
for e in bm.edges:
    if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(48):
        e.smooth = False
uv = bm.loops.layers.uv.new('pattern')
for fc in bm.faces:
    n = fc.normal
    ax = max(range(3), key=lambda i: abs(n[i]))
    a, b = [i for i in range(3) if i != ax]
    for lp in fc.loops:
        lp[uv].uv = (lp.vert.co[a], lp.vert.co[b])
bm.to_mesh(me)
bm.free()
me.update()

# --- checks: every vertex carries exactly its part's weight vector on declared bones ------------------------------
declared = set(entry.get('bones') or [])
spread = 0.0
groups = {g.index: g.name for g in obj.vertex_groups}
for v in me.vertices:
    want = P.parts[int(VP[v.index])]['bones']
    got = {groups[g.group]: g.weight for g in v.groups}
    for b in set(want) | set(got):
        spread = max(spread, abs(want.get(b, 0.0) - got.get(b, 0.0)))
if spread > 1e-4 or not set(used) <= declared:
    raise SystemExit(f'gear: {stem} skin check failed (spread {spread}, bones {used} vs declared {sorted(declared)})')

obj['guard_piece'] = args.piece
obj['guard_base'] = base
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(os.path.join(out_dir, f'{stem}.blend')))

lo, hi = P.bounds()
to_game = lambda p: [round(float(-p[0]), 4), round(float(p[2]), 4), round(float(-p[1]), 4)]    # noqa: E731
glo, ghi = to_game(lo), to_game(hi)
part_tris = P.part_tris()
report = {
    'job': args.job, 'stage': args.stage, 'piece': args.piece, 'base': base, 'kind': entry.get('kind'), 'fit': entry.get('fit'),
    'seed': args.seed, 'blender': bpy.app.version_string,
    'tris': tris, 'budgetLod0': budget, 'withinBudget': tris <= budget if budget else None, 'verts': len(V),
    'bones': used, 'declaredBones': sorted(declared), 'skinSpread': round(spread, 6),
    'tint': entry.get('tint'), 'tintSlots': SLOTS, 'pieceIndex': piece_index, 'inJobSet': in_job_set,
    'parts': [{**reg[RID0 + k + 1], 'verts': int(counts.get(RID0 + k + 1, 0)), 'tris': part_tris[k]} for k in range(len(P.parts))],
    'measurements': {'rigid': list(reg.values())},
    'materials': [m.name for m in me.materials],
    'boundsBlender': {'min': [round(float(x), 4) for x in lo], 'max': [round(float(x), 4) for x in hi]},
    'boundsGame': {'min': [min(a, b) for a, b in zip(glo, ghi)], 'max': [max(a, b) for a, b in zip(glo, ghi)]},
    'anchors': P.anchors,
    'fitTargets': fit.report(),
    'seconds': round(time.time() - T0, 2),
}
with open(os.path.join(out_dir, f'{stem}.json'), 'w', encoding='utf-8') as fh:
    json.dump(report, fh, indent=2)
print(f'gear: {stem} {tris} tris (budget {budget}), {len(V)} verts, bones {used}, {report["seconds"]} s')
