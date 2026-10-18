p = 'stealth.py'
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:70], s.count(a))
    s = s.replace(a, b)
# rigid plates bridge hollows vertically too, inside their own height range (concave envelope per column)
rep("""class PlateMap:
    def __init__(self, fr, off, mode='rig'):
        self.fr, self.off, self.mode = fr, off, mode
""", """def envelope(v, r):
    \"\"\"Smallest concave function over (v, r) points: a rigid plate's profile over hollows.\"\"\"
    hull = []
    for p in zip(v, r):
        while len(hull) >= 2:
            (x1, y1), (x2, y2) = hull[-2], hull[-1]
            if (x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1) >= 0:
                hull.pop()
            else:
                break
        hull.append(p)
    hx, hy = zip(*hull)
    return np.interp(v, hx, hy)


_PM = [0]


class PlateMap:
    def __init__(self, fr, off, mode='rig', vr=None):
        self.fr, self.off, self.mode = fr, off, mode
        if vr is not None and mode == 'rig':
            G = fr.rig.copy()
            i0 = max(0, int((vr[0] - fr.vs[0]) / (fr.vs[1] - fr.vs[0])) - 1)
            i1 = min(len(fr.vs), int((vr[1] - fr.vs[0]) / (fr.vs[1] - fr.vs[0])) + 2)
            for j in range(G.shape[1]):
                G[i0:i1, j] = envelope(fr.vs[i0:i1], G[i0:i1, j])
            _PM[0] += 1
            self.mode = f'pm{_PM[0]}'
            setattr(fr, self.mode, G)
""")
rep("""    TC.slab(V, F, PlateMap(fr, off, mode), np.asarray(outline, float), thick, rr=rr, rings=14)""",
    """    outline = np.asarray(outline, float)
    pm = PlateMap(fr, off, mode, vr=(outline[:, 1].min(), outline[:, 1].max()))
    TC.slab(V, F, pm, outline, thick, rr=rr, rings=14)
    return pm""")
# colours: keep near-black but separate the zones a little more
rep("'shell': MT.softshell('suit shell', (0.026, 0.027, 0.028)),", "'shell': MT.softshell('suit shell', (0.024, 0.025, 0.026)),")
rep("'stretch': MT.knit('suit stretch', (0.020, 0.021, 0.022)),", "'stretch': MT.knit('suit stretch', (0.0145, 0.015, 0.016)),")
rep("'abr': MT.cordura('suit abrasion', (0.031, 0.031, 0.030)),", "'abr': MT.cordura('suit abrasion', (0.043, 0.042, 0.039)),")
rep("'top': MT.knit('top knit', (0.030, 0.031, 0.032)),", "'top': MT.knit('top knit', (0.022, 0.023, 0.024)),")
rep("'trou': MT.softshell('trouser shell', (0.027, 0.028, 0.025)),", "'trou': MT.softshell('trouser shell', (0.032, 0.033, 0.027)),")
rep("'tape': MT.polymer('seam tape', (0.019, 0.019, 0.020), 0.74),", "'tape': MT.polymer('seam tape', (0.012, 0.012, 0.013), 0.74),")
rep("'plate': MT.polymer('plate polymer', (0.026, 0.026, 0.027), 0.68),", "'plate': MT.polymer('plate polymer', (0.034, 0.037, 0.041), 0.66),")
rep("sc.view_settings.exposure = -1.6", "sc.view_settings.exposure = -1.9")
# the comms cable ran to the old carrier's radio: hidden (it would re-route to the back pod)
rep("gpus = RN.use_gpu(sc, args.samples)", """for n in ('wren-head_kit-cable',):
    bpy.data.objects[n].hide_render = True
gpus = RN.use_gpu(sc, args.samples)""")
# gear loops thicker; belay loop as flat sewn webbing
rep("                tube_w('poly', pts, 0.0032, sides=8)", "                tube_w('poly', pts, 0.0045, sides=8)")
rep("""    loop = []
    for t in np.linspace(0, 2 * math.pi, 40, endpoint=False):
        loop.append((P0 + P1) / 2 + (P0 - P1) / 2 * math.cos(t) + X * 0.012 * math.sin(t))
    tube_w('web', loop, 0.0045, sides=6, closed=True)""", """    ctr = (P0 + P1) / 2
    loop, rad = [], []
    for t in np.linspace(0, 2 * math.pi, 41):
        q = ctr + (P0 - P1) / 2 * math.cos(t) + X * 0.011 * math.sin(t)
        loop.append(q)
    loop = np.array(loop)
    pn = FT.unit(np.cross(P0 - P1, X))
    rad = FT.unit(loop - ctr)
    V, F = part('web')
    FT.strip(V, F, loop - pn * 0.009, rad, np.repeat(pn[None], len(loop), 0), 0.018, 0.003, caps=False)""")
open(p, 'w', encoding='utf8').write(s)
print('patched')
