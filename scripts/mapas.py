"""
Builds the illustrated sede maps from OpenStreetMap data.

Run once (and again only if a sede moves or a landmark changes):

    python3 scripts/mapas.py

Downloads the streets around each sede from the OSM API, projects them onto
a W x H canvas centred on the sede and writes plain path data to
src/components/site/home/mapas.generated.ts. Colours, fonts and the pin live
in the React component, not here. Map data © OpenStreetMap contributors (ODbL),
credited on the map itself.
"""

import json
import math
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

W, H = 1200, 800
PX_PER_M = 1.15  # ~1 km across

ROAD_WIDTH = {
    "trunk": 30, "primary": 28, "secondary": 22, "tertiary": 16,
    "trunk_link": 12, "primary_link": 12, "secondary_link": 10, "tertiary_link": 10,
    "residential": 9, "unclassified": 9, "living_street": 7,
}
LABELLED = {"trunk", "primary", "secondary", "tertiary"}

# Coordinates must match `ubicacion.sedes` in src/content/landing.ts.
SEDES = {
    "bellavista": {"coords": (9.9511475, -84.1239449), "landmarks": ["Parque Bella Vista", "Fresh Market"]},
    "cafe": {"coords": (9.9419345, -84.1157282), "landmarks": ["Parque del ICE", "Plaza Etreus"]},
}

OUT = Path(__file__).resolve().parent.parent / "src/components/site/home/mapas.generated.ts"


def fetch(lat, lon):
    dlat = (H / 2 / PX_PER_M + 150) / 111_320
    dlon = (W / 2 / PX_PER_M + 150) / (111_320 * math.cos(math.radians(lat)))
    url = f"https://api.openstreetmap.org/api/0.6/map?bbox={lon - dlon},{lat - dlat},{lon + dlon},{lat + dlat}"
    req = urllib.request.Request(url, headers={"User-Agent": "ticofit-map-builder/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return ET.fromstring(r.read())


def build(lat0, lon0, landmarks):
    root = fetch(lat0, lon0)
    mlon = 111_320 * math.cos(math.radians(lat0))
    nodes = {n.get("id"): (float(n.get("lat")), float(n.get("lon"))) for n in root.iter("node")}

    def xy(p):
        return (round(W / 2 + (p[1] - lon0) * mlon * PX_PER_M), round(H / 2 - (p[0] - lat0) * 111_320 * PX_PER_M))

    def visible(pts, pad=60):
        return any(-pad < x < W + pad and -pad < y < H + pad for x, y in pts)

    def path(pts, close=False):
        out, last = [], None
        for p in pts:
            if p != last:
                out.append(f"{p[0]},{p[1]}")
            last = p
        return "M" + "L".join(out) + ("Z" if close else "")

    def tags(e):
        return {t.get("k"): t.get("v") for t in e.iter("tag")}

    roads, parks, named = {}, [], {}
    for w in root.iter("way"):
        t = tags(w)
        pts = [xy(nodes[n.get("ref")]) for n in w.iter("nd") if n.get("ref") in nodes]
        if len(pts) < 2 or not visible(pts):
            continue
        hw = t.get("highway")
        if hw in ROAD_WIDTH:
            roads.setdefault(ROAD_WIDTH[hw], []).append(path(pts))
            if hw in LABELLED and t.get("name"):
                named.setdefault(t["name"], []).append(pts)
        elif t.get("leisure") in ("park", "garden", "pitch") or t.get("landuse") in ("grass", "recreation_ground"):
            parks.append(path(pts, close=True))

    def length(pts):
        return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))

    labels = []
    for name, ways in named.items():
        # Longest stretch inside the frame that stays clear of the centre pin.
        runs, run = [], []
        for p in max(ways, key=length):
            if 50 < p[0] < W - 50 and 50 < p[1] < H - 50 and math.dist(p, (W / 2, H / 2)) > 150:
                run.append(p)
            elif run:
                runs.append(run)
                run = []
        runs.append(run)
        inside = max(runs, key=length)
        if len(inside) < 2 or length(inside) < 240:
            continue
        if inside[0][0] > inside[-1][0]:
            inside = inside[::-1]  # keep text reading left to right
        labels.append({"name": name, "d": path(inside)})

    points = []
    for name in landmarks:
        for e in list(root.iter("way")) + list(root.iter("node")):
            if tags(e).get("name") != name:
                continue
            if e.tag == "node":
                x, y = xy((float(e.get("lat")), float(e.get("lon"))))
            else:
                pts = [xy(nodes[n.get("ref")]) for n in e.iter("nd") if n.get("ref") in nodes]
                x, y = round(sum(p[0] for p in pts) / len(pts)), round(sum(p[1] for p in pts) / len(pts))
            points.append({"name": name, "x": x, "y": y})
            break
        else:
            print(f"  ! landmark not found: {name}")

    return {
        "roads": [{"w": w, "d": "".join(ds)} for w, ds in sorted(roads.items())],
        "parks": "".join(parks),
        "labels": labels,
        "landmarks": points,
    }


def main():
    data = {}
    for sede, cfg in SEDES.items():
        print(f"{sede}…")
        data[sede] = build(*cfg["coords"], cfg["landmarks"])
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(
        "// Generated by scripts/mapas.py from OpenStreetMap data (ODbL). Do not edit by hand.\n"
        f"export const MAPA_W = {W};\nexport const MAPA_H = {H};\n\n"
        "export type MapaSede = {\n"
        "  roads: { w: number; d: string }[];\n"
        "  parks: string;\n"
        "  labels: { name: string; d: string }[];\n"
        "  landmarks: { name: string; x: number; y: number }[];\n"
        "};\n\n"
        f"export const MAPAS: Record<string, MapaSede> = {body};\n"
    )
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
