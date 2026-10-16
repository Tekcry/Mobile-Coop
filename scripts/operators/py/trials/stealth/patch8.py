p = 'stealth.py'
s = open(p, encoding='utf8').read()
a = s.index("    for sg in (1, -1):\n        pts = [(0.010, zt(1.215))")
b = s.index("    plate('plate', TOR, outline_rr(TU - 0.09, TU + 0.09, zt(1.13), zt(1.33), 0.03), 0.003, 0.0055, rr=0.0035)")
new = """    # one bonded chest panel (rigid: it bridges the bust, no anatomical sculpting), two flex segments below
    neck = [(0.07, zt(1.345)), (0.035, zt(1.325)), (-0.035, zt(1.325)), (-0.07, zt(1.345))]
    plate('plate', TOR, outline_rr(-0.11, 0.11, zt(1.165), zt(1.345), 0.03, notch=neck), 0.003, 0.0055, rr=0.0035)
    for z0, z1, hw in ((1.11, 1.155, 0.085), (1.06, 1.10, 0.078)):
        plate('plate', TOR, outline_rr(-hw, hw, zt(z0), zt(z1), 0.016), 0.002, 0.0045, rr=0.003)
"""
s = s[:a] + new + s[b:]
open(p, 'w', encoding='utf8').write(s)
print('patched')
