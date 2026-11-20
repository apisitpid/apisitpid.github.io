"""Inline the design-system page into one self-contained HTML file (for sharing/review).
Usage: python3 -I tools/build_design.py <mock_dir with m-*.webp + proj.json>"""
import base64, json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
mock = Path(sys.argv[1])
src = (ROOT / "design/ds.src.html").read_text()
src = re.sub(r"/\*INLINE:([\w/.\-]+)\*/", lambda m: (ROOT / m.group(1)).read_text().replace("</script", "<\\/script"), src)
def uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(Path(path).read_bytes()).decode()
logos = {p.stem: uri(p, "image/webp") for p in sorted((ROOT / "logos").glob("*.webp"))}
maps = {p.stem: uri(p, "image/webp") for p in sorted(mock.glob("m-*.webp"))}
src = src.replace("{{EMBLEM}}", uri(ROOT / "brand/emblem.svg", "image/svg+xml"))
src = src.replace("{{LOGOS}}", json.dumps(logos)).replace("{{MAPS}}", json.dumps(maps)).replace("{{PROJ}}", (mock / "proj.json").read_text())
out = ROOT / "design/index.html"
out.write_text(src)
print(out, round(len(src) / 1024), "KB")
