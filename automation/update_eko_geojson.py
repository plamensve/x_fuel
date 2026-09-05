from __future__ import annotations

import argparse
import html
import json
import math
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

import requests

ROOT = Path(__file__).resolve().parents[1]
GEOJSON_PATH = ROOT / "data" / "export.geojson"
REGISTRY_PATH = ROOT / "data" / "eko_stations.json"

EKO_MAP_URL = "https://www.eko.bg/self-service-terminal-instructions/karta-na-obektite/"
EKO_SMILE_URL = "https://ekosmile.bg/partners/locations"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; goriva.online EKO station updater/1.0; "
        "+https://goriva.online/)"
    ),
    "Accept-Language": "bg-BG,bg;q=0.9,en;q=0.7",
}

STATION_RE = re.compile(r"^(?:EKO|ЕКО)\s*(\d{4})\s*(.+?)\s*$", re.I)
PHONE_RE = re.compile(r"(?:(?:\+|00)?359|0)\s*[\d\s()./-]{7,}", re.I)
COORD_PATTERNS = [
    re.compile(r"@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)"),
    re.compile(r"(?:query|q|destination)=(-?\d{1,2}\.\d+)%?2?C(-?\d{1,3}\.\d+)", re.I),
    re.compile(r"(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)"),
]

IGNORE_TEXT = {
    "виж на google maps",
    "вижте на картата",
    "виж на картата",
    "данни за локация",
    "покажи още",
    "резултати",
}

ADDRESS_HINTS = (
    "ул.", "бул.", "път", "шосе", "магистрала", "ам ", "кв.", "местност",
    "с.", "гр.", "км", "посока", "площад", "промишлена", "индустриална",
)


def norm(value: Any) -> str:
    return re.sub(r"\s+", " ", html.unescape(str(value or "")).replace("\xa0", " ")).strip()


def cyrillic_brand_name(name: str, station_id: str) -> str:
    name = norm(name)
    name = re.sub(r"^(?:EKO|ЕКО)\s*", "", name, flags=re.I)
    return f"ЕКО {station_id} {name}".strip()


class VisibleHTML(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.items: list[tuple[str, str | None]] = []
        self._href_stack: list[str | None] = [None]

    @property
    def href(self) -> str | None:
        return self._href_stack[-1]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a":
            self._href_stack.append(dict(attrs).get("href"))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and len(self._href_stack) > 1:
            self._href_stack.pop()

    def handle_data(self, data: str) -> None:
        text = norm(data)
        if text:
            self.items.append((text, self.href))


def get_html(url: str) -> str:
    response = requests.get(url, headers=HEADERS, timeout=45)
    response.raise_for_status()
    return response.text


def looks_like_address(text: str) -> bool:
    low = text.casefold()
    if low in IGNORE_TEXT or STATION_RE.match(text) or PHONE_RE.search(text):
        return False
    if len(text) < 5 or len(text) > 300:
        return False
    if any(h.casefold() in low for h in ADDRESS_HINTS):
        return True
    return "," in text and any(ch.isalpha() for ch in text)


def normalize_phone(text: str | None) -> str | None:
    if not text:
        return None
    match = PHONE_RE.search(text)
    if not match:
        return None
    raw = re.sub(r"[^\d+]", "", match.group(0))
    if raw.startswith("00"):
        raw = "+" + raw[2:]
    elif raw.startswith("359"):
        raw = "+" + raw
    elif raw.startswith("0"):
        raw = "+359" + raw[1:]
    return raw


def coords_from_url(url: str | None) -> tuple[float, float] | None:
    if not url:
        return None
    decoded = unquote(url)
    for pattern in COORD_PATTERNS:
        match = pattern.search(decoded)
        if not match:
            continue
        lat, lon = float(match.group(1)), float(match.group(2))
        if 40.5 <= lat <= 44.5 and 21.5 <= lon <= 29.5:
            return lat, lon
    parsed = urlparse(decoded)
    query = parse_qs(parsed.query)
    for key in ("query", "q", "destination"):
        for value in query.get(key, []):
            match = re.search(r"(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)", value)
            if match:
                lat, lon = float(match.group(1)), float(match.group(2))
                if 40.5 <= lat <= 44.5 and 21.5 <= lon <= 29.5:
                    return lat, lon
    return None


def parse_station_cards(page_html: str) -> dict[str, dict[str, Any]]:
    parser = VisibleHTML()
    parser.feed(page_html)
    items = parser.items
    records: dict[str, dict[str, Any]] = {}
    for idx, (text, _) in enumerate(items):
        match = STATION_RE.match(text)
        if not match:
            continue
        station_id, station_name = match.group(1), norm(match.group(2))
        window = []
        for next_text, next_href in items[idx + 1: idx + 70]:
            if STATION_RE.match(next_text):
                break
            window.append((next_text, next_href))
        address = next((t for t, _ in window if looks_like_address(t)), None)
        phone = next((normalize_phone(t) for t, _ in window if normalize_phone(t)), None)
        maps_url = next((h for _, h in window if h and ("google." in h.casefold() or "goo.gl" in h.casefold() or "maps" in h.casefold())), None)
        coords = coords_from_url(maps_url)
        candidate = {
            "station_id": station_id,
            "name": cyrillic_brand_name(station_name, station_id),
            "source_name": text,
            "address": address,
            "phone": phone,
            "maps_url": maps_url,
            "latitude": coords[0] if coords else None,
            "longitude": coords[1] if coords else None,
        }
        previous = records.get(station_id)
        score = sum(bool(candidate.get(k)) for k in ("address", "phone", "maps_url", "latitude"))
        previous_score = sum(bool(previous.get(k)) for k in ("address", "phone", "maps_url", "latitude")) if previous else -1
        if score > previous_score:
            records[station_id] = candidate
    return records


def merge_smile_metadata(records: dict[str, dict[str, Any]], smile_html: str) -> None:
    parser = VisibleHTML()
    parser.feed(smile_html)
    items = parser.items
    for idx, (text, _) in enumerate(items):
        match = STATION_RE.match(text)
        if not match:
            continue
        station_id, station_name = match.group(1), norm(match.group(2))
        record = records.setdefault(station_id, {
            "station_id": station_id,
            "name": cyrillic_brand_name(station_name, station_id),
            "source_name": text,
            "address": None,
            "phone": None,
            "maps_url": None,
            "latitude": None,
            "longitude": None,
        })
        next_values = []
        for value, _ in items[idx + 1: idx + 12]:
            if STATION_RE.match(value):
                break
            if value.casefold() in IGNORE_TEXT:
                continue
            next_values.append(value)
        if not record.get("address"):
            address_parts = []
            for value in next_values[:4]:
                if PHONE_RE.search(value) or "данни за" in value.casefold() or re.fullmatch(r"\d+", value):
                    continue
                address_parts.append(value)
                if looks_like_address(value):
                    break
            if address_parts:
                record["address"] = norm(", ".join(address_parts[:2]))
        record["name"] = cyrillic_brand_name(station_name, station_id)


def load_registry_cache() -> dict[str, dict[str, Any]]:
    if not REGISTRY_PATH.exists():
        return {}
    try:
        payload = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    stations = payload.get("stations", payload) if isinstance(payload, dict) else {}
    return stations if isinstance(stations, dict) else {}


def geocode_station(record: dict[str, Any], session: requests.Session) -> tuple[float, float] | None:
    address, name = norm(record.get("address")), norm(record.get("name"))
    if not address:
        return None
    for query in (f"{name}, {address}, България", f"{address}, България"):
        response = session.get(NOMINATIM_URL, params={"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "bg"}, headers={"User-Agent": "goriva.online EKO station updater/1.0 (+https://goriva.online/)", "Accept-Language": "bg"}, timeout=30)
        response.raise_for_status()
        data = response.json()
        if data:
            lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
            if 40.5 <= lat <= 44.5 and 21.5 <= lon <= 29.5:
                return lat, lon
        time.sleep(1.05)
    return None


def resolve_coordinates(records: dict[str, dict[str, Any]]) -> None:
    cache = load_registry_cache()
    session = requests.Session()
    unresolved = []
    for station_id in sorted(records):
        record = records[station_id]
        if record.get("latitude") is not None and record.get("longitude") is not None:
            continue
        old = cache.get(station_id, {})
        if norm(old.get("address")) == norm(record.get("address")) and old.get("latitude") is not None and old.get("longitude") is not None:
            record["latitude"], record["longitude"] = old["latitude"], old["longitude"]
            continue
        unresolved.append(station_id)
    print(f"[EKO] Coordinates missing for {len(unresolved)} stations; geocoding official addresses.")
    for number, station_id in enumerate(unresolved, start=1):
        coords = geocode_station(records[station_id], session)
        if coords:
            records[station_id]["latitude"], records[station_id]["longitude"] = coords
            print(f"[EKO] Geocoded {number}/{len(unresolved)}: {station_id} -> {coords[0]:.6f},{coords[1]:.6f}")
        else:
            print(f"[EKO] WARNING: no coordinates for {station_id} {records[station_id].get('name')}")
        time.sleep(1.05)


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def is_eko_feature(feature: dict[str, Any]) -> bool:
    props = feature.get("properties") or {}
    values = " ".join(norm(props.get(key)) for key in ("brand", "brand:bg", "brand:en", "name", "name:bg", "operator", "brand:wikidata")).casefold()
    return "q111603199" in values or re.search(r"(^|\s)eko($|\s)", values) is not None or "еко" in values


def feature_point(feature: dict[str, Any]) -> tuple[float, float] | None:
    geometry = feature.get("geometry") or {}
    if geometry.get("type") != "Point":
        return None
    coords = geometry.get("coordinates") or []
    if len(coords) < 2:
        return None
    try:
        lon, lat = float(coords[0]), float(coords[1])
    except (TypeError, ValueError):
        return None
    return lat, lon


def nearest_existing_feature(station: dict[str, Any], existing: list[dict[str, Any]], used: set[int], max_distance_m: float = 1200.0) -> dict[str, Any] | None:
    lat, lon = station.get("latitude"), station.get("longitude")
    if lat is None or lon is None:
        return None
    best = None
    for idx, feature in enumerate(existing):
        if idx in used:
            continue
        point = feature_point(feature)
        if not point:
            continue
        distance = haversine_m(float(lat), float(lon), point[0], point[1])
        if best is None or distance < best[0]:
            best = (distance, idx, feature)
    if not best or best[0] > max_distance_m:
        return None
    used.add(best[1])
    return best[2]


def build_feature(station: dict[str, Any], existing: dict[str, Any] | None) -> dict[str, Any]:
    lat, lon = float(station["latitude"]), float(station["longitude"])
    base_props = dict((existing or {}).get("properties") or {})
    props = {
        **base_props,
        "amenity": "fuel",
        "brand": "EKO",
        "brand:bg": "ЕКО",
        "brand:en": "EKO",
        "brand:wikidata": "Q111603199",
        "name": station["name"],
        "name:bg": station["name"],
        "operator": "ЕКО България ЕАД",
        "eko:station_id": station["station_id"],
        "addr:full": station.get("address") or base_props.get("addr:full"),
        "phone": station.get("phone") or base_props.get("phone"),
        "website": EKO_MAP_URL,
        "source:eko": "EKO Bulgaria official station map",
    }
    props = {k: v for k, v in props.items() if v not in (None, "")}
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "id": (existing or {}).get("id") or f"eko/{station['station_id']}",
    }


def save_registry(records: dict[str, dict[str, Any]]) -> None:
    payload = {"source": EKO_MAP_URL, "count": len(records), "stations": {k: records[k] for k in sorted(records)}}
    REGISTRY_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_geojson(records: dict[str, dict[str, Any]], dry_run: bool = False) -> None:
    payload = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    features = payload.get("features")
    if not isinstance(features, list):
        raise RuntimeError("data/export.geojson does not contain a FeatureCollection features array.")
    current_eko = [feature for feature in features if is_eko_feature(feature)]
    non_eko = [feature for feature in features if not is_eko_feature(feature)]
    resolved = [record for record in records.values() if record.get("latitude") is not None and record.get("longitude") is not None]
    if len(records) < 95:
        raise RuntimeError(f"Official EKO station scrape returned only {len(records)} stations; refusing to modify GeoJSON.")
    if len(resolved) < 90:
        raise RuntimeError(f"Only {len(resolved)}/{len(records)} official EKO stations have coordinates; refusing to modify GeoJSON.")
    used: set[int] = set()
    canonical_features = []
    matched = new_count = 0
    for station_id in sorted(records):
        station = records[station_id]
        if station.get("latitude") is None or station.get("longitude") is None:
            continue
        existing = nearest_existing_feature(station, current_eko, used)
        if existing:
            matched += 1
        else:
            new_count += 1
        canonical_features.append(build_feature(station, existing))
    unresolved_ids = {sid for sid, record in records.items() if record.get("latitude") is None or record.get("longitude") is None}
    preserved_unmatched = [feature for idx, feature in enumerate(current_eko) if idx not in used] if unresolved_ids else []
    payload["features"] = non_eko + canonical_features + preserved_unmatched
    payload["eko_update"] = {"source": EKO_MAP_URL, "official_station_count": len(records), "resolved_station_count": len(canonical_features)}
    print(f"[EKO] GeoJSON: current EKO features={len(current_eko)}, official={len(records)}, matched={matched}, new={new_count}, preserved_unmatched={len(preserved_unmatched)}")
    if not dry_run:
        GEOJSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    records = parse_station_cards(get_html(EKO_MAP_URL))
    print(f"[EKO] Parsed {len(records)} stations from official EKO map.")
    try:
        merge_smile_metadata(records, get_html(EKO_SMILE_URL))
        print(f"[EKO] Registry after EKO Smile merge: {len(records)} stations.")
    except Exception as exc:
        print(f"[EKO] WARNING: EKO Smile enrichment failed: {exc}")
    if len(records) < 95:
        raise RuntimeError(f"Only {len(records)} official stations parsed. The source page structure may have changed; refusing to continue.")
    resolve_coordinates(records)
    save_registry(records)
    update_geojson(records, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
