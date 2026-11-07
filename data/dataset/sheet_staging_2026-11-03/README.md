# Sheet staging, 2026-11-03

Pending changes for the live Google Sheet "Analysis of SE AI Agent Index"
(id `10WMkTy7Zw0rovq8NDnlKH5yIBJhKT2MtId45aMb05RM`). They are already applied to
`data/dataset/Analysis of SE AI Agent Index.xlsx`; the Google Sheet has not been updated yet.

**Use `google_push.json`.** It is the complete diff between the merged local xlsx and the
live sheet as of 2026-11-03 12:01:

- `cell_edits`: 26 edits (Mustahid-clean 12, Antu-clean 7, Final-clean 7). These are the 21
  staged edits plus 5 Codex/n8n Mustahid-clean cells that were coded locally and never pushed.
- `log_appends`: Cleaning-log, 79 rows after row 814; JSON-additions, 45 rows after row 185.
- `agreement`: 562 rows (header + 562 items). First copy the current `Agreement Index` tab to
  `Agreement-old`, then clear `A1:Z1000`, write the values, put the summary in M1:N5 and add an
  Agree/Disagree dropdown on `H2:H563`.

Before writing, check each edit's `old` value against the live cell. If they differ, someone
edited the sheet after the snapshot.

`apply_push.gs` is a Google Apps Script with `google_push.json` embedded, for use when the
Sheets connector can't sign in. Paste it into the sheet (Extensions → Apps Script) and run
`checkOnly()` first. Then run `applyPush()`, which repeats every check, writes nothing if
any of them fail, and skips steps that are already applied.

`restore_agreement.gs` runs after `applyPush()`. It copies author_1, author_2, agreement and the
row colours from `Agreement-old` back onto the 417 rebuilt items that existed before. The
other 145 items are new and stay blank for manual coding. `agreement_restore_map.csv` lists
the old item each row came from (or "new - code manually"). Run `checkRestore()` first, then
`applyRestore()`.

`apply_annotations.gs` runs last, after `applyRestore()`. It writes the round-4 open-coding codes
for all 272 Practices items (see `../open_coding_codebook.md`) to the Agreement Index:

- headers `annotation_1`…`annotation_4` (L–O) and `annotation_memo` (P);
- the codes for each item (at most four), found by `info_item_id`;
- the agreement summary at R1:S5;
- the `Codebook` tab: 184 codes, each with one of 17 categories, live use counts, and a category
  table with live code and use counts. An earlier round's Codebook is kept as `Codebook-v1` or
  `Codebook-r3`;
- a dropdown on L2:O563 fed by `Codebook!A2:A1000` that still accepts new values.

Run `checkAnnotations()` first, then `applyAnnotations()`. It checks every cell of L1:W563 and
accepts only blanks, this round's values, or values an earlier script wrote in that cell: the
`apply_push.gs` summary (M1:N5), round 1 (`annotations_v1_payload.json`) or round 3
(`annotations_r3_payload.json`, eight tag columns, summary V1:W5). Those are replaced. Any other value,
such as a code typed by hand, stops the run, the log lists the cell, and nothing is written.

`apply_annotations.gs` is generated from the local xlsx. After changing annotations locally,
rebuild it with `python3 -I build_annotation_push.py`. Edit `apply_annotations.template.gs`, not
the generated file.

`apply_categories.gs` (round 5, 2026-11-04) runs after `applyAnnotations()`. It **only reads** the
Agreement Index and writes the dimension-scoped categories from `../open_coding_categories.json`:

- the round-4 `Codebook` is copied to `Codebook-r4`, then `Codebook` is rewritten in place, so the
  L–O dropdowns (`Codebook!A2:A1000`) keep working. The columns are: A code, B live uses, C–I the code's category in
  each dimension, J item ids;
- a `Categories` tab: one row per (dimension, category) with its meaning, a live code count, and
  item and agent counts overall, per agent group and per agent. These counts are computed from the live sheet when the
  script runs. Re-run `applyCategories()` after recoding to refresh them.

A code that has no category in a dimension shows as `(uncategorised)` and the log warns about it.
Run `checkCategories()` first, then `applyCategories()`. To change the scheme, edit
`open_coding_categories.json` and rebuild with `python3 -I build_category_push.py`.

Run order on the live sheet: `applyPush()` → `applyRestore()` → `applyAnnotations()` → `applyCategories()`.
All four can share one Apps Script project; their function names don't clash. As of 2026-11-04 the
first three have been applied, so only `applyCategories()` remains.

Other files:

- `cell_edits.json`, `log_rows.json`, `agreement_payload.json`: the original staged files
  from the previous session. They don't include the local Codex/n8n coding, so use
  `google_push.json` instead.
- `agreement_payload_merged.json`: the Agreement Index with Codex/n8n items rebuilt from the
  local Mustahid-clean.
- `final_items.json`, `agreement_rows.json`, `marketing_items.md`: intermediate files used to
  build the tags.
- `Analysis of SE AI Agent Index.before-merge.xlsx`: the local workbook before this merge.
