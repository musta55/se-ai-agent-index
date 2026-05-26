"""
build_query_index.py

Reads the Legacy Excel as the source of truth for cell text, remaps the old
sequential [q-N] tags to the JSON-embedded q-ids, writes the result to the
current output Excel (with corrected column layout), and also regenerates
query_index.json.

Old-sequential q-ids were assigned by iterating ORDERED_COLS in counter order.
JSON-embedded q-ids (q_60, q_61, …) are the canonical ids going forward.

Run from the SE Indexing Tool directory:
    python3 build_query_index.py
"""

import json
import os
import re

import openpyxl

from se_index_core import (
    AGENT_JSON_MAP,
    COLUMN_MAP,
    ORDERED_COLS,
    build_agent_index,
    is_real_summary,
    load_json,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
PAPER_DIR  = os.path.join(BASE_DIR, "SE Indexing for AI Agents")
EXCEL_LEGACY = os.path.join(BASE_DIR, "SE AI Agent Index Legacy 2.xlsx")
EXCEL_OUTPUT = os.path.join(PAPER_DIR, "Analysis of SE AI Agent Index.xlsx")
QUERY_INDEX_PATH = os.path.join(BASE_DIR, "query_index.json")

# ---------------------------------------------------------------------------
# Legacy column → current COLUMN_MAP column
# The legacy Excel had CI/CD Stakeholders/Others swapped, Code Review Others
# at col 14, Bug Solving Others at col 18 (not 16), Dev Comm Stakeholders/
# Others at cols 25-26, etc.  Columns not in this map are skipped.
# ---------------------------------------------------------------------------
LEGACY_TO_CURRENT_COL = {
    1:  1,   # Agent name
    2:  2,   # Description
    3:  3,   # Testing > Practices
    4:  4,   # Testing > Tools
    5:  5,   # Testing > Stakeholders
    6:  6,   # Testing > Others
    7:  7,   # CI/CD > Practices
    8:  8,   # CI/CD > Tools
    9:  10,  # CI/CD Stakeholders (legacy col 9) → current col 10
    10: 9,   # CI/CD Others (legacy col 10) → current col 9
    11: 11,  # Code Review > Practices
    12: 12,  # Code Review > Tools
    13: 13,  # Code Review > Stakeholders
    14: 33,  # Code Review Others (legacy col 14) → current col 33
    15: 14,  # Bug Solving > Practices
    16: 15,  # Bug Solving > Tools
    17: 17,  # Bug Solving > Stakeholders
    18: 16,  # Bug Solving Others (legacy col 18) → current col 16
    19: 18,  # SE Methodology > Practices
    20: 19,  # SE Methodology > Tools
    21: 20,  # SE Methodology > Stakeholders
    22: 21,  # SE Methodology > Others
    23: 22,  # Dev Communication > Practices
    24: 23,  # Dev Communication > Tools
    25: 34,  # Dev Comm Stakeholders (legacy col 25) → current col 34
    26: 35,  # Dev Comm Others (legacy col 26) → current col 35
    27: 24,  # Documentation > Practices
    28: 25,  # Documentation > Tools
    29: 26,  # Documentation > Stakeholders
    30: 27,  # Documentation > Others
    31: 28,  # LLM Integration > Practices
    32: 29,  # LLM Integration > Tools
    33: 30,  # LLM Integration > Stakeholders
    34: 31,  # LLM Integration > Others
    # Col 32 (Bug Solving > Issues) has no legacy counterpart — left empty.
}

# ---------------------------------------------------------------------------
# Build old-sequential q-id index (what build_agent_index used to produce)
# This lets us map [q-N] tags in the legacy Excel to (col, array_index).
# ---------------------------------------------------------------------------

def build_old_sequential_index(data):
    """Return {old_q_id: (col, array_index)} using the pre-JSON counter scheme."""
    counter = [1]
    old_qid_to_pos = {}
    for col in ORDERED_COLS:
        _, accessor = COLUMN_MAP[col]
        items = accessor(data)
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            summary = item.get("Summary", "").strip()
            if not is_real_summary(summary):
                continue
            old_qid_to_pos[f"q-{counter[0]}"] = (col, i)
            counter[0] += 1
    return old_qid_to_pos


def build_qid_mapping(data):
    """
    Return {old_q_id: new_q_id} for one agent.

    old_q_id: sequential id assigned by the legacy counter scheme
    new_q_id: JSON-embedded q_id (q_60 → q-60), or fallback counter
    """
    old_qid_to_pos = build_old_sequential_index(data)

    # new q-ids keyed by (col, array_index)
    new_col_item_qids = {}   # col → {array_index → new_q_id}
    used = set()
    fallback = [1]

    def _next_fallback():
        while f"q-{fallback[0]}" in used:
            fallback[0] += 1
        qid = f"q-{fallback[0]}"
        fallback[0] += 1
        return qid

    for col in ORDERED_COLS:
        _, accessor = COLUMN_MAP[col]
        items = accessor(data)
        new_col_item_qids[col] = {}
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            summary = item.get("Summary", "").strip()
            if not is_real_summary(summary):
                continue
            raw = item.get("q_id", "").strip()
            new_q_id = raw.replace("_", "-") if raw else _next_fallback()
            used.add(new_q_id)
            new_col_item_qids[col][i] = new_q_id

    mapping = {}
    for old_q_id, (col, idx) in old_qid_to_pos.items():
        new_q_id = new_col_item_qids.get(col, {}).get(idx)
        if new_q_id:
            mapping[old_q_id] = new_q_id

    return mapping


# ---------------------------------------------------------------------------
# Replace [q-N] tags inside a cell string using the mapping
# ---------------------------------------------------------------------------

def replace_qids(text, mapping):
    """Replace every [q-N] occurrence with [new_q_id] using mapping."""
    if not text:
        return text

    def replacer(m):
        old = f"q-{m.group(1)}"
        new = mapping.get(old)
        return f"[{new}]" if new else m.group(0)

    return re.sub(r'\[q-(\d+)\]', replacer, text)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not os.path.exists(EXCEL_LEGACY):
        raise FileNotFoundError(
            f"Legacy Excel not found: {EXCEL_LEGACY}\n"
            "This file is the source of truth for manually curated cell text."
        )

    wb_legacy = openpyxl.load_workbook(EXCEL_LEGACY)
    ws_legacy = wb_legacy.active

    # Use the backup as the structural template for the output workbook
    # (headers, formatting, etc.) then overwrite data rows.
    backup_path = os.path.join(BASE_DIR, "Analysis of SE AI Agent Index.backup.xlsx")
    if os.path.exists(backup_path):
        wb_out = openpyxl.load_workbook(backup_path)
    else:
        wb_out = openpyxl.load_workbook(EXCEL_LEGACY)
    ws_out = wb_out.active

    query_index = {}

    # Iterate legacy rows (data starts at row 3)
    for row in range(3, ws_legacy.max_row + 1):
        agent_cell = ws_legacy.cell(row=row, column=1).value
        if not agent_cell:
            continue

        agent_name = str(agent_cell).strip()
        agent_key  = agent_name.lower()

        json_file = AGENT_JSON_MAP.get(agent_key)
        if not json_file:
            print(f"  [WARN] No JSON mapping for: {agent_name!r}")
            continue

        print(f"\nProcessing: {agent_name}")
        data = load_json(json_file)

        # Build query index entries (new JSON-based q-ids) for query_index.json
        agent_entries, _ = build_agent_index(data)
        query_index[agent_name] = agent_entries

        # Build old→new q-id mapping for this agent
        mapping = build_qid_mapping(data)
        print(f"  q-id mapping: {len(mapping)} entries")

        # Copy legacy cell text (with q-ids updated) into output workbook
        for legacy_col, current_col in LEGACY_TO_CURRENT_COL.items():
            legacy_val = ws_legacy.cell(row=row, column=legacy_col).value
            if legacy_val is None:
                ws_out.cell(row=row, column=current_col).value = None
                continue

            updated = replace_qids(str(legacy_val), mapping)
            ws_out.cell(row=row, column=current_col).value = updated

        # Col 32 (Bug Solving > Issues) has no legacy counterpart — leave empty.

    wb_out.save(EXCEL_OUTPUT)
    print(f"\nExcel saved: {EXCEL_OUTPUT}")

    with open(QUERY_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(query_index, f, indent=2, ensure_ascii=False)
    print(f"Query index saved: {QUERY_INDEX_PATH}")

    total = sum(len(v) for v in query_index.values())
    print(f"\nDone: {len(query_index)} agents, {total} query entries total.")


if __name__ == "__main__":
    main()
