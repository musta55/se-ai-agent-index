# SE Agent Index

A structured dataset and toolchain for analyzing **Software Engineering practices** of AI coding agents. Each agent is researched using open-coding methodology and stored as a validated JSON index — covering testing, CI/CD, code review, bug solving, methodology, team communication, documentation, and LLM integration.

## Prerequisites

```bash
# 1. Copy .env and paste your Anthropic API key
cp .env.example .env
# Edit .env → ANTHROPIC_API_KEY=sk-ant-...

# 2. Install Python dependencies (for review command)
python3 -m venv venv && source venv/bin/activate
pip install anthropic

# 3. Ensure Claude Code CLI is installed
# https://claude.ai/download
```

### Commands

```bash
# Index — register + research + auto-download sources
./se_index.sh index "Agent Name"
# → Generates: Indexing/<name>_se_index.json with embedded q-ids
# → Auto-downloads: web_sources/<name>/ (all reference URLs)

# Review — LLM quality check on the SE index JSON
./se_index.sh review "Agent Name"
./se_index.sh review --all

# Sources — manual re-download (automatic after 'index')
./se_index.sh sources "Agent Name"
./se_index.sh sources --all

# Manual curation — create Excel spreadsheet from JSON (with q-ids)
# → Analysis of SE AI Agent Index.xlsx (manually verified dataset)

# Build query index from curated Excel spreadsheet
python3 build_query_index.py

# Query — fetch raw JSON summary + evidence for verification
./se_index.sh query "Agent Name" "q-3"
./se_index.sh list-queries "Agent Name"
./se_index.sh agents
```

---

## Project Structure

```
SE Indexing Tool/
├── se_index.sh                     Main CLI (index / review / sources / query)
├── build_query_index.py            Builds query_index.json FROM manually curated Excel
├── query_runner.py                 Query lookup backend (called by se_index.sh query)
├── query_index.json                Generated: maps (agent, q-id) → summary + evidence
├── check_missing_qids.py           Utility: Verify q-id completeness (100% coverage)
├── fill_missing_qids.py            Utility: Fill missing q-ids if JSONs edited manually
├── reorder_qid_fields.py           Utility: Ensure q-id is first field
├── prompts/
│   ├── research_prompt.md          Research methodology & JSON schema spec
│   └── quality_checklist_prompt.md Manual review checklist template
├── agents_config.json              Agent registry (id, name, status, reviewed)
├── quality_review_agent.py         LLM-as-judge quality review script
│
├── Indexing/
│   ├── pull_sources.py                      Downloads references into web_sources/
│   ├── glean_agents_se_index.json           (13 agent JSON files with embedded q-ids)
│   ├── watsonx_orchestrate_se_index.json
│   ├── hubspot_breeze_studio_se_index.json
│   ├── gemini_cli_se_index.json
│   ├── google_gemini_se_index.json
│   ├── gemini_enterprise_se_index.json
│   ├── kimi_ok_computer_se_index.json
│   ├── browser_use_se_index.json
│   ├── opera_neon_se_index.json
│   ├── alibaba_mobile_agent_se_index.json
│   ├── perplexity_comet_se_index.json
│   ├── anthropic_claude_code_se_index.json
│   └── amazon_q_developer_se_index.json
│
├── quality_checklist/
│   ├── glean_agents_review.md
│   └── ...                         (one .md per agent)
│
├── web_sources/                    Downloaded reference files (gitignored)
│   ├── Glean_Agents/
│   │   ├── [1].html
│   │   ├── [9].md
│   │   └── ...
│   └── ...
│
├── "Analysis of SE AI Agent Index.xlsx"   Manually curated + verified dataset (with q-ids)
└── venv/                           Python virtual environment
```

---

## Command Reference

### `./se_index.sh index "Agent Name"`

Registers the agent in `agents_config.json`, then **runs Claude Code autonomously** to research and produce the SE index JSON with embedded q-ids. After successful index creation, **automatically downloads all reference web sources** locally for offline verification. Claude uses WebSearch and WebFetch to browse the web following the methodology in `prompts/research_prompt.md`.

```bash
./se_index.sh index "OpenAI Codex"
# → Indexing/openai_codex_se_index.json (with q-ids)
# → web_sources/openai_codex/ (downloaded references)
```

**What happens:**

1. Agent is registered in `agents_config.json` (`indexing_status: pending`)
2. `prompts/research_prompt.md` is substituted with the agent name and piped to `claude -p`
3. Claude browses GitHub, blogs, docs, and papers (3–10 min)
4. The JSON response is extracted and saved to `Indexing/openai_codex_se_index.json` **with embedded q-ids**
5. **All reference web sources are automatically downloaded** to `web_sources/openai_codex/`
6. `indexing_status` is updated to `completed` (or `failed` on error)

**Requires:** `ANTHROPIC_API_KEY` in `.env` and `claude` CLI installed.

**Note:** Sources are downloaded automatically after successful index creation. Manual re-download available via `./se_index.sh sources`.

---

### `./se_index.sh review "Agent Name"`

Runs `quality_review_agent.py` against the agent's SE index JSON. Performs programmatic checks and an LLM-as-judge assessment, then writes a markdown report to `quality_checklist/`.

```bash
./se_index.sh review "Glean Agents"
./se_index.sh review --all
```

**What it checks:**

| Category         | Checks                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Completeness     | Description, Repository_Statistics (5 fields), all 8 SE areas, 4 subsections each, ≥10 bug issues, 15–20 references |
| Citation mapping | Every `[N]` in evidence maps to a References entry                                                                  |
| Date format      | All `Date_Pulled` in `YYYY-MM-DD`                                                                                 |
| Evidence quality | No URL-as-quote, no filename-as-quote, no quotes < 5 words or > 50 words                                              |
| LLM-as-judge     | Content focus, verbatim fidelity, anti-hallucination, evidence↔summary alignment, Not Available usage                |

**Output scores:** `EXCELLENT` / `GOOD` / `NEEDS_IMPROVEMENT` / `POOR`

Reports saved to: `quality_checklist/<agent_slug>_review.md`

After a successful review, the agent's `reviewed` flag is set to `true` in `agents_config.json`.

---

### `./se_index.sh sources "Agent Name"`

**Manual re-download** of reference sources. (Sources are automatically downloaded during `index` command.)

Runs `Indexing/pull_sources.py` to download every URL in the agent's `References` section into `web_sources/{agent_name}/`. Use this if you need to refresh downloaded sources or if auto-download failed during indexing.

```bash
./se_index.sh sources "Glean Agents"
./se_index.sh sources --all
```

**Download rules:**

| URL type                                               | Output                                     |
| ------------------------------------------------------ | ------------------------------------------ |
| GitHub repo root (e.g.`github.com/owner/repo`)       | Downloads `README.md` as `[N].md`      |
| GitHub blob `.md` / `.yml` / `.yaml` / `.json` | Downloads raw file with matching extension |
| Any other URL                                          | Downloads page HTML as `[N].html`        |

Files are named by reference number: `[1].html`, `[9].md`, `[19].yml`, etc.

The `web_sources/` folder is gitignored — it is a local cache only.

---

### `python3 build_query_index.py`

Builds `query_index.json` from the **manually curated Excel spreadsheet** (`Analysis of SE AI Agent Index.xlsx`).

**Current Workflow:**
1. Agent index JSONs are generated with embedded q-ids (e.g., `q_1`, `q_2`, ...)
2. Researchers **manually curate** the Excel spreadsheet from JSON files
3. This script **reads** the curated Excel and extracts q-id mappings
4. Builds `query_index.json` — a lookup table mapping `(agent name, q-id)` → full JSON summary + evidence

**What it does:**
- Reads `Analysis of SE AI Agent Index.xlsx` (primary dataset)
- Extracts all q-ids and their corresponding summaries
- Matches q-ids back to JSON files in `Indexing/`
- Creates `query_index.json` for fast lookup via `./se_index.sh query`

**When to run:** After manually curating/updating the Excel spreadsheet to rebuild the query index.

```bash
python3 build_query_index.py
```

**Note:** This script does NOT modify the Excel file. It only reads from it to build the query index.

---

### `./se_index.sh query "Agent Name" "q-{id}"`

Fetches the raw JSON summary and supporting evidence for any `[q-{id}]` reference visible in the spreadsheet. Useful for verifying where a claim came from without opening the full JSON file.

```bash
./se_index.sh query "Hubspot breeze Studio" "q-2"
./se_index.sh query "Anthropic Claude Code" "q-7"
```

**Output format:**

```json
{
  "agent": "Hubspot breeze Studio",
  "query_id": "q-2",
  "column": "Testing > Practices",
  "summary": "HubSpot's testing practice is to use React Testing Library...",
  "evidence": [
    { "quote": "in August of 2022, we announced Testing Library...", "citation": "[2]" }
  ]
}
```

Agent names are matched case-insensitively and support partial prefix matching.

---

### `./se_index.sh list-queries "Agent Name"`

Lists every query ID for an agent with a one-line preview of each entry — useful for discovering which `q-id` maps to which SE category.

```bash
./se_index.sh list-queries "Anthropic Claude Code"
```

```
Agent: Anthropic Claude Code

  q-1      [Description]               Anthropic Claude Code is a CLI-based AI coding...
  q-2      [Testing > Practices]       Claude Code uses a multi-layer testing strategy...
  q-3      [Testing > Tools]           TypeScript type-checking, Bun test runner...
  ...
```

---

### `./se_index.sh agents`

Lists all agents currently in `query_index.json` with their query count.

```bash
./se_index.sh agents
```

```
Available agents:
  Alibaba Mobile Agent  (30 queries)
  Anthropic Claude Code  (30 queries)
  Browser Use  (30 queries)
  ...
```

---

## Full Workflow: Adding a New Agent

### Prerequisites

- Python 3.9+ with `anthropic` package (`pip install anthropic`)
- `ANTHROPIC_API_KEY` set in `.env`
- `claude` CLI installed ([claude.ai/download](https://claude.ai/download))

### Step 1 — Index (register + research + auto-download)

```bash
./se_index.sh index "New Agent Name"
```

This single command:

1. Adds the agent to `agents_config.json` (`indexing_status: pending`)
2. Substitutes `"New Agent Name"` into `prompts/research_prompt.md`
3. Runs `claude -p < prompts/research_prompt.md` non-interactively
4. Claude browses GitHub repos, engineering blogs, documentation, and issue trackers
5. Saves the JSON output to `Indexing/new_agent_name_se_index.json` **with embedded q-ids**
6. **Automatically downloads all reference web sources** to `web_sources/New_Agent_Name/`
7. Sets `indexing_status: completed` on success

The research prompt guides Claude through:

- Step 0: Agent description (category, company, deployment surface)
- Step 1: Repository discovery & statistics (stars, contributors, LOC, language, update frequency)
- Step 2: Official documentation & engineering blog analysis
- Step 3: GitHub issues analysis (10–15 issues revealing engineering patterns)
- Steps 4–8: The 8 SE practice areas (see below)
- References: 15–20 sources (GitHub + external blogs, papers, talks)

**Takes 3–10 minutes per agent.** Sources are downloaded automatically at the end.

### Step 2 — Quality review (Optional but Recommended)

```bash
./se_index.sh review "New Agent Name"
```

Open `quality_checklist/new_agent_name_review.md` and address any `⚠️` or `❌` items. If issues require re-research, re-run `index`.

### Step 3 — Manual curation (Human-in-the-Loop)

**Researcher manually curates the Excel spreadsheet:**

1. Open generated JSON: `Indexing/new_agent_name_se_index.json`
2. Review each summary with its embedded q-id (e.g., `q_1`, `q_2`, ...)
3. Create/update Excel spreadsheet: `Analysis of SE AI Agent Index.xlsx`
4. Include q-ids in spreadsheet for traceability
5. Filter out information that fails semantic validation
6. Verify sources using downloaded web pages in `web_sources/New_Agent_Name/`

**Key Point:** JSONs already have q-ids embedded during generation. No separate annotation step needed.

### Step 4 — Build query index

After manually curating the Excel spreadsheet, build the query index:

```bash
python3 build_query_index.py
```

This reads the curated Excel and builds `query_index.json` for fast lookup.

### Step 5 — Query and validate

Verify sources for any q-id:

```bash
./se_index.sh query "New Agent Name" "q_15"
./se_index.sh list-queries "New Agent Name"
```

---

## SE Index JSON Schema

Each agent index is stored as a JSON file in `Indexing/`. The canonical schema:

```jsonc
{
  "Agent_Name": "Glean Agents",
  "Description": [
    {
      "q_id": "q_1",
      "Summary": "One-paragraph description of what the agent does, its category, company, and deployment surface.",
      "evidence": [{ "quote": "...", "citation": "[1]" }]
    }
  ],
  "Repository_Statistics": {
    "Lines_of_Code": [
      {
        "Summary": "~50,000 lines across Python and TypeScript",
        "evidence": [{ "quote": "...", "citation": "[2]" }]
      }
    ],
    "Stars": [{ "Summary": "1,234", "evidence": [...] }],
    "Contributors": [{ "Summary": "45", "evidence": [...] }],
    "Update_Frequency": [{ "Summary": "2–3 releases/month", "evidence": [...] }],
    "Primary_Language": [{ "Summary": "TypeScript", "evidence": [...] }]
  },
  "SE_Practices": {
    "Testing_and_Reliability": {
      "Practices": [
        {
          "q_id": "q_2",
          "Summary": "Team uses Playwright for E2E testing with 80% coverage requirement...",
          "evidence": [{ "quote": "All PRs must maintain 80% coverage...", "citation": "[4]" }]
        }
      ],
      "Tools": [
        {
          "q_id": "q_3",
          "Summary": "Playwright, Pytest, GitHub Actions",
          "evidence": [...]
        }
      ],
      "Stakeholders": [{ "q_id": "q_4", "Summary": "...", "evidence": [...] }],
      "Others": [{ "q_id": "q_5", "Summary": "Not Available", "evidence": [] }]
    },
    "Integration_and_Infrastructure_CICD":  { ... },
    "Code_Review_Process":                  { ... },
    "Bug_Solving_Approaches":               { ... },
    "Software_Engineering_Methodology":     { ... },
    "Team_Communication":                   { ... },
    "Holistic_Documentation":               { ... },
    "LLM_Integration_and_Prompt_Management": { ... }
  },
  "References": {
    "[1]":  { "Website_Type": "GitHub Repository", "Link": "https://...", "Date_Created": "2023-01-01", "Date_Pulled": "2026-05-18" },
    "[2]":  { ... }
  }
}
```

### 8 SE Practice Areas

| Area                                            | What to capture                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Testing_and_Reliability**               | Unit/integration/E2E frameworks, CI test gates, coverage targets, reliability SLOs |
| **Integration_and_Infrastructure_CICD**   | CI/CD pipelines, deployment tools, release cadence, infrastructure-as-code         |
| **Code_Review_Process**                   | PR review policies, required reviewers, automated checks, review tooling           |
| **Bug_Solving_Approaches**                | Issue triage, debugging workflow, postmortems, bug tracking tools                  |
| **Software_Engineering_Methodology**      | Agile/scrum practices, sprint structure, planning tools, versioning strategy       |
| **Team_Communication**                    | Internal comms tools, async vs sync patterns, standup rituals, onboarding          |
| **Holistic_Documentation**                | Code docs, architecture docs, API references, changelogs, contributor guides       |
| **LLM_Integration_and_Prompt_Management** | How LLMs are integrated, prompt versioning, model switching, evaluation            |

Each area has four subsections: **Practices**, **Tools**, **Stakeholders**, **Others**.

### Evidence Format Rules

- **Every summary must have a `q_id`** field as the first field (e.g., `"q_id": "q_15"`)
- Q-IDs are sequential per agent: `q_1`, `q_2`, ..., `q_N`
- Every claim must have a verbatim `quote` + `citation` number
- Quotes must be ≥ 5 words and ≤ 50 words (use `...` for longer excerpts)
- Quotes must be actual text from the source — not URLs, filenames, or UI labels
- If information is genuinely unavailable, use `"Not Available"` as the Summary with `[]` for evidence (but still include q-id)

---

## agents_config.json

Tracks the status of every agent in the dataset:

```json
[
  {
    "id": 1,
    "agent_name": "Glean Agents",
    "indexing_status": "completed",
    "reviewed": true
  }
]
```

| Field               | Values                                                               |
| ------------------- | -------------------------------------------------------------------- |
| `indexing_status` | `pending` · `in-progress` · `completed` · `failed`        |
| `reviewed`        | `false` · `true` (set automatically after `review` completes) |

---

## Quality Review Scores

| Score                       | Meaning                                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| **EXCELLENT**         | No issues found; all checks pass; evidence is tight and on-target           |
| **GOOD**              | Minor warnings only; overall solid research                                 |
| **NEEDS_IMPROVEMENT** | One or more significant issues (missing areas, bad evidence, low ref count) |
| **POOR**              | Multiple failures; index should be re-researched                            |

Review reports are in `quality_checklist/`. Each report shows:

- Pass / Warning / Fail counts for all programmatic checks
- LLM-as-judge assessment across 5 dimensions
- A list of specific issues to address

---

## Environment Setup

```bash
# 1. Navigate to project
cd "SE Indexing Tool"

# 2. Copy .env template and add your API key
cp .env.example .env
# Edit .env:
#   ANTHROPIC_API_KEY=sk-ant-your-key-here
#   (used by both 'index' and 'review' commands)

# 3. Create Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install anthropic

# 4. Install Claude Code CLI (if not already installed)
# https://claude.ai/download

# 5. Verify
./se_index.sh help
```

### .env file

```bash
# .env (gitignored — never commit this file)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

The script reads `ANTHROPIC_API_KEY` from `.env` automatically. You do not need to `export` it manually.

---

## Utility Scripts

Three Python utility scripts help maintain JSON quality and consistency:

### `python3 check_missing_qids.py`

Verifies that every summary in all JSON files has a q-id. Reports completeness percentage per agent.

```bash
python3 check_missing_qids.py
```

**Output:**
```
✅ Glean Agents          | Total:  49 | Has q-id:  49 | Missing:   0
✅ Browser Use           | Total:  74 | Has q-id:  74 | Missing:   0
...
Completion rate: 100.0%
```

Use after editing JSON files to ensure no q-ids were accidentally removed.

### `python3 fill_missing_qids.py`

Automatically assigns q-ids to any summaries missing them. Continues sequentially from the highest existing q-id.

```bash
python3 fill_missing_qids.py
```

Use if you manually add summaries to a JSON file without q-ids.

### `python3 reorder_qid_fields.py`

Ensures `q_id` is always the first field in every summary object (before `Summary` and `evidence`).

```bash
python3 reorder_qid_fields.py
```

Use to enforce consistent field ordering across all JSON files.

---

## Research Standards

These rules apply to all SE index JSON files:

1. **Q-IDs embedded** — every summary must have a unique `q_id` field (e.g., `q_1`, `q_2`...) as the first field
2. **Verbatim quotes only** — copy-paste from source; never paraphrase
3. **SE practices, not product features** — document how the *team* builds the agent, not what the agent does for users
4. **Evidence required** — every claim needs a quote + citation
5. **No hallucination** — if a fact cannot be found with evidence, mark it `Not Available` (but still include q-id)
6. **Correct source** — verify the GitHub repository matches the target agent before extracting statistics
7. **15–20 references** — diverse sources: repo + blogs + docs + papers + forums
8. **Date tracking** — all references must have `Date_Pulled` in `YYYY-MM-DD` format
9. **Auto-download sources** — reference web pages are automatically downloaded after successful index creation

---

## License

Research use only. SE index data is derived from publicly available sources. See individual AI agent repositories and websites for their respective licenses.
