"""Wren's approach boots (step 09b; D23 "Lighter approach boots"; SPEC 3.1 Approach boots, ART-DIRECTION 9.2 Boots).
Built by py/build_fitted.py (DECISIONS A18) as the FITTED item `approach_boots` (kit id `boots`); replaces the step 06
mid boot (`boots.py`, kept for Moth) in Wren's GARMENTS (A67).

The last is lofted round the foot like the step 06 boot (`boots.Frame`, convex section hulls plus a wall clearance),
then re-shaped as an approach shoe: a lower toe box (less toe raise and toe room, a sharper asymmetric plan so the nose
is not blunt), a toe spring that curves the whole forefoot up toward the tip, a close heel cup and a mid collar (top
line 12.2 cm, the padded roll about 0.8 cm over it) that closes over the suit's bonded ankle cuff (A38).
Panels: a sticky rubber rand round the whole upper that rises over the toe box (a bumper across the nose) and a little
up the heel; a suede vamp overlay behind it, suede eyestays that run close to the toe, a suede heel counter, nylon
quarters, a bellows tongue (gussets joining it to the vamp, so nothing lets grit in or catches), a padded collar.
Hardware: seven low-profile eyelets a side (no speed hooks), criss-crossed laces from near the toe to the collar, the
lace ends and the bow in a garage pocket at the tongue top (no loose loop), a webbing heel pull loop (box-X).
Sole: a firm, thin midsole (the groove line) on a sticky rubber outsole; a smooth, flat edging (climbing) zone under the
toes, flush with the lug faces; low lugs (3 mm) in an original V-bar pattern with a perimeter edge band; a recessed
arch and a distinct transverse heel brake (deeper than the lugs).
Wear ('wear' attribute): the rand scuffed at the toe and the heel, a flex crease across the forefoot, the edging zone
polished; dust packs into the lugs (the rubber's AO dust).
"""
import math

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import fitted as FT
from boots import Frame, smoothstep, _planar_uv

KIT = 'boots'
METHOD = ('parametric hard model: an approach-shoe last lofted from the foot (convex section hulls plus clearance) with '
          'a toe spring, a moulded rand and an edging sole')
N_RING = 84
CLEAR = 0.0045       # wall clearance off the skin and the suit
TOE_ROOM = 0.012     # in front of the toes (plus the wall clearance)
TOE_RAISE = 0.003    # toe-box height added over the ball: low toe volume (the step 06 boot: 8 mm)
Z_TOP = 0.122        # top line of the shaft at the sides and front (the padded roll rises about 1 cm over it)
BACK_RISE = 0.0105   # the top line rises smoothly from the front to the heel (a low heel tab); top edge under 14 cm (A68)
CUFF = 0.027         # the suit's pressed hem sits this far under the collar's top edge (A38: 25 mm or more)
SUIT_IN = 0.0015     # pressed suit vertices stay this far inside the boot's inner (lining) surface (A68)
# the padded collar roll over the top ring (radial offset, height): a round outer roll, then the lining down inside
ROLL = ((0.0011, 0.0013), (0.0017, 0.0029), (0.0013, 0.0045), (0.0003, 0.0057), (-0.0009, 0.0057),
        (-0.0019, 0.0047), (-0.0028, 0.0031), (-0.0036, -0.006), (-0.0036, -0.014), (-0.0036, -0.022),
        (-0.0036, -0.03))
ROLL_IN = 5          # the first lining row (the roll's inner edge)
SEAL = (0.0014, 0.0011, 0.0009, 0.0009, 0.0009, 0.0009)     # the lining rows' gaps to the suit
SPRING = 0.010       # toe spring at the tip
LUG = 0.0029         # lug depth below the outsole face (about 3 mm)
LIFT = {'rand': 0.0009, 'toecap': 0.0009, 'counter': 0.0010, 'eyestay': 0.0012, 'tongue': -0.0012,
        'gusset': -0.0007, 'collar': 0.0009, 'quarter': 0.0}
SLOT = {'quarter': 0, 'tongue': 0, 'gusset': 0, 'collar': 0, 'toecap': 1, 'counter': 1, 'eyestay': 1, 'rand': 2}
PRIO = {'rand': 8, 'tongue': 7, 'gusset': 6, 'eyestay': 5, 'collar': 4, 'toecap': 3, 'counter': 2, 'quarter': 1}
TWIN = {'eyestay', 'counter'}


def build_foot(ctx, side, out, store):
    J, skin = ctx['J'], ctx['skin']
    sc = ctx['H'] / 1.68
    z_top = Z_TOP * sc
    sgn = float(np.sign(J[f'an{side}'][0]))
    BVE = ctx['BVE']
    sel = (BVE[:, 2] < z_top + 0.04) & (BVE[:, 0] * sgn > 0.04) & (BVE[:, 0] * sgn < 0.32)
    PC = BVE[sel]
    bl = next(((V, F) for u, V, F in ctx['layers'] if u in ('suit', 'base_layer')), None)
    suit_low = None
    if bl is not None:
        Vb = bl[0]
        mb = (Vb[:, 2] < z_top + 0.04) & (Vb[:, 0] * sgn > 0.04) & (Vb[:, 0] * sgn < 0.32)
        PC = np.vstack([PC, Vb[mb]])
        suit_low = Vb[(Vb[:, 2] < 0.3) & (Vb[:, 0] * sgn > 0.04) & (Vb[:, 0] * sgn < 0.32)]
    fr = Frame(BVE[sel], sgn)
    LP = fr.local(PC)
    L = float(LP[LP[:, 2] < 0.05, 0].max())

    def front(z):
        m = (np.abs(LP[:, 2] - z) < 0.004) & (LP[:, 0] < L * 0.6)
        return float(LP[m, 0].max())

    def top_at(s):
        m = np.abs(LP[:, 0] - s) < 0.004
        return float(LP[m, 2].max()) if m.any() else 0.0
    s_Q = front(0.09 * sc) + 0.028
    z_Q = max(top_at(s_Q) + 0.03, 0.085 * sc)

    def ring(O, e2, m, extra=None):
        sz = LP[:, [0, 2]] - O
        dist = sz @ m
        r = sz @ e2
        msk = (np.abs(dist) < 0.0035) & (r > -0.002) & (np.abs(LP[:, 1]) < 0.09)
        if extra is not None:
            msk &= extra
        pts = np.stack([LP[msk, 1], r[msk]], axis=1)
        if len(pts) < 6:
            return None
        h = FT.hull2d(pts)
        if len(h) < 3:
            return None
        dense = FT.resample_closed(h, 200)
        off = FT.offset_closed(dense, CLEAR)
        return FT.resample_closed(off, N_RING, start_dir=(0.0, 1.0))

    rings = []
    down, back = np.array([0.0, -1.0]), np.array([-1.0, 0.0])
    # The toe box: the ball section mapped onto an asymmetric toe (superellipse plan round a toe point 40 % of the way
    # to the medial edge, the lateral side rounder) and an elliptical side profile; lower than the step 06 boot.
    s_ball = 0.7 * L
    s_tip = L + TOE_ROOM + CLEAR
    rg_ball = ring(np.array([s_ball, z_Q]), down, np.array([1.0, 0.0]), LP[:, 2] < z_Q + 0.01)
    w_mid = 0.5 * (rg_ball[:, 0].min() + rg_ball[:, 0].max())
    w_tip = w_mid + 0.4 * (rg_ball[:, 0].min() - w_mid)
    z_nb = 0.0125
    z_b = z_Q - rg_ball[:, 1]
    z_b = z_b + TOE_RAISE * np.clip((z_b - z_nb) / (z_b.max() - z_nb), 0.0, 1.0)
    toe_pts = LP[(LP[:, 0] > s_ball) & (LP[:, 2] < z_Q + 0.01)]
    for v_ in np.linspace(0.975, 0.0, 40):
        u = 1.0 - (1.0 - v_) ** 1.5
        s = s_ball + u * (s_tip - s_ball)
        kM = max(1 - u ** 1.9, 0.0) ** (1 / 1.9)
        kL = max(1 - u ** 1.6, 0.0) ** (1 / 1.6)
        kH = max(1 - u ** 2.2, 0.0) ** (1 / 2.2)
        w2 = w_tip + (rg_ball[:, 0] - w_tip) * np.where(rg_ball[:, 0] < w_tip, kM, kL)
        z2 = np.where(z_b > z_nb, z_nb + (z_b - z_nb) * kH, z_b)
        near = toe_pts[np.abs(toe_pts[:, 0] - s) < 0.0025]
        if len(near):
            g = 1.0
            for wq, zq in near[:, 1:]:
                ex = (wq - w_tip) / ((rg_ball[:, 0].min() if wq < w_tip else rg_ball[:, 0].max()) - w_tip + 1e-9)
                k_ = kM if wq < w_tip else kL
                if ex > 0:
                    g = max(g, (ex + CLEAR * 0.6 / abs(rg_ball[:, 0] - w_tip).max()) / max(k_, 1e-3))
            if g > 1.0:
                w2 = w_tip + (w2 - w_tip) * min(g, 1.35)
        rings.append((np.column_stack([w2, z_Q - z2]), np.array([s, z_Q]), down))
    for s in np.arange(s_ball - 0.003, s_Q, -0.003):
        rg = ring(np.array([s, z_Q]), down, np.array([1.0, 0.0]), LP[:, 2] < z_Q + 0.01)
        if rg is not None:
            rings.append((rg, np.array([s, z_Q]), down))
    for rg, O, _ in rings:
        zz = z_Q - rg[:, 1]
        zt = float(zz.max())
        k_r = TOE_RAISE * float(smoothstep(s_Q + 0.008, s_ball, O[0]))
        if k_r > 0 and zt > z_nb + 0.004 and O[0] < s_ball - 1e-6:
            rg[:, 1] = z_Q - (zz + k_r * np.clip((zz - z_nb) / (zt - z_nb), 0.0, 1.0))
    Q = np.array([s_Q, z_Q])
    for a in np.radians(np.arange(3.0, 90.0, 3.0)):
        e2 = np.array([-math.sin(a), -math.cos(a)])
        m = np.array([math.cos(a), -math.sin(a)])
        rg = ring(Q, e2, m)
        if rg is not None:
            rings.append((rg, Q, e2))
    for z in np.arange(z_Q, z_top + 1e-6, 0.003):
        rg = ring(np.array([s_Q, z]), back, np.array([0.0, 1.0]), LP[:, 0] < s_Q + 0.01)
        if rg is not None:
            rings.append((rg, np.array([s_Q, z]), back))
    T = len(rings)

    G = np.zeros((T, N_RING, 3))
    k_top = np.zeros(T, int)
    for t, (rg, O, e2) in enumerate(rings):
        sz = O + np.outer(rg[:, 1], e2)
        G[t] = np.column_stack([sz[:, 0], rg[:, 0], sz[:, 1]])
    wc = np.array([rg[:, 0].mean() for rg, _, _ in rings])
    for _ in range(6):
        wc[1:-1] = (wc[:-2] + 2 * wc[1:-1] + wc[2:]) / 4
    for t, (rg, _, _) in enumerate(rings):
        cand = np.where(rg[:, 1] < rg[:, 1].mean())[0]
        k_top[t] = int(cand[np.argmin(np.abs(rg[cand, 0] - wc[t]))])
    for _ in range(8):
        G[1:-1] = G[1:-1] + 0.5 * ((G[:-2] + G[2:]) / 2 - G[1:-1])
    # round each ring (Taubin, along the ring): the convex section hulls leave flat facets and corners that line up
    # ring to ring and read as vertical stripes on the quarter under a rake light; the wall clearance is restored by
    # push_out below
    for _ in range(12):
        for lam in (0.5, -0.53):
            G = G + lam * ((np.roll(G, 1, axis=1) + np.roll(G, -1, axis=1)) / 2 - G)

    # toe spring: the forefoot curves up toward the tip (quadratic from 82 % of the foot), the sole with it
    s_sp0 = 0.82 * L

    def spring(s):
        return SPRING * np.clip((np.asarray(s, float) - s_sp0) / (s_tip - s_sp0), 0.0, None) ** 2

    def sole_top(s):
        s = np.asarray(s, float)
        return 0.026 + (0.019 - 0.026) * smoothstep(0.06, 0.14, s) + spring(s)

    def z_cut(s):
        return sole_top(s) - 0.003
    # lift the nose by the spring, fading up the toe box so the toe stays low
    zc0 = z_cut(G[..., 0]) - spring(G[..., 0])
    G[..., 2] = G[..., 2] + spring(G[..., 0]) * (1.0 - 0.5 * np.clip((G[..., 2] - zc0) / 0.03, 0.0, 1.0))
    G[..., 2] = np.maximum(G[..., 2], z_cut(G[..., 0]))

    # the top line (A68): the top 3 cm of the shaft rise smoothly round the leg from the front (0) to the back
    # (BACK_RISE), a low heel tab with no step; the suit's higher back hem is pressed under it (press_suit_hem)
    gc_ = G[T - 1, :, :2].mean(axis=0)
    rr_ = G[..., :2] - gc_
    cth = rr_[..., 0] / np.maximum(np.linalg.norm(rr_, axis=-1), 1e-9)     # +1 toward the toe, -1 the back line
    rise = BACK_RISE * ((1.0 - cth) / 2.0) ** 1.4
    G[..., 2] += rise * smoothstep(z_top - 0.03, z_top, G[..., 2])
    # padded collar: a round roll over the lining
    top = G[-1].copy()
    cen = top.mean(axis=0)
    rad = FT.unit((top - cen) * np.array([1, 1, 0]))
    collar = []
    for off, dz in ROLL:
        collar.append(top + rad * off + np.array([0, 0, dz]))
    G = np.concatenate([G, np.array(collar)], axis=0)
    k_top = np.concatenate([k_top, np.full(len(collar), k_top[-1])])
    T_main = T
    T = len(G)

    W = fr.world(G.reshape(-1, 3))
    idx = np.arange(T * N_RING).reshape(T, N_RING)
    F = []
    for t in range(T - 1):
        for k in range(N_RING):
            k2 = (k + 1) % N_RING
            F.append((idx[t, k], idx[t, k2], idx[t + 1, k2], idx[t + 1, k]))
    tip = len(W)
    z_tipc = float(z_Q - rings[0][0][:, 1].mean()) + float(spring(s_tip)) * 0.8
    W = np.vstack([W, fr.world(np.array([[s_tip + 0.0004, w_tip, z_tipc]]))])
    for k in range(N_RING):
        F.append((tip, idx[0, (k + 1) % N_RING], idx[0, k]))
    votes = 0
    for f in F[::37]:
        p_ = W[list(f)]
        n_ = np.cross(p_[1] - p_[0], p_[2] - p_[0])
        c_ = p_.mean(axis=0)
        loc_, _, _, _ = skin.find_nearest(Vector(c_))
        if loc_ is not None:
            votes += 1 if np.dot(n_, c_ - np.array(loc_)) > 0 else -1
    if votes < 0:
        F = [tuple(f)[::-1] for f in F]
    nb = FT.neighbours(len(W), F)
    lining = np.zeros(len(W), bool)
    lining[idx[T_main + ROLL_IN:].ravel()] = True
    mask = ~lining
    suit_tree = None
    W0 = W.copy()
    if bl is not None:
        # the boot fits a smoothed copy of the suit's lower leg: the settled suit's folds and the flared hem at the back
        # pressed dents and tents into the collar band (fix round 1); the suit itself is pressed inside the boot
        # afterwards (press_suit_hem), so the boot need not follow its folds
        suit_tree = FT.bvh_outward(*_smooth_leg(bl[0], bl[1], sgn), skin)
        # the padded collar hugs the suit (A38: no gap): the convex section hull bridges the hollows either side of the
        # Achilles tendon, so the top ring is drawn in to the clearance, column by column, and the shaft follows it
        # over its top 3 cm; the roll and the lining move with the top ring
        tr = idx[T_main - 1]
        D = np.zeros((N_RING, 3))
        for k in range(N_RING):
            p = W[tr[k]]
            hit = suit_tree.find_nearest(Vector(p))
            if hit[0] is None:
                continue
            v = p - np.array(hit[0])
            v[2] = 0.0
            d = float(np.linalg.norm(v))
            if d > CLEAR + 0.0008:
                D[k] = -v / d * (d - CLEAR - 0.0008)
        for _ in range(3):
            D = (np.roll(D, 1, axis=0) + 2 * D + np.roll(D, -1, axis=0)) / 4
        zrow = G[:, :, 2].mean(axis=1)
        wrow = np.where(np.arange(T) >= T_main - 1, 1.0, smoothstep(z_top - 0.03, z_top, zrow))
        W[:T * N_RING] += (wrow[:, None, None] * D[None, :, :]).reshape(-1, 3)
        W0 = W.copy()
        mask_bl = mask & (W[:, 2] > float(bl[0][:, 2].min()) + 0.003)
        W, _ = FT.push_out(W, [suit_tree], CLEAR * 0.6, nb=nb, mask=mask_bl)
    W, moved = FT.push_out(W, [skin], CLEAR * 0.6, nb=nb, mask=mask)
    W = _settle(W0, W, T, mask)
    if suit_tree is not None:
        # the roll's inner edge and the lining seal on the suit (A38: no gap, no skin): each lining vertex is drawn in
        # horizontally to 1 mm off the suit
        for r_, gap in zip(range(T_main + ROLL_IN, T), SEAL):
            for k in range(N_RING):
                i_ = idx[r_, k]
                hit = suit_tree.find_nearest(Vector(W[i_]))
                if hit[0] is None:
                    continue
                v = W[i_] - np.array(hit[0])
                v[2] = 0.0
                d = float(np.linalg.norm(v))
                if d > gap:
                    W[i_] = W[i_] - v / d * (d - gap)
    # the lining stays inside the outer wall (fix round 1): both walls are 1.4 mm thick (solidify), so each lining vertex
    # under the roll sits at least 3.2 mm inside the outer wall along a horizontal ray from its row's centre (where the
    # lining dropped straight down from the top ring outside the drawn-in shaft, it showed through it in jagged patches)
    outer_f = [tuple(f) for f in F if not lining[list(f)].any()]
    wall = BVHTree.FromPolygons([tuple(p) for p in W], outer_f)
    for r_, (_, dz_) in zip(range(T_main, T), ROLL):
        if dz_ >= 0:
            continue
        row = idx[r_]
        c_ = W[row].mean(axis=0)
        for i_ in row:
            v = W[i_] - c_
            v[2] = 0.0
            rl = float(np.linalg.norm(v))
            u_ = v / max(rl, 1e-9)
            hit = wall.ray_cast(Vector((c_[0], c_[1], W[i_, 2])), Vector(u_), 0.2)
            if hit[0] is not None and rl > hit[3] - 0.0032:
                W[i_] = W[i_] - u_ * (rl - (hit[3] - 0.0032))
    Lw = fr.local(W)
    Lw[:, 2] = np.maximum(Lw[:, 2], z_cut(Lw[:, 0]))
    W = fr.world(Lw)
    loc = fr.local(W)
    s_, w_, z_ = loc[:, 0], loc[:, 1], loc[:, 2]
    tt = np.append(np.repeat(np.arange(T), N_RING), 0)
    kk = np.append(np.tile(np.arange(N_RING), T), 0)
    w_topline = np.concatenate([wc, np.full(T - len(wc), wc[-1])])
    w_rel = w_ - w_topline[tt]
    dk = np.abs(((kk - k_top[tt]) + N_RING // 2) % N_RING - N_RING // 2) / N_RING
    s_lace0 = 0.80 * L       # lacing runs close to the toe
    t_lace0 = next(t for t in range(T_main) if rings[t][2][1] > -0.999 or rings[t][1][0] <= s_lace0)
    in_lace = (tt >= t_lace0) & (tt < T_main)

    def rand_g(s, w, z):
        # sticky rand: a band round the whole upper (13 mm), rising up the heel and toward the toe, and a bumper whose
        # edge is a curve in plan across the toe box (about 30 mm deep on the centre line)
        zl = (z_cut(s) + 0.003 + 0.010 + 0.007 * smoothstep(0.05, 0.0, s)
              + 0.010 * smoothstep(0.60 * L, 0.86 * L, s))
        sb = s_tip - 0.030 + 0.032 * (w / 0.034) ** 2
        return np.minimum(z - zl, sb - s)

    arc = np.zeros((T, N_RING + 1))
    G3 = W[:T * N_RING].reshape(T, N_RING, 3)
    for t in range(T):
        seg = np.linalg.norm(np.diff(np.vstack([G3[t], G3[t][:1]]), axis=0), axis=1)
        arc[t, 1:] = np.cumsum(seg)
    tl = np.array([G3[t, k_top[t]] for t in range(T)])
    vline = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(tl, axis=0), axis=1))])
    perim = arc[tt, N_RING]
    ang = 2 * math.pi * arc[tt, kk] / perim
    v_v = vline[tt].copy()
    # on the shaft rings and the collar the v coordinate follows the height, so the weave stays square where the top
    # line rises toward the heel (a constant v per ring sheared it into diagonal bands)
    shaft0 = next(t for t in range(T_main) if rings[t][2][0] < -0.99)
    zt_loc = fr.local(tl)[:, 2]
    upr = tt >= shaft0
    upr[-1] = False
    v_v[upr] += z_[upr] - zt_loc[tt[upr]]
    v_v[-1] = -0.01

    PH = [np.maximum(s_ - (0.068 - 0.55 * np.maximum(z_ - 0.03, 0)), z_ - 0.085),     # 0 heel counter
          (L - 0.072 + 0.025 * (w_rel / 0.04) ** 2) - s_,                                # 1 vamp overlay
          (z_top - 0.024) - z_,                                                          # 2 collar
          np.abs(w_rel) - 0.025,                                                         # 3 eyestay
          np.abs(w_rel) - 0.0105,                                                        # 4 tongue
          rand_g(s_, w_rel, z_),                                                         # 5 rand
          np.abs(w_rel) - 0.0145]                                                        # 6 bellows gusset
    P0 = 9
    A = np.column_stack([s_, w_rel, z_, dk, (tt < T_main).astype(float), np.cos(ang), np.sin(ang), v_v, perim] + PH)
    F0 = F
    parent = np.arange(len(F0))
    locked = np.zeros(len(W), bool)
    n_before = len(W)
    for c in range(P0, P0 + len(PH)):
        W, F, A, par, locked = FT.level_slice(W, F, A, c, locked=locked)
        parent = parent[par]
    print(f'[approach_boots {side}] level-set slice: {n_before} -> {len(W)} verts, {len(F0)} -> {len(F)} faces')

    def maj(b):
        return np.array([2 * int(b[list(f)].sum()) > len(f) for f in F0])
    E_f, G_f, M_f = maj(in_lace & (dk < 0.25)), maj(in_lace & (dk < 0.2)), maj(tt < T_main)
    labels = []
    for fi_, f in enumerate(F):
        p_ = parent[fi_]
        ph = A[list(f), P0:].mean(axis=0)
        lab = 'quarter'
        if ph[0] < 0:
            lab = 'counter'
        if ph[1] < 0:
            lab = 'toecap'
        if ph[2] < 0 or not M_f[p_]:
            lab = 'collar'
        if E_f[p_] and ph[3] < 0:
            lab = 'eyestay'
        if G_f[p_] and ph[6] < 0:
            lab = 'gusset'
        if G_f[p_] and ph[4] < 0:
            lab = 'tongue'
        if M_f[p_] and ph[5] < 0:
            lab = 'rand'
        labels.append(lab)
    shell = W.copy()
    s_, w_rel, z_, dk = A[:, 0], A[:, 1], A[:, 2], A[:, 3]
    nb = FT.neighbours(len(W), F)
    N = FT.vertex_normals(W, F)
    # one forefoot flex crease across the vamp (an approach shoe flexes at the ball)
    topness = np.clip(1 - dk / 0.3, 0, 1) * (A[:, 4] > 0.5)
    crease = np.exp(-((s_ - 0.70 * L - 0.006 * w_rel / 0.03) / 0.0018) ** 2)
    W = W - N * (0.0007 * crease * topness)[:, None]
    N = FT.vertex_normals(W, F)
    flift = np.array([LIFT[l_] for l_ in labels])
    Vo, Fo, src, walls = FT.split_step(W, F, flift, N)
    top_lift = np.full(len(W), -1.0)
    rt = np.zeros(len(W), bool)
    for f, l_, g_ in zip(F, labels, flift):
        top_lift[list(f)] = np.maximum(top_lift[list(f)], g_)
        if l_ in ('rand', 'toecap'):
            rt[list(f)] = True
    W = W + N * top_lift[:, None]
    N = FT.vertex_normals(W, F)
    nz = FT.hash_noise(W, 700.0, 2.0 if side == 'L' else 5.0)
    wear = 0.9 * smoothstep(L - 0.04, L + 0.012, s_) * rt
    wear = np.maximum(wear, 0.5 * smoothstep(0.02, 0.0, s_) * (z_ < 0.05))
    wear = np.maximum(wear, 0.35 * crease * topness)
    wear = FT.smooth_field(wear, nb, 3) * (0.6 + 0.4 * nz)
    loc = fr.local(W)
    s_, w_, z_ = loc[:, 0], loc[:, 1], loc[:, 2]
    lw = loc[:T_main * N_RING]

    def width_at(s):
        m_ = np.abs(lw[:, 0] - s) < 0.002
        return float(np.ptp(lw[m_, 1])) if m_.any() else 0.0

    def height_at(s):
        m_ = np.abs(lw[:, 0] - s) < 0.002
        return float(lw[m_, 2].max()) if m_.any() else 0.0
    s_nose = float(lw[:, 0].max())
    print(f'[approach_boots {side}] toe width 2 cm behind the tip {width_at(s_nose - 0.02) * 1000:.1f} mm, ball '
          f'{width_at(s_ball) * 1000:.1f} mm; toe height 3 cm behind the tip {height_at(s_nose - 0.03) * 1000:.1f} mm')

    u_all = (np.arctan2(A[:, 6], A[:, 5]) % (2 * math.pi)) / (2 * math.pi) * A[:, 8]
    uv = []
    # the nylon quarters sit on the sides under the fan of rings round the throat, where the ring parameterisation
    # stretched the weave into streaks (fix round 1): they take a side projection (along the foot, up), one weave
    # direction per panel
    side_uv = {i for i, l_ in enumerate(labels) if l_ == 'quarter'}
    for fi_, f in enumerate(Fo):
        ss = [src[i] for i in f]
        if fi_ in side_uv:
            uv.extend((float(s_[i]), float(z_[i])) for i in ss)
            continue
        us = np.array([u_all[i] for i in ss])
        if us.max() - us.min() > 0.5 * A[ss[0], 8]:
            us = np.where(us < 0.5 * A[ss[0], 8], us + A[ss[0], 8], us)
        uv.extend((float(u_), float(A[i, 7])) for u_, i in zip(us, ss))
    for wf, hi in walls:
        ss = [src[i] for i in wf]
        if hi in side_uv:
            uv.extend((float(s_[i]), float(z_[i]) + (0.0012 if j >= 2 else 0.0)) for j, i in enumerate(ss))
            continue
        us = np.array([u_all[i] for i in ss])
        if us.max() - us.min() > 0.5 * A[ss[0], 8]:
            us = np.where(us < 0.5 * A[ss[0], 8], us + A[ss[0], 8], us)
        uv.extend((float(us[j]), float(A[ss[j], 7]) + (0.0012 if j >= 2 else 0.0)) for j in range(4))
    Fo = Fo + [wf for wf, _ in walls]
    labels_o = labels + [labels[hi] for _, hi in walls]

    o = len(out['V'])
    out['V'].extend(Vo)
    out['F'].extend([tuple(i + o for i in f) for f in Fo])
    out['labels'].extend(labels_o)
    out['wall'].extend([False] * (len(Fo) - len(walls)) + [True] * len(walls))
    out['uv'].extend(uv)
    out['wear'].extend(wear[src])
    so = len(store['shellV'])
    store['shellV'].extend(shell)
    store['shellF'].extend([tuple(i + so for i in f) for f in F])

    # stitches: every panel boundary except the glued rand; twin rows on the eyestays and the counter
    SV, SF = store['stitchV'], store['stitchF']
    face_c = np.array([W[list(f)].mean(axis=0) for f in F])
    edge_face = {}
    for fi_, f in enumerate(F):
        for i in range(len(f)):
            edge_face.setdefault(tuple(sorted((f[i], f[(i + 1) % len(f)]))), []).append(fi_)
    stitches = 0
    for chain, key, sidel in FT.boundary_chains(F, labels, PRIO):
        if 'rand' in key:
            continue
        pts, nrm = W[chain], N[chain]
        Tg = FT.unit(np.gradient(pts, axis=0))
        X = FT.unit(np.cross(nrm, Tg))
        mid = len(chain) // 2
        e = tuple(sorted((chain[mid - 1], chain[mid])))
        sg = 1.0
        for fj in edge_face.get(e, []):
            if labels[fj] == sidel:
                sg = 1.0 if np.dot(face_c[fj] - (W[e[0]] + W[e[1]]) / 2, X[mid]) > 0 else -1.0
        closed = chain[0] == chain[-1]
        for d in ((0.0013, 0.0036) if sidel in TWIN else (0.0014,)):
            row = FT.smooth_polyline(pts + X * sg * d, 3, closed)
            stitches += FT.stitch_row(SV, SF, row, nrm, lift=0.0002)

    # lacing: seven low-profile eyelets a side from close to the toe up to the collar, 17 mm off the centre
    bvh = BVHTree.FromPolygons([tuple(p) for p in W], [tuple(f) for f in F])
    lace_t = [t for t in range(t_lace0, T_main) if G[t, k_top[t], 2] < z_top - 0.026]
    tl_pts = np.array([W[idx[t, k_top[t]]] for t in lace_t])
    dl = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(tl_pts, axis=0), axis=1))])

    def eyestay_pt(d, sign):
        t = lace_t[int(np.clip(np.searchsorted(dl, d), 0, len(lace_t) - 1))]
        k0 = k_top[t]
        prev = idx[t, k0]
        for step in range(1, N_RING // 3):
            v = idx[t, (k0 + sign * step) % N_RING]
            if abs(w_[v] - w_[idx[t, k0]]) >= 0.017:
                return W[v], N[v]
            prev = v
        return W[prev], N[prev]
    HV, HF = store['hwV'], store['hwF']
    stations = []
    for fr_ in np.linspace(0.03, 1.0, 7):
        pair = []
        for sign in (1, -1):
            p, n = eyestay_pt(fr_ * dl[-1], sign)
            c = p + n * 0.0002
            FT.ring(HV, HF, c, n, 0.0013, 0.0025, 0.0006, 16)     # low-profile: 0.6 mm proud, no rolled rim
            pair.append((c + n * 0.0004, n))
        stations.append(pair)

    def lace_path(a, b, over):
        pts = []
        for u in np.linspace(0, 1, 14):
            q = a * (1 - u) + b * u
            locq, nq, _, _ = bvh.find_nearest(Vector(q))
            bump = 0.0012 + 0.0010 * math.sin(math.pi * u) + (0.0016 * math.exp(-((u - 0.5) / 0.15) ** 2) if over else 0.0)
            pts.append(np.array(locq) + np.array(nq) * bump)
        return FT.smooth_polyline(pts, 2)
    LV, LF = store['laceV'], store['laceF']
    (a0, _), (b0, _) = stations[0]
    FT.tube(LV, LF, lace_path(a0, b0, False), 0.0010, 8)
    for j in range(len(stations) - 1):
        (al, _), (ar, _) = stations[j]
        (bl_, _), (br, _) = stations[j + 1]
        FT.tube(LV, LF, lace_path(al, br, j % 2 == 0), 0.0010, 8)
        FT.tube(LV, LF, lace_path(ar, bl_, j % 2 == 1), 0.0010, 8)
    # lace garage at the tongue top, above the last eyelets: the bow and the ends tuck in (no loose loop)
    gt = [t for t in range(t_lace0, T_main) if z_top - 0.026 <= G[t, k_top[t], 2] <= z_top - 0.002]
    if len(gt) >= 2:
        gp = np.array([W[idx[t, k_top[t]]] for t in gt])
        gn = FT.unit(np.array([N[idx[t, k_top[t]]] for t in gt]).mean(axis=0))
        gc = gp.mean(axis=0)
        g_t = FT.unit(gp[-1] - gp[0])
        g_t = FT.unit(g_t - gn * (g_t @ gn))
        g_u = np.cross(gn, g_t)
        FT.box(store['garV'], store['garF'], gc + gn * 0.0008, g_t, g_u, gn, (0.022, 0.022, 0.0040), 0.3)
        for sb in (-1, 1):
            p0 = gc + gn * 0.0028 + g_u * sb * 0.0085
            stitches += FT.stitch_row(SV, SF, np.linspace(p0 - g_t * 0.009, p0 + g_t * 0.009, 9), np.tile(gn, (9, 1)), lift=0.0)
        (al, _), (ar, _) = stations[-1]
        mouth = gc - g_t * 0.0115 + gn * 0.0012
        FT.tube(LV, LF, lace_path(al, mouth - g_u * 0.002, False), 0.0010, 8)
        FT.tube(LV, LF, lace_path(ar, mouth + g_u * 0.002, True), 0.0010, 8)
    # pull loop at the heel back
    shaft = [t for t in range(T_main) if rings[t][2][0] < -0.99 and G[t, 0, 2] > z_top - 0.03]
    bp = np.array([W[idx[t, 0]] for t in shaft])
    bn = np.array([N[idx[t, 0]] for t in shaft])
    if len(bp) >= 2:
        up = np.array([0.0, 0.0, 1.0])
        latb = FT.unit(np.cross(up, bn[-1]))
        b_ = bn[-1]
        ctr = bp[-1] + up * 0.019 - b_ * 0.0014
        rr = 0.0026
        legs_out = [bp[-1] + b_ * 0.0012 + up * h for h in (0.006, 0.012)]
        arcs = [ctr + b_ * rr * math.cos(a) + up * rr * math.sin(a) for a in np.linspace(0, math.pi, 9)]
        legs_in = [bp[-1] - b_ * 0.0045 + up * h for h in (0.008, -0.004, -0.014)]
        path = list(bp + bn * 0.0012) + legs_out + arcs + legs_in
        nrm_p = list(bn) + [b_] * 2 + [FT.unit(b_ * math.cos(a) + up * math.sin(a)) for a in np.linspace(0, math.pi, 9)] + [-b_] * 3
        FT.strip(store['pullV'], store['pullF'], np.array(path), np.array(nrm_p), np.tile(latb, (len(path), 1)), 0.013, 0.0016)
        b0, b1 = bp[0] + bn[0] * 0.0029, bp[min(len(bp) - 1, 4)] + bn[0] * 0.0029
        cs = [b0 - latb * 0.005, b0 + latb * 0.005, b1 + latb * 0.005, b1 - latb * 0.005]
        for p_, q_ in ((cs[0], cs[1]), (cs[1], cs[2]), (cs[2], cs[3]), (cs[3], cs[0]), (cs[0], cs[2]), (cs[1], cs[3])):
            stitches += FT.stitch_row(SV, SF, np.linspace(p_, q_, 8), np.tile(bn[0], (8, 1)), lift=0.0)
    store['stitches'] += stitches

    # sole: the upper's flattened footprint, flared 3 mm; a recessed arch on the inside
    # the footprint: the upper's plan up to 8 mm over the cut, so the sole also covers the sprung nose
    foot_pts = loc[:T_main * N_RING][loc[:T_main * N_RING, 2] <= z_cut(loc[:T_main * N_RING, 0]) + 0.008][:, :2]
    hull = FT.hull2d(foot_pts)
    outline = FT.offset_closed(FT.resample_closed(FT.resample_closed(hull, 400), 160, start_dir=(-1.0, 0.0)), 0.0018)
    wc2 = outline[:, 1].mean()
    medial = outline[:, 1] < wc2
    pull = 0.004 * np.sin(np.pi * np.clip((outline[:, 0] - 0.06) / 0.09, 0, 1)) * medial
    outline[:, 1] += pull * np.sign(wc2 - outline[:, 1])
    s_end = float(outline[:, 0].max())
    s_e0 = s_end - 0.046                              # the edging zone: the front 4.6 cm, under the toes

    def edge_zone(s):
        return smoothstep(s_e0 - 0.010, s_e0, s)

    # the bottom's toe spring stays under the foot: the toes rest 1-3 mm over the ground, so the bottom only curves up
    # past them (nondecreasing toward the tip, 1 mm under the lowest body or suit point at each s); the top keeps the
    # full spring (the nose still curves up in profile, the edging zone is solid rubber)
    sb_s = np.linspace(s_sp0, s_end + 0.002, 64)
    env = np.full(len(sb_s), np.inf)
    for j, sj in enumerate(sb_s):
        m_ = np.abs(LP[:, 0] - sj) < 0.0025
        if m_.any():
            env[j] = float(LP[m_, 2].min()) - 0.0010 - (0.0033 - LUG)
    env = np.minimum.accumulate(env[::-1])[::-1]
    sb_lim = np.minimum(spring(sb_s), np.maximum(env, 0.0))
    for _ in range(3):
        sb_lim[1:-1] = np.minimum(sb_lim[1:-1], (sb_lim[:-2] + sb_lim[1:-1] + sb_lim[2:]) / 3)

    def spring_b(s):
        s = np.asarray(s, float)
        return np.where(s < s_sp0, 0.0, np.interp(s, sb_s, sb_lim))

    def z_bottom(s):
        # the outsole face; the edging zone is solid rubber down to the lug faces (flush, smooth, flat)
        s = np.asarray(s, float)
        return 0.0033 + spring_b(s) - LUG * edge_zone(s) + 0.35 * np.maximum(0.012 - s, 0)
    arch = (lambda s: 0.0025 * smoothstep(0.066, 0.08, s) * smoothstep(0.13, 0.115, s))
    rows = [(0.0022, 'b', 0.0), (0.0, 'b', 0.0012)]
    rings_s = []
    cen2 = outline.mean(axis=0)
    for inset, ref, dz in rows + [(0.0, 'g', -0.0005), (0.0009, 'g', 0.0), (0.0, 'g', 0.0005), (0.0, 't', -0.0012),
                                  (0.0012, 't', 0.0)]:
        o2 = FT.offset_closed(outline, -inset) if inset else outline.copy()
        zb, zt = z_bottom(o2[:, 0]) + arch(o2[:, 0]), sole_top(o2[:, 0])
        # the midsole groove sits 5 mm over the outsole face: a thin outsole, a thin firm midsole over it
        z = {'b': zb, 't': zt, 'g': np.minimum(zb + 0.0055 + LUG * edge_zone(o2[:, 0]), zt - 0.004)}[ref] + dz
        rings_s.append(np.column_stack([o2, z]))
    sV, sF = [], []
    for k in range(1, 9):
        o2 = cen2 + (rings_s[-1][:, :2] - cen2) * (1 - k / 9)
        rings_s.append(np.column_stack([o2, sole_top(o2[:, 0])]))
    M = len(outline)
    for rg in rings_s:
        sV.extend(fr.world(rg))
    for r in range(len(rings_s) - 1):
        for k in range(M):
            k2 = (k + 1) % M
            sF.append((r * M + k, r * M + k2, (r + 1) * M + k2, (r + 1) * M + k))
    ct = len(sV)
    sV.append(fr.world(np.array([[cen2[0], cen2[1], float(sole_top(cen2[0]))]]))[0])
    last = (len(rings_s) - 1) * M
    for k in range(M):
        k2 = (k + 1) % M
        sF.append((ct, last + k, last + k2))
    sV = np.array(sV)
    ft = sF[-1]
    ntop = np.cross(sV[ft[1]] - sV[ft[0]], sV[ft[2]] - sV[ft[0]])
    if ntop[2] < 0:
        sF = [tuple(f)[::-1] for f in sF]
    # the bottom face: a constrained Delaunay fill of a 2.5 mm grid inside the bottom ring (the old concentric rings
    # crossed the arch, the edging step and the spring at a slant and shaded as fan streaks and creases)
    from mathutils.geometry import delaunay_2d_cdt
    b2 = rings_s[0][:, :2]
    from pattern import _points_in_polygon
    gs, gw = np.meshgrid(np.arange(b2[:, 0].min(), b2[:, 0].max(), 0.0025), np.arange(b2[:, 1].min(), b2[:, 1].max(), 0.0025))
    gp = np.column_stack([gs.ravel(), gw.ravel()])
    gp = gp[_points_in_polygon(gp, FT.offset_closed(b2, -0.0015))]
    cdt_in = [Vector((float(a), float(b))) for a, b in np.vstack([b2, gp])]
    vo, _, fo, orig, _, _ = delaunay_2d_cdt(cdt_in, [(k, (k + 1) % M) for k in range(M)], [list(range(M))], 1, 1e-7, True)
    vmap = []
    for j, ov in enumerate(orig):
        if ov and ov[0] < M:
            vmap.append(int(ov[0]))
        else:
            q2 = np.array(vo[j][:])
            vmap.append(len(sV))
            sV = np.vstack([sV, fr.world(np.array([[q2[0], q2[1], float(z_bottom(q2[0]) + arch(q2[0]))]]))])
    fc = np.array([np.mean([vo[i][:] for i in f], axis=0) for f in fo])
    keep = _points_in_polygon(fc, b2)
    for f, kf in zip(fo, keep):
        if not kf:
            continue
        f = [vmap[i] for i in f]
        nf = np.cross(sV[f[1]] - sV[f[0]], sV[f[2]] - sV[f[0]])
        sF.append(tuple(f) if nf[2] < 0 else tuple(f[::-1]))
    so_ = len(out['soleV'])
    out['soleV'].extend(sV)
    out['soleF'].extend([tuple(i + so_ for i in f) for f in sF])
    sl = fr.local(sV)
    # the edging zone polished, the heel edge scuffed
    out['soleWear'].extend(np.maximum(0.55 * edge_zone(sl[:, 0]) * (sl[:, 2] < 0.012), 0.4 * smoothstep(0.02, 0.0, sl[:, 0])))

    # lugs (original V-bar pattern): a perimeter edge band of short bars along the outline, and inside it V pairs of
    # bars pointing to the toe on the forefoot and to the heel on the heel block (they brake); none under the arch or
    # the edging zone. 3 mm deep, chamfered faces.
    from pattern import _points_in_polygon
    lugV, lugF = out['lugV'], out['lugF']
    nl = 0
    down3 = np.array([0.0, 0.0, -1.0])
    edge_in = FT.offset_closed(outline, -0.0055)
    inner = FT.offset_closed(outline, -0.0115)

    def lug(s, w, t2, ln, wd, depth=0.0032):
        nonlocal nl
        u2 = np.array([t2[1], -t2[0]])
        zb = float(z_bottom(s))
        c3 = fr.world(np.array([[s, w, zb - LUG + depth / 2]]))[0]
        tw = fr.world(np.array([[s + t2[0], w + t2[1], 0.0]]))[0] - fr.world(np.array([[s, w, 0.0]]))[0]
        uw = fr.world(np.array([[s + u2[0], w + u2[1], 0.0]]))[0] - fr.world(np.array([[s, w, 0.0]]))[0]
        FT.box(lugV, lugF, c3, FT.unit(tw), FT.unit(uw), down3, (ln, wd, depth), 0.2)
        nl += 1
    regions = ((0.006, 0.058, -1.0), (0.112, s_e0 - 0.007, 1.0))
    # edge band: bars tangent to the outline every 9 mm
    per = FT.resample_closed(edge_in, 140)
    for j in range(len(per)):
        p2 = per[j]
        if not any(r0 <= p2[0] <= r1 for r0, r1, _ in regions):
            continue
        t2 = FT.unit(per[(j + 1) % len(per)] - per[j - 1])
        if j % 2:
            continue
        lug(p2[0], p2[1], t2, 0.0075, 0.0042)
    # V-bars inside
    for r0, r1, dirn in regions:
        row = 0
        for s in np.arange(r0 + 0.004, r1, 0.0095):
            for w in np.arange(-0.06, 0.06, 0.012) + (0.006 if row % 2 else 0.0):
                a_ = math.radians(32.0) * (1 if w > wc2 else -1) * dirn
                t2 = np.array([math.cos(a_), math.sin(a_)])
                u2 = np.array([t2[1], -t2[0]])
                corners = [np.array([s, w]) + t2 * a * 0.0048 + u2 * b * 0.0022 for a in (-1, 1) for b in (-1, 1)]
                if not _points_in_polygon(np.array(corners), inner).all():
                    continue
                if abs(w - wc2) < 0.003:
                    lug(s, w, np.array([1.0, 0.0]), 0.0045, 0.0045)     # a square lug on the centre line
                else:
                    lug(s, w, t2, 0.0096, 0.0044)
            row += 1
    # heel brake: a transverse step across the front of the heel block, deeper than the lugs (4 mm)
    hs = 0.064
    in_w = edge_in[np.abs(edge_in[:, 0] - hs) < 0.004, 1]
    if len(in_w) >= 2:
        w0, w1 = float(in_w.min()), float(in_w.max())
        n_bar = max(2, int((w1 - w0) / 0.02) + 1)
        for j in range(n_bar):
            wj = w0 + (j + 0.5) / n_bar * (w1 - w0)
            lug(hs, wj, np.array([0.0, 1.0]), (w1 - w0) / n_bar + 0.0004, 0.0085, depth=0.0042)

    def hull_perim(zz):
        pts = W[:T_main * N_RING][np.abs(W[:T_main * N_RING, 2] - zz) < 0.003][:, :2]
        if len(pts) < 3:
            return 0.0
        h = FT.hull2d(pts)
        return float(np.linalg.norm(np.diff(np.vstack([h, h[:1]]), axis=0), axis=1).sum())

    # how close the roll's inner edge sits on the suit (A38: no gap); the cuff depth is measured in build() after the
    # suit's hem is pressed (A68)
    collar_top = float(W[:, 2].max())
    m_ = {}
    if bl is not None:
        lin = shell[:T * N_RING].reshape(T, N_RING, 3)[T_main + ROLL_IN]     # the roll's inner edge
        sb_tree = BVHTree.FromPolygons([tuple(p) for p in bl[0]], [tuple(f) for f in bl[1]])
        d_ = [sb_tree.find_nearest(Vector(p))[3] for p in lin]
        m_ = {'collarLiningToSuitMm': [round(float(np.min(d_)) * 1000, 1), round(float(np.mean(d_)) * 1000, 1),
                                       round(float(np.max(d_)) * 1000, 1)]}
    # the collar's top edge round the leg (10-degree bins about the top ring's centre), for the hem press
    tw_ = W[:T * N_RING].reshape(T, N_RING, 3)[T_main:T_main + ROLL_IN].reshape(-1, 3)
    store['collar'][side] = tw_
    store['measure'][side] = {
        'footLengthM': round(L, 4), 'bootLengthM': round(float(s_end - outline[:, 0].min()), 4),
        'ballWidthM': round(float(np.ptp(outline[np.abs(outline[:, 0] - 0.7 * L) < 0.01, 1])), 4),
        'topLineM': round(z_top, 4), 'collarTopM': round(collar_top, 4), 'collarSideM': None, 'topGirthM': round(hull_perim(z_top - 0.004), 4),
        'rings': T, 'lugs': nl, 'pushedClear': int(moved.sum()), 'sliceVerts': int(len(shell) - n_before),
        'toeWidthRatio': round(width_at(s_nose - 0.02) / max(width_at(s_ball), 1e-6), 3),
        'toeHeight3cmM': round(height_at(s_nose - 0.03), 4), 'toeSpringM': round(float(spring(s_end)), 4),
        'throat': [round(float(s_Q), 4), round(float(z_Q), 4)], **m_,
    }
    print(f'[approach_boots {side}] {store["measure"][side]}')


def _settle(W0, W1, T, mask):
    """Fix round 1: push_out moves single vertices clear of the suit and the skin, which crumpled the collar band and
    striped the quarter under a rake light. The outward part of its move, about each ring's centre, is dilated and
    blurred over the ring grid (so it stays at least as large where it was needed) and applied smoothly instead."""
    n = T * N_RING
    P0 = W0[:n].reshape(T, N_RING, 3)
    Dg = (W1 - W0)[:n].reshape(T, N_RING, 3)
    rd = P0 - P0.mean(axis=1, keepdims=True)
    rd = rd / np.maximum(np.linalg.norm(rd, axis=-1, keepdims=True), 1e-9)
    m = np.maximum(np.einsum('tki,tki->tk', Dg, rd), 0.0)
    mk = mask[:n].reshape(T, N_RING)

    def nbr(a):
        up = np.vstack([a[1:], a[-1:]])
        dn = np.vstack([a[:1], a[:-1]])
        return [np.roll(a, 1, axis=1), np.roll(a, -1, axis=1), up, dn]
    for _ in range(2):
        m = np.maximum.reduce([m] + nbr(m))
    for _ in range(4):
        m = (2 * m + sum(nbr(m))) / 6
    out = W1.copy()
    new = (P0 + rd * m[..., None]).reshape(-1, 3)
    out[:n][mk.ravel()] = new[mk.ravel()]
    return out


def _smooth_leg(V, F, sgn, zmax=0.3, iters=15):
    """The suit's lower leg on one side (faces under zmax), Taubin-smoothed: (V, F) of the sub-mesh."""
    keep = (V[:, 2] < zmax) & (V[:, 0] * sgn > 0.0)
    Fk = [tuple(f) for f in F if keep[list(f)].all()]
    used = np.unique(np.concatenate([np.asarray(f) for f in Fk]))
    remap = -np.ones(len(V), int)
    remap[used] = np.arange(len(used))
    Fs = [tuple(int(remap[i]) for i in f) for f in Fk]
    nb = FT.neighbours(len(used), Fs)
    Vs = V[used].copy()
    for _ in range(iters):
        for lam in (0.5, -0.53):
            Vs = FT.smooth_field(Vs, nb, 1, lam)
    return Vs, Fs


def build(ctx):
    scene, reuse, MAT = ctx['scene'], ctx['reuse'], ctx['MAT']
    out = {k: [] for k in ('V', 'F', 'labels', 'wall', 'uv', 'wear', 'soleV', 'soleF', 'soleWear', 'lugV', 'lugF')}
    store = {k: [] for k in ('shellV', 'shellF', 'stitchV', 'stitchF', 'hwV', 'hwF', 'laceV', 'laceF', 'garV', 'garF',
                             'pullV', 'pullF')}
    store.update({'stitches': 0, 'measure': {}, 'collar': {}})
    for side in ('L', 'R'):
        build_foot(ctx, side, out, store)
    op = ctx['op_id']
    pre = f'{op}-approach_boots'
    rubber = reuse(MAT.rubber, 'sole rubber')
    nylon = reuse(MAT.nylon, 'boot nylon')
    mats = [nylon, reuse(MAT.suede, 'suede'), rubber]
    upper = FT.add_mesh(scene, f'{pre}-hero', out['V'], out['F'], mats, mat_index=[SLOT[l] for l in out['labels']],
                        uv=out['uv'], attrs={'wear': out['wear']})
    me_u = upper.data
    ekey = {e.key: e.index for e in me_u.edges}
    for p_, is_wall in zip(me_u.polygons, out['wall']):
        if is_wall:
            p_.use_smooth = False
            for ek in p_.edge_keys:
                me_u.edges[ekey[ek]].use_edge_sharp = True
    sol = upper.modifiers.new('thickness', 'SOLIDIFY')
    sol.thickness = 0.0014
    sol.offset = -1.0
    sol.use_even_offset = False
    sol.use_rim = True
    sole = FT.add_mesh(scene, f'{pre}-sole', out['soleV'], out['soleF'], rubber, attrs={'wear': out['soleWear']})
    lugs = FT.add_mesh(scene, f'{pre}-lugs', out['lugV'], out['lugF'], rubber, smooth=False,
                       attrs={'wear': np.zeros(len(out['lugV']))})
    stitches = FT.add_mesh(scene, f'{pre}-stitches', store['stitchV'], store['stitchF'], reuse(MAT.thread, 'thread'))
    stitches.visible_shadow = False
    hw = FT.add_mesh(scene, f'{pre}-eyelets', store['hwV'], store['hwF'], reuse(MAT.painted_metal, 'hardware metal'))
    laces = FT.add_mesh(scene, f'{pre}-laces', store['laceV'], store['laceF'], reuse(MAT.webbing, 'lace'))
    gar = FT.add_mesh(scene, f'{pre}-garage', store['garV'], store['garF'], nylon,
                      uv=[(0.0, 0.0)] * sum(len(f) for f in store['garF']), attrs={'wear': np.zeros(len(store['garV']))})
    _planar_uv(gar)
    pull = FT.add_mesh(scene, f'{pre}-pull', store['pullV'], store['pullF'], reuse(MAT.webbing, 'binding'))
    press_suit_hem(ctx, store, [upper, sole, lugs, pull, gar, laces])
    return {
        'shell': (np.array(store['shellV']), store['shellF']),
        'objects': [upper, sole, lugs, stitches, hw, laces, gar, pull],
        'measurements': store['measure'],
        'report': {'stitches': store['stitches'], 'panelFaces': {k: out['labels'].count(k) for k in SLOT}},
    }


def _boundary(me, V):
    from collections import Counter
    cnt = Counter()
    for p in me.polygons:
        vs = list(p.vertices)
        for i in range(len(vs)):
            cnt[tuple(sorted((vs[i], vs[(i + 1) % len(vs)])))] += 1
    return np.array(sorted({i for e, c in cnt.items() if c == 1 for i in e}), int)


def press_suit_hem(ctx, store, boot):
    """A68: the suit settled its ankle hem at 10-11 cm in front but up to 13-14 cm at the back (A38 drafted 9 cm), over
    the boot's top edge at the back. Its render objects are pressed into the boot, as the armour presses it (A53):
    1. Height: round each leg, the suit's hem goes to CUFF under the collar's top edge. Where the hem is well under the
       collar the band from the hem to 6 mm under the top edge is remapped down (hidden). Where the hem is at or over
       the top edge, a 2 mm band over the hem is stretched down inside the boot and the 10 cm of suit over it slides
       down to meet it, stretched by at most a few per cent (measured: suitBandStretch).
    2. Radius: every suit vertex under the collar's top edge is drawn in toward the leg's axis to SUIT_IN inside the
       boot's innermost (lining) surface (the pressed band kept the wider radius of the leg higher up and poked out of
       the narrower shaft); the pull is smoothed over the mesh and fades out 12 mm over the top edge.
    3. Probe: suit vertices under the top edge less 4 mm outside the boot's inner surface, or with a clear line of
       sight out through the wall (a horizontal and a downward fan within 60 degrees of outward) past every boot object
       and the leg; both must be 0. Measures the cuff depth."""
    import bpy
    import bmesh
    op = ctx['op_id']
    suit = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith(f'{op}-suit') and not o.hide_render]
    hero = bpy.data.objects.get(f'{op}-suit-hero')
    if hero is None or not suit:
        return
    dg = bpy.context.evaluated_depsgraph_get()
    inner = BVHTree.FromObject(boot[0], dg)
    blockers = [BVHTree.FromObject(o, dg) for o in boot] + [ctx['skin']]     # the leg blocks a view across the opening

    def world(o):
        me = o.data
        co = np.zeros(3 * len(me.vertices))
        me.vertices.foreach_get('co', co)
        Mw = np.array(o.matrix_world)
        return co.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3], Mw

    def put(o, P, Mw):
        o.data.vertices.foreach_set('co', ((P - Mw[:3, 3]) @ np.linalg.inv(Mw[:3, :3]).T).ravel())
        o.data.update()

    HV = world(hero)[0]
    hb = _boundary(hero.data, HV)
    for side in ('L', 'R'):
        sg = float(np.sign(ctx['J'][f'an{side}'][0]))
        loop = hb[(HV[hb, 2] < 0.2) & (HV[hb, 0] * sg > 0.03)]
        if len(loop) < 8:
            continue
        cen = HV[loop, :2].mean(axis=0)

        def ang(P):
            return np.degrees(np.arctan2(P[:, 1] - cen[1], P[:, 0] - cen[0]))
        ha, hz = ang(HV[loop]), HV[loop, 2]
        o_ = np.argsort(ha)
        ha, hz = ha[o_], hz[o_]
        CW = store['collar'][side]
        ca = ang(CW)
        bins = np.arange(-180, 181, 10)
        cz = np.array([CW[(ca >= b0) & (ca < b0 + 10), 2].max() if ((ca >= b0) & (ca < b0 + 10)).any() else np.nan
                       for b0 in bins[:-1]])
        bc = bins[:-1] + 5.0
        ok = ~np.isnan(cz)
        bc, cz = bc[ok], cz[ok]

        def hem_at(a):
            return np.interp(a, ha, hz, period=360)

        def top_at(a):
            return np.interp(a, bc, cz, period=360)
        before = float(np.min(top_at(ha) - hz))
        moved, stretch = 0, 1.0
        # 1. height
        for o in suit:
            P, Mw = world(o)
            sel = np.where((P[:, 2] < 0.2) & (P[:, 0] * sg > 0.03))[0]
            if not len(sel):
                continue
            a_ = ang(P[sel])
            h, c = hem_at(a_), top_at(a_)
            t = np.minimum(h, c - CUFF)
            zs = np.maximum(h + 0.002, c - 0.006)       # the top of the hidden band (source)
            zd = np.minimum(zs, c - 0.0005)             # ... and where it lands
            zf = zs + 0.10                              # the suit over zf does not move
            z = P[sel, 2]
            zn = z.copy()
            hi = (z >= zs) & (z < zf)
            zn[hi] = zf[hi] - (zf[hi] - z[hi]) * (zf[hi] - zd[hi]) / (zf[hi] - zs[hi])
            lo = z < zs
            k = (zd - t) / np.maximum(zs - h, 1e-6)
            zn[lo] = np.maximum(zd[lo] - (zs[lo] - z[lo]) * k[lo], t[lo] - 0.004)
            ch = np.abs(zn - z) > 1e-7
            if not ch.any():
                continue
            if hi.any():
                stretch = max(stretch, float(((zf - zd) / (zf - zs))[hi].max()))
            P[sel, 2] = zn
            moved += int(ch.sum())
            put(o, P, Mw)
            # the press stretches the hidden band; split any edge it made longer than 2.4 cm (render-mesh edge rule)
            bm = bmesh.new()
            bm.from_mesh(o.data)
            Mi = o.matrix_world
            for _ in range(4):
                long_ = [e for e in bm.edges if (Mi @ e.verts[0].co).z < 0.2 and e.calc_length() > 0.024]
                if not long_:
                    break
                bmesh.ops.subdivide_edges(bm, edges=long_, cuts=1, use_grid_fill=True)
            bm.to_mesh(o.data)
            bm.free()
            o.data.update()
        # the leg's axis by height: the pressed suit's centroid in 5 mm slabs
        Hs = world(hero)[0]
        Hs = Hs[(Hs[:, 2] < 0.25) & (Hs[:, 0] * sg > 0.03)]
        zb_ = np.arange(0.04, 0.25, 0.005)
        cx = np.array([Hs[np.abs(Hs[:, 2] - z0) < 0.004, :2].mean(axis=0) if (np.abs(Hs[:, 2] - z0) < 0.004).any()
                       else (np.nan, np.nan) for z0 in zb_])
        okc = ~np.isnan(cx[:, 0])
        zb_, cx = zb_[okc], cx[okc]

        def axis(z):
            return np.column_stack([np.interp(z, zb_, cx[:, 0]), np.interp(z, zb_, cx[:, 1])])

        def r_inner(P):
            """the boot's innermost surface along a horizontal ray from the leg's axis through each point: (r_in or
            nan, r of the point, the unit direction)"""
            C = axis(P[:, 2])
            d = P[:, :2] - C
            r = np.linalg.norm(d, axis=1)
            d = d / np.maximum(r, 1e-9)[:, None]
            ri = np.full(len(P), np.nan)
            for i in range(len(P)):
                hit = inner.ray_cast(Vector((C[i, 0], C[i, 1], P[i, 2])), Vector((d[i, 0], d[i, 1], 0.0)), 0.25)
                if hit[0] is not None:
                    ri[i] = hit[3]
            return ri, r, d
        # 2. radius
        pulled = 0
        for o in suit:
            P, Mw = world(o)
            sel = np.where((P[:, 2] < 0.2) & (P[:, 0] * sg > 0.03) & (P[:, 2] > 0.04))[0]
            if not len(sel):
                continue
            c = top_at(ang(P[sel]))
            sel_b = sel[P[sel, 2] < c]
            if not len(sel_b):
                continue
            ri, r, d = r_inner(P[sel_b])
            req = np.minimum(np.nan_to_num(ri - SUIT_IN - r, nan=0.0), 0.0)
            if not (req < 0).any():
                continue
            Dv = np.zeros((len(P), 3))
            Dv[sel_b, :2] = req[:, None] * d
            # smooth the pull over the mesh (a fade over the top edge), keep the required pull where it is needed
            E = np.zeros(2 * len(o.data.edges), int)
            o.data.edges.foreach_get('vertices', E)
            E = E.reshape(-1, 2)
            free = np.zeros(len(P), bool)
            free[sel[P[sel, 2] < c + 0.012]] = True
            deg = np.zeros(len(P))
            np.add.at(deg, E[:, 0], 1)
            np.add.at(deg, E[:, 1], 1)
            for _ in range(6):
                acc = np.zeros_like(Dv)
                np.add.at(acc, E[:, 0], Dv[E[:, 1]])
                np.add.at(acc, E[:, 1], Dv[E[:, 0]])
                Dv = 0.5 * Dv + 0.5 * acc / np.maximum(deg, 1)[:, None]
                Dv[~free] = 0.0
                # the required pull at least (along its direction)
                proj = np.einsum('ij,ij->i', Dv[sel_b, :2], d)
                Dv[sel_b, :2] += (np.minimum(proj, req) - proj)[:, None] * d
            P = P + Dv
            pulled += int((np.linalg.norm(Dv, axis=1) > 1e-5).sum())
            put(o, P, Mw)
        # 3. probe
        tested = outside = air = 0
        samp = []
        dirs = [Vector((math.cos(math.radians(az)), math.sin(math.radians(az)), el)).normalized()
                for az in range(0, 360, 30) for el in (0.0, -0.35)]
        for o in suit:
            P, _ = world(o)
            sel = np.where((P[:, 0] * sg > 0.03) & (P[:, 2] > 0.04) & (P[:, 2] < 0.2))[0]
            if not len(sel):
                continue
            sel = sel[P[sel, 2] < top_at(ang(P[sel])) - 0.004]
            if not len(sel):
                continue
            ri, r, _ = r_inner(P[sel])
            outside += int((np.isnan(ri) | (r > ri)).sum())
            tested += len(sel)
            Cp = axis(P[sel, 2])
            for j, i in enumerate(sel):
                p = Vector(P[i])
                rd = P[i, :2] - Cp[j]
                rd = rd / max(float(np.linalg.norm(rd)), 1e-9)
                for dv in dirs:
                    if dv.x * rd[0] + dv.y * rd[1] < 0.5 * math.hypot(dv.x, dv.y):
                        continue
                    if all(b.ray_cast(p + dv * 1e-4, dv, 1.0)[0] is None for b in blockers):
                        air += 1
                        if len(samp) < 6:
                            samp.append((o.name[-6:], int(ang(P[i:i + 1])[0]), round(float(P[i, 2]), 4),
                                         round(float(top_at(ang(P[i:i + 1]))[0] - P[i, 2]) * 1000, 1), tuple(round(x, 2) for x in dv)))
                        break
        HV2 = world(hero)[0]
        after = top_at(ha) - HV2[loop[o_], 2]
        ms = store['measure'][side]
        ms['suitHemZM'] = [round(float(hz.min()), 4), round(float(hz.max()), 4)]
        ms['suitHemPressedZM'] = [round(float(HV2[loop, 2].min()), 4), round(float(HV2[loop, 2].max()), 4)]
        ms['collarTopEdgeZM'] = [round(float(cz.min()), 4), round(float(cz.max()), 4)]
        ms['collarSideM'] = round(float(top_at(np.array([0.0 if sg > 0 else 180.0]))[0]), 4)
        ms['cuffInsideCollarMm'] = {'before': round(before * 1000, 1), 'min': round(float(after.min()) * 1000, 1)}
        ms['suitVertsPressed'] = moved
        ms['suitVertsPulledIn'] = pulled
        ms['suitBandStretch'] = round(stretch, 3)
        ms['suitPokeThrough'] = {'tested': tested, 'outsideBoot': outside, 'seesOpenAir': air}
        print(f'[approach_boots {side}] hem press: {ms["cuffInsideCollarMm"]}, hem {ms["suitHemZM"]} -> '
              f'{ms["suitHemPressedZM"]}, collar top edge {ms["collarTopEdgeZM"]}, {moved} suit verts pressed, '
              f'{pulled} pulled in, visible band stretch {stretch:.3f}, poke-through {ms["suitPokeThrough"]} {samp}')
