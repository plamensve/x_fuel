from __future__ import annotations

import hashlib


DAYLIGHT_SCENE_VARIANTS = (
    "a sunny late-morning city boulevard with a modern fuel station and everyday traffic, wide driver-eye-level composition",
    "a bright overcast afternoon at a clean roadside fuel station with moving cars, documentary street-photography composition",
    "a clear midday highway interchange near a Bulgarian city with a fuel station in the distance, elevated wide composition",
    "a crisp daytime three-quarter view of a passenger car arriving at a fuel station, natural shadows and editorial negative space",
    "a sunlit suburban road with a fuel-station canopy and realistic traffic, medium telephoto business-news composition",
    "a bright daytime road-transport and logistics scene with a fuel tanker in the background and cars in the foreground, wide journalistic shot",
    "a clean morning fuel-station forecourt in a Bulgarian city with varied vehicles and a light sky, street-level editorial composition",
    "a warm fully daylight afternoon view of a regional road connecting Bulgarian cities, cars and fuel infrastructure, cinematic wide composition",
)


def daylight_prompt(date_str: str, salt: str = "hero") -> str:
    digest = hashlib.sha256(f"{date_str}:{salt}".encode("utf-8")).digest()
    scene = DAYLIGHT_SCENE_VARIANTS[int.from_bytes(digest[:2], "big") % len(DAYLIGHT_SCENE_VARIANTS)]
    return (
        f"Use this date-specific visual direction: {scene}. "
        "The scene must be unmistakably daytime with bright natural daylight and a light sky. "
        "Never show night, evening, dusk, dawn, blue hour, sunset, neon-dominated lighting or a dark sky."
    )
