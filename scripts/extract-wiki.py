#!/usr/bin/env python3
"""Extracteur Wikipédia local : REST summary + vignettes WebP ≤25 Ko.

Entrée : scripts/selection-example.json (liste d'identifiants de groupes).
Sortie : public/articles/<id>.json, MANIFEST.json et FAILURES.json.
Les fichiers déjà valides sont réutilisés : l'extraction est reprenable.
"""
from __future__ import annotations

import base64
import hashlib
import html
import io
import json
import os
import re
import sys
import time
import warnings
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlparse

import requests
from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning
from PIL import Image, ImageOps

warnings.filterwarnings("ignore", category=MarkupResemblesLocatorWarning)

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "public/articles/catalog.json"
OUT = ROOT / "public/articles"
MANIFEST = OUT / "MANIFEST.json"
FAILURES = OUT / "FAILURES.json"
UA = {"User-Agent": "VectemporelWikiDownload/1.0 (local offline atlas; contact: noreply)"}
REST = {
    "fr": "https://fr.wikipedia.org/api/rest_v1/page/summary/",
    "en": "https://en.wikipedia.org/api/rest_v1/page/summary/",
}
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
MAX_ARTICLES = 200
SCHEMA = 2
MAX_IMAGE_BYTES = 25 * 1024
MAX_EXTRACT_CHARS = 1200
ALLOWED_HOSTS = ("wikipedia.org", "wikimedia.org", "wikimediausercontent.org")

SESSION = requests.Session()
SESSION.headers.update(UA)


def is_allowed(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return False
    return any(host == suffix or host.endswith("." + suffix) for suffix in ALLOWED_HOSTS)


def strip_html(value: str) -> str:
    return " ".join(BeautifulSoup(value or "", "html.parser").get_text(" ", strip=True).split())


def request_json(
    url: str, *, params: dict[str, Any] | None = None, allow_missing: bool = False
) -> dict[str, Any] | None:
    """GET borné avec retries exponentiels ; 404 optionnellement traité comme absence."""
    last: Exception | None = None
    for attempt in range(3):
        try:
            response = SESSION.get(url, params=params, timeout=20, allow_redirects=True)
            if response.status_code == 404 and allow_missing:
                return None
            if response.status_code == 429 or response.status_code >= 500:
                raise RuntimeError(f"HTTP {response.status_code}")
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise RuntimeError("réponse JSON inattendue")
            return payload
        except Exception as exc:  # noqa: BLE001 - journalisé puis retenté
            last = exc
            if attempt < 2:
                time.sleep(min(20.0, 5.0 * (attempt + 1)))
    raise RuntimeError(f"échec après 3 tentatives : {last}")


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def commons_image_info(filename: str) -> dict[str, str] | None:
    if not filename or "/" in filename or "\\" in filename:
        return None
    payload = request_json(
        COMMONS_API,
        params={
            "action": "query",
            "titles": "File:" + filename,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "format": "json",
            "formatversion": "2",
        },
    )
    pages = payload.get("query", {}).get("pages") or []
    if not pages:
        return None
    info = (pages[0].get("imageinfo") or [{}])[0]
    metadata = info.get("extmetadata") or {}
    get = lambda key: strip_html(html.unescape(str((metadata.get(key) or {}).get("value", ""))))
    license_name = get("LicenseShortName")
    license_url = get("LicenseUrl")
    restrictions = get("Restrictions").lower()
    allowed = (
        "cc by" in license_name.lower()
        or "cc0" in license_name.lower()
        or "public domain" in license_name.lower()
        or license_name.lower().startswith("pd")
    )
    if not allowed or "copyright" in restrictions:
        return None
    return {
        "filename": filename,
        "artist": get("Artist") or "Contributeur Wikimedia Commons",
        "license": license_name,
        "licenseUrl": license_url,
        "credit": get("Credit") or "Wikimedia Commons",
        "page": str(info.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/File:{quote(filename)}"),
    }


def commons_filename(image_url: str) -> str:
    if not is_allowed(image_url):
        return ""
    path = unquote(urlparse(image_url).path)
    marker = "/commons/thumb/"
    if marker in path:
        parts = path.split(marker, 1)[1].split("/")
        return parts[2] if len(parts) >= 3 else ""
    marker = "/wikipedia/commons/"
    if marker in path:
        parts = path.split(marker, 1)[1].split("/")
        return parts[2] if len(parts) >= 3 else ""
    return ""


def inline_webp(image_url: str) -> tuple[str | None, dict[str, str] | None]:
    if not is_allowed(image_url):
        return None, None
    response = SESSION.get(image_url, timeout=25, allow_redirects=True)
    response.raise_for_status()
    if len(response.content) > 8 * 1024 * 1024:
        return None, None
    try:
        source = Image.open(io.BytesIO(response.content))
        source = ImageOps.exif_transpose(source)
        source.seek(0)
        image = source.convert("RGB")
    except Exception:  # noqa: BLE001 - SVG/format non rasterisé : pas d'image inventée
        return None, None
    for width in (640, 480, 360, 260, 200):
        candidate = image.copy()
        candidate.thumbnail((width, width))
        for quality in (78, 70, 62, 54, 46, 38):
            buffer = io.BytesIO()
            candidate.save(buffer, "WEBP", quality=quality, method=6)
            if buffer.tell() <= MAX_IMAGE_BYTES:
                credit = commons_image_info(commons_filename(image_url))
                if credit is None:
                    return None, None
                return base64.b64encode(buffer.getvalue()).decode("ascii"), credit
    return None, None


def fetch_article(group: dict[str, Any]) -> dict[str, Any] | None:
    candidates: list[tuple[str, str]] = []
    for language in ("fr", "en"):
        for value in (
            group.get("label", ""),
            group.get("title", ""),
            str(group.get("wiki", "")).replace("_", " "),
        ):
            title = str(value).strip()
            if title and (language, title) not in candidates:
                candidates.append((language, title))

    summary: dict[str, Any] | None = None
    for index, (language, title) in enumerate(candidates[:5]):
        if index:
            time.sleep(1.1)
        try:
            candidate = request_json(
                REST[language] + quote(title, safe=""), allow_missing=True
            )
        except RuntimeError as exc:
            if "429" in str(exc):
                raise
            continue
        if candidate and candidate.get("type") == "standard" and candidate.get("extract"):
            summary = candidate
            break
    if summary is None:
        return None
    extract = strip_html(str(summary.get("extract", "")))
    if len(extract) < 40:
        return None
    thumbnail = as_dict(summary.get("thumbnail")).get("source", "")
    image, image_credit = (None, None)
    if isinstance(thumbnail, str) and thumbnail:
        time.sleep(0.6)
        image, image_credit = inline_webp(thumbnail)
    urls = as_dict(as_dict(summary.get("content_urls")).get("desktop"))
    return {
        "schema": SCHEMA,
        "id": group["id"],
        "title": summary.get("title", group["title"]),
        "label": group["title"],
        "description": strip_html(str(summary.get("description", ""))),
        "extract": extract[:MAX_EXTRACT_CHARS],
        "type": group["type"],
        "typeLabel": group["typeLabel"],
        "continents": group["continents"],
        "epochs": group["epochs"],
        "from": group["from"],
        "to": group["to"],
        "itemCount": group["itemCount"],
        "items": group["items"],
        "source": str(urls.get("page", "")),
        "articleLicense": "CC BY-SA 4.0",
        "image": image,
        "imageCredit": image_credit,
        "revision": str(as_dict(summary.get("revision")).get("timestamp", "")),
    }


def digest(article: dict[str, Any]) -> str:
    payload = {key: value for key, value in article.items() if key != "sha256"}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def atomic_write(path: Path, text: str) -> None:
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(text, encoding="utf-8")
    os.replace(temp, path)


def valid_local(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        article = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if article.get("schema") != SCHEMA or not article.get("extract"):
        return None
    if article.get("image") and not article.get("imageCredit"):
        return None
    if article.get("sha256") != digest(article):
        return None
    return article


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: extract-wiki.py <selection.json>", file=sys.stderr)
        return 2
    selection_raw = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    if not isinstance(selection_raw, list):
        print("sélection invalide", file=sys.stderr)
        return 2
    ids = [str(value) for value in selection_raw[:MAX_ARTICLES]]
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    by_id = {group["id"]: group for group in catalog["groups"]}
    OUT.mkdir(parents=True, exist_ok=True)

    articles: dict[str, dict[str, Any]] = {}
    failures: list[dict[str, str]] = []
    for index, article_id in enumerate(ids, start=1):
        group = by_id.get(article_id)
        if group is None:
            failures.append({"id": article_id, "error": "groupe absent du catalogue"})
            continue
        target = OUT / f"{article_id}.json"
        article = valid_local(target)
        if article is None:
            try:
                article = fetch_article(group)
            except Exception as exc:  # noqa: BLE001 - journalisé, jamais inventé
                failures.append({"id": article_id, "error": str(exc)[:180]})
                continue
            if article is None:
                failures.append({"id": article_id, "error": "résumé indisponible"})
                continue
            article["sha256"] = digest(article)
            atomic_write(target, json.dumps(article, ensure_ascii=False))
            print(f"[{index}/{len(ids)}] {article_id} : extrait", flush=True)
            time.sleep(1.2)
        articles[article_id] = article

    manifest = {
        "date": time.strftime("%Y-%m-%d"),
        "source": "Wikipédia FR REST summary + Wikimedia Commons",
        "count": len(articles),
        "articles": [
            {
                "id": article["id"],
                "title": article["title"],
                "label": article["label"],
                "description": article["description"],
                "type": article["type"],
                "typeLabel": article["typeLabel"],
                "continents": article["continents"],
                "epochs": article["epochs"],
                "itemCount": article["itemCount"],
                "hasImage": bool(article["image"]),
                "sha256": article["sha256"],
            }
            for article in sorted(articles.values(), key=lambda item: item["id"])
        ],
    }
    atomic_write(MANIFEST, json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    atomic_write(FAILURES, json.dumps(failures, ensure_ascii=False, indent=2) + "\n")
    print(f"articles : {len(articles)}/{len(ids)} — échecs : {len(failures)}")
    for failure in failures[:10]:
        print("ÉCHEC", failure["id"], failure["error"], file=sys.stderr)
    return 0 if articles else 1


if __name__ == "__main__":
    raise SystemExit(main())
