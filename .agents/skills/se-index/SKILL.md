---
name: se-index
description: >-
  Work with the SE AI Agent Index — a research dataset + retrieval tool that
  indexes the Software Engineering practices of AI agents (13 agents × 7 SE
  dimensions). Use this whenever a task touches this repo: querying the index
  (query / list-queries / agents), indexing a NEW agent, curating the Excel
  master, rebuilding query_index.json, editing the q-id column map, or debugging
  the JSON schema / naming conventions. Triggers on mentions of se_index.sh,
  q-ids, SE dimensions, Index.xlsx, data/Indexing, or "add/index an agent".
---

# SE AI Agent Index

A semi-automated research dataset and CLI for analyzing the **Software Engineering
practices** of AI agents. 13 agents are indexed across **7 SE dimensions**
(Testing, CI/CD, Code Review, Bug Solving, SE Methodology, Team Communication,
Documentation), each dimension split into sub-dimensions (Practices, Tools,
Stakeholders, Others, and — for Bug Solving — Issues).

The dataset is built by an LLM research pass (`Codex -p`) → manual Excel curation
→ a generated query index. Two independent workflows exist: **querying** (no API
key) and **extending** (needs an Anthropic API key + the `Codex` CLI).

## Map of the repo

| Path | Role |
| --- | --- |
| `se_index.sh` | Main CLI. Subcommands: `query`, `list-queries`, `agents`, `index`, `sources`, `help`. Run from repo root. |
| `index_prompt.md` | The research methodology + JSON schema handed to `Codex -p` when indexing a new agent. `{agent_name}` is substituted in. |
| `tool/se_index_core.py` | **The heart.** `COLUMN_MAP` (column → SE sub-dimension accessor), `AGENT_JSON_MAP` (agent name → JSON file), q-id assignment, fuzzy matching. |
| `tool/query_runner.py` | Backend for `query`. Reads the agent JSON directly, resolves q-id → summary + evidence. |
| `tool/build_query_index.py` | Rebuilds `tool/query_index.json` from the curated Excel + JSON files. Requires `openpyxl` and the (gitignored) Legacy/Analysis Excel workbooks. |
| `tool/agents_config.json` | Registry: `id`, `agent_name`, `indexing_status`, `reviewed`. |
| `tool/query_index.json` | Generated cache: `(agent, q-id) → summary + evidence`. |
| `data/Indexing/<name>_se_index.json` | Per-agent machine-readable index (the source of truth for queries — `query_runner` reads these, NOT the Excel). |
| `data/dataset/Index.xlsx` / `.pdf` | Manually curated + validated master table. |
| `data/web_sources/<Agent>/[N].html\|md` | Cached reference sources (gitignored; auto-downloaded after indexing). |
| `AGENTS.md` | The list of 13 indexed agents with descriptions. |

## Querying the index (common, no API key)

```bash
./se_index.sh agents                          # list all indexed agents
./se_index.sh list-queries "Browser Use"      # list every q-id for an agent
./se_index.sh query "Browser Use" "q-5"        # summary + evidence for one q-id
```

Only `python3` + `openpyxl` are needed. Agent names are **fuzzy-matched**
(case-insensitive exact, then prefix). q-ids normalize: `q-5`, `q_5`, and `5`
are equivalent. A `Description` query also returns `Repository_Statistics`
(which has no q-id of its own).

## Per-agent JSON schema

```jsonc
{
  "Agent_Name": "...",
  "Description": [{ "q_id": "q_1", "Summary": "...", "evidence": [{ "quote": "...", "citation": "[1]" }] }],
  "Repository_Statistics": { "Stars": [...], "Contributors": [...], "Lines_of_Code": [...], "Update_Frequency": [...], "Primary_Language": [...] },
  "SE_Practices": {
    "Testing_and_Reliability":             { "Practices": [...], "Tools": [...], "Stakeholders": [...], "Others": [...] },
    "Integration_and_Infrastructure_CICD": { ... },
    "Code_Review_Process":                 { ... },
    "Bug_Solving_Approaches":              { "Issues": [...], "Practices": [...], "Tools": [...], "Stakeholders": [...], "Others": [...] },
    "Software_Engineering_Methodology":    { ... },
    "Team_Communication":                  { ... },
    "Holistic_Documentation":              { ... }
  },
  "References": { "[1]": { "Website_Type": "...", "Link": "...", "Date_Created": "...", "Date_Pulled": "YYYY-MM-DD" } }
}
```

Each item carries its own `q_id` (canonical, e.g. `q_60`); the CLI turns `q_60`
into `q-60`. Items with no real summary (blank or starting with "Not Available")
are skipped and get no q-id. `SE_Practices` keys have **legacy aliases** — the
code accepts both the old and new names (see `CATEGORY_ALIASES` in
`se_index_core.py`), so don't rename existing keys to "fix" them.

## Extending the index — add a new agent (needs API key)

```bash
cp .env.example .env        # set ANTHROPIC_API_KEY=sk-ant-...
./se_index.sh index "New Agent"     # Codex -p research (3–10 min) → data/Indexing/new_agent_se_index.json
                                     # then auto-downloads sources → data/web_sources/New_Agent/
# ...manually curate the findings into data/dataset/Index.xlsx, verifying each claim...
python3 tool/build_query_index.py    # rebuild tool/query_index.json
./se_index.sh query "New Agent" "q-1"  # verify
```

`index` runs `Codex -p` with `--allowedTools "WebSearch WebFetch Read"` and
`--permission-mode bypassPermissions` — Codex does **no filesystem writes**; the
shell captures stdout and extracts the JSON block (first `{` to last `}`). If
output isn't valid JSON, the raw text is saved and status set to `failed`.

**After indexing, you must also register the agent in code** so queries resolve:
add a `"agent name": "<name>_se_index.json"` entry to `AGENT_JSON_MAP` in
`tool/se_index_core.py`. `index` writes the JSON + `agents_config.json`, but
`AGENT_JSON_MAP` is edited by hand.

Filenames use `safe_filename`: lowercased, non-alphanumerics → `_`, collapsed
(e.g. `"Browser Use"` → `browser_use_se_index.json`).

## ⚠️ Critical invariant — the q-id COLUMN_MAP is append-only

q-ids are numbered by iterating `COLUMN_MAP` (`tool/se_index_core.py`) in column
order. **Inserting or reordering a column shifts every downstream q-id and breaks
the Excel ↔ JSON mapping and all published references.** When adding a new SE
sub-dimension column, **append it at the END** with the next column number (the
file goes up to col 35; col 36 was deliberately removed). The file header says
this in bold — respect it.

## Gotchas

- Run the CLI from the repo root (`./se_index.sh …`); it resolves paths from its own location but the docs assume root.
- `query_runner.py` reads `data/Indexing/*.json` directly — editing a JSON changes query output immediately, no rebuild needed. `build_query_index.py` only refreshes the `query_index.json` cache used by `list-queries` / `agents`.
- `build_query_index.py` depends on Excel workbooks (`SE AI Agent Index Legacy 2.xlsx`, `Analysis of SE AI Agent Index.xlsx`) that are **gitignored** — it will `FileNotFoundError` on a fresh clone. Don't assume it runs out of the box.
- `.env`, `venv/`, `data/web_sources/`, and the working Excel/`SE Indexing for AI Agents/` dirs are gitignored.
- This is a research dataset — treat curated content and citations as authoritative; don't invent evidence quotes or citations.
