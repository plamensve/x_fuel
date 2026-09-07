#!/usr/bin/env python3
"""Remove orphaned files from the Supabase car-images bucket.

A file is considered orphaned when its Storage path no longer exists in
public.car_listing_images. This happens, for example, when an Auth user is
removed and PostgreSQL cascades delete the listing/image rows: database rows
are removed, but Storage object bytes are not.

The cleanup uses the Supabase Storage API (never direct DELETEs from
storage.objects), batches deletes to the Storage API limit, and keeps a short
grace period so an upload in progress is never treated as an orphan before its
car_listing_images row has been inserted.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = os.environ.get("CAR_IMAGES_BUCKET", "car-images")
PAGE_SIZE = 1000
DELETE_BATCH_SIZE = 1000
GRACE_MINUTES = int(os.environ.get("ORPHAN_GRACE_MINUTES", "15"))
DRY_RUN = os.environ.get("DRY_RUN", "false").strip().lower() in {"1", "true", "yes"}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def api_json(method: str, url: str, payload: dict | None = None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"

    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=45) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        fail(f"{method} {url} returned HTTP {exc.code}: {details}")
    except URLError as exc:
        fail(f"{method} {url} failed: {exc.reason}")


def referenced_paths() -> set[str]:
    paths: set[str] = set()
    offset = 0
    while True:
        query = urlencode(
            {
                "select": "storage_path",
                "storage_path": "not.is.null",
                "order": "id.asc",
                "limit": PAGE_SIZE,
                "offset": offset,
            }
        )
        rows = api_json("GET", f"{SUPABASE_URL}/rest/v1/car_listing_images?{query}") or []
        for row in rows:
            path = str(row.get("storage_path") or "").strip("/")
            if path:
                paths.add(path)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return paths


def list_folder(prefix: str) -> list[dict]:
    entries: list[dict] = []
    offset = 0
    endpoint = f"{SUPABASE_URL}/storage/v1/object/list/{quote(BUCKET, safe='')}"
    while True:
        page = api_json(
            "POST",
            endpoint,
            {
                "prefix": prefix,
                "limit": PAGE_SIZE,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            },
        ) or []
        entries.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return entries


def join_storage_path(prefix: str, name: str) -> str:
    clean_prefix = prefix.strip("/")
    clean_name = str(name or "").strip("/")
    if not clean_prefix:
        return clean_name
    if clean_name == clean_prefix or clean_name.startswith(f"{clean_prefix}/"):
        return clean_name
    return f"{clean_prefix}/{clean_name}"


def all_storage_files() -> list[dict]:
    files: list[dict] = []
    queue = [""]
    visited: set[str] = set()

    while queue:
        prefix = queue.pop(0).strip("/")
        if prefix in visited:
            continue
        visited.add(prefix)

        for entry in list_folder(prefix):
            path = join_storage_path(prefix, entry.get("name", ""))
            if not path:
                continue
            # Supabase list() returns id=null for virtual folders and a UUID id
            # for actual objects.
            if entry.get("id") is None:
                if path not in visited:
                    queue.append(path)
                continue
            files.append({
                "path": path,
                "created_at": entry.get("created_at"),
            })

    return files


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def find_orphans(files: list[dict], references: set[str]) -> tuple[list[str], int]:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=GRACE_MINUTES)
    orphan_paths: list[str] = []
    grace_kept = 0

    for item in files:
        path = item["path"]
        if path in references:
            continue
        created = parse_timestamp(item.get("created_at"))
        if created is None or created > cutoff:
            grace_kept += 1
            continue
        orphan_paths.append(path)

    return orphan_paths, grace_kept


def remove_paths(paths: list[str]) -> int:
    if DRY_RUN or not paths:
        return 0
    endpoint = f"{SUPABASE_URL}/storage/v1/object/{quote(BUCKET, safe='')}"
    deleted = 0
    for start in range(0, len(paths), DELETE_BATCH_SIZE):
        batch = paths[start : start + DELETE_BATCH_SIZE]
        api_json("DELETE", endpoint, {"prefixes": batch})
        deleted += len(batch)
    return deleted


def write_summary(text: str) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write(text + "\n")


def main() -> None:
    if not SUPABASE_URL:
        fail("SUPABASE_URL is missing")
    if not SERVICE_ROLE_KEY:
        fail("SUPABASE_SERVICE_ROLE_KEY is missing")

    references = referenced_paths()
    files = all_storage_files()
    orphans, grace_kept = find_orphans(files, references)

    print(f"Bucket: {BUCKET}")
    print(f"Referenced image rows: {len(references)}")
    print(f"Storage files: {len(files)}")
    print(f"Orphans older than {GRACE_MINUTES} min: {len(orphans)}")
    print(f"Unreferenced files still inside grace window: {grace_kept}")

    if orphans:
        for path in orphans:
            print(f"ORPHAN: {path}")

    deleted = remove_paths(orphans)
    if DRY_RUN:
        print("DRY_RUN=true; no Storage objects were deleted.")
    else:
        print(f"Deleted Storage objects: {deleted}")

    write_summary(
        "\n".join(
            [
                "### Car image orphan cleanup",
                f"- Referenced image rows: **{len(references)}**",
                f"- Storage files scanned: **{len(files)}**",
                f"- Orphans found: **{len(orphans)}**",
                f"- Deleted: **{deleted}**",
                f"- Grace window: **{GRACE_MINUTES} minutes**",
            ]
        )
    )


if __name__ == "__main__":
    main()
