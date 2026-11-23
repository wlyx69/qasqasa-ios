#!/usr/bin/env python3
"""Assemble App/Resources/www from web/: inject the Phosphor icon sprite and the logo into index.html,
copy app.css / app.js / manifest.json. Fonts, favicon and the app icons (icon-*.png, made from favicon.svg and
tools/app-icon-maskable.svg with rsvg-convert) live directly in App/Resources/www.

Usage: python3 tools/build_web.py   (icons: tools/icons, Phosphor regular, MIT)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / 'web'
OUT = ROOT / 'App' / 'Resources' / 'www'

ICONS = {
    'scissors': 'scissors', 'grid': 'squares-four', 'history': 'clock-counter-clockwise', 'menu': 'list',
    'back': 'arrow-right', 'play': 'play', 'pause': 'pause', 'plus': 'plus', 'minus': 'minus',
    'dots': 'dots-three-vertical', 'more': 'dots-three', 'save': 'download-simple', 'check': 'check',
    'check-circle': 'check-circle', 'x': 'x', 'info': 'info', 'sun': 'sun', 'moon': 'moon', 'auto': 'circle-half',
    'trash': 'trash', 'sliders': 'sliders-horizontal', 'fast': 'lightning', 'exact': 'crosshair',
    'warning': 'warning', 'whatsapp': 'whatsapp-logo', 'instagram': 'instagram-logo', 'youtube': 'youtube-logo',
    'tiktok': 'tiktok-logo', 'snapchat': 'snapchat-logo', 'xlogo': 'x-logo', 'folder': 'folder-simple',
    'zip': 'file-zip', 'again': 'arrow-counter-clockwise', 'gear': 'gear', 'equal': 'equals', 'timer': 'timer',
    'platform': 'device-mobile', 'manual': 'hand-tap', 'shield': 'shield-check', 'stop': 'stop',
    'rename': 'pencil-simple', 'exclude': 'eye-slash', 'merge': 'arrows-merge', 'film': 'film-strip',
    'bookmark': 'bookmark-simple', 'copy': 'copy', 'chev': 'caret-left', 'video': 'file-video',
}

LOGO = ('<svg class="wordmark" viewBox="-556 -99 556 107" role="img" aria-label="قصقصه">'
        '<g fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">'
        '{body}</g>{dots}</svg>')


def sprite(regular_dir: Path) -> str:
    out = ['<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">']
    for sid, name in ICONS.items():
        src = (regular_dir / f'{name}.svg').read_text()
        inner = re.search(r'<svg[^>]*>(.*)</svg>', src, re.S).group(1)
        out.append(f'<symbol id="i-{sid}" viewBox="0 0 256 256">{inner}</symbol>')
    out.append('</svg>')
    return ''.join(out)


def logo() -> str:
    """Approved wordmark A (forest-on-lime kit) re-coloured with currentColor."""
    src = (ROOT / 'tools' / 'wordmark.svg').read_text()
    g = re.search(r'<g fill="none"[^>]*>(.*?)</g>', src, re.S).group(1)
    dots = re.search(r'<g fill="#[0-9A-Fa-f]{6}">(.*?)</g>', src, re.S).group(1)
    return LOGO.format(body=g, dots=f'<g fill="currentColor">{dots}</g>')


def main():
    regular = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'tools' / 'icons'
    OUT.mkdir(parents=True, exist_ok=True)
    html = (WEB / 'index.src.html').read_text()
    html = html.replace('<!--SPRITE-->', sprite(regular))
    html = html.replace('<!--LOGO-->', logo())
    (OUT / 'index.html').write_text(html)
    for name in ('app.css', 'app.js', 'engine.js', 'cut-worker.js', 'engine-client.js', 'save.js', 'zip.js', 'manifest.json'):
        (OUT / name).write_text((WEB / name).read_text())
    vendor = OUT / 'vendor'; vendor.mkdir(exist_ok=True)
    for f in vendor.iterdir():  # drop files that are no longer vendored
        f.unlink()
    for f in (WEB / 'vendor').iterdir():
        (vendor / f.name).write_bytes(f.read_bytes())
    # service worker: the list of app files plus a content hash, so any change ships a new cache
    import hashlib, json
    files = sorted(str(f.relative_to(OUT)).replace('\\', '/') for f in OUT.rglob('*') if f.is_file() and f.name != 'sw.js' and not f.name.startswith('LICENSE') and not f.name.startswith('OFL'))
    h = hashlib.sha256()
    for f in files: h.update(f.encode()); h.update((OUT / f).read_bytes())
    sw = (WEB / 'sw.src.js').read_text().replace('/*VERSION*/', h.hexdigest()[:12]).replace('/*FILES*/', json.dumps(['./'] + files))
    (OUT / 'sw.js').write_text(sw)
    print('built', OUT, sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file()), 'bytes')


if __name__ == '__main__':
    main()
