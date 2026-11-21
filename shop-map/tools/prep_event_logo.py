"""Event logo (navy on white JPEG) → transparent navy + reversed white versions, and app icons.
Usage: python3 -I tools/prep_event_logo.py tools/logo-src/event-logo-source.jpg"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
im = Image.open(sys.argv[1]).convert('RGB')
a = np.asarray(im).astype(np.float32)
# colour-to-alpha against white: the most transparent pixel that still composites back to the original
alpha = 1 - a.min(axis=2) / 255.0
alpha[alpha < 0.04] = 0
safe = np.maximum(alpha, 1e-6)[..., None]
rgb = np.clip((a - (1 - alpha[..., None]) * 255) / safe, 0, 255)
navy_px = (alpha > .6) & (rgb[..., 2] > rgb[..., 0])
print('logo navy', np.median(rgb[navy_px], axis=0).round())
orange = (rgb[..., 0] > rgb[..., 2] + 60) & (alpha > .3)
def save(rgbx, name, width):
    out = Image.fromarray(np.dstack([rgbx, alpha * 255]).astype(np.uint8), 'RGBA')
    bb = out.getbbox(); out = out.crop(bb)
    out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
    out.save(ROOT / 'brand' / name, optimize=True); print(name, out.size)
save(rgb, 'event-logo.png', 1200)                              # navy, for light grounds
white = rgb.copy(); white[~orange] = 255                        # navy → white, MAJOR tag stays orange
save(white, 'event-logo-white.png', 1200)                       # for the navy app bar, posters, OG image
# square icons: logo on white with breathing room
src = Image.open(ROOT / 'brand' / 'event-logo.png')
for size, name in [(180, 'icon-180.png'), (512, 'icon-512.png'), (64, 'favicon-64.png')]:
    c = Image.new('RGBA', (size, size), (255, 255, 255, 255)); w = int(size * .84)
    l = src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
    c.alpha_composite(l, ((size - l.width) // 2, (size - l.height) // 2)); c.convert('RGB').save(ROOT / 'brand' / name, optimize=True); print(name)
