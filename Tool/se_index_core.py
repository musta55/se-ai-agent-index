"""
se_index_core.py

Shared q-id assignment logic used by query_runner.py and build_query_index.py.

IMPORTANT: New columns must be appended at the END of COLUMN_MAP only.
           Re-ordering or inserting into the middle will break existing q-id numbers.
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEXING_DIR = os.path.join(BASE_DIR, "..", "Indexing")

# Agent name (lowercase) → JSON filename in Indexing/
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

CATEGORY_ALIASES = {
    "testing":      ["Testing_and_Evaluation",        "Testing_and_Reliability"],
    "cicd":         ["CICD_and_Deployment",            "Integration_and_Infrastructure_CICD"],
    "code_review":  ["Code_Review",                    "Code_Review_Process"],
    "bug_solving":  ["Bug_Solving_and_Issue_Tracking", "Bug_Solving_Approaches"],
    "methodology":  ["SE_Methodology",                 "Software_Engineering_Methodology"],
    "team_comm":    ["Team_Communication"],
    "docs":         ["Holistic_Documentation"],
    "llm":          ["LLM_Integration_and_Prompt_Management"],
}


def _normalize_desc_item(item):
    """Normalize a Description item to always have a 'Summary' key.

    Some JSON files store Description as {"value": "...", "evidence": [...]}
    instead of {"Summary": "...", "evidence": [...]}. This normalizes both.
    """
    if not isinstance(item, dict):
        return item
    if "Summary" not in item and "value" in item:
        return {
            "Summary": item.get("value", ""),
            "evidence": item.get("evidence", []),
            "q_id": item.get("q_id", ""),
        }
    return item


def _get_description(data):
    desc = data.get("Description", [])
    if isinstance(desc, list):
        return [_normalize_desc_item(i) for i in desc]
    if isinstance(desc, dict):
        return [_normalize_desc_item(desc)]
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



# Column number → (human label, accessor).
# APPEND NEW COLUMNS AT THE END ONLY — inserting anywhere above q-31 shifts existing ids.
COLUMN_MAP = {
    2:  ("Description",                   _get_description),
    3:  ("Testing > Practices",           _make_accessor("testing",     "Practices")),
    4:  ("Testing > Tools",               _make_accessor("testing",     "Tools")),
    5:  ("Testing > Stakeholders",        _make_accessor("testing",     "Stakeholders")),
    6:  ("Testing > Others",              _make_accessor("testing",     "Others")),
    7:  ("CI/CD > Practices",             _make_accessor("cicd",        "Practices")),
    8:  ("CI/CD > Tools",                 _make_accessor("cicd",        "Tools")),
    9:  ("CI/CD > Others",                _make_accessor("cicd",        "Others")),
    10: ("CI/CD > Stakeholders",          _make_accessor("cicd",        "Stakeholders")),
    11: ("Code Review > Practices",       _make_accessor("code_review", "Practices")),
    12: ("Code Review > Tools",           _make_accessor("code_review", "Tools")),
    13: ("Code Review > Stakeholders",    _make_accessor("code_review", "Stakeholders")),
    14: ("Bug Solving > Practices",       _make_accessor("bug_solving", "Practices")),
    15: ("Bug Solving > Tools",           _make_accessor("bug_solving", "Tools")),
    16: ("Bug Solving > Others",          _make_accessor("bug_solving", "Others")),
    17: ("Bug Solving > Stakeholders",    _make_accessor("bug_solving", "Stakeholders")),
    18: ("SE Methodology > Practices",    _make_accessor("methodology", "Practices")),
    19: ("SE Methodology > Tools",        _make_accessor("methodology", "Tools")),
    20: ("SE Methodology > Stakeholders", _make_accessor("methodology", "Stakeholders")),
    21: ("SE Methodology > Others",       _make_accessor("methodology", "Others")),
    22: ("Dev Communication > Practices", _make_accessor("team_comm",   "Practices")),
    23: ("Dev Communication > Tools",     _make_accessor("team_comm",   "Tools")),
    24: ("Documentation > Practices",     _make_accessor("docs",        "Practices")),
    25: ("Documentation > Tools",         _make_accessor("docs",        "Tools")),
    26: ("Documentation > Stakeholders",  _make_accessor("docs",        "Stakeholders")),
    27: ("Documentation > Others",        _make_accessor("docs",        "Others")),
    28: ("LLM Integration > Practices",   _make_accessor("llm",         "Practices")),
    29: ("LLM Integration > Tools",       _make_accessor("llm",         "Tools")),
    30: ("LLM Integration > Stakeholders", _make_accessor("llm",        "Stakeholders")),
    31: ("LLM Integration > Others",      _make_accessor("llm",         "Others")),
    # ── Columns added after initial release — do NOT reorder above ────────────
    32: ("Bug Solving > Issues",             _make_accessor("bug_solving", "Issues")),
    33: ("Code Review > Others",             _make_accessor("code_review", "Others")),
    34: ("Dev Communication > Stakeholders", _make_accessor("team_comm",   "Stakeholders")),
    35: ("Dev Communication > Others",       _make_accessor("team_comm",   "Others")),
    # Col 36 (Repository Statistics) removed — shown alongside Description in query output,
    # not as a separate q-id (the JSON block has no q_id field of its own).
}

ORDERED_COLS = sorted(COLUMN_MAP.keys())


def normalize_references(raw):
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
    resolved = []
    for ev in evidence_list:
        if not isinstance(ev, dict):
            continue
        cite_str = ev.get("citation", "")
        ref_obj = references.get(cite_str, cite_str)
        resolved.append({
            "quote": ev.get("quote", "").strip(),
            "citation": ref_obj,
        })
    return resolved


def is_real_summary(summary):
    if not summary or not summary.strip():
        return False
    return not summary.strip().lower().startswith("not available")


def build_agent_index(data):
    """
    Build q-id index from JSON items.  Q-ids are taken directly from the
    'q_id' field embedded in each JSON item (e.g. "q_60" → "q-60"), so the
    spreadsheet and JSON share the same identifiers.  Items that lack a q_id
    field (e.g. old-format Description objects) fall back to a counter that
    avoids collisions with existing ids.

    Returns:
      query_entries : dict  q-id → {column_label, array_index, summary, evidence}
      col_item_qids : dict  col_num → {array_index → q-id}
    """
    references = normalize_references(data.get("References", {}))
    fallback_counter = [1]
    query_entries = {}
    col_item_qids = {}

    def _next_fallback():
        while f"q-{fallback_counter[0]}" in query_entries:
            fallback_counter[0] += 1
        qid = f"q-{fallback_counter[0]}"
        fallback_counter[0] += 1
        return qid

    for col in ORDERED_COLS:
        label, accessor = COLUMN_MAP[col]
        items = accessor(data)
        col_item_qids[col] = {}

        for i, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            summary = item.get("Summary", "").strip()
            evidence = resolve_evidence(item.get("evidence", []), references)

            if not is_real_summary(summary):
                continue

            # Use the q_id embedded in the JSON (q_60 → q-60); fall back to counter.
            raw = item.get("q_id", "").strip()
            if raw:
                q_id = raw.replace("_", "-")
            else:
                q_id = _next_fallback()

            query_entries[q_id] = {
                "column_label": label,
                "array_index": i,
                "summary": summary,
                "evidence": evidence,
            }
            col_item_qids[col][i] = q_id

    return query_entries, col_item_qids


def load_json(filename):
    with open(os.path.join(INDEXING_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)


def fuzzy_match_agent(agent_name):
    """Case-insensitive exact match, then prefix match. Returns (key, filename) or (None, None)."""
    lower = agent_name.lower()
    for key in AGENT_JSON_MAP:
        if key == lower:
            return key, AGENT_JSON_MAP[key]
    for key in AGENT_JSON_MAP:
        if key.startswith(lower) or lower.startswith(key):
            return key, AGENT_JSON_MAP[key]
    return None, None
