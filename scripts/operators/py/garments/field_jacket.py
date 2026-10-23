"""Guard jackets (docs/guard-models PLAN G2, SPEC 4): the officer's short field jacket (`uniform_jacket`, part `jacket`,
over the field shirt and the trousers' waist on `average`) and the runner's zip-front work jacket (`work`, part
`work_jacket`, variant `work`, A11: no faction tint, worn on the skin over the work trousers' waist).

Drafted on the combat shirt's block (combat_shirt.draft with the jacket's own ease: raglan sleeves with the articulated
elbow, underarm knit gussets, a stand collar), re-cut as an outer layer:
- field jacket: ripstop, roomy over the shirt (+10 % girth, sleeves +15 % and 1 cm longer, a wide cuff over the shirt
  cuff), a 5 cm stand collar over the shirt's collar, a full-length front zip, two lower patch pockets with plain flaps,
  plain shoulder straps on the raglan tops, cuff tabs; twin-needle side seams; the hem hangs free (not tucked);
- work jacket: soft-shell canvas, a low 3.5 cm collar, the full zip, two slanted hip pockets without flaps, cuff tabs.
Original designs: no badges, text, insignia or rank marks (SPEC 11).

Built by guard_garment.py (build_garment.py + garment_details.py) over copies of the layers under it (the shirt and the
trousers, or the work trousers): drafted with a layer allowance (UNDER_LAYERS) and pushed clear of them after the
simulation; its cloth gap is wider than the shirt's so the shirt's chest pockets stay under it.
Pattern space as combat_shirt.py.
"""
if __name__ == '__main__':   # guard bake job: py/ and py/garments/ on the path before the imports below
    import os as _os
    import sys as _sys
    _here = _os.path.dirname(_os.path.abspath(__file__))
    _sys.path[:0] = [_here, _os.path.dirname(_here)]
import copy

import combat_shirt as CS
from combat_shirt import KNIT, RIPSTOP

KIT = 'jacket'
SOFT = 'softshell'
GUARD = None   # configure(): {'part', 'variant', 'prefix'}
JACKET_CUT = {'knit_ease': 0.10, 'knit_ease_v': 0.0, 'sleeve_ease': 1.15, 'cuff_room': 0.05}

# Cloth: the combat shirt's settings with heavier woven panels; no tuck (the hem hangs over the trousers' waist). The
# cloth gap is 3.5 mm (shirt 1.5 mm): the layer step the jacket is pushed clear of the layers under it is the gap plus
# 1.1 mm (build_garment LAYER_T), 6.1 mm here, over the 3-5 mm the shirt's pockets and the trousers' belt loops stand.
SIM = {
    'mass': 0.1,
    'gravity': 1.0,
    'materials': {
        KNIT: {'tension': 10.0, 'shear': 4.0, 'bending': 0.3},
        RIPSTOP: {'tension': 45.0, 'shear': 12.0, 'bending': 4.0},
        SOFT: {'tension': 40.0, 'shear': 12.0, 'bending': 5.0},
    },
    'panels': {'collar': {'tension': 60.0, 'shear': 20.0, 'bending': 12.0}},
    'patches': {'pocket': {'bending': 8.0, 'shear': 16.0}, 'flap': {'bending': 8.0}, 'tab': {'bending': 8.0}},
    'sewing_force': 12.0,
    'quality': 16, 'collision_quality': 4,
    'collision': {'body': 0.0015, 'cloth': 0.0035},
    'air_damping': 1.0, 'spring_damping': 5.0,
    'friction': 2.0,
    'fair': {'iters': 20, 'panels': ['front', 'back'], 'edges': False},
}
# Layers under the jacket (build_garment allowance): the shirt (or, for the work jacket, nothing on the torso but the
# trousers' waist at the hem), and at the hem the trousers' band as well.
UNDER_LAYERS = {'default': 1, 'circ_hem': 2}


def configure(part, variant=None, prefix=None, **_):
    """Guard mode for this module copy (guard_garment.load_part). variant 'work': the runner's work jacket."""
    global GUARD, KIT, SIM, UNDER_LAYERS
    if variant not in (None, 'work'):
        raise SystemExit(f'field_jacket: unknown variant {variant!r} (work)')
    GUARD = {'part': part, 'variant': variant, 'prefix': prefix or part}
    KIT = part
    SIM = copy.deepcopy(SIM)
    if variant == 'work':
        UNDER_LAYERS = {'default': 0, 'circ_hem': 1}   # on the skin; the work trousers' waist under the hem


def draft(m, h=0.011):
    g = GUARD or {'part': KIT, 'variant': None, 'prefix': KIT}
    work = g['variant'] == 'work'
    s = m['height'] / 1.68
    mt = dict(m)
    mt['collar_h'] = (0.035 if work else 0.05) * s
    mt['sleeve_under'] = m['sleeve_under'] + 0.01 * s     # over the shirt cuff (and the glove cuff)
    mt['sleeve_elbow'] = m['sleeve_elbow'] + 0.01 * s
    pattern, details, info = CS.draft(mt, h, ease=JACKET_CUT)
    shell = SOFT if work else RIPSTOP
    for p in pattern.panels.values():
        if not p.name.startswith('gusset'):
            p.material = shell
    pattern.seams = [(n, a, b, 'topstitch2' if st == 'flatlock' and n.startswith('side') else st)
                     for n, a, b, st in pattern.seams]
    kit = g['part']
    details['patches'] = [p for p in details['patches'] if p['name'].startswith(('zipGarage', 'cuffTab'))]
    for p in details['patches']:
        p['kit'] = kit
        p['material'] = 'softshell' if work and p['kind'] == 'tab' else p['material']
    zd = details['zip']
    zd['front_len'] = zd['y_cf'] - 0.015 * s              # a full-length front zip, to 1.5 cm above the hem
    pm = 'softshell' if work else 'ripstop'
    for side, sx in (('L', 1.0), ('R', -1.0)):           # front panel: +x is the wearer's left
        if work:
            # slanted hip pockets, the mouth towards the side seam, no flap
            pc = (sx * 0.11 * s, 0.095 * s)
            details['patches'].append({
                'name': f'hipPocket{side}', 'kit': kit, 'panel': 'front', 'kind': 'pocket', 'material': pm,
                'centre': pc, 'size': (0.15 * s, 0.15 * s), 'r': 0.012 * s, 'angle': -8.0 * sx, 'bulge': 0.003,
                'job': 'hip pocket'})
            continue
        pc = (sx * 0.105 * s, 0.10 * s)
        pw, ph = 0.15 * s, 0.16 * s
        details['patches'].append({
            'name': f'lowerPocket{side}', 'kit': kit, 'panel': 'front', 'kind': 'pocket', 'material': pm,
            'centre': pc, 'size': (pw, ph), 'r': 0.01 * s, 'angle': 0.0, 'bulge': 0.004, 'job': 'lower patch pocket'})
        details['patches'].append({
            'name': f'lowerFlap{side}', 'kit': kit, 'panel': 'front', 'kind': 'flap', 'material': pm,
            'over': f'lowerPocket{side}', 'centre': (pc[0], pc[1] + ph / 2 - 0.025 * s + 0.003 * s), 'pivot': pc,
            'size': (pw + 0.01 * s, 0.05 * s), 'r': 0.008 * s, 'angle': 0.0, 'bulge': 0.0, 'job': 'plain pocket flap'})
    if not work:
        # plain shoulder straps on the raglan tops (x = 0 runs over the shoulder), from under the collar seam
        for side, sleeve in (('L', 'sleeveL'), ('R', 'sleeveR')):
            top = info['top'][side]
            y_top = 0.5 * (top['front'] + top['back'])
            details['patches'].append({
                'name': f'shoulderStrap{side}', 'kit': kit, 'panel': sleeve, 'kind': 'tab', 'material': 'ripstop',
                'centre': (0.0, y_top - 0.065 * s), 'size': (0.04 * s, 0.10 * s), 'r': 0.008 * s, 'angle': 0.0,
                'bulge': 0.0, 'job': 'plain shoulder strap'})
    return pattern, CS.prefix_patches(details, g['prefix']), info


if __name__ == '__main__':   # guard bake job (guard-bake.mjs --stage garments)
    import guard_garment
    guard_garment.main()
