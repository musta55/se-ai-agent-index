#!/usr/bin/env python3
"""
pull_sources.py — Download all referenced web pages/files for SE index agents.

Saved into: web_sources/{agent_name}/{[N]}.{ext}
  - GitHub repo roots      → README.md downloaded as raw  → [N].md
  - GitHub blob .md files  → downloaded raw               → [N].md
  - GitHub blob .yml/.yaml → downloaded raw               → [N].yml
  - GitHub blob .json      → downloaded raw               → [N].json
  - Everything else        → downloaded as HTML            → [N].html

Usage:
    python Indexing/pull_sources.py "Glean Agents"
    python Indexing/pull_sources.py --all
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
import urllib.request
import urllib.error

INDEXING_DIR = Path(__file__).parent
BASE_DIR     = INDEXING_DIR.parent
WEB_SOURCES  = BASE_DIR / "web_sources"
AGENTS_CFG   = BASE_DIR / "Tool" / "agents_config.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# ── Helpers ──────────────────────────────────────────────────────────────────

def safe_dir(agent_name: str) -> str:
    return re.sub(r'[^\w\-]', '_', agent_name.strip())


def normalize_refs(data: dict) -> dict:
    """Return {citation_key: {"Link": str, "Website_Type": str}} regardless of schema."""
    refs = data.get("References", {})
    if isinstance(refs, dict):
        return refs
    # List format: [{id: "[1]", url: "...", title: "..."}]
    result = {}
    for item in refs:
        key = item.get("id", "")
        if not key:
            continue
        result[key] = {
            "Website_Type": item.get("title", item.get("Website_Type", "")),
            "Link": item.get("url", item.get("link", item.get("Link", ""))),
        }
    return result


def get_agent_name(data: dict) -> str:
    return data.get("Agent_Name") or data.get("Agent Name", "unknown")


def find_index_file(agent_name: str):
    target = agent_name.lower()
    for fp in INDEXING_DIR.glob("*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            name = data.get("Agent_Name") or data.get("Agent Name", "")
            if name.lower() == target:
                return fp, data
        except Exception:
            pass
    return None, None


# ── URL classification ────────────────────────────────────────────────────────

def _path_ext(url: str) -> str:
    """Return lowercase file extension of URL path, e.g. '.yml'."""
    return Path(urlparse(url).path).suffix.lower()


def _github_path_parts(url: str):
    """Return path segments after github.com domain."""
    return urlparse(url).path.strip("/").split("/")


def _is_github(url: str) -> bool:
    return "github.com" in urlparse(url).netloc


def classify(url: str):
    """
    Return (fetch_url, extension) for the reference URL.
    Returns (None, None) if URL cannot be handled.
    """
    if not url or not url.startswith("http"):
        return None, None

    ext = _path_ext(url)

    if _is_github(url):
        parts = _github_path_parts(url)

        # Repo root (owner/repo) — download README.md
        if len(parts) == 2:
            owner, repo = parts
            raw = f"https://raw.githubusercontent.com/{owner}/{repo}/main/README.md"
            return raw, ".md"

        # blob URL — convert to raw
        if len(parts) >= 4 and parts[2] == "blob":
            owner, repo, _, branch = parts[0], parts[1], parts[2], parts[3]
            file_path = "/".join(parts[4:])
            raw = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file_path}"
            if ext in (".md",):
                return raw, ".md"
            if ext in (".yml", ".yaml"):
                return raw, ".yml"
            if ext in (".json",):
                return raw, ".json"
            return raw, ext if ext else ".txt"

        # issues/discussions page, PR, etc. — download as HTML
        return url, ".html"

    # Non-GitHub — download page as HTML
    return url, ".html"


# ── Download ──────────────────────────────────────────────────────────────────

def fetch(url: str, timeout: int = 25) -> bytes | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        print(f"        HTTP {e.code}")
        return None
    except urllib.error.URLError as e:
        print(f"        URLError: {e.reason}")
        return None
    except Exception as e:
        print(f"        Error: {e}")
        return None


def fetch_with_fallback(fetch_url: str, ext: str) -> bytes | None:
    """Try fetch_url; for README.md on main, retry with master branch."""
    content = fetch(fetch_url)
    if content is None and ext == ".md" and "/main/README.md" in fetch_url:
        fallback = fetch_url.replace("/main/README.md", "/master/README.md")
        print(f"        ↩  retrying with master branch...")
        content = fetch(fallback)
    return content


# ── Core logic ────────────────────────────────────────────────────────────────

def pull_agent(data: dict, agent_name: str | None = None):
    if not agent_name:
        agent_name = get_agent_name(data)

    refs = normalize_refs(data)
    if not refs:
        print(f"  ⚠️  No References section found")
        return 0, 0, 0

    out_dir = WEB_SOURCES / safe_dir(agent_name)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"  📁 {out_dir.relative_to(BASE_DIR)}  ({len(refs)} refs)")

    ok = skip = fail = 0

    # Sort by numeric part of citation key: [1], [2], …, [10], [11]
    def sort_key(k):
        m = re.search(r"\d+", k)
        return int(m.group()) if m else 0

    for ref_key in sorted(refs.keys(), key=sort_key):
        ref  = refs[ref_key]
        link = ref.get("Link") or ref.get("link") or ref.get("url", "")
        wtype = ref.get("Website_Type", "")

        if not link or not link.startswith("http"):
            print(f"    {ref_key:6s}  ⚠️  no URL ({wtype}) — skip")
            skip += 1
            continue

        fetch_url, ext = classify(link)
        if fetch_url is None:
            print(f"    {ref_key:6s}  ⚠️  cannot classify — skip")
            skip += 1
            continue

        out_file = out_dir / f"{ref_key}{ext}"

        if out_file.exists():
            print(f"    {ref_key:6s}  ✓  {out_file.name} already exists")
            skip += 1
            continue

        print(f"    {ref_key:6s}  ⬇   {fetch_url[:90]}")
        content = fetch_with_fallback(fetch_url, ext)

        if content:
            out_file.write_bytes(content)
            kb = len(content) / 1024
            print(f"    {ref_key:6s}  ✅  {out_file.name}  ({kb:.1f} KB)")
            ok += 1
        else:
            fail += 1

        time.sleep(0.4)  # polite crawl delay

    print(f"  → ✅ {ok} saved  ⚠️ {skip} skipped  ❌ {fail} failed")
    return ok, skip, fail


# ── .gitignore ────────────────────────────────────────────────────────────────

def ensure_gitignore():
    gi = BASE_DIR / ".gitignore"
    entry = "web_sources/"
    if gi.exists():
        if entry in gi.read_text(encoding="utf-8"):
            return
        with gi.open("a", encoding="utf-8") as f:
            f.write(f"\n{entry}\n")
    else:
        gi.write_text(f"{entry}\n", encoding="utf-8")
    print(f"✔  Added '{entry}' to .gitignore\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Download referenced web pages/files into web_sources/{agent_name}/"
    )
    parser.add_argument("agent_name", nargs="?",
                        help="Agent to pull (e.g., 'Glean Agents')")
    parser.add_argument("--all", action="store_true",
                        help="Pull sources for every agent in agents_config.json")
    args = parser.parse_args()

    if not args.agent_name and not args.all:
        parser.print_help()
        sys.exit(1)

    ensure_gitignore()
    WEB_SOURCES.mkdir(exist_ok=True)

    if args.all:
        with open(AGENTS_CFG, encoding="utf-8") as f:
            cfg = json.load(f)
        agent_names = [a["agent_name"] for a in cfg]
    else:
        agent_names = [args.agent_name]

    total_ok = total_skip = total_fail = 0

    for agent_name in agent_names:
        print(f"\n{'='*60}\n🌐  {agent_name}\n{'='*60}")
        fp, data = find_index_file(agent_name)
        if not fp:
            print(f"  ❌ No index JSON found for '{agent_name}'")
            continue
        print(f"  📄 {fp.name}")
        ok, sk, fa = pull_agent(data, agent_name)
        total_ok   += ok
        total_skip += sk
        total_fail += fa

    print(f"\n{'='*60}")
    print(f"Total: ✅ {total_ok} saved  ⚠️ {total_skip} skipped  ❌ {total_fail} failed")
    print(f"Output: {WEB_SOURCES}")
    print('='*60)


if __name__ == "__main__":
    main()
