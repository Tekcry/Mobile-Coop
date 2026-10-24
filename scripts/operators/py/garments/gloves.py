"""Wren's gloves (step 06; SPEC 3.1 Gloves, ART-DIRECTION 3: thin, close fitting, suede palm, stretch knit back,
low-profile knuckle protection, no bulk at the fingertips). Built by py/build_fitted.py (DECISIONS A18).

Shrink-fitted: the hand's own surface (the body's hand faces, subdivided twice) is offset off the skin by the glove's
thickness and pushed clear of the base-layer cuff, so the glove follows every finger and is skinned to the hero
finger bones (the export weights each vertex from the nearest body vertex, the one it was cut from). Panels are cut on
that surface from the hand frame (wrist, knuckle line, palm normal from the finger curl):
- palm (goatskin, wraps the index and little-finger edges), stretch knit back, fourchettes (the knit strips between
  the fingers), a ribbed knit cuff 5.5 cm up the forearm under the shirt cuff,
- overlays sewn on: a padded knuckle panel with three flex grooves, leather fingertip patches on the thumb, index and
  middle finger, a palm-heel patch,
- a wrist tab (leather strap from the little-finger side over the back, hook-and-loop closure on a loop patch, a pull
  loop at its end, box-X stitched where it is sewn on), a bound cuff edge, single-needle stitch rows on every seam.
Wear ('wear' attribute, materials.leather): the trigger finger and the palm heel polish darker, the thumb tip less.

Guard bake (docs/guard-models PLAN G2): run as the main script by guard-bake.mjs, it hands the job to guard_garment.py,
which calls configure() on a copy of this module (bottom of this file): the guards' hands have one bone per finger
(SPEC 6), so the build reads three segments split from each; variant 'work' is the work glove. Wren's gloves are
untouched while configure() has not been called.
"""
if __name__ == '__main__':   # guard bake job: py/ and py/garments/ on the path before the imports below
    import os as _os
    import sys as _sys
    _here = _os.path.dirname(_os.path.abspath(__file__))
    _sys.path[:0] = [_here, _os.path.dirname(_here)]
import math

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import bpy
import fitted as FT

KIT = 'gloves'
METHOD = 'shrink-fitted panels on the hand surface (offset off the skin, pushed clear of the base-layer cuff)'
CUFF_UP = 0.055       # m the cuff reaches up the forearm from the wrist joint (under the shirt cuff, which ends 2 cm past it)
GAP = 0.0022          # outer glove surface off the skin: 0.9 mm leather or knit plus the fit gap
LAYER_CLEAR = 0.0032  # off the base-layer cuff where the glove cuff goes over it
LIFT = {'knuckle': 0.0, 'tip': 0.0003, 'heel': 0.0005, 'palm': 0.0, 'back': 0.0, 'fourchette': -0.0002, 'cuff': 0.0003}
SLOT = {'palm': 0, 'tip': 0, 'heel': 0, 'back': 1, 'fourchette': 1, 'knuckle': 2, 'cuff': 3}
PRIO = {'knuckle': 6, 'tip': 5, 'heel': 5, 'palm': 3, 'fourchette': 2, 'back': 1, 'cuff': 0}
NAME = 'gloves'       # object names '<op>-<NAME>-...' (the guard part id after configure())
KNUCKLE = True        # the padded knuckle panel (the work glove has none)
LEATHER = None        # (material name, colour) of the palm leather; None: Wren's 'glove leather'
GUARD = None          # configure(): {'part', 'variant', 'prefix'}


def hand_frame(bones, side):
    wr, el = bones[f'wr{side}'][0], bones[f'el{side}'][0]
    af = FT.unit(wr - el)
    K = np.array([bones[f'finger{side}_{i}_1'][0] for i in range(2, 6)])
    a = FT.unit(K.mean(axis=0) - wr)
    lat = K[3] - K[0]
    lat = FT.unit(lat - a * np.dot(lat, a))
    n = np.cross(a, lat)
    curl = np.zeros(3)
    for i in range(2, 6):
        h1, t1 = bones[f'finger{side}_{i}_1']
        h3, t3 = bones[f'finger{side}_{i}_3']
        curl += FT.unit(t3 - h3) - FT.unit(t1 - h1)
    palm = n if np.dot(n, curl) > 0 else -n
    return {'wr': wr, 'af': af, 'a': a, 'l': lat, 'back': -palm, 'K': K}


def build_hand(ctx, side, V_all, F_all, store):
    body, skin, BV, bones = ctx['body'], ctx['skin'], ctx['BV'], ctx['bones']
    fr = hand_frame(bones, side)
    wr, af, a, lat, back = fr['wr'], fr['af'], fr['a'], fr['l'], fr['back']
    proj = (BV - wr) @ af
    sgn = np.sign(wr[0])
    region = (proj >= -CUFF_UP) & (np.linalg.norm(BV - wr, axis=1) < 0.26) & (BV[:, 0] * sgn > 0.25)
    faces = [tuple(p.vertices) for p in body.data.polygons if all(region[i] for i in p.vertices)]
    used = sorted({i for f in faces for i in f})
    remap = {v: k for k, v in enumerate(used)}
    me = bpy.data.meshes.new('glove-tmp')
    me.from_pydata([tuple(BV[i]) for i in used], [], [tuple(remap[i] for i in f) for f in faces])
    tmp = bpy.data.objects.new('glove-tmp', me)
    ctx['scene'].collection.objects.link(tmp)
    sub = tmp.modifiers.new('sub', 'SUBSURF')
    sub.levels = sub.render_levels = 2
    dg = bpy.context.evaluated_depsgraph_get()
    dense = tmp.evaluated_get(dg).to_mesh()
    P0 = np.array([v.co[:] for v in dense.vertices])
    F = [tuple(p.vertices) for p in dense.polygons]
    tmp.evaluated_get(dg).to_mesh_clear()
    bpy.data.objects.remove(tmp)
    bpy.data.meshes.remove(me)
    nb = FT.neighbours(len(P0), F)
    edge_count = {}
    for f in F:
        for i in range(len(f)):
            e = tuple(sorted((f[i], f[(i + 1) % len(f)])))
            edge_count[e] = edge_count.get(e, 0) + 1
    rim = np.zeros(len(P0), bool)
    for (i, j), c in edge_count.items():
        if c == 1:
            rim[i] = rim[j] = True

    # Fit: onto the rendered skin, off it by GAP; relaxed, then clear of the skin and the base-layer cuff.
    P = np.zeros_like(P0)
    for i, p in enumerate(P0):
        loc, nrm, _, _ = skin.find_nearest(Vector(p))
        P[i] = np.array(loc) + np.array(nrm) * GAP
    P = FT.smooth_field(P, nb, 6, 0.5, fixed=rim)   # irons out the nail ridges and the cage's facets
    trees = [skin]
    P, _ = FT.push_out(P, trees, GAP, nb=nb)
    bl = next(((V, Fl) for u, V, Fl in ctx['layers'] if u in ('suit', 'base_layer')), None)
    pushed_layer = 0
    if bl is not None:
        Vb, Fb = bl
        near = np.linalg.norm(Vb - wr, axis=1) < 0.15
        bl_end = float(((Vb[near] - wr) @ af).max()) if near.any() else -1.0
        mask = ((P - wr) @ af) < bl_end - 0.002
        P, moved = FT.push_out(P, [FT.bvh_outward(Vb, Fb, skin)], LAYER_CLEAR, nb=nb, mask=mask)
        pushed_layer = int(moved.sum())
    shell_P = P.copy()

    # Fields and panels.
    N = FT.vertex_normals(P, F)
    sidev = FT.smooth_field(N @ back, nb, 4)
    kd = KDTree(len(BV))
    for i in np.where(region)[0]:
        kd.insert(Vector(BV[i]), int(i))
    kd.balance()
    dom = [ctx['dominant'][kd.find(Vector(p))[1]] for p in P]
    finger = np.array([int(d.split('_')[1]) if d.startswith('finger') else 0 for d in dom])
    seg = np.array([int(d.split('_')[2]) if d.startswith('finger') else 0 for d in dom])
    # Step 06 r2 item 5: domed fingertips. The cage's tip is a pole that the relax step pulls in flat (a dark dot or a
    # flat end in the close-ups); each tip is re-formed as half an ellipsoid through the finger's section 7.5 mm back
    # (its two axes from that section) and the extreme point, blended into the finger over 4.5 mm, then pushed clear.
    tipm = np.zeros(len(P), bool)
    for i_ in range(1, 6):
        h3, t3 = bones[f'finger{side}_{i_}_3']
        d3 = FT.unit(t3 - h3)
        on = np.where((finger == i_) & (seg == 3))[0]
        if len(on) < 30:
            continue
        x = P[on] @ d3
        E, RC = float(x.max()), 0.0075
        slab = on[np.abs(x - (E - RC)) < 0.0012]
        if len(slab) < 8:
            continue
        O = P[slab].mean(axis=0)
        O = O + d3 * ((E - RC) - float(O @ d3))
        Q = P[slab] - O
        Q = Q - np.outer(Q @ d3, d3)
        ev, evec = np.linalg.eigh(Q.T @ Q / len(Q))
        e1, e2 = evec[:, 2], evec[:, 1]
        r1 = math.sqrt(2.0 * float(np.mean((Q @ e1) ** 2)))
        r2 = math.sqrt(2.0 * float(np.mean((Q @ e2) ** 2)))
        sel = on[x > E - RC - 0.003]
        U = P[sel] - O
        a_, b1, b2 = U @ d3, U @ e1, U @ e2
        k = 1.0 / np.sqrt((a_ / RC) ** 2 + (b1 / r1) ** 2 + (b2 / r2) ** 2 + 1e-12)
        w = np.clip((a_ + 0.003) / 0.0045, 0.0, 1.0)
        w = (w * w * (3 - 2 * w))[:, None]
        P[sel] = P[sel] + w * (O + U * k[:, None] - P[sel])
        tipm[sel] = True
    if tipm.any():
        P = FT.smooth_field(P, nb, 2, 0.4, fixed=~tipm)
        P, _ = FT.push_out(P, [skin], GAP, nb=nb, mask=tipm)
        shell_P = P.copy()
        N = FT.vertex_normals(P, F)
        sidev = FT.smooth_field(N @ back, nb, 4)
    # Step 06 r3 item 1: the fit lifts the glove off the raised nail plate, printing the nail's U outline as a step
    # (the ringed disc / crescent on the fingertips in the close-ups). The last segment of every finger is ironed
    # (blended into the fixed rest of the hand) and cleared again by 1.3 mm: the 0.9 mm solidified wall plus margin.
    endm = (finger > 0) & (seg == 3)
    if endm.any():
        P = FT.smooth_field(P, nb, 12, 0.5, fixed=~endm)
        P, _ = FT.push_out(P, [skin], 0.0013, nb=nb, mask=endm)
        shell_P = P.copy()
        N = FT.vertex_normals(P, F)
        sidev = FT.smooth_field(N @ back, nb, 4)
    along = (P - wr) @ a
    projf = (P - wr) @ af
    latp = (P - wr) @ lat
    kal = float((fr['K'].mean(axis=0) - wr) @ a) - 0.003
    klo, khi = float((fr['K'][0] - wr) @ lat) - 0.009, float((fr['K'][3] - wr) @ lat) + 0.009
    # Step 06 fix 5: the knuckle pad is a rounded rectangle on the back of the hand over the knuckle line (18 mm tall,
    # 5 mm corners), drawn by a field on the hand frame, not by per-face tests (finger dominance and the side test
    # left a wavy, crumpled edge). Fix 6: the fingertip patch is a sewn cap - 6 mm over the nail, 22 mm down the pad
    # to the last crease, curving between them along the sides - so its edge never reads as a cut across the finger.
    kc_al, KH, KR = kal - 0.003, 0.009, 0.005
    lc, KW = 0.5 * (klo + khi), 0.5 * (khi - klo) - 0.005

    def g_knuckle(al_, lp_):
        dx = np.abs(al_ - kc_al) - (KH - KR)
        dy = np.abs(lp_ - lc) - (KW - KR)
        return np.sqrt(np.maximum(dx, 0) ** 2 + np.maximum(dy, 0) ** 2) + np.minimum(np.maximum(dx, dy), 0) - KR
    # Step 06 r3 item 1: every finger end is capped by leather with a smooth U edge over the nail (10 mm back on the
    # nail side, 22 mm down the pad): a sewn tip patch on the thumb, index and middle finger, the palm itself wrapping
    # round the ring and little finger ends. The knit back and the fourchettes stop short of the end, so no seam,
    # stitch row or knit disc circles the extreme point (the flat ringed ends in the r2 close-ups).
    tip_d, tip_E = {}, {}
    for i_ in range(1, 6):
        h3, t3 = bones[f'finger{side}_{i_}_3']
        tip_d[i_] = FT.unit(t3 - h3)
        on = (finger == i_) & (seg == 3)
        tip_E[i_] = float((P[on] @ tip_d[i_]).max()) if on.any() else float(t3 @ tip_d[i_])
    palmness = np.clip((0.4 - sidev) / 0.9, 0.0, 1.0)
    cap_len = 0.010 + 0.012 * palmness * palmness * (3 - 2 * palmness)   # r3: the nail-side edge 10 mm back
    gk = np.maximum(g_knuckle(along, latp), 0.02 * (0.3 - sidev))   # the pad only on the back of the hand
    if not KNUCKLE:   # guard work glove: no knuckle panel (the field never crosses zero, nothing is cut or labelled)
        gk = np.ones(len(P))
    gt = np.full(len(P), 1.0)
    for i_ in range(1, 6):
        on = finger == i_
        gt[on] = tip_E[i_] - P[on] @ tip_d[i_] - cap_len[on]

    # Panel edges (r3 item 1 and 5): the shell is cut along the knuckle and fingertip fields' zero contours (a
    # level-set slice, as the boots) so those edges are exact smooth curves. The r2 Newton snap slid vertices past
    # their neighbours and folded the surface (a spike on the middle fingertip once the shell was solidified).
    A = np.column_stack([shell_P, sidev, finger, seg, gk, gt])
    locked = None
    for c in (6, 7):
        P, F, A, _, locked = FT.level_slice(P, F, A, c, locked=locked)
    shell_P, sidev, gk, gt = A[:, 0:3].copy(), A[:, 3].copy(), A[:, 6].copy(), A[:, 7].copy()
    finger, seg = np.rint(A[:, 4]).astype(int), np.rint(A[:, 5]).astype(int)
    nb = FT.neighbours(len(P), F)
    edge_count = {}
    for f in F:
        for i in range(len(f)):
            e = tuple(sorted((f[i], f[(i + 1) % len(f)])))
            edge_count[e] = edge_count.get(e, 0) + 1
    P = untangle(P, F, nb)
    shell_P = untangle(shell_P, F, nb)
    N = FT.vertex_normals(P, F)
    projf = (P - wr) @ af
    along = (P - wr) @ a
    latp = (P - wr) @ lat
    labels = []
    for f in F:
        f = list(f)
        sd, pf, al = sidev[f].mean(), projf[f].mean(), along[f].mean()
        fi = np.bincount(finger[f]).argmax()
        f = np.asarray(f)
        nf = FT.unit(N[f].mean(axis=0))
        if pf < 0.0:
            lab = 'cuff'
        elif gk[f].mean() < 0:
            lab = 'knuckle'
        elif fi in (1, 2, 3) and gt[f].mean() < 0:
            lab = 'tip'
        elif fi in (4, 5) and gt[f].mean() < 0:
            lab = 'palm'
        elif fi == 0 and sd < -0.2 and 0.006 < al < 0.045:
            lab = 'heel'
        elif sd < -0.12:
            lab = 'palm'
        elif sd > 0.12:
            lab = 'back'
        else:
            lcf = float(nf @ lat)   # r3: was `lc`, which overwrote the knuckle pad's centre line (wavy pad edge)
            outer = (fi == 2 and lcf < 0) or (fi == 5 and lcf > 0) or fi in (0, 1)
            lab = 'palm' if outer else 'fourchette'
        labels.append(lab)
    gk = g_knuckle(along, latp)

    # Overlays stand proud (a ramp one ring wide); the knuckle pad is a 2.4 mm padded panel with a 1.3 mm rolled edge
    # and two stitched flex channels across it (fix 5).
    lift = np.zeros(len(P))
    cnt = np.zeros(len(P))
    for f, lab in zip(F, labels):
        for i in f:
            lift[i] += LIFT[lab]
            cnt[i] += 1
    lift /= np.maximum(cnt, 1)
    kn = np.zeros(len(P), bool)
    for f, lab in zip(F, labels):
        if lab == 'knuckle':
            kn[list(f)] = True
    lift = FT.smooth_field(lift, nb, 3)   # padded edges round off instead of stepping
    pad = (np.clip(-gk / 0.0013, 0.0, 1.0) ** 0.7) * kn
    lift += 0.0024 * pad
    for g in (-0.003, 0.003):            # two stitched flex channels across the pad
        lift -= 0.0012 * pad * np.exp(-(((along - kc_al) - g) / 0.0011) ** 2)
    Nl = FT.smooth_field(N, nb, 6)   # r3: lifted along smoothed normals (the pad crumpled over the knuckle bumps)
    Nl = Nl / np.maximum(np.linalg.norm(Nl, axis=1), 1e-12)[:, None]
    P = P + Nl * lift[:, None]
    P = untangle(P, F, nb)
    N = FT.vertex_normals(P, F)

    # Wear: the trigger finger's palm side and the palm heel polish first, the thumb tip and middle tip less.
    nz = FT.hash_noise(P, 900.0, 1.3 if side == 'L' else 4.1)
    wear = np.zeros(len(P))
    wear[(finger == 2) & (sidev < 0.25)] = 0.9
    wear[(finger == 1) & (seg == 3)] = 0.45
    wear[(finger == 3) & (seg == 3) & (sidev < 0.2)] = 0.3
    heel_v = np.zeros(len(P), bool)
    for f, lab in zip(F, labels):
        if lab == 'heel':
            heel_v[list(f)] = True
    wear[heel_v] = np.maximum(wear[heel_v], 0.75)
    wear = FT.smooth_field(wear, nb, 4) * (0.65 + 0.35 * nz)

    # UVs in metres: per face, a planar projection on the hand-frame plane the face faces most.
    axes = (back, lat, a)
    uv = []
    for f in F:
        nf = FT.unit(N[list(f)].mean(axis=0))
        sc = [abs(nf @ x) for x in axes]
        if finger[list(f)].min() > 0:
            sc[2] = -1.0     # r2 item 5: a finger end keeps its side's projection (a disc seam and a dot otherwise)
        k = int(np.argmax(sc))
        u_ax, v_ax = [axes[j] for j in range(3) if j != k]
        for i in f:
            uv.append((float(P[i] @ u_ax), float(P[i] @ v_ax)))

    o = len(V_all)
    V_all.extend(P)
    F_all.extend([tuple(i + o for i in f) for f in F])
    store['labels'].extend(labels)
    store['uv'].extend(uv)
    store['wear'].extend(wear)
    so = len(store['shellV'])
    store['shellV'].extend(shell_P)
    store['shellF'].extend([tuple(i + so for i in f) for f in F])

    # Stitches on every panel boundary, 1.1 mm into the overlay (the higher-priority side).
    SV, SF = store['stitchV'], store['stitchF']
    face_c = np.array([P[list(f)].mean(axis=0) for f in F])
    edge_face = {}
    for fi_, f in enumerate(F):
        for i in range(len(f)):
            edge_face.setdefault(tuple(sorted((f[i], f[(i + 1) % len(f)]))), []).append(fi_)
    stitches = 0
    seam_m = 0.0
    for chain, key, sidel in FT.boundary_chains(F, labels, PRIO):
        pts = P[chain]
        nrm = N[chain]
        T = FT.unit(np.gradient(pts, axis=0))
        X = FT.unit(np.cross(nrm, T))
        mid = len(chain) // 2
        e = tuple(sorted((chain[mid - 1], chain[mid])))
        fs = edge_face.get(e, [])
        sgn_ = 1.0
        for fj in fs:
            if labels[fj] == sidel:
                sgn_ = 1.0 if np.dot(face_c[fj] - (P[e[0]] + P[e[1]]) / 2, X[mid]) > 0 else -1.0
        closed = chain[0] == chain[-1]
        row = FT.smooth_polyline(pts + X * sgn_ * 0.0011, 3, closed)
        stitches += FT.stitch_row(SV, SF, row, nrm, lift=0.00025)
        seam_m += float(np.linalg.norm(np.diff(row, axis=0), axis=1).sum())
    # The flex channels are stitched through the padding: a row along the bottom of each channel (fix 5).
    bvh_g = BVHTree.FromPolygons([tuple(p_) for p_ in P], [tuple(f) for f in F])
    for g in ((-0.003, 0.003) if KNUCKLE else ()):
        pts_c, nrm_c = [], []
        for lp_ in np.linspace(lc - KW + 0.0035, lc + KW - 0.0035, 28):
            o_ = wr + a * (kc_al + g) + lat * lp_
            hit, hn, _, _ = bvh_g.ray_cast(Vector(o_ + back * 0.05), Vector(-back), 0.1)
            if hit is not None:
                pts_c.append(np.array(hit))
                nrm_c.append(np.array(hn))
        if len(pts_c) >= 4:
            row = FT.smooth_polyline(np.array(pts_c), 2)
            stitches += FT.stitch_row(SV, SF, row, np.array(nrm_c), lift=0.00025)
            seam_m += float(np.linalg.norm(np.diff(row, axis=0), axis=1).sum())
    # Bound cuff edge.
    rim_edges = [e for e, c in edge_count.items() if c == 1]
    adj = {}
    for i, j in rim_edges:
        adj.setdefault(i, []).append(j)
        adj.setdefault(j, []).append(i)
    if adj:
        start = min(adj, key=lambda v: P[v] @ af)
        loop, prev, cur = [start], None, start
        while True:
            nxt = next((n for n in adj[cur] if n != prev), None)
            if nxt is None or nxt == start or len(loop) > len(adj):
                break
            loop.append(nxt)
            prev, cur = cur, nxt
        pts = FT.smooth_polyline(P[loop] + N[loop] * 0.0002 - af * 0.0004, 2, True)
        FT.tube(store['bindV'], store['bindF'], pts, 0.0012, 8, closed=True)

    # Wrist tab: a leather strap round the back of the cuff 2.6 cm up from the wrist, sewn on at the little-finger
    # side (box-X), closing on a loop patch on the thumb side; a pull loop at its free end.
    pf_tab = -0.026
    c0 = wr + af * pf_tab
    ring_sel = np.abs(projf - pf_tab) < 0.0016
    R = P[ring_sel] - c0
    R = R - af * (R @ af)[:, None]
    ref_b = FT.unit(back - af * (back @ af))
    ref_l = np.cross(af, ref_b)
    th = np.arctan2(R @ ref_l, R @ ref_b)
    rad = np.linalg.norm(R, axis=1)
    order = np.argsort(th)
    th_s, rad_s = th[order], rad[order]
    # the little-finger side is +lat; the strap runs from there over the back to the thumb side
    l_sign = 1.0 if (lat @ ref_l) > 0 else -1.0
    span = np.linspace(l_sign * 1.75, -l_sign * 1.75, 36)

    def ring_at(pf):
        c = wr + af * pf
        sel = np.abs(projf - pf) < 0.0016
        R_ = P[sel] - c
        R_ = R_ - af * (R_ @ af)[:, None]
        t_ = np.arctan2(R_ @ ref_l, R_ @ ref_b)
        o_ = np.argsort(t_)
        return c, t_[o_], np.linalg.norm(R_, axis=1)[o_]
    rails = [ring_at(pf_tab - 0.010), ring_at(pf_tab + 0.010)]

    def rail_pt(k, t, lift_):
        c, ts, rs = rails[k]
        r = np.interp(t, ts, rs, period=2 * math.pi)
        d = math.cos(t) * ref_b + math.sin(t) * ref_l
        return c + d * (r + lift_), d

    def band(store_v, store_f, ts, lift_, thick, inset=0.0):
        """A strap lying on the cuff between the two rails (its edges follow the taper), thickness along the normal."""
        base = len(store_v)
        for t in ts:
            (a0_, d0), (a1_, d1) = rail_pt(0, t, lift_), rail_pt(1, t, lift_)
            a0_, a1_ = a0_ + (a1_ - a0_) * inset, a1_ + (a0_ - a1_) * inset
            n_ = FT.unit(d0 + d1)
            for q in (a0_, a1_, a1_ + n_ * thick, a0_ + n_ * thick):
                store_v.append(q)
        for i in range(len(ts) - 1):
            for k in range(4):
                k2 = (k + 1) % 4
                store_f.append((base + i * 4 + k, base + (i + 1) * 4 + k, base + (i + 1) * 4 + k2, base + i * 4 + k2))
        store_f.append((base + 3, base + 2, base + 1, base))
        e = base + (len(ts) - 1) * 4
        store_f.append((e, e + 1, e + 2, e + 3))
    band(store['tabV'], store['tabF'], span, 0.0011, 0.0013, inset=0.03)
    band(store['loopV'], store['loopF'], span[-14:], 0.0004, 0.0006, inset=-0.08)
    mid_pts, mid_n = [], []
    for t in span:
        (a0_, d0), (a1_, d1) = rail_pt(0, t, 0.0024), rail_pt(1, t, 0.0024)
        mid_pts.append((a0_, a1_))
        mid_n.append(FT.unit(d0 + d1))
    mid_n = np.array(mid_n)
    edge_a = np.array([m[0] + (m[1] - m[0]) * 0.11 for m in mid_pts])
    edge_b = np.array([m[1] + (m[0] - m[1]) * 0.11 for m in mid_pts])
    # stitch outline inside the tab edges, and the box-X where it is sewn on (little-finger end)
    for row in (edge_a, edge_b):
        stitches += FT.stitch_row(SV, SF, row, mid_n, lift=0.0)
    corners = [edge_a[1], edge_b[1], edge_b[7], edge_a[7]]
    for p_, q_ in ((corners[0], corners[1]), (corners[1], corners[2]), (corners[2], corners[3]), (corners[3], corners[0]),
                   (corners[0], corners[2]), (corners[1], corners[3])):
        stitches += FT.stitch_row(SV, SF, np.linspace(p_, q_, 8), np.tile(mid_n[4], (8, 1)), lift=0.0)
    # pull loop: the free end folded back on itself into a flat loop (a gloved finger hooks it)
    (e0, d0), (e1, d1) = rail_pt(0, span[-1], 0.0011), rail_pt(1, span[-1], 0.0011)
    e_n = FT.unit(d0 + d1)
    e_t = FT.unit((rail_pt(0, span[-1], 0)[0] - rail_pt(0, span[-2], 0)[0]))
    c_ = (e0 + e1) / 2
    w_ = FT.unit(e1 - e0)
    arc = np.linspace(-math.pi / 2, math.pi / 2, 9)
    lp_pts = [c_ + e_n * (0.0019 + 0.0019 * math.sin(s_)) + e_t * (0.0045 * math.cos(s_)) for s_ in arc]
    lp_pts = [c_ - e_t * 0.006 + e_n * 0.0006] + lp_pts + [c_ - e_t * 0.006 + e_n * 0.0032]
    FT.strip(store['pullV'], store['pullF'], np.array(lp_pts), np.tile(e_n, (len(lp_pts), 1)),
             np.tile(w_, (len(lp_pts), 1)), 0.012, 0.0009)
    store['stitches'] += stitches
    store['seamM'] += seam_m
    store['measure'][side] = {
        'handLengthM': round(float(np.linalg.norm(bones[f'finger{side}_3_3'][1] - wr)), 4),
        'knuckleBreadthM': round(float(np.linalg.norm(fr['K'][3] - fr['K'][0])), 4),
        'cuffGirthM': round(float(2 * math.pi * rad.mean()), 4) if len(rad) else 0.0,
        'pushedOffBaseLayer': pushed_layer, 'panels': {k: labels.count(k) for k in SLOT},
    }


def untangle(P, F, nb, rounds=12):
    """Step 06 r3 item 1: relax folded vertices. A vertex whose fan folds over (a face normal against the smoothed
    vertex normal: the fit's push off the nail ridge and the web pulled a few across their neighbours) gets an
    inverted normal, and the solidify then offsets its inner shell 0.9 mm OUT through the glove - the dark dot / spike
    on the fingertips. Each such vertex and its ring move to their neighbours' mean until no fan folds."""
    P = P.copy()
    groups = {}
    for f in F:
        groups.setdefault(len(f), []).append(f)
    groups = {k: np.array(v, int) for k, v in groups.items()}
    for _ in range(rounds):
        N = FT.vertex_normals(P, F)
        Ns = FT.smooth_field(N, nb, 3)
        Ns = Ns / np.maximum(np.linalg.norm(Ns, axis=1), 1e-12)[:, None]
        bad = set()
        for k, G in groups.items():
            Q = P[G]
            n = sum(np.cross(Q[:, i], Q[:, (i + 1) % k]) for i in range(k))
            ln = np.linalg.norm(n, axis=1)
            n = n / np.maximum(ln, 1e-14)[:, None]
            dots = np.einsum('fkc,fc->fk', Ns[G], n)
            hit = (ln < 1e-14) | (dots.min(axis=1) < 0.3)
            bad.update(G[hit].ravel().tolist())
        print(f'[gloves] untangle: {len(bad)} folded-fan vertices')
        if not bad:
            break
        ring = set(bad)
        for v in bad:
            ring.update(nb[v])
        ring = sorted(ring)
        P[ring] = np.array([P[list(nb[v])].mean(axis=0) for v in ring])
    return P


def build(ctx):
    if GUARD is not None:
        ctx = guard_ctx(ctx)
    scene, reuse, MAT = ctx['scene'], ctx['reuse'], ctx['MAT']
    store = {k: [] for k in ('labels', 'uv', 'wear', 'shellV', 'shellF', 'stitchV', 'stitchF', 'bindV', 'bindF',
                             'tabV', 'tabF', 'loopV', 'loopF', 'pullV', 'pullF')}
    store.update({'stitches': 0, 'seamM': 0.0, 'measure': {}})
    V, F = [], []
    for side in ('L', 'R'):
        build_hand(ctx, side, V, F, store)
    op = ctx['op_id']
    leather = reuse(MAT.leather, 'glove leather') if LEATHER is None else reuse(MAT.leather, LEATHER[0], colour=LEATHER[1])
    mats = [leather, reuse(MAT.knit, 'glove knit', colour=(0.029, 0.03, 0.031)),
            reuse(MAT.softshell, 'glove knuckle', colour=(0.025, 0.026, 0.025)),
            reuse(MAT.knit, 'glove cuff', colour=(0.033, 0.034, 0.035))]
    hero = FT.add_mesh(scene, f'{op}-{NAME}-hero', V, F, mats, mat_index=[SLOT[l] for l in store['labels']],
                       uv=store['uv'], attrs={'wear': store['wear']})
    sol = hero.modifiers.new('thickness', 'SOLIDIFY')
    sol.thickness = 0.0009
    sol.offset = -1.0
    sol.use_even_offset = False
    sol.use_rim = True
    stitches = FT.add_mesh(scene, f'{op}-{NAME}-stitches', store['stitchV'], store['stitchF'], reuse(MAT.thread, 'thread'))
    stitches.visible_shadow = False   # as the trousers' (A17): a 0.3 mm thread throws no real shadow
    binding = FT.add_mesh(scene, f'{op}-{NAME}-binding', store['bindV'], store['bindF'], reuse(MAT.webbing, 'binding'))
    tab_uv = [(0.0, 0.0)] * sum(len(f) for f in store['tabF'])
    tabs = FT.add_mesh(scene, f'{op}-{NAME}-tabs', store['tabV'], store['tabF'], mats[0], uv=tab_uv,
                       attrs={'wear': np.full(len(store['tabV']), 0.2)})
    _fix_uv(tabs)
    loops = FT.add_mesh(scene, f'{op}-{NAME}-loop', store['loopV'], store['loopF'], reuse(MAT.loop, 'loop'))
    pulls = FT.add_mesh(scene, f'{op}-{NAME}-pull', store['pullV'], store['pullF'], mats[0],
                        uv=[(0.0, 0.0)] * sum(len(f) for f in store['pullF']), attrs={'wear': np.full(len(store['pullV']), 0.3)})
    _fix_uv(pulls)
    return {
        'shell': (np.array(store['shellV']), store['shellF']),
        'objects': [hero, stitches, binding, tabs, loops, pulls],
        'measurements': store['measure'],
        'report': {'stitches': store['stitches'], 'seamRowsM': round(store['seamM'], 2),
                   'panelFaces': {k: store['labels'].count(k) for k in SLOT}},
    }


def _fix_uv(ob):
    """Metric UVs for the small leather parts: each face corner projected on the plane its face faces most."""
    me = ob.data
    lay = me.uv_layers['pattern']
    for p in me.polygons:
        n = np.abs(np.array(p.normal))
        k = int(np.argmax(n))
        ax = [j for j in range(3) if j != k]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            lay.data[li].uv = (co[ax[0]], co[ax[1]])


# --- Guard bake (docs/guard-models PLAN G2, SPEC 4 `uniform` plain gloves / `work` work gloves, SPEC 6 bones) ----------
# The guards' hands have one bone per finger, head at the MCP joint (thumb: CMC), tail at the tip (G1: named
# `finger<side>_<i>_1`, Wren's scheme with the one segment; the earlier `finger<side>_<i>` is read too). This build reads
# three segments per finger (`finger<side>_<i>_1..3`), so guard_ctx() splits each bone at typical phalanx shares, bends
# the last segment a little towards the palm (it gives the hand frame its palm side, as the hero rig's curl does) and
# gives each finger vertex the segment it lies along. The palm side comes from the hand itself (the thumb tip lies on
# the palm side of the knuckle plane), not from a bone roll. Variant 'work': no knuckle panel, a longer cuff, a thicker
# tan leather glove.
FINGER_SPLIT = {1: (0.40, 0.33), 2: (0.47, 0.29), 3: (0.47, 0.29), 4: (0.47, 0.29), 5: (0.46, 0.29)}
TIP_CURL = 0.12


def configure(part, variant=None, prefix=None, **_):
    """Guard mode for this module copy (guard_garment.load_part)."""
    global GUARD, KIT, NAME, KNUCKLE, LEATHER, CUFF_UP, GAP
    if variant not in (None, 'work'):
        raise SystemExit(f'gloves: unknown variant {variant!r} (work)')
    GUARD = {'part': part, 'variant': variant, 'prefix': prefix or part}
    KIT = NAME = part
    if variant == 'work':
        KNUCKLE = False
        LEATHER = ('work glove leather', (0.085, 0.058, 0.034))
        CUFF_UP = 0.075
        GAP = 0.0026


def guard_ctx(ctx):
    bones = dict(ctx['bones'])
    split = {}   # vertex group name -> (segment bone stem, head, axis, length, shares)
    for side in ('L', 'R'):
        stem = f'finger{side}'
        whole = {}
        for i in range(1, 6):
            if f'{stem}_{i}_3' in bones:          # a hero rig (three segments): nothing to split
                continue
            name = next((n for n in (f'{stem}_{i}_1', f'{stem}_{i}') if n in bones), None)
            if name is not None:
                whole[i] = (name, *(np.asarray(x, float) for x in bones[name]))
        if len(whole) < 5:
            continue
        # palm side: the hand frame's normal (knuckle line x the hand axis) signed so the thumb tip lies on the palm side
        wr = np.asarray(bones[f'wr{side}'][0], float)
        K = np.array([whole[i][1] for i in range(2, 6)])
        a = FT.unit(K.mean(axis=0) - wr)
        lat = K[3] - K[0]
        lat = FT.unit(lat - a * float(lat @ a))
        n = np.cross(a, lat)
        dors = -n if float((whole[1][2] - K.mean(axis=0)) @ n) > 0 else n
        for i, (name, h, t) in whole.items():
            d = t - h
            L = float(np.linalg.norm(d))
            u = d / L
            f1, f2 = FINGER_SPLIT[i]
            j1, j2 = h + d * f1, h + d * (f1 + f2)
            d3 = FT.unit(u - TIP_CURL * FT.unit(dors - u * float(dors @ u)))
            bones[f'{stem}_{i}_1'] = (h, j1)
            bones[f'{stem}_{i}_2'] = (j1, j2)
            bones[f'{stem}_{i}_3'] = (j2, j2 + d3 * L * (1.0 - f1 - f2))
            split[name] = (f'{stem}_{i}', h, u, L, f1, f2)
    BV = ctx['BV']
    dom = [str(x) for x in ctx['dominant']]
    for k, dn in enumerate(dom):
        if dn in split:
            seg, h, u, L, f1, f2 = split[dn]
            t = float((BV[k] - h) @ u) / L
            dom[k] = f'{seg}_{1 if t < f1 else 2 if t < f1 + f2 else 3}'
    out = dict(ctx)
    out['bones'] = bones
    out['dominant'] = np.array(dom, dtype=object)
    return out


if __name__ == '__main__':   # guard bake job (guard-bake.mjs --stage garments)
    import guard_garment
    guard_garment.main()
