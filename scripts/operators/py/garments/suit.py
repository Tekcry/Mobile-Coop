"""Wren's stealth suit (step 08a; ART-DIRECTION 9.1, SPEC 3.1 and 5.1 Suit; DECISIONS D22-D24, A37, A38).

A one-piece, wetsuit-fitted suit in a bonded stretch soft-shell. It is the step 05 base layer's two blocks - the
compression top (combat_shirt's raglan block re-cut at negative ease) and the leggings (legwear's leg block) - in one
garment, drafted at the base layer's negative ease and drawn onto the body by build_garment's `cling`.

- Waist (A48, replaces A43's lap): one flush bonded seam. The leggings lose their waistband and are cut as the waist
  block: their top runs are drafted to the top's hem (hip_split and the top hip ease solved so each leg panel's top
  run equals its half of the top's front or back hem), and the top's hem, drafted at the leggings' top height, is
  split at the centre and sewn to them edge to edge (seams waistFrontL/R, waistBackL/R). The seam carries the same
  8 mm tape as the side seams; no lap, no step.
- Panels: the raglan shoulders, the side seams with the underarm gussets, the sleeves with the articulated elbow, the
  leg panels with the crotch gusset; the zones of ART-DIRECTION 9.1 as seamed-in inserts (A16): grip (forearms,
  knees), abrasion (shoulder yokes, elbows, seat), stretch (inner elbows, rear shoulders), perforated vents (underarm
  side panels, backs of the knees).
- Bonded construction (garment_details 'bonded'): every seam, insert outline and edge carries a tonal tape strip about
  8 mm wide and 0.6 mm proud with rounded edges; no stitch rows, no seam plateaus.
- Closures (finish(), on the detailed surface): the diagonal chest zip from the left of the collar to the right ribs
  (coil, slider, flush puller) parked in a zip garage at the collar top; a close mock neck (5.5 cm); thumb loops at the
  sleeve ends (under the glove cuffs); ankle cuffs about 9 cm above the ground (inside the boot collars, A38).
- The bust (step 05 OPEN 1): the body is smoothed over the bust before the measure and the cling (prepare_body), so
  the suit holds it as one compression form with no anatomical detail.
"""
import math

import numpy as np

import base_layer
import combat_shirt
import legwear
import trousers
from pattern import Panel, Pattern, polyline_length

KIT = 'suit'
SHELL, STRETCH, ABRASION, GRIP, VENT = 'suitShell', 'suitStretch', 'suitAbrasion', 'suitGrip', 'suitVent'

# The base layer's simulation (its knit, the pinned leggings band, the cling with the lap), one material per zone. The
# zone materials keep the knit's values (abrasion and grip a little stiffer in bending): the suit is under tension
# everywhere and stiffer inserts would pucker their outlines in the bind pose.
_K = base_layer.SIM['materials'][base_layer.KNIT]
SIM = {k: v for k, v in base_layer.SIM.items()}
SIM['materials'] = {SHELL: dict(_K), STRETCH: dict(_K), VENT: dict(_K),
                    ABRASION: {**_K, 'bending': 0.35}, GRIP: {**_K, 'bending': 0.35}}
# The cling draws onto a skin faired by 50 Taubin passes (the base layer's 25 showed the abdomen's relief and the
# gluteal cleft through the suit in the first build): a wetsuit bridges hollows, it does not paint into them.
SIM['cling'] = {k: v for k, v in base_layer.SIM['cling'].items() if k != 'lap'}   # no lap: the waist is sewn (A48)
SIM['cling']['bridge'] = 50
# No waistband to pin (A48): the crotch gusset is pinned instead (on its arranged diamond at the crotch, like A15's
# band). Sewn to the top with nothing pinned, the leggings' knit, which shortens in length as it stretches round the
# legs (about 3 cm, see the ankle hem) and grips them, pulled the whole suit 50 mm down and crumpled the mock neck onto
# the neckline; pinning the mock neck tore its seam open (44 mm) and a pinned seam row is not possible (a pinned
# vertex's rest shape is its arranged position, so only whole panels pin). With the gusset held the legs shorten
# toward the ankles, as the base layer's did under its pinned band.
SIM['pin'] = {'panels': ['gusset'], 'sew': 1.0, 'settle': 1.0}
# Fix round 2 (A48 amended): held on its arranged diamond the gusset bridges the crotch more than the cling's 25 mm
# reach off the skin, so it stayed proud and read as a bulge at full figure. The cling reaches 70 mm for the gusset
# panel: it is drawn onto the faired skin with the leg panels round it, one smooth surface into the inner thighs.
SIM['cling']['reach_panels'] = {'gusset': 0.07}
# Fix round 3 (A48 amended again, A45): the cling's faired skin left two stacked lumps of excess cloth on the centre
# front seam above the gusset (up to 19 mm off the skin). Membrane zones
# (build_garment.membrane_zones): the front of the crotch is relaxed as one taut surface held clear of the faired skin
# and drawn in to 3 mm over the standoff. An abdomen zone was tried and dropped: held off the cling's faired skin it
# kept the two dimples (they are in the faired skin), held off the real skin it removed them but showed the rectus
# edges (round 3 item 4, OPEN).
SIM['cling']['zones'] = [
    {'name': 'crotch front', 'x': 0.07, 'z': ('z_crotch', 0.02, 'z_waist', -0.06), 'fall': 0.02, 'relax': 60,
     'max_off': 0.003},
]
SIM['gravity'] = 0.1                # the one piece hangs its legs from the waist ring and the shoulders; the cling seats it
# The base layer's 12 left the settle phase's worst seam at 10.5-11.3 mm on the suit: sewn firmer.
SIM['sewing_force'] = 16.0     # fix round 2: 18 was tried and left the settle's worst seam (inLoL) at 11.6 mm
# Fix round 2, item 3: the lower-leg seams (inLo / outLo) opened from 8-9 mm to 10.5 mm in the settle, where self
# collision comes on; on the narrow calf the band kept out of it (2 rings each side of a seam) is too thin and self
# collision held the seam's two sides apart. 4 rings on the suit.
SIM['seam_self_rings'] = 4

# The top's cut (A51): the base layer's, 4 % longer. A free compression top shortens about 12 % along its length in the
# mass-spring knit (its girth stretch pulls the length in: the base layer's hem rode 7-8 cm up); sewn to the leggings
# at the waist it cannot ride up, so at the base layer's length it pulled the neckline down and laid the mock neck over.
TOP_CUT = {**base_layer.TOP_CUT, 'knit_ease_v': 0.04}

TAPE_W, TAPE_T = 0.008, 0.0006       # bonded seam tape: width, height proud of the shell


def _rounded_rect(x0, x1, y0, y1, r, n=6):
    pts = []
    for cx, cy, a0 in ((x1 - r, y1 - r, 0.0), (x0 + r, y1 - r, 90.0), (x0 + r, y0 + r, 180.0), (x1 - r, y0 + r, 270.0)):
        for a in np.radians(np.linspace(a0, a0 + 90.0, n)):
            pts.append([cx + r * math.cos(a), cy + r * math.sin(a)])
    return np.array(pts)


def _yoke_outline(hw, y0, r, n=8):
    """The shoulder yoke on a raglan sleeve (fix round 1, item 4): a rounded end at y0 on the shoulder point, its front
    and back lines rising straight for r and then flaring out at 45 degrees, so they cross the raglan seams steeply
    and meet their tape (a line nearly parallel to the converging raglan edge stopped centimetres short of it, under
    the tape-clearance rule, and read as a stub). The outline closes far outside the panel, where it has no tape."""
    pts = []
    for a in np.radians(np.linspace(180.0, 270.0, n)):           # back-bottom corner (x < 0)
        pts.append([-hw + r + r * math.cos(a), y0 + r + r * math.sin(a)])
    for a in np.radians(np.linspace(270.0, 360.0, n)):           # front-bottom corner (x > 0)
        pts.append([hw - r + r * math.cos(a), y0 + r + r * math.sin(a)])
    ys = y0 + r + 0.01
    pts += [[hw, ys], [hw + 0.12, ys + 0.12], [-hw - 0.12, ys + 0.12], [-hw, ys]]
    return np.array(pts)


def _ellipse(cx, cy, rx, ry, n=36):
    t = np.linspace(0.0, 2 * math.pi, n, endpoint=False)
    return np.stack([cx + rx * np.cos(t), cy + ry * np.sin(t)], axis=1)


def _zip_path_front(front, hw_b, y_b, s):
    """The chest zip on the front panel (+x is the wearer's left): from the neckline 3 cm left of the centre, down
    between the breasts, then sweeping under the right breast to the right ribs. Chaikin-rounded."""
    neck = front.run('nkL', 'cfn')[0]
    x0 = 0.03 * s
    order = np.argsort(neck[:, 0])
    y0 = float(np.interp(x0, neck[order, 0], neck[order, 1]))
    pts = np.array([[x0, y0 + 0.004], [0.004 * s, y_b + 0.02 * s], [-0.045 * s, y_b - 0.065 * s],
                    [-0.62 * hw_b, y_b - 0.105 * s]])
    for _ in range(3):
        q = pts[1:]
        p = pts[:-1]
        mid = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], axis=1).reshape(-1, 2)
        pts = np.vstack([pts[:1], mid, pts[-1:]])
    return pts


def _split_hem(p, rise):
    """The top's front or back panel with its hem edge split at the centre (corner 'hemC'), so each half can be sewn
    to one leg panel's top run (A48), and shaped to that run's rise (A51): the hem half rises from the side (y = 0) to
    the centre (y = rise) on the leg top's own profile, so the waist seam is drafted level on both sides and the seam
    pulls neither the top down at the centre front nor the leggings into a pinch at the centre back.
    combat_shirt.torso: the first edge is the hem, from x = -hw to +hw at y = 0."""
    name, pl = p.edges[0]
    pl = np.asarray(pl, float)
    assert name.startswith('hem') and abs(pl[0, 1]) < 1e-9 and abs(pl[-1, 1]) < 1e-9
    t = np.linspace(0.0, 1.0, 16)
    yr = rise * legwear.top_profile(t, {'top_curve': 'smooth'})
    a = np.stack([pl[0, 0] * (1.0 - t), yr], axis=1)
    b = np.stack([pl[-1, 0] * t, yr[::-1]], axis=1)
    return Panel(p.name, p.material, [(name, a), ('hemC', b)] + list(p.edges[1:]), p.grain)


def _x_extent(panel, y):
    """The panel's outline crossings of the horizontal line at y: (x_min, x_max)."""
    P = np.concatenate([np.asarray(pl, float)[:-1] for _, pl in panel.edges])
    Q = np.roll(P, -1, axis=0)
    xs = []
    for a, b in zip(P, Q):
        if (a[1] - y) * (b[1] - y) <= 0 and abs(b[1] - a[1]) > 1e-12:
            xs.append(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]))
    return (min(xs), max(xs)) if xs else (0.0, 0.0)


def draft(m, h=0.011):
    s = m['height'] / 1.68
    # --- The waist block (A48): leggings without a band, their top runs drafted to the top's hem -------------------
    o = base_layer.leggings_cut(m)
    # A38: the ankle cuff ends about 9 cm above the ground (the knit settles about 3 cm above its drafted hem).
    o['z_hem'] = m['z_ankle'] - 0.03 * s   # first build at -1.2 cm settled 9.5-13 cm: too high for A38
    o['material'] = o['gusset_material'] = o['band_material'] = SHELL
    o['band_h'] = 0.0                      # no waistband: the top's hem is sewn to the leg panels' tops
    o['top_curve'] = 'smooth'              # level at the centre seams (A51): no V at the centre front
    rise = legwear.draft_legs(m, o, h)[2]['crotch']['rise']   # the leg tops' rise at the centre (solved, A15)
    mt = dict(m)
    mt['z_hem'] = o['z_top']               # the waist seam: where the leggings' top was (the base layer's band)
    rows = np.asarray(m['torso_rows'], float)
    mt['circ_hem'] = float(np.interp(mt['z_hem'], rows[:, 0], rows[:, 1]))
    mt['collar_h'] = 0.055 * s          # the close mock neck (5-6 cm, step file); the hood skirt laps over it
    mt['sleeve_under'] = m['sleeve_under'] + 0.006 * s
    mt['sleeve_elbow'] = m['sleeve_elbow'] + 0.006 * s
    top, top_details, info = combat_shirt.draft(mt, h, ease=TOP_CUT)
    for p in top.panels.values():
        p.material = SHELL
    top.panels['front'] = _split_hem(top.panels['front'], rise['front'])
    top.panels['back'] = _split_hem(top.panels['back'], rise['back'])
    hf = float(polyline_length(top.panels['front'].run('hemR', 'hemC')[0]))
    hb = float(polyline_length(top.panels['back'].run('hemR', 'hemC')[0]))
    half_hem = 0.5 * (hf + hb)
    # Solve the leg panels' tops to the hem halves: front and back equal (hip_split) and both equal to half_hem (the
    # top hip ease), so the waist seam pairs equal runs and the side seams meet.
    o['hip_split'], ease_top = 0.0, o['hip_ease'][1]
    for _ in range(4):
        o['hip_ease'] = (o['hip_ease'][0], ease_top)
        legs, leg_seams, geo, arrange = legwear.draft_legs(m, o, h)
        P = {p.name: p for p in legs}
        lf = float(polyline_length(P['frontL'].run('T_S', 'T_I')[0]))
        lb = float(polyline_length(P['backL'].run('T_S', 'T_I')[0]))
        o['hip_split'] += ((lf - lb) - (hf - hb)) / (2.0 * s)
        ease_top *= half_hem / (0.5 * (lf + lb))
    info = dict(info)
    info['waist'] = {'halfHemFrontM': round(hf, 4), 'halfHemBackM': round(hb, 4), 'riseM': rise, 'legTopFrontM': round(lf, 4), 'legTopBackM': round(lb, 4),
                     'hipSplit': round(o['hip_split'], 4), 'hipEaseTop': round(ease_top, 4)}
    print(f"operators: suit waist seam: hem halves front {hf * 100:.1f} / back {hb * 100:.1f} cm, leg tops front {lf * 100:.1f} / back "
          f"{lb * 100:.1f} cm (hip split {o['hip_split'] * 100:.2f} cm, top hip ease {ease_top:.3f})", flush=True)
    waist = []
    for pn in ('front', 'back'):
        for sd in ('L', 'R'):
            waist.append((f'waist{pn.title()}{sd}', (pn, f'hem{sd}', 'hemC'), (f'{pn}{sd}', 'T_S', 'T_I'), 'bonded'))
    seams = [(n, a, b, 'bonded') for n, a, b, _ in list(top.seams) + list(leg_seams)] + waist
    pattern = Pattern(list(top.panels.values()) + legs, seams, h)

    # --- Zones (seamed-in inserts, A16) ------------------------------------------------------------------------------
    inserts = []

    def ins(name, panel, material, outline, job):
        inserts.append({'name': name, 'panel': panel, 'material': material,
                        'outline': np.asarray(outline, float).tolist(), 'job': job})
    wc, we, wb = info['sleeve_w']
    lu, yel = mt['sleeve_under'], mt['sleeve_elbow']
    sl_panel = {sd: top.panels[f'sleeve{sd}'] for sd in ('L', 'R')}
    for sd, bs in (('L', 1.0), ('R', -1.0)):         # bs: the sign of the sleeve's back edge (combat_shirt.sleeve)
        pn = f'sleeve{sd}'
        top_y = min(info['top'][sd].values())
        y_yoke = lu + 0.5 * (top_y - lu)
        ins(f'forearmGrip{sd}', pn, GRIP,
            _rounded_rect(bs * 0.01 * s - 0.032 * s, bs * 0.01 * s + 0.032 * s, 0.05 * s, yel - 0.065 * s, 0.012 * s),
            'rubberised grip on the outer forearm: crawling, vents, wall contact')
        ins(f'elbow{sd}', pn, ABRASION, _ellipse(bs * 0.035 * s, yel + 0.004 * s, 0.036 * s, 0.05 * s),
            'abrasion weave over the elbow point')
        ins(f'innerElbow{sd}', pn, STRETCH, _ellipse(-bs * 0.075 * s, yel, 0.028 * s, 0.04 * s),
            'stretch knit in the crook of the elbow')
        # Shoulder yoke (fix round 1, item 4; A2-chest): a band over the top of the shoulder, 5.5 cm either side of the
        # shoulder line, from the neck out to a rounded end on the shoulder point. Its front and back lines run up into
        # the raglan seams; above them the band's outline lies outside the panel (no tape there).
        y_lo = lu + 0.35 * (top_y - lu)
        ins(f'yoke{sd}', pn, ABRASION, _yoke_outline(0.055 * s, y_lo, 0.03 * s),
            'shoulder yoke in the abrasion weave (strap and wall wear)')
        # Rear shoulder: a closed ellipse on the sleeve's back half, below the yoke and clear of the raglan seam.
        y0, y1 = lu - 0.01 * s, y_lo - 0.015 * s
        xb = min(abs(_x_extent(sl_panel[sd], y)[1 if bs > 0 else 0]) for y in np.linspace(y0, y1, 6))
        rx = 0.5 * (xb - 0.035 * s - 0.015 * s)
        ins(f'rearShoulder{sd}', pn, STRETCH, _ellipse(bs * (0.035 * s + rx), 0.5 * (y0 + y1), rx, 0.5 * (y1 - y0)),
            'stretch knit over the rear shoulder (reach forward and overhead)')
    e = 1.0 + base_layer.TOP_CUT['knit_ease']
    hw_b, hw_ua = m['circ_bust'] / 4.0 * e, m['circ_ua'] / 4.0 * e
    v = 1.0 + TOP_CUT['knit_ease_v']    # pattern heights on the torso (combat_shirt scales them)
    y_b, y_ua = (mt['z_bust'] - mt['z_hem']) * v, (mt['z_ua'] - mt['z_hem']) * v
    # Underarm vents (fix round 1, item 4): one ellipse centred on the side seam, its front and back halves the inserts
    # on the front and back panels; each half's curve runs from the side seam round and back into it (no stubs).
    for pn in ('front', 'back'):
        for sg in (1.0, -1.0):
            side = ('L' if sg > 0 else 'R') if pn == 'front' else ('R' if sg > 0 else 'L')
            yc = y_b - 0.04 * s
            xc = sg * _x_extent(top.panels[pn], yc)[1]
            ins(f'vent{side}{pn.title()}', pn, VENT, _ellipse(xc, yc, 0.05 * s, 0.085 * s, 48),
                'laser-perforated vent in the underarm side panel')
    xs, xi = geo['x_side'], geo['x_inner']
    y_k = geo['y_k']

    def mid(part, y, f=0.5):
        return float(xi(part, y) + f * (xs(part, y) - xi(part, y)))
    for sd in ('L', 'R'):
        fx = -1.0 if sd == 'R' else 1.0             # frontR is mirrored
        bx = -1.0 if sd == 'L' else 1.0             # backL is mirrored
        ins(f'kneeGrip{sd}', f'front{sd}', GRIP,
            _ellipse(fx * mid('front', y_k, 0.5), y_k + 0.005 * s, 0.047 * s, 0.068 * s),
            'rubberised grip over the knee (kneeling, crawling)')
        W = float(xs('back', y_k) - xi('back', y_k))
        ins(f'kneeVent{sd}', f'back{sd}', VENT,
            _ellipse(bx * mid('back', y_k), y_k, W / 2 - 0.03 * s, 0.05 * s),
            'laser-perforated vent behind the knee')
        seat = trousers.seat_outline(xi, xs, geo, s, inset=0.0) * np.array([bx, 1.0])
        ins(f'seat{sd}', f'back{sd}', ABRASION, seat, 'abrasion weave over the seat')

    details = {
        'hems': [(pn, 'H_I', 'H_S') for pn in ('frontL', 'frontR', 'backL', 'backR')],
        'cuffs': top_details['cuffs'],
        'bandTops': [],
        'collarTop': top_details['collarTop'],
        'zip': None,
        'patches': [],
        'flatHems': True,
        'inserts': inserts,
        'bonded': {'width': TAPE_W, 'thick': TAPE_T, 'cuff_width': 0.012},
        'suit': {
            'zip': {'front': _zip_path_front(top.panels['front'], hw_b, y_b, s).tolist(),
                    'collar_x': 0.03 * s, 'collar_h': mt['collar_h']},
        },
    }
    info['legs'] = arrange
    info['leg_geometry'] = geo
    return pattern, details, info


# --- Body preparation (build_garment, before the measure) ------------------------------------------------------------

def prepare_body(body, J, H):
    """Step 05 OPEN 1: under a compression suit the bust is one smooth form. The body's skin over each breast (within
    5.5 cm of its most forward point) is relaxed toward its local average and never moved outward, so the nipple and
    areola relief are gone before the suit is measured and drawn on. Returns the number of vertices moved."""
    me = body.data
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get('co', co)
    V = co.reshape(-1, 3).copy()
    E = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get('vertices', E)
    E = E.reshape(-1, 2)
    deg = np.maximum(np.bincount(E.ravel(), minlength=n), 1)
    s = H / 1.68
    ch = np.asarray(J['chest'], float)
    moved = np.zeros(n, bool)
    W = np.zeros(n)
    for sg in (1.0, -1.0):
        reg = ((V[:, 0] * sg > 0.03 * s) & (V[:, 0] * sg < 0.16 * s) & (np.abs(V[:, 2] - (ch[2] - 0.02 * s)) < 0.12 * s)
               & (V[:, 1] < ch[1] - 0.02))
        if not reg.any():
            continue
        apex = V[np.where(reg)[0][np.argmin(V[reg, 1])]]
        d = np.linalg.norm(V - apex, axis=1)
        W = np.maximum(W, np.clip((0.055 * s - d) / (0.03 * s), 0.0, 1.0) * reg)
    V0 = V.copy()
    for _ in range(25):
        acc = np.zeros_like(V)
        np.add.at(acc, E[:, 0], V[E[:, 1]])
        np.add.at(acc, E[:, 1], V[E[:, 0]])
        avg = acc / deg[:, None]
        V = V + (0.5 * W)[:, None] * (avg - V)
    V[:, 1] = np.maximum(V[:, 1], V0[:, 1])      # never outward (the front is -y): the bust only settles in
    # The abdomen (fix round 1, item 5; A45 extended): the rectus ridges and the navel read through the suit. Between
    # the hips and the bust's underside, the front of the torso is relaxed as one smooth form: the ridges settle in (at
    # most 8 mm) and the navel and the grooves between the ridges fill (at most 15 mm out; the body the game ships is
    # this prepared body, so nothing of the old shape stands outside the suit).
    hip = np.asarray(J['hipL'], float)
    z_lo, z_hi = hip[2] + 0.03 * s, ch[2] + 0.02 * s   # fix round 1: chest - 0.12 left the upper ridges (to 1.15 m)
    zc, hz = 0.5 * (z_lo + z_hi), 0.5 * (z_hi - z_lo) + 0.02 * s
    q = np.sqrt((V0[:, 0] / (0.115 * s)) ** 2 + ((V0[:, 2] - zc) / hz) ** 2)
    Wa = np.clip((1.2 - q) / 0.35, 0.0, 1.0) * (V0[:, 1] < ch[1] - 0.03 * s)
    Wa = Wa * Wa * (3 - 2 * Wa)
    if Wa.any():
        # Plain Laplacian passes, clamped to 8 mm in and 15 mm out (fix round 1: Taubin pairs are a band-pass that keeps
        # features as broad as the rectus ridges, 5-7 cm, and left them reading in e): the suit spans the ridges as one
        # membrane, the grooves and the navel fill.
        for _ in range(200):
            acc = np.zeros_like(V)
            np.add.at(acc, E[:, 0], V[E[:, 1]])
            np.add.at(acc, E[:, 1], V[E[:, 0]])
            V = V + (0.5 * Wa)[:, None] * (acc / deg[:, None] - V)
            V[:, 1] = np.clip(V[:, 1], V0[:, 1] - 0.015, V0[:, 1] + 0.008)
            V[:, [0, 2]] = np.clip(V[:, [0, 2]], V0[:, [0, 2]] - 0.004, V0[:, [0, 2]] + 0.004)   # little slide
    # The lumbar groove (fix round 1, item 6): the suit spans the spine's groove between the sacrum and the shoulder
    # blades, so the centre-back seam runs down it straight. The back of the torso within 5 cm of the spine is relaxed
    # outward only (at most 10 mm; the back is +y).
    zb0, zb1 = hip[2] + 0.06 * s, ch[2] + 0.06 * s
    qb = np.sqrt((V0[:, 0] / (0.05 * s)) ** 2 + ((V0[:, 2] - 0.5 * (zb0 + zb1)) / (0.5 * (zb1 - zb0))) ** 2)
    Wb = np.clip((1.2 - qb) / 0.4, 0.0, 1.0) * (V0[:, 1] > ch[1] + 0.03 * s)
    Wb = Wb * Wb * (3 - 2 * Wb)
    if Wb.any():
        for _ in range(120):
            acc = np.zeros_like(V)
            np.add.at(acc, E[:, 0], V[E[:, 1]])
            np.add.at(acc, E[:, 1], V[E[:, 0]])
            V = V + (0.5 * Wb)[:, None] * (acc / deg[:, None] - V)
            V[:, 1] = np.clip(V[:, 1], V0[:, 1], V0[:, 1] + 0.010)
            V[:, [0, 2]] = np.clip(V[:, [0, 2]], V0[:, [0, 2]] - 0.003, V0[:, [0, 2]] + 0.003)
    moved = np.linalg.norm(V - V0, axis=1) > 1e-5
    me.vertices.foreach_set('co', V.ravel())
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            kco = np.empty(n * 3)
            kb.data.foreach_get('co', kco)
            kco = kco.reshape(-1, 3)
            kco[moved] = V[moved]
            kb.data.foreach_set('co', kco.ravel())
    me.update()
    return int(moved.sum())


# --- Closures and loops on the detailed surface (garment_details, after the tapes) ----------------------------------

def finish(ctx):
    """The chest zip (coil, tape, slider, flush puller) parked in a zip garage at the collar top, and the thumb loops.
    ctx: surf (pattern -> surface lookup), add_mesh, reuse, MAT, FT, body, J, D, stats. Returns a report dict."""
    surf, FT, D, J = ctx['surf'], ctx['FT'], ctx['D'], ctx['J']
    zs = D['suit']['zip']
    rep = {}
    # Zip path: up the collar from its top (the garage) to the neckline, then the front panel's diagonal.
    pts, nrm = [], []
    for y in np.linspace(zs['collar_h'] - 0.004, 0.0, 14):   # fix round 3, item 2: from 4 mm under the top (was 6)
        r = surf('collar', (zs['collar_x'], y))
        if r is not None:
            pts.append(r[0])
            nrm.append(r[1])
    front = np.asarray(zs['front'], float)
    from pattern import resample, polyline_length
    for q in resample(front, max(8, int(polyline_length(front) / 0.004))):
        r = surf('front', q)
        if r is not None:
            pts.append(r[0])
            nrm.append(r[1])
    P = FT.smooth_polyline(np.array(pts), 3)
    N = np.array(nrm)
    N /= np.linalg.norm(N, axis=1, keepdims=True)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    L = float(cum[-1])
    rep['zipLengthM'] = round(L, 3)

    def at(sv):
        i = int(np.clip(np.searchsorted(cum, sv) - 1, 0, len(P) - 2))
        f = (sv - cum[i]) / max(seg[i], 1e-9)
        c = P[i] + (P[i + 1] - P[i]) * f
        n = N[i] + (N[i + 1] - N[i]) * f
        n /= np.linalg.norm(n)
        t = (P[i + 1] - P[i]) / max(seg[i], 1e-9)
        t = t - n * (t @ n)
        t /= np.linalg.norm(t)
        return c, t, np.cross(n, t), n
    # bonded zip tape (wider than the seam tape) under the coil
    TV, TF = [], []
    sv = np.arange(0.0, L, 0.003)
    cs, ns_, bs_ = [], [], []
    for x in sv:
        c, t, b, n = at(x)
        cs.append(c + n * 0.0002)
        ns_.append(n)
        bs_.append(b)
    FT.tape(TV, TF, cs, ns_, bs_, 0.014, 0.0005)
    # coil: alternating moulded elements either side of the centre line
    CV, CF = [], []
    k = 0
    for x in np.arange(0.004, L - 0.004, 0.0024):
        c, t, b, n = at(x)
        side = 1 if k % 2 else -1
        FT.box(CV, CF, c + n * 0.0006 + b * side * 0.0007, t, b, n, (0.0016, 0.0036, 0.0011), 0.35)
        k += 1
    rep['zipElements'] = k
    # slider at the top end (closed), its puller folded flat down the zip, both in gunmetal; the garage over them
    # (fix round 1, item 3: slider, puller and garage moved up to the collar's top 2.4 cm, which the hood skirt covers)
    # (fix round 3, item 2: parked higher and the garage shortened to 20 mm, so that with the skirt's lower front edge
    # (headwear SKIRT_FRONT_SUIT) the garage ends at least 10 mm inside the skirt)
    MV, MF = [], []
    c, t, b, n = at(0.0055)
    FT.box(MV, MF, c + n * 0.0009, -t, b, n, (0.010, 0.009, 0.0032), 0.3)
    c2, t2, b2, n2 = at(0.0115)
    FT.box(MV, MF, c2 + n2 * 0.0036, -t2, b2, n2, (0.009, 0.0062, 0.0013), 0.25)
    GV, GF = [], []
    cg, tg, bg, ng = at(0.0095)
    FT.box(GV, GF, cg + ng * 0.0005, -tg, bg, ng, (0.020, 0.018, 0.0052), 0.42)
    rep['garageAtM'] = [round(float(x), 4) for x in cg]
    add, reuse, MAT = ctx['add_mesh'], ctx['reuse'], ctx['MAT']
    op = ctx['op_id']
    add(f'{op}-suit-zip-tape', TV, TF, reuse(MAT.seam_tape, 'suit seam tape'))
    add(f'{op}-suit-zip', CV, CF, reuse(MAT.polymer, 'zip teeth'), smooth=False, bevel=True)
    add(f'{op}-suit-zip-slider', MV, MF, reuse(MAT.anodised, 'gunmetal', colour=(0.05, 0.052, 0.056)), smooth=False,
        bevel=True)
    add(f'{op}-suit-zip-garage', GV, GF, reuse(MAT.suit_shell, 'suit shell'), smooth=True, bevel=True)

    # Thumb loops: an elastic band from the cuff's palm side through the thumb web to the cuff's back, on the skin
    # (0.3 mm off it, 0.6 mm thick: inside the glove's 2.2 mm, gloves.GAP).
    body, skin = ctx['body'], ctx['skin']
    groups = {g.index: g.name for g in body.vertex_groups}
    BVb = np.array([v.co[:] for v in body.data.vertices])
    dom = np.array([groups[max(v.groups, key=lambda g: g.weight).group] if len(v.groups) else '' for v in body.data.vertices])
    LV, LF = [], []
    loops = 0
    for sd in ('L', 'R'):
        wr, hd = np.asarray(J[f'wr{sd}'], float), np.asarray(J[f'hand{sd}'], float)
        af = (hd - wr) / np.linalg.norm(hd - wr)
        ds = dom.astype(str)
        thumb, index = BVb[ds == f'finger{sd}_1_1'], BVb[ds == f'finger{sd}_2_1']
        if not len(thumb) or not len(index):
            continue
        loc, _, _, _ = skin.find_nearest(0.5 * (thumb.mean(axis=0) + index.mean(axis=0)))
        web = np.array(loc)
        tdir = (web - wr) - af * ((web - wr) @ af)
        tdir /= np.linalg.norm(tdir)
        pdir = np.cross(af, tdir)
        cuff = ctx['cuff_points'].get(sd)
        if cuff is None or len(cuff) < 4:
            continue
        A = cuff[np.argmax((cuff - wr) @ (tdir + pdir))]
        B = cuff[np.argmax((cuff - wr) @ (tdir - pdir))]
        path = [A, (A + web) / 2 + pdir * 0.01, web, (B + web) / 2 - pdir * 0.01, B]
        pts = []
        for q in np.linspace(0, 1, 40):
            seg_i = min(int(q * 4), 3)
            f = q * 4 - seg_i
            p = path[seg_i] + (path[seg_i + 1] - path[seg_i]) * f
            loc, nn, _, _ = skin.find_nearest(p)
            pts.append((np.array(loc) + np.array(nn) * 0.0003, np.array(nn)))
        Pq = FT.smooth_polyline(np.array([p for p, _ in pts]), 2)
        Nq = np.array([nn for _, nn in pts])
        Tq = np.gradient(Pq, axis=0)
        Bq = np.cross(Nq, Tq)
        Bq /= np.maximum(np.linalg.norm(Bq, axis=1, keepdims=True), 1e-9)
        # Fix round 2: the smoothed path and the flat 9 mm ribbon bridged the concave thumb web, standing off the skin
        # far enough to clip through the glove. Every ribbon vertex is laid back onto the skin at its profile height
        # (0.3 mm plus the dome, now 0.5 mm: 0.8 mm at most, under the glove's 1.3 mm inner wall).
        b0 = len(LV)
        FT.tape(LV, LF, Pq, Nq, Bq, 0.009, 0.0005)
        prof_h = (-0.0002, 0.45, 0.9, 1.0, 0.9, 0.45, -0.0002)
        for vi in range(b0, len(LV)):
            loc, nn, _, _ = skin.find_nearest(LV[vi])
            if loc is not None:
                h = 0.0003 + max(prof_h[(vi - b0) % 7], 0.0) * 0.0005
                LV[vi] = np.array(loc) + np.array(nn) * h
        loops += 1
    rep['thumbLoops'] = loops
    if LV:
        add(f'{op}-suit-thumb-loops', LV, LF, reuse(MAT.elastic, 'suit thumb loop elastic'))
    return rep
