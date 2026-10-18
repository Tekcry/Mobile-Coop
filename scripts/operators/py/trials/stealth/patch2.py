p = 'stealth.py'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:70], s.count(a))
    s = s.replace(a, b)


# rigid field: each row bridged by its convex hull (a plate spans hollows), then a small vertical dilation and blur
rep("""        self.rig = self._blur(self._dilate(self.raw, 3), 4)""",
    """        self.rig = self._blur(self._dilate_v(self._hull_rows(self.raw), 3), 3)""")
rep("""    @staticmethod
    def _dilate(R, k):""", """    def _hull_rows(self, R):
        out = R.copy()
        c, s_ = np.cos(self.th), np.sin(self.th)
        for i in range(R.shape[0]):
            P2 = np.stack([c * R[i], s_ * R[i]], 1)
            hull = FT.hull2d(P2)
            out[i] = [max(R[i, j], ray_poly_max(hull, np.array([c[j], s_[j]]))) for j in range(len(c))]
        return out

    @staticmethod
    def _dilate_v(R, k):
        out = R.copy()
        for di in range(-k, k + 1):
            out = np.maximum(out, np.roll(R, di, 0))
        return out

    @staticmethod
    def _dilate(R, k):""")
# leg loops and thigh kit lower (under the crotch, low on the thigh)
rep("band('web' if slim else 'pad', th, 0.075, 0.03 if slim else 0.036,", "band('web' if slim else 'pad', th, 0.155, 0.03 if slim else 0.036,")
rep("Q = FR['thigh' + sd].P(-0.03, 0.07, 0.006)", "Q = FR['thigh' + sd].P(-0.035, 0.15, 0.006)")
rep("    v0, v1 = (0.13, 0.33) if low else (0.06, 0.26)", "    v0, v1 = (0.20, 0.38) if low else (0.10, 0.28)")
rep("    uc = (math.radians(68) * th.R0) * 1.0", "    uc = (math.radians(80) * th.R0) * 1.0")
rep("    v0 = 0.15 if low else 0.08", "    v0 = 0.21 if low else 0.12")
rep("    surf_strip('web', th, [(uc, -0.05), (uc, v0 + 0.02)], 0.022, 0.0026, off=0.005)",
    "    surf_strip('web', th, [(uc, 0.0), (uc, v0 + 0.02)], 0.022, 0.0026, off=0.005)")
rep("    surf_strip('web', th, [(uc, -0.05), (uc, v0 + 0.02)], 0.025, 0.0028, off=0.006)",
    "    surf_strip('web', th, [(uc, 0.0), (uc, v0 + 0.02)], 0.025, 0.0028, off=0.006)")
# shoulder straps end under the plate tops, with a buckle at the front end
rep("""        band('web', fr, 0.045, 0.024, 0.003, off=0.003, th0=-1.75, th1=1.75, mode='rig')""",
    """        band('web', fr, 0.045, 0.024, 0.003, off=0.003, th0=-1.6, th1=1.52, mode='rig')
        P, tu, tv, n = fr.basis(1.42 * fr.R0, 0.045, 0.006)
        rbox_w('poly', P + n * 0.003, [tv, tu, n], (0.016, 0.011, 0.0035), 0.002)""")
# gear loops flatter
rep("q = TOR.P(ua + 0.025 * math.cos(t) * sg, zt(0.905) - 0.012 * math.sin(t), 0.012 + 0.006 * math.sin(t))",
    "q = TOR.P(ua + 0.025 * math.cos(t) * sg, zt(0.905) - 0.014 * math.sin(t), 0.010 + 0.002 * math.sin(t))")
# light: no overexposure, near-black stays near-black but readable
rep("sc.view_settings.exposure = 0.9", "sc.view_settings.exposure = 0.0")
rep("""    RN.world(sc, strength=0.22, colour=(0.2, 0.205, 0.215))
    RN.area_light('key', (2.2, -3.2, 2.6), (0, 0, 1.0), 1100, 2.4)
    RN.area_light('fill', (-3.0, -2.2, 1.4), (0, 0, 0.9), 380, 3.0, (0.92, 0.95, 1.0))
    RN.area_light('rimL', (1.8, 2.8, 2.2), (0, 0, 1.1), 650, 1.4, (0.9, 0.95, 1.0))
    RN.area_light('rimR', (-1.8, 2.8, 2.2), (0, 0, 1.1), 650, 1.4, (0.9, 0.95, 1.0))""",
    """    RN.world(sc, strength=0.12, colour=(0.2, 0.205, 0.215))
    RN.area_light('key', (2.2, -3.2, 2.6), (0, 0, 1.0), 520, 2.4)
    RN.area_light('fill', (-3.0, -2.2, 1.4), (0, 0, 0.9), 170, 3.0, (0.92, 0.95, 1.0))
    RN.area_light('rimL', (1.8, 2.8, 2.2), (0, 0, 1.1), 320, 1.4, (0.9, 0.95, 1.0))
    RN.area_light('rimR', (-1.8, 2.8, 2.2), (0, 0, 1.1), 320, 1.4, (0.9, 0.95, 1.0))""")
rep("""    RN.area_light('rimL', (1.6, 2.2, 1.9), (0, 0, 1.0), 1600, 0.8, (0.8, 0.9, 1.0))
    RN.area_light('rimR', (-1.6, 2.2, 1.9), (0, 0, 1.0), 1600, 0.8, (0.8, 0.9, 1.0))
    RN.area_light('top', (0.0, 1.0, 3.2), (0, 0, 1.0), 300, 0.6, (0.8, 0.9, 1.0))""",
    """    RN.area_light('rimL', (1.7, 2.0, 1.9), (0, 0, 1.0), 700, 0.8, (0.8, 0.9, 1.0))
    RN.area_light('rimR', (-1.7, 2.0, 1.9), (0, 0, 1.0), 700, 0.8, (0.8, 0.9, 1.0))
    RN.area_light('top', (0.0, 1.0, 3.2), (0, 0, 1.0), 120, 0.6, (0.8, 0.9, 1.0))""")
# absolute output path
rep("os.makedirs(args.dest, exist_ok=True)", "args.dest = os.path.abspath(args.dest)\nos.makedirs(args.dest, exist_ok=True)")
open(p, 'w', encoding='utf8').write(s)
print('patched')
