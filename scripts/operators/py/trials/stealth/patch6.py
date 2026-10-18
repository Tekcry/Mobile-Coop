p = 'stealth.py'
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:70], s.count(a))
    s = s.replace(a, b)
rep("""    TC.slab(V, F, pm, outline, thick, rr=rr, rings=14)
    return pm""", """    TC.slab(V, F, pm, outline, thick, rr=rr, rings=14)
    if key in ('plate', 'lam', 'pod') and thick > 0.004:
        # bound / rubberised edge trim round the rim
        E = pm.S(outline[:, 0], outline[:, 1], np.full(len(outline), thick * 0.5))
        tube_w('trim', np.vstack([E, E[:1]]), thick * 0.5 + 0.0004, sides=8)
    return pm""")
rep("'pad': MT.cordura('pad cordura', (0.021, 0.022, 0.022)),", "'pad': MT.cordura('pad cordura', (0.021, 0.022, 0.022)),\n    'trim': MT.polymer('edge trim', (0.016, 0.016, 0.017), 0.8),")
rep("tube_w('web', [P1 + X * 0.006 * sg, (P1 + Q) / 2 - Y * 0.006, Q], 0.004, sides=6)", "tube_w('web', [P1 + X * 0.006 * sg, (P1 + Q) / 2 - Y * 0.006, Q], 0.0055, sides=6)")
open(p, 'w', encoding='utf8').write(s)
print('patched')
