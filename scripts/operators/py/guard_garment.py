"""Guard bake stage `garments` (docs/guard-models/PLAN.md G2, SPEC sections 4 and 8): one garment part on one guard
base, drafted from that base's own body by Wren's cloth pipeline, run unchanged (build_garment.py, garment_details.py,
build_fitted.py; DECISIONS A11, A18).

Run by guard-bake.mjs through the part's own script, which hands over here when it runs as the main script:
  blender -b ... --python garments/<module>.py -- --seed S --stage garments --job garments-<base>-<part>
    --base <base> --garment <part> [--variant rolled|work] --kit <guards.json> --out <dir>
Reads bodies/guard-<base>-body.{blend,json} (G1) under --out. Writes garments/guard-<base>-<part>.blend (only the part's
own objects: its hero mesh, details and the welded cloth shell `guard-<base>-<part>`; no body, no rig) and
garments/guard-<base>-<part>.json (measurements, seams, objects with their triangle counts, the layer chain, timings).

Layers: the jobs of a stage run in parallel and need only the body, so a part worn over another (trousers over the
tucked shirt and the boot shaft, the jacket over the shirt and the trousers) rebuilds the parts under it in its own
work folder first, with the same scripts, seed and settings as their own jobs (`chains` in guard_garments.json), and is
sewn over them exactly as Wren's garments are over hers (--under: drafted with a layer allowance, pushed clear of
them after the simulation). The copies are deleted; only the part's own objects ship.

Parts and variants (guard_garments.json `parts`): shirt and shirt_rolled (combat_shirt.py; `rolled`: the sleeves are
simulated full length, then cut above the elbow and finished with a rolled cuff), trousers and work_trousers
(trousers.py), boots (boots.py), gloves and work_gloves (gloves.py), jacket and work_jacket (field_jacket.py).
"""
import argparse
import gc
import importlib.util
import json
import math
import os
import runpy
import shutil
import sys
import time

import bmesh
import bpy
import numpy as np

PY = os.path.dirname(os.path.abspath(__file__))
GARMENT_DIR = os.path.join(PY, 'garments')
for _p in (GARMENT_DIR, PY):
    if _p not in sys.path:
        sys.path.insert(0, _p)
import common  # noqa: E402

LAYERS_FILE = os.path.join(PY, 'guard_garments.json')


def load_layers():
    with open(LAYERS_FILE, encoding='utf-8') as f:
        return json.load(f)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, required=True)
    ap.add_argument('--stage', default='garments')
    ap.add_argument('--job', default=None)
    ap.add_argument('--base', required=True)
    ap.add_argument('--garment', required=True)
    ap.add_argument('--variant', default='')
    ap.add_argument('--kit', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--frames', type=int, default=None)
    ap.add_argument('--keep-work', action='store_true', help='keep the work folder (the chain copies) after a success')
    return ap.parse_args(argv)


def chain_of(layers, base, part):
    """The parts rebuilt under `part` on `base`, inner first (guard_garments.json `chains`)."""
    return list(layers.get('chains', {}).get(base, {}).get(part, []))


def outfits_of(kit, layers, base, part):
    """The outfits on this base (from its kinds) that wear the part."""
    wear = sorted({k['outfit'] for k in kit.get('kinds', []) if k.get('base') == base})
    return [o for o in wear if part in layers['outfits'].get(o, [])]


# --- the work folder: the body as Wren's stages expect it -------------------------------------------------------------
def prepare_body(out, base, work):
    """Copies the G1 body into the work folder under Wren's names (<op>-body.blend / .json, `height` added). The head
    G1 cut off at the neck seam (`guard-<base>-headref`, hidden) is joined into the body mesh unweighted, so the cloth
    has the head to collide with at the collar (it never deforms and never ships)."""
    op = f'guard-{base}'
    src_blend = os.path.join(out, 'bodies', f'{op}-body.blend')
    src_json = os.path.join(out, 'bodies', f'{op}-body.json')
    for p in (src_blend, src_json):
        if not os.path.exists(p):
            raise SystemExit(f'{p} missing: run the bodies stage first (guard-bake.mjs --stage bodies)')
    with open(src_json, encoding='utf-8') as f:
        body_report = json.load(f)
    body_report.setdefault('height', body_report.get('refHeight'))
    if not body_report.get('height') or 'bindJoints' not in body_report:
        raise SystemExit(f'{src_json}: no refHeight / bindJoints')
    os.makedirs(work, exist_ok=True)
    with open(os.path.join(work, f'{op}-body.json'), 'w', encoding='utf-8') as f:
        json.dump(body_report, f, indent=1)
    bpy.ops.wm.open_mainfile(filepath=src_blend)
    body = bpy.data.objects.get(f'{op}-body')
    if body is None or bpy.data.objects.get(f'{op}-rig') is None:
        raise SystemExit(f'{src_blend}: no {op}-body / {op}-rig')
    href = bpy.data.objects.get(f'{op}-headref')
    joined = 0
    if href is not None:
        to_body = body.matrix_world.inverted() @ href.matrix_world
        bm = bmesh.new()
        bm.from_mesh(body.data)
        n0 = len(bm.verts)
        new = [bm.verts.new(to_body @ v.co) for v in href.data.vertices]
        for p in href.data.polygons:
            try:
                bm.faces.new([new[i] for i in p.vertices])
            except ValueError:
                pass
        bm.to_mesh(body.data)
        bm.free()
        joined = len(body.data.vertices) - n0
        bpy.data.objects.remove(href)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(work, f'{op}-body.blend'), compress=True)
    return body_report, joined


# --- part modules -----------------------------------------------------------------------------------------------------
def load_part(part, spec, opts):
    """A fresh copy of the part's module under the part's own name (so two parts of one module never share settings),
    configured for the guard bake; build_garment / build_fitted then `__import__(part)` it from sys.modules."""
    path = os.path.join(GARMENT_DIR, spec['module'] + '.py')
    ms = importlib.util.spec_from_file_location(part, path)
    mod = importlib.util.module_from_spec(ms)
    sys.modules[part] = mod
    ms.loader.exec_module(mod)
    if not hasattr(mod, 'configure'):
        raise SystemExit(f'{path}: no configure() (guard bake)')
    mod.configure(part=part, variant=spec.get('variant') or None, **opts)
    return mod


def run_stage(script, argv):
    old = sys.argv
    sys.argv = [old[0], '--'] + [str(a) for a in argv]
    try:
        runpy.run_path(os.path.join(PY, script), run_name='guard_stage')
    finally:
        sys.argv = old


def shirt_hem_z(work, op, part):
    """Lowest point of the tucked shirt's torso (Blender z, after the simulation): the trousers count it as a layer
    above this height."""
    with open(os.path.join(work, f'{op}-{part}-sim.json'), encoding='utf-8') as f:
        names = json.load(f)['panelNames']
    with np.load(os.path.join(work, f'{op}-{part}-sim.npz')) as npz:   # closed at once: Windows cannot delete open files
        torso = np.isin(npz['panel_idx'], [i for i, n in enumerate(names) if n in ('front', 'back')])
        return float(npz['sim'][torso, 2].min())


def step_gap_mm(work, op, part):
    """A sewn part's worst seam gap at the last settle frame, before the weld (Wren's check_garment limit: 10 mm)."""
    with open(os.path.join(work, f'{op}-{part}-sim.json'), encoding='utf-8') as f:
        gaps = json.load(f).get('seamGapByFrame') or []
    return round(gaps[-1][2] * 1000, 1) if gaps else None


def boot_top_z(work, op):
    with open(os.path.join(work, f'{op}-boots-sim.json'), encoding='utf-8') as f:
        ms = json.load(f).get('measurements', {})
    return max((v.get('topHeightM', 0.0) for v in ms.values()), default=None)


def cut_rolled(op, part, work):
    """Rolled sleeves (uniform_rolled): the shirt is simulated with full sleeves (the same cloth as the shirt), then
    every sleeve face below the roll line (pattern y from the cuff, the draft's `details.rolled`) is cut away from the
    welded mesh, so the forearm shows the body's skin. The roll itself is added to the finished garment (add_rolls)."""
    stem = os.path.join(work, f'{op}-{part}-sim')
    with open(stem + '.json', encoding='utf-8') as f:
        R = json.load(f)
    roll = R['details'].get('rolled')
    if not roll:
        return 0
    bpy.ops.wm.open_mainfile(filepath=stem + '.blend')
    ob = bpy.data.objects[f'{op}-{part}']
    ids = {R['panelNames'].index(pn) for pn in roll['panels']}
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    uvl = bm.loops.layers.uv['pattern']
    pid = bm.faces.layers.int['panel']
    kill = [fc for fc in bm.faces if fc[pid] in ids and sum(lp[uvl].uv.y for lp in fc.loops) / len(fc.loops) < roll['y_cut']]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(ob.data)
    bm.free()
    bpy.ops.wm.save_as_mainfile(filepath=stem + '.blend', compress=True)
    return len(kill)


def boundary_loops(me, keep):
    """Closed boundary loops (vertex index lists) of a mesh, among the boundary edges whose faces pass `keep`."""
    count = {}
    for p in me.polygons:
        if not keep(p):
            continue
        for ek in p.edge_keys:
            count[ek] = count.get(ek, 0) + 1
    adj = {}
    for (a, b), c in count.items():
        if c == 1:
            adj.setdefault(a, []).append(b)
            adj.setdefault(b, []).append(a)
    loops, seen = [], set()
    for v0 in adj:
        if v0 in seen:
            continue
        loop, prev, cur = [v0], None, v0
        seen.add(v0)
        while True:
            nxt = next((n for n in adj[cur] if n != prev and n not in seen), None)
            if nxt is None:
                break
            loop.append(nxt)
            seen.add(nxt)
            prev, cur = cur, nxt
        if len(loop) >= 8:
            loops.append(loop)
    return loops


def add_rolls(op, part, roll, scale):
    """The rolled cuff: a soft fabric roll (a tube) round each cut sleeve edge, lying on it, in the sleeve's fabric."""
    import fitted as FT
    ob = bpy.data.objects.get(f'{op}-{part}')
    if ob is None:
        return []
    me = ob.data
    names = roll['panelNames']
    pid = me.attributes['panel'].data
    sleeve_ids = {names.index(pn) for pn in roll['panels']}
    uv = me.uv_layers['pattern'].data
    vy = np.zeros(len(me.vertices))
    for lp in me.loops:
        vy[lp.vertex_index] = uv[lp.index].uv[1]
    loops = boundary_loops(me, lambda p: pid[p.index].value in sleeve_ids)
    # the cut edges: the loops whose pattern height sits at the roll line (the neckline and the raglan edges do not)
    cut = [lp for lp in loops if abs(float(np.median(vy[lp])) - roll['y_cut']) < 0.03]
    mw = np.array(ob.matrix_world)
    V = np.array([v.co[:] for v in me.vertices]) @ mw[:3, :3].T + mw[:3, 3]
    N = np.array([v.normal[:] for v in me.vertices]) @ mw[:3, :3].T
    r = 0.0085 * scale
    TV, TF, TUV = [], [], []
    for lp in cut:
        pts = FT.smooth_polyline(V[lp], 4, True)
        nrm = FT.smooth_polyline(N[lp], 4, True)
        nrm = nrm / np.maximum(np.linalg.norm(nrm, axis=1), 1e-9)[:, None]
        if float(np.einsum('ij,ij->', nrm, pts - pts.mean(axis=0))) < 0:   # outward, whatever the shell's winding
            nrm = -nrm
        centre = pts + nrm * (r * 0.55)
        base = len(TV)
        FT.tube(TV, TF, centre, r, sides=10, closed=True, caps=False)
        arc = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(centre, axis=0), axis=1))])
        for f in TF[len(TUV) // 4:]:
            for i in f:
                k = (i - base) // 10
                TUV.append((float(arc[min(k, len(arc) - 1)]), float(((i - base) % 10) / 10 * 2 * math.pi * r)))
    if not TV:
        return []
    mat = me.materials[0] if len(me.materials) else None
    hero = bpy.data.objects.get(f'{op}-{part}-hero')
    if hero is not None:
        mat = next((m for m in hero.data.materials if m and m.name.startswith('ripstop')), mat)
    rob = FT.add_mesh(bpy.context.scene, f'{op}-{part}-roll', TV, TF, [mat] if mat else [], uv=TUV)
    return [(rob.name, len(cut))]


# --- the job ----------------------------------------------------------------------------------------------------------
def main():
    t0 = time.time()
    args = parse_args()
    common.check_version()
    layers = load_layers()
    part, base = args.garment, args.base
    spec = layers['parts'].get(part)
    if spec is None:
        raise SystemExit(f'garment part "{part}" is not in {LAYERS_FILE}')
    if (spec.get('variant') or '') != (args.variant or ''):
        raise SystemExit(f'{part}: variant "{args.variant}" does not match guard_garments.json ("{spec.get("variant", "")}")')
    launcher = os.path.splitext(os.path.basename(getattr(sys.modules.get('__main__'), '__file__', '') or ''))[0]
    if launcher and launcher != spec['module']:
        raise SystemExit(f'{part} is drafted by garments/{spec["module"]}.py, not {launcher}.py')
    with open(args.kit, encoding='utf-8') as f:
        kit = json.load(f)
    if not any(b['id'] == base for b in kit['bases']):
        raise SystemExit(f'base "{base}" is not in {args.kit}')
    frames = args.frames or layers.get('frames', 120)
    op = f'guard-{base}'
    out_dir = os.path.join(args.out, 'garments')
    work = os.path.join(out_dir, 'work', f'{base}-{part}')
    shutil.rmtree(work, ignore_errors=True)
    body_report, head_joined = prepare_body(args.out, base, work)
    s = body_report['height'] / 1.68
    chain = chain_of(layers, base, part)
    for q in chain:
        if q not in layers['parts']:
            raise SystemExit(f'{part} on {base}: chain part "{q}" is not in guard_garments.json')
    steps, built, opts = [], [], {}
    for q in chain + [part]:
        qs = layers['parts'][q]
        final = q == part
        opts = {}
        if q in ('trousers', 'work_trousers'):
            shirt = next((u for u in built if u in ('shirt', 'shirt_rolled')), None)
            opts = {'shirt_hem_z': shirt_hem_z(work, op, shirt) if shirt else None,
                    'boot_top_z': boot_top_z(work, op) if 'boots' in built else None}
        load_part(q, qs, {'prefix': f'{op}-{q}', **opts})
        ts = time.time()
        common_args = ['--seed', args.seed, '--operator', op, '--garment', q, '--out', work]
        under = ['--under', ','.join(built)] if built else []
        if qs['method'] == 'fitted':
            run_stage('build_fitted.py', common_args + under)
        else:
            run_stage('build_garment.py', common_args + ['--frames', frames] + under)
            if qs.get('variant') == 'rolled':
                cut_rolled(op, q, work)
            if final:
                run_stage('garment_details.py', common_args)
            else:   # a chain copy: the next layer opens its welded simulation (details never change it)
                shutil.copyfile(os.path.join(work, f'{op}-{q}-sim.blend'), os.path.join(work, f'{op}-{q}.blend'))
        steps.append({'part': q, 'method': qs['method'], 'under': list(built), 'seconds': round(time.time() - ts, 1),
                      **({'seamGapBeforeWeldMm': step_gap_mm(work, op, q)} if qs['method'] == 'sewn' else {}),
                      **({'options': opts} if opts else {})})
        built.append(q)
    finish(args, layers, kit, spec, part, base, op, work, out_dir, chain, steps, body_report, head_joined, s, frames, t0)


def finish(args, layers, kit, spec, part, base, op, work, out_dir, chain, steps, body_report, head_joined, s, frames, t0):
    """The shippable files: the part's own objects only, and its report."""
    method = spec['method']
    sim_json = os.path.join(work, f'{op}-{part}-sim.json')
    with open(sim_json, encoding='utf-8') as f:
        R = json.load(f)
    detail_json = os.path.join(work, f'{op}-{part}.json')
    D = {}
    if os.path.exists(detail_json):
        with open(detail_json, encoding='utf-8') as f:
            D = json.load(f)
    bpy.ops.wm.open_mainfile(filepath=os.path.join(work, f'{op}-{part}.blend'))
    rolls = []
    roll = (R.get('details') or {}).get('rolled')
    if roll:
        rolls = add_rolls(op, part, {**roll, 'panelNames': R['panelNames']}, s)
    own = lambda n: n == f'{op}-{part}' or n.startswith(f'{op}-{part}-')  # noqa: E731
    for o in [o for o in bpy.data.objects if not own(o.name)]:
        bpy.data.objects.remove(o)
    try:
        bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    except (AttributeError, TypeError):
        pass
    dg = bpy.context.evaluated_depsgraph_get()
    objects = []
    for o in sorted(bpy.data.objects, key=lambda o: o.name):
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(dg).to_mesh()
        ev.calc_loop_triangles()
        objects.append({'name': o.name, 'faces': len(o.data.polygons), 'tris': len(ev.loop_triangles),
                        'shown': not o.hide_render, 'materials': [m.name for m in o.data.materials if m]})
        o.evaluated_get(dg).to_mesh_clear()
    os.makedirs(out_dir, exist_ok=True)
    stem = os.path.join(out_dir, f'{op}-{part}')
    bpy.ops.wm.save_as_mainfile(filepath=stem + '.blend', compress=True)
    gaps = R.get('seamGapByFrame') or []
    m = R.get('measurements') or {}
    report = {
        'base': base, 'part': part, 'job': args.job, 'module': spec['module'], 'variant': spec.get('variant'),
        'method': method, 'seed': args.seed, 'blender': bpy.app.version_string, 'frames': frames if method == 'sewn' else None,
        'outfits': outfits_of(kit, layers, base, part), 'layer': spec['layer'], 'tint': spec['tint'], 'chain': chain,
        'steps': steps, 'seconds': round(time.time() - t0, 1), 'headJoinedVerts': head_joined,
        'objects': objects, 'shownTris': sum(o['tris'] for o in objects if o['shown']),
        'heroObject': f'{op}-{part}-hero', 'shellObject': f'{op}-{part}',
        'rolled': ({**roll, 'rolls': rolls} if roll else None),
        'seamGapBeforeWeldMm': round(gaps[-1][2] * 1000, 1) if gaps and method == 'sewn' else 0.0,
        'sim': {k: R.get(k) for k in ('verts', 'tris', 'weldedVerts', 'pushedClear', 'layerPushed', 'weldMoveMaxMm',
                                       'simSeconds', 'post', 'under', 'kit', 'method')},
        'drafted': {k: (round(v, 4) if isinstance(v, float) else v) for k, v in m.items()
                    if isinstance(v, (int, float)) or (isinstance(v, dict) and method == 'fitted')},
        'bodyMeasured': body_report.get('measured'), 'bodyTarget': body_report.get('target'),
        'panels': R.get('panels'), 'seams': R.get('seams'), 'details': D,
        'note': 'Objects are the part only (no body or rig): skin them from bodies/guard-<base>-body (nearest body '
                'vertex, like Wren\'s export). The shell is the welded simulation mesh (hidden); the hero and its '
                'details are what renders. A part worn over others was sewn over copies of them (chain).',
    }
    with open(stem + '.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
    if not args.keep_work:
        gc.collect()   # garment_details' np.load handle lives on in its dropped runpy namespace; free it first (Windows)
        shutil.rmtree(work, ignore_errors=True)
        if os.path.exists(work):
            print(f'guard garment: work folder {work} not fully deleted (a file is still open)')
    print(f"guard garment {base} {part}: {len(objects)} objects, {report['shownTris']} tris shown, chain "
          f"{','.join(chain) or '-'}, seam gap {report['seamGapBeforeWeldMm']} mm, {report['seconds']:.0f} s -> {stem}.blend")
