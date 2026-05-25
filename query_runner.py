"""
query_runner.py

Looks up a query ID for a given agent by reading the source JSON directly
from the Indexing/ directory — no query_index.json cache required.

For Description queries (q-1 on most agents), Repository_Statistics is
automatically included in the output since it has no q-id of its own.

Usage:
    python3 query_runner.py "Agent Name" "q-5"

Called by se_index.sh:
    ./se_index.sh query "Agent Name" "q-5"
"""

import json
import sys

from se_index_core import (
    AGENT_JSON_MAP,
    build_agent_index,
    fuzzy_match_agent,
    load_json,
)


def get_repo_stats(data):
    """Return the raw Repository_Statistics dict, or None if absent/empty."""
    rs = data.get("Repository_Statistics", data.get("Repository Statistics", {}))
    return rs if rs and isinstance(rs, dict) else None


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 query_runner.py \"Agent Name\" \"q-{id}\"", file=sys.stderr)
        sys.exit(1)

    agent_input = sys.argv[1].strip()
    query_id = sys.argv[2].strip().lower()
    if not query_id.startswith("q-"):
        query_id = f"q-{query_id}"

    matched_key, json_file = fuzzy_match_agent(agent_input)
    if not matched_key:
        available = ", ".join(f'"{a}"' for a in sorted(AGENT_JSON_MAP.keys()))
        print(f"Error: Agent '{agent_input}' not found.", file=sys.stderr)
        print(f"Available agents: {available}", file=sys.stderr)
        sys.exit(1)

    data = load_json(json_file)
    agent_display = data.get("Agent_Name", data.get("Agent Name", matched_key))

    query_entries, _ = build_agent_index(data)

    if query_id not in query_entries:
        available = ", ".join(
            sorted(query_entries.keys(), key=lambda x: int(x.split("-")[1]))
        )
        print(f"Error: Query ID '{query_id}' not found for agent '{agent_display}'.", file=sys.stderr)
        print(f"Available IDs: {available}", file=sys.stderr)
        sys.exit(1)

    entry = query_entries[query_id]

    result = {
        "agent": agent_display,
        "query_id": query_id,
        "column": entry.get("column_label", ""),
        "summary": entry.get("summary"),
        "evidence": entry.get("evidence", []),
    }

    # Description queries include Repository_Statistics (it has no q-id of its own)
    if entry.get("column_label") == "Description":
        rs = get_repo_stats(data)
        if rs:
            result["repository_statistics"] = rs

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
