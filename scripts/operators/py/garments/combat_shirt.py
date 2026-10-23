"""Wren's combat shirt (SPEC 3.1, 5.1) drafted as 2D pattern panels from the body's measurements.

Construction (SPEC 3.1):
- torso front and back in a fine elastic knit, side seams flatlocked;
- raglan sleeves in ripstop: the seam runs from the collar to the armpit, so the shoulder has no seam under a strap;
- a short stand collar in ripstop with a quarter zip at the centre front, ending in a fabric zip garage;
- elbow pad pockets (double layer, foam pad inside), upper-arm pockets with bound flaps (left: marker light, right:
  spare goggle battery), cuff tabs with hook-and-loop to close over the glove.

Pattern space: metres, the fabric seen from outside, x right, y up.
- Front: +x is the wearer's left. Back: +x is the wearer's right.
- Left sleeve: +x towards the back. Right sleeve: +x towards the front. y = 0 at the cuff.
- Collar: x = 0 at the centre front, running round the wearer's left, the back and the right.

Guard bake (docs/guard-models PLAN G2): run as the main script by guard-bake.mjs, it hands the job to guard_garment.py,
which calls configure() on a copy of this module; the guard field shirt is guard_draft() (bottom of this file). Wren's
draft is untouched while configure() has not been called.
"""
if __name__ == '__main__':   # guard bake job: py/ and py/garments/ on the path before the imports below
    import os as _os
    import sys as _sys
    _here = _os.path.dirname(_os.path.abspath(__file__))
    _sys.path[:0] = [_here, _os.path.dirname(_here)]
import math

import numpy as np

from pattern import Panel, Pattern, bezier, polyline_length

KIT = 'combatShirt'   # the kit item (src/operators/kit.ts) this garment builds
KNIT, RIPSTOP = 'knit', 'ripstop'
KNIT_EASE = -0.03     # close-fit stretch knit (art direction 6): cut slightly under the body, it stretches on
KNIT_EASE_V = -0.03   # ... in length too: any vertical slack in a knit buckles into horizontal ripples
SLEEVE_EASE = 1.08    # ripstop sleeves: close but free to move (the gusset and darts give the reach)
CUFF_ROOM = 0.035     # m added to the cuff girth: room for the glove cuff under the tab
# Layers worn under the shirt (build_garment.py adds a layer allowance to each girth when it is sewn over them): the
# base top everywhere, and the leggings' waistband too round the hem.
UNDER_LAYERS = {'default': 1, 'circ_hem': 2}

# Cloth simulation (build_garment.py): the flat pattern is the rest shape. Blender cloth stiffness is per spring and
# mass per vertex; lighter, near-real vertex masses make the solver unstable (the sewing and collision impulses throw
# the cloth off the body), so the mass stays at 0.1 with full gravity. Per material: tension (compression matches
# it) / shear / bending. Sewn layers (pockets, the elbow pad, cuff tabs) are two or three plies stitched together:
# stiffer than the sleeve round them, so they hold their shape instead of copying its wrinkles.
SIM = {
    'mass': 0.1,
    'gravity': 1.0,
    'materials': {
        # Bending sets the fold scale: lower values crumple at the mesh scale (1-2 cm ripples, the step 3 'banding').
        KNIT: {'tension': 10.0, 'shear': 4.0, 'bending': 0.3},
        RIPSTOP: {'tension': 45.0, 'shear': 12.0, 'bending': 3.0},
    },
    # The collar is ripstop round a fusible interfacing: it stands round the neck.
    'panels': {'collar': {'tension': 60.0, 'shear': 20.0, 'bending': 12.0}},
    'patches': {'pad': {'bending': 12.0, 'shear': 20.0}, 'pocket': {'bending': 8.0, 'shear': 16.0},
                'flap': {'bending': 8.0}, 'tab': {'bending': 8.0}},
    'sewing_force': 12.0,
    'quality': 16, 'collision_quality': 4,
    'collision': {'body': 0.0015, 'cloth': 0.0015},   # m: collider thickness and cloth distance (fabric on skin)
    'air_damping': 1.0, 'spring_damping': 5.0,
    'friction': 2.0,
    # Tucked in (A11): below the trousers' band top (about 1 cm under the waist joint) the hem is drawn onto the base
    # layer, eased in over 5 cm above (build_garment 'tuck'; step 05 fix round 2: the free hem stood 3 cm proud of the
    # belly and showed through the trousers' front as a lip).
    'tuck': {'from_waist': -0.015, 'ramp': 0.05, 'relax': 8},
    # The front over the bust: the simulation leaves a 1 cm horizontal step across the upper chest where the cloth
    # drapes from the bust (a dark bar in raking light, step 05 fix round 2), and the tuck crumples the back above the
    # band; faired on the body panels only, between the seams (20 Taubin passes damp features up to about 6 cm; the
    # seam lines are held - fairing them on one side opened the raglan seams to 15 mm; the sleeves keep their
    # wrinkles).
    'fair': {'iters': 20, 'panels': ['front', 'back'], 'edges': False},   # seam lines held: the sleeves are not faired
}


def catmull(points, n=12):
    """Smooth polyline through the points (Catmull-Rom, endpoints kept)."""
    p = np.asarray(points, dtype=np.float64)
    ext = np.concatenate([2 * p[:1] - p[1:2], p, 2 * p[-1:] - p[-2:-1]])
    out = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(p[-1])
    return np.array(out)


def line(a, b, n=8):
    return np.linspace(np.asarray(a, float), np.asarray(b, float), n)


def arc(pl):
    pl = np.asarray(pl, dtype=np.float64)
    return np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(pl, axis=0), axis=1))])


def point_at(pl, t):
    pl = np.asarray(pl, dtype=np.float64)
    c = arc(pl)
    return np.array([np.interp(t, c, pl[:, 0]), np.interp(t, c, pl[:, 1])])


def cut(pl, t0, t1, n=None):
    """The part of a polyline between arc lengths t0 and t1 (resampled)."""
    pl = np.asarray(pl, dtype=np.float64)
    c = arc(pl)
    k = n or max(3, int((t1 - t0) / 0.004) + 2)
    ts = np.linspace(t0, t1, k)
    return np.stack([np.interp(ts, c, pl[:, 0]), np.interp(ts, c, pl[:, 1])], axis=1)


def reverse_segments(segs, end_name):
    """[(corner, polyline to the next corner), ...] ending at end_name -> the same run walked backwards."""
    names = [n for n, _ in segs] + [end_name]
    return [(names[i + 1], segs[i][1][::-1].copy()) for i in reversed(range(len(segs)))]


def draft(m, h=0.011, ease=None):
    """m: body measurements (see build_garment.measure). Returns the pattern and the detail specs.
    ease: overrides of the cut constants (knit_ease, knit_ease_v, sleeve_ease, cuff_room), for garments drafted on
    this block (the base layer top)."""
    if GUARD is not None and ease is None:
        return guard_draft(m, h)
    ec = {'knit_ease': KNIT_EASE, 'knit_ease_v': KNIT_EASE_V, 'sleeve_ease': SLEEVE_EASE, 'cuff_room': CUFF_ROOM,
          **(ease or {})}
    e = 1.0 + ec['knit_ease']
    hw = {k: m[f'circ_{k}'] / 4.0 * e for k in ('hem', 'waist', 'bust', 'ua')}
    # A gentle waist: combat shirts hang nearly straight under a carrier; a fitted taper catches on the hips.
    hw['waist'] = max(hw['waist'], 0.35 * hw['waist'] + 0.65 * min(hw['hem'], hw['bust']))
    v = 1.0 + ec['knit_ease_v']
    y_w, y_b, y_ua = (m['z_waist'] - m['z_hem']) * v, (m['z_bust'] - m['z_hem']) * v, (m['z_ua'] - m['z_hem']) * v
    nw = m['neck_half_w'] + 0.012
    # The front is cut a little longer than the back for the chest; 2 cm (3 cm left a 3 % vertical excess under the
    # bust that folded into a crease once the pattern became the true rest shape).
    y_nk = {'front': (m['z_neck'] - m['z_hem']) * v + 0.02, 'back': (m['z_neck'] - m['z_hem']) * v + 0.015}
    drop = {'front': 0.045, 'back': 0.018}

    LG = 0.055 * m['height'] / 1.68  # underarm gusset edge length

    def torso(name, left_is_plus):
        """Front or back. Corner names say the wearer's side (L/R), whichever x sign that is."""
        sp, sm = ('L', 'R') if left_is_plus else ('R', 'L')
        part = 'front' if name == 'front' else 'back'
        yn = y_nk[part]
        side_p = catmull([(hw['hem'], 0), (hw['waist'], y_w), (hw['bust'], y_b), (hw['ua'], y_ua)])
        ls = arc(side_p)[-1]
        side_lo, side_hi = cut(side_p, 0, ls - LG), cut(side_p, ls - LG, ls, 8)
        mirror = lambda a: a * np.array([-1.0, 1.0])  # noqa: E731
        rag_p = bezier((hw['ua'], y_ua), ((hw['ua'] + nw) / 2 - 0.008, (y_ua + yn) / 2 + 0.004), (nw, yn))
        rag_m = mirror(rag_p[::-1])
        neck_p = bezier((nw, yn), (nw * 0.95, yn - drop[part]), (0, yn - drop[part]))
        neck_m = mirror(neck_p[::-1])
        cn = 'cfn' if part == 'front' else 'cbn'
        edges = [
            (f'hem{sm}', line((-hw['hem'], 0), (hw['hem'], 0))),
            (f'hem{sp}', side_lo),
            (f'gt{sp}', side_hi),            # the top of the side seam is sewn to the underarm gusset
            (f'ua{sp}', rag_p),
            (f'nk{sp}', neck_p),
            (cn, neck_m),                    # centre -> minus-side neck point
            (f'nk{sm}', rag_m),              # minus-side neck point -> underarm
            (f'ua{sm}', mirror(side_hi)[::-1]),
            (f'gt{sm}', mirror(side_lo)[::-1]),
        ]
        return Panel(name, KNIT, edges)

    front = torso('front', True)
    back = torso('back', False)
    rag_len = {'front': polyline_length(front.run('uaL', 'nkL')[0]), 'back': polyline_length(back.run('uaL', 'nkL')[0])}

    # Sleeve widths and lengths.
    se = ec['sleeve_ease']
    wc = m['circ_wrist'] * se + ec['cuff_room']
    we = m['circ_elbow'] * se
    wf = m['circ_forearm'] * se           # widest forearm girth, below the elbow
    wb = m['circ_bicep'] * se
    lu, yel = m['sleeve_under'], m['sleeve_elbow']
    nsw = 0.05

    WD, DEPTH = 0.014, 0.042   # elbow darts: width at the seam, length into the sleeve
    CUFF_DROP = 2 * WD         # the back of the sleeve is cut longer by the darts' intake (pre-bent elbow)

    def sleeve(name, front_is_plus):
        """Raglan sleeve with an articulated elbow (two darts on the back edge, which is cut longer, so the sewn
        sleeve is pre-bent) and an underarm gusset at the top of the underarm seam."""
        sf, sb = (1, -1) if front_is_plus else (-1, 1)
        top = {}
        for part in ('front', 'back'):
            dx = (wb - nsw) / 2
            top[part] = lu + math.sqrt(max(rag_len[part] ** 2 - dx ** 2, 1e-4))
        y_fa = yel - m['forearm_drop']   # the forearm's widest girth, below the elbow
        f_pl = catmull([(sf * wc / 2, 0), (sf * wf / 2, y_fa), (sf * max(we, wf) / 2, yel), (sf * wb / 2, lu)])
        b_pl = catmull([(sb * wc / 2, -CUFF_DROP), (sb * wf / 2, y_fa), (sb * max(we, wf) / 2, yel), (sb * wb / 2, lu)])
        lf, lb = arc(f_pl)[-1], arc(b_pl)[-1]
        s_el = arc(b_pl)[int(np.argmin(np.abs(b_pl[:, 1] - yel)))]
        s1, s2 = s_el - 0.022, s_el + 0.022

        def apex(t):
            return point_at(b_pl, t) - np.array([sb * DEPTH, 0.0])

        back_up = [
            ('cuffB', cut(b_pl, 0, s1 - WD / 2)),
            ('d1a', line(point_at(b_pl, s1 - WD / 2), apex(s1), 8)),
            ('ap1', line(apex(s1), point_at(b_pl, s1 + WD / 2), 8)),
            ('d1b', cut(b_pl, s1 + WD / 2, s2 - WD / 2)),
            ('d2a', line(point_at(b_pl, s2 - WD / 2), apex(s2), 8)),
            ('ap2', line(apex(s2), point_at(b_pl, s2 + WD / 2), 8)),
            ('d2b', cut(b_pl, s2 + WD / 2, lb - LG)),
            ('gsB', cut(b_pl, lb - LG, lb, 8)),
        ]
        # Front corners at the lengths that pair with the back's seam segments (darts excluded).
        seg1, seg2 = s1 - WD / 2, (s2 - WD / 2) - (s1 + WD / 2)
        ratio = (lf - LG) / ((lb - LG) - 2 * WD)
        t1, t2 = seg1 * ratio, (seg1 + seg2) * ratio
        front_up = [('cuffF', cut(f_pl, 0, t1)), ('f1', cut(f_pl, t1, t2)), ('f2', cut(f_pl, t2, lf - LG)),
                    ('gsF', cut(f_pl, lf - LG, lf, 8))]
        rag_f = line((sf * wb / 2, lu), (sf * nsw / 2, top['front']), 16)
        rag_b = line((sb * wb / 2, lu), (sb * nsw / 2, top['back']), 16)
        cap = line((sf * nsw / 2, top['front']), (sb * nsw / 2, top['back']), 4)
        # Counter-clockwise from outside.
        if front_is_plus:   # right sleeve: plus = front
            edges = ([('cuffB', line((-wc / 2, -CUFF_DROP), (wc / 2, 0)))] + front_up
                     + [('uaF', rag_f), ('nkF', cap), ('nkB', rag_b[::-1])] + reverse_segments(back_up, 'uaB'))
        else:               # left sleeve: plus = back
            edges = ([('cuffF', line((-wc / 2, 0), (wc / 2, -CUFF_DROP)))] + back_up
                     + [('uaB', rag_b), ('nkB', cap[::-1]), ('nkF', rag_f[::-1])] + reverse_segments(front_up, 'uaF'))
        return Panel(name, RIPSTOP, edges), top

    def gusset(name, left):
        """Diamond underarm gusset in stretch knit: lets the arm reach overhead without lifting the hem."""
        d = LG / math.sqrt(2)
        T, B = (0, d), (0, -d)
        if left:
            F, K = (-d, 0), (d, 0)
            edges = [('gT', line(T, F)), ('gF', line(F, B)), ('gB', line(B, K)), ('gK', line(K, T))]
        else:
            F, K = (d, 0), (-d, 0)
            edges = [('gF', line(F, T)), ('gT', line(T, K)), ('gK', line(K, B)), ('gB', line(B, F))]
        return Panel(name, KNIT, edges)

    sl, top_l = sleeve('sleeveL', False)
    sr, top_r = sleeve('sleeveR', True)
    gl, gr = gusset('gussetL', True), gusset('gussetR', False)

    # Collar: bottom edge corners at the cumulative neckline lengths (CF -> left -> back -> right -> CF).
    segs = [polyline_length(front.run('cfn', 'nkL')[0]), polyline_length(sl.run('nkF', 'nkB')[0]),
            polyline_length(back.run('nkL', 'nkR')[0]), polyline_length(sr.run('nkB', 'nkF')[0]),
            polyline_length(front.run('nkR', 'cfn')[0])]
    cx = np.concatenate([[0.0], np.cumsum(segs)])
    lc, hc = cx[-1], m['collar_h']
    inset = lc * 0.035  # the top edge is a little shorter so the mock neck hugs the neck
    names = ['b0', 'c1', 'c2', 'c3', 'c4']
    edges = [(names[i], line((cx[i], 0), (cx[i + 1], 0), 6)) for i in range(5)]
    edges += [('b5', line((lc, 0), (lc - inset, hc), 6)), ('t5', line((lc - inset, hc), (inset, hc), 30)),
              ('t0', line((inset, hc), (0, 0), 6))]
    collar = Panel('collar', RIPSTOP, edges)

    seams = [
        ('sideL', ('front', 'hemL', 'gtL'), ('back', 'hemL', 'gtL'), 'flatlock'),
        ('sideR', ('front', 'hemR', 'gtR'), ('back', 'hemR', 'gtR'), 'flatlock'),
        ('raglanFL', ('sleeveL', 'uaF', 'nkF'), ('front', 'uaL', 'nkL'), 'topstitch2'),
        ('raglanFR', ('sleeveR', 'uaF', 'nkF'), ('front', 'uaR', 'nkR'), 'topstitch2'),
        ('raglanBL', ('sleeveL', 'uaB', 'nkB'), ('back', 'uaL', 'nkL'), 'topstitch2'),
        ('raglanBR', ('sleeveR', 'uaB', 'nkB'), ('back', 'uaR', 'nkR'), 'topstitch2'),
        ('under1L', ('sleeveL', 'cuffF', 'f1'), ('sleeveL', 'cuffB', 'd1a'), 'topstitch1'),
        ('under2L', ('sleeveL', 'f1', 'f2'), ('sleeveL', 'd1b', 'd2a'), 'topstitch1'),
        ('under3L', ('sleeveL', 'f2', 'gsF'), ('sleeveL', 'd2b', 'gsB'), 'topstitch1'),
        ('dart1L', ('sleeveL', 'd1a', 'ap1'), ('sleeveL', 'd1b', 'ap1'), 'dart'),
        ('dart2L', ('sleeveL', 'd2a', 'ap2'), ('sleeveL', 'd2b', 'ap2'), 'dart'),
        ('gusSFL', ('sleeveL', 'gsF', 'uaF'), ('gussetL', 'gT', 'gF'), 'topstitch1'),
        ('gusSBL', ('sleeveL', 'gsB', 'uaB'), ('gussetL', 'gT', 'gK'), 'topstitch1'),
        ('gusTFL', ('front', 'gtL', 'uaL'), ('gussetL', 'gB', 'gF'), 'flatlock'),
        ('gusTBL', ('back', 'gtL', 'uaL'), ('gussetL', 'gB', 'gK'), 'flatlock'),
        ('under1R', ('sleeveR', 'cuffF', 'f1'), ('sleeveR', 'cuffB', 'd1a'), 'topstitch1'),
        ('under2R', ('sleeveR', 'f1', 'f2'), ('sleeveR', 'd1b', 'd2a'), 'topstitch1'),
        ('under3R', ('sleeveR', 'f2', 'gsF'), ('sleeveR', 'd2b', 'gsB'), 'topstitch1'),
        ('dart1R', ('sleeveR', 'd1a', 'ap1'), ('sleeveR', 'd1b', 'ap1'), 'dart'),
        ('dart2R', ('sleeveR', 'd2a', 'ap2'), ('sleeveR', 'd2b', 'ap2'), 'dart'),
        ('gusSFR', ('sleeveR', 'gsF', 'uaF'), ('gussetR', 'gT', 'gF'), 'topstitch1'),
        ('gusSBR', ('sleeveR', 'gsB', 'uaB'), ('gussetR', 'gT', 'gK'), 'topstitch1'),
        ('gusTFR', ('front', 'gtR', 'uaR'), ('gussetR', 'gB', 'gF'), 'flatlock'),
        ('gusTBR', ('back', 'gtR', 'uaR'), ('gussetR', 'gB', 'gK'), 'flatlock'),
        ('collarFL', ('collar', 'b0', 'c1'), ('front', 'cfn', 'nkL'), 'topstitch1'),
        ('collarSL', ('collar', 'c1', 'c2'), ('sleeveL', 'nkF', 'nkB'), 'topstitch1'),
        ('collarB', ('collar', 'c2', 'c3'), ('back', 'nkL', 'nkR'), 'topstitch1'),
        ('collarSR', ('collar', 'c3', 'c4'), ('sleeveR', 'nkB', 'nkF'), 'topstitch1'),
        ('collarFR', ('collar', 'c4', 'b5'), ('front', 'nkR', 'cfn'), 'topstitch1'),
        ('collarCF', ('collar', 'b0', 't0'), ('collar', 'b5', 't5'), 'zip'),
    ]
    pattern = Pattern([front, back, sl, sr, gl, gr, collar], seams, h)

    # Details placed on the simulated surface in pattern space.
    s = m['height'] / 1.68
    details = {
        'hems': [('front', 'hemR', 'hemL'), ('back', 'hemL', 'hemR')],
        'cuffs': [('sleeveL', 'cuffF', 'cuffB'), ('sleeveR', 'cuffB', 'cuffF')],
        'collarTop': ('collar', 't5', 't0'),
        'zip': {'front_len': 0.16 * s, 'y_cf': y_nk['front'] - drop['front'], 'collar_h': hc, 'collar_inset': inset,
                'collar_len': lc},
        'patches': [],
    }
    POCKET_TILT = 12.0  # degrees: the pocket mouth slants towards the front so the hand reaches in across the body
    for side, sleeve_p, back_sign, pocket_job in (('L', sl, 1, 'marker light'), ('R', sr, -1, 'spare goggle battery')):
        tilt = POCKET_TILT * back_sign
        details['patches'].append({
            'name': f'elbowPad{side}', 'kit': 'elbowPockets', 'panel': sleeve_p.name, 'kind': 'pad', 'material': 'cordura',
            'centre': (back_sign * we * 0.15, yel + 0.005), 'size': (0.10 * s, 0.15 * s), 'r': 0.025 * s,
            'angle': 0.0, 'bulge': 0.006,
            'job': 'elbow pad pocket: heavier Cordura outer panel, foam pad inside, opening at the top'})
        y_pk = yel + (lu - yel) * 0.62
        pc = (-back_sign * 0.012, y_pk)
        details['patches'].append({
            'name': f'armPocket{side}', 'kit': f'armPocket{side}', 'panel': sleeve_p.name, 'kind': 'pocket', 'material': 'ripstop',
            'centre': pc, 'size': (0.10 * s, 0.12 * s), 'r': 0.008 * s, 'angle': tilt, 'bulge': 0.004,
            'job': f'upper-arm pocket: {pocket_job}'})
        details['patches'].append({
            'name': f'armFlap{side}', 'kit': f'armPocket{side}', 'panel': sleeve_p.name, 'kind': 'flap', 'material': 'ripstop', 'over': f'armPocket{side}',
            'centre': (pc[0], pc[1] + 0.038 * s), 'pivot': pc, 'size': (0.112 * s, 0.05 * s), 'r': 0.006 * s,
            'angle': tilt, 'bulge': 0.0, 'job': 'pocket flap: bound edge, hook-and-loop closure'})
        details['patches'].append({
            'name': f'armLoop{side}', 'kit': KIT, 'panel': sleeve_p.name, 'kind': 'loop', 'material': 'loop', 'over': f'armPocket{side}',
            'centre': (pc[0], pc[1] - 0.018 * s), 'pivot': pc, 'size': (0.076 * s, 0.05 * s), 'r': 0.004,
            'angle': tilt, 'bulge': 0.0, 'job': 'blank hook-and-loop identity panel (stays blank)'})
        details['patches'].append({
            'name': f'cuffTab{side}', 'kit': KIT, 'panel': sleeve_p.name, 'kind': 'tab', 'material': 'ripstop',
            'centre': (-back_sign * wc * 0.22, 0.045), 'size': (0.03, 0.075), 'r': 0.008, 'angle': 0.0,
            'bulge': 0.0, 'job': 'cuff tab: hook-and-loop, closes the cuff over the glove'})
    for end, x0 in (('L', inset + 0.001), ('R', lc - inset - 0.014)):
        details['patches'].append({
            'name': f'zipGarage{end}', 'kit': KIT, 'panel': 'collar', 'kind': 'garage', 'material': 'ripstop',
            'centre': (x0 + 0.0065, hc - 0.011), 'size': (0.013, 0.022), 'r': 0.003, 'angle': 0.0, 'bulge': 0.0,
            'job': 'zip garage: folded fabric over the slider so it does not dig into the chin'})
    return pattern, details, {'top': {'L': top_l, 'R': top_r}, 'sleeve_w': (wc, we, wb), 'collar_len': lc}


# --- Guard bake (docs/guard-models PLAN G2, SPEC 4 `uniform` / `uniform_rolled`) ---------------------------------------
# The guard field shirt is Wren's block (raglan sleeves with the articulated elbow, underarm gussets, the stand collar
# with its quarter zip, cuff tabs over the glove) re-cut as a woven shirt worn on the skin: a ripstop torso with room
# (+8 % girth, no length stretch, topstitched side seams), looser sleeves, two chest pockets with plain flaps; no elbow
# pads, arm pockets or loop panels. Nothing here runs for Wren: GUARD stays None until configure().
GUARD = None
GUARD_CUT = {'knit_ease': 0.08, 'knit_ease_v': 0.0, 'sleeve_ease': 1.12, 'cuff_room': 0.035}
ROLL_ABOVE_ELBOW = 0.07   # x s: the rolled sleeve's cut line above the elbow (pattern y from the cuff)


def configure(part, variant=None, prefix=None, **_):
    """Guard mode for this module copy (guard_garment.load_part). variant 'rolled': sleeves rolled above the elbow."""
    global GUARD, KIT, SIM, UNDER_LAYERS
    import copy
    if variant not in (None, 'rolled'):
        raise SystemExit(f'combat_shirt: unknown variant {variant!r} (rolled)')
    GUARD = {'part': part, 'variant': variant, 'prefix': prefix or part}
    KIT = part
    SIM = copy.deepcopy(SIM)
    UNDER_LAYERS = {}   # worn on the skin: no base layer under it


def prefix_patches(details, prefix):
    """Patch objects are named after their spec: prefixed with the part (`guard-<base>-<part>-...`) so every object
    of a part shares its prefix and two parts never collide."""
    names = {p['name'] for p in details['patches']}
    for p in details['patches']:
        p['name'] = f"{prefix}-{p['name']}"
        if p.get('over') in names:
            p['over'] = f"{prefix}-{p['over']}"
    for g in details.get('grommets') or []:
        if g.get('patch') in names:
            g['patch'] = f"{prefix}-{g['patch']}"
    return details


def chest_pockets(details, m, s, kit, y_b, x=0.085, size=(0.11, 0.125), flap_h=0.045):
    """Two chest patch pockets with plain flaps on the front panel (+x is the wearer's left)."""
    pw, ph = size[0] * s, size[1] * s
    for side, sx in (('L', 1.0), ('R', -1.0)):
        pc = (sx * x * s, y_b - 0.005 * s)
        details['patches'].append({
            'name': f'chestPocket{side}', 'kit': kit, 'panel': 'front', 'kind': 'pocket', 'material': 'ripstop',
            'centre': pc, 'size': (pw, ph), 'r': 0.008 * s, 'angle': 0.0, 'bulge': 0.003, 'job': 'chest pocket'})
        details['patches'].append({
            'name': f'chestFlap{side}', 'kit': kit, 'panel': 'front', 'kind': 'flap', 'material': 'ripstop',
            'over': f'chestPocket{side}', 'centre': (pc[0], pc[1] + ph / 2 - flap_h * s / 2 + 0.0025 * s), 'pivot': pc,
            'size': (pw + 0.008 * s, flap_h * s), 'r': 0.006 * s, 'angle': 0.0, 'bulge': 0.0,
            'job': 'plain pocket flap'})


def guard_draft(m, h=0.011):
    g = GUARD
    s = m['height'] / 1.68
    pattern, details, info = draft(m, h, ease=GUARD_CUT)
    for p in pattern.panels.values():
        if p.material == KNIT and not p.name.startswith('gusset'):
            p.material = RIPSTOP
    pattern.seams = [(n, a, b, 'topstitch1' if st == 'flatlock' and n.startswith('side') else st)
                     for n, a, b, st in pattern.seams]
    keep = ('zipGarage',) if g['variant'] == 'rolled' else ('zipGarage', 'cuffTab')
    details['patches'] = [p for p in details['patches'] if p['name'].startswith(keep)]
    for p in details['patches']:
        p['kit'] = g['part']
    chest_pockets(details, m, s, g['part'], (m['z_bust'] - m['z_hem']) * (1.0 + GUARD_CUT['knit_ease_v']))
    if g['variant'] == 'rolled':
        # simulated with full sleeves (the same cloth as the shirt), cut at this line afterwards (guard_garment)
        details['cuffs'] = []
        details['rolled'] = {'panels': ['sleeveL', 'sleeveR'], 'y_cut': m['sleeve_elbow'] + ROLL_ABOVE_ELBOW * s}
    return pattern, prefix_patches(details, g['prefix']), info


if __name__ == '__main__':   # guard bake job (guard-bake.mjs --stage garments)
    import guard_garment
    guard_garment.main()
