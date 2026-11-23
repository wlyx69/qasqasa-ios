#!/usr/bin/env python3
"""Turn Mediabunny's ES-module bundle into a classic script that sets self.Mediabunny.
Classic scripts load everywhere (page <script>, worker importScripts), including the IPA's app:// scheme where
module loading is not guaranteed. Usage: python3 tools/vendor_mediabunny.py <mediabunny.min.mjs>"""
import re, sys
from pathlib import Path
src = Path(sys.argv[1]).read_text()
m = re.search(r'export\s*\{([^}]*)\};?\s*$', src)
assert m, 'no trailing export list'
pairs = []
for item in m.group(1).split(','):
    item = item.strip()
    if not item: continue
    if ' as ' in item:
        local, name = [x.strip() for x in item.split(' as ')]
    else:
        local = name = item
    pairs.append(f'{name}:{local}')
body = src[:m.start()]
assert 'import.meta' not in body and not re.search(r'(^|[;}\s])import\s*(\{|\*|[\w$]+\s+from\b)', body), 'module-only syntax left'
out = '(function(){\n' + body + '\nself.Mediabunny={' + ','.join(pairs) + '};\n})();\n'
dst = Path(__file__).resolve().parent.parent / 'web' / 'vendor' / 'mediabunny.js'
dst.write_text(out)
print('wrote', dst, len(out), 'bytes,', len(pairs), 'exports')
