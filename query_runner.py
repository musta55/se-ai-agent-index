"""
query_runner.py

Looks up a query ID for a given agent in query_index.json and prints
the result as formatted JSON.

Usage:
    python3 query_runner.py "Agent Name" "q-5"

Called by se_index.sh:
    ./se_index.sh query "Agent Name" "q-5"
"""

import json
import os
import sys


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
QUERY_INDEX_PATH = os.path.join(BASE_DIR, "query_index.json")


def load_index():
    if not os.path.exists(QUERY_INDEX_PATH):
        print(f"Error: query_index.json not found at {QUERY_INDEX_PATH}", file=sys.stderr)
        print("Run 'python3 build_query_index.py' first to generate it.", file=sys.stderr)
        sys.exit(1)
    with open(QUERY_INDEX_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def fuzzy_match_agent(index, name):
    """Case-insensitive exact match, then prefix match."""
    lower = name.lower()
    for key in index:
        if key.lower() == lower:
            return key
    for key in index:
        if key.lower().startswith(lower) or lower.startswith(key.lower()):
            return key
    return None


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 query_runner.py \"Agent Name\" \"q-{id}\"", file=sys.stderr)
        sys.exit(1)

    agent_input = sys.argv[1].strip()
    query_id = sys.argv[2].strip().lower()
    if not query_id.startswith("q-"):
        query_id = f"q-{query_id}"

    index = load_index()

    # Find agent
    matched_agent = fuzzy_match_agent(index, agent_input)
    if not matched_agent:
        available = ", ".join(f'"{a}"' for a in sorted(index.keys()))
        print(f"Error: Agent '{agent_input}' not found.", file=sys.stderr)
        print(f"Available agents: {available}", file=sys.stderr)
        sys.exit(1)

    agent_data = index[matched_agent]

    # Find query entry
    if query_id not in agent_data:
        available = ", ".join(sorted(agent_data.keys(), key=lambda x: int(x.split("-")[1])))
        print(f"Error: Query ID '{query_id}' not found for agent '{matched_agent}'.", file=sys.stderr)
        print(f"Available IDs: {available}", file=sys.stderr)
        sys.exit(1)

    entry = agent_data[query_id]

    result = {
        "agent": matched_agent,
        "query_id": query_id,
        "column": entry.get("column_label", ""),
        "summary": entry.get("summary"),
        "evidence": entry.get("evidence", []),
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
