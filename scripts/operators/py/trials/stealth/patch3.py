p = 'stealth.py'
s = open(p, encoding='utf8').read()
a = s.index('def ray_poly_max(poly, d):')
b = s.index('\ndef band(', a)
fn = s[a:b]
s = s[:a] + s[b:]
k = s.index('class Frame:')
s = s[:k] + fn + '\n' + s[k:]
open(p, 'w', encoding='utf8').write(s)
print('moved')
