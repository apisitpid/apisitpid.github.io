import sys, numpy as np
from PIL import Image, ImageDraw
S, T, R = sys.argv[1:4]
out = R + '/tools/logo-src/'
def save(im, name, maxs=1200):
    im = im.convert('RGB'); im.thumbnail((maxs, maxs), Image.LANCZOS); im.save(out + name, quality=92); print(name, im.size)
# new logos for shops that had none
save(Image.open(T + '/mcp-Google_Drive-blob-1795233320558-has9ht.jpg'), 'varalee.jpg')
save(Image.open(T + '/mcp-Google_Drive-blob-1795233320278-idsi9g.jpg'), 'the-artist.jpg')
# Haidilao: stacked lockup from the brand guideline page; keep only the red artwork
c = Image.open(S + '/drive/hdl/hdl-1.png').convert('RGB').crop((2250 + 200, 1750 + 195, 2250 + 772, 1750 + 772))
a = np.asarray(c).astype(int); red = a[..., 0] - np.maximum(a[..., 1], a[..., 2])
w = np.clip((red - 15) / 120, 0, 1)[..., None]                     # 0 = white paper / blue guides, 1 = logo red
logo = np.array([229, 25, 38])
flat = (w * logo + (1 - w) * 255).astype(np.uint8)
save(Image.fromarray(flat), 'haidilao.png')
# Punn Toh: cut the round sign out of the photo, paint the wall white
im = Image.open(T + '/mcp-Google_Drive-blob-1795233338594-lltioe.jpg').convert('RGB'); W, H = im.size
g = np.asarray(im.convert('L')).astype(int)
dark = g < 70; dark[: int(H * .14)] = False; dark[: int(H * .33), int(W * .85):] = False   # ignore the railing and the stickers (top-right)
ys, xs = np.nonzero(dark)
x0, x1, y0, y1 = np.percentile(xs, .3), np.percentile(xs, 99.7), np.percentile(ys, .3), np.percentile(ys, 99.7)
cx, cy, r = (x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0) / 2 - 2
print('punn circle', round(cx), round(cy), round(r), 'of', W, H)
sq = im.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r)))
m = Image.new('L', sq.size, 0); ImageDraw.Draw(m).ellipse((0, 0, sq.size[0] - 1, sq.size[1] - 1), fill=255)
bg = Image.new('RGB', sq.size, (255, 255, 255)); bg.paste(sq, (0, 0), m)
save(bg, 'punn-toh.png')
