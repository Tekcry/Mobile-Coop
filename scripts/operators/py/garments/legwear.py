"""The leg block shared by the base leggings and the trousers: front and back panels per leg, a diamond crotch gusset,
optional articulated knee darts and an optional waistband, drafted from the body's leg and hip girths.

Pattern space: metres, the fabric seen from outside, x right, y up; y = 0 at the hem height (the front panel is cut
longer by the knee darts' intake, so its hem sits at y = -dart width: a pre-bent knee).
- Every panel is drafted with its inner edge (inseam, crotch, centre front or back) on the left; frontL and backR keep
  that orientation, frontR and backL are mirrored (seen from outside, the wearer's left is on the right of the front
  and on the left of the back).
- Corners (each names the edge that starts there, counter-clockwise from outside):
  H_I hem at the inseam, H_S hem at the side, [D1 DA D2 side dart | K_S side knee], T_S top at the side,
  T_I top at the centre front or back, C_B bottom of the centre seam, G gusset tip on the inseam,
  [E1 EA E2 inner dart | K_I inner knee].
- Gusset corners: gL (wearer's left tip), gF (front tip), gR, gB; pattern +x is the wearer's left, +y the front
  (seen from below).
- Waistband: x = 0 at the centre front, round the wearer's left, the back and the right; y up.
"""
import numpy as np

from pattern import Panel, Pattern, polyline_length


def rows_interp(rows, z):
    rows = np.asarray(rows, dtype=np.float64)
    return np.interp(z, rows[:, 0], rows[:, 1])


def smooth(y, v, window):
    """Moving average of v over a window in y (metres), edges held."""
    out = np.empty_like(v)
    for i, yy in enumerate(y):
        sel = np.abs(y - yy) <= window / 2
        out[i] = v[sel].mean()
    return out


def mirror(edges):
    """The same panel seen mirrored in x, still counter-clockwise, every corner name kept on its point."""
    n = len(edges)
    names = [c for c, _ in edges]
    out = []
    for i in reversed(range(n)):
        pl = np.asarray(edges[i][1], dtype=np.float64)[::-1].copy()
        pl[:, 0] *= -1
        out.append((names[(i + 1) % n], pl))
    return out


def col(x, y):
    return np.stack([np.asarray(x, dtype=np.float64), np.asarray(y, dtype=np.float64)], axis=1)


def crotch_lengths(hull, z_top, offset):
    """Front and back lengths of the crotch path (build_garment m['crotch_hull'], the body's midline outline in the
    side view, y front to back): from the front surface at z_top down under the crotch to its lowest point, and from
    there up the back to z_top, each lengthened by the offset curve's extra (offset x the angle the path turns)."""
    hull = np.asarray(hull, dtype=np.float64)
    closed = np.vstack([hull, hull[:1]])
    pts = []
    for a, b in zip(closed[:-1], closed[1:]):
        n = max(1, int(np.ceil(np.linalg.norm(b - a) / 0.001)))
        pts.append(a + (b - a) * np.linspace(0.0, 1.0, n, endpoint=False)[:, None])
    pts = np.vstack(pts)
    above = pts[:, 1] > z_top
    if not above.any() or above.all():
        return None
    start = int(np.argmax(above))                      # roll so the arc below z_top is contiguous
    pts = np.roll(pts, -start, axis=0)
    below = np.where(pts[:, 1] <= z_top)[0]
    arc = pts[below[0]:below[-1] + 1]
    if arc[0, 0] > arc[-1, 0]:                         # front (smaller y) first
        arc = arc[::-1]
    k = int(np.argmin(arc[:, 1]))
    seg = np.linalg.norm(np.diff(arc, axis=0), axis=1)

    def turn(p):
        d = np.diff(p, axis=0)
        ang = np.unwrap(np.arctan2(d[:, 1], d[:, 0]))
        return float(abs(ang[-1] - ang[0])) if len(ang) > 1 else 0.0
    front, back = float(seg[:k].sum()), float(seg[k:].sum())
    return {'front': front + offset * turn(arc[:k + 1]), 'back': back + offset * turn(arc[k:]),
            'bodyFront': front, 'bodyBack': back, 'zLow': float(arc[k, 1])}


def draft_legs(m, o, h):
    """o: the cut (see base_layer.LEGGINGS and trousers.CUT). Returns (panels, seams, geometry) where geometry carries
    the row functions and heights the garment uses to place its details, and the arrangement info for build_garment."""
    s = m['height'] / 1.68
    z_hem, z_top, z_c = o['z_hem'], o['z_top'], m['z_crotch']
    y_top, y_c = z_top - z_hem, z_c - z_hem
    y_k = m['z_knee'] - z_hem + o.get('knee_up', 0.0) * s
    WD, DEPTH = (o['dart'] if o.get('dart') else (0.0, 0.0))
    fs = o['front_share']
    d_hip = o['hip_split'] * s            # the back is wider than the front above the crotch by 2 * d_hip

    # Leg girth: the body's, eased; trousers hang straight below the knee and taper to the hem opening.
    yy = np.linspace(-WD, y_c, 200)
    body = rows_interp(m['leg_rows'], z_hem + np.maximum(yy, 0.0))
    c_leg = body * np.interp(yy, [0.0, y_k, y_c], o['leg_ease'])
    if o.get('hem_circ'):
        k_body = rows_interp(m['leg_rows'], m['z_knee']) * np.interp(y_k, [0.0, y_k, y_c], o['leg_ease'])
        straight = np.interp(yy, [0.0, y_k], [o['hem_circ'], k_body])
        c_leg = np.where(yy < y_k, np.maximum(c_leg, straight), c_leg)
    c_leg = smooth(yy, c_leg, o.get('smooth', 0.06))
    yt = np.linspace(y_c, y_top, 80)
    c_t = rows_interp(m['torso_rows'], z_hem + yt) * np.interp(yt, [y_c, y_top], o['hip_ease'])
    c_t = smooth(yt, c_t, 0.04)

    def w_leg(part, y):
        share = fs if part == 'front' else 1.0 - fs
        return share * np.interp(y, yy, c_leg)

    def w_torso(part, y):
        return np.interp(y, yt, c_t) / 4.0 + (-d_hip if part == 'front' else d_hip)

    def x_side(part, y):
        y = np.asarray(y, dtype=np.float64)
        below = 0.5 * w_leg(part, np.minimum(y, y_c))
        above = 0.5 * w_leg(part, y_c) + 0.5 * (w_torso(part, np.maximum(y, y_c)) - w_torso(part, y_c))
        return np.where(y <= y_c, below, above)

    def x_inner(part, y):
        """Inner edge: the inseam below the crotch, the centre seam above it (gusset edge between, see below)."""
        y = np.asarray(y, dtype=np.float64)
        return np.where(y <= y_c, x_side(part, y) - w_leg(part, np.minimum(y, y_c)),
                        x_side(part, y) - w_torso(part, np.maximum(y, y_c)))

    g_drop = o['gusset_drop'] * s
    y_g = y_c - g_drop
    y_cb = {'front': y_c + o['centre_lift'][0] * s, 'back': y_c + o['centre_lift'][1] * s}

    # Rise: the top edge climbs from the side seam to the centre seam (more at the back, over the seat), so the crotch
    # seam reaches from the front waist under the body to the back waist. With 'crotch_ease' and a measured crotch path
    # (m['crotch_hull']) the rise is solved so that each centre seam plus its half of the gusset equals the body's path
    # from the top edge to the crotch's lowest point (offset to where the cloth lies), plus the ease; else o['rise'].
    rise = {'front': o.get('rise', (0.0, 0.0))[0] * s, 'back': o.get('rise', (0.0, 0.0))[1] * s}
    hw0 = o['gusset_half_w'] * s
    a_g = {q: float(np.hypot(x_inner(q, y_cb[q]) - x_inner(q, y_g), y_cb[q] - y_g)) for q in ('front', 'back')}
    hw = min(hw0, 0.8 * min(a_g.values()))
    d_g = {q: float(np.sqrt(a_g[q] ** 2 - hw ** 2)) for q in ('front', 'back')}

    def centre_len(q, r):
        ys = np.linspace(y_cb[q], y_top + r, 60)
        return polyline_length(col(x_inner(q, ys), ys))

    crotch = crotch_lengths(m['crotch_hull'], z_top, m['crotch_offset']) if (
        o.get('crotch_ease') and m.get('crotch_hull')) else None
    if crotch:
        for i, q in enumerate(('front', 'back')):
            target = crotch[q] + o['crotch_ease'][i] * s
            r = 0.0
            for _ in range(4):
                r += target - (centre_len(q, r) + d_g[q])
            rise[q] = r
        crotch['rise'] = {q: round(rise[q], 4) for q in rise}
        crotch['pattern'] = {q: round(centre_len(q, rise[q]) + d_g[q], 4) for q in rise}
        print(f"operators: crotch path at z_top {z_top:.3f}: body front {crotch['bodyFront'] * 100:.1f} cm, back "
              f"{crotch['bodyBack'] * 100:.1f} cm (lowest z {crotch['zLow']:.3f}); pattern front "
              f"{crotch['pattern']['front'] * 100:.1f} cm, back {crotch['pattern']['back'] * 100:.1f} cm; rise front "
              f"{rise['front'] * 100:.1f} cm, back {rise['back'] * 100:.1f} cm", flush=True)

    def panel(name, part, material, flip):
        darts = part == 'front' and WD > 0
        y0 = -WD if darts else 0.0
        ka, kb = (y_k - WD / 2, y_k + WD / 2) if darts else (y_k + WD / 2, y_k + WD / 2)

        def side(a, b, n=None):
            ys = np.linspace(a, b, n or max(3, int((b - a) / 0.01) + 2))
            return col(x_side(part, np.maximum(ys, 0.0)), ys)

        def inner(a, b, n=None):
            ys = np.linspace(a, b, n or max(3, int(abs(b - a) / 0.01) + 2))
            return col(x_inner(part, np.maximum(ys, 0.0)), ys)

        H_I = (float(x_inner(part, 0.0)), y0)
        H_S = (float(x_side(part, 0.0)), y0)
        Gp = (float(x_inner(part, y_g)), y_g)
        CB = (float(x_inner(part, y_cb[part])), y_cb[part])
        r = rise[part]
        T_S = (float(x_side(part, y_top)), y_top)
        T_I = (float(x_inner(part, y_top + r)), y_top + r)
        edges = [('H_I', col([H_I[0], H_S[0]], [y0, y0]))]
        if darts:
            apex_s = (float(x_side(part, y_k)) - DEPTH, y_k)
            apex_i = (float(x_inner(part, y_k)) + DEPTH, y_k)
            lo = side(0.0, ka)
            lo[0] = H_S
            edges += [('H_S', lo), ('D1', col([lo[-1][0], apex_s[0]], [ka, y_k])),
                      ('DA', col([apex_s[0], float(x_side(part, kb))], [y_k, kb])), ('D2', side(kb, y_top))]
        else:
            edges += [('H_S', side(0.0, kb)), ('K_S', side(kb, y_top))]
        edges += [('T_S', col(np.linspace(T_S[0], T_I[0], 12), y_top + r * np.linspace(0.0, 1.0, 12) ** 2)),
                  ('T_I', inner(y_top + r, y_cb[part])),
                  ('C_B', col(np.linspace(CB[0], Gp[0], 12), np.linspace(CB[1], Gp[1], 12)))]
        if darts:
            up = inner(y_g, kb)
            low = inner(ka, 0.0)
            low[-1] = H_I
            edges += [('G', up), ('E1', col([up[-1][0], apex_i[0]], [kb, y_k])),
                      ('EA', col([apex_i[0], low[0][0]], [y_k, ka])), ('E2', low)]
        else:
            low = inner(kb, 0.0)
            low[-1] = H_I
            edges += [('G', inner(y_g, kb)), ('K_I', low)]
        return Panel(name, material, mirror(edges) if flip else edges)

    mat, gmat = o['material'], o['gusset_material']
    panels = [panel('frontL', 'front', mat, False), panel('frontR', 'front', mat, True),
              panel('backL', 'back', mat, True), panel('backR', 'back', mat, False)]
    P = {p.name: p for p in panels}

    # Gusset: a kite whose edges match the panels' gusset edges; its width spans the gap between the thighs.
    a = polyline_length(P['frontL'].run('C_B', 'G')[0])
    b = polyline_length(P['backL'].run('C_B', 'G')[0])
    df, db = float(np.sqrt(a * a - hw * hw)), float(np.sqrt(b * b - hw * hw))
    L, F, R, B = (hw, 0.0), (0.0, df), (-hw, 0.0), (0.0, -db)

    def seg(p, q, n=12):
        return col(np.linspace(p[0], q[0], n), np.linspace(p[1], q[1], n))
    panels.append(Panel('gusset', gmat, [('gL', seg(L, F)), ('gF', seg(F, R)), ('gR', seg(R, B)), ('gB', seg(B, L))]))

    knee_s = ('D1', 'D2') if WD > 0 else ('K_S', 'K_S')
    knee_i = ('E1', 'E2') if WD > 0 else ('K_I', 'K_I')
    side_style, inner_style, centre_style = o['seam_styles']
    seams = []
    for sd in ('L', 'R'):
        f, bk = f'front{sd}', f'back{sd}'
        seams += [
            (f'outLo{sd}', (f, 'H_S', knee_s[0]), (bk, 'H_S', 'K_S'), side_style),
            (f'outUp{sd}', (f, knee_s[1], 'T_S'), (bk, 'K_S', 'T_S'), side_style),
            (f'inUp{sd}', (f, 'G', knee_i[0]), (bk, 'G', 'K_I'), inner_style),
            (f'inLo{sd}', (f, knee_i[1], 'H_I'), (bk, 'K_I', 'H_I'), inner_style),
            (f'gusF{sd}', (f, 'C_B', 'G'), ('gusset', 'gF', f'g{sd}'), 'flatlock'),
            (f'gusB{sd}', (bk, 'C_B', 'G'), ('gusset', 'gB', f'g{sd}'), 'flatlock'),
        ]
        if WD > 0:
            seams += [(f'dartS{sd}', (f, 'D1', 'DA'), (f, 'D2', 'DA'), 'dart'),
                      (f'dartI{sd}', (f, 'E1', 'EA'), (f, 'E2', 'EA'), 'dart')]
    seams += [('cf', ('frontL', 'T_I', 'C_B'), ('frontR', 'T_I', 'C_B'), centre_style),
              ('cb', ('backL', 'T_I', 'C_B'), ('backR', 'T_I', 'C_B'), centre_style)]

    tops = [polyline_length(P['frontL'].run('T_I', 'T_S')[0]), polyline_length(P['backL'].run('T_S', 'T_I')[0]),
            polyline_length(P['backR'].run('T_I', 'T_S')[0]), polyline_length(P['frontR'].run('T_S', 'T_I')[0])]
    cx = np.concatenate([[0.0], np.cumsum(tops)])
    band = None
    if o.get('band_h'):
        # band_ratio < 1: the band is cut shorter than the panel tops it is sewn to (an elastic band gathers them; a
        # snug waistband holds the garment up on the hips instead of letting it slide down).
        br = o.get('band_ratio', 1.0)
        cx = cx * br
        lb, hb = float(cx[-1]), o['band_h'] * s
        names = ['b0', 'c1', 'c2', 'c3']
        edges = [(names[i], col(np.linspace(cx[i], cx[i + 1], 8), np.zeros(8))) for i in range(4)]
        edges += [('e4', seg((lb, 0.0), (lb, hb), 6)), ('t4', seg((lb, hb), (0.0, hb), 40)), ('t0', seg((0.0, hb), (0.0, 0.0), 6))]
        band = Panel('waistband', o.get('band_material', mat), edges)
        panels.append(band)
        seams += [('wbFL', ('waistband', 'b0', 'c1'), ('frontL', 'T_I', 'T_S'), 'topstitch1'),
                  ('wbBL', ('waistband', 'c1', 'c2'), ('backL', 'T_S', 'T_I'), 'topstitch1'),
                  ('wbBR', ('waistband', 'c2', 'c3'), ('backR', 'T_I', 'T_S'), 'topstitch1'),
                  ('wbFR', ('waistband', 'c3', 'e4'), ('frontR', 'T_S', 'T_I'), 'topstitch1'),
                  ('wbCF', ('waistband', 'b0', 't0'), ('waistband', 'e4', 't4'), 'topstitch1')]

    geometry = {
        'x_side': x_side, 'x_inner': x_inner, 'y_k': y_k, 'y_c': y_c, 'y_g': y_g, 'y_cb': y_cb, 'y_top': y_top,
        'crotch': crotch, 'tops': cx, 'band_len': float(cx[-1]), 'band_h': (o['band_h'] * s if o.get('band_h') else 0.0), 'WD': WD,
    }
    arrange = {
        'layout': 'legs', 'z_hem': z_hem, 'z_top': z_top, 'z_crotch': z_c,
        'legs': {'frontL': ('L', 'front', True), 'frontR': ('R', 'front', False),
                 'backL': ('L', 'back', False), 'backR': ('R', 'back', True)},
        'gusset': 'gusset', 'gusset_z': z_c - 0.012 * s, 'band': 'waistband' if band else None,
        'band_len': float(cx[-1]), 'offset': o['arrange_offset'], 'standoff': o['standoff'],
    }
    return panels, seams, geometry, arrange


def pattern_of(panels, seams, h):
    return Pattern(panels, seams, h)
