"""Wren's base layer (ART-DIRECTION 3; SPEC 5.1): a thin compression top and leggings, close knit, drafted at negative
ease, built first; the combat shirt and the trousers are drafted over it and pushed clear of it after their
simulation (build_garment layer_push; DECISIONS A11). Seen only at the collar and cuffs.

- Top: the combat shirt's block (combat_shirt.draft) re-cut for compression: negative ease in girth and length, no
  cuff room, a taller mock neck that stands about a centimetre above the shirt collar, every panel in the
  compression knit, flatlock seams throughout (no zip, no pockets).
- Leggings: the leg block (legwear.draft_legs): front and back per leg, a diamond crotch gusset, an elastic waistband
  that the top's hem laps over; ankle hems just above the ankle bone.
"""
import copy

from pattern import Pattern
import combat_shirt
import legwear

KIT = 'baseLayer'
KNIT = 'compression'

# Compression knit: thin but firmer in stretch than the shirt's torso knit; the stiffer entries are doubled bands.
# Gravity is scaled down: the pipeline's vertex mass (0.1, for solver stability) is far heavier than real fabric, and
# legwear hangs from the hips, not the shoulders - at full gravity the leggings slid 15 cm down the legs (test run).
SIM = {
    'mass': 0.1,
    'gravity': 0.3,
    'materials': {KNIT: {'tension': 14.0, 'shear': 4.0, 'bending': 0.25}},
    'panels': {'collar': {'tension': 20.0, 'shear': 6.0, 'bending': 1.5},
               'waistband': {'tension': 40.0, 'shear': 10.0, 'bending': 2.0}},
    'patches': {},
    'sewing_force': 12.0,
    'quality': 16, 'collision_quality': 4,
    'collision': {'body': 0.0015, 'cloth': 0.0015},
    'air_damping': 1.0, 'spring_damping': 5.0,
    'friction': 4.0,
    # The leggings' elastic band is held on its drafted ring (build_garment 'pin'; A15); the knit is drawn onto the skin
    # after the simulation (build_garment 'cling'), the top's hem one layer out where it laps over the band.
    'pin': {'panels': ['waistband'], 'sew': 1.0, 'settle': 1.0},
    # 'bridge': drawn onto a faired skin (25 Taubin passes) and 'guard': then only pushed 1.5 mm clear of the real skin
    # (step 05 fix round 2). Open: the nipples still read - the fairing is per edge and the body's mesh is dense there;
    # 40 passes with a broad guard dome did not remove them and the shirt sewn over that base layer settled with a
    # 15 mm seam gap (check fails), so these are the settings of the passing build.
    'cling': {'standoff': 0.0035, 'reach': 0.025, 'iters': 4, 'bridge': 25, 'guard': 0.0015,
              'lap': {'under': 'waistband', 'over': ['front', 'back']}},
}

# Negative ease, kept small: in the triangulated mass-spring cloth a girth stretch pulls the length in (diagonal springs
# couple the directions). Test runs: -6 % girth made the leggings 12 % shorter (the waistband fell to the crotch) and
# -4.5 % made the top ride 8 cm up. At -1.5 to -3 % the knit lies flat on the skin and keeps its length.
TOP_CUT = {'knit_ease': -0.03, 'knit_ease_v': 0.0, 'sleeve_ease': 0.97, 'cuff_room': 0.0}


def leggings_cut(m):
    s = m['height'] / 1.68
    return {
        'z_hem': m['z_ankle'] + 0.005 * s,          # settles about 3 cm higher (the knit's girth stretch shortens it)
        'z_top': m['z_waist'] - 0.09 * s,           # the waistband sits under the top's hem (it laps over)
        'dart': None,
        'front_share': 0.47,
        'hip_split': 0.008,
        'leg_ease': (0.985, 0.985, 0.985),          # hem, knee, crotch
        'hip_ease': (0.985, 0.985),                 # crotch, top
        'smooth': 0.05,
        'rise': (0.03, 0.06), 'crotch_ease': (0.0, 0.0),
        'gusset_drop': 0.05, 'gusset_half_w': 0.03, 'centre_lift': (0.02, 0.04),
        'material': KNIT, 'gusset_material': KNIT, 'band_material': KNIT,
        'seam_styles': ('flatlock', 'flatlock', 'flatlock'),
        'band_h': 0.03, 'band_ratio': 0.88,         # elastic waistband: gathers the panel tops
        'arrange_offset': 0.004, 'standoff': 0.005,
    }


def draft(m, h=0.011):
    s = m['height'] / 1.68
    mt = dict(m)
    mt['collar_h'] = 0.058 * s          # stands about 1 cm above the shirt's 4.5 cm collar
    mt['sleeve_under'] = m['sleeve_under'] + 0.006 * s
    mt['sleeve_elbow'] = m['sleeve_elbow'] + 0.006 * s
    top, top_details, info = combat_shirt.draft(mt, h, ease=TOP_CUT)
    for p in top.panels.values():
        p.material = KNIT
    seams = [(n, a, b, 'flatlock' if st in ('topstitch1', 'topstitch2', 'zip') else st) for n, a, b, st in top.seams]

    o = leggings_cut(m)
    panels, leg_seams, geo, arrange = legwear.draft_legs(m, o, h)
    pattern = Pattern(list(top.panels.values()) + panels, seams + leg_seams, h)

    details = copy.deepcopy(top_details)
    details['zip'] = None
    details['patches'] = []
    details['flatHems'] = True       # compression hems are coverstitched flat (no folded plateau)
    details['hems'] += [(pn, 'H_I', 'H_S') for pn in ('frontL', 'frontR', 'backL', 'backR')]
    details['bandTops'] = [('waistband', 't4', 't0')]
    info = dict(info)
    info['legs'] = arrange
    info['leg_geometry'] = geo
    return pattern, details, info
