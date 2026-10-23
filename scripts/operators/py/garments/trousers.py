"""Wren's soft-shell trousers (SPEC 3.1 trousers, 3.5, 5.1; ART-DIRECTION 3, 5), drafted on the leg block
(legwear.draft_legs) over the base leggings and the tucked combat shirt (resolved after the simulation by
build_garment's layer_push, not colliders: DECISIONS A11).

Construction:
- front and back per leg in stretch soft-shell; a diamond crotch gusset in stretch knit; a waistband with belt loops
  wide enough for the duty belt (bar tacks at both ends), a fly with a J-stitch and a bar tack, a metal snap;
- articulated knees: two darts each side of the front knee (the front is cut longer: a pre-bent knee);
- internal knee pad pockets behind a reinforced outer Cordura panel (pad bulge, opening inside at the top);
- a reinforced Cordura seat panel each side, shaped to the back panel: from the centre back seam to the side seam, from
  the gusset up over the seat;
- flat cargo pockets on the thighs, angled forward for the hand, flaps with a quiet hook-and-loop closure, a metal
  drain grommet at the bottom of each, bar tacks at the mouth;
- tapered ankles that seal over the boot (the hem narrows to a boot-top girth), an ankle tab to cinch them.
The shirt hem is tucked in: the shirt is simulated first (its hem at the hip), the trousers' waist closes over it.

Pattern space as legwear.py (front panels cut with the inner edge on the left; frontR and backL mirrored).

Guard bake (docs/guard-models PLAN G2): run as the main script by guard-bake.mjs, it hands the job to guard_garment.py,
which calls configure() on a copy of this module (bottom of this file). Wren's cut and draft are untouched while
configure() has not been called.
"""
if __name__ == '__main__':   # guard bake job: py/ and py/garments/ on the path before the imports below
    import os as _os
    import sys as _sys
    _here = _os.path.dirname(_os.path.abspath(__file__))
    _sys.path[:0] = [_here, _os.path.dirname(_here)]
import math

import numpy as np

import legwear
from pattern import Pattern

KIT = 'trousers'
PAD_H = 0.17                                        # knee pad panel height (x s)
SOFT, KNIT = 'softshell', 'knit'

# Soft-shell: a woven stretch face, stiffer than the knit and softer than ripstop. Sewn layers stiffen it locally.
# Gravity scaled down as for the leggings (base_layer.py): legwear hangs from the hips.
SIM = {
    'mass': 0.1,
    'gravity': 0.3,
    'materials': {SOFT: {'tension': 35.0, 'shear': 10.0, 'bending': 2.0},
                  KNIT: {'tension': 10.0, 'shear': 4.0, 'bending': 0.3}},
    'panels': {'waistband': {'tension': 60.0, 'shear': 20.0, 'bending': 10.0}},
    'patches': {'pad': {'bending': 10.0, 'shear': 18.0}, 'pocket': {'bending': 6.0, 'shear': 14.0},
                'flap': {'bending': 6.0}, 'panel': {'bending': 4.0, 'shear': 12.0}},
    'sewing_force': 12.0,
    'quality': 16, 'collision_quality': 4,
    'collision': {'body': 0.0015, 'cloth': 0.0015},
    'air_damping': 1.0, 'spring_damping': 5.0,
    'friction': 4.0,
    # The waistband is held on its drafted ring through the sew and the settle (build_garment 'pin'; A15): the layers
    # under it are not colliders, so nothing else holds a band drafted over them at its height.
    'pin': {'panels': ['waistband'], 'sew': 1.0, 'settle': 1.0},
    # Soft-shell drape: the solver's dents are faired out after the simulation (build_garment 'fair'). 40 Taubin
    # passes damp dents up to about 7 cm across and keep folds longer than about 14 cm (broad folds, the knee bag);
    # 6 passes (fix round 1) left the 3-6 cm dents on the thighs and calves. The seams and hems are faired along
    # themselves (a clean band edge and fly, step 05 fix round 2).
    'fair': {'iters': 40},
    # Soft-shell bridges the seat (step 05 fix round 3): the back panels from just above the crotch to the band lie one
    # layer step off the layers under them with their hollows bridged (build_garment 'bridge'), not on the layers: no
    # gluteal cleft, sacral dimple or lumbar lumps showing through. 'crotch' and 'band': (offset, ramp) in metres where
    # the bridging eases in above the crotch and out under the pinned band.
    'bridge': {'panels': ['backL', 'backR'], 'crotch': (0.01, 0.04), 'band': (0.0, 0.025), 'iters': 150},
}


# Layers under the trousers (build_garment.py allowance): the leggings on the legs; round the hips and waist the
# leggings, the base top and the tucked shirt above 0.85 m (their hems settle at about 0.88 m on Wren).
UNDER_LAYERS = {'leg_rows': 1, 'torso_rows': lambda z: 1 if z < 0.85 else 3}


def cut(m):
    s = m['height'] / 1.68
    return {
        # The legs are drafted on the vertical and settle about 4 cm shorter on the spread A-pose legs (the leg path is
        # longer than the drop, and the band is pinned): the hem is cut below the ankle joint and settles above it.
        'z_hem': m['z_ankle'] - 0.055 * s,         # r2 item 2: 4 cm longer, the narrow hem settles higher
        'z_top': m['z_waist'] - 0.05 * s,           # mid rise: the band top sits just under the navel
        'knee_up': -0.03,                           # drafted 3 cm low: the thigh shortens about 4 cm in the settle,
                                                    # the darts and the pad land on the kneecap
        'dart': (0.012 * s, 0.035 * s),             # width at the seam, length into the panel
        'front_share': 0.46,
        'hip_split': 0.012,                         # the back is wider over the seat
        'leg_ease': (1.30, 1.16, 1.10),             # hem, knee (room for the pad), crotch
        # tapered ankle (step 06 fix 1): the boot's measured top girth (24.0 cm on Wren) plus a layer's allowance
        # (build_garment), 26.5 cm, not the earlier 34 cm tube that stood off the boot; the leg settles about 4 cm, so
        # the hem laps 3-5 cm down over the boot shaft
        'hem_circ': m.get('boot_top_girth', 0.265 * s),
        'hip_ease': (1.07, 1.03),
        'smooth': 0.08,
        # rise solved from the measured crotch path plus this ease (front, back; legwear.draft_legs); o['rise'] is the
        # fallback without a measured path.
        'rise': (0.03, 0.065), 'crotch_ease': (0.02, 0.025),
        'gusset_drop': 0.05, 'gusset_half_w': 0.035, 'centre_lift': (0.03, 0.05),
        'material': SOFT, 'gusset_material': KNIT, 'band_material': SOFT,
        'seam_styles': ('topstitch2', 'topstitch1', 'topstitch2'),
        'band_h': 0.04, 'band_ratio': 0.93,         # snug: holds the trousers on the hips, gathers them a little
        'arrange_offset': 0.012, 'standoff': 0.012,
    }


def fly(xi, y_top, length, w):
    """The fly's J-stitch on the left front (pattern points): down the fly shield, curving into the centre seam,
    and the bar tack across its foot."""
    ys = np.linspace(y_top - 0.004, y_top - length + w, 24)
    line = [[float(xi('front', y)) + w, float(y)] for y in ys]
    for a in np.linspace(0.0, math.pi / 2, 12)[1:]:
        y = y_top - length + w - w * math.sin(a)
        line.append([float(xi('front', y)) + w * math.cos(a) + 0.003 * math.sin(a), float(y)])
    yb = y_top - length - 0.002
    x0 = float(xi('front', yb))
    # the shield's outline: the J-stitch, then back up along the centre seam
    region = line + [[float(xi('front', y)) + 0.001, float(y)] for y in np.linspace(y_top - length, y_top - 0.004, 16)]
    return {'panel': 'frontL', 'line': line, 'tack': [[x0 + 0.003, yb], [x0 + 0.014, yb]], 'region': region}


def seat_outline(xi, xs, geo, s, inset=0.006):
    """The seat panel's outline on the back panel (unmirrored frame): up the centre back seam from just above the gusset
    to 60 % of the rise, across, down the side seam to 2 cm below the crotch, then a curve back to the start."""
    y_c, y_top, y_cb = geo['y_c'], geo['y_top'], geo['y_cb']['back']
    y0, y_hi, y_lo = y_cb + 0.01, y_c + 0.6 * (y_top - y_c), y_c - 0.02 * s
    up = np.linspace(y0, y_hi, 12)
    down = np.linspace(y_hi, y_lo, 12)
    pts = [[float(xi('back', y)) + inset, float(y)] for y in up]
    pts += [[float(xs('back', y)) - inset, float(y)] for y in down]
    a, b = np.array(pts[-1]), np.array(pts[0])
    for t in np.linspace(0.0, 1.0, 10)[1:-1]:                     # the lower edge: a soft curve under the seat
        p = a + (b - a) * t
        pts.append([float(p[0]), float(p[1] - 0.025 * s * np.sin(np.pi * t))])
    pts = np.array(pts)
    for _ in range(2):                                            # Chaikin: round the corners
        q = np.roll(pts, -1, axis=0)
        pts = np.stack([0.75 * pts + 0.25 * q, 0.25 * pts + 0.75 * q], axis=1).reshape(-1, 2)
    return pts


def draft(m, h=0.011):
    s = m['height'] / 1.68
    o = cut(m)
    panels, seams, geo, arrange = legwear.draft_legs(m, o, h)
    pattern = Pattern(panels, seams, h)
    xs, xi = geo['x_side'], geo['x_inner']
    y_k, y_c, y_top = geo['y_k'], geo['y_c'], geo['y_top']

    def mid(part, y, f=0.5):
        """Pattern x at fraction f from the inner edge to the side edge (unmirrored frame)."""
        return float(xi(part, y) + f * (xs(part, y) - xi(part, y)))

    details = {
        'hems': [(pn, 'H_I', 'H_S') for pn in ('frontL', 'frontR', 'backL', 'backR')],
        'cuffs': [],
        'bandTops': [('waistband', 't4', 't0')],
        'zip': None,
        'fly': fly(xi, y_top, 0.15 * s, 0.035 * s),
        'snaps': [{'panel': 'waistband', 'at': (0.012, geo['band_h'] / 2), 'r': 0.0075, 'job': 'waistband snap'}],
        'grommets': [],
        'patches': [],
        'inserts': [],
        'stitchShadows': False,  # no spiky thread shadows under a grazing rake (garment_details; fix round 3)
        'offsetSmooth': 3,     # seam plateaus as ramps, not sawtooth steps (garment_details; step 05 fix round 3)
    }
    for sd in ('L', 'R'):
        flip = (sd == 'R')                          # frontR and backL are mirrored panels
        fx = (lambda x, f=flip: -x if f else x)
        # Knee: the reinforced outer panel over the internal pad pocket, centred on the kneecap.
        details['patches'].append({
            'name': f'kneePad{sd}', 'kit': 'kneePads', 'panel': f'front{sd}', 'kind': 'pad', 'material': 'cordura',
            'centre': (fx(mid('front', y_k, 0.5)), y_k), 'size': (0.13 * s, PAD_H * s), 'r': 0.03 * s,
            'angle': 0.0, 'bulge': 0.007,
            'job': 'knee: reinforced Cordura outer panel over the internal pad pocket (foam pad, opening inside at the top)'})
        # Cargo pocket on the front-side of the thigh, against the outseam, its bottom 1.5 cm clear of the knee pad
        # (the mouth lands on the upper thigh, between the hanging hand's wrist and fingertips), angled forward.
        tilt = 10.0 * (1 if not flip else -1)
        pw, ph = 0.13 * s, 0.15 * s
        y_pk = y_k + (PAD_H / 2 + 0.015) * s + ph / 2
        W = float(xs('front', y_pk) - xi('front', y_pk))
        pc = (fx(float(xi('front', y_pk)) + W - 0.012 * s - pw / 2), y_pk)   # outer edge 1.2 cm from the outseam
        details['patches'].append({
            'name': f'cargo{sd}', 'kit': f'cargo{sd}', 'panel': f'front{sd}', 'kind': 'pocket', 'material': 'softshell',
            'centre': pc, 'size': (pw, ph), 'r': 0.01 * s, 'angle': tilt, 'bulge': 0.004,
            'job': f"cargo pocket: {'map card' if sd == 'L' else 'spare gloves'}; drain grommet at the bottom"})
        details['patches'].append({
            'name': f'cargoFlap{sd}', 'kit': f'cargo{sd}', 'panel': f'front{sd}', 'kind': 'flap', 'material': 'softshell',
            'over': f'cargo{sd}', 'centre': (pc[0], pc[1] + ph / 2 - 0.022 * s), 'pivot': pc,
            'size': (pw + 0.012 * s, 0.065 * s), 'r': 0.008 * s, 'angle': tilt, 'bulge': 0.0,
            'job': 'cargo flap: bound edge, quiet hook-and-loop closure'})
        details['grommets'].append({'patch': f'cargo{sd}', 'at': (pc[0], pc[1] - ph / 2 + 0.012 * s),
                                    'job': 'drain grommet'})
        # Seat: a reinforced Cordura panel shaped to the back panel (ART-DIRECTION 5): its edges run 6 mm inside the
        # centre back seam and the side seam, from just above the gusset up over the seat, its lower edge sweeping
        # down to the side seam below the seat. Not two pocket-like rectangles (step 05 fix round 2).
        outline = seat_outline(xi, xs, geo, s)
        if sd == 'L':                                                     # backL is mirrored
            outline = outline * np.array([-1.0, 1.0])
        lo, hi = outline.min(axis=0), outline.max(axis=0)
        details['patches'].append({
            'name': f'seat{sd}', 'kit': KIT, 'panel': f'back{sd}', 'kind': 'panel', 'material': 'cordura',
            'outline': outline.tolist(), 'centre': tuple(((lo + hi) / 2).tolist()), 'size': tuple((hi - lo).tolist()),
            'r': 0.0, 'angle': 0.0, 'bulge': 0.0, 'job': 'reinforced Cordura seat panel'})
        # Stretch-knit insert behind the knee (SPEC 3.1, ART-DIRECTION 5): a lens-shaped knit panel seamed into the back
        # panel across the back of the knee, 2.5 cm inside the inseam and the outseam.
        W = float(xs('back', y_k) - xi('back', y_k))
        t = np.linspace(0.0, 2 * np.pi, 40, endpoint=False)
        lens = np.stack([mid('back', y_k) + (W / 2 - 0.025 * s) * np.cos(t), y_k + 0.05 * s * np.sin(t)], axis=1)
        if sd == 'L':                                                     # backL is mirrored
            lens = lens * np.array([-1.0, 1.0])
        details['inserts'].append({'name': f'kneeStretch{sd}', 'panel': f'back{sd}', 'material': KNIT,
                                   'outline': lens.tolist(), 'job': 'stretch-knit insert behind the knee'})
        # Ankle tab at the outseam: cinches the tapered hem over the boot.
        details['patches'].append({
            'name': f'ankleTab{sd}', 'kit': KIT, 'panel': f'front{sd}', 'kind': 'tab', 'material': 'softshell',
            'centre': (fx(mid('front', 0.06 * s, 0.86)), 0.045 * s), 'size': (0.028, 0.075), 'r': 0.008,
            'angle': 0.0, 'bulge': 0.0, 'job': 'ankle tab: hook-and-loop, seals the hem over the boot'})
    # Belt loops on the waistband (x = 0 at the centre front, round the left, back and right): separate folded strips,
    # 5.8 cm long - from the band's top edge to 2 cm below its lower edge (garment_details extends them down the band's
    # slope, 'band_h') - standing 6 mm off between the bar tacks: a clear opening for the 4.5 cm duty belt.
    lb, hb = geo['band_len'], geo['band_h']
    loop_h = 0.058 * s
    for k, f in enumerate((0.09, 0.2, 0.33, 0.5, 0.67, 0.8, 0.91)):
        details['patches'].append({
            'name': f'beltLoop{k}', 'kit': KIT, 'panel': 'waistband', 'kind': 'beltloop', 'material': 'softshell',
            'centre': (f * lb, hb - 0.003 - loop_h / 2), 'size': (0.018 * s, loop_h), 'r': 0.003, 'angle': 0.0,
            'bulge': 0.006, 'band_h': hb,
            'job': 'belt loop: wide enough for the duty belt, bar tacks at both ends'})
    info = {'legs': arrange, 'leg_geometry': geo}
    return pattern, details, info


# --- Guard bake (docs/guard-models PLAN G2, SPEC 4 `uniform` / `work`) -------------------------------------------------
# Guards wear the trousers on the skin (no leggings) over the tucked field shirt and the boots: Wren's cut and leg
# block, the layer allowance from the layers really under them (the boot shaft below its top, the shirt above its hem;
# guard_garment measures both on its copies), and no seat bridging (that spans the leggings' hollows). Details:
# - uniform: cargo trousers - the cargo pockets with flaps and drain grommets, the fly, snap, belt loops, ankle tabs;
#   no knee pads, seat panels or knee inserts;
# - variant 'work' (A11): plain work trousers - a straight leg over the boot, two back patch pockets, the fly, snap and
#   belt loops; no cargo pockets or ankle tabs.
# configure() swaps the module's `cut` and `draft` for the guard ones; nothing here runs for Wren.
GUARD = None
_WREN_CUT, _WREN_DRAFT = cut, draft


def configure(part, variant=None, prefix=None, shirt_hem_z=None, boot_top_z=None, **_):
    """Guard mode for this module copy (guard_garment.load_part)."""
    global GUARD, KIT, SIM, UNDER_LAYERS, cut, draft
    import copy
    if variant not in (None, 'work'):
        raise SystemExit(f'trousers: unknown variant {variant!r} (work)')
    GUARD = {'part': part, 'variant': variant, 'prefix': prefix or part, 'shirtHemZ': shirt_hem_z, 'bootTopZ': boot_top_z}
    KIT = part
    SIM = copy.deepcopy(SIM)
    SIM.pop('bridge', None)
    UNDER_LAYERS = {
        'leg_rows': (lambda z: 1 if z < boot_top_z + 0.01 else 0) if boot_top_z is not None else 0,
        'torso_rows': (lambda z: 1 if z > shirt_hem_z else 0) if shirt_hem_z is not None else 0,
    }
    cut, draft = guard_cut, guard_draft


def guard_cut(m):
    o = _WREN_CUT(m)
    if GUARD['variant'] == 'work':
        s = m['height'] / 1.68
        o['hem_circ'] = 1.45 * m.get('boot_top_girth', 0.265 * s)   # a straight leg hanging over the boot
        o['leg_ease'] = (1.36, 1.18, 1.10)
    return o


def guard_draft(m, h=0.011):
    from combat_shirt import prefix_patches
    g = GUARD
    s = m['height'] / 1.68
    work = g['variant'] == 'work'
    pattern, details, info = _WREN_DRAFT(m, h)
    drop = ('kneePad', 'seat') + (('cargo', 'ankleTab') if work else ())
    details['patches'] = [p for p in details['patches'] if not p['name'].startswith(drop)]
    details['inserts'] = []
    geo = info['leg_geometry']
    if not work:
        # cargo pockets square to the leg, their outer edge 1.5 cm inside the outseam along the whole pocket (Wren's
        # 10 degree tilt took a corner past the outseam on the guards' straighter thighs)
        by = {p['name']: p for p in details['patches']}
        for sd in ('L', 'R'):
            pk, fl = by.get(f'cargo{sd}'), by.get(f'cargoFlap{sd}')
            if pk is None or fl is None:
                continue
            pw, ph = pk['size']
            yc = pk['centre'][1]
            xc = float(min(geo['x_side']('front', yc - ph / 2), geo['x_side']('front', yc + ph / 2))) - 0.015 * s - pw / 2
            xc = -xc if sd == 'R' else xc                                     # frontR is mirrored
            pk['centre'], pk['angle'] = (xc, yc), 0.0
            fl['centre'], fl['pivot'], fl['angle'] = (xc, fl['centre'][1]), (xc, yc), 0.0
            for gr in details.get('grommets') or []:
                if gr['patch'] == f'cargo{sd}':
                    gr['at'] = (xc, gr['at'][1])
    if work:
        details['grommets'] = []
        xs, xi = geo['x_side'], geo['x_inner']
        pw, ph = 0.13 * s, 0.14 * s
        y_pk = geo['y_top'] - 0.075 * s - ph / 2
        x_m = float(xi('back', y_pk) + 0.5 * (xs('back', y_pk) - xi('back', y_pk)))
        for sd in ('L', 'R'):
            details['patches'].append({
                'name': f'backPocket{sd}', 'kit': g['part'], 'panel': f'back{sd}', 'kind': 'pocket',
                'material': 'softshell', 'centre': (-x_m if sd == 'L' else x_m, y_pk), 'size': (pw, ph),
                'r': 0.012 * s, 'angle': 0.0, 'bulge': 0.002, 'job': 'back patch pocket'})   # backL is mirrored
    for p in details['patches']:
        p['kit'] = g['part']
    return pattern, prefix_patches(details, g['prefix']), info


if __name__ == '__main__':   # guard bake job (guard-bake.mjs --stage garments)
    import guard_garment
    guard_garment.main()
