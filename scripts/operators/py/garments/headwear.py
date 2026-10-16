"""Wren's balaclava and close hood (step 07; SPEC 3.3 and 5.1 Head, ART-DIRECTION 3: a snug matte knit hood or
balaclava; D4: no visible face or skin). Built by py/build_fitted.py (DECISIONS A24): fitted, not cloth-simulated.

Balaclava: fine stretch knit pulled tight over the head and neck (`head_common.shrink_wrap`: it bridges the eye
sockets and tents over the nose and the ears), 1.6 mm off the skin and over the base layer's mock neck, its neck tucked
inside the shirt collar. Two panels joined by a flatlock seam down the centre line (forehead, crown, nape; chin to
throat), cover-stitched. One eye port across both eyes, a turned edge with a bound rim; inside it the knit lies on the
face in shadow (no skin, D4). The goggle's eyecups seal on it when the optic is down.

Hood: the soft-shell top's close hood, 4.5 mm over the balaclava, a little fuller at the back of the head; three
panels (a centre panel from the forehead edge over the crown to the nape, two sides meeting under the chin) with
topstitched seams; a rolled, stitched hem round the face opening and the skirt, which laps over the shirt collar. The
harness straps compress it along their lines (the same planes head_kit.py lays the straps on). Rear volume adjuster: a
shock cord in a stitched channel across the back of the head, out through two eyelets to a cord lock; the channel
gathers the fabric into small pleats.
"""
import math

import bpy
import numpy as np
from mathutils import Vector

import fitted as FT
import head_common as HC

KIT = 'hood'
KITS = ['balaclava']
METHOD = ('fitted knit: a ray grid round the head shrink-wrapped onto the skin and the layers (no cloth simulation); '
          'the hood offset from it, cut along field contours (level_slice)')
BAL_GAP = 0.0016      # balaclava outer surface off the skin (0.9 mm knit plus the fit)
HOOD_OFF = 0.0045     # hood outer surface off the balaclava
HOOD_BACK = 0.003     # extra fullness at the back of the head
DENT = 0.0014         # strap compression of the hood
COLLAR_CLEAR = 0.0035  # hood skirt off the shirt collar (room for the earpiece cable under it)
SKIRT_BACK = 0.010     # fix round 3, item 2: the skirt ends this much lower at the back (it covers the collar rim)
PORT = (0.05, 0.0155)  # eye port half width and half height
OPEN_HW = 0.058       # face opening half width
SEAM_W = 0.042        # hood centre panel half width
CORD_X = 0.0          # the shock cord's exit and cord lock: on the centre line, between the split crown straps (D20)


def smoothstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def keep(V, F, A, ok):
    """Faces whose every vertex passes ok (per-vertex bool), compacted."""
    Fk = [f for f in F if all(ok[i] for i in f)]
    used = sorted({i for f in Fk for i in f})
    remap = {v: k for k, v in enumerate(used)}
    return V[used], [tuple(remap[i] for i in f) for f in Fk], A[used]


def boundary_loops(F):
    cnt = {}
    for f in F:
        for i in range(len(f)):
            a, b = f[i], f[(i + 1) % len(f)]
            cnt[(a, b)] = cnt.get((a, b), 0) + 1
    nxt = {}
    for (a, b) in cnt:
        if (b, a) not in cnt:
            nxt[a] = b
    loops, seen = [], set()
    for s in list(nxt):
        if s in seen:
            continue
        loop, cur = [s], nxt[s]
        seen.add(s)
        while cur != s and cur in nxt and cur not in seen:
            loop.append(cur)
            seen.add(cur)
            cur = nxt[cur]
        if len(loop) > 8:
            loops.append(loop)
    return loops


def face_uv(F, A, cs, cv):
    """Metric pattern UVs per face corner: the angle round the head (unwrapped per face) and the row distance."""
    th = np.arctan2(A[:, cs], A[:, cs + 1])
    uv = []
    for f in F:
        t = th[list(f)]
        if t.max() - t.min() > math.pi:
            t = np.where(t < 0, t + 2 * math.pi, t)
        for k, i in enumerate(f):
            uv.append((t[k] * 0.085, A[i, cv] * HC.ROW))
    return uv


def flatlock(V, F, P, N, store):
    """A flatlock seam: two cover-stitch rows 4.4 mm apart and the zigzag between them, flat on the knit."""
    if len(P) < 3:
        return
    P, N = HC.resample(P, N, 0.0015)
    T = HC.tangents(P)
    B = FT.unit(np.cross(N, T))
    for s in (-1.0, 1.0):
        store['stitches'] += FT.stitch_row(V, F, P + B * s * 0.0022, N, pitch=0.003, length=0.0022)
    s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    k, side = 0.0015, 1.0
    while k + 0.003 < s[-1]:
        i0, i1 = int(np.searchsorted(s, k)), int(np.searchsorted(s, k + 0.003))
        a = P[i0] + B[i0] * side * 0.002 + N[i0] * 0.0002
        b = P[i1] - B[i1] * side * 0.002 + N[i1] * 0.0002
        FT.thread_seg(V, F, a, b, N[i0], r=0.00016)
        store['stitches'] += 1
        k += 0.003
        side = -side
    store['seamM'] += float(s[-1])


def build(ctx):
    scene, reuse, MAT, skin = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin']
    op = ctx['op_id']
    fr = HC.head_frame(skin)
    S = HC.straps(fr)
    c, eye_z, chin_z = fr['c'], fr['eye_z'], fr['chin_z']
    layers = {u: (V, Fl) for u, V, Fl in ctx['layers']}
    tamed = tame_mock_neck(ctx, fr, layers)
    collar_fixed = tame_collar(ctx, fr)
    bl_tree = FT.bvh_outward(*layers['base_layer'], skin) if 'base_layer' in layers else None
    sh = layers.get('combat_shirt')
    sh_tree = FT.bvh_outward(*sh, skin) if sh is not None else None
    if sh is not None:
        Vs = sh[0]
        neck = (np.abs(Vs[:, 0]) < 0.075) & (np.abs(Vs[:, 1] - fr['neck_y']) < 0.09) & (Vs[:, 2] > fr['neck_z'] - 0.08)
        collar_top = float(Vs[neck, 2].max())
    else:
        collar_top = fr['neck_z'] - 0.006
    z_bal = collar_top - 0.016       # the balaclava neck ends 16 mm inside the collar
    z_hood = collar_top - 0.024      # the hood skirt laps 24 mm over the collar
    cap = HC.capsule(fr, skin, z_hood - 0.007 - SKIRT_BACK)

    def skirt_cut(Pq):
        """The skirt's edge height under each point: z_hood at the front and sides, SKIRT_BACK lower behind the neck
        (fix round 3, item 2: the shirt collar's rim showed wavy and pinched below the skirt at the nape)."""
        d = Pq[:, :2] - np.array([0.0, fr['neck_y']])
        r = np.maximum(np.linalg.norm(d, axis=1), 1e-6)
        return z_hood - SKIRT_BACK * smoothstep(0.15, 0.8, d[:, 1] / r)
    F, rr, tt, O, D = cap['F'], cap['row'], cap['theta'], cap['O'], cap['D']
    nb = FT.neighbours(len(O), F)

    # Balaclava: a stretched knit along the rays, over the skin and the base layer's mock neck, its neck held inside
    # the shirt collar (t_max: the collar's inside, from the shirt's outer surface less its thickness).
    t_under = cap['t_skin']
    if bl_tree is not None:
        t_under = np.fmax(t_under, HC.ray_t(bl_tree, O, D))
    t_sh = HC.ray_t(sh_tree, O, D) if sh_tree is not None else np.full(len(O), np.nan)
    in_collar = (O[:, 2] + D[:, 2] * np.nan_to_num(t_sh) < collar_top + 0.003) & ~np.isnan(t_sh) & (t_sh > t_under - 0.004)
    t_cap = np.where(in_collar, t_sh - 0.0024, np.nan)
    tucked = int(in_collar.sum())
    # over the face the knit barely clings: it bridges the eye sockets and the mouth (no face modelled under it, D4)
    Ps = cap['V']
    zr = np.where(D[:, 2] > 0.3, Ps[:, 2], O[:, 2])          # the ray's height (a ray into the mouth hits deep)
    face = (D[:, 1] < -0.5) & (zr > chin_z - 0.012) & (zr < eye_z + 0.03)
    cling = np.where(face, 0.003, 0.05)
    t_bal = HC.membrane(O, D, t_under + BAL_GAP, F, t_under + BAL_GAP, rounds=140, lam=0.5, cling=cling, tmax=t_cap)
    P = O + D * t_bal[:, None]
    P, _ = FT.push_out(P, [skin], 0.0011, reach=0.01, iters=1, mask=~face)
    Nb = FT.vertex_normals(P, F)

    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    front = y < c[1] - 0.03
    pe = np.where(front, ((np.abs(x) / PORT[0]) ** 4 + (np.abs(z - eye_z) / PORT[1]) ** 4) ** 0.25 - 1.0, 1.0)
    open_top = S['plate']['z'] - S['plate']['hh'] - 0.003
    open_bot = chin_z + 0.02
    zc, hh = 0.5 * (open_top + open_bot), 0.5 * (open_top - open_bot)
    fo = np.where(y < c[1] - 0.02, ((np.abs(x) / OPEN_HW) ** 2.6 + (np.abs(z - zc) / hh) ** 2.6) ** (1 / 2.6) - 1.0, 1.0)
    ctr = (y > c[1] - 0.02) | (z > chin_z + 0.04)
    gs = np.where(ctr, np.abs(x) - SEAM_W, 0.01)
    # A columns: 0 z-cut, 1 port, 2 opening, 3 seam, 4 sin(theta), 5 cos(theta), 6 row, 7..9 hood normal
    A = np.column_stack([z - z_bal, pe, fo, gs, np.sin(tt), np.cos(tt), rr.astype(float), Nb])
    store = {'stitches': 0, 'seamM': 0.0}

    # --- Balaclava mesh: cut at the neck, the eye port sliced out as its own group and stepped in (turned edge).
    Vb, Fb, Ab, _, _ = FT.level_slice(P, F, A, 0)
    Vb, Fb, Ab = keep(Vb, Fb, Ab, Ab[:, 0] >= -1e-9)
    Vb, Fb, Ab, _, _ = FT.level_slice(Vb, Fb, Ab, 1)
    lab = []
    for f in Fb:
        if all(Ab[i, 1] <= 1e-9 for i in f):
            lab.append('port')
        else:
            lab.append('L' if Vb[list(f), 0].mean() > 0 else 'R')
    Nbb = FT.vertex_normals(Vb, Fb)
    stV, stF, biV, biF = [], [], [], []
    for chain, key, _side in FT.boundary_chains(Fb, lab, {'port': 2, 'L': 1, 'R': 1}):
        pts, nrm = Vb[chain], Nbb[chain]
        if 'port' in key:
            pts, nrm = HC.resample(FT.smooth_polyline(pts, 2, closed=chain[0] == chain[-1]), nrm, 0.003)
            FT.tube(biV, biF, pts + nrm * 0.0001, 0.0011, sides=8, closed=chain[0] == chain[-1])
        else:
            flatlock(stV, stF, pts + nrm * 0.0001, nrm, store)
    # the port's turned edge: the lining 1.1 mm in, a smooth surface in shadow, never inside the skin (D4)
    Vb2, Fb2, src, walls = FT.split_step(Vb, Fb, [-0.0011 if l_ == 'port' else 0.0 for l_ in lab], Nbb)
    pm = np.zeros(len(Vb2), bool)
    for f, l_ in zip(Fb2, lab):
        if l_ == 'port':
            pm[list(f)] = True
    Vb2, _ = FT.push_out(Vb2, [skin], 0.0004, reach=0.01, iters=1, mask=pm)
    Ab2 = Ab[src]
    allF = list(Fb2) + [w for w, _ in walls]
    uv = face_uv(allF, Ab2, 4, 6)
    bal = FT.add_mesh(scene, f'{op}-headwear-balaclava', Vb2, allF,
                      [reuse(MAT.knit, 'balaclava knit', colour=(0.03, 0.031, 0.032))], uv=uv,
                      attrs={'wear': np.zeros(len(Vb2))})
    bal['bottomZ'] = float(z_bal)
    sol = bal.modifiers.new('thickness', 'SOLIDIFY')
    sol.thickness, sol.offset, sol.use_even_offset, sol.use_rim = 0.0009, -1.0, False, True
    # cover-stitched hem 7 mm above the balaclava's neck edge (inside the collar)
    for loop in boundary_loops(Fb):
        pts, nrm = Vb[loop], Nbb[loop]
        if pts[:, 2].mean() > z_bal + 0.02:
            continue
        pts = np.vstack([pts, pts[:1]])
        nrm = np.vstack([nrm, nrm[:1]])
        store['stitches'] += FT.stitch_row(stV, stF, pts + np.array([0, 0, 0.007]) + nrm * 0.0002, nrm)

    # --- Hood: offset from the balaclava; fuller at the back, dented under the straps, gathered at the cord channel.
    off = np.full(len(P), HOOD_OFF)
    off += HOOD_BACK * smoothstep(c[1] + 0.01, c[1] + 0.07, y) * smoothstep(chin_z, c[2] - 0.02, z)
    off += 0.0006 * (front & (np.abs(x) > 0.04))
    w_all = np.zeros(len(P))
    # dents along the harness as built (D20: split crown, side straps, chin strap; no centre crown strap any more)
    for nm in ('forkL', 'forkR', 'side', 'chin'):
        s = S[nm]
        dist = np.abs((P - s['O']) @ s['n'])
        w = smoothstep(s['w'] / 2 + 0.005, s['w'] / 2 - 0.001, dist)
        if nm.startswith('fork'):
            w *= HC.fork_keep(S, s, P) & (np.abs(x) < 0.07)
        if nm == 'chin':
            w *= z < s['za'] - 0.003
        w_all = np.maximum(w_all, w)
    off -= DENT * w_all
    z_ch = S['cradle']['z'] + S['cradle']['hh'] + 0.03    # above the rear pod (D20)
    back = smoothstep(c[1] + 0.02, c[1] + 0.05, y) * smoothstep(0.072, 0.055, np.abs(x))
    # fix round 1, item 7: gathers that read as pleats - short (they die out about 1 cm from the channel), crisp crests
    # at an irregular pitch, and none across the channel's stitch rows (the old 18 mm sine streaked and notched there)
    dz = np.abs(z - z_ch)
    g = np.exp(-((dz - 0.006).clip(0) / 0.0085) ** 2) * back * smoothstep(0.0045, 0.0075, dz)
    xs = x + 0.0021 * np.sin(2 * math.pi * x / 0.037) + 0.0012 * np.sin(2 * math.pi * x / 0.0153 + 1.3)
    pleat = 1.0 - 2.0 * np.abs(np.sin(math.pi * xs / 0.0115))
    off += -0.0012 * g + 0.0013 * g * pleat + 0.0009 * back * smoothstep(0.0055, 0.003, dz)
    # the hood's base shape: a looser membrane over the balaclava (fullness as its cling target), outside the collar
    base = HOOD_OFF + HOOD_BACK * smoothstep(c[1] + 0.01, c[1] + 0.07, y) * smoothstep(chin_z, c[2] - 0.02, z)         + 0.0006 * (front & (np.abs(x) > 0.04))
    t_hmin = t_bal + 0.0028
    # the earpiece cable runs up the left of the neck under the hood (head_kit.py): the hood rides over it
    ear_top = eye_z - 0.02 - 0.035
    run = (O[:, 2] > collar_top - 0.03) & (O[:, 2] < ear_top + 0.02) & (np.abs(D[:, 2]) < 0.3)
    ang = np.zeros(len(O))
    for i in np.where(run)[0]:
        cd = HC.cable_dir(O[i, 2], collar_top, eye_z - 0.02)
        ang[i] = math.degrees(math.acos(float(np.clip(np.dot(cd, D[i]), -1, 1))))
    # fix round 1, item 7: a low, broad fold over the cable (was a 2.6 mm ridge 4-10 degrees wide that read as a tent)
    t_hmin = t_hmin + 0.0016 * run * smoothstep(16.0, 3.0, ang) * smoothstep(ear_top + 0.02, ear_top, O[:, 2])
    # the collar as the hood skirt sees it: the shirt's surface along the rays, gaps filled and smoothed over the grid
    # (a ray slipping past the collar's edge hits deeper and would pull a spike into the skirt)
    E = HC.edges_of(F)
    deg = np.bincount(E.ravel(), minlength=len(O)).astype(float)
    valid = (~np.isnan(t_sh)).astype(float)
    ts = np.nan_to_num(t_sh)
    for _ in range(8):
        Sm, Cn = np.zeros(len(O)), np.zeros(len(O))
        np.add.at(Sm, E[:, 0], ts[E[:, 1]] * valid[E[:, 1]])
        np.add.at(Sm, E[:, 1], ts[E[:, 0]] * valid[E[:, 0]])
        np.add.at(Cn, E[:, 0], valid[E[:, 1]])
        np.add.at(Cn, E[:, 1], valid[E[:, 0]])
        ts = np.where(Cn > 0, 0.5 * ts + 0.5 * Sm / np.maximum(Cn, 1), ts)
    ts = np.where(valid > 0, np.maximum(ts, np.nan_to_num(t_sh)), ts)
    sk = (~np.isnan(t_sh)) & (O[:, 2] < collar_top + 0.004)
    t_hmin[sk] = np.maximum(t_hmin[sk], ts[sk] + COLLAR_CLEAR)
    # behind the ears and down the neck the hood clings to the balaclava (fix round 1, item 7): at the old uniform 0.04
    # its tension bridged from the ear to the collar in one tent line
    # fix round 2, item 3: the cling eases in (a hard 0.04 / 0.16 step at |D.x| = 0.45 creased a dark jagged line down
    # the hood behind the ear)
    side = (smoothstep(0.33, 0.55, np.abs(D[:, 0])) * smoothstep(eye_z + 0.04, eye_z + 0.01, O[:, 2])
            * smoothstep(collar_top - 0.025, collar_top - 0.005, O[:, 2]))
    h_cling = 0.04 + 0.12 * side
    t_h = HC.membrane(O, D, t_bal + base, F, t_hmin, target=np.maximum(t_bal + base, t_hmin), rounds=40, lam=0.5,
                      cling=h_cling)
    Ph = O + D * t_h[:, None]
    Nh0 = FT.vertex_normals(Ph, F)
    Ph = Ph + Nh0 * (off - base)[:, None]          # dents, the channel gather and pleats on top
    bal_tree = HC.bvh(Vb2, Fb2)
    Ph, _ = FT.push_out(Ph, [bal_tree], 0.0021, reach=0.012, iters=2)
    # fix round 2, item 2: the shirt collar's crumples drawn in under the skirt (like A25), so the skirt laps over a
    # clean collar edge instead of being pushed out round the crumples (the torn shards at the nape)
    # the skirt from the collar line down is faired first: it followed the crumpled collar shell along the rays and
    # crumpled with it
    E_ = HC.edges_of(F)
    wsk = smoothstep(collar_top + 0.015, collar_top - 0.002, Ph[:, 2])[:, None]
    for _ in range(14):
        Sm, Cn = np.zeros_like(Ph), np.zeros(len(Ph))
        np.add.at(Sm, E_[:, 0], Ph[E_[:, 1]])
        np.add.at(Sm, E_[:, 1], Ph[E_[:, 0]])
        np.add.at(Cn, E_[:, 0], 1)
        np.add.at(Cn, E_[:, 1], 1)
        Ph = Ph + 0.5 * wsk * (Sm / np.maximum(Cn, 1)[:, None] - Ph)
    Ph, _ = FT.push_out(Ph, [bal_tree], 0.0021, reach=0.012, iters=2)
    hero_tree = collar_tree(ctx, collar_top, skin)
    if hero_tree is not None:       # fix round 1, item 6: the shirt collar showed through the skirt at the nape
        Ph, _ = FT.push_out(Ph, [hero_tree], 0.0026, reach=0.012, iters=2, mask=Ph[:, 2] < collar_top + 0.03)
        # fix round 3, item 2: the push-out raised small darts in the skirt over the collar's crumples at the nape;
        # fair the skirt again, then tuck the shirt under the final skirt (below)
        dn = Ph[:, :2] - np.array([0.0, fr['neck_y']])
        wbk = wsk * smoothstep(0.0, 0.5, dn[:, 1] / np.maximum(np.linalg.norm(dn, axis=1), 1e-6))[:, None]   # the back
        for _ in range(8):
            Sm, Cn = np.zeros_like(Ph), np.zeros(len(Ph))
            np.add.at(Sm, E_[:, 0], Ph[E_[:, 1]])
            np.add.at(Sm, E_[:, 1], Ph[E_[:, 0]])
            np.add.at(Cn, E_[:, 0], 1)
            np.add.at(Cn, E_[:, 1], 1)
            Ph = Ph + 0.5 * wbk * (Sm / np.maximum(Cn, 1)[:, None] - Ph)
        Ph, _ = FT.push_out(Ph, [bal_tree], 0.0021, reach=0.012, iters=2)
    collar_tucked = tuck_collar(ctx, fr, HC.bvh(Ph, F), skirt_cut, collar_top)
    Nh = FT.vertex_normals(Ph, F)
    Ah = A.copy()
    Ah[:, 0] = Ph[:, 2] - skirt_cut(Ph)
    Vh, Fh, Ahh, _, _ = FT.level_slice(Ph, F, Ah, 2)
    Vh, Fh, Ahh = keep(Vh, Fh, Ahh, Ahh[:, 2] >= -1e-9)
    Vh, Fh, Ahh, _, _ = FT.level_slice(Vh, Fh, Ahh, 0)
    Vh, Fh, Ahh = keep(Vh, Fh, Ahh, Ahh[:, 0] >= -1e-9)
    Vh, Fh, Ahh, _, _ = FT.level_slice(Vh, Fh, Ahh, 3)
    hl = []
    for f in Fh:
        cx = Vh[list(f), 0].mean()
        hl.append('C' if Ahh[list(f), 3].mean() < 0 else ('L' if cx > 0 else 'R'))
    Nhh = FT.vertex_normals(Vh, Fh)
    for chain, key, _side in FT.boundary_chains(Fh, hl, {'C': 2, 'L': 1, 'R': 1}):
        pts, nrm = HC.resample(FT.smooth_polyline(Vh[chain], 2), Nhh[chain], 0.002)
        T = HC.tangents(pts)
        B = FT.unit(np.cross(nrm, T))
        for s_ in (-0.0025, 0.0025):
            store['stitches'] += FT.stitch_row(stV, stF, pts + B * s_ + nrm * 0.0002, nrm)
        store['seamM'] += HC.path_length(pts)
    hemV, hemF = [], []
    hem_loops = 0
    for loop in boundary_loops(Fh):
        pts, nrm = Vh[loop], Nhh[loop]
        pts = FT.smooth_polyline(pts, 2 if pts[:, 2].mean() > z_hood + 0.03 else 8, closed=True)
        pts = np.vstack([pts, pts[:1]])
        nrm = np.vstack([nrm, nrm[:1]])
        pts, nrm = HC.resample(pts, nrm, 0.003)
        FT.tube(hemV, hemF, pts - nrm * 0.0006, 0.0017, sides=8, closed=True)
        T = HC.tangents(pts)
        B = FT.unit(np.cross(nrm, T))
        # the stitch row 6 mm in from the edge: toward the mesh (the side the faces are on)
        probe = pts + B * 0.006
        d_in = np.array([np.linalg.norm(Vh[np.argmin(np.linalg.norm(Vh - q, axis=1))] - q) for q in probe[::8]])
        sgn = 1.0 if d_in.mean() < 0.002 else -1.0
        store['stitches'] += FT.stitch_row(stV, stF, pts + B * sgn * 0.006 + nrm * 0.0003, nrm)
        hem_loops += 1
    huv = face_uv(Fh, Ahh, 4, 6)
    soft = reuse(MAT.softshell, 'hood softshell', colour=(0.027, 0.028, 0.025))
    hood = FT.add_mesh(scene, f'{op}-headwear-hood', Vh, Fh, [soft], uv=huv)
    sol = hood.modifiers.new('thickness', 'SOLIDIFY')
    sol.thickness, sol.offset, sol.use_even_offset, sol.use_rim = 0.0012, -1.0, False, True
    hem = FT.add_mesh(scene, f'{op}-headwear-hem', hemV, hemF, soft,
                      uv=[(0.0, 0.0)] * sum(len(f) for f in hemF))
    _poly_uv(hem)

    # --- Rear volume adjuster: channel stitches, two eyelets, the cord to a cord lock, a knotted tail.
    hood_tree = HC.bvh(Vh, Fh)
    chan = {}
    for dz in (-0.005, 0.005):
        pts, nrm = [], []
        for xx in np.linspace(-0.052, 0.052, 60):
            p, n = HC.ray_in(hood_tree, (xx, c[1], z_ch + dz), (0.0, 1.0, 0.0), 0.2)
            if p is not None:
                pts.append(p)
                nrm.append(n)
        pts, nrm = np.array(pts), np.array(nrm)
        chan[dz] = (pts, nrm)
        store['stitches'] += FT.stitch_row(stV, stF, pts + nrm * 0.0002, nrm)
    eyV, eyF, cdV, cdF, lkV, lkF = [], [], [], [], [], []
    eyes = []
    # the cord exits between the two crown straps (D20): two eyelets and a cord lock on the centre line
    for xx in (CORD_X - 0.007, CORD_X + 0.007):
        p, n = HC.ray_in(hood_tree, (xx, c[1], z_ch), (0.0, 1.0, 0.0), 0.2)
        FT.ring(eyV, eyF, p - n * 0.0004, n, 0.0017, 0.0032, 0.0011, seg=16)
        eyes.append((p, n))
    pL, nL = HC.ray_in(hood_tree, (CORD_X, c[1], z_ch - 0.019), (0.0, 1.0, 0.0), 0.2)
    lock_top = pL + nL * 0.0062 + np.array([0.0, 0.0, 0.007])
    lock_bot = pL + nL * 0.0058 - np.array([0.0, 0.0, 0.006])
    for p, n in eyes:
        mid = 0.5 * (p + lock_top) + n * 0.003
        pts = np.array([p + n * 0.0006, p + n * 0.0022 - np.array([0, 0, 0.002]), mid, lock_top + (p - lock_top) * 0.15, lock_top])
        pts, _ = HC.resample(FT.smooth_polyline(pts, 2), np.tile(n, (len(pts), 1)), 0.0015)
        FT.tube(cdV, cdF, pts, 0.0014, sides=8)
    axis = FT.unit(lock_top - lock_bot)
    HC.rbox(lkV, lkF, 0.5 * (lock_top + lock_bot), [np.array([1.0, 0, 0]), np.cross(axis, [1.0, 0, 0]), axis],
            (0.0052, 0.0045, 0.0085), 0.0028, step=0.0012)
    HC.rbox(lkV, lkF, lock_top + axis * 0.0016, [np.array([1.0, 0, 0]), np.cross(axis, [1.0, 0, 0]), axis],
            (0.0038, 0.0034, 0.0022), 0.0012, step=0.001)
    tail = np.array([lock_bot, lock_bot - axis * 0.004 + nL * 0.0006, lock_bot - axis * 0.009 + nL * 0.0004])
    FT.tube(cdV, cdF, tail, 0.0014, sides=8)
    FT.tube(cdV, cdF, [lock_bot - axis * 0.0085, lock_bot - axis * 0.0125], 0.0026, sides=10)   # the end knot
    stitches = FT.add_mesh(scene, f'{op}-headwear-stitches', stV, stF, reuse(MAT.thread, 'thread'))
    stitches.visible_shadow = False
    binding = FT.add_mesh(scene, f'{op}-headwear-binding', biV, biF, reuse(MAT.webbing, 'binding'))
    cord = FT.add_mesh(scene, f'{op}-headwear-cord', cdV, cdF, reuse(MAT.webbing, 'shock cord', colour=(0.026, 0.027, 0.028)))
    lock = FT.add_mesh(scene, f'{op}-headwear-cordlock', lkV, lkF, reuse(MAT.polymer, 'cord lock', rough=0.72))
    eyelets = FT.add_mesh(scene, f'{op}-headwear-eyelets', eyV, eyF, reuse(MAT.painted_metal, 'hardware metal'))
    for ob in (lock, cord, eyelets):
        _recalc(ob)

    shellV = np.vstack([Vb2, Vh])
    shellF = [tuple(f) for f in Fb2] + [tuple(i + len(Vb2) for i in f) for f in Fh]
    return {
        'shell': (shellV, shellF),
        'objects': [bal, hood, hem, stitches, binding, cord, lock, eyelets],
        'kits': KITS,
        'measurements': {'collarTopM': round(collar_top, 4), 'balaclavaBottomM': round(z_bal, 4),
                         'hoodBottomM': round(z_hood, 4), 'eyeZ': round(eye_z, 4), 'chinZ': round(chin_z, 4),
                         'tuckedUnderCollarVerts': tucked, 'channelZ': round(z_ch, 4),
                         'mockNeckVertsTamed': tamed, 'collarSpikesSmoothed': collar_fixed,
                         'collarVertsTucked': collar_tucked},
        'report': {'stitches': store['stitches'], 'seamRowsM': round(store['seamM'], 2), 'hemLoops': hem_loops,
                   'balaclavaFaces': len(allF), 'hoodFaces': len(Fh)},
    }


def tame_mock_neck(ctx, fr, layers):
    """The base layer's mock neck flares out at the back (step 05 build: up to 26 mm outside the shirt collar at the
    nape, through the collar). The balaclava and the hood cover the whole neck now, so it is drawn back to 4 mm off
    the skin above the collar line (DECISIONS A25): its render mesh, its stitches and the shell the head items read.
    Returns the number of vertices moved."""
    skin, op = ctx['skin'], ctx['op_id']
    z0, z1 = fr['neck_z'] - 0.06, fr['neck_z'] - 0.035     # blend in over 25 mm, full above (well inside the collar)

    def clamp(P):
        moved = 0
        for i in np.where((P[:, 2] > z0) & (np.abs(P[:, 0]) < 0.12))[0]:
            p = P[i]
            ax = np.array([0.0, fr['neck_y'], p[2]])
            d = p - ax
            d[2] = 0.0
            r = float(np.linalg.norm(d))
            if r < 1e-6:
                continue
            d = d / r
            hit, _ = HC.ray_in(skin, ax, d, 0.2)
            if hit is None:
                continue
            r_max = float(np.linalg.norm((hit - ax)[:2])) + 0.004
            w = float(smoothstep(z0, z1, p[2]))
            if r > r_max and w > 0:
                P[i] = ax + d * (r + (r_max - r) * w) + np.array([0.0, 0.0, p[2] - ax[2]])
                moved += 1
        return moved
    n = 0
    for nm in (f'{op}-base_layer-hero', f'{op}-base_layer-stitches'):
        ob = bpy.data.objects.get(nm)
        if ob is None:
            continue
        mw = np.array(ob.matrix_world)
        co = np.empty(len(ob.data.vertices) * 3)
        ob.data.vertices.foreach_get('co', co)
        L = co.reshape(-1, 3)
        W = L @ mw[:3, :3].T + mw[:3, 3]
        n += clamp(W)
        L = (W - mw[:3, 3]) @ np.linalg.inv(mw[:3, :3]).T
        ob.data.vertices.foreach_set('co', L.ravel())
        ob.data.update()
    if 'base_layer' in layers:
        V, Fl = layers['base_layer']
        V = np.array(V, float)
        clamp(V)
        layers['base_layer'] = (V, Fl)
        shell = bpy.data.objects.get(f'{op}-base_layer')
        if shell is not None and len(shell.data.vertices) == len(V):
            shell.data.vertices.foreach_set('co', V.ravel())   # identity transform: shells are built in world space
            shell.data.update()
    return n


def _hero(op):
    ob = bpy.data.objects.get(f'{op}-combat_shirt-hero')
    if ob is None:
        return None, None, None
    mw = np.array(ob.matrix_world)
    co = np.empty(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get('co', co)
    return ob, co.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3], [tuple(p.vertices) for p in ob.data.polygons]


def tame_collar(ctx, fr):
    """The shirt's collar render mesh is crumpled at the nape (step 05 build: 12 vertices 1.5-2.1 mm off their
    neighbours' mean, the torn triangles in the head's back view). Relax those spikes toward their neighbours (fix
    round 1, item 6; like A25 a later stage tidies an earlier garment where the head items meet it)."""
    ob, W, F = _hero(ctx['op_id'])
    if ob is None:
        return 0
    E = HC.edges_of(F)
    zone = (W[:, 2] > fr['neck_z'] - 0.06) & (W[:, 1] > fr['neck_y'] - 0.06) & (np.abs(W[:, 0]) < 0.1)
    moved = np.zeros(len(W), bool)
    for _ in range(6):
        S, C = np.zeros_like(W), np.zeros(len(W))
        np.add.at(S, E[:, 0], W[E[:, 1]])
        np.add.at(S, E[:, 1], W[E[:, 0]])
        np.add.at(C, E[:, 0], 1)
        np.add.at(C, E[:, 1], 1)
        avg = S / np.maximum(C, 1)[:, None]
        spike = zone & (np.linalg.norm(W - avg, axis=1) > 0.0009)
        if not spike.any():
            break
        W[spike] = W[spike] + 0.7 * (avg[spike] - W[spike])
        moved |= spike
    mw = np.array(ob.matrix_world)
    L = (W - mw[:3, 3]) @ np.linalg.inv(mw[:3, :3]).T
    ob.data.vertices.foreach_set('co', L.ravel())
    ob.data.update()
    return int(moved.sum())


def tuck_collar(ctx, fr, hood_tree, skirt_cut, collar_top):
    """Every shirt render mesh (hero, stitches, trims) inside the hood skirt is held 2.6 mm under the skirt's surface
    (its 1.2 mm thickness plus clearance), measured along the horizontal ray from the neck axis; full above the skirt's
    edge, eased out over the 5 mm round it (the rolled hem covers the step). Returns the number of vertices moved."""
    op = ctx['op_id']
    moved = 0
    for ob in [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith(f'{op}-combat_shirt-')]:
        mw = np.array(ob.matrix_world)
        co = np.empty(len(ob.data.vertices) * 3)
        ob.data.vertices.foreach_get('co', co)
        W = co.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]
        n0 = moved
        zc = skirt_cut(W)              # the skirt's edge height there (lower at the back, fix round 3)
        for i in np.where((W[:, 2] > zc - 0.003) & (W[:, 2] < collar_top + 0.02) & (np.abs(W[:, 0]) < 0.12)
                          & (np.abs(W[:, 1] - fr['neck_y']) < 0.12))[0]:
            p = W[i]
            ax = np.array([0.0, fr['neck_y'], p[2]])
            d = p - ax
            d[2] = 0.0
            r = float(np.linalg.norm(d))
            if r < 1e-6:
                continue
            d = d / r
            hit, _ = HC.ray_in(hood_tree, ax, d, 0.2)
            if hit is None:
                continue
            r_max = float(np.linalg.norm((hit - ax)[:2])) - 0.0026
            w = float(smoothstep(zc[i] - 0.003, zc[i] + 0.002, p[2]))
            if r > r_max and w > 0:
                W[i] = ax + d * (r + (r_max - r) * w) + np.array([0.0, 0.0, p[2] - ax[2]])
                moved += 1
        if moved > n0:
            L = (W - mw[:3, 3]) @ np.linalg.inv(mw[:3, :3]).T
            ob.data.vertices.foreach_set('co', L.ravel())
            ob.data.update()
    return moved


def collar_tree(ctx, collar_top, skin):
    """The shirt's render mesh round the collar as a BVH facing away from the skin (the hood skirt is pushed clear of
    it, not only of the smoothed shell)."""
    ob, W, F = _hero(ctx['op_id'])
    if ob is None:
        return None
    keep_ = W[:, 2] > collar_top - 0.06
    Fk = [f for f in F if all(keep_[i] for i in f)]
    return FT.bvh_outward(W, Fk, skin) if Fk else None


def _recalc(ob):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def _poly_uv(ob):
    me = ob.data
    lay = me.uv_layers['pattern']
    for p in me.polygons:
        n = np.abs(np.array(p.normal))
        k = int(np.argmax(n))
        ax = [j for j in range(3) if j != k]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            lay.data[li].uv = (co[ax[0]], co[ax[1]])
