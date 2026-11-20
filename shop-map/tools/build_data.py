"""Build shop-map data + circle-fitted logos from the partner spreadsheet.

Usage:  python3 -I tools/build_data.py <sheet.xlsx>
(Export the Google Sheet as .xlsx; logos are read from the images embedded in column C.)

Outputs  data/stores.js   window.CNX_STORES = [...]
         logos/<id>.webp  288px square, logo fitted inside the circle on its own background colour
"""
import json, math, re, sys, zipfile, io
from pathlib import Path
from xml.etree import ElementTree as ET

import numpy as np
import openpyxl
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SIZE = 288                      # output px (pin shows ~56 CSS px → crisp at 3x+ for detail view)
CATS = ["cafe", "sport", "spa", "food"]   # sheet order
NS = {"xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


# ---------------------------------------------------------------- sheet
def sheet_images(z, i):
    """row(1-based) -> image bytes for pictures anchored in column C."""
    rels = ET.fromstring(z.read(f"xl/drawings/_rels/drawing{i}.xml.rels"))
    rmap = {r.get("Id"): r.get("Target").replace("../", "xl/") for r in rels}
    out = {}
    for anc in ET.fromstring(z.read(f"xl/drawings/drawing{i}.xml")):
        fr = anc.find("xdr:from", NS)
        blip = anc.find(".//a:blip", NS)
        if fr is None or blip is None:
            continue
        if int(fr.find("xdr:col", NS).text) != 2:
            continue
        out[int(fr.find("xdr:row", NS).text) + 1] = z.read(rmap[blip.get("{%s}embed" % NS["r"])])
    return out


def merged_value(ws, row, col):
    """Value of a cell, following merged ranges (merged cells are blank except top-left)."""
    for rng in ws.merged_cells.ranges:
        if rng.min_row <= row <= rng.max_row and rng.min_col <= col <= rng.max_col:
            return ws.cell(rng.min_row, rng.min_col).value, rng.min_row
    return ws.cell(row, col).value, row


# ---------------------------------------------------------------- normalisers
TIME = re.compile(r"(\d{1,2})\s*[:.]+\s*(\d{2})\s*(AM|PM)?", re.I)

def parse_hours(raw):
    if not raw:
        return []
    spans = []
    for line in str(raw).split("\n"):
        t = []
        for h, m, ap in TIME.findall(line):
            h, m = int(h), int(m)
            if ap:
                if ap.upper() == "PM" and h != 12: h += 12
                if ap.upper() == "AM" and h == 12: h = 0
            t.append(h * 60 + m)
        if len(t) >= 2:
            o, c = t[0], t[1]
            if c == 0 or c <= o:
                c = c + 1440 if c < o else 1440
            spans.append([o, c])
    return spans


def parse_phones(raw):
    out = []
    for part in re.split(r"[\n/,]", str(raw or "")):
        d = re.sub(r"\D", "", part)
        if not d:
            continue
        if d.startswith("66"):
            d = d[2:]
        d = d.lstrip("0")
        e164 = "+66" + d
        if len(d) == 9:     # mobile 0XX-XXX-XXXX
            local = f"0{d[:2]} {d[2:5]} {d[5:]}"
        elif len(d) == 8:   # landline 0XX-XXX-XXX
            local = f"0{d[:2]} {d[2:5]} {d[5:]}"
        else:
            local = "0" + d
        mobile = d[:1] in ("6", "8", "9")
        out.append({"tel": e164, "display": local, "suspect": len(d) != (9 if mobile else 8)})
    return out


# ---------------------------------------------------------------- logo fitting
def dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def fit_logo(data, trim=0.006, force=None):
    """Return (square RGB image, bg hex, mode). The whole logo stays visible inside the pin's circle and is
    scaled as large as possible: we find the content pixel farthest from the content centre and make that
    distance the circle radius (round badges fill the circle, wordmarks fit by their corners)."""
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    t = max(2, round(min(im.size) * trim))            # shave scanner/frame hairlines at the very edge
    im = im.crop((t, t, im.width - t, im.height - t))
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    ring = np.concatenate([a[:3].reshape(-1, 4), a[-3:].reshape(-1, 4), a[:, :3].reshape(-1, 4), a[:, -3:].reshape(-1, 4)])
    if (ring[:, 3] < 40).mean() > 0.6:
        bg = np.array([255, 255, 255], np.float32)
    else:
        bg = np.median(ring[ring[:, 3] >= 40][:, :3], axis=0)
    alpha = a[..., 3:4] / 255.0
    rgb = a[..., :3] * alpha + bg * (1 - alpha)
    ring_rgb = np.concatenate([rgb[:3].reshape(-1, 3), rgb[-3:].reshape(-1, 3), rgb[:, :3].reshape(-1, 3), rgb[:, -3:].reshape(-1, 3)])
    uniform = (np.linalg.norm(ring_rgb - bg, axis=1) < 34).mean()
    flat = Image.fromarray(rgb.clip(0, 255).astype(np.uint8))
    bgt = tuple(int(round(v)) for v in bg)

    if uniform < 0.55 and trim < 0.05:   # maybe a drawn frame at the edge: shave more and retry
        return fit_logo(data, 0.06, force)
    if uniform < 0.55 or force == "cover":      # photographic / busy edge → centre cover-crop
        s = min(w, h)
        box = ((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)
        return flat.crop(box).resize((SIZE, SIZE), Image.LANCZOS), bgt, "cover"

    # faint background textures (e.g. watermark patterns) are not "logo": require real contrast
    mask = np.linalg.norm(rgb - bg, axis=2) > 80
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return flat.resize((SIZE, SIZE)), bgt, "fit"
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    r = np.sqrt((xs + 0.5 - cx) ** 2 + (ys + 0.5 - cy) ** 2).max()
    ratio = r / (math.hypot(x1 - x0, y1 - y0) / 2)      # 1.0 = rectangular content, ~0.71 = round badge
    # Safe zone. A round badge has its own ring, meant to sit just inside the pin's ring: keep it near
    # the edge. Wordmarks and square marks get breathing room: nothing past 80% of the radius
    # (≈4.5 px clear at the 46 px pin), the way app icons keep a safe area.
    SAFE_ROUND, SAFE_MARK = 0.955, 0.80
    scale = (SIZE / 2 * (SAFE_ROUND if ratio < 0.8 else SAFE_MARK)) / r
    crop = flat.crop((int(x0), int(y0), int(x1), int(y1)))
    nw, nh = max(1, round((x1 - x0) * scale)), max(1, round((y1 - y0) * scale))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), bgt)
    canvas.paste(crop, ((SIZE - nw) // 2, (SIZE - nh) // 2))
    return canvas, bgt, "round" if ratio < 0.8 else "fit"


def hexc(c):
    return "#%02x%02x%02x" % c


def luminance(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


# ---------------------------------------------------------------- main
def main(xlsx):
    content = json.loads((ROOT / "tools/content.json").read_text())
    wb = openpyxl.load_workbook(xlsx)
    z = zipfile.ZipFile(xlsx)
    stores, by_id, report = [], {}, []
    (ROOT / "logos").mkdir(exist_ok=True)

    for si, ws in enumerate(wb.worksheets):
        imgs = sheet_images(z, si + 1)
        for r in range(5, ws.max_row + 1):
            name = ws.cell(r, 4).value
            if not name:
                continue
            key = f"{si}:{r}"
            c = content["rows"].get(key)
            if c is None:
                sys.exit(f"no content for row {key} ({name})")
            if "merge" in c:
                by_id[c["merge"]]["cats"].append(CATS[si])
                continue
            latlng = [float(v) for v in str(ws.cell(r, 6).value).split(",")]
            phone_raw, _ = merged_value(ws, r, 9)
            hours_raw, _ = merged_value(ws, r, 10)
            _, logo_row = merged_value(ws, r, 3)
            img = imgs.get(r) or imgs.get(logo_row)
            if img is None:   # picture may be anchored anywhere inside a merged logo cell
                for rng in ws.merged_cells.ranges:
                    if rng.min_col == 3 and rng.min_row <= r <= rng.max_row:
                        img = next((imgs[k] for k in range(rng.min_row, rng.max_row + 1) if k in imgs), None)
            s = {
                "id": c["id"],
                "cats": [CATS[si]],
                "brand": c["brand"],
                "name": c["name"],
                "sheetName": str(name).strip(),
                "area": c["area"],
                "perk": c["perk"],
                "scripts": c.get("scripts", [c["brand"]]),
                "who": c.get("who", "both"),
                "tags": c.get("tags", ""),
                "offer": c["offer"],
                "address": str(ws.cell(r, 8).value or "").strip(),
                "phones": parse_phones(phone_raw),
                "hours": parse_hours(hours_raw),
                "hoursRaw": str(hours_raw or "").strip(),
                "lat": latlng[0], "lng": latlng[1],
                "logo": None, "bg": "#13254a", "ink": "light", "fit": None,
            }
            if img:
                canvas, bg, mode = fit_logo(img, force=c.get("logoFit"))
                canvas.save(ROOT / f"logos/{s['id']}.webp", "WEBP", quality=88, method=6)
                s.update(logo=f"logos/{s['id']}.webp", bg=hexc(bg),
                         ink="dark" if luminance(bg) > 0.45 else "light", fit=mode)
            stores.append(s)
            by_id[s["id"]] = s
            report.append(f"{s['id']:24} {s['fit'] or 'monogram':9} {s['bg']}  hours={s['hours']}  phones={[p['display'] for p in s['phones']]}")

    out = ROOT / "data/stores.js"
    out.write_text("/* generated by tools/build_data.py, do not edit by hand */\n"
                   "window.CNX_AREAS = " + json.dumps(content["areas"], ensure_ascii=False) + ";\n"
                   "window.CNX_STORES = " + json.dumps(stores, ensure_ascii=False, indent=1) + ";\n")
    print("\n".join(report))
    print(f"\n{len(stores)} stores → {out}")
    sus = [(s["id"], p["display"]) for s in stores for p in s["phones"] if p["suspect"]]
    if sus:
        print("suspect phone numbers:", sus)


if __name__ == "__main__":
    main(sys.argv[1])
