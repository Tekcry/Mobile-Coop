"""The covered-material rule (A52, step 08a fix round 2): pure logic, no Blender, used by check_garment.py.

A material can skip the `sampled:` / `albedo:` / `roughness:` checks in a later item only if it is listed in COVERED,
which names the item that owns it, the item that covers it and why. The skip applies in the covering item and every
item built over it (its `under` list holds the covering item) and nowhere else. It holds only if the material passed in
its owner's own check JSON (sampled: at least minPixels, its albedo: check when its class is judged, its roughness:
check); a missing JSON, one older than the owner's -sim.json (a stale report from an earlier build), an unsampled or a
failing material there fails. check.mjs checks each item after the items in its sim report's `under` list, so in a
full run the owner's JSON is always this run's. In those items a new check `covered:<name>`
counts the material's pixels over the views and must be 0: a covered part that shows is a clip or a gap.
Every other material keeps minPixels and the LIMITS unchanged.

Dry run (no Blender): `python scripts/operators/py/covered.py`.
"""
import json
import os

COVERED = {
    'gunmetal': {'owner': 'suit', 'cover': 'headwear',
                 'why': 'the chest zip slider, parked in the zip garage under the hood skirt (step 08a Check)'},
    'suit thumb loop elastic': {'owner': 'suit', 'cover': 'gloves',
                                'why': 'the thumb loops, under the glove all round the thumb web (step 08a Check)'},
}


def applies(name, item, under):
    """True when `name` is covered in `item` (the covering item itself, or any item built over it)."""
    c = COVERED.get(name)
    return c is not None and (item == c['cover'] or c['cover'] in (under or []))


def owner_report(out_dir, op_id, owner):
    """The owner's check JSON, with `_stale` set when it is older than the owner's -sim.json (A52, round 3)."""
    p = os.path.join(out_dir, f'{op_id}-{owner}-check.json')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        rep = json.load(f)
    sim = os.path.join(out_dir, f'{op_id}-{owner}-sim.json')
    rep['_stale'] = not os.path.exists(sim) or os.path.getmtime(p) < os.path.getmtime(sim)
    return rep


def covered_checks(name, pixels, report, min_pixels, albedo_classes):
    """The checks for a covered material: [(check name, pass, value, limit, detail)]."""
    c = COVERED[name]
    ref = f"{c['owner']}-check.json"
    out = []
    ok, why = True, ''
    if report is None:
        ok, why = False, f'{ref} missing'
    elif report.get('_stale'):
        ok, why = False, f'{ref} is older than its -sim.json (stale: check the owner first)'
    else:
        m = (report.get('materials') or {}).get(name)
        by = {k['name']: k for k in report.get('checks', [])}
        if m is None or m.get('pixels', 0) < min_pixels or by.get(f'sampled:{name}', {}).get('pass') is False:
            ok, why = False, f'not sampled in {ref}'
        elif not by.get(f'roughness:{name}', {}).get('pass'):
            ok, why = False, f'roughness failed in {ref}'
        elif m.get('class') in albedo_classes and not by.get(f'albedo:{name}', {}).get('pass'):
            ok, why = False, f'albedo failed in {ref}'
        else:
            why = f"{ref}: {m['pixels']} px, passed"
    out.append((f'ownCheck:{name}', ok, why, f"passed sampled / albedo / roughness in {ref}", c['why']))
    out.append((f'covered:{name}', pixels == 0, int(pixels), f"0 px from {c['cover']} on (A52)", c['why']))
    return out


if __name__ == '__main__':
    good = {'materials': {'gunmetal': {'class': 'hard', 'pixels': 2325}},
            'checks': [{'name': 'roughness:gunmetal', 'pass': True}]}
    bad = {'materials': {'gunmetal': {'class': 'hard', 'pixels': 40}}, 'checks': []}
    print('applies headwear', applies('gunmetal', 'headwear', ['suit', 'gloves', 'boots']))
    print('applies boots', applies('gunmetal', 'boots', ['suit', 'gloves']))
    print('applies head_kit', applies('gunmetal', 'head_kit', ['suit', 'gloves', 'boots', 'headwear']))
    stale = dict(good, _stale=True)
    for label, px, rep in (('0 px', 0, good), ('12 px', 12, good), ('owner unsampled', 0, bad), ('no JSON', 0, None),
                           ('owner JSON older than its sim JSON', 0, stale)):
        print(label, covered_checks('gunmetal', px, rep, 150, ('fabric',)))
