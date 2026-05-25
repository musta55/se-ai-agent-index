"""
build_query_index.py

Reads all JSON indexing files and the BACKUP Excel spreadsheet, then:
  1. Builds query_index.json — one q-id per JSON array item.
     Each entry stores the item's Summary + evidence with citations resolved
     to full reference objects (not just "[N]" strings).
  2. Rewrites the Excel from the backup:
     - Cells with {Summary N} / {Summary N, Category} → each placeholder
       replaced by [q-id] for that specific JSON array item (index N-1).
     - Cells without any {Summary} markers (manually written) → all q-ids for
       that column appended at the end.
     - Empty cells → built from JSON items, each followed by its [q-id].

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
    load_json,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_BACKUP = os.path.join(BASE_DIR, "Analysis of SE AI Agent Index.backup.xlsx")
EXCEL_OUTPUT = os.path.join(BASE_DIR, "Analysis of SE AI Agent Index.xlsx")
QUERY_INDEX_PATH = os.path.join(BASE_DIR, "query_index.json")

# Matches {Summary 1}, {Summary 2, Tools}, {Summary 4, Stakeholders}, etc.
SUMMARY_REF_RE = re.compile(r'\{Summary\s*(\d+)[^}]*\}', re.IGNORECASE)


# ---------------------------------------------------------------------------
# Excel cell annotation helpers
# ---------------------------------------------------------------------------

def _build_from_json(col, col_item_qids, json_items):
    qid_map = col_item_qids.get(col, {})
    parts = []
    for i, item in enumerate(json_items):
        if not isinstance(item, dict):
            continue
        q_id = qid_map.get(i)
        if q_id is None:
            continue
        summary = item.get("Summary", "").strip()
        parts.append(f"{summary} [{q_id}]")
    if parts:
        return "\n\n".join(parts), True
    return "Not Available", False


def annotate_cell(original_text, col, col_item_qids, json_items):
    """
    Produce the final cell string:

    Case 1 — Empty cell (or bare "Not Available"):
      Fill from real JSON items + [q-id].  Fall back to "Not Available".

    Case 2 — Cell has {Summary N} markers:
      Replace each marker with [q-id] for that JSON array item (index N-1).

    Case 3 — Manually written text, no {Summary} markers:
      Append all real q-ids for this column at the end.
    """
    qid_map = col_item_qids.get(col, {})
    raw = str(original_text).strip() if original_text is not None else ""

    is_empty_or_na = raw == "" or raw.lower() in (
        "not available", "not available.", "n/a"
    )

    if is_empty_or_na:
        text, _ = _build_from_json(col, col_item_qids, json_items)
        return text

    text = str(original_text)

    if SUMMARY_REF_RE.search(text):
        def replacer(m):
            n = int(m.group(1))
            q_id = qid_map.get(n - 1)
            return f"[{q_id}]" if q_id else ""

        cleaned = SUMMARY_REF_RE.sub(replacer, text)
        cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
        return cleaned.strip()

    if qid_map:
        all_qids = " ".join(
            f"[{q_id}]" for q_id in
            sorted(qid_map.values(), key=lambda x: int(x.split("-")[1]))
        )
        return f"{text.rstrip()} {all_qids}"

    return text


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    if not os.path.exists(EXCEL_BACKUP):
        raise FileNotFoundError(
            f"Backup not found: {EXCEL_BACKUP}\n"
            "Make a backup of the original Excel before running."
        )

    wb_src = openpyxl.load_workbook(EXCEL_BACKUP)
    ws_src = wb_src.active

    wb_out = openpyxl.load_workbook(EXCEL_BACKUP)
    ws_out = wb_out.active

    query_index = {}

    for row in range(3, ws_src.max_row + 1):
        agent_cell = ws_src.cell(row=row, column=1).value
        if not agent_cell:
            continue

        agent_name = agent_cell.strip()
        agent_key = agent_name.lower()

        json_file = AGENT_JSON_MAP.get(agent_key)
        if not json_file:
            print(f"  [WARN] No JSON mapping for: {agent_name!r}")
            continue

        print(f"\nProcessing: {agent_name}")
        data = load_json(json_file)

        agent_entries, col_item_qids = build_agent_index(data)
        query_index[agent_name] = agent_entries

        for col in ORDERED_COLS:
            label, accessor = COLUMN_MAP[col]
            items = accessor(data)
            original = ws_src.cell(row=row, column=col).value
            new_text = annotate_cell(original, col, col_item_qids, items)
            ws_out.cell(row=row, column=col).value = new_text

            n_ids = len(col_item_qids.get(col, {}))
            if original is None or (isinstance(original, str) and original.strip() == ""):
                print(f"    Col {col} ({label}): filled from JSON  [{n_ids} q-ids]")
            elif SUMMARY_REF_RE.search(str(original or "")):
                print(f"    Col {col} ({label}): replaced {{Summary N}}  [{n_ids} q-ids]")
            else:
                print(f"    Col {col} ({label}): appended q-ids  [{n_ids} q-ids]")

    wb_out.save(EXCEL_OUTPUT)
    print(f"\nExcel saved: {EXCEL_OUTPUT}")

    with open(QUERY_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(query_index, f, indent=2, ensure_ascii=False)
    print(f"Query index saved: {QUERY_INDEX_PATH}")

    total = sum(len(v) for v in query_index.values())
    print(f"\nDone: {len(query_index)} agents, {total} query entries total.")


if __name__ == "__main__":
    main()
