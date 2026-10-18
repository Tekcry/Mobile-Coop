p = 'stealth.py'
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:70], s.count(a))
    s = s.replace(a, b)
rep("sc.view_settings.exposure = 0.0", "sc.view_settings.exposure = -1.6\ntry:\n    sc.view_settings.look = 'AgX - Medium High Contrast'\nexcept TypeError:\n    pass")
rep("def back_pod(z0=0.975, z1=1.12, w=0.085, thick=0.042):", "def back_pod(z0=0.955, z1=1.075, w=0.11, thick=0.048):")
rep("back_pod(z0=0.955, z1=1.05, w=0.075, thick=0.038)", "back_pod(z0=0.95, z1=1.05, w=0.10, thick=0.04)")
open(p, 'w', encoding='utf8').write(s)
print('patched')
