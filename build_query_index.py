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

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEXING_DIR = os.path.join(BASE_DIR, "Indexing")
EXCEL_BACKUP = os.path.join(BASE_DIR, "Analysis of SE AI Agent Index.backup.xlsx")
EXCEL_OUTPUT = os.path.join(BASE_DIR, "Analysis of SE AI Agent Index.xlsx")
QUERY_INDEX_PATH = os.path.join(BASE_DIR, "query_index.json")

# ---------------------------------------------------------------------------
# Agent name in Excel → JSON filename (matched case-insensitively)
# ---------------------------------------------------------------------------
AGENT_JSON_MAP = {
    "hubspot breeze studio":  "hubspot_breeze_studio_se_index.json",
    "watsonx orchestrate":    "watsonx_orchestrate_se_index.json",
    "gemini enterprise":      "gemini_enterprise_se_index.json",
    "glean agents":           "glean_agents_se_index.json",
    "amazonq developer":      "amazon_q_developer_se_index.json",
    "gemini cli":             "gemini_cli_se_index.json",
    "kimi ok computer":       "kimi_ok_computer_se_index.json",
    "anthropic claude code":  "anthropic_claude_code_se_index.json",
    "google gemini":          "google_gemini_se_index.json",
    "browser use":            "browser_use_se_index.json",
    "opera neon":             "opera_neon_se_index.json",
    "alibaba mobile agent":   "alibaba_mobile_agent_se_index.json",
    "perplexity comet":       "perplexity_comet_se_index.json",
}

# ---------------------------------------------------------------------------
# Category key aliases — two schema variants exist across the JSON files.
# Accessor tries each alias in order until one is found.
# ---------------------------------------------------------------------------
CATEGORY_ALIASES = {
    "testing":      ["Testing_and_Evaluation",       "Testing_and_Reliability"],
    "cicd":         ["CICD_and_Deployment",           "Integration_and_Infrastructure_CICD"],
    "code_review":  ["Code_Review",                   "Code_Review_Process"],
    "bug_solving":  ["Bug_Solving_and_Issue_Tracking", "Bug_Solving_Approaches"],
    "methodology":  ["SE_Methodology",                "Software_Engineering_Methodology"],
    "team_comm":    ["Team_Communication"],
    "docs":         ["Holistic_Documentation"],
    "llm":          ["LLM_Integration_and_Prompt_Management"],
}


def _get_description(data):
    desc = data.get("Description", [])
    if isinstance(desc, list):
        return desc
    if isinstance(desc, dict):
        # Some files store Description as a single object rather than a list
        return [desc]
    return []


def _make_accessor(cat_key, subcategory):
    aliases = CATEGORY_ALIASES[cat_key]

    def accessor(data):
        se = data.get("SE_Practices", {})
        for alias in aliases:
            cat = se.get(alias)
            if cat and isinstance(cat, dict):
                items = cat.get(subcategory, [])
                return items if isinstance(items, list) else []
        return []

    return accessor


# Column number → (human label, accessor)
COLUMN_MAP = {
    2:  ("Description",                _get_description),
    3:  ("Testing > Practices",        _make_accessor("testing",     "Practices")),
    4:  ("Testing > Tools",            _make_accessor("testing",     "Tools")),
    5:  ("Testing > Stakeholders",     _make_accessor("testing",     "Stakeholders")),
    6:  ("Testing > Others",           _make_accessor("testing",     "Others")),
    7:  ("CI/CD > Practices",          _make_accessor("cicd",        "Practices")),
    8:  ("CI/CD > Tools",              _make_accessor("cicd",        "Tools")),
    9:  ("CI/CD > Others",             _make_accessor("cicd",        "Others")),
    10: ("CI/CD > Stakeholders",       _make_accessor("cicd",        "Stakeholders")),
    11: ("Code Review > Practices",    _make_accessor("code_review", "Practices")),
    12: ("Code Review > Tools",        _make_accessor("code_review", "Tools")),
    13: ("Code Review > Stakeholders", _make_accessor("code_review", "Stakeholders")),
    14: ("Bug Solving > Practices",    _make_accessor("bug_solving", "Practices")),
    15: ("Bug Solving > Tools",        _make_accessor("bug_solving", "Tools")),
    16: ("Bug Solving > Others",       _make_accessor("bug_solving", "Others")),
    17: ("Bug Solving > Stakeholders", _make_accessor("bug_solving", "Stakeholders")),
    18: ("SE Methodology > Practices", _make_accessor("methodology", "Practices")),
    19: ("SE Methodology > Tools",     _make_accessor("methodology", "Tools")),
    20: ("SE Methodology > Stakeholders", _make_accessor("methodology", "Stakeholders")),
    21: ("SE Methodology > Others",    _make_accessor("methodology", "Others")),
    22: ("Dev Communication > Practices", _make_accessor("team_comm", "Practices")),
    23: ("Dev Communication > Tools",  _make_accessor("team_comm",   "Tools")),
    24: ("Documentation > Practices",  _make_accessor("docs",        "Practices")),
    25: ("Documentation > Tools",      _make_accessor("docs",        "Tools")),
    26: ("Documentation > Stakeholders", _make_accessor("docs",      "Stakeholders")),
    27: ("Documentation > Others",     _make_accessor("docs",        "Others")),
    28: ("LLM Integration > Practices", _make_accessor("llm",        "Practices")),
    29: ("LLM Integration > Tools",    _make_accessor("llm",         "Tools")),
    30: ("LLM Integration > Stakeholders", _make_accessor("llm",     "Stakeholders")),
    31: ("LLM Integration > Others",   _make_accessor("llm",         "Others")),
}

ORDERED_COLS = sorted(COLUMN_MAP.keys())

# Matches {Summary 1}, {Summary 2, Tools}, {Summary 4, Stakeholders}, etc.
# Group 1 captures the integer N.
SUMMARY_REF_RE = re.compile(r'\{Summary\s*(\d+)[^}]*\}', re.IGNORECASE)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_json(filename):
    with open(os.path.join(INDEXING_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_references(raw):
    """
    Normalise References to a plain dict keyed by citation string (e.g. '[3]').

    Handles three formats found across JSON files:
      - dict  { "[1]": {Website_Type, Link, ...}, ... }          (most files)
      - list  [ {id: "[1]", title: ..., url: ...}, ... ]         (Gemini Enterprise)
      - list  [ {id: "[1]", url: ..., description: ...}, ... ]   (Browser Use)
    """
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, list):
        result = {}
        for item in raw:
            if isinstance(item, dict) and "id" in item:
                result[item["id"]] = item
        return result
    return {}


def resolve_evidence(evidence_list, references):
    """Replace citation strings like '[11]' with the full reference object."""
    resolved = []
    for ev in evidence_list:
        if not isinstance(ev, dict):
            continue
        cite_str = ev.get("citation", "")
        ref_obj = references.get(cite_str, cite_str)  # fall back to raw string if not found
        resolved.append({
            "quote": ev.get("quote", "").strip(),
            "citation": ref_obj,
        })
    return resolved


def is_real_summary(summary):
    """True only if the summary contains actual SE practice data (not a Not Available marker)."""
    if not summary or not summary.strip():
        return False
    return not summary.strip().lower().startswith("not available")


def build_agent_index(data):
    """
    Assign q-ids to every JSON array item that has real (non-NA) summary content.
    Items whose summaries are None, empty, or start with 'Not Available' are skipped
    — they are not queryable and should not appear as [q-id] references.

    Returns:
      query_entries : dict  q-id → {column_label, array_index, summary, evidence}
      col_item_qids : dict  col_num → {array_index → q-id}   (only real items)
    """
    references = normalize_references(data.get("References", {}))
    counter = [1]
    query_entries = {}
    col_item_qids = {}  # col → {idx → q-id}

    for col in ORDERED_COLS:
        label, accessor = COLUMN_MAP[col]
        items = accessor(data)
        col_item_qids[col] = {}

        for i, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            summary = item.get("Summary", "").strip()
            evidence = resolve_evidence(item.get("evidence", []), references)

            # Only assign a q-id for items with real, queryable SE practice content
            if not is_real_summary(summary):
                continue

            q_id = f"q-{counter[0]}"
            counter[0] += 1

            query_entries[q_id] = {
                "column_label": label,
                "array_index": i,
                "summary": summary,
                "evidence": evidence,
            }
            col_item_qids[col][i] = q_id

    return query_entries, col_item_qids


def _build_from_json(col, col_item_qids, json_items):
    """
    Build cell text from real JSON items for this column.
    Returns (text, had_real_data):
      - text           : the filled string, or "Not Available" if nothing real exists
      - had_real_data  : True if at least one real item was found
    """
    qid_map = col_item_qids.get(col, {})
    parts = []
    for i, item in enumerate(json_items):
        if not isinstance(item, dict):
            continue
        q_id = qid_map.get(i)
        if q_id is None:
            continue  # this item had no real summary, skip
        summary = item.get("Summary", "").strip()
        parts.append(f"{summary} [{q_id}]")
    if parts:
        return "\n\n".join(parts), True
    return "Not Available", False


def annotate_cell(original_text, col, col_item_qids, json_items):
    """
    Produce the final cell string:

    Case 1 — Empty cell (or cell that only says "Not Available"):
      Fill from real JSON items + [q-id].  Fall back to "Not Available" (no q-id).

    Case 2 — Cell has {Summary N} markers:
      Replace each {Summary N} with [q-id] for that specific JSON array item (index N-1).
      Markers whose index has no real q-id are stripped cleanly.

    Case 3 — Cell has manually written meaningful text, no {Summary} markers:
      Append all real q-ids for this column at the end.
    """
    qid_map = col_item_qids.get(col, {})

    # Normalise the raw value
    raw = str(original_text).strip() if original_text is not None else ""

    # Treat genuinely empty cells AND bare "Not Available" cells the same way:
    # try to fill from JSON; fall back to "Not Available" with no q-id.
    is_empty_or_na = (
        raw == ""
        or raw.lower() == "not available"
        or raw.lower() == "not available."
        or raw.lower() == "n/a"
    )

    if is_empty_or_na:
        text, had_real = _build_from_json(col, col_item_qids, json_items)
        return text  # "Not Available" (no q-id) if nothing real was found

    text = str(original_text)

    # Case 2: has {Summary N} markers
    if SUMMARY_REF_RE.search(text):
        def replacer(m):
            n = int(m.group(1))
            array_idx = n - 1
            q_id = qid_map.get(array_idx)
            if q_id:
                return f"[{q_id}]"
            # Out-of-range: reviewer cited an item that has no matching JSON entry.
            # Strip the marker cleanly so the surrounding analysis text is preserved.
            return ""

        cleaned = SUMMARY_REF_RE.sub(replacer, text)
        # Remove any double-spaces left by stripped markers
        cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
        return cleaned.strip()

    # Case 3: manual text, no markers
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
    # Always read from backup so we start with the clean original content
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
