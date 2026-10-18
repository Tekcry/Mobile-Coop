p = 'stealth.py'
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:70], s.count(a))
    s = s.replace(a, b)
# A: pouches ride on the chest plate's own surface
rep("    plate('plate', TOR, ol, 0.0155, 0.0065, rr=0.0042)", "    cp = plate('plate', TOR, ol, 0.0155, 0.0065, rr=0.0042)")
rep("        mag('cordura', TOR, u, zt(1.19), 0.022, -0.32, pistol=True)", "        mag('cordura', TOR, u, zt(1.19), 0.0225, -0.32, pistol=True, mode=cp.mode)")
rep("    c, tu, tv, n = box_at('cordura', TOR, -0.06, zt(1.215), 0.022, (0.036, 0.04, 0.012), 0.007)",
    "    c, tu, tv, n = box_at('cordura', TOR, -0.06, zt(1.215), 0.0225, (0.036, 0.04, 0.012), 0.007, mode=cp.mode)")
rep("    plate('plate', TOR, outline_rr(TU - 0.085, TU + 0.085, zt(1.10), zt(1.33), 0.03), 0.008, 0.0065, rr=0.004)",
    "    plate('plate', TOR, outline_rr(TU - 0.10, TU + 0.10, zt(1.14), zt(1.33), 0.035), 0.008, 0.0065, rr=0.004)")
# B: the rig is built into the front bag
rep("    plate('lam', TOR, outline_rr(-0.115, 0.115, zt(1.06), zt(1.32), 0.025, notch=neck), 0.009, 0.016, rr=0.007)",
    "    fp = plate('lam', TOR, outline_rr(-0.115, 0.115, zt(1.06), zt(1.32), 0.025, notch=neck), 0.009, 0.016, rr=0.007)")
rep("        mag('cordura', TOR, u, zt(1.115), 0.024, 0.0, pistol=True)", "        mag('cordura', TOR, u, zt(1.115), 0.0245, 0.0, pistol=True, mode=fp.mode)")
rep("    c, tu, tv, n = box_at('cordura', TOR, 0.0, zt(1.245), 0.024, (0.085, 0.035, 0.007), 0.006)",
    "    c, tu, tv, n = box_at('cordura', TOR, 0.0, zt(1.245), 0.0245, (0.085, 0.035, 0.007), 0.006, mode=fp.mode)")
# C: chest panels cut like the pectoral line (high, shooter's cut at the armpit), split at the sternum
rep("""    for sg in (1, -1):
        u0, u1 = sorted((0.012 * sg, 0.12 * sg))
        plate('plate', TOR, outline_rr(u0, u1, zt(1.16), zt(1.33), 0.022), 0.003, 0.0055, rr=0.0035)""",
    """    for sg in (1, -1):
        pts = [(0.010, zt(1.215)), (0.075, zt(1.245)), (0.118, zt(1.275)), (0.112, zt(1.33)), (0.07, zt(1.36)),
               (0.010, zt(1.345))]
        pts = np.array(pts) * np.array([sg, 1.0])
        if sg < 0:
            pts = pts[::-1]
        ol = TC.densify_closed(TC.fillet(pts, [0.01, 0.03, 0.02, 0.02, 0.02, 0.01], seg=6), 0.004)
        plate('plate', TOR, ol, 0.003, 0.0055, rr=0.0035)
    for sg in (1, -1):
        u0, u1 = sorted((0.012 * sg, 0.10 * sg))
        plate('plate', TOR, outline_rr(u0, u1, zt(1.16), zt(1.205), 0.014), 0.003, 0.005, rr=0.003)""")
open(p, 'w', encoding='utf8').write(s)
print('patched')
