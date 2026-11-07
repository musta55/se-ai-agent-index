"""Builds apply_annotations.gs from the local Analysis xlsx.

Reads the annotation columns of the Agreement Index (annotation_1..N and annotation_memo,
starting at column L), the summary block and the Codebook tab, and embeds them in an Apps
Script that writes them to the live Google Sheet. Re-run after changing annotations locally:
    python3 -I build_annotation_push.py

annotations_v1_payload.json and annotations_r3_payload.json hold what earlier annotation scripts
wrote, so the script can replace those values if one of them was already run on the live sheet.
"""
import json
from pathlib import Path

import openpyxl

HERE = Path(__file__).resolve().parent
XLSX = HERE.parent / "Analysis of SE AI Agent Index.xlsx"
OUT = HERE / "apply_annotations.gs"
TEMPLATE = HERE / "apply_annotations.template.gs"
# earlier rounds: payload file, round name, summary column
PREV = [("annotations_v1_payload.json", "v1", 19), ("annotations_r3_payload.json", "r3", 22)]
FIRST = 12  # column L
CB_COLS = 9  # Codebook A:I

wb = openpyxl.load_workbook(XLSX)
ws = wb["Agreement Index"]
headers = []
for c in range(FIRST, FIRST + 30):
    v = ws.cell(1, c).value
    if not (isinstance(v, str) and v.startswith("annotation_")):
        break
    headers.append(v)
assert headers and headers[-1] == "annotation_memo", headers
n_tags = len(headers) - 1

# summary block: the first column right of the annotation columns whose row 1 is "Agree"
summary_col = next(c for c in range(FIRST + len(headers), FIRST + len(headers) + 10)
                   if ws.cell(1, c).value == "Agree")
summary = {"col": summary_col,
           "labels": [ws.cell(r, summary_col).value for r in range(1, 6)],
           "formulas": [ws.cell(r, summary_col + 1).value for r in range(1, 6)]}

items = []
for r in range(2, ws.max_row + 1):
    vals = [ws.cell(r, c).value for c in range(FIRST, FIRST + len(headers))]
    if any(v not in (None, "") for v in vals):
        items.append({"id": ws.cell(r, 4).value, "agent": ws.cell(r, 1).value,
                      "values": ["" if v is None else str(v) for v in vals]})

cb = wb["Codebook"]
grid = [["" if cb.cell(r, c).value is None else str(cb.cell(r, c).value) for c in range(1, CB_COLS + 1)]
        for r in range(1, cb.max_row + 1)]
n_categories = sum(1 for r in range(2, cb.max_row + 1)
                   if cb.cell(r, 6).value and cb.cell(r, 7).value)

prev = []
for name, rnd, col in PREV:
    p = json.loads((HERE / name).read_text())
    prev.append({"round": rnd, "headers": p["headers"],
                 "items": {it["id"]: it["values"] for it in p["items"]},
                 "codebook_header": p["codebook_header"], "summary_col": col,
                 "summary_labels": p["summary_labels"], "summary_formulas": p["summary_formulas"]})
last_col = max([summary_col + 1, FIRST + len(headers) - 1] +
               [max(p["summary_col"] + 1, FIRST + len(p["headers"]) - 1) for p in prev])

push = {"source": XLSX.name, "first_col": FIRST, "last_col": last_col, "n_tags": n_tags,
        "headers": headers, "items": items, "codebook": grid, "n_categories": n_categories,
        "dropdown_source": "A2:A1000", "summary": summary, "prev": prev}
script = TEMPLATE.read_text().replace(
    "/*__ANNOT__*/null", json.dumps(push, ensure_ascii=False, indent=1))
OUT.write_text(script)
print(f"wrote {OUT.name}: {len(items)} coded items, {n_tags} tag columns, "
      f"{len(grid) - 1} codebook rows, {n_categories} categories, summary at column {summary_col}, "
      f"area L..{openpyxl.utils.get_column_letter(last_col)}")
