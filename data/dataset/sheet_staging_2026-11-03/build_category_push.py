"""Builds apply_categories.gs from ../open_coding_categories.json.

The category scheme (round 5) is kept in open_coding_categories.json: for each SE dimension, its
categories, their meanings and the codes in each. The generated Apps Script reads the live
Agreement Index, computes item and agent counts itself, and rewrites the Codebook and Categories
tabs. Re-run after changing the scheme:
    python3 -I build_category_push.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEME = HERE.parent / "open_coding_categories.json"
TEMPLATE = HERE / "apply_categories.template.gs"
OUT = HERE / "apply_categories.gs"

scheme = json.loads(SCHEME.read_text())

pairs = {}
for d in scheme["dimensions"]:
    for c in d["categories"]:
        for code in c["codes"]:
            key = (d["dimension"], code)
            assert key not in pairs, f"{key} is in two categories"
            pairs[key] = c["category"]
for p in scheme["not_practice"]["pairs"]:
    key = (p["dimension"], p["code"])
    assert key not in pairs, f"{key} is in two categories"
    pairs[key] = scheme["not_practice"]["category"]

payload = {
    "dimensions": [{"dimension": d["dimension"], "label": d["label"],
                    "categories": d["categories"]} for d in scheme["dimensions"]],
    "not_practice": scheme["not_practice"],
    "agent_groups": scheme["agent_groups"],
    "codebook_header": ["code", "uses"] + [d["label"] for d in scheme["dimensions"]] + ["item ids (at last run)"],
    "categories_header": ["dimension", "category", "meaning", "codes", "items", "agents", "agents, agent-specific items"],
    "notes": [
        "items: Practices items in this dimension with at least one code of this category. "
        "agents: how many agents have such an item. agents, agent-specific items: the same, "
        "leaving out items marked Company = yes or Marketing piece = yes.",
        "Per-agent columns give the number of items. codes is live; the other counts were computed "
        "by apply_categories.gs from the Agreement Index when it last ran, so re-run it after recoding.",
        "Categories are scoped to one dimension; Codebook columns C to I give each code's category "
        "in each dimension it is used in. Scheme: data/dataset/open_coding_categories.json.",
    ],
}

text = TEMPLATE.read_text().replace("/*PAYLOAD*/", json.dumps(payload, ensure_ascii=False, indent=1))
OUT.write_text(text)
n_cat = sum(len(d["categories"]) for d in scheme["dimensions"])
print(f"wrote {OUT.name}: {len(scheme['dimensions'])} dimensions, {n_cat} categories "
      f"(+ {scheme['not_practice']['category']}), {len(pairs)} (dimension, code) pairs")
