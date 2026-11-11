"""
build_query_index.py

Regenerates tool/query_index.json from the per-agent evidence JSON files in
data/Indexing/. The index maps (agent, q-id) → summary + evidence and backs the
`list-queries` and `agents` commands of se_index.sh. (`query` reads the JSON
files directly.)

The agents included, and their display names, come from AGENT_DISPLAY_NAMES in
se_index_core.py.

Run from the project root:
    python3 tool/build_query_index.py
"""

import json
import os

from se_index_core import AGENT_DISPLAY_NAMES, build_agent_index, load_json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
QUERY_INDEX_PATH = os.path.join(BASE_DIR, "query_index.json")


def main():
    query_index = {}
    for json_file, agent_name in AGENT_DISPLAY_NAMES.items():
        entries, _ = build_agent_index(load_json(json_file))
        query_index[agent_name] = entries
        print(f"  {agent_name:<26} {len(entries):>3} q-ids  ({json_file})")

    with open(QUERY_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(query_index, f, indent=2, ensure_ascii=False)

    total = sum(len(v) for v in query_index.values())
    print(f"\nQuery index saved: {QUERY_INDEX_PATH}")
    print(f"Done: {len(query_index)} agents, {total} query entries total.")


if __name__ == "__main__":
    main()
